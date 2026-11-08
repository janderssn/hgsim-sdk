/**
 * Deterministic, periodic volume of overlapping cumulus billows. The 3D shape and
 * sun-column map are baked once on the CPU, never rebuilt as the camera moves.
 * Distances are metres. No external textures, random frame offsets or assets.
 */
export const CLOUD_FIELD = Object.freeze({
  period: 12800,
  bottom: 2300,
  top: 3400,
  extinction: .0072,
  windX: 4.2,
  windZ: 1.3,
  // Initial authored phase: the flight corridor opens under clear sky while
  // the eastern woodland receives a broad bank's passing shadow.
  offsetX: 800,
  offsetZ: 0,
});

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mod = (x, n) => ((x % n) + n) % n;

function random(x, y, z, seed = 0) {
  let n = Math.imul(x + 104729, 374761393) ^ Math.imul(y + 130363, 668265263)
    ^ Math.imul(z + 155921, 2147483647) ^ seed;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
}

/** A bounded anisotropic volume of actual overlapping ellipsoidal billows. */
export function bakeCloudShape(size = 128) {
  if (!Number.isInteger(size) || size < 8 || size > 128) throw new RangeError('Cloud volume size must be 8–128.');
  const width = size * 2, depth = width, height = Math.max(8, Math.floor(size / 4));
  const data = new Uint8Array(width * height * depth * 4);
  const sx = CLOUD_FIELD.period / width, sy = (CLOUD_FIELD.top - CLOUD_FIELD.bottom) / height;
  for (const billow of cloudBillows()) {
    const { x, y, z, rx, ry, rz } = billow;
    const minX = Math.floor((x - rx) / sx), maxX = Math.ceil((x + rx) / sx);
    const minY = Math.max(0, Math.floor((y - ry - CLOUD_FIELD.bottom) / sy));
    const maxY = Math.min(height - 1, Math.ceil((y + ry - CLOUD_FIELD.bottom) / sy));
    const minZ = Math.floor((z - rz) / sx), maxZ = Math.ceil((z + rz) / sx);
    for (let iz = minZ; iz <= maxZ; iz++) for (let iy = minY; iy <= maxY; iy++) for (let ix = minX; ix <= maxX; ix++) {
      const dx = ((ix + .5) * sx - x) / rx;
      const dy = (CLOUD_FIELD.bottom + (iy + .5) * sy - y) / ry;
      const dz = ((iz + .5) * sx - z) / rz;
      const radius = Math.hypot(dx, dy, dz);
      if (radius >= 1) continue;
      const density = Math.round((1 - smooth(.78, 1, radius)) * 255);
      const offset = ((mod(iz, depth) * height + iy) * width + mod(ix, width)) * 4;
      data[offset] = Math.max(data[offset], density);
    }
  }
  const at = (x, y, z) => data[((mod(z, depth) * height + Math.max(0, Math.min(height - 1, y))) * width + mod(x, width)) * 4];
  // Gradient normals account for the anisotropic voxel dimensions. They derive
  // from the same union used by optical depth and cloud shadows.
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const nx = (at(x - 1, y, z) - at(x + 1, y, z)) / sx;
    const ny = (at(x, y - 1, z) - at(x, y + 1, z)) / sy;
    const nz = (at(x, y, z - 1) - at(x, y, z + 1)) / sx;
    const length = Math.hypot(nx, ny, nz) || 1, offset = ((z * height + y) * width + x) * 4;
    data[offset + 1] = Math.round((nx / length * .5 + .5) * 255);
    data[offset + 2] = Math.round((ny / length * .5 + .5) * 255);
    data[offset + 3] = Math.round((nz / length * .5 + .5) * 255);
  }
  return { size, width, height, depth, data };
}

const CLOUD_BANKS = [
  [.12, .15, .075, .055], [.37, .09, .10, .06], [.68, .19, .075, .045],
  [.88, .39, .08, .06], [.18, .52, .085, .065], [.49, .45, .07, .05],
  [.70, .65, .09, .06], [.30, .78, .10, .05], [.93, .85, .085, .055],
  [.55, .93, .09, .05], [.04, .94, .065, .045],
];

function cloudBillows() {
  const billows = [], period = CLOUD_FIELD.period;
  CLOUD_BANKS.forEach(([cx, cz, rx, rz], bank) => {
    // Low broad puffs form a connected shelf; unequal rising puffs give the
    // skyline its scalloped outline. The shape is never a vertically extruded mask.
    for (let base = 0; base < 2; base++) billows.push({
      x: (cx + (base - .5) * rx) * period, y: CLOUD_FIELD.bottom + 170,
      z: cz * period, rx: rx * period * .95, ry: 155, rz: rz * period * .75,
    });
    for (let puff = 0; puff < 7; puff++) {
      const along = (puff / 6 - .5) * 2.1;
      const vertical = 210 + random(bank, puff, 3, 107) * 260;
      const primary = {
        x: (cx + rx * along) * period,
        z: (cz + (random(bank, puff, 0, 71) - .5) * rz * .8) * period,
        y: CLOUD_FIELD.bottom + 150 + vertical * .70,
        rx: rx * (.38 + random(bank, puff, 1, 83) * .23) * period,
        ry: vertical,
        rz: rz * (.57 + random(bank, puff, 2, 97) * .35) * period,
      };
      billows.push(primary);
      // Smaller connected shoulders break up the large smooth balloon shape.
      // They remain real volume, so their silhouette and sun shadow agree.
      for (let shoulder = 0; shoulder < 5; shoulder++) {
        const angle = shoulder / 5 * Math.PI * 2 + random(bank, puff, shoulder, 131) * .9;
        const rise = .05 + random(bank, puff, shoulder, 149) * .68;
        const radial = Math.sqrt(1 - rise * rise);
        const scale = .25 + random(bank, puff, shoulder, 163) * .16;
        billows.push({
          x: primary.x + Math.cos(angle) * primary.rx * radial * .88,
          y: primary.y + primary.ry * rise * .88,
          z: primary.z + Math.sin(angle) * primary.rz * radial * .88,
          rx: primary.rx * scale,
          ry: Math.max(90, primary.ry * scale),
          rz: primary.rz * scale,
        });
      }
    }
  });
  return billows;
}

function sample3(field, x, y, z) {
  const { width, height, depth } = field;
  const px = mod(x, 1) * width - .5, py = clamp(y) * height - .5, pz = mod(z, 1) * depth - .5;
  const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  const fx = px - ix, fy = py - iy, fz = pz - iz;
  const at = (dx, dy, dz) => field.data[((mod(iz + dz, depth) * height + Math.max(0, Math.min(height - 1, iy + dy))) * width + mod(ix + dx, width)) * 4] / 255;
  return mix(mix(mix(at(0, 0, 0), at(1, 0, 0), fx), mix(at(0, 1, 0), at(1, 1, 0), fx), fy),
    mix(mix(at(0, 0, 1), at(1, 0, 1), fx), mix(at(0, 1, 1), at(1, 1, 1), fx), fy), fz);
}

/** Matches CLOUD_DENSITY_GLSL: one actual 3D medium for pixels and shadows. */
export function sampleCloudDensity(shape, x, y, z) {
  const { bottom, top, period } = CLOUD_FIELD;
  if (y <= bottom || y >= top) return 0;
  return sample3(shape, x / period, (y - bottom) / (top - bottom), z / period);
}

/** Sun-ray intersection with y=0. The same texture shades every object height. */
export function cloudShadowCoordinates(position, sunDirection, seconds = 0,
  cloudOffset = [CLOUD_FIELD.offsetX, CLOUD_FIELD.offsetZ]) {
  const [x, y, z] = Array.isArray(position) ? position : [position.x, position.y, position.z];
  const [sx, sy, sz] = Array.isArray(sunDirection) ? sunDirection : [sunDirection.x, sunDirection.y, sunDirection.z];
  return [(x - sx * y / Math.max(.08, sy) - cloudOffset[0] - CLOUD_FIELD.windX * seconds) / CLOUD_FIELD.period,
    (z - sz * y / Math.max(.08, sy) - cloudOffset[1] - CLOUD_FIELD.windZ * seconds) / CLOUD_FIELD.period];
}

/** Optical depth encoded as 1-exp(-tau), preserving soft penumbral transitions. */
export function bakeCloudShadow(shape, sunDirection, size = 128, slices = 16) {
  const [sx, sy0, sz] = Array.isArray(sunDirection) ? sunDirection : [sunDirection.x, sunDirection.y, sunDirection.z];
  const sy = Math.max(.08, sy0), { bottom, top, period, extinction } = CLOUD_FIELD;
  const data = new Uint8Array(size * size);
  const step = (top - bottom) / slices;
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const wx = (x + .5) / size * period, wz = (z + .5) / size * period;
    let opticalDepth = 0;
    for (let slice = 0; slice < slices; slice++) {
      const y = bottom + (slice + .5) * step;
      opticalDepth += sampleCloudDensity(shape, wx + sx / sy * y, y, wz + sz / sy * y) * step / sy * extinction;
    }
    data[z * size + x] = Math.round((1 - Math.exp(-opticalDepth)) * 255);
  }
  return { size, data };
}

export const CLOUD_DENSITY_GLSL = /* glsl */`
  precision highp sampler3D;
  uniform sampler3D aerialCloudShape;
  uniform vec2 aerialWindOffset;
  vec3 aerialCloudUv(vec3 p) {
    return vec3((p.x - aerialWindOffset.x) / ${CLOUD_FIELD.period.toFixed(1)},
      (p.y - ${CLOUD_FIELD.bottom.toFixed(1)}) / ${(CLOUD_FIELD.top - CLOUD_FIELD.bottom).toFixed(1)},
      (p.z - aerialWindOffset.y) / ${CLOUD_FIELD.period.toFixed(1)});
  }
  vec3 aerialCloudNormal(vec3 p) {
    vec3 normal = texture(aerialCloudShape, aerialCloudUv(p)).gba * 2.0 - 1.0;
    return normalize(normal + vec3(0.0, 0.08, 0.0));
  }
  float aerialCloudDensity(vec3 p) {
    if (p.y <= ${CLOUD_FIELD.bottom.toFixed(1)} || p.y >= ${CLOUD_FIELD.top.toFixed(1)}) return 0.0;
    return texture(aerialCloudShape, aerialCloudUv(p)).r;
  }
`;
