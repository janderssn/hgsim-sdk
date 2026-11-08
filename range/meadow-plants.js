/** Original illustrated alpine plants. Metres, Y up; opaque folded surfaces. */
class PlantGeometry {
  constructor(THREE) {
    this.THREE = THREE;
    this.positions = []; this.colors = []; this.uvs = []; this.indices = [];
    this.flowerKinds = []; this.currentFlowerKind = 0;
  }
  vertex(point, color, u = .5, v = 0) {
    const index = this.positions.length / 3;
    this.positions.push(...point); this.colors.push(...color); this.uvs.push(u, v);
    this.flowerKinds.push(this.currentFlowerKind);
    return index;
  }
  triangle(a, b, c) { this.indices.push(a, b, c); }
  stem(pointAt, width, color, segments = 3) {
    const rows = [];
    for (let row = 0; row <= segments; row++) {
      const t = row / segments, center = pointAt(t), before = pointAt(Math.max(0, t - .02));
      const after = pointAt(Math.min(1, t + .02));
      const dx = after[0] - before[0], dz = after[2] - before[2], length = Math.hypot(dx, dz) || 1;
      const halfWidth = width * (1 - t * .55), sx = -dz / length * halfWidth, sz = dx / length * halfWidth;
      rows.push(this.vertex([center[0] - sx, center[1], center[2] - sz], color, 0, t));
      this.vertex([center[0] + sx, center[1], center[2] + sz], color, 1, t);
    }
    for (let row = 0; row < segments; row++) {
      this.triangle(rows[row], rows[row] + 1, rows[row + 1]);
      this.triangle(rows[row] + 1, rows[row + 1] + 1, rows[row + 1]);
    }
  }
  // Four rounded cross-sections and a raised midrib give velvety leaves volume.
  leaf(root, tip, width, arch, edgeColor, ridgeColor, { curl = 0, twist = 0, sweep = 0, coarse = false } = {}) {
    const dx = tip[0] - root[0], dz = tip[2] - root[2], length = Math.hypot(dx, dz) || 1;
    const side = [-dz / length, dx / length], rows = [];
    const pigmentPhase = dx * 23 + dz * 17 + root[0] * 43 - root[2] * 31;
    // Broad, quiet pigment changes complement the material's fine leaf veins.
    // Flower stalk foliage keeps its separate species palette.
    const pigment = (color, t, across) => {
      if (this.currentFlowerKind !== 0) return color;
      const chlorophyll = 1 + Math.sin(pigmentPhase + t * 13 + across * 2.1) * .027
        + Math.sin(pigmentPhase * 1.7 + t * 5.3 - across * 3.2) * .017;
      const age = (.035 + .08 * Math.sin(pigmentPhase + across) ** 2)
        * t ** 3 * (.35 + Math.abs(across) * .65);
      const midrib = across === 0 ? 1.035 - t * .025 : 1;
      return color.map((c, channel) => c * chlorophyll * midrib * (1 - age)
        + [.29, .245, .125][channel] * age);
    };
    const start = this.vertex(root, pigment(edgeColor, 0, 0).map(c => c * .74), .5, 0);
    const stations = coarse ? [[.18,.67],[.45,1],[.74,.86],[.95,.27]]
      : [[.13,.55],[.34,.92],[.57,1],[.80,.76],[.96,.26]];
    for (const [t, spread] of stations) {
      const bend = Math.sin(t * Math.PI), bank = bend * width * twist * spread;
      const x = root[0] + (tip[0] - root[0]) * t + side[0] * bend * sweep;
      const z = root[2] + (tip[2] - root[2]) * t + side[1] * bend * sweep;
      const y = root[1] + (tip[1] - root[1]) * t + bend * arch + curl * t ** 4;
      rows.push(this.vertex([x - side[0] * width * spread, y - bank, z - side[1] * width * spread], pigment(edgeColor, t, -1), 0, t));
      this.vertex([x, y + width * .27 * spread, z], pigment(ridgeColor, t, 0), .5, t);
      this.vertex([x + side[0] * width * spread, y + bank, z + side[1] * width * spread], pigment(edgeColor, t, 1), 1, t);
    }
    this.triangle(start, rows[0] + 1, rows[0]);
    this.triangle(start, rows[0] + 2, rows[0] + 1);
    for (let row = 0; row < rows.length - 1; row++) {
      const a = rows[row], b = rows[row + 1];
      this.triangle(a, a + 1, b); this.triangle(a + 1, b + 1, b);
      this.triangle(a + 1, a + 2, b + 1); this.triangle(a + 2, b + 2, b + 1);
    }
    const end = this.vertex([tip[0], tip[1] + curl, tip[2]], pigment(ridgeColor, 1, 0).map(c => Math.min(1, c * 1.04)), .5, 1), last = rows.at(-1);
    this.triangle(last, last + 1, end); this.triangle(last + 1, last + 2, end);
  }
  // Cupped, rounded rays around a raised ochre disk. These keep their rounded
  // silhouette at walking distance rather than reading as five flat arrows.
  bloom(center, color, radius = .037, phase = 0) {
    const [x, y, z] = center;
    for (let petal = 0; petal < 5; petal++) {
      const a = petal * Math.PI * 2 / 5 + phase, ca = Math.cos(a), sa = Math.sin(a);
      const width = radius * .34, first = this.positions.length / 3;
      for (const [t, side] of [[.16,0],[.52,-.85],[.88,-.78],[1,0],[.88,.78],[.52,.85]]) {
        const dy = .004 + Math.sin(t * Math.PI) * .009 + t * .003;
        const shade = .85 + t * .18;
        this.vertex([x + ca * radius * t - sa * width * side, y + dy,
          z + sa * radius * t + ca * width * side], color.map(c=>Math.min(1,c*shade)), .5+side*.5,t);
      }
      for (let side = 1; side < 5; side++) this.triangle(first, first+side+1, first+side);
    }
    const core = this.vertex([x,y+.015,z],[.56,.36,.065],.5,.5), ring=[];
    for(let side=0;side<6;side++) {
      const a=side*Math.PI/3;
      ring.push(this.vertex([x+Math.cos(a)*radius*.24,y+.009,z+Math.sin(a)*radius*.24],
        [.76,.56,.14],.5,.5));
    }
    for(let side=0;side<6;side++) this.triangle(core,ring[(side+1)%6],ring[side]);
  }
  // The open bell is a tapered, slightly fluted tube. It has real volume from
  // every azimuth, with a subtly extended lower lip rather than a flat diamond.
  bell(root, angle, length, width, color) {
    const c=Math.cos(angle),s=Math.sin(angle),first=this.positions.length/3;
    const axis=[c*.954,.30,s*.954],side=[-s,0,c],up=[-c*.30,.954,-s*.30];
    for(let row=0;row<2;row++) for(let petal=0;petal<5;petal++) {
      const a=petal*Math.PI*2/5+.3,ringRadius=width*(row?1:.24);
      const lip=row?Math.max(0,-Math.sin(a))*.009:0;
      const travel=length*(row?1:.13)+lip;
      const point=root.map((v,i)=>v+axis[i]*travel+side[i]*Math.cos(a)*ringRadius
        +up[i]*Math.sin(a)*ringRadius);
      const shade=row?.94+.1*Math.cos(a):.62;
      this.vertex(point,color.map(v=>Math.min(1,v*shade)),petal/5,row);
    }
    for(let petal=0;petal<5;petal++) {
      const next=(petal+1)%5;
      this.triangle(first+petal,first+5+petal,first+next);
      this.triangle(first+next,first+5+petal,first+5+next);
    }
  }
  grain(root, tip, width, color) {
    const dx = tip[0] - root[0], dz = tip[2] - root[2], length = Math.hypot(dx, dz) || 1;
    const x = (root[0] + tip[0]) * .5, y = (root[1] + tip[1]) * .5, z = (root[2] + tip[2]) * .5;
    const a = this.vertex(root, color.map(c => c * .75), .5, 0);
    const left = this.vertex([x - dz / length * width, y, z + dx / length * width], color, 0, .5);
    const ridge = this.vertex([x, y + width * .6, z], color.map(c => Math.min(1, c * 1.16)), .5, .5);
    const right = this.vertex([x + dz / length * width, y, z - dx / length * width], color, 1, .5);
    const end = this.vertex(tip, color.map(c => Math.min(1, c * 1.08)), .5, 1);
    this.triangle(a, left, ridge); this.triangle(a, ridge, right);
    this.triangle(left, end, ridge); this.triangle(ridge, end, right);
  }
  finish(name) {
    const THREE = this.THREE, geometry = new THREE.BufferGeometry();
    geometry.name = name;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute('flowerKind', new THREE.Float32BufferAttribute(this.flowerKinds, 1));
    geometry.setIndex(this.indices); geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }
}

/** A soft sage/olive mound; omit flowers for larger woodland-edge herb patches. */
export function createMeadowHerbGeometry(THREE, { flowers = true } = {}) {
  const mesh = new PlantGeometry(THREE);
  if (!flowers) {
    // Interlocking low rosettes connect the separate grass crowns into a living
    // floor. Broad leaves cover soil without one tall, repeated cabbage form.
    for (let crown=0;crown<3;crown++) {
      const crownAngle=crown*2.399963+.3;
      const cx=Math.cos(crownAngle)*.205,cz=Math.sin(crownAngle)*.205;
      for(let leaf=0;leaf<6;leaf++) {
        const angle=leaf*Math.PI/3+crown*.73+Math.sin(leaf*3.4+crown)*.16;
        const variation=Math.sin(leaf*4.17+crown*2.6+.5)**2;
        const inner=leaf===crown || leaf===(crown+3)%6;
        const reach=inner?.255+variation*.045:.31+variation*.075;
        const width=.057+variation*.017;
        const root=[cx+Math.cos(angle)*.016,.012,cz+Math.sin(angle)*.016];
        const tip=[cx+Math.cos(angle)*reach,inner?.125+variation*.035:.035+variation*.025,
          cz+Math.sin(angle)*reach];
        const edge=[.155+variation*.035,.19+variation*.04,.085+variation*.027];
        const ridge=[.225+variation*.035,.255+variation*.038,.132+variation*.03];
        mesh.leaf(root,tip,width,inner?.052:.043,edge,ridge,
          {coarse:true,curl:-.008,twist:Math.sin(leaf*3.1+crown)*.28,
            sweep:Math.sin(leaf*4.8+crown)*.026});
      }
    }
    return mesh.finish('AlpineLowLeafRug');
  }
  for (let leaf = 0; leaf < 10; leaf++) {
    const inner = leaf >= 6, angle = leaf * 2.399963 + Math.sin(leaf * 3.7) * .23;
    const variation = Math.sin(leaf * 5.3 + .4) ** 2;
    const length = inner ? .14 + variation * .09 : .25 + variation * .11;
    const height = inner ? .16 + variation * .11 : .055 + variation * .055;
    const petioleLength = .035 + variation * .025, petioleRise = inner ? .065 + variation * .025 : .035;
    const petiole = t => [Math.cos(angle) * (.012 + petioleLength * t),
      -.016 + petioleRise * Math.sin(t * Math.PI / 2), Math.sin(angle) * (.012 + petioleLength * t)];
    mesh.stem(petiole, .003, [.145,.205,.085], 2);
    const root = petiole(1), tip = [Math.cos(angle) * length,height,Math.sin(angle) * length];
    const dry = leaf % 9 === 0;
    const edge = dry ? [.25,.225,.11] : [.17+variation*.035,.21+variation*.038,.10+variation*.03];
    const ridge = dry ? [.33,.30,.16] : [.24+variation*.035,.28+variation*.038,.155+variation*.03];
    mesh.leaf(root,tip,inner?.029+variation*.011:.047+variation*.014,
      inner?.065:.075+variation*.025,edge,ridge,
      {curl: -.012+variation*.025,twist:Math.sin(leaf*4.2)*.5,sweep:Math.sin(leaf*2.7+.6)*.048});
  }
  if (flowers) {
    // Species tags let placement form broad single-species drifts with one draw.
    // White heads branch into small umbels; salvia rises in alternating whorls.
    for (let stem = 0; stem < 5; stem++) {
      mesh.currentFlowerKind = stem < 3 ? 1 : 2;
      const angle=stem*2.399963+.5,radius=.06+stem*.035;
      const height=stem<3?.31+stem*.057:.57+(stem-3)*.11;
      const lean=.045+Math.sin(stem*3.9)**2*.065;
      const point=t=>[Math.cos(angle)*(radius+lean*t*t),height*t-.03*t*t*t,
        Math.sin(angle)*(radius+lean*.68*t*t)];
      mesh.stem(point,.0032,[.135,.235,.075],5);
      // Small opposite stem leaves give long flower stalks a living silhouette.
      for(let leaf=0;leaf<1;leaf++) {
        const t=.27+leaf*.19,root=point(t),a=angle+(leaf?1:-1)*1.3;
        mesh.leaf(root,[root[0]+Math.cos(a)*.105,root[1]+.022,root[2]+Math.sin(a)*.105],
          .014,.018,[.145,.23,.085],[.22,.30,.13],{twist:leaf?.35:-.3});
      }
      if(stem<3) {
        const centre=point(.93);
        for(let flower=0;flower<3;flower++) {
          const a=flower*2.399963+stem*.7,spread=flower===0?.015:.067;
          const top=[centre[0]+Math.cos(a)*spread,centre[1]+.035-spread*.2,
            centre[2]+Math.sin(a)*spread];
          const branch=t=>centre.map((v,i)=>v+(top[i]-v)*t);
          mesh.stem(branch,.0018,[.18,.25,.09],2);
          mesh.bloom(top,[.88,.865,.72],.033+flower*.003,a);
        }
      } else for(let whorl=0;whorl<5;whorl++) {
        const centre=point(.52+whorl*.095),spread=.025*(1-whorl*.08);
        for(let side=0;side<3;side++) {
          const a=whorl*1.7+side*Math.PI*2/3;
          const root=[centre[0]+Math.cos(a)*spread,centre[1],centre[2]+Math.sin(a)*spread];
          mesh.bell(root,a,.038*(1-whorl*.045),.015*(1-whorl*.065),
            [.40+whorl*.018,.24+whorl*.019,.57+whorl*.025]);
        }
      }
    }
    mesh.currentFlowerKind = 0;
  }
  return mesh.finish(flowers ? 'IllustratedMeadowHerbs' : 'IllustratedSageMound');
}

/** Fine bowed oat stalks with opaque folded seed heads; 140 triangles per clump. */
export function createSeedGrassGeometry(THREE) {
  const mesh = new PlantGeometry(THREE);
  for (let stalk = 0; stalk < 5; stalk++) {
    const angle = stalk * 2.399963 + .3, height = .43 + Math.sin(stalk * 3.7 + .8) ** 2 * .19;
    const spread = .18 + Math.sin(stalk * 5.1 + .2) ** 2 * .11;
    const point = t => [Math.cos(angle) * (.025 + spread * t * t),
      -.02 + height * (1 - (1 - t) ** 1.65) - .085 * t ** 4,
      Math.sin(angle) * (.025 + spread * t * t)];
    mesh.stem(point, .0027, [.48, .39, .16], 4);
    for (let seed = 0; seed < 4; seed++) {
      const t = .71 + seed * .078, root = point(t), side = seed % 2 ? 1 : -1;
      const end = [root[0] + Math.cos(angle) * .035 - Math.sin(angle) * side * .033,
        root[1] - .038 + seed * .003, root[2] + Math.sin(angle) * .035 + Math.cos(angle) * side * .033];
      mesh.grain(root, end, .011 + seed * .001, [.69 + seed * .025, .59 + seed * .027, .34 + seed * .029]);
    }
  }
  // A small basal fan ties the fine stalks into the surrounding larger tussocks.
  for (let blade = 0; blade < 4; blade++) {
    const angle = blade * 2.399963 + .8, height = .2 + Math.sin(blade * 3.1) ** 2 * .1;
    const rows = [], width = .013 + blade * .002;
    for (const [t, taper] of [[0, 1], [.36, .86], [.72, .48]]) {
      const x = Math.cos(angle) * (.02 + .24 * t * t), z = Math.sin(angle) * (.02 + .24 * t * t), y = -.02 + height * t;
      rows.push(mesh.vertex([x - Math.sin(angle) * width * taper, y, z + Math.cos(angle) * width * taper], [.34 + t * .1, .37 + t * .035, .14 + t * .04], 0, t));
      mesh.vertex([x + Math.sin(angle) * width * taper, y, z - Math.cos(angle) * width * taper], [.37 + t * .1, .39 + t * .035, .16 + t * .04], 1, t);
    }
    for (let row = 0; row < 2; row++) {
      mesh.triangle(rows[row], rows[row] + 1, rows[row + 1]); mesh.triangle(rows[row] + 1, rows[row + 1] + 1, rows[row + 1]);
    }
    const tip = mesh.vertex([Math.cos(angle) * .28, height * .88, Math.sin(angle) * .28], [.49, .43, .2], .5, 1);
    mesh.triangle(rows[2], rows[2] + 1, tip);
  }
  return mesh.finish('IllustratedOatSeedGrass');
}
