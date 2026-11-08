/** Deterministic woodland, with one canopy field shared by shading and undergrowth. */
import { hash, noise, terrainHeight, slopeAt, LAUNCH, MARK } from './world.js';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createForestField({ variants = 4, profiles = [], ecologyAt = () => ({}), groundHeight = terrainHeight,
  minX = -1500, minZ = -1500, size = 3000, spacing = 10.5 } = {}) {
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
    const ecology = ecologyAt(x, z);
    if ((ecology.rock || 0) > .36 || (ecology.path || 0) > .5 || slopeAt(x, z) > .88) continue;
    const warp = x + 95 * Math.sin(z / 310) + 65 * (noise(x / 270, z / 270) - .5);
    const broad = noise(warp / 410 + 11, z / 360 - 6);
    const local = noise(x / 125 - 8, z / 150 + 3);
    const border = smooth(180, 650, Math.abs(x)) * .19;
    const density = smooth(.29, .58, broad * .68 + local * .32 + border);
    if (hash(seed, 103) > density * .96) continue;
    const mature = .78 + hash(seed, 109) * .38 + density * .1;
    // Deciduous crowns thrive at moist woodland edges; fir and young trees
    // break the repeated conifer silhouette deeper in the stand.
    const species = hash(seed, 113);
    const variant = Math.min(variants - 1, species < .40 ? 0 : species < .57 ? 1 : species < .80 ? 2 : 3);
    const scale = mature * (variant === 1 ? .86 : 1);
    const tree = { x, y: groundHeight(x, z) - .08, z, size: scale,
      yaw: hash(seed, 127) * Math.PI * 2, variant,
      shade: .84 + hash(seed, 131) * .16, seed,
      crownRadius: scale * (profiles[variant]?.radius || (variant === 3 ? 6.5 : 5.7)),
      height: scale * (profiles[variant]?.height || (variant === 1 ? 17 : 26)) };
    trees.push(tree);
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    if (!cells.has(key)) cells.set(key, { trees: [], minX: x, maxX: x, minY: tree.y, maxY: tree.y + tree.height, minZ: z, maxZ: z });
    const cell = cells.get(key); cell.trees.push(tree);
    cell.minX = Math.min(cell.minX, x - tree.crownRadius); cell.maxX = Math.max(cell.maxX, x + tree.crownRadius);
    cell.minY = Math.min(cell.minY, tree.y); cell.maxY = Math.max(cell.maxY, tree.y + tree.height);
    cell.minZ = Math.min(cell.minZ, z - tree.crownRadius); cell.maxZ = Math.max(cell.maxZ, z + tree.crownRadius);
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
