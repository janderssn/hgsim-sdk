/** Original, bounded wildlife silhouettes. Decorative motion never changes flight forces. */
const LEVELS = Object.freeze({
  high: Object.freeze({ raptors: 6, swallows: 3, butterflies: 8 }),
  medium: Object.freeze({ raptors: 4, swallows: 2, butterflies: 4 }),
  low: Object.freeze({ raptors: 3, swallows: 0, butterflies: 0 }),
});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function builder(THREE) {
  const positions = [], normals = [], colors = [], flex = [], color = new THREE.Color();
  return {
    add(geometry, pigment, moving = false) {
      const draw = geometry.index ? geometry.toNonIndexed() : geometry;
      const p = draw.attributes.position, n = draw.attributes.normal, c = draw.attributes.color;
      color.set(pigment);
      for (let i = 0; i < p.count; i++) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i));
        normals.push(n.getX(i), n.getY(i), n.getZ(i));
        colors.push(c ? c.getX(i) : color.r, c ? c.getY(i) : color.g, c ? c.getZ(i) : color.b);
        flex.push(moving ? Math.min(1, Math.abs(p.getX(i)) / .78) : 0);
      }
      if (draw !== geometry) draw.dispose();
      geometry.dispose();
    },
    finish(name) {
      const geometry = new THREE.BufferGeometry(); geometry.name = name;
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('wingFlex', new THREE.Float32BufferAttribute(flex, 1));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      return geometry;
    },
  };
}

function surface(THREE, rows, pigment, darkTips = false) {
  const positions = [], colors = [], indices = [], color = new THREE.Color(pigment);
  for (let row = 0; row < rows.length; row++) {
    const [x, leading, trailing, camber = .02] = rows[row];
    for (let chord = 0; chord <= 4; chord++) {
      const t = chord / 4;
      positions.push(x, Math.sin(t * Math.PI) * camber, leading + (trailing - leading) * t);
      const edge = darkTips && (row > rows.length - 3 || chord === 4) ? .68 : .92 + Math.sin(t * Math.PI) * .08;
      colors.push(color.r * edge, color.g * edge, color.b * edge);
    }
  }
  for (let row = 0; row < rows.length - 1; row++) for (let chord = 0; chord < 4; chord++) {
    const a = row * 5 + chord;
    indices.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function birdGeometry(THREE, swallow = false) {
  const parts = builder(THREE);
  const body = new THREE.SphereGeometry(1, 10, 6);
  body.scale(swallow ? .065 : .105, swallow ? .055 : .085, swallow ? .21 : .30);
  parts.add(body, swallow ? '#293e43' : '#524b3b');
  const breast = new THREE.SphereGeometry(1, 8, 5);
  breast.scale(swallow ? .052 : .077, swallow ? .022 : .038, swallow ? .14 : .21);
  breast.translate(0, swallow ? -.038 : -.06, .03);
  parts.add(breast, swallow ? '#c6bda1' : '#95856c');
  const head = new THREE.SphereGeometry(1, 8, 5);
  head.scale(swallow ? .055 : .067, swallow ? .047 : .065, swallow ? .075 : .085);
  head.translate(0, .02, swallow ? .19 : .29); parts.add(head, swallow ? '#293539' : '#635642');
  const beak = new THREE.ConeGeometry(swallow ? .021 : .027, swallow ? .06 : .08, 5);
  beak.rotateX(Math.PI / 2); beak.translate(0, .008, swallow ? .27 : .39); parts.add(beak, '#3b3930');

  for (const side of [-1, 1]) {
    // Cambered multi-section planforms: broad soaring secondaries, swept wrists,
    // tapered tips and small separated outer primaries, rather than a flat V line.
    const profile = swallow
      ? [[.055,.10,-.10,.02],[.22,.14,-.17,.025],[.48,.05,-.16,.018],[.73,-.13,-.22,.008],[.88,-.28,-.285,0]]
      : [[.075,.15,-.17,.025],[.30,.20,-.24,.048],[.62,.12,-.25,.038],[.84,.025,-.23,.026],[1.03,-.09,-.19,.012],[1.13,-.17,-.175,0]];
    for (const row of profile) row[0] *= side;
    parts.add(surface(THREE, profile, swallow ? '#33464b' : '#6d604a', true), '#ffffff', true);
    if (!swallow) for (let feather = 0; feather < 4; feather++) {
      const x = .74 + feather * .065, z = -.18 - feather * .018;
      parts.add(surface(THREE, [[side*x,z+.045,z-.04,.01],
        [side*(x+.19),z-.10,z-.15,.006],[side*(x+.24),z-.17,z-.18,0]], '#453e32'), '#ffffff', true);
    }
    const tail = swallow
      ? [[side*.025,-.15,-.22,.008],[side*.085,-.23,-.39,.005],[side*.14,-.47,-.475,0]]
      : [[side*.018,-.20,-.31,.01],[side*.10,-.29,-.47,.01],[side*.13,-.43,-.48,.004]];
    parts.add(surface(THREE, tail, swallow ? '#26393e' : '#4a4135'), '#ffffff');
  }
  return parts.finish(swallow ? 'Fork-tailed swallow' : 'Broad-winged thermal raptor');
}

function butterflyGeometry(THREE) {
  const parts = builder(THREE), light = new THREE.Color('#e9cd88'), dark = new THREE.Color('#695132');
  for (const side of [-1, 1]) for (const rear of [false, true]) {
    const positions = [side*.025,0,rear?-.035:.035], colors = [light.r,light.g,light.b], indices = [];
    // Rounded fore/hind lobes with a darker outer margin. At 7–11 cm total span
    // this is a quiet meadow insect, never an emissive particle or oversized prop.
    const outline = rear
      ? [[.05,.015],[.24,.015],[.39,-.10],[.35,-.23],[.22,-.30],[.09,-.24],[.025,-.10]]
      : [[.025,.05],[.14,.27],[.36,.36],[.49,.25],[.47,.10],[.31,-.025],[.09,-.065]];
    for (let i=0;i<outline.length;i++) {
      const [x,z]=outline[i], tint=i>1&&i<5?dark:light;
      positions.push(side*x,Math.sin(x*5)*.026,z);
      colors.push(tint.r,tint.g,tint.b);
    }
    for(let i=0;i<outline.length;i++)indices.push(0,i+1,(i+1)%outline.length+1);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();parts.add(geometry,'#ffffff',true);
  }
  const body=new THREE.SphereGeometry(1,6,4);body.scale(.023,.026,.17);parts.add(body,'#4c4635');
  return parts.finish('Meadow butterfly with paired rounded wings');
}

function animatedMaterial(THREE, kind, clock, camera, range, atmosphere) {
  const material=new THREE.MeshStandardMaterial({name:`Valley wildlife / ${kind}`,color:0xffffff,
    vertexColors:true,roughness:.94,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.wildlifeTime=clock;shader.uniforms.wildlifeCamera=camera;shader.uniforms.wildlifeRange=range;
    shader.vertexShader=`attribute float wingFlex; attribute vec2 wildlifeMotion;
      uniform float wildlifeTime, wildlifeRange; uniform vec3 wildlifeCamera;
      float wildlifeWingAngle(float flex, float side) {
        float phase=wildlifeMotion.x;
        float beat=sin(wildlifeTime*wildlifeMotion.y+phase);
        ${kind==='raptor' ? 'float gate=smoothstep(.80,.98,sin(wildlifeTime*.27+phase)); float swing=.055+beat*(.035+gate*.34);'
          : kind==='swallow' ? 'float gate=smoothstep(-.75,.20,sin(wildlifeTime*.83+phase)); float swing=.04+beat*(.08+gate*.62);'
            : 'float swing=.30+beat*.96;'}
        return swing*smoothstep(0.0,.82,flex)*sign(side);
      }
      ${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      float normalWingAngle=wildlifeWingAngle(wingFlex,position.x);
      objectNormal.xy=mat2(cos(normalWingAngle),sin(normalWingAngle),-sin(normalWingAngle),cos(normalWingAngle))*objectNormal.xy;`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float wingAngle=wildlifeWingAngle(wingFlex,position.x);
      transformed.xy=mat2(cos(wingAngle),sin(wingAngle),-sin(wingAngle),cos(wingAngle))*transformed.xy;
      vec3 animalOrigin=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
      float wildlifeFade=1.0-smoothstep(wildlifeRange*.72,wildlifeRange,distance(animalOrigin,wildlifeCamera));
      transformed*=wildlifeFade;`);
  };
  material.customProgramCacheKey=()=>`valley-wildlife-${kind}-v1`;
  atmosphere?.installMaterial?.(material);
  return material;
}

export function createValleyWildlife(THREE,scene,{groundHeight=()=>0,
  thermal={x:430,z:330,radius:160},refuge={x:-76,z:-360,yaw:.15},
  lake={jetty:[-385,150],level:2.15},atmosphere=null}={}) {
  const group=new THREE.Group();group.name='LivingValleyWildlife';scene.add(group);
  const clock={value:0},camera={value:new THREE.Vector3()},matrix=new THREE.Matrix4();
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),euler=new THREE.Euler(),scale=new THREE.Vector3();
  const batches=[],resources=[],thermalX=finite(thermal?.x,430),thermalZ=finite(thermal?.z,330);
  const thermalBase=groundHeight(thermalX,thermalZ),thermalRadius=clamp(finite(thermal?.radius,160)*.68,35,115);
  const refugeX=finite(refuge?.x,-76),refugeZ=finite(refuge?.z,-360),yaw=finite(refuge?.yaw,.15),c=Math.cos(yaw),s=Math.sin(yaw);
  const jetty=lake?.jetty||[-385,150],shoreX=finite(jetty[0],-385),shoreZ=finite(jetty[1],150);
  const lakeLevel=finite(lake?.level,-Infinity),anchors=[];
  // Refuge flowers occupy the tended bed outside its western wall.
  for(let i=0;i<4;i++) {
    const x=-5.6+(i%2)*.65,z=-5.2+Math.floor(i/2)*.55;
    anchors.push({x:refugeX+c*x+s*z,z:refugeZ-s*x+c*z,site:'refuge'});
  }
  // Find a dry reed-bank pocket rather than spawning insects over open water.
  let bankX=shoreX-9,bankZ=shoreZ+9,bankScore=Infinity;
  for(let i=0;i<16;i++) {
    const angle=i*Math.PI/8,x=shoreX+Math.cos(angle)*13,z=shoreZ+Math.sin(angle)*13;
    const h=groundHeight(x,z),score=Math.abs(h-lakeLevel-.35);
    if(h>lakeLevel+.08&&score<bankScore){bankX=x;bankZ=z;bankScore=score;}
  }
  for(let i=0;i<4;i++)anchors.push({x:bankX+(i%2)*1.2,z:bankZ+Math.floor(i/2)*1.1,site:'shore'});

  const specs=[['raptors','raptor',6,birdGeometry(THREE),2300],
    ['swallows','swallow',3,birdGeometry(THREE,true),160],
    ['butterflies','butterfly',8,butterflyGeometry(THREE),32]];
  for(const [name,kind,capacity,geometry,radius]of specs) {
    const range={value:radius},motion=new Float32Array(capacity*2);
    for(let i=0;i<capacity;i++){motion[i*2]=i*2.39996323+.4;motion[i*2+1]=kind==='raptor'?10.6+i*.3:kind==='swallow'?27+i*1.7:43+i*1.3;}
    geometry.setAttribute('wildlifeMotion',new THREE.InstancedBufferAttribute(motion,2));
    const material=animatedMaterial(THREE,kind,clock,camera,range,atmosphere);
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=`Valley ${name}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
    batches.push({name,kind,capacity,mesh,radius,range});resources.push(mesh,geometry,material);
  }
  const stats={raptors:6,swallows:3,butterflies:8,draws:0,triangles:0};
  let level='high',disposed=false;
  function update(cameraPosition,time=0,wind=0) {
    if(disposed)return;
    if(cameraPosition)camera.value.copy(cameraPosition);
    const seconds=finite(time),wx=finite(typeof wind==='number'?wind:wind?.x),wz=finite(wind?.z);
    const windX=clamp(wx,-12,12)*.025,windZ=clamp(wz,-12,12)*.025;
    clock.value=seconds;stats.draws=0;stats.triangles=0;
    for(const batch of batches) {
      const count=LEVELS[level][batch.name];batch.mesh.count=count;stats[batch.name]=count;
      let visible=false;
      for(let i=0;i<count;i++) {
        const phase=i*2.39996323+.4;
        let x,y,z,heading,bank,pitch,size;
        if(batch.kind==='raptor') {
          const rate=.105+i*.009,a=seconds*rate+phase,r=thermalRadius*(.55+i*.065);
          x=thermalX+Math.cos(a)*r;z=thermalZ+Math.sin(a)*r;
          y=thermalBase+172+i*20+Math.sin(a*2+phase)*5;
          heading=-a;bank=-.16-Math.sin(a*.7)*.04;pitch=Math.cos(a*2+phase)*.025;size=.85+i*.045;
        } else if(batch.kind==='swallow') {
          const a=seconds*(.45+i*.06)+phase,r=12+i*4;
          x=shoreX+Math.cos(a)*r;z=shoreZ+Math.sin(a)*r*.72;
          y=Math.max(groundHeight(x,z),lakeLevel)+3.3+i*.65+Math.sin(a*2.2)*.7;
          heading=Math.atan2(-Math.sin(a),Math.cos(a)*.72);bank=-.22+Math.sin(a*1.7)*.13;pitch=Math.cos(a*2.2)*.07;size=.30+i*.025;
        } else {
          // Interleave the two colonies so medium retains insects at both sites.
          const index=(i%2)*4+Math.floor(i/2),anchor=anchors[index],a=seconds*(.7+i*.037)+phase;
          x=anchor.x+Math.cos(a)*.42+Math.sin(a*2.1)*.14+windX;
          z=anchor.z+Math.sin(a*.83)*.42+windZ;
          y=Math.max(groundHeight(x,z),anchor.site==='shore'?lakeLevel:-Infinity)+.57+Math.sin(a*2.7)*.17;
          heading=Math.atan2(-Math.sin(a),Math.cos(a*.83)*.83);bank=Math.sin(a*1.4)*.18;pitch=Math.sin(a*2.7)*.08;size=.075+i*.004;
        }
        position.set(x,y,z);euler.set(pitch,heading,bank,'YXZ');rotation.setFromEuler(euler);scale.setScalar(size);
        matrix.compose(position,rotation,scale);batch.mesh.setMatrixAt(i,matrix);
        if(position.distanceToSquared(camera.value)<batch.radius*batch.radius)visible=true;
      }
      batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.visible=visible&&count>0;
      if(batch.mesh.visible){stats.draws++;stats.triangles+=count*batch.mesh.geometry.attributes.position.count/3;}
    }
  }
  update(null,0,0);
  return {group,stats,
    update,
    setQuality(next) {
      if(!LEVELS[next]||next===level||disposed)return false;
      level=next;
      for(const batch of batches){batch.mesh.count=LEVELS[level][batch.name];stats[batch.name]=batch.mesh.count;if(!batch.mesh.count)batch.mesh.visible=false;}
      return true;
    },
    dispose() {
      if(disposed)return;disposed=true;group.removeFromParent();
      for(const resource of resources)resource.dispose();
    },
  };
}
