/** Pinned Takram WebGL2 cloud/sky bridge. All assets and shaders are local. */
import { CloudsEffect, SkyMaterial, getSunLightColor, Ellipsoid } from './vendor/takram-clouds.js';

const ASSETS = new URL('./assets/clouds/', import.meta.url);
const RADIUS = 6360000;
export const ADVANCED_CLOUD_SHADOW_GLSL = /* glsl */`
  precision highp sampler2DArray;
  uniform sampler2DArray advancedCloudShadow;
  uniform mat4 advancedCloudMatrices[2];
  uniform vec2 advancedCloudIntervals[2];
  uniform vec2 advancedCloudTexel;
  uniform vec3 advancedCloudSun;
  uniform float advancedCloudTop, advancedCloudNear, advancedCloudFar, advancedCloudReady;
  float advancedCloudColumn(vec2 uv, int cascade, float toTop) {
    vec4 column = texture(advancedCloudShadow, vec3(uv, float(cascade)));
    return min(column.b, column.g * max(0.0, toTop - column.r));
  }
  float advancedCloudCascade(vec3 p, int cascade, float toTop) {
    vec4 clip = advancedCloudMatrices[cascade] * vec4(p, 1.0);
    vec2 uv = clip.xy / clip.w * .5 + .5;
    if (any(lessThan(uv, vec2(.001))) || any(greaterThan(uv, vec2(.999)))) return 1.0;
    vec2 t = advancedCloudTexel * .8;
    float depth = advancedCloudColumn(uv + t, cascade, toTop)
      + advancedCloudColumn(uv - t, cascade, toTop)
      + advancedCloudColumn(uv + vec2(t.x,-t.y), cascade, toTop)
      + advancedCloudColumn(uv + vec2(-t.x,t.y), cascade, toTop);
    return exp(-depth * .25);
  }
  float aerialCloudVisibility(vec3 worldPos) {
    if (advancedCloudReady < .5) return 1.0;
    // Stable local expansion of the spherical shell intersection avoids
    // subtracting two Earth-radius squared floats in the material shader.
    float height = worldPos.y + dot(worldPos.xz,worldPos.xz) / 12720000.0;
    float upSun = advancedCloudSun.y + dot(worldPos.xz,advancedCloudSun.xz) / 6360000.0;
    float toTop = max(0.0, advancedCloudTop - height) / max(.04,upSun);
    float viewDepth = -(viewMatrix * vec4(worldPos,1.0)).z;
    float depth = (viewDepth - advancedCloudNear) / max(1.0, advancedCloudFar - advancedCloudNear);
    float boundary = advancedCloudIntervals[0].y;
    float blend = smoothstep(boundary - .025, boundary + .025, depth);
    if (blend <= 0.0) return advancedCloudCascade(worldPos,0,toTop);
    if (blend >= 1.0) return advancedCloudCascade(worldPos,1,toTop);
    return mix(advancedCloudCascade(worldPos,0,toTop),advancedCloudCascade(worldPos,1,toTop),blend);
  }
`;

/**
 * Returns premultiplied cloud RGB + opacity, scene-linear sky RGB, a shared
 * shadow program, and the same LUT-derived light used by both sky and clouds.
 */
export async function createAdvancedClouds(THREE, renderer, camera, {
  sunDirection = new THREE.Vector3(.70,.48,-.55), quality = 'high', radianceScale = 3,
} = {}) {
  const owned = new Set();
  let effect, disposed=false;
  function dispose(){
    if(disposed)return;disposed=true;
    // Nested passes alias their materials; release every actual owner once.
    const resources=new Set(owned);
    if(effect)for(const pass of [effect.cloudsPass,effect.shadowPass])for(const value of Object.values(pass))
      if(value?.isWebGLRenderTarget||value?.isMaterial)resources.add(value);
    for(const resource of resources)resource.dispose();
  }
  async function settle(loads){
    const results=await Promise.allSettled(loads);
    const failure=results.find(result=>result.status==='rejected');
    if(failure)throw failure.reason;
    return results.map(result=>result.value);
  }
  try {
  const direction = new THREE.Vector3().copy(sunDirection).normalize();
  const frame = new THREE.Matrix4().makeTranslation(0,RADIUS,0);
  const ellipsoid = new Ellipsoid(RADIUS,RADIUS,RADIUS);
  // Explicit binary layouts keep partial requests inside this ownership scope.
  // Waiting for every request before rejecting prevents late sibling leaks.
  async function loadLut(file,w,h,d=1){
    const response=await fetch(new URL(`atmosphere/${file}.bin`,ASSETS));
    if(!response.ok)throw Error(`Cloud atmosphere ${file}: ${response.status}`);
    const buffer=await response.arrayBuffer();
    if(buffer.byteLength!==w*h*d*4*2)throw Error(`Cloud atmosphere size mismatch: ${file}`);
    const data=new Uint16Array(buffer);
    const texture=d===1?new THREE.DataTexture(data,w,h):new THREE.Data3DTexture(data,w,h,d);
    owned.add(texture);texture.format=THREE.RGBAFormat;texture.type=THREE.HalfFloatType;
    texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
  }
  const [transmittanceTexture,scatteringTexture,irradianceTexture]=await settle([
    loadLut('transmittance',256,64),loadLut('scattering',256,128,32),loadLut('irradiance',64,16),
  ]);
  const textures={transmittanceTexture,scatteringTexture,irradianceTexture};
  effect = new CloudsEffect(camera);
  effect.worldToECEFMatrix.copy(frame);effect.correctAltitude=false;effect.ellipsoid=ellipsoid;
  effect.sunDirection.copy(direction);Object.assign(effect,textures);
  effect.haze=false;effect.lightShafts=false;effect.coverage=.34;
  effect.cloudLayers.set([
    {channel:'r',altitude:2200,height:1100,densityScale:.13,shapeAmount:1,shapeDetailAmount:.85,shadow:true},
    {channel:'g',altitude:3000,height:600,densityScale:.045,shapeAmount:1,shapeDetailAmount:.7,shadow:true},
    {channel:'b',altitude:7500,height:400,densityScale:.002,shapeAmount:.4,shapeDetailAmount:0},
  ]);
  effect.localWeatherRepeat.setScalar(85);effect.shapeRepeat.setScalar(.0002);
  // Authored opening over the playable valley; the same weather texture still
  // casts moving, physically matching shadows across the surrounding slopes.
  effect.localWeatherOffset.set(.34,.17);
  // Rationalize A-sqrt(A*A-6*x*x): the published cube-sphere mapping loses
  // precision near a face center, producing rectangular weather patches at
  // our local +Y anchor. This is the same mapping without that subtraction.
  const unstable='sqrt(1.5 + m2.x - m2.y - 0.5 * sqrt(-24.0 * m2.x + q2)) * (m.x > 0.0 ? 1.0 : -1.0)';
  const stable='m.x * sqrt(6.0 / (1.5 + m2.x - m2.y + 0.5 * sqrt(max(0.0, -24.0 * m2.x + q2))))';
  for(const material of [effect.cloudsPass.currentMaterial,effect.shadowPass.currentMaterial]){
    if(!material.fragmentShader.includes(unstable))throw Error('Pinned cloud weather projection changed');
    material.fragmentShader=material.fragmentShader.replace(unstable,stable);
  }
  effect.localWeatherVelocity.set(.000003,.000001);
  effect.shapeVelocity.set(.0005,0,.00015);
  effect.shapeDetailVelocity.set(.001,0,.0003);
  const load2D=async file=>{
    const t=await new THREE.TextureLoader().loadAsync(new URL(file,ASSETS).href);owned.add(t);
    t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;
  };
  const load3D=async(file,n,depth=n,nearest=false)=>{
    const response=await fetch(new URL(file,ASSETS));if(!response.ok)throw Error(`Cloud asset ${file}: ${response.status}`);
    const data=new Uint8Array(await response.arrayBuffer());if(data.length!==n*n*depth)throw Error(`Cloud asset size mismatch: ${file}`);
    const t=new THREE.Data3DTexture(data,n,n,depth);owned.add(t);t.format=THREE.RedFormat;t.unpackAlignment=1;
    t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.minFilter=t.magFilter=nearest?THREE.NearestFilter:THREE.LinearFilter;t.needsUpdate=true;return t;
  };
  const [weather,turbulence,shape,detail,jitter]=await settle([
    load2D('local_weather.png'),load2D('turbulence.png'),load3D('shape.bin',128),load3D('shape_detail.bin',32),load3D('blue-noise-rotation.bin',64,64,true),
  ]);
  effect.localWeatherTexture=weather;effect.turbulenceTexture=turbulence;
  effect.shapeTexture=shape;effect.shapeDetailTexture=detail;effect.stbnTexture=jitter;
  const depth=new THREE.DataTexture(new Float32Array([1]),1,1,THREE.RedFormat,THREE.FloatType);
  depth.needsUpdate=true;owned.add(depth);effect.setDepthTexture(depth,THREE.BasicDepthPacking);
  // Calibrate one scene-linear radiance unit across clouds, sky, IBL and sun.
  const radiance={value:radianceScale};
  const cloudMaterial=effect.cloudsPass.currentMaterial;
  cloudMaterial.toneMapped=false;
  cloudMaterial.uniforms.rangeRadianceScale=radiance;
  cloudMaterial.fragmentShader='uniform highp float rangeRadianceScale;\n'+cloudMaterial.fragmentShader
    .replace(/outputColor\s*=\s*color\s*;/,'outputColor = vec4(color.rgb * rangeRadianceScale, color.a);');
  function makeSky() {
    const material=new SkyMaterial({...textures,correctAltitude:false,ellipsoid,sunDirection:direction,moon:false,groundAlbedo:new THREE.Color(.065,.075,.065)});
    material.worldToECEFMatrix.copy(frame);material.uniforms.rangeRadianceScale=radiance;
    material.toneMapped=false;
    material.fragmentShader='uniform highp float rangeRadianceScale;\n'+material.fragmentShader.replace(/outputColor\.a\s*=\s*1\.0\s*;/,'outputColor.rgb *= rangeRadianceScale; outputColor.a = 1.0;');
    return material;
  }
  const skyMaterial=makeSky(),skyScene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(2,2);
  owned.add(skyMaterial);owned.add(geometry);
  const skyMesh=new THREE.Mesh(geometry,skyMaterial);skyMesh.frustumCulled=false;skyScene.add(skyMesh);
  const skyTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  owned.add(skyTarget);
  const emptyArray=new THREE.DataArrayTexture(new Float32Array(8),1,1,2);emptyArray.type=THREE.FloatType;emptyArray.needsUpdate=true;owned.add(emptyArray);
  const shadowUniforms={advancedCloudShadow:{value:emptyArray},advancedCloudMatrices:{value:[new THREE.Matrix4(),new THREE.Matrix4()]},
    advancedCloudIntervals:{value:[new THREE.Vector2(),new THREE.Vector2()]},advancedCloudTexel:{value:new THREE.Vector2(1,1)},
    advancedCloudSun:{value:direction},advancedCloudTop:{value:3250},advancedCloudNear:{value:camera.near},advancedCloudFar:{value:camera.far},advancedCloudReady:{value:0}};
  let level='',width=0,height=0,frames=0,previousTime=null;
  const size=new THREE.Vector2();
  const stats={provider:'takram-webgl2',cloudFrames:0,historyFrames:0,warmupFrames:32,temporalUpscale:false,jitter:'original spatial blue noise with temporal rotation',quality,width:0,height:0};
  function setSize(w,h){
    const cap=level==='high'?640:level==='medium'?480:320;
    const scale=Math.min(1,cap/w,cap*.625/h),nextW=Math.max(4,Math.ceil(w*scale/4)*4),nextH=Math.max(4,Math.ceil(h*scale/4)*4);
    if(nextW===width&&nextH===height)return;
    width=nextW;height=nextH;effect.setSize(width,height);skyTarget.setSize(width,height);
    stats.width=width;stats.height=height;stats.historyResetFrames=frames;stats.historyFrames=0;
  }
  function setQuality(value){
    if(!['high','medium','low'].includes(value)||value===level)return;
    level=value;effect.qualityPreset=value;effect.temporalUpscale=false;effect.haze=false;effect.lightShafts=false;
    effect.shadow.cascadeCount=2;effect.shadow.mapSize.setScalar(value==='high'?256:value==='medium'?128:64);
    effect.clouds.maxIterationCount=value==='high'?240:value==='medium'?160:100;
    effect.clouds.minStepSize=value==='high'?35:value==='medium'?60:100;
    effect.clouds.maxRayDistance=32000;effect.clouds.multiScatteringOctaves=value==='low'?4:6;
    stats.quality=value;renderer.getDrawingBufferSize(size);setSize(size.x,size.y);
  }
  setQuality(quality);effect.initialize(renderer,false,THREE.HalfFloatType);
  function render(elapsed=0,delta){
    if(disposed)return;
    const saved=renderer.getRenderTarget(),xr=renderer.xr.enabled,autoReset=renderer.info.autoReset;
    try{
      renderer.xr.enabled=false;renderer.info.autoReset=false;renderer.getDrawingBufferSize(size);setSize(size.x,size.y);
      camera.updateMatrixWorld();
      const dt=delta??(previousTime===null?0:Math.max(0,Math.min(.1,elapsed-previousTime)));previousTime=elapsed;
      effect.update(renderer,skyTarget,dt);
      renderer.setRenderTarget(skyTarget);renderer.render(skyScene,camera);
      const shadow=effect.atmosphereShadow;
      if(shadow){shadowUniforms.advancedCloudShadow.value=shadow.map;shadowUniforms.advancedCloudMatrices.value=shadow.matrices;
        shadowUniforms.advancedCloudIntervals.value=shadow.intervals;shadowUniforms.advancedCloudTexel.value.set(1/shadow.mapSize.x,1/shadow.mapSize.y);
        shadowUniforms.advancedCloudTop.value=shadow.topHeight;shadowUniforms.advancedCloudNear.value=camera.near;shadowUniforms.advancedCloudFar.value=shadow.far;
        shadowUniforms.advancedCloudReady.value=1;}
      stats.cloudFrames=++frames;stats.historyFrames++;
    }finally{renderer.setRenderTarget(saved);renderer.xr.enabled=xr;renderer.info.autoReset=autoReset;}
  }
  function generateRadiance(three,width=64,height=32){
    const material=makeSky();material.sun=false;
    material.vertexShader=`precision highp float;in vec3 position;uniform vec3 cameraPosition;uniform mat4 worldToECEFMatrix;out vec2 vUv;out vec3 vCameraPosition;out vec3 vRayDirection;void main(){vUv=position.xy*.5+.5;vCameraPosition=(worldToECEFMatrix*vec4(cameraPosition,1)).xyz*.001;vRayDirection=vec3(0,1,0);gl_Position=vec4(position.xy,0,1);}`;
    material.fragmentShader=material.fragmentShader.replace('vec3 rayDirection = normalize(vRayDirection);',`float lat=(vUv.y-.5)*3.141592653589793;float lon=(vUv.x-.5)*6.283185307179586;vec3 rayDirection=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));`);
    // The published bundle minifies embedded GLSL; accept that spelling too.
    material.fragmentShader=material.fragmentShader.replace('vec3 rayDirection=normalize(vRayDirection);',`float lat=(vUv.y-.5)*3.141592653589793;float lon=(vUv.x-.5)*6.283185307179586;vec3 rayDirection=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));`);
    const scene=new three.Scene(),mesh=new three.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
    const target=new three.WebGLRenderTarget(width,height,{type:three.HalfFloatType,depthBuffer:false});
    const saved=renderer.getRenderTarget(),pixels=new Uint16Array(width*height*4);
    try{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);}
    finally{renderer.setRenderTarget(saved);target.dispose();material.dispose();}
    const data=Float32Array.from(pixels,three.DataUtils.fromHalfFloat);
    if(!data.every(Number.isFinite))throw Error('Non-finite Takram sky radiance readback');
    if(!data.some((value,index)=>index%4!==3&&value>1e-6))throw Error('Empty Takram sky radiance readback');
    const texture=new three.DataTexture(data,width,height,three.RGBAFormat,three.FloatType);
    texture.mapping=three.EquirectangularReflectionMapping;texture.colorSpace=three.LinearSRGBColorSpace;texture.needsUpdate=true;return texture;
  }
  function getSunColor(target=new THREE.Color()){
    const p=camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(frame);
    getSunLightColor(textures.transmittanceTexture,p,direction,target,{ellipsoid,correctAltitude:false});
    return target.multiplyScalar(radianceScale);
  }
  function resetHistory(){
    // Pinned package's temporal targets reallocate only when dimensions change.
    // Invalidate cloud history on teleports; this does not render scene geometry.
    effect.cloudsPass.setSize(width+4,height);effect.cloudsPass.setSize(width,height);
    effect.cloudsPass.currentMaterial.copyReprojectionMatrix(camera);
    effect.frame=0;stats.historyFrames=0;
  }
  function setSunDirection(value){direction.copy(value).normalize();effect.sunDirection.copy(direction);skyMaterial.sunDirection.copy(direction);resetHistory();}
  const reflectionCamera=camera.clone();
  function renderReflectionSky(targetRenderer,mirrorCamera){
    if(disposed)return;
    // Mirror orientation/projection while keeping the atmospheric observer
    // above the virtual planet. A reflected below-ground camera gives black.
    mirrorCamera.updateMatrixWorld();
    mirrorCamera.matrixWorld.decompose(reflectionCamera.position,reflectionCamera.quaternion,reflectionCamera.scale);
    reflectionCamera.position.y=Math.max(.1,reflectionCamera.position.y);
    reflectionCamera.projectionMatrix.copy(mirrorCamera.projectionMatrix);
    reflectionCamera.projectionMatrixInverse.copy(mirrorCamera.projectionMatrixInverse);
    reflectionCamera.updateMatrixWorld(true);
    const xr=targetRenderer.xr.enabled,autoClear=targetRenderer.autoClear;
    try{targetRenderer.xr.enabled=false;targetRenderer.autoClear=false;targetRenderer.render(skyScene,reflectionCamera);}
    finally{targetRenderer.xr.enabled=xr;targetRenderer.autoClear=autoClear;}
  }
  return {render,update:render,setQuality,setSize,resetHistory,setSunDirection,generateRadiance,getSunColor,renderReflectionSky,skyMaterial,skyScene,
    shadowGLSL:ADVANCED_CLOUD_SHADOW_GLSL,shadowUniforms,stats,effect,
    get texture(){return effect.atmosphereOverlay?.map??null;},get skyTexture(){return skyTarget.texture;},dispose};
  } catch(error){dispose();throw error;}
}
