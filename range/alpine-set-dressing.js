/** Original illustrated-alpine prop kit and composed, non-colliding story sites. */
import { batchStaticMeshes } from './static-batch.js';
import { ALPINE_SITES, alpineSiteExclusionAt } from './alpine-sites.js';
export { ALPINE_SITES, alpineSiteExclusionAt, sampleAlpineSiteGround } from './alpine-sites.js';
const hash = (x, z = 0) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

const PALETTE = Object.freeze({ timber: '#8f6543', endgrain: '#c49362', darkWood: '#4e4539',
  ivory: '#e5d2a5', plaster: '#cfbb96', teal: '#366c6b', burgundy: '#824a43', rust: '#b86c3e',
  stone: '#878b77', moss: '#788254', brass: '#c89851', iron: '#484b46', window: '#f2bf6f' });

/** Original brush atlas: long fibres and broad scraped paint, without photo noise. */
function brushTexture(THREE) {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let grain = .89 + Math.sin(u * 24 + Math.sin(v * 3.7) * .35) * .055;
    for (let fibre = 0; fibre < 17; fibre++) {
      const centre = (fibre + .2 + hash(fibre, 47) * .65) / 17
        + Math.sin(v * (2 + hash(fibre, 53) * 4) + fibre) * .006;
      const distance = Math.abs(u - centre);
      if (distance < .006) grain -= (.006 - distance) / .006 * (.06 + hash(fibre, 59) * .09);
    }
    const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
    const chip = Math.max(0, 1 - edge / (2.5 + 4.5 * (.5 + .5 * Math.sin(x * .21 + y * .13))))
      * (.3 + .7 * (.5 + .5 * Math.sin(x * .83 + y * .34)));
    const scratch = Math.max(0, 1 - Math.abs(u - .19 - Math.sin(v * 3) * .018) / .011) * .17;
    const i = (y * size + x) * 4;
    pixels[i] = Math.round(Math.max(0, Math.min(1, grain)) * 255);
    pixels[i + 1] = Math.round(Math.min(1, chip + scratch) * 255);
    pixels[i + 2] = Math.round((.88 + Math.sin(v * 13 + u * 3) * .08) * 255); pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = 'Original hand-painted timber fibres and worn pigment';
  texture.colorSpace = THREE.NoColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
}

/** Small physical bevels catch daylight along worn timber and painted corners. */
function bevelledBox(THREE, sx, sy, sz) {
  const half = [sx / 2, sy / 2, sz / 2], bevel = Math.min(.035, Math.min(sx, sy, sz) * .16);
  if (Math.min(sx, sy, sz) < .075) return new THREE.BoxGeometry(sx, sy, sz);
  const inner = half.map(value => value - bevel), positions = [], uvs = [], indices = [];
  function face(points) {
    const a = new THREE.Vector3(...points[0]), b = new THREE.Vector3(...points[1]), c = new THREE.Vector3(...points[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const centre = points.reduce((sum, point) => sum.add(new THREE.Vector3(...point)), new THREE.Vector3());
    if (normal.dot(centre) < 0) points.reverse();
    const start = positions.length / 3; positions.push(...points.flat());
    for (let i = 0; i < points.length; i++) uvs.push(i === 1 || i === 2 ? 1 : 0, i > 1 ? 1 : 0);
    for (let i = 1; i < points.length - 1; i++) indices.push(start, start + i, start + i + 1);
  }
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const a = (axis + 1) % 3, b = (axis + 2) % 3;
    face([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[a] = u * inner[a]; p[b] = v * inner[b]; return p; }));
  }
  for (let free = 0; free < 3; free++) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const a = (free + 1) % 3, b = (free + 2) % 3;
    face([[-1, 0], [-1, 1], [1, 1], [1, 0]].map(([end, edge]) => { const p = [0, 0, 0]; p[free] = end * inner[free]; p[a] = sa * (edge ? inner[a] : half[a]); p[b] = sb * (edge ? half[b] : inner[b]); return p; }));
  }
  for (const sxn of [-1, 1]) for (const syn of [-1, 1]) for (const szn of [-1, 1]) {
    const signs = [sxn, syn, szn];
    face([0, 1, 2].map(axis => half.map((value, i) => signs[i] * (i === axis ? value : inner[i]))));
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/**
 * A small original kit, deliberately authored in composed clusters. groundHeight
 * is the caller's physical source. No mesh is added to the collision world.
 */
export function createAlpineSetDressing(THREE, scene, {
  groundHeight = () => 0, ecologyAt = () => ({}), quality = 'high', atmosphere = null,
} = {}) {
  if (typeof groundHeight !== 'function') throw new TypeError('groundHeight must be a function');
  const group = new THREE.Group(); group.name = 'AlpineStorySites'; scene.add(group);
  const opaque = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .91 });
  opaque.name = 'Illustrated weathered timber and mineral paint';
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .69, metalness: .30 });
  metal.name = 'Oxidised alpine hardware';
  const windows = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .58,
    emissive: '#bd7331', emissiveIntensity: .13 });
  windows.name = 'Warm refuge windows';
  const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  cloth.name = 'Faded awning canvas';
  const wind = { value: 0 }, clock = { value: 0 };
  cloth.onBeforeCompile = shader => {
    shader.uniforms.siteWind = wind; shader.uniforms.siteTime = clock;
    shader.vertexShader = `uniform float siteWind; uniform float siteTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float siteTip = clamp(uv.y, 0.0, 1.0);
      transformed.y += sin(position.x * 1.8 + siteTime * 1.6) * siteWind * siteTip * 0.055;
    `);
  };
  cloth.customProgramCacheKey = () => 'illustrated-alpine-cloth-v1';
  const materials = [opaque, metal, windows, cloth];
  const brush = brushTexture(THREE);
  for (const material of [opaque, metal, cloth]) {
    const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.alpineBrush = { value: brush };
      shader.vertexShader = `attribute float storyFinish; varying float vStoryFinish; varying vec2 vStoryUv;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vStoryFinish = storyFinish; vStoryUv = uv;
      `);
      shader.fragmentShader = `uniform sampler2D alpineBrush; varying float vStoryFinish; varying vec2 vStoryUv;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec4 storyBrush = texture2D(alpineBrush, vStoryUv);
        float storyWood = 1.0 - step(0.5, vStoryFinish);
        float storyPaint = step(0.5, vStoryFinish) * (1.0 - step(1.5, vStoryFinish));
        float storyCloth = step(2.5, vStoryFinish);
        float storyFibre = storyWood * 0.90 + storyPaint * 0.40 + storyCloth * 0.55;
        diffuseColor.rgb *= mix(1.0, 0.77 + storyBrush.r * 0.30, storyFibre);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.25, 0.15), storyBrush.g * storyPaint * 0.34);
        diffuseColor.rgb += vec3(0.035, 0.024, 0.012) * storyBrush.g * storyWood;
        diffuseColor.rgb *= mix(1.0, storyBrush.b * 0.16 + 0.84, storyCloth);
      `);
    };
    material.customProgramCacheKey = () => `${previousKey()}|original-alpine-brush-v1`;
    material.userData.originalBrush = brush;
  }
  if (atmosphere?.installMaterial) materials.forEach(material => atmosphere.installMaterial(material));
  const sourceGeometries = new Set(), outputGeometries = new Set(), placements = [], siteGroups = [];
  const colours = new Map(Object.entries(PALETTE).map(([key, value]) => [key, new THREE.Color(value)]));
  const up = new THREE.Vector3(0, 1, 0);
  let partSeed = 0;

  function finish(geometry, colour, seed = partSeed++) {
    const base = colours.get(colour) || new THREE.Color(colour);
    const position = geometry.attributes.position, normal = geometry.attributes.normal;
    const tint = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const face = normal ? .92 + .08 * Math.max(0, normal.getY(i)) : 1;
      const weather = .92 + .12 * hash(Math.round(position.getX(i) * 19) + seed, Math.round(position.getZ(i) * 23) + seed * 3);
      tint[i * 3] = base.r * face * weather; tint[i * 3 + 1] = base.g * face * weather; tint[i * 3 + 2] = base.b * face * weather;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(tint, 3));
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2));
    const finishKind = ['timber', 'endgrain', 'darkWood'].includes(colour) ? 0 : ['stone', 'moss'].includes(colour) ? 2 : 1;
    geometry.setAttribute('storyFinish', new THREE.BufferAttribute(new Float32Array(position.count).fill(finishKind), 1));
    if (finishKind === 0) {
      geometry.computeBoundingBox();
      const minimum = geometry.boundingBox.min.toArray(), maximum = geometry.boundingBox.max.toArray();
      const span = maximum.map((value, axis) => Math.max(.001, value - minimum[axis]));
      const long = span.indexOf(Math.max(...span)), uv = geometry.attributes.uv;
      for (let i = 0; i < position.count; i++) {
        const p = [position.getX(i), position.getY(i), position.getZ(i)];
        const n = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))];
        const face = n.indexOf(Math.max(...n));
        const cross = [0, 1, 2].find(axis => axis !== long && axis !== face) ?? (long + 1) % 3;
        uv.setXY(i, (p[cross] - minimum[cross]) / span[cross], (p[long] - minimum[long]) / span[long]);
      }
    }
    sourceGeometries.add(geometry); return geometry;
  }
  function mesh(ctx, geometry, colour, material = opaque) {
    const object = new THREE.Mesh(finish(geometry, colour), material);
    if (material === cloth) object.geometry.attributes.storyFinish.array.fill(3);
    object.castShadow = object.receiveShadow = true; ctx.root.add(object); ctx.parts.push(object); return object;
  }
  function box(ctx, x, y, z, sx, sy, sz, colour = 'timber', material = opaque, angles = null) {
    const object = mesh(ctx, bevelledBox(THREE, sx, sy, sz), colour, material);
    object.position.set(x, y, z); if (angles) object.rotation.set(...angles); return object;
  }
  function beam(ctx, a, b, width = .12, colour = 'timber', material = opaque, square = true) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    const geometry = square ? bevelledBox(THREE, width, delta.length(), width)
      : new THREE.CylinderGeometry(width * .5, width * .58, delta.length(), 7);
    const object = mesh(ctx, geometry, colour, material); object.position.copy(av).addScaledVector(delta, .5);
    object.quaternion.setFromUnitVectors(up, delta.normalize()); return object;
  }
  function polygon(ctx, points, colour, material = opaque, uvs = null) {
    const geometry = new THREE.BufferGeometry(), positions = points.flat(), indices = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs || points.flatMap((_, i) => [i % 2, i > 1 ? 1 : 0]), 2));
    geometry.computeVertexNormals(); return mesh(ctx, geometry, colour, material);
  }
  function localGround(ctx, x, z) {
    const c = Math.cos(ctx.yaw), s = Math.sin(ctx.yaw);
    return groundHeight(ctx.x + c * x + s * z, ctx.z - s * x + c * z) - ctx.y;
  }
  function feetLevel(ctx, points, rise) { return Math.max(...points.map(([x, z]) => localGround(ctx, x, z))) + rise; }
  function support(ctx, x, z, top, width = .14, colour = 'darkWood') {
    const foot = localGround(ctx, x, z) - .07;
    box(ctx, x, (top + foot) / 2, z, width, Math.max(.08, top - foot), width, colour);
  }
  function makeSite(site, yaw, build) {
    const root = new THREE.Group(), y = groundHeight(site.x, site.z);
    root.position.set(site.x, y, site.z); root.rotation.y = yaw; group.add(root);
    const ctx = { root, parts: [], x: site.x, y, z: site.z, yaw, site };
    build(ctx); root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    placements.push({ id: site.id, x: site.x, y, z: site.z, yaw, bounds });
    const output = new THREE.Group(); output.name = `AlpineSite:${site.id}`;
    for (const batch of batchStaticMeshes(THREE, ctx.parts, { name: `AlpineStory:${site.id}` })) {
      batch.userData.decorative = true; output.add(batch); outputGeometries.add(batch.geometry);
    }
    group.remove(root); group.add(output); siteGroups.push({ group: output, site, bounds });
  }
  function bench(ctx, x, z, yaw = 0, length = 4.3) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw), at = (a, b) => [x + cos * a + sin * b, z - sin * a + cos * b];
    const corners = [[-length * .37, -.24], [length * .37, -.24], [-length * .37, .24], [length * .37, .24]].map(([a, b]) => at(a, b));
    const seat = feetLevel(ctx, corners, .79);
    for (const [fx, fz] of corners) support(ctx, fx, fz, seat, .15);
    for (const offset of [-.19, .19]) { const [px, pz] = at(0, offset); box(ctx, px, seat, pz, length, .15, .32, 'endgrain', opaque, [0, yaw, 0]); }
    for (const end of [-1, 1]) { const [px, pz] = at(end * length * .37, .26); box(ctx, px, seat + .47, pz, .12, 1.04, .13, 'darkWood', opaque, [0, yaw, -.08]); }
    for (const row of [.38, .70]) { const [px, pz] = at(0, .31); box(ctx, px, seat + row, pz, length * .95, .20, .11, 'timber', opaque, [0, yaw, 0]); }
    return seat + .1;
  }
  function bag(ctx, x, y, z, length, colour, yaw = 0) {
    const positions = [], indices = [], uvs = [];
    const rings = [[-.5, .12], [-.43, 1], [.40, 1], [.5, .20]];
    for (let row = 0; row < rings.length; row++) for (let side = 0; side < 10; side++) {
      const angle = side / 10 * Math.PI * 2;
      positions.push(rings[row][0] * length, .31 + Math.cos(angle) * .30 * rings[row][1], Math.sin(angle) * .40 * rings[row][1]); uvs.push(side / 10, row / 3);
    }
    for (let row = 0; row < 3; row++) for (let side = 0; side < 10; side++) {
      const a = row * 10 + side, b = row * 10 + (side + 1) % 10, c = a + 10, d = b + 10;
      indices.push(a, c, b, b, c, d);
    }
    for (const row of [0, 3]) for (let side = 1; side < 9; side++) indices.push(row * 10, row * 10 + side + 1, row * 10 + side);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const object = mesh(ctx, geometry, colour); object.position.set(x, y, z); object.rotation.y = yaw;
    object.geometry.attributes.storyFinish.array.fill(3);
    for (const end of [-.26, .25]) {
      const px = x + Math.cos(yaw) * end * length, pz = z - Math.sin(yaw) * end * length;
      box(ctx, px, y + .34, pz, .13, .63, .82, 'darkWood', opaque, [0, yaw, 0]);
      box(ctx, px, y + .665, pz - .05, .19, .035, .20, 'brass', metal, [0, yaw, 0]);
    }
    return object;
  }
  function crate(ctx, x, z, scale = 1, colour = 'rust', raised = 0) {
    const y = localGround(ctx, x, z) + raised, w = 1.1 * scale, h = .84 * scale;
    box(ctx, x, y + h / 2, z, w, h, w * .78, colour);
    for (const end of [-1, 1]) {
      box(ctx, x + end * w * .37, y + h / 2, z, .10 * scale, h + .04, w * .80, 'ivory');
      box(ctx, x, y + h * .54, z + end * w * .397, w * .38, .10 * scale, .045, 'iron', metal);
    }
    return y + h;
  }
  function roof(ctx, x, y, z, width, depth, rise, colour = 'darkWood') {
    const half = width / 2, eave = .5;
    for (const side of [-1, 1]) {
      polygon(ctx, [[x, y + rise, z - depth / 2 - eave], [x + side * (half + eave), y - .12, z - depth / 2 - eave],
        [x + side * (half + eave), y - .12, z + depth / 2 + eave], [x, y + rise, z + depth / 2 + eave]], colour);
      for (let row = 0; row < 6; row++) for (let column = 0; column < Math.ceil(depth / .53); column++) {
        const t0 = row / 6, t1 = (row + 1.09) / 6;
        const z0 = z - depth / 2 - eave + column * (depth + eave * 2) / Math.ceil(depth / .53);
        const z1 = z0 + (depth + eave * 2) / Math.ceil(depth / .53) * .96;
        const height = t => y + rise * (1 - t) - .12 * t + .035 + hash(row, column + side * 39) * .015;
        const tone = hash(row * 17 + column, side + 5) < .22 ? 'moss' : hash(row + 5, column) < .4 ? 'stone' : colour;
        const points = [[x + side * t0 * (half + eave), height(t0), z0], [x + side * t1 * (half + eave), height(t1), z0],
          [x + side * t1 * (half + eave), height(t1), z1], [x + side * t0 * (half + eave), height(t0), z1]];
        if (side > 0) points.reverse(); polygon(ctx, points, tone);
      }
    }
    beam(ctx, [x, y + rise + .07, z - depth / 2 - .57], [x, y + rise + .07, z + depth / 2 + .57], .15, 'endgrain');
    for (const front of [-1, 1]) for (const side of [-1, 1]) {
      beam(ctx, [x, y + rise, z + front * (depth / 2 + .52)], [x + side * (half + eave), y - .12, z + front * (depth / 2 + .52)], .18, 'endgrain');
    }
  }
  function mapBoard(ctx, x, z, scale = 1) {
    const top = feetLevel(ctx, [[x - 1.65 * scale, z], [x + 1.65 * scale, z]], 3.3 * scale);
    for (const side of [-1, 1]) support(ctx, x + side * 1.65 * scale, z + .1, top, .22 * scale, 'timber');
    box(ctx, x, top - 1.30 * scale, z, 3.30 * scale, 2.20 * scale, .16 * scale, 'darkWood');
    box(ctx, x, top - 1.31 * scale, z - .095 * scale, 3.02 * scale, 1.91 * scale, .035 * scale, 'ivory');
    for (let i = 0; i < 4; i++) {
      const px = x - 1.24 * scale + i * .69 * scale, py = top - 1.03 * scale - hash(i, 3) * .36 * scale;
      polygon(ctx, [[px - .46 * scale, py - .70 * scale, z - .13 * scale], [px, py + .35 * scale, z - .13 * scale],
        [px + .57 * scale, py - .70 * scale, z - .13 * scale]], i % 2 ? 'moss' : 'teal');
    }
    const route = [[-1.15, -.95], [-.55, -1.43], [-.15, -.96], [.37, -1.55], [1.18, -1.12]];
    for (let i = 1; i < route.length; i++) beam(ctx,
      [x + route[i - 1][0] * scale, top + route[i - 1][1] * scale, z - .16 * scale],
      [x + route[i][0] * scale, top + route[i][1] * scale, z - .16 * scale], .045 * scale, 'rust');
    box(ctx, x, top - .40 * scale, z - .12 * scale, 2.75 * scale, .25 * scale, .035 * scale, 'teal');
    for (const side of [-1, 1]) box(ctx, x + side * 1.58 * scale, top - 1.25 * scale, z - .13 * scale, .10 * scale, 2.18 * scale, .10 * scale, 'endgrain');
    roof(ctx, x, top, z, 3.9 * scale, .60 * scale, .48 * scale);
    return top;
  }
  function picnic(ctx, x, z) {
    const feet = [[x - 1.3, z - 1], [x + 1.3, z - 1], [x - 1.3, z + 1], [x + 1.3, z + 1]];
    const table = feetLevel(ctx, feet, .87);
    for (const [fx, fz] of feet) support(ctx, fx, fz, table, .16);
    for (const offset of [-.38, 0, .38]) box(ctx, x, table, z + offset, 3.5, .13, .34, 'endgrain');
    for (const side of [-1, 1]) {
      box(ctx, x, table - .40, z + side * 1.13, 3.7, .14, .44, 'timber');
      beam(ctx, [x - 1.4, table - .38, z - 1.4], [x - 1.4, table - .38, z + 1.4], .17);
      beam(ctx, [x + 1.4, table - .38, z - 1.4], [x + 1.4, table - .38, z + 1.4], .17);
    }
  }
  function barrel(ctx, x, z, colour = 'teal') {
    const y = localGround(ctx, x, z), object = mesh(ctx, new THREE.CylinderGeometry(.47, .42, 1.18, 12), colour);
    object.position.set(x, y + .59, z);
    for (const height of [.19, .89, 1.14]) {
      const hoop = mesh(ctx, new THREE.CylinderGeometry(.477, .477, .075, 12, 1, true), 'iron', metal);
      hoop.position.set(x, y + height, z);
    }
  }
  function fence(ctx, points, colour = 'timber') {
    for (const [x, z] of points) { const y = localGround(ctx, x, z); support(ctx, x, z, y + 1.22, .16, colour); }
    for (let i = 1; i < points.length; i++) for (const height of [.45, .96]) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      beam(ctx, [ax, localGround(ctx, ax, az) + height, az], [bx, localGround(ctx, bx, bz) + height, bz], .12, colour);
    }
  }
  function bunting(ctx, a, b, count = 7) {
    beam(ctx, a, b, .025, 'darkWood', opaque, false);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * .18;
      const z = a[2] + (b[2] - a[2]) * t;
      polygon(ctx, [[x - .19, y, z], [x + .19, y, z], [x, y - .49, z + .03]], ['ivory', 'burgundy', 'teal'][i % 3], cloth);
    }
  }

  function refuge(ctx) {
    const floor = feetLevel(ctx, [[-4.5, -3], [4.5, -3], [-4.5, 3], [4.5, 3]], .28);
    for (const x of [-4.2, 0, 4.2]) for (const z of [-2.7, 2.7]) {
      const foot = localGround(ctx, x, z) - .1;
      box(ctx, x, (foot + floor) / 2, z, .63, Math.max(.2, floor - foot), .63, 'stone');
    }
    box(ctx, 0, floor, 0, 9.15, .24, 6.15, 'darkWood');
    box(ctx, 0, floor + 1.68, 0, 9, 3.30, 6, 'plaster');
    for (let i = 0; i < 18; i++) {
      const x = -4.25 + i * .5;
      box(ctx, x, floor + 1.75, -3.035, .45, 3.15, .10, i % 4 ? 'burgundy' : 'timber');
      box(ctx, x, floor + 1.75, 3.035, .45, 3.15, .10, i % 5 ? 'timber' : 'burgundy');
    }
    for (const x of [-4.55, 4.55]) for (let i = 0; i < 12; i++) {
      box(ctx, x, floor + 1.75, -2.75 + i * .5, .10, 3.15, .45, i % 4 ? 'timber' : 'burgundy');
    }
    for (const x of [-4.5, 4.5]) for (const z of [-3.08, 3.08]) box(ctx, x, floor + 1.72, z, .22, 3.42, .24, 'endgrain');
    for (const z of [-3.07, 3.07]) {
      const points = [[-4.5, floor + 3.32, z], [0, floor + 5.45, z], [4.5, floor + 3.32, z]];
      if (z > 0) points.reverse(); polygon(ctx, points, 'burgundy');
      for (const x of [-2.7, 0, 2.7]) beam(ctx, [x, floor + 3.31, z - .05], [x * .03, floor + 5.37, z - .05], .12, 'endgrain');
    }
    roof(ctx, 0, floor + 3.40, 0, 9, 6, 2.18, 'darkWood');
    const chimneyTop = floor + 6.25;
    box(ctx, 2.60, floor + 4.96, 1.35, .91, 2.53, .90, 'stone');
    for (let row = 0; row < 7; row++) {
      box(ctx, 2.60, floor + 3.80 + row * .34, 1.35, .94, .045, .93, 'ivory');
      box(ctx, 2.42 + (row % 2) * .30, floor + 3.97 + row * .34, .88, .035, .29, .025, 'ivory');
    }
    box(ctx, 2.60, chimneyTop, 1.35, 1.13, .18, 1.13, 'darkWood');
    box(ctx, 1.68, floor + 1.28, -3.12, 1.22, 2.50, .15, 'teal');
    for (const x of [1.00, 2.36]) box(ctx, x, floor + 1.3, -3.23, .12, 2.66, .12, 'endgrain');
    box(ctx, 1.68, floor + 2.65, -3.22, 1.48, .12, .12, 'endgrain');
    box(ctx, 2.10, floor + 1.25, -3.25, .08, .20, .06, 'brass', metal);
    for (const x of [-2.50, -.50]) {
      box(ctx, x, floor + 1.96, -3.14, 1.27, 1.34, .08, 'window', windows);
      for (const dx of [-.72, 0, .72]) box(ctx, x + dx, floor + 1.96, -3.22, .08, 1.55, .12, 'ivory');
      for (const dy of [-.75, 0, .75]) box(ctx, x, floor + 1.96 + dy, -3.23, 1.50, .08, .13, 'ivory');
      box(ctx, x - .94, floor + 1.96, -3.10, .31, 1.57, .12, 'teal');
      box(ctx, x + .94, floor + 1.96, -3.10, .31, 1.57, .12, 'teal');
      box(ctx, x, floor + 1.05, -3.38, 1.64, .32, .42, 'burgundy');
      for (let flower = 0; flower < 6; flower++) {
        const px = x - .68 + flower * .26;
        box(ctx, px, floor + 1.30 + hash(flower, 7) * .13, -3.42, .19, .29, .24, flower % 3 ? 'moss' : 'rust');
      }
    }
    for (const z of [-1.55, 1.25]) {
      box(ctx, 4.58, floor + 1.93, z, .08, 1.37, 1.47, 'window', windows);
      for (const dz of [-.79, 0, .79]) box(ctx, 4.66, floor + 1.93, z + dz, .12, 1.54, .085, 'ivory');
      for (const dy of [-.76, .76]) box(ctx, 4.67, floor + 1.93 + dy, z, .13, .09, 1.67, 'ivory');
    }
    for (let step = 0; step < 3; step++) box(ctx, 1.68, floor - .05 - step * .18, -3.55 - step * .42, 2.06, .22, .70, 'stone');
    // A faded striped canopy and a front valance form a readable field-side silhouette.
    for (let stripe = 0; stripe < 8; stripe++) {
      const x0 = -4.25 + stripe * .82, x1 = x0 + .83;
      polygon(ctx, [[x0, floor + 3.05, -3.22], [x0, floor + 2.65, -6.28],
        [x1, floor + 2.65, -6.28], [x1, floor + 3.05, -3.22]], stripe % 4 ? 'ivory' : 'burgundy', cloth,
      [0, 0, 0, 1, 1, 1, 1, 0]);
      polygon(ctx, [[x0, floor + 2.65, -6.28], [x0 + .15, floor + 2.38, -6.30],
        [x1 - .15, floor + 2.38, -6.30], [x1, floor + 2.65, -6.28]], stripe % 4 ? 'ivory' : 'burgundy', cloth);
    }
    for (const x of [-4.12, 2.12]) {
      support(ctx, x, -6.16, floor + 2.75, .13, 'endgrain');
      beam(ctx, [x, floor + 2.64, -6.16], [x, floor + 3.0, -3.2], .085, 'darkWood');
    }
    picnic(ctx, -1.5, -8.6); barrel(ctx, 5.9, -1.6, 'teal'); barrel(ctx, 6.1, -.5, 'rust');
    bench(ctx, 7.2, 3.0, -.1, 3.9); mapBoard(ctx, -7.6, -3.0, .75);
    crate(ctx, -5.5, 1.9, .85, 'rust'); crate(ctx, -5.4, 1.9, .70, 'ivory', .72);
    const rack = feetLevel(ctx, [[-7, 3.5], [-3, 3.5]], .40);
    box(ctx, -5.1, rack, 3.5, 4.4, .13, 1.15, 'darkWood');
    for (const x of [-6.7, -3.5]) support(ctx, x, 3.5, rack, .18);
    bag(ctx, -5.1, rack + .08, 3.5, 4.0, 'teal', .02);
    fence(ctx, [[-12, -9], [-12.5, -5], [-12.5, 0], [-12, 5], [-8, 7], [-3, 7]]);
    fence(ctx, [[7, -10], [11, -8], [12, -3], [12, 2], [10, 6]]);
    bunting(ctx, [-4.5, floor + 3.3, -3.4], [2.2, floor + 2.8, -6.2], 9);
  }

  // Align the long bench to the actual rock contour; its feet then stay short
  // instead of turning the staging area into a second timber trestle.
  makeSite(ALPINE_SITES[0], ALPINE_SITES[0].yaw, ctx => {
    const seat = bench(ctx, 0, 0, 0, 5.4);
    bag(ctx, -.3, seat + .05, -.12, 4.7, 'teal', .025);
    bag(ctx, .3, seat + .60, -.04, 3.9, 'brass', -.06);
    crate(ctx, -4.0, -.45, 1.05, 'rust'); crate(ctx, -4.0, -.45, .86, 'ivory', .88);
    mapBoard(ctx, 0, 2.2, 1.05);
    const small = bench(ctx, 4.7, 3.7, -.35, 2.7); bag(ctx, 4.7, small + .05, 3.7, 2.5, 'burgundy', -.35);
    const marker = localGround(ctx, -4.7, 4.2);
    support(ctx, -4.7, 4.2, marker + 2.6, .13, 'darkWood');
    polygon(ctx, [[-5.25, marker + 2.52, 4.11], [-4.7, marker + 3.27, 4.11], [-4.15, marker + 2.52, 4.11]], 'rust', cloth);
    for (const side of [-1, 1]) fence(ctx, [[side * 6.0, 4.4], [side * 7.0, 7.5], [side * 5.5, 10.2]]);
    bunting(ctx, [-5.6, marker + 3.3, 3.9], [6.6, localGround(ctx, 6.6, 3.9) + 2.8, 3.9], 10);
  });
  makeSite(ALPINE_SITES[1], ALPINE_SITES[1].yaw, refuge);
  makeSite(ALPINE_SITES[2], ALPINE_SITES[2].yaw, ctx => {
    fence(ctx, [[-9, -1], [-5.5, -.5], [-2.8, 0]]);
    fence(ctx, [[2.8, .2], [6.2, .9], [9.2, 2.0]]);
    mapBoard(ctx, -4.3, 3.0, .65);
    const y = feetLevel(ctx, [[-2.8, 0], [2.8, 0]], 1.3);
    support(ctx, -2.8, 0, y, .20); support(ctx, 2.8, .2, y + .08, .20);
    beam(ctx, [-2.8, y - .33, 0], [2.8, y - .25, .2], .10, 'burgundy');
    box(ctx, -.7, y - .32, -.08, 1.15, .30, .10, 'ivory');
  });
  makeSite(ALPINE_SITES[3], ALPINE_SITES[3].yaw, ctx => {
    bench(ctx, -1.8, 1.5, -.15, 3.9); mapBoard(ctx, 2.8, 2.5, .73);
    crate(ctx, -4.2, 2.2, .62, 'teal');
    fence(ctx, [[-5.2, 5.1], [-1.5, 5.7], [2.5, 5.5]]);
    for (const side of [-1, 1]) {
      const x = side * 3.4, z = -4.2, y = localGround(ctx, x, z);
      box(ctx, x, y + .45, z, .17, .95, .17, 'darkWood');
      box(ctx, x, y + .68, z - .1, .26, .12, .04, 'ivory');
      box(ctx, x, y + .52, z - .1, .26, .10, .04, 'rust');
    }
  });

  // Repeated trail-edge stones share geometry and a single compact draw.
  const stoneShape = new THREE.IcosahedronGeometry(1, 0);
  const stonePoints = stoneShape.attributes.position;
  for (let i = 0; i < stonePoints.count; i++) {
    const x = stonePoints.getX(i), y = stonePoints.getY(i), z = stonePoints.getZ(i);
    const fracture = hash(Math.round(x * 17), Math.round(z * 19 + y * 23));
    stonePoints.setXYZ(i, x * (1.06 + fracture * .21), y * .63 + (fracture - .5) * .13, z * (.74 + fracture * .19));
  }
  stoneShape.computeVertexNormals();
  const stoneGeometry = finish(stoneShape, 'stone', 403);
  const stoneColour = stoneGeometry.attributes.color, lichen = new THREE.Color('#8e945a');
  for (let i = 0; i < stonePoints.count; i++) {
    const patch = Math.max(0, stoneShape.attributes.normal.getY(i)) * hash(Math.round(stonePoints.getX(i) * 13), Math.round(stonePoints.getZ(i) * 13));
    if (patch > .28) {
      stoneColour.setXYZ(i, stoneColour.getX(i) * .55 + lichen.r * .45, stoneColour.getY(i) * .55 + lichen.g * .45, stoneColour.getZ(i) * .55 + lichen.b * .45);
    }
  }
  const stonePlacements = [];
  for (const [index, site] of ALPINE_SITES.entries()) for (let i = 0; i < 18; i++) {
    const cluster = Math.floor(i / 6);
    const angle = cluster * 2.15 + index + (hash(i, index + 7) - .5) * .55, radius = .72 + hash(i, 31 + index) * .24;
    const x = site.x + Math.cos(angle) * site.radiusX * radius;
    const z = site.z + Math.sin(angle) * site.radiusZ * radius;
    if (Math.hypot(x, z) < 153 || (z > -590 && z < 100 && Math.abs(x) < 90)) continue;
    if ((ecologyAt(x, z).path || 0) > .8) continue;
    stonePlacements.push({ x, z, y: groundHeight(x, z), size: .31 + hash(i, index + 67) * .58, yaw: hash(i, index + 101) * 6.28 });
  }
  const stones = new THREE.InstancedMesh(stoneGeometry, opaque, stonePlacements.length);
  stones.name = 'AlpineStory:lichen trail stones'; stones.castShadow = stones.receiveShadow = true;
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  for (const [index, stone] of stonePlacements.entries()) {
    rotation.setFromAxisAngle(up, stone.yaw); position.set(stone.x, stone.y + stone.size * .24, stone.z);
    matrix.compose(position, rotation, scale.set(stone.size * 1.3, stone.size * .64, stone.size)); stones.setMatrixAt(index, matrix);
  }
  stones.computeBoundingBox(); stones.computeBoundingSphere(); group.add(stones);
  // Original temporary kit geometry is owned here; batches have independent copies.
  for (const geometry of sourceGeometries) if (geometry !== stoneGeometry) geometry.dispose();
  outputGeometries.add(stoneGeometry);
  let level = 'high', camera = new THREE.Vector3(0, 240, -560), disposed = false;
  function refresh() {
    const range = level === 'low' ? 650 : level === 'medium' ? 1100 : 1800;
    for (const site of siteGroups) site.group.visible = site.bounds.distanceToPoint(camera) < range;
    stones.visible = level !== 'low';
    group.traverse(object => { if (object.isMesh) object.castShadow = level !== 'low'; });
  }
  function setQuality(next) {
    if (!['low', 'medium', 'high'].includes(next) || next === level) return false;
    level = next; refresh(); return true;
  }
  setQuality(quality); refresh();
  const stats = { sites: siteGroups.length, mergedDraws: siteGroups.reduce((sum, site) => sum + site.group.children.length, 0),
    instancedDraws: 1, stones: stonePlacements.length, triangles: 0 };
  // IcosahedronGeometry may be non-indexed; count its submitted instances explicitly.
  stats.triangles = siteGroups.reduce((sum, site) => sum + site.group.children.reduce((count, mesh) => count + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0), 0)
    + stonePlacements.length * (stoneGeometry.index?.count ?? stoneGeometry.attributes.position.count) / 3;
  group.userData.alpineSetDressing = stats;
  return { group, sites: ALPINE_SITES, placements, stats, exclusionAt: alpineSiteExclusionAt, setQuality,
    update(cameraPosition, elapsed = 0, weather = 0) {
      if (disposed) return;
      if (cameraPosition) camera.copy(cameraPosition);
      clock.value = elapsed;
      const strength = typeof weather === 'number' ? weather : Math.hypot(weather?.x || 0, weather?.z || 0) / 8;
      wind.value = level === 'low' ? 0 : Math.min(1.4, Math.max(0, strength)); refresh();
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(group);
      outputGeometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); brush.dispose();
    },
  };
}
