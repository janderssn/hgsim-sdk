/** Original small-scale botanical forms. Metres, Y up; no external assets. */
class BotanicalMesh {
  constructor(THREE) {
    this.THREE = THREE;
    this.positions = []; this.colors = []; this.indices = []; this.uvs = [];
  }
  vertex(point, color, u = 0, v = 0) {
    const index = this.positions.length / 3;
    this.positions.push(...point); this.colors.push(...color); this.uvs.push(u, v);
    return index;
  }
  triangle(a, b, c) { this.indices.push(a, b, c); }
  ribbon(a, b, width, color) {
    const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz) || 1;
    const sx = -dz / length * width, sz = dx / length * width;
    const first = this.vertex([a[0] - sx, a[1], a[2] - sz], color);
    this.vertex([a[0] + sx, a[1], a[2] + sz], color);
    this.vertex([b[0] - sx * .4, b[1], b[2] - sz * .4], color);
    this.vertex([b[0] + sx * .4, b[1], b[2] + sz * .4], color);
    this.triangle(first, first + 1, first + 2); this.triangle(first + 1, first + 3, first + 2);
  }
  // Curved lanceolate leaves have a narrow root, broad middle and pointed tip.
  // Separate longitudinal stations provide a real curved silhouette and normal.
  leaf(a, b, width, color, curl = .025) {
    const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz) || 1;
    const sx = -dz / length, sz = dx / length;
    const root = this.vertex(a, color.map(c => c * .7), .5, 0);
    const rows = [];
    for (const [t, spread] of [[.22, .7], [.51, 1], [.8, .64]]) {
      const center = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * curl,
        a[2] + (b[2] - a[2]) * t];
      rows.push(this.vertex([center[0] - sx * width * spread, center[1] - curl * .2, center[2] - sz * width * spread], color, 0, t));
      this.vertex([center[0] + sx * width * spread, center[1] + curl * .2, center[2] + sz * width * spread], color, 1, t);
    }
    const tip = this.vertex(b, color.map(c => Math.min(1, c * 1.12)), .5, 1);
    this.triangle(root, rows[0], rows[0] + 1);
    for (let row = 0; row < rows.length - 1; row++) {
      this.triangle(rows[row], rows[row + 1], rows[row] + 1);
      this.triangle(rows[row] + 1, rows[row + 1], rows[row + 1] + 1);
    }
    this.triangle(rows.at(-1), tip, rows.at(-1) + 1);
  }
  tube(a, b, radiusA, radiusB, color, sides = 5) {
    const THREE = this.THREE, start = new THREE.Vector3(...a), direction = new THREE.Vector3(...b).sub(start).normalize();
    const tangent = new THREE.Vector3().crossVectors(direction, Math.abs(direction.y) > .9
      ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
    const bitangent = new THREE.Vector3().crossVectors(direction, tangent);
    const first = this.positions.length / 3;
    for (let end = 0; end < 2; end++) for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2, radius = end ? radiusB : radiusA;
      const point = new THREE.Vector3(...(end ? b : a)).addScaledVector(tangent, Math.cos(angle) * radius)
        .addScaledVector(bitangent, Math.sin(angle) * radius);
      const shade = .78 + .24 * Math.sin(angle + 1.2);
      this.vertex(point.toArray(), color.map(c => c * shade), side / sides, end);
    }
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      this.triangle(first + side, first + next, first + sides + side);
      this.triangle(first + next, first + sides + next, first + sides + side);
    }
    const center = this.vertex(b, color.map(c => c * 1.2));
    for (let side = 0; side < sides; side++) this.triangle(center, first + sides + side, first + sides + (side + 1) % sides);
  }
  finish() {
    const THREE = this.THREE, geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices); geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }
}

/** A painted meadow fan: three intertwined crowns, with long arching leaves. */
export function createGrassFanGeometry(THREE, { bladesPerCrown = 8 } = {}) {
  const mesh = new BotanicalMesh(THREE);
  const stations = [0, .15, .33, .52, .70, .86, 1];
  const widths = [.12, .65, 1, .93, .66, .32, 0];
  const random = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
  for (let crown = 0; crown < 3; crown++) {
    const crownAngle = crown * 2.399963;
    const rootX = Math.cos(crownAngle) * .19, rootZ = Math.sin(crownAngle) * .19;
    for (let blade = 0; blade < bladesPerCrown; blade++) {
      const seed = crown * 8 + blade, angle = blade * 2.399963 + crown * .8 + random(seed + 1) * .45;
      const height = .28 + random(seed + 3) * .4;
      const bend = .34 + random(seed + 7) * .34;
      const width = .010 + random(seed + 11) * .010;
      const twist = (random(seed + 17) - .5) * .85;
      const arc = 2.35 + random(seed + 19) * .48;
      const first = mesh.positions.length / 3;
      for (let row = 0; row < stations.length; row++) {
        const t = stations[row], sideAngle = angle + Math.PI / 2 + twist * t;
        const radius = .02 + bend * Math.pow(t, 1.4);
        const center = [rootX + Math.cos(angle) * radius,
          -.025 + height * Math.sin(t * arc), rootZ + Math.sin(angle) * radius];
        for (const side of row === stations.length - 1 ? [0] : [-1, 1]) {
          const color = [ .46 + t * .48, .58 + t * .39, .42 + t * .34 ];
          // A cool folded edge and warm blade face read as intentional brushwork.
          const paintedEdge = side === -1 ? .91 : 1;
          mesh.vertex([center[0] + Math.cos(sideAngle) * width * widths[row] * side,
            center[1] + width * .22 * side, center[2] + Math.sin(sideAngle) * width * widths[row] * side],
          color.map(channel => channel * paintedEdge * (.94 + random(seed + 23) * .12)), (side + 1) / 2, t);
        }
      }
      for (let row = 0; row < stations.length - 2; row++) {
        const base = first + row * 2;
        mesh.triangle(base, base + 1, base + 2); mesh.triangle(base + 1, base + 3, base + 2);
      }
      const last = first + (stations.length - 2) * 2;
      mesh.triangle(last, last + 1, last + 2);
    }
  }
  return mesh.finish();
}

export function createFernGeometry(THREE) {
  const mesh = new BotanicalMesh(THREE);
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond * 2.399963 + Math.sin(frond * 5.7) * .16;
    const length = .43 + Math.sin(frond * 7.3 + 1) ** 2 * .23;
    const height = .3 + Math.sin(frond * 3.8 + .6) ** 2 * .18;
    const radial = [Math.cos(angle), Math.sin(angle)], side = [-radial[1], radial[0]];
    const point = t => [radial[0] * length * t, -.025 + height * Math.sin(t * 2.1), radial[1] * length * t];
    for (let segment = 0; segment < 5; segment++) mesh.ribbon(point(segment / 5), point((segment + 1) / 5), .004, [.13, .2, .095]);
    for (let pair = 0; pair < 8; pair++) {
      const t = .13 + pair * .103, center = point(t);
      const leafLength = (.11 + length * .11) * Math.sin(Math.PI * (.15 + t * .8));
      for (const sign of [-1, 1]) {
        const end = [center[0] + side[0] * sign * leafLength + radial[0] * .055,
          center[1] + .018 - t * .035, center[2] + side[1] * sign * leafLength + radial[1] * .055];
        mesh.leaf(center, end, leafLength * .17, [.16 + t * .04, .26 + t * .06, .10 + t * .025], .012);
      }
    }
    mesh.leaf(point(.87), point(1.05), .012, [.22, .33, .14], .01);
  }
  return mesh.finish();
}

export function createShrubGeometry(THREE) {
  const mesh = new BotanicalMesh(THREE);
  for (let branch = 0; branch < 5; branch++) {
    const angle = branch * 2.399963, dx = Math.cos(angle), dz = Math.sin(angle);
    const height = .33 + Math.sin(branch * 3.4 + .4) ** 2 * .26;
    const a = [0, -.025, 0], fork = [dx * .11, height * .52, dz * .11], tip = [dx * .28, height, dz * .28];
    mesh.tube(a, fork, .012, .007, [.18, .145, .085], 4);
    mesh.tube(fork, tip, .007, .0025, [.2, .17, .085], 4);
    for (let leaf = 0; leaf < 7; leaf++) {
      const t = .3 + leaf * .105, sign = leaf % 2 ? 1 : -1;
      const start = [dx * .28 * t, height * t, dz * .28 * t];
      const end = [start[0] + dx * .065 - dz * sign * .095, start[1] + .035, start[2] + dz * .065 + dx * sign * .095];
      mesh.leaf(start, end, .035, [.15 + leaf * .012, .24 + leaf * .009, .075], .017);
    }
    // Smaller forks break the straight-spoke silhouette and gather leaves at tips.
    if (branch % 2 === 0) {
      const split = [fork[0] - dz * .16, fork[1] + .13, fork[2] + dx * .16];
      mesh.tube(fork, split, .005, .002, [.2, .17, .085], 4);
      for (let leaf = 0; leaf < 3; leaf++) {
        const t = .4 + leaf * .25, start = fork.map((v, axis) => v + (split[axis] - v) * t);
        mesh.leaf(start, [start[0] + dx * .09, start[1] + .04, start[2] + dz * .09], .03, [.19, .28, .08], .018);
      }
    }
  }
  return mesh.finish();
}

export function createLitterGeometry(THREE) {
  const mesh = new BotanicalMesh(THREE);
  for (let leaf = 0; leaf < 8; leaf++) {
    const angle = leaf * 2.399963, radius = .06 + Math.sin(leaf * 5.3) ** 2 * .23;
    const start = [Math.cos(angle) * radius, .008 + leaf * .001, Math.sin(angle) * radius];
    const end = [start[0] + Math.cos(angle + .8) * .115, start[1] + .008, start[2] + Math.sin(angle + .8) * .115];
    const dry = leaf % 3 === 0;
    mesh.leaf(start, end, .027, dry ? [.33, .255, .14] : [.19, .155, .085], .012 + leaf * .002);
  }
  mesh.tube([-.22, .015, -.06], [.26, .025, .14], .008, .003, [.22, .175, .1], 4);
  return mesh.finish();
}

export function createDeadwoodGeometry(THREE) {
  const mesh = new BotanicalMesh(THREE);
  const joints = [[-.65, .055, -.08], [-.26, .09, .025], [.18, .085, -.04], [.58, .06, .11]];
  for (let part = 0; part < 3; part++) mesh.tube(joints[part], joints[part + 1], .057 - part * .012, .047 - part * .012, [.23, .2, .145], 7);
  mesh.tube(joints[1], [-.16, .12, -.36], .025, .009, [.25, .215, .16], 5);
  mesh.tube(joints[2], [.43, .13, -.25], .019, .005, [.21, .18, .13], 5);
  return mesh.finish();
}
