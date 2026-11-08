/** Small inhabited details: tended plants, a laid table, drying linen and stove smoke. */
import { ALPINE_SITES } from './alpine-sites.js';
import { batchStaticMeshes } from './static-batch.js';

export const REFUGE_LIFE_FOOTPRINTS = Object.freeze([
  [8.6, -7.7, .2, .2], [8.6, -1.4, .2, .2],
  [5.5, -5.8, 1.0, .65], [-5.5, -5.0, .8, .6],
]);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createLivingRefuge(THREE, scene, { groundHeight = () => 0,
  atmosphere = null, quality = 'high' } = {}) {
  const site = ALPINE_SITES.find(site => site.id === 'landing-refuge');
  const group = new THREE.Group(); group.name = 'LifeAtTheRefuge'; scene.add(group);
  const authored = new THREE.Group(), parts = [], sourceGeometries = new Set();
  const geometries = new Set(), materials = new Set();
  const siteY = groundHeight(site.x, site.z), c = Math.cos(site.yaw), s = Math.sin(site.yaw);
  authored.position.set(site.x, siteY, site.z); authored.rotation.y = site.yaw;
  const localGround = (x, z) => groundHeight(site.x + c * x + s * z, site.z - s * x + c * z) - siteY;
  const aboveFeet = (points, rise) => Math.max(...points.map(([x,z]) => localGround(x,z))) + rise;
  const floor = aboveFeet([[-4.5,-3],[4.5,-3],[-4.5,3],[4.5,3]], .28);
  const time = { value: 0 }, wind = { value: .35 };
  const opaque = new THREE.MeshStandardMaterial({ name: 'Refuge daily-use objects', color: 0xffffff, vertexColors: true, roughness: .84 });
  const leaves = new THREE.MeshStandardMaterial({ name: 'Tended herbs and flowers', color: 0xffffff, vertexColors: true, roughness: .94, side: THREE.DoubleSide });
  const linen = new THREE.MeshStandardMaterial({ name: 'Drying woven linen', color: 0xffffff, vertexColors: true, roughness: .99, side: THREE.DoubleSide });
  for (const material of [opaque, leaves, linen]) materials.add(material);
  linen.onBeforeCompile = shader => {
    shader.uniforms.refugeTime = time; shader.uniforms.refugeWind = wind;
    shader.vertexShader = `attribute float linenFlutter; uniform float refugeTime, refugeWind; varying vec2 linenUv;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      linenUv = uv;
      float wave = sin(refugeTime * 1.35 + position.z * 2.7) * .11
        + sin(refugeTime * 2.3 + position.y * 4.1 + position.z * 5.8) * .035;
      transformed.x += wave * linenFlutter * refugeWind;
      transformed.y += sin(refugeTime * 1.7 + position.z * 3.1) * .025 * linenFlutter * refugeWind;
    `);
    shader.fragmentShader = `varying vec2 linenUv;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 thread = linenUv * vec2(170.0, 210.0);
      float weave = sin(thread.x) * sin(thread.y);
      float resolved = 1.0 - smoothstep(.4, 1.6, max(fwidth(thread.x), fwidth(thread.y)));
      diffuseColor.rgb *= .97 + .045 * weave * resolved;
    `);
  };
  linen.customProgramCacheKey = () => 'refuge-drying-linen-v1';
  if (atmosphere?.installMaterial) for (const material of materials) atmosphere.installMaterial(material);

  let seed = 0;
  function part(geometry, pigment, material = opaque, position = [0,0,0], rotation = null) {
    const color = new THREE.Color(pigment), p = geometry.attributes.position;
    const colors = new Float32Array(p.count * 3), n = seed++;
    for (let i=0; i<p.count; i++) {
      const variation = .95 + .05 * Math.sin(p.getX(i)*19 + p.getY(i)*23 + p.getZ(i)*11 + n);
      colors.set([color.r*variation, color.g*variation, color.b*variation], i*3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true; authored.add(mesh); parts.push(mesh); sourceGeometries.add(geometry);
    return mesh;
  }
  const box = (p, size, pigment, material = opaque) => part(new THREE.BoxGeometry(...size), pigment, material, p);
  const cylinder = (p, top, bottom, height, pigment, sides=12) => part(new THREE.CylinderGeometry(top,bottom,height,sides),pigment,opaque,p);
  function tube(points, radius, pigment, segments=18) {
    return part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,5,false),pigment);
  }
  function leaf(origin, angle, length, width, pigment) {
    const points=[], uvs=[], indices=[], rows=5;
    for(let i=0;i<=rows;i++) for(const side of [-1,0,1]) {
      const t=i/rows, lateral=side*Math.sin(Math.PI*t)*width;
      const y=Math.sin(t*Math.PI)*length*.26 + Math.abs(side)*width*.18;
      points.push(origin[0]+Math.cos(angle)*t*length-Math.sin(angle)*lateral,
        origin[1]+y, origin[2]+Math.sin(angle)*t*length+Math.cos(angle)*lateral);
      uvs.push((side+1)/2,t);
    }
    for(let i=0;i<rows;i++) for(let j=0;j<2;j++) {const a=i*3+j;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    part(geometry,pigment,leaves);
  }
  function planter(x,z,width,depth,floral=false) {
    const y=aboveFeet([[x-width/2,z-depth/2],[x+width/2,z+depth/2]],.25);
    for(const side of [-1,1]) {
      box([x,y,z+side*depth/2],[width,.43,.09],'#916344');
      box([x+side*width/2,y,z],[.09,.43,depth],'#a5734d');
      for(const end of [-1,1]) box([x+end*width*.43,y+.025,z+side*depth/2],[.075,.55,.12],'#c59b68');
    }
    box([x,y+.16,z],[width-.10,.055,depth-.10],'#4c3f2e');
    const count=floral?6:8;
    for(let i=0;i<count;i++) {
      const px=x+((i%4)/3-.5)*(width-.27),pz=z+(Math.floor(i/4)-.5)*(depth-.20), py=y+.2;
      for(let sprig=0;sprig<7;sprig++) {
        const angle=sprig*2.399+i*.7;
        leaf([px,py,pz],angle,.20+.08*Math.sin(i*2+sprig),.06,floral?'#687d47':'#6d8654');
      }
      if(floral) for(let flower=0;flower<3;flower++) {
        const angle=flower*2.2+i, px2=px+Math.cos(angle)*.10,pz2=pz+Math.sin(angle)*.10;
        const h=.32+(i%3)*.045;
        tube([[px,py,pz],[px2,py+h*.5,pz2],[px2,py+h,pz2]],.009,'#566d3e',5);
        for(let petal=0;petal<6;petal++) {
          const a=petal*Math.PI/3;
          const mesh=part(new THREE.SphereGeometry(1,6,4),i%2?'#f1d788':'#c28da4',leaves,
            [px2+Math.cos(a)*.036,py+h,pz2+Math.sin(a)*.036]);mesh.scale.set(.049,.018,.034);mesh.rotation.y=-a;
        }
        part(new THREE.SphereGeometry(.027,6,4),'#b98a32',leaves,[px2,py+h+.015,pz2]);
      }
    }
    return y;
  }
  planter(5.5,-5.8,1.75,1.0,false); planter(-5.5,-5,1.35,.85,true);
  // A pair of terracotta pots and a watering can belong to the tended beds.
  for(const [x,z,r] of [[6.45,-5.25,.22],[-5.04,-4.43,.18]]) {
    const y=localGround(x,z);
    cylinder([x,y+.19,z],r,r*.73,.38,'#af7450');
    const rim=part(new THREE.TorusGeometry(r,.033,5,16),'#c58e62',opaque,[x,y+.38,z],[Math.PI/2,0,0]);
    cylinder([x,y+.365,z],r*.88,r*.88,.018,'#4b4031');
    for(let i=0;i<9;i++) leaf([x,y+.39,z],i*2.4,.25,.055,'#73844f');
  }
  const canX=6.25,canZ=-6.5,canY=localGround(canX,canZ);
  cylinder([canX,canY+.23,canZ],.22,.20,.44,'#688989');
  tube([[canX-.15,canY+.20,canZ],[canX-.40,canY+.39,canZ],[canX-.49,canY+.56,canZ]],.055,'#7b9a93',8);
  tube([[canX+.10,canY+.42,canZ],[canX+.31,canY+.51,canZ],[canX+.35,canY+.12,canZ],[canX+.17,canY+.08,canZ]],.025,'#476c6b',12);

  // Garments hang along the side yard. Top vertices remain exactly on the line.
  const xLine=8.6, zStart=-7.7,zEnd=-1.4, top=aboveFeet([[xLine,zStart],[xLine,zEnd]],2.40);
  for(const z of [zStart,zEnd]) {
    const foot=localGround(xLine,z); box([xLine,(foot+top)/2,z],[.14,top-foot,.14],'#887354');
    cylinder([xLine,top+.025,z],.10,.10,.07,'#b59c70',8);
  }
  const lineY=z=>top-Math.sin((z-zStart)/(zEnd-zStart)*Math.PI)*.22;
  tube(Array.from({length:13},(_,i)=>{const z=zStart+(zEnd-zStart)*i/12;return[xLine,lineY(z),z];}),.014,'#9a9781',30);
  const linens=[{z:-6.75,width:1.15,height:1.23,color:'#d4c6a6'},
    {z:-4.77,width:.85,height:.98,color:'#718f8a'}, {z:-3.12,width:1.02,height:1.18,color:'#b77d67'}];
  for(const [index,item] of linens.entries()) {
    const positions=[],uvs=[],flutter=[],colors=[],indices=[],nx=12,ny=14;
    const base=new THREE.Color(item.color),edge=new THREE.Color(index===1?'#d0c19c':'#88674f');
    for(let y=0;y<=ny;y++) for(let z=0;z<=nx;z++) {
      const u=z/nx,t=y/ny, pz=item.z+(u-.5)*item.width;
      positions.push(xLine+Math.sin(u*Math.PI*6)*.042*(.25+t),lineY(pz)-t*item.height,pz);
      uvs.push(u,1-t);flutter.push(t*t);
      const border=(u<.055||u>.945||t>.93), pigment=border?edge:base;
      const shade=.95+.05*Math.sin(u*18.85);colors.push(pigment.r*shade,pigment.g*shade,pigment.b*shade);
    }
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('linenFlutter',new THREE.Float32BufferAttribute(flutter,1));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,linen);mesh.castShadow=false;mesh.receiveShadow=true;authored.add(mesh);parts.push(mesh);sourceGeometries.add(geometry);
    for(const side of [-1,1]) {
      const z=item.z+side*item.width*.40;
      box([xLine,lineY(z)+.015,z],[.065,.12,.028],'#bb9a6c');
    }
  }

  // Breakfast left on the actual picnic tabletop: enamel mugs, bread and a pot.
  const table=aboveFeet([[-2.8,-9.6],[-.2,-9.6],[-2.8,-7.6],[-.2,-7.6]],.87)+.065;
  for(const [x,z] of [[-2.32,-8.47],[-.55,-8.83]]) {
    cylinder([x,table+.017,z],.20,.18,.035,'#d3c7a5',16);
    cylinder([x+.10,table+.15,z+.23],.095,.083,.26,'#477677');
    cylinder([x+.10,table+.284,z+.23],.079,.079,.006,'#3c3027');
    const handle=part(new THREE.TorusGeometry(.075,.016,5,10),'#477677',opaque,[x+.207,table+.16,z+.23],[0,Math.PI/2,0]);
  }
  const loaf=part(new THREE.SphereGeometry(1,12,8),'#bc8846',opaque,[-1.52,table+.13,-8.67]);loaf.scale.set(.32,.12,.19);
  for(let i=0;i<4;i++) tube([[-1.70+i*.12,table+.21,-8.80],[-1.66+i*.12,table+.25,-8.67],[-1.62+i*.12,table+.21,-8.54]],.009,'#dfbd7c',5);
  cylinder([-1.30,table+.18,-8.14],.14,.16,.34,'#bcc1ac');
  part(new THREE.SphereGeometry(.15,10,6),'#87998e',opaque,[-1.30,table+.35,-8.14]).scale.y=.26;
  part(new THREE.SphereGeometry(.04,6,4),'#3f524b',opaque,[-1.30,table+.41,-8.14]);

  authored.updateMatrixWorld(true);
  for(const batch of batchStaticMeshes(THREE,parts,{name:'RefugeEverydayDetails'})) {
    group.add(batch);geometries.add(batch.geometry);
    // GPU linen movement is bounded by 0.25 m around these source vertices.
    if(batch.material===linen) {batch.geometry.boundingBox.expandByScalar(.3);batch.geometry.boundingSphere.radius+=.3;}
  }
  for(const geometry of sourceGeometries) geometry.dispose();

  // A fixed set of camera-facing wisps. Density is shaped in the fragment shader,
  // rather than displaying opaque spheres or changing particle count each frame.
  const smokeGeometry=new THREE.InstancedBufferGeometry();
  smokeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,-.5,.5,0,.5,.5,0],3));
  smokeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));smokeGeometry.setIndex([0,1,2,2,1,3]);
  smokeGeometry.setAttribute('wispPhase',new THREE.InstancedBufferAttribute(Float32Array.from({length:24},(_,i)=>i/24),1));
  smokeGeometry.instanceCount=24;geometries.add(smokeGeometry);
  const chimney=new THREE.Vector3(2.60,floor+6.36,1.35).applyMatrix4(authored.matrixWorld);
  const smokeWind={value:new THREE.Vector2(.7,.2)};
  const aerialGLSL=atmosphere?.scatteringGLSL||'';
  const smokeMaterial=new THREE.ShaderMaterial({name:'Small wood-stove smoke plume',transparent:true,depthWrite:false,depthTest:true,
    uniforms:{...atmosphere?.uniforms,refugeTime:time,smokeOrigin:{value:chimney},smokeWind},
    vertexShader:`attribute float wispPhase;uniform float refugeTime;uniform vec3 smokeOrigin;uniform vec2 smokeWind;
      varying vec2 smokeUv;varying float smokeAge;varying vec3 smokeWorld;
      void main(){
        float age=fract(wispPhase+refugeTime/10.5); smokeAge=age;
        float curl=sin(age*10.0+wispPhase*11.0);
        vec3 p=smokeOrigin+vec3(smokeWind.x*age*age*4.0+curl*age*.22,age*9.0,
          smokeWind.y*age*age*4.0+cos(age*8.0+wispPhase*7.0)*age*.22);
        smokeWorld=p;smokeUv=uv;
        vec4 view=modelViewMatrix*vec4(p,1.0);
        view.xy+=position.xy*(.38+age*2.4);
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`varying vec2 smokeUv;varying float smokeAge;varying vec3 smokeWorld;
      ${aerialGLSL}
      float smokeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float smokeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(smokeHash(i),smokeHash(i+vec2(1,0)),f.x),mix(smokeHash(i+vec2(0,1)),smokeHash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=(smokeUv-.5)*2.0;
        float grain=smokeNoise(smokeUv*5.0+smokeAge*3.0)*.62+smokeNoise(smokeUv*11.0-smokeAge*2.0)*.38;
        float edge=1.0-smoothstep(.12,.95,length(p)+grain*.18);
        float fade=smoothstep(0.0,.08,smokeAge)*(1.0-smoothstep(.55,1.0,smokeAge));
        float alpha=edge*fade*(.14+grain*.08);
        if(alpha<.003)discard;
        vec3 pigment=mix(vec3(.42,.46,.48),vec3(.65,.64,.60),grain);
        ${aerialGLSL?'pigment=aerialApply(pigment,smokeWorld);':''}
        gl_FragColor=vec4(pigment,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });materials.add(smokeMaterial);
  const smoke=new THREE.Mesh(smokeGeometry,smokeMaterial);smoke.name='RefugeChimneySmoke';smoke.frustumCulled=false;smoke.renderOrder=4;group.add(smoke);
  const bounds=new THREE.Box3();
  for(const mesh of group.children)if(mesh!==smoke)bounds.expandByObject(mesh);
  // Smoke uses shader positions; add its entire bounded wind envelope explicitly.
  bounds.expandByPoint(chimney.clone().add(new THREE.Vector3(-9,0,-9)));
  bounds.expandByPoint(chimney.clone().add(new THREE.Vector3(9,12,9)));
  const camera=new THREE.Vector3(site.x,siteY,site.z);
  let level=['high','medium','low'].includes(quality)?quality:'high',disposed=false;
  const stats={draws:group.children.length,triangles:[...geometries].reduce((sum,g)=>sum+(g.index?.count??g.attributes.position.count)/3*(g.isInstancedBufferGeometry?g.instanceCount:1),0),smokeWisps:24};
  function refresh(){
    group.visible=bounds.distanceToPoint(camera)<(level==='low'?400:level==='medium'?750:1100);
    smokeGeometry.instanceCount=level==='low'?12:level==='medium'?18:24;
    for(const mesh of group.children)if(mesh.material!==smokeMaterial)mesh.castShadow=level!=='low'&&mesh.material!==linen;
  }
  refresh();
  return {group,stats,bounds,footprints:REFUGE_LIFE_FOOTPRINTS,chimney,
    setQuality(next){if(!['high','medium','low'].includes(next)||next===level)return false;level=next;refresh();return true;},
    update(cameraPosition,elapsed=0,weather=0){
      if(disposed)return;if(cameraPosition)camera.copy(cameraPosition);time.value=Number.isFinite(elapsed)?elapsed:0;
      const wx=typeof weather==='number'?weather:weather?.x||0,wz=typeof weather==='number'?weather*.25:weather?.z||0;
      wind.value=clamp(.25+Math.hypot(wx,wz)/8,.25,1.4);
      smokeWind.value.set(clamp(wx*.14,-1.7,1.7),clamp(wz*.14,-1.7,1.7));refresh();
    },
    dispose(){if(disposed)return;disposed=true;scene.remove(group);for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();},
  };
}
