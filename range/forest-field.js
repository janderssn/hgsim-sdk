/** Deterministic woodland, with one canopy field shared by shading and undergrowth. */
import { hash, noise, terrainHeight, slopeAt, LAUNCH, MARK } from './world.js';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const mix3 = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);

/** Grove pigment weights; neighboring crowns share a limited, authored palette. */
export function forestCanopyTint({ family = 'pine', edge = 0, moisture = .5, grove = .5, accent = .5, variation = .5 } = {}) {
  const sage = [1.10, 1.37, .96], olive = [1.30, 1.31, .67];
  const teal = [.73, 1.14, 1.08], gold = [2.06, 1.55, .48], copper = [2.12, 1.04, .53];
  let pigment;
  if (family === 'ash') {
    const warm = smooth(.39, .68, grove) * (.56 + edge * .44) * (1 - moisture * .23);
    pigment = mix3(sage, gold, warm);
    pigment = mix3(pigment, copper, smooth(.79, .94, accent) * edge * .32);
  } else {
    pigment = mix3(olive, sage, smooth(.30, .72, grove));
    const innerCool = (1 - edge) * (.33 + moisture * .46) * (family === 'fir' ? .92 : .64);
    pigment = mix3(pigment, teal, innerCool);
  }
  return pigment.map(value => value * (.96 + variation * .08));
}

// Small asymmetric windows keep the launch approach readable without clearing
// the valley. Their fringes collect brighter broadleaf groves and young pines.
const CANOPY_WINDOWS = [
  { x: -103, z: -603, rx: 29, rz: 37 },
  { x: -225, z: -625, rx: 23, rz: 30 },
  { x: 93, z: -437, rx: 35, rz: 48 },
];
function canopyWindowAt(x, z) {
  let amount = 0;
  for (const window of CANOPY_WINDOWS) {
    const d = Math.hypot((x - window.x) / window.rx, (z - window.z) / window.rz);
    amount = Math.max(amount, 1 - smooth(.55, 1.5, d));
  }
  return amount;
}

/** Exact conservative bounds for a yaw-rotated, uniformly scaled tree instance. */
export function forestTreeBounds(profile, tree) {
  const fallbackRadius = tree.crownRadius / tree.size;
  const bounds = profile?.cullBounds || profile?.bounds || {
    min: [-fallbackRadius, 0, -fallbackRadius],
    max: [fallbackRadius, tree.height / tree.size, fallbackRadius],
  };
  const [minX, minY, minZ] = bounds.min, [maxX, maxY, maxZ] = bounds.max;
  const cx = (minX + maxX) * .5 * tree.size, cy = (minY + maxY) * .5 * tree.size;
  const cz = (minZ + maxZ) * .5 * tree.size;
  const hx = (maxX - minX) * .5 * tree.size, hy = (maxY - minY) * .5 * tree.size;
  const hz = (maxZ - minZ) * .5 * tree.size;
  const cos = Math.cos(tree.yaw), sin = Math.sin(tree.yaw);
  const x = tree.x + cx * cos + cz * sin, y = tree.y + cy, z = tree.z - cx * sin + cz * cos;
  const extentX = Math.abs(cos) * hx + Math.abs(sin) * hz;
  const extentZ = Math.abs(sin) * hx + Math.abs(cos) * hz;
  return { center: [x, y, z], radius: Math.hypot(hx, hy, hz),
    minX: x - extentX, maxX: x + extentX, minY: y - hy, maxY: y + hy,
    minZ: z - extentZ, maxZ: z + extentZ };
}

export function createForestField({ variants = 4, profiles = [], ecologyAt = () => ({}), groundHeight = terrainHeight,
  exclusionAt = () => 0, minX = -1500, minZ = -1500, size = 3000, spacing = 10.5 } = {}) {
  const trees = [], cells = new Map(), cellSize = 96;
  const count = Math.ceil(size / spacing);
  for (let row = 0; row < count; row++) for (let column = 0; column < count; column++) {
    const seed = row * count + column;
    const x = minX + (column + .12 + hash(seed, 91) * .76) * spacing;
    const z = minZ + (row + .12 + hash(seed, 97) * .76) * spacing;
    if (x >= minX + size || z >= minZ + size) continue;
    // The glider has room to leave the ledge; meadow edges meander instead of
    // drawing two ruler-straight walls down the entire valley.
    const fieldEdge = 130 + 14 * Math.sin(Math.atan2(z, x) * 3 + .7);
    if (Math.hypot(x - MARK.x, z - MARK.z) < fieldEdge) continue;
    const run = Math.abs(x - LAUNCH.x);
    const corridorWidth = 30 + 14 * smooth(-530, -160, z) + 7 * Math.sin(z / 87) ** 2;
    if (z > -635 && z < 70 && run < corridorWidth) continue;
    if (run < 22 && z > -670 && z < -530) continue;
    if (exclusionAt(x, z) > .15) continue;
    const clearing = canopyWindowAt(x, z);
    const ecology = ecologyAt(x, z);
    if ((ecology.rock || 0) > .36 || (ecology.path || 0) > .5 || slopeAt(x, z) > .88) continue;
    const warp = x + 95 * Math.sin(z / 310) + 65 * (noise(x / 270, z / 270) - .5);
    const broad = noise(warp / 410 + 11, z / 360 - 6);
    const local = noise(x / 125 - 8, z / 150 + 3);
    const border = smooth(180, 650, Math.abs(x)) * .19;
    const density = smooth(.29, .58, broad * .68 + local * .32 + border);
    if (hash(seed, 103) > density * .96 * (1 - clearing * .92)) continue;
    const mature = .78 + hash(seed, 109) * .38 + density * .1;
    // Deciduous crowns thrive at moist woodland edges; fir and young trees
    // break the repeated conifer silhouette deeper in the stand.
    const corridorEdge = z > -650 && z < 90 ? 1 - smooth(corridorWidth, corridorWidth + 70, run) : 0;
    const meadowEdge = 1 - smooth(fieldEdge, fieldEdge + 90, Math.hypot(x - MARK.x, z - MARK.z));
    const edge = Math.max(1 - smooth(.35, .82, density), corridorEdge, meadowEdge, clearing);
    const grove = noise(x / 147 + 19, z / 173 - 11);
    const moisture = ecology.moisture ?? (.3 + noise(x / 180 - 3, z / 210 + 8) * .5);
    const species = hash(seed, 113);
    const broadleafChance = .09 + edge * .25 + smooth(.49, .72, grove) * .15;
    const variant = Math.min(variants - 1, species < broadleafChance ? 3 : species < broadleafChance + .18 ? 1 : species < broadleafChance + .43 - edge * .12 ? 2 : 0);
    const scale = mature * (variant === 1 ? .86 : 1);
    const tree = { x, y: groundHeight(x, z) - .08, z, size: scale,
      yaw: hash(seed, 127) * Math.PI * 2, variant,
      shade: .93 + hash(seed, 131) * .10, seed,
      edge, grove, moisture,
      crownTint: forestCanopyTint({ family: profiles[variant]?.family || (variant === 3 ? 'ash' : variant === 2 ? 'fir' : 'pine'), edge, moisture, grove, accent: noise(x / 73 + 31, z / 89 + 4), variation: hash(seed, 137) }),
      crownRadius: scale * (profiles[variant]?.radius || (variant === 3 ? 6.5 : 5.7)),
      height: scale * (profiles[variant]?.height || (variant === 1 ? 17 : 26)) };
    tree.bounds = forestTreeBounds(profiles[variant], tree);
    trees.push(tree);
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    if (!cells.has(key)) cells.set(key, { trees: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
    const cell = cells.get(key); cell.trees.push(tree);
    cell.minX = Math.min(cell.minX, tree.bounds.minX); cell.maxX = Math.max(cell.maxX, tree.bounds.maxX);
    cell.minY = Math.min(cell.minY, tree.bounds.minY); cell.maxY = Math.max(cell.maxY, tree.bounds.maxY);
    cell.minZ = Math.min(cell.minZ, tree.bounds.minZ); cell.maxZ = Math.max(cell.maxZ, tree.bounds.maxZ);
  }
  // Rasterize actual crowns, rather than reusing the placement noise as a
  // second, disagreeing definition of forest. Bilinear CPU queries and the
  // GPU texture read the very same byte field.
  const resolution = 512, density = new Float32Array(resolution * resolution);
  const pixelsPerMetre = resolution / size;
  for (const tree of trees) {
    const cx = (tree.x - minX) * pixelsPerMetre - .5, cz = (tree.z - minZ) * pixelsPerMetre - .5;
    const radius = tree.crownRadius * 1.5 * pixelsPerMetre;
    for (let row = Math.max(0, Math.floor(cz - radius)); row <= Math.min(resolution - 1, Math.ceil(cz + radius)); row++) {
      for (let column = Math.max(0, Math.floor(cx - radius)); column <= Math.min(resolution - 1, Math.ceil(cx + radius)); column++) {
        const d = Math.hypot(column - cx, row - cz) / radius;
        if (d >= 1) continue;
        const amount = .88 * (1 - smooth(.40, 1, d));
        const i = row * resolution + column;
        density[i] = 1 - (1 - density[i]) * (1 - amount);
      }
    }
  }
  const pixels = new Uint8Array(resolution * resolution * 4);
  for (let i = 0; i < density.length; i++) {
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = Math.round(density[i] * 255);
    pixels[i * 4 + 3] = 255;
  }
  function coverageAt(x, z) {
    if (x < minX || z < minZ || x > minX + size || z > minZ + size) return 0;
    const u = Math.max(0, Math.min(resolution - 1.000001, (x - minX) * pixelsPerMetre - .5));
    const v = Math.max(0, Math.min(resolution - 1.000001, (z - minZ) * pixelsPerMetre - .5));
    const column = Math.floor(u), row = Math.floor(v), fx = u - column, fz = v - row;
    const sample = (dx, dz) => pixels[((row + dz) * resolution + column + dx) * 4] / 255;
    return (sample(0, 0) * (1 - fx) + sample(1, 0) * fx) * (1 - fz)
      + (sample(0, 1) * (1 - fx) + sample(1, 1) * fx) * fz;
  }
  return { trees, cells: [...cells.values()], coverageAt, pixels, resolution,
    bounds: { minX, minZ, width: size, depth: size } };
}

export function createForestCoverageTexture(THREE, field) {
  const texture = new THREE.DataTexture(field.pixels, field.resolution, field.resolution, THREE.RGBAFormat);
  texture.name = 'Actual woodland canopy coverage';
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true; texture.flipY = false; texture.needsUpdate = true;
  return texture;
}
