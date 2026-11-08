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
    const warm = (.62 + smooth(.30, .72, grove) * .38) * (.72 + edge * .28) * (1 - moisture * .12);
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
  function plantingAt(x, z) {
    if (x < minX || z < minZ || x >= minX + size || z >= minZ + size) return null;
    // The glider has room to leave the ledge; meadow edges meander instead of
    // drawing two ruler-straight walls down the entire valley.
    const fieldEdge = 130 + 14 * Math.sin(Math.atan2(z, x) * 3 + .7);
    if (Math.hypot(x - MARK.x, z - MARK.z) < fieldEdge) return null;
    const run = Math.abs(x - LAUNCH.x);
    const corridorWidth = 30 + 14 * smooth(-530, -160, z) + 7 * Math.sin(z / 87) ** 2;
    if (z > -635 && z < 70 && run < corridorWidth) return null;
    if (run < 22 && z > -670 && z < -530) return null;
    if (exclusionAt(x, z) > .15) return null;
    const ecology = ecologyAt(x, z);
    if ((ecology.rock || 0) > .36 || (ecology.path || 0) > .5 || slopeAt(x, z) > .88) return null;
    return { fieldEdge, run, corridorWidth, ecology };
  }
  function appendTree(tree) {
    tree.bounds = forestTreeBounds(profiles[tree.variant], tree);
    trees.push(tree);
    const key = `${Math.floor(tree.x / cellSize)},${Math.floor(tree.z / cellSize)}`;
    if (!cells.has(key)) cells.set(key, { trees: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
    const cell = cells.get(key); cell.trees.push(tree);
    cell.minX = Math.min(cell.minX, tree.bounds.minX); cell.maxX = Math.max(cell.maxX, tree.bounds.maxX);
    cell.minY = Math.min(cell.minY, tree.bounds.minY); cell.maxY = Math.max(cell.maxY, tree.bounds.maxY);
    cell.minZ = Math.min(cell.minZ, tree.bounds.minZ); cell.maxZ = Math.max(cell.maxZ, tree.bounds.maxZ);
  }
  const count = Math.ceil(size / spacing);
  for (let row = 0; row < count; row++) for (let column = 0; column < count; column++) {
    const seed = row * count + column;
    const sourceX = minX + (column + .025 + hash(seed, 91) * .95) * spacing;
    const sourceZ = minZ + (row + .025 + hash(seed, 97) * .95) * spacing;
    // A smooth domain warp breaks planting rows into uneven interlocking stands.
    // It preserves world anchoring while locally gathering or opening the crowns.
    const x = sourceX + (noise(sourceX / 83 + 5, sourceZ / 97 - 8) - .5) * 19;
    const z = sourceZ + (noise(sourceX / 91 - 9, sourceZ / 79 + 4) - .5) * 19;
    const planting = plantingAt(x, z);
    if (!planting) continue;
    const { fieldEdge, run, corridorWidth, ecology } = planting;
    const clearing = canopyWindowAt(x, z);
    const warp = x + 95 * Math.sin(z / 310) + 65 * (noise(x / 270, z / 270) - .5);
    const broad = noise(warp / 410 + 11, z / 360 - 6);
    const local = noise(x / 125 - 8, z / 150 + 3);
    const border = smooth(180, 650, Math.abs(x)) * .19;
    // Broad stands, narrow sinuous openings and smaller regeneration pockets
    // produce identifiable canopy masses instead of uniformly stippled hills.
    const stand = noise(x / 230 + 41, z / 260 - 23);
    const clearingVein = noise((x + 70 * Math.sin(z / 130)) / 105 + 29, z / 119 + 17);
    const gap = smooth(.52, .66, clearingVein) * (1 - smooth(.47, .65, stand));
    const density = smooth(.32, .63, broad * .62 + local * .38 + border) * (1 - gap * .88);
    if (hash(seed, 103) > density * .96 * (1 - clearing * .92)) continue;
    const cohort = noise(x / 77 - 18, z / 93 + 32);
    const mature = .54 + smooth(.23, .76, cohort) * .76 + (hash(seed, 109) - .5) * .28;
    // Deciduous crowns thrive at moist woodland edges; fir and young trees
    // break the repeated conifer silhouette deeper in the stand.
    const corridorEdge = z > -650 && z < 90 ? 1 - smooth(corridorWidth, corridorWidth + 70, run) : 0;
    const meadowEdge = 1 - smooth(fieldEdge, fieldEdge + 90, Math.hypot(x - MARK.x, z - MARK.z));
    const siteEdge = Math.max(exclusionAt(x - 12, z), exclusionAt(x + 12, z), exclusionAt(x, z - 12), exclusionAt(x, z + 12));
    const edge = Math.max(1 - smooth(.35, .82, density), corridorEdge, meadowEdge, clearing, siteEdge);
    const grove = noise(x / 147 + 19, z / 173 - 11);
    const moisture = ecology.moisture ?? (.3 + noise(x / 180 - 3, z / 210 + 8) * .5);
    const species = hash(seed, 113);
    // Most species selection belongs to the grove, with only occasional mixed
    // neighbours. This makes gold stands read as forms at flight distance.
    const deciduousGrove = smooth(.44, .62, grove);
    const broadleafChance = .035 + deciduousGrove * (.70 + edge * .14);
    const variant = Math.min(variants - 1, species < broadleafChance ? 3 : species < broadleafChance + .10 + (1 - cohort) * .16 + edge * .06 ? 1 : species < broadleafChance + .37 + edge * .24 ? 2 : 0);
    const scale = mature * (variant === 1 ? .86 : 1);
    const tree = { x, y: groundHeight(x, z) - .08, z, size: scale,
      yaw: hash(seed, 127) * Math.PI * 2, variant,
      shade: .93 + hash(seed, 131) * .10, seed,
      edge, grove, moisture,
      crownTint: forestCanopyTint({ family: profiles[variant]?.family || (variant === 3 ? 'ash' : variant === 2 ? 'fir' : 'pine'), edge, moisture, grove, accent: noise(x / 73 + 31, z / 89 + 4), variation: hash(seed, 137) }),
      crownRadius: scale * (profiles[variant]?.radius || (variant === 3 ? 6.5 : 5.7)),
      height: scale * (profiles[variant]?.height || (variant === 1 ? 17 : 26)) };
    appendTree(tree);
  }
  // Edge regeneration sits beneath mature boughs, filling the open trunk layer
  // in small groups. These are real, seeded trees using the same clearance,
  // culling, canopy coverage and shadow paths as the overstorey.
  const overstoreyCount = trees.length;
  for (let index = 0; index < overstoreyCount; index++) {
    const parent = trees[index];
    if (parent.variant === 1 || parent.edge < .30 || hash(parent.seed, 149) > .55) continue;
    const companions = hash(parent.seed, 151) < .45 ? 2 : 1;
    for (let companion = 0; companion < companions; companion++) {
      const seed = count * count + parent.seed * 2 + companion;
      const angle = hash(seed, 157) * Math.PI * 2;
      const radius = parent.crownRadius * (.45 + hash(seed, 163) * .65);
      const x = parent.x + Math.cos(angle) * radius, z = parent.z + Math.sin(angle) * radius;
      if (!plantingAt(x, z) || canopyWindowAt(x, z) > .7) continue;
      const variant = Math.min(variants - 1, hash(seed, 167) < .72 ? 2 : 1);
      const scale = parent.size * (.23 + hash(seed, 173) * .19);
      const { edge, grove, moisture } = parent;
      appendTree({ x, y: groundHeight(x, z) - .08, z, size: scale,
        yaw: angle + 1.7, variant, seed, parentSeed: parent.seed, understory: true,
        shade: .93 + hash(seed, 179) * .10, edge, grove, moisture,
        crownTint: forestCanopyTint({ family: profiles[variant]?.family || (variant === 2 ? 'fir' : 'pine'),
          edge, grove, moisture, variation: hash(seed, 181) }),
        crownRadius: scale * (profiles[variant]?.radius || 5.7),
        height: scale * (profiles[variant]?.height || (variant === 1 ? 17 : 26)) });
    }
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
