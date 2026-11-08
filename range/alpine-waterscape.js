/** A natural shallow tarn clipped against the exact terrain grid; original shore kit. */
import { terrainHeight } from './world.js';

export const ALPINE_LAKE = Object.freeze({ name: 'Willow Tarn', level: 2.15,
  seed: Object.freeze([-350, 250]), jetty: Object.freeze([-385, 150]),
  bounds: Object.freeze({ minX: -560, maxX: -95, minZ: 95, maxZ: 515 }) });
const STEP = 3200 / 240, ORIGIN = -1600;
const REFLECTION_LIMITS={high:{width:512,height:320,interval:1/7},medium:{width:320,height:200,interval:.25}};
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const t = clamp((value-a)/(b-a)); return t*t*(3-2*t); };
const rand = n => { const v = Math.sin(n * 127.1 + 319.7) * 43758.5453; return v-Math.floor(v); };
const triangleKey = (x, z, half) => `${x},${z},${half}`;
let cachedLake;

/** Select only the connected basin; isolated dips and the landing field stay dry. */
export function getAlpineLakeField() {
  if (cachedLake) return cachedLake;
  const { bounds, level, seed } = ALPINE_LAKE;
  const triangles = new Map(), edges = new Map(), heights = new Map();
  const vertex = (ix, iz) => {
    const key = `${ix},${iz}`;
    if (!heights.has(key)) {
      // Match PlaneGeometry's Float32 vertices, not a second smooth surface.
      const x = Math.fround(ORIGIN+ix*STEP), z = Math.fround(ORIGIN+iz*STEP);
      heights.set(key, { key, x, z, y: Math.fround(terrainHeight(x,z)) });
    }
    return heights.get(key);
  };
  const lowX = Math.floor((bounds.minX-ORIGIN)/STEP), highX = Math.ceil((bounds.maxX-ORIGIN)/STEP);
  const lowZ = Math.floor((bounds.minZ-ORIGIN)/STEP), highZ = Math.ceil((bounds.maxZ-ORIGIN)/STEP);
  for (let iz=lowZ; iz<highZ; iz++) for (let ix=lowX; ix<highX; ix++) {
    const a=vertex(ix,iz), b=vertex(ix,iz+1), c=vertex(ix+1,iz+1), d=vertex(ix+1,iz);
    for (const [half, vertices] of [[0,[a,b,d]],[1,[c,d,b]]]) {
      if (vertices.every(v=>v.y>=level)) continue;
      const key=triangleKey(ix,iz,half), triangle={ key, vertices, edges: [] };
      for (let side=0;side<3;side++) {
        const p=vertices[side], q=vertices[(side+1)%3];
        if (Math.min(p.y,q.y)>=level) continue;
        const edge=[p.key,q.key].sort().join(':'); triangle.edges.push(edge);
        if (!edges.has(edge)) edges.set(edge,[]); edges.get(edge).push(key);
      }
      triangles.set(key,triangle);
    }
  }
  const sx=(seed[0]-ORIGIN)/STEP, sz=(seed[1]-ORIGIN)/STEP;
  const ix=Math.floor(sx), iz=Math.floor(sz), first=triangleKey(ix,iz,(sx-ix)+(sz-iz)<=1?0:1);
  if (!triangles.has(first)) throw new Error('Willow Tarn seed is not below its water level.');
  const keys=new Set([first]), queue=[first];
  for(let cursor=0;cursor<queue.length;cursor++) for(const edge of triangles.get(queue[cursor]).edges)
    for(const next of edges.get(edge)) if(!keys.has(next)){keys.add(next);queue.push(next);}
  const polygons=[], shoreline=[];
  let area=0, maxDepth=0;
  for(const key of keys){
    const vertices=triangles.get(key).vertices, polygon=[];
    for(let i=0;i<3;i++){
      const p=vertices[i],q=vertices[(i+1)%3],inside=p.y<level, nextInside=q.y<level;
      if(inside)polygon.push({x:p.x,z:p.z,depth:level-p.y});
      if(inside!==nextInside){const t=(level-p.y)/(q.y-p.y);polygon.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,depth:0});}
    }
    if(polygon.length<3)continue;
    const edge=polygon.filter(p=>p.depth===0);
    if(edge.length===2)shoreline.push(edge);
    for(let i=1;i<polygon.length-1;i++)area+=Math.abs((polygon[i].x-polygon[0].x)*(polygon[i+1].z-polygon[0].z)-(polygon[i].z-polygon[0].z)*(polygon[i+1].x-polygon[0].x))*.5;
    for(const p of polygon)maxDepth=Math.max(maxDepth,p.depth);
    polygons.push(polygon);
  }
  cachedLake={ triangles, keys, polygons, shoreline, area, maxDepth, level };
  return cachedLake;
}

/** Depth against the same triangle that draws the shore. Zero outside this basin. */
export function alpineLakeDepthAt(x,z) {
  const b=ALPINE_LAKE.bounds;
  if(x<b.minX-STEP||x>b.maxX+STEP||z<b.minZ-STEP||z>b.maxZ+STEP)return 0;
  const gx=(x-ORIGIN)/STEP,gz=(z-ORIGIN)/STEP,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
  const key=triangleKey(ix,iz,fx+fz<=1?0:1), field=getAlpineLakeField();
  if(!field.keys.has(key))return 0;
  const v=field.triangles.get(key).vertices;
  const ground=fx+fz<=1?v[0].y+(v[2].y-v[0].y)*fx+(v[1].y-v[0].y)*fz
    :v[0].y+(v[2].y-v[0].y)*(1-fx)+(v[1].y-v[0].y)*(1-fz);
  return Math.max(0,field.level-ground);
}

/** A dry bank margin prevents trunks and ordinary meadow plants entering water. */
export function alpineLakeExclusionAt(x,z) {
  const b=ALPINE_LAKE.bounds;
  if(x<b.minX-16||x>b.maxX+16||z<b.minZ-16||z>b.maxZ+16)return 0;
  const [jx,jz]=ALPINE_LAKE.jetty;
  const yard=1-smooth(7,13,Math.hypot(x-jx,z-jz));
  let depth=alpineLakeDepthAt(x,z);
  for(const [dx,dz]of [[8,0],[-8,0],[0,8],[0,-8]])depth=Math.max(depth,alpineLakeDepthAt(x+dx,z+dz));
  return Math.max(yard,smooth(0,.12,depth));
}

/** A small up-sun opening lights the boathouse; meadow plants keep growing here. */
export function alpineLakeForestExclusionAt(x,z) {
  const opening = 1-smooth(.82,1,Math.hypot((x+379)/20,(z-129)/16));
  return Math.max(alpineLakeExclusionAt(x,z),opening);
}

export function createAlpineWaterscape(THREE, scene, { groundHeight=terrainHeight,
  atmosphere=null, environment=null }={}) {
  const field=getAlpineLakeField(), group=new THREE.Group(); group.name='WillowTarn';scene.add(group);
  const geometries=new Set(),materials=new Set(),clock={value:0},wind={value:.55};
  const reflectionTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});
  reflectionTarget.texture.name='Willow Tarn bounded scene-linear reflection';
  const reflectionMatrix={value:new THREE.Matrix4()},reflectionReady={value:0};
  const waterMaterial=new THREE.MeshStandardMaterial({name:'Clear glacial tarn / sky reflection',color:0xffffff,
    roughness:.19,metalness:0,envMap:environment,envMapIntensity:.12});
  waterMaterial.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{lakeTime:clock,lakeWind:wind,lakeReflectionMatrix:reflectionMatrix,
      lakeReflectionReady:reflectionReady,lakeReflectionMap:{value:reflectionTarget.texture}});
    shader.vertexShader=`attribute float lakeDepth; varying float vLakeDepth; varying vec2 vLakeWorld;
      varying vec4 vLakeReflection; uniform mat4 lakeReflectionMatrix; uniform float lakeTime;\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vLakeDepth=lakeDepth;vLakeWorld=position.xz;
      transformed.y+=sin(position.x*.12+position.z*.17+lakeTime*.9)*.012*smoothstep(0.0,.32,lakeDepth);
      vLakeReflection=lakeReflectionMatrix*modelMatrix*vec4(transformed,1.0);`);
    shader.fragmentShader=`varying float vLakeDepth; varying vec2 vLakeWorld; varying vec4 vLakeReflection;
      uniform float lakeTime; uniform float lakeWind; uniform float lakeReflectionReady;
      uniform sampler2D lakeReflectionMap;\n${shader.fragmentShader}`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float lakeAbsorb=1.0-exp(-vLakeDepth*2.2);
      vec3 bed=vec3(.080,.112,.075);
      vec3 deepWater=vec3(.008,.041,.045);
      diffuseColor.rgb=mix(bed,deepWater,lakeAbsorb);
      float caustic=pow(.5+.5*sin(vLakeWorld.x*1.7+sin(vLakeWorld.y*1.3+lakeTime*.6)*1.2),12.0);
      float shore=smoothstep(0.0,.11,vLakeDepth)*(1.0-smoothstep(.25,.85,vLakeDepth));
      diffuseColor.rgb+=vec3(.018,.024,.016)*caustic*shore;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      vec2 p=vLakeWorld;
      float a=dot(p,vec2(.83,.55))*2.3+sin(dot(p,vec2(-.10,.14)))*1.7+lakeTime*1.6;
      float b=dot(p,vec2(-.35,.94))*3.9+sin(dot(p,vec2(.18,.06)))*1.1+lakeTime*2.1;
      float c=dot(p,vec2(.96,-.29))*6.7+sin(p.y*.37)*.6+lakeTime*2.7;
      float fineFade=1.0-smoothstep(.4,1.5,max(fwidth(a),max(fwidth(b),fwidth(c))));
      vec2 lakeSlope=(vec2(.83,.55)*cos(a)*.014+vec2(-.35,.94)*cos(b)*.008
        +vec2(.96,-.29)*cos(c)*.004)*fineFade*lakeWind;
      lakeSlope+=vec2(.54,.84)*cos(dot(p,vec2(.54,.84))*.19+lakeTime*.7)*.004;
      vec3 lakeNormal=normalize(vec3(-lakeSlope.x,1.0,-lakeSlope.y));
      normal=normalize(mat3(viewMatrix)*lakeNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 lakeUv=vLakeReflection.xy/max(vLakeReflection.w,.0001);
      lakeUv+=lakeSlope*.035*smoothstep(0.0,.18,vLakeDepth);
      vec2 lakeEdge=smoothstep(vec2(0.0),vec2(.025),lakeUv)
        *(1.0-smoothstep(vec2(.975),vec2(1.0),lakeUv));
      float lakeFresnel=.02+.98*pow(1.0-max(dot(normal,normalize(vViewPosition)),0.0),5.0);
      vec3 lakeReflected=texture2D(lakeReflectionMap,clamp(lakeUv,vec2(.001),vec2(.999))).rgb;
      outgoingLight=mix(outgoingLight,lakeReflected,lakeFresnel*lakeReflectionReady
        *lakeEdge.x*lakeEdge.y*step(0.0,vLakeReflection.w));
      #include <opaque_fragment>`);
  };
  waterMaterial.customProgramCacheKey=()=> 'willow-tarn-planar-fresnel-v2';materials.add(waterMaterial);
  const positions=[],depths=[];
  for(const polygon of field.polygons)for(let i=1;i<polygon.length-1;i++)for(const p of [polygon[0],polygon[i],polygon[i+1]]){
    positions.push(p.x,field.level+.008,p.z);depths.push(p.depth);
  }
  const waterGeometry=new THREE.BufferGeometry();
  waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  waterGeometry.setAttribute('lakeDepth',new THREE.Float32BufferAttribute(depths,1));
  waterGeometry.computeVertexNormals();waterGeometry.computeBoundingBox();waterGeometry.computeBoundingSphere();geometries.add(waterGeometry);
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.name='TerrainClippedTarn';water.receiveShadow=true;group.add(water);

  const wood=new THREE.MeshStandardMaterial({name:'Weathered shore timber',vertexColors:true,roughness:.92});
  const stone=new THREE.MeshStandardMaterial({name:'Wet shoreline granite',vertexColors:true,roughness:.92});
  const metal=new THREE.MeshStandardMaterial({name:'Jetty iron fittings',color:0x47483e,metalness:.65,roughness:.48,vertexColors:true});
  const reedMaterial=new THREE.MeshStandardMaterial({name:'Shore reeds',vertexColors:true,roughness:.94,side:THREE.DoubleSide});
  for(const m of [wood,stone,metal,reedMaterial])materials.add(m);
  for(const material of [wood]){
    material.onBeforeCompile=shader=>{
      shader.vertexShader=`varying vec2 shoreUv;\n${shader.vertexShader}`.replace('#include <begin_vertex>','#include <begin_vertex>\nshoreUv=uv;');
      shader.fragmentShader=`varying vec2 shoreUv;\n${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
        float fibre=sin(shoreUv.x*147.0+sin(shoreUv.y*17.0)*2.0);
        float fade=1.0-smoothstep(.3,2.0,fwidth(shoreUv.x*147.0));
        diffuseColor.rgb*=.93+fibre*.06*fade;`);
    };
    material.customProgramCacheKey=()=> 'shore-timber-brush-v1';
  }
  reedMaterial.onBeforeCompile=shader=>{
    shader.uniforms.lakeTime=clock;
    shader.vertexShader=`uniform float lakeTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.x+=sin(lakeTime*1.6+position.z*.25)*uv.y*uv.y*.045;
      transformed.z+=cos(lakeTime*1.3+position.x*.21)*uv.y*uv.y*.027;`);
  };
  reedMaterial.customProgramCacheKey=()=> 'shore-reed-breeze-v1';
  const batches=new Map(),color=new THREE.Color(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  function add(material,geometry,position,size,pigment,parent=group,angles=[0,0,0]){
    const key=material.uuid+':'+parent.uuid;
    if(!batches.has(key))batches.set(key,{material,parent,positions:[],normals:[],colors:[],uvs:[]});
    const batch=batches.get(key);color.set(pigment);rotation.setFromEuler(new THREE.Euler(...angles));
    matrix.compose(new THREE.Vector3(...position),rotation,new THREE.Vector3(...size));geometry.applyMatrix4(matrix);
    const draw=geometry.index?geometry.toNonIndexed():geometry;
    for(let i=0;i<draw.attributes.position.count;i++){
      for(const [name,out]of[['position',batch.positions],['normal',batch.normals]])out.push(draw.attributes[name].getX(i),draw.attributes[name].getY(i),draw.attributes[name].getZ(i));
      batch.colors.push(color.r,color.g,color.b);batch.uvs.push(draw.attributes.uv?.getX(i)||0,draw.attributes.uv?.getY(i)||0);
    }
    if(draw!==geometry)draw.dispose();geometry.dispose();
  }
  const box=(m,p,s,c,parent=group,a)=>add(m,new THREE.BoxGeometry(1,1,1),p,s,c,parent,a);
  const pole=(m,a,b,r,c,parent=group)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    const g=new THREE.CylinderGeometry(r*.9,r,delta.length(),7);g.applyQuaternion(q);g.translate(...start.add(end).multiplyScalar(.5).toArray());add(m,g,[0,0,0],[1,1,1],c,parent);
  };
  const [jx,jz]=ALPINE_LAKE.jetty,deck=field.level+.55;
  // Uneven individual boards, double bearers and actual submerged supports.
  for(let i=0;i<34;i++)box(wood,[jx,deck+(rand(i)-.5)*.025,jz+i*.78],[2.65,.17,.72],i%5===0?'#8e7755':'#a38b61');
  for(const side of [-1,1]){
    box(wood,[jx+side*.94,deck-.27,jz+12.8],[.18,.32,26.3],'#655c43');
    for(const dz of [1.5,8,16,24]){
      const y=groundHeight(jx+side*1.1,jz+dz),top=deck+.28;
      pole(wood,[jx+side*1.1,y-.3,jz+dz],[jx+side*1.1,top,jz+dz],.11,'#6f6950');
      box(metal,[jx+side*1.1,deck-.14,jz+dz],[.24,.08,.24],'#474a40');
    }
  }
  // An open end invites sitting at the water; short rail only protects the shore.
  for(const side of [-1,1]){
    for(const dz of [0,5.8])pole(wood,[jx+side*1.15,deck,jz+dz],[jx+side*1.15,deck+.95,jz+dz],.065,'#9a8057');
    pole(wood,[jx+side*1.15,deck+.86,jz],[jx+side*1.15,deck+.86,jz+5.8],.055,'#ad946a');
  }
  const porch=[-392.15,142.23],walkYaw=Math.atan2(jx-porch[0],jz-porch[1]);
  const walkLength=Math.hypot(jx-porch[0],jz-porch[1]),walkBoards=Math.ceil(walkLength/.47);
  for(let i=0;i<walkBoards;i++){
    const t=i/walkBoards,x=porch[0]+(jx-porch[0])*t,z=porch[1]+(jz-porch[1])*t;
    box(wood,[x,deck-.05,z],[1.4,.13,.43],'#9b835e',group,[0,walkYaw,0]);
    if(i%6===0)for(const side of [-1,1]){
      const px=x+Math.cos(walkYaw)*side*.5,pz=z-Math.sin(walkYaw)*side*.5;
      pole(wood,[px,groundHeight(px,pz)-.15,pz],[px,deck-.1,pz],.065,'#655c43');
    }
  }
  const benchZ=jz-4,benchY=groundHeight(jx+4,benchZ);
  box(wood,[jx+4,benchY+.55,benchZ],[2.9,.15,.66],'#aa8a5e');
  box(wood,[jx+4,benchY+1.02,benchZ-.31],[2.9,.5,.11],'#917851');
  for(const side of [-1,1])box(wood,[jx+4+side*1.04,benchY+.25,benchZ],[.17,.6,.55],'#625a43');
  // A Blender-authored skiff mounts here at its authored waterline. Animation
  // never mutates or assumes ownership of the external model's resources.
  const boat=new THREE.Group();boat.name='MooredBoatAnchor';boat.position.set(jx+3.3,field.level,jz+22);boat.rotation.y=.12;group.add(boat);
  const ropePath=new THREE.CatmullRomCurve3([new THREE.Vector3(jx+1.1,deck+.2,jz+23.5),new THREE.Vector3(jx+2.1,field.level+.13,jz+23.3),new THREE.Vector3(jx+3.518,field.level+.42,jz+23.807)]);
  add(wood,new THREE.TubeGeometry(ropePath,12,.022,4,false),[0,0,0],[1,1,1],'#b9aa83');

  // Broken shoreline groups: never an evenly spaced ring of identical props.
  let stones=0,reeds=0;
  field.shoreline.forEach(([a,b],i)=>{
    const x=(a.x+b.x)*.5,z=(a.z+b.z)*.5;
    if(Math.hypot(x-jx,z-(jz+10))<7)return;
    if(rand(i*7+3)<.22){const size=.22+rand(i*9+7)*.72;
      add(stone,new THREE.IcosahedronGeometry(1,1),[x,groundHeight(x,z)+size*.18,z],[size,size*.5,size*.78],rand(i+8)>.5?'#777c64':'#666f63',group,[.1,rand(i)*6.28,.1]);stones++;
    }
    if(rand(i*13+3)>.34)return;
    for(let stalk=0;stalk<7;stalk++){
      const px=x+(rand(i*31+stalk)-.5)*2.8,pz=z+(rand(i*53+stalk)-.5)*2.8;
      if(alpineLakeDepthAt(px,pz)>.25)continue;
      const y=groundHeight(px,pz),h=.65+rand(i*19+stalk)*.62,angle=rand(i*67+stalk)*6.28;
      const g=new THREE.PlaneGeometry(.038,h,1,3),p=g.attributes.position;
      for(let v=0;v<p.count;v++){const t=p.getY(v)/h+.5;p.setXYZ(v,p.getX(v)+Math.sin(t*1.7)*.17,p.getY(v)+h*.5,t*t*.12);}g.computeVertexNormals();
      add(reedMaterial,g,[px,y,pz],[1,1,1],stalk%3===0?'#a89c5a':'#77804b',group,[0,angle,0]);
      if(stalk%3===0)add(reedMaterial,new THREE.CylinderGeometry(.025,.033,.16,5),[px+Math.sin(angle)*.11,y+h*.94,pz+Math.cos(angle)*.11],[1,1,1],'#655a38');reeds++;
    }
  });
  for(const batch of batches.values()){
    const geometry=new THREE.BufferGeometry();
    for(const [name,values,size]of[['position',batch.positions,3],['normal',batch.normals,3],['color',batch.colors,3],['uv',batch.uvs,2]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,size));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.name=batch.material.name;mesh.castShadow=batch.material!==reedMaterial;mesh.receiveShadow=true;batch.parent.add(mesh);
  }
  materials.forEach(material=>atmosphere?.installMaterial?.(material));
  const shoreMeshes=group.children.filter(mesh=>mesh.isMesh&&mesh!==water);
  let level='high',disposed=false;
  const mirrorCamera=new THREE.PerspectiveCamera(),cameraWorld=new THREE.Vector3(),look=new THREE.Vector3();
  const lastReflectionPosition=new THREE.Vector3(),lastReflectionQuaternion=new THREE.Quaternion();
  const plane=new THREE.Plane(),clip=new THREE.Vector4(),corner=new THREE.Vector4();
  const mainProjection=new THREE.Matrix4(),frustum=new THREE.Frustum(),bufferSize=new THREE.Vector2();
  const viewport=new THREE.Vector4(),scissor=new THREE.Vector4(),clearColor=new THREE.Color();
  const atmosphereCamera=atmosphere?.uniforms?.aerialCameraPosition?.value,savedAtmosphereCamera=new THREE.Vector3();
  const hiddenObjects=[],hiddenVisibility=[];
  let lastReflectionTime=-Infinity,reflectionRendering=false;
  const reflectionStats={frames:0,width:0,height:0,enabled:false};
  /**
   * Planar-camera/oblique-clipping adaptation of Three.js r180 Water/Reflector.
   * Copyright (c) 2010-2025 three.js authors. MIT notice retained in
   * vendor/THREE-LICENSE.txt. The bounded scheduling and integration are original.
   */
  function renderReflection(renderer,camera,{seconds=clock.value,renderSky=null,hideObjects=[],force=false}={}){
    if(disposed||reflectionRendering||level==='low'||!water.visible){reflectionReady.value=0;reflectionStats.enabled=false;return false;}
    camera.updateMatrixWorld(true);camera.getWorldPosition(cameraWorld);
    if(cameraWorld.y<=field.level+.04){reflectionReady.value=0;reflectionStats.enabled=false;return false;}
    mainProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(mainProjection);
    water.updateWorldMatrix(true,false);
    if(!frustum.intersectsObject(water)){reflectionStats.enabled=false;return false;}
    renderer.getDrawingBufferSize(bufferSize);
    const cap=REFLECTION_LIMITS[level];
    const scale=Math.min(1,cap.width/bufferSize.x,cap.height/bufferSize.y);
    const width=Math.max(1,Math.ceil(bufferSize.x*scale)),height=Math.max(1,Math.ceil(bufferSize.y*scale));
    const resized=reflectionTarget.width!==width||reflectionTarget.height!==height;
    const moved=cameraWorld.distanceToSquared(lastReflectionPosition)>.04;
    const turned=1-Math.abs(camera.quaternion.dot(lastReflectionQuaternion))>.00002;
    const jumped=cameraWorld.distanceToSquared(lastReflectionPosition)>64
      ||1-Math.abs(camera.quaternion.dot(lastReflectionQuaternion))>.004;
    const interval=cap.interval,elapsed=seconds-lastReflectionTime;
    if(!force&&reflectionReady.value>0&&!resized&&!jumped&&elapsed>=0
      &&(elapsed<interval||!moved&&!turned&&elapsed<.6))return false;
    const type=renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
    if(reflectionTarget.texture.type!==type){reflectionTarget.dispose();reflectionTarget.texture.type=type;}
    if(resized)reflectionTarget.setSize(width,height);
    mirrorCamera.copy(camera,false);
    mirrorCamera.position.copy(cameraWorld);mirrorCamera.position.y=field.level*2-cameraWorld.y;
    camera.getWorldDirection(look);look.add(cameraWorld);look.y=field.level*2-look.y;
    mirrorCamera.up.setFromMatrixColumn(camera.matrixWorld,1);mirrorCamera.up.y*=-1;
    mirrorCamera.lookAt(look);mirrorCamera.updateMatrixWorld(true);
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    reflectionMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1)
      .multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
    // Keep only the half-space above the water, independent of screen depth.
    plane.setComponents(0,1,0,-field.level-.006).applyMatrix4(mirrorCamera.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const e=mirrorCamera.projectionMatrix.elements;
    corner.set((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
    clip.multiplyScalar(2/clip.dot(corner));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.0001;e[14]=clip.w;
    mirrorCamera.projectionMatrixInverse.copy(mirrorCamera.projectionMatrix).invert();
    const target=renderer.getRenderTarget(),xr=renderer.xr.enabled,autoClear=renderer.autoClear;
    const shadowAuto=renderer.shadowMap.autoUpdate,shadowNeeds=renderer.shadowMap.needsUpdate;
    const autoReset=renderer.info.autoReset,toneMapping=renderer.toneMapping;
    const clearAlpha=renderer.getClearAlpha(),scissorTest=renderer.getScissorTest(),background=scene.background;
    renderer.getClearColor(clearColor);renderer.getViewport(viewport);renderer.getScissor(scissor);
    if(atmosphereCamera){savedAtmosphereCamera.copy(atmosphereCamera);atmosphereCamera.copy(mirrorCamera.position);}
    hiddenObjects.length=hiddenVisibility.length=0;
    scene.traverse(object=>{
      if(object===water||object.userData.groundCover||object.userData.skipWaterReflection||hideObjects.includes(object)
        ||renderSky&&object.name==='CoherentAlpineSky'){
        hiddenObjects.push(object);hiddenVisibility.push(object.visible);object.visible=false;
      }
    });
    reflectionRendering=true;
    try{
      renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      renderer.info.autoReset=false;renderer.autoClear=false;renderer.toneMapping=THREE.NoToneMapping;
      renderer.setRenderTarget(reflectionTarget);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);
      renderer.setClearColor(0x172522,1);renderer.state?.buffers?.depth?.setMask(true);renderer.clear(true,true,true);
      if(renderSky){scene.background=null;renderSky(renderer,mirrorCamera);}
      renderer.render(scene,mirrorCamera);
      reflectionReady.value=1;lastReflectionTime=seconds;lastReflectionPosition.copy(cameraWorld);
      lastReflectionQuaternion.copy(camera.quaternion);reflectionStats.frames++;
      reflectionStats.width=width;reflectionStats.height=height;reflectionStats.enabled=true;
    }catch(error){
      reflectionReady.value=0;throw error;
    }finally{
      for(let i=0;i<hiddenObjects.length;i++)hiddenObjects[i].visible=hiddenVisibility[i];
      if(atmosphereCamera)atmosphereCamera.copy(savedAtmosphereCamera);
      scene.background=background;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowNeeds;
      renderer.info.autoReset=autoReset;renderer.autoClear=autoClear;renderer.toneMapping=toneMapping;
      renderer.setClearColor(clearColor,clearAlpha);renderer.setRenderTarget(target);
      renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
      reflectionRendering=false;
    }
    return true;
  }
  const stats={area:Math.round(field.area),maxDepth:field.maxDepth,shoreStones:stones,reeds,
    draws:1+batches.size,triangles:positions.length/9+[...batches.values()].reduce((sum,batch)=>sum+batch.positions.length/9,0),reflection:reflectionStats};
  return {group,water,boat,boatAnchor:boat,stats,field,level:field.level,exclusionAt:alpineLakeExclusionAt,depthAt:alpineLakeDepthAt,
    renderReflection,reflectionTarget,reflectionCamera:mirrorCamera,
    setQuality(next){if(!['high','medium','low'].includes(next))return false;level=next;return true;},
    update(camera,seconds=0,weather=0){if(disposed)return;clock.value=seconds;const strength=typeof weather==='number'?weather:Math.hypot(weather?.x||0,weather?.z||0);wind.value=.35+Math.min(1,strength/10)*.65;
      boat.position.y=field.level+Math.sin(seconds*.72)*.025;boat.rotation.z=Math.sin(seconds*.49)*.012;boat.rotation.x=Math.sin(seconds*.61+.7)*.009;
      const distance=camera?Math.hypot(camera.x-jx,camera.z-jz):0;for(const mesh of shoreMeshes)mesh.visible=distance<(level==='low'?380:level==='medium'?650:1000);boat.visible=distance<1000;
    },
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();reflectionTarget.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
  };
}
