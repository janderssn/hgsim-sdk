/**
 * Authored launch geology, independent of Three.js. The escarpment is one
 * triangulated surface attached to the parent ridge, rather than intersecting
 * pillars. Drawing and contact queries consume these same Float32 vertices.
 */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const MIN_X = -176, MAX_X = 184;
const JOINTS = [-167, -149, -128, -111, -91, -73, -52, -31, -14, 10, 26, 55, 74, 94, 119, 140, 163, 179];
// More samples around the walking shelf avoid long triangular ramps behind it.
const BACK_ROWS = [...new Set([190, 166, 142, 130, 118, 106, 94, 88,
  ...Array.from({ length: 30 }, (_, i) => 87 - i * 3), 56, 32, 18, 9, 3, 0])].sort((a, b) => b - a);
// Paired rows form broken shelves between steep jointed slabs. Neither the
// shelves nor the long vertical fractures form regular horizontal rings.
const FACE_ROWS = [
  [.985, .008], [.91, .028], [.78, .052], [.775, .088],
  [.69, .105], [.57, .139], [.565, .174], [.45, .224],
  [.32, .29], [.315, .342], [.19, .45], [.08, .66], [0, 1],
];

function interpolateKnots(knots, x) {
  for (let i = 1; i < knots.length; i++) {
    if (x <= knots[i][0]) return lerp(knots[i - 1][1], knots[i][1], smooth(0, 1, (x - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0])));
  }
  return knots.at(-1)[1];
}

/** A connected shelf, fractured face and weathered toe with a compact ray index. */
export function createLaunchGeology({ terrainHeight, noise, rampTop, deckHeight, cliff }) {
  const edgeKnots = [
    [-176, -713], [-153, -661], [-130, -637], [-106, -622],
    [-87, -615], [-70, -623], [-50, -607], [-29, -601],
    [-13, -585], [-9, -568], [-6, -557.8], [-3, -557.2],
    [3, -557.7], [6, -559], [10, -567], [18, -583],
    [30, cliff.edge - 3], [34, cliff.edge], [46, cliff.edge],
    [57, cliff.edge - 8], [74, -593], [95, -602],
    [119, -628], [143, -637], [164, -662], [184, -711],
  ];
  const crestHeights = [[MIN_X, 222], [-158, 236], [-137, 254], [-119, 258],
    [-98, 249], [-82, 235], [-66, 230], [-48, 243], [-29, 250],
    [-13, 246], [0, rampTop], [18, 236], [40, cliff.ground],
    [57, 239], [76, 224], [98, 233], [119, 246], [143, 231], [164, 218], [MAX_X, 209]];

  function crestAt(x) {
    const edge = interpolateKnots(edgeKnots, clamp(x, MIN_X, MAX_X));
    const end = smooth(0, 33, Math.min(x - MIN_X, MAX_X - x));
    let height = interpolateKnots(crestHeights, x) + (noise(x / 11 + 8, 19) - .5) * 1.3;
    height = lerp(height, deckHeight(edge) - 1.6, 1 - smooth(6, 12, Math.abs(x)));
    height = lerp(height, cliff.ground, 1 - smooth(6, 11, Math.abs(x - cliff.x)));
    height = lerp(terrainHeight(x, edge) - .05, height, end);
    const depth = 51 + noise(x / 29 + 5, 32) * 32;
    return { edge, height, depth, end };
  }

  const columns = new Set([MIN_X, MAX_X, -12, -7, -6, -3.5, 0, 3.5, 6, 7, 12,
    cliff.x - 11, cliff.x - 6, cliff.x, cliff.x + 6, cliff.x + 11]);
  for (let x = MIN_X + 3; x < MAX_X; x += 3) columns.add(x);
  for (const x of JOINTS) for (const offset of [-.65, -.18, .18, .65]) columns.add(x + offset);
  for (const [x] of edgeKnots) columns.add(x);
  const xs = [...columns].filter(x => x >= MIN_X && x <= MAX_X).sort((a, b) => a - b);
  const rows = BACK_ROWS.length + FACE_ROWS.length;
  const positions = new Float32Array(xs.length * rows * 3);
  const colours = new Float32Array(positions.length);
  const joints = new Float32Array(xs.length);

  function vertex(column, row, x, y, z, soil, joint) {
    const index = row * xs.length + column, offset = index * 3;
    positions[offset] = x; positions[offset + 1] = y; positions[offset + 2] = z;
    const weather = .91 + .08 * noise(x / 19 + 13, z / 17 - 7);
    // A restrained tint: scanned albedo carries the detail; the rear apron
    // carries earth/lichen staining instead of a clean circular rock cap.
    const crevice = 1 - joint * .13;
    colours[offset] = lerp(.96, .65, soil) * weather * crevice;
    colours[offset + 1] = lerp(.95, .70, soil) * weather * crevice;
    colours[offset + 2] = lerp(.89, .48, soil) * weather * crevice;
  }

  for (const [column, x] of xs.entries()) {
    const crest = crestAt(x);
    const distanceToJoint = Math.min(...JOINTS.map(joint => Math.abs(x - joint)));
    const joint = 1 - smooth(.18, .65, distanceToJoint);
    joints[column] = joint;
    const cliffShelf = 1 - smooth(6, 11, Math.abs(x - cliff.x));
    const rampShelf = 1 - smooth(6, 12, Math.abs(x));
    const edgeChip = (noise(x / 3.8 + 5, 44) - .5) * 1.8 * (1 - Math.max(cliffShelf, rampShelf));
    for (const [row, back] of BACK_ROWS.entries()) {
      const z = crest.edge - back;
      const ground = terrainHeight(x, z);
      let y;
      if (back >= 130) y = ground - .08;
      else if (back >= 32) {
        const lift = interpolateKnots([[32, .9], [56, .47], [88, .1]], back);
        y = lerp(ground - .06, crest.height, lift);
        y += (noise(x / 15 + 9, z / 12 + 2) - .5) * 1.5 * crest.end;
        y += rampShelf * (1 - smooth(56, 88, back)) * 1.1;
      } else {
        const rise = interpolateKnots([[0, 0], [9, .45], [18, .9], [32, 0]], back);
        y = crest.height + rise * crest.end + edgeChip * (1 - back / 24);
        // The cliff's usable shelf is small and integrated into the irregular
        // crest. The pilot starts on the exact height of the rendered face.
        if (back <= 9) y = lerp(y, cliff.ground, cliffShelf);
      }
      if (back <= 32) y = lerp(y, deckHeight(z) - 1.6, rampShelf);
      // A used launch preparation shelf is part of the physical rock, with a
      // broad worn centre and rounded shoulders rather than a pointed summit.
      const stagingRadius = Math.hypot((x + 30) / 1.13, z + 620);
      const staging = (1 - smooth(8, 19, stagingRadius)) * smooth(4, 12, back);
      y = lerp(y, 250.5 + .07 * Math.sin(x * .31) * Math.sin(z * .29), staging);
      // Long weathered ribs give the apron volume at the scale of real rock.
      const relief = (noise(x / 7.2 + 9, z / 6.3 + 2) - .5) * 2.4
        + (noise(x / 2.7 - 3, z / 3.1 + 7) - .5) * .32;
      y += relief * smooth(2, 15, back) * (1 - smooth(65, 130, back))
        * (1 - Math.max(rampShelf, cliffShelf, staging)) * crest.end;
      // Side ends disappear into the same terrain, without a vertical endcap.
      y = lerp(ground - .08, y, crest.end);
      const soilPatch = smooth(.43, .7, noise(x / 17 - 4, z / 13 + 9));
      const soil = Math.max(smooth(8, 72, back), soilPatch * .55)
        * (.7 + .3 * noise(x / 12 + 1, z / 13));
      vertex(column, row, x, y, z, soil, joint * (1 - smooth(0, 25, back)));
    }

    const toeZ = crest.edge + crest.depth;
    const toeY = terrainHeight(x, toeZ) - .08;
    let previousZ = crest.edge;
    for (const [index, [heightFraction, depthFraction]] of FACE_ROWS.entries()) {
      const row = BACK_ROWS.length + index;
      // Wide slabs lean independently. Thin recessed seams break the face
      // into structural blocks rather than uniformly noisy triangulation.
      const slabBand = Math.floor(index / 3);
      const slab = (noise(x / 23 + 4, 63 + slabBand * 2.3) - .5) * 11;
      const seamActive = smooth(.18, .74, noise(x / 33 + 8, 81 + slabBand * 3.1));
      const lean = (noise(x / 29 + 4, slabBand * 1.7 + 92) - .5) * 7
        * Math.sin(depthFraction * Math.PI) * crest.end;
      const seamDistance = Math.min(...JOINTS.map(seam => Math.abs(x - lean - seam)));
      const faceJoint = 1 - smooth(.25, 1.6, seamDistance);
      const recess = faceJoint * (.3 + Math.sin(heightFraction * Math.PI) * .9) * seamActive;
      const z = Math.max(previousZ + .12, crest.edge + crest.depth * depthFraction
        + (slab - recess) * Math.sin(depthFraction * Math.PI));
      previousZ = z;
      const strata = Math.sin(x / 38 + index * .51) * 2.1 * Math.sin(heightFraction * Math.PI);
      let y = lerp(toeY, crest.height, heightFraction) + strata * crest.end;
      if (index >= FACE_ROWS.length - 5) {
        const rubble = (noise(x / 4.7 + 13, index * 2.9 + 3) - .2) * 8.5;
        const apron = Math.sin(clamp((depthFraction - .22) / .78) * Math.PI);
        y = Math.max(y, terrainHeight(x, z) + Math.max(0, rubble) * apron * crest.end);
      }
      y = lerp(terrainHeight(x, z) - .08, y, crest.end);
      const soil = index > FACE_ROWS.length - 4 ? smooth(.35, 1, depthFraction) * .43 : .025;
      // The recessed seams move obliquely between slabs. Fixed x columns and
      // monotone depth retain a single-valued, unfolded physical surface.
      vertex(column, row, x, y, z, soil, faceJoint * seamActive);
    }
  }

  const indices = [], materials = [];
  for (let row = 0; row < rows - 1; row++) for (let column = 0; column < xs.length - 1; column++) {
    const a = row * xs.length + column, b = a + 1, c = a + xs.length, d = c + 1;
    const joint = (joints[column] + joints[column + 1]) * .5;
    const interrupted = noise((xs[column] + xs[column + 1]) / 57 + 8, 81 + Math.floor(Math.max(0, row - BACK_ROWS.length) / 3) * 3.1);
    const dark = row >= BACK_ROWS.length - 1 && row < rows - 4 && joint > .48 && interrupted > .67 ? 1 : 0;
    // Consistent upward winding, with alternating diagonals hiding a grid on
    // the weathered apron. Contact samples these exact chosen triangles.
    if ((row + column) % 2) { indices.push(a, c, d, a, d, b); }
    else { indices.push(a, c, b, b, c, d); }
    materials.push(dark, dark);
  }

  const faces = new Uint32Array(indices);
  const normals = new Float32Array(indices.length);
  const bounds = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (let i = 0; i < positions.length; i += 3) {
    bounds.minX = Math.min(bounds.minX, positions[i]); bounds.maxX = Math.max(bounds.maxX, positions[i]);
    bounds.minY = Math.min(bounds.minY, positions[i + 1]); bounds.maxY = Math.max(bounds.maxY, positions[i + 1]);
    bounds.minZ = Math.min(bounds.minZ, positions[i + 2]); bounds.maxZ = Math.max(bounds.maxZ, positions[i + 2]);
  }

  const cellSize = 8, cellColumns = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
  const cellRows = Math.ceil((bounds.maxZ - bounds.minZ) / cellSize);
  const cells = Array.from({ length: cellColumns * cellRows }, () => []);
  const cellX = x => clamp(Math.floor((x - bounds.minX) / cellSize), 0, cellColumns - 1);
  const cellZ = z => clamp(Math.floor((z - bounds.minZ) / cellSize), 0, cellRows - 1);
  for (let face = 0; face < faces.length / 3; face++) {
    const ia = faces[face * 3] * 3, ib = faces[face * 3 + 1] * 3, ic = faces[face * 3 + 2] * 3;
    const ux = positions[ib] - positions[ia], uy = positions[ib + 1] - positions[ia + 1], uz = positions[ib + 2] - positions[ia + 2];
    const vx = positions[ic] - positions[ia], vy = positions[ic + 1] - positions[ia + 1], vz = positions[ic + 2] - positions[ia + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz);
    normals[face * 3] = nx / length; normals[face * 3 + 1] = ny / length; normals[face * 3 + 2] = nz / length;
    const x0 = cellX(Math.min(positions[ia], positions[ib], positions[ic]));
    const x1 = cellX(Math.max(positions[ia], positions[ib], positions[ic]));
    const z0 = cellZ(Math.min(positions[ia + 2], positions[ib + 2], positions[ic + 2]));
    const z1 = cellZ(Math.max(positions[ia + 2], positions[ib + 2], positions[ic + 2]));
    for (let row = z0; row <= z1; row++) for (let column = x0; column <= x1; column++) cells[row * cellColumns + column].push(face);
  }

  /** Highest exact surface intersection under x/z; no inset collision shell. */
  function sample(x, z, heightOnly = false) {
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return heightOnly ? -Infinity : null;
    let top = -Infinity, found = -1;
    for (const face of cells[cellZ(z) * cellColumns + cellX(x)]) {
      const ia = faces[face * 3] * 3, ib = faces[face * 3 + 1] * 3, ic = faces[face * 3 + 2] * 3;
      const ax = positions[ia], az = positions[ia + 2];
      const bx = positions[ib], bz = positions[ib + 2], cx = positions[ic], cz = positions[ic + 2];
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-10) continue;
      const a = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const b = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
      const c = 1 - a - b;
      if (a < -1e-7 || b < -1e-7 || c < -1e-7) continue;
      const height = positions[ia + 1] * a + positions[ib + 1] * b + positions[ic + 1] * c;
      if (height > top) { top = height; found = face; }
    }
    if (heightOnly) return top;
    if (found < 0) return null;
    const normal = { x: normals[found * 3], y: normals[found * 3 + 1], z: normals[found * 3 + 2] };
    return { height: top, normal, slope: Math.hypot(normal.x, normal.z) / Math.max(1e-6, normal.y), face: found };
  }

  return { positions, indices: faces, colours, materialIndices: new Uint8Array(materials), normals,
    bounds, columns: xs.length, rows, crestAt, sample, heightAt: (x, z) => sample(x, z, true) };
}
