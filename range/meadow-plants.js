/** Original illustrated alpine plants. Metres, Y up; opaque folded surfaces. */
class PlantGeometry {
  constructor(THREE) {
    this.THREE = THREE;
    this.positions = []; this.colors = []; this.uvs = []; this.indices = [];
  }
  vertex(point, color, u = .5, v = 0) {
    const index = this.positions.length / 3;
    this.positions.push(...point); this.colors.push(...color); this.uvs.push(u, v);
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
  leaf(root, tip, width, arch, edgeColor, ridgeColor, { curl = 0, twist = 0, sweep = 0 } = {}) {
    const dx = tip[0] - root[0], dz = tip[2] - root[2], length = Math.hypot(dx, dz) || 1;
    const side = [-dz / length, dx / length], rows = [];
    const start = this.vertex(root, edgeColor.map(c => c * .74), .5, 0);
    for (const [t, spread] of [[.19, .72], [.5, 1], [.81, .72], [.96, .28]]) {
      const bend = Math.sin(t * Math.PI), bank = bend * width * twist * spread;
      const x = root[0] + (tip[0] - root[0]) * t + side[0] * bend * sweep;
      const z = root[2] + (tip[2] - root[2]) * t + side[1] * bend * sweep;
      const y = root[1] + (tip[1] - root[1]) * t + bend * arch + curl * t ** 4;
      rows.push(this.vertex([x - side[0] * width * spread, y - bank, z - side[1] * width * spread], edgeColor, 0, t));
      this.vertex([x, y + width * .27 * spread, z], ridgeColor, .5, t);
      this.vertex([x + side[0] * width * spread, y + bank, z + side[1] * width * spread], edgeColor, 1, t);
    }
    this.triangle(start, rows[0] + 1, rows[0]);
    this.triangle(start, rows[0] + 2, rows[0] + 1);
    for (let row = 0; row < rows.length - 1; row++) {
      const a = rows[row], b = rows[row + 1];
      this.triangle(a, a + 1, b); this.triangle(a + 1, b + 1, b);
      this.triangle(a + 1, a + 2, b + 1); this.triangle(a + 2, b + 2, b + 1);
    }
    const end = this.vertex([tip[0], tip[1] + curl, tip[2]], ridgeColor.map(c => Math.min(1, c * 1.04)), .5, 1), last = rows.at(-1);
    this.triangle(last, last + 1, end); this.triangle(last + 1, last + 2, end);
  }
  bloom(center, color) {
    const [x, y, z] = center;
    for (let petal = 0; petal < 5; petal++) {
      const a = petal * Math.PI * 2 / 5, radius = .044;
      const root = this.vertex(center, [.48, .33, .1]);
      const left = this.vertex([x + Math.cos(a - .42) * radius * .69, y + .006, z + Math.sin(a - .42) * radius * .69], color);
      const tip = this.vertex([x + Math.cos(a) * radius, y + .003, z + Math.sin(a) * radius], color.map(c => Math.min(1, c * 1.1)));
      const right = this.vertex([x + Math.cos(a + .42) * radius * .69, y + .006, z + Math.sin(a + .42) * radius * .69], color);
      this.triangle(root, tip, left); this.triangle(root, right, tip);
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
    geometry.setIndex(this.indices); geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }
}

/** A soft sage/olive mound; omit flowers for larger woodland-edge herb patches. */
export function createMeadowHerbGeometry(THREE, { flowers = true } = {}) {
  const mesh = new PlantGeometry(THREE);
  for (let leaf = 0; leaf < 13; leaf++) {
    const inner = leaf >= 8, angle = leaf * 2.399963 + Math.sin(leaf * 3.7) * .15;
    const variation = Math.sin(leaf * 5.3 + .4) ** 2;
    const length = inner ? .155 + variation * .06 : .23 + variation * .085;
    const height = inner ? .20 + variation * .07 : .10 + variation * .07;
    const petioleLength = .035 + variation * .025, petioleRise = inner ? .1 + variation * .035 : .06 + variation * .025;
    const petiole = t => [Math.cos(angle) * (.012 + petioleLength * t),
      -.016 + petioleRise * Math.sin(t * Math.PI / 2), Math.sin(angle) * (.012 + petioleLength * t)];
    mesh.stem(petiole, .004, [.23, .265, .085], 2);
    const root = petiole(1);
    const tip = [Math.cos(angle) * length, height, Math.sin(angle) * length];
    const dry = leaf % 7 === 0;
    const edge = dry ? [.285, .28, .105] : [.235 + variation * .045, .275 + variation * .05, .105 + variation * .025];
    const ridge = dry ? [.37, .35, .15] : [.315 + variation * .045, .35 + variation * .04, .155 + variation * .025];
    mesh.leaf(root, tip, inner ? .036 + variation * .012 : .048 + variation * .016,
      inner ? .06 : .07 + variation * .04, edge, ridge,
      { curl: .02 + variation * .035, twist: Math.sin(leaf * 4.2) * .6, sweep: Math.sin(leaf * 2.7 + .6) * .035 });
  }
  if (flowers) {
    // White yarrow umbels and purple alpine salvia read as flowering drifts,
    // with visible vertical accents instead of one broad cabbage silhouette.
    for (let stem = 0; stem < 5; stem++) {
      const angle = stem * 2.399963 + .5, radius = .11 + stem * .035;
      const height = stem < 3 ? .32 + stem * .055 : .62 + (stem - 3) * .10;
      const point = t => [Math.cos(angle) * (radius + .07 * t * t), height * t,
        Math.sin(angle) * (radius + .04 * t * t)];
      mesh.stem(point, .004, [.22, .29, .095]);
      if (stem < 3) {
        const centre = point(1);
        for (let flower = 0; flower < 4; flower++) {
          const a = flower * 2.399963, spread = flower === 0 ? 0 : .065;
          mesh.bloom([centre[0] + Math.cos(a) * spread, centre[1] - spread * .3,
            centre[2] + Math.sin(a) * spread], [.85, .80, .62]);
        }
      } else for (let whorl = 0; whorl < 7; whorl++) {
        const centre = point(.49 + whorl * .077), spread = .065 * (1 - whorl * .09);
        for (let side = 0; side < 3; side++) {
          const a = whorl * 1.4 + side * Math.PI * 2 / 3;
          const end = [centre[0] + Math.cos(a) * spread, centre[1] + .025,
            centre[2] + Math.sin(a) * spread];
          mesh.grain(centre, end, .020 * (1 - whorl * .055),
            [.43 + whorl * .022, .24 + whorl * .023, .61 + whorl * .024]);
        }
      }
    }
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
