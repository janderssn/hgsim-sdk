/**
 * Deterministic, periodic fractal-value/Worley cloud medium. The 3D shape and
 * sun-column map are baked once on the CPU, never rebuilt as the camera moves.
 * Distances are metres. No external textures, random frame offsets or assets.
 */
export const CLOUD_FIELD = Object.freeze({
  period: 12800,
  shapePeriod: 3200,
  bottom: 2300,
  top: 3100,
  extinction: .0065,
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

function noise(x, y, z, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fade = v => v * v * v * (v * (v * 6 - 15) + 10);
  const u = fade(x - ix), v = fade(y - iy), w = fade(z - iz);
  const h = (dx, dy, dz) => random(mod(ix + dx, period), mod(iy + dy, period), mod(iz + dz, period), seed);
  return mix(mix(mix(h(0, 0, 0), h(1, 0, 0), u), mix(h(0, 1, 0), h(1, 1, 0), u), v),
    mix(mix(h(0, 0, 1), h(1, 0, 1), u), mix(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

function worley(x, y, z, cells) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let distance = 4;
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy, cz = iz + dz;
    const wx = mod(cx, cells), wy = mod(cy, cells), wz = mod(cz, cells);
    const px = cx + random(wx, wy, wz, 4573) - x;
    const py = cy + random(wx, wy, wz, 8923) - y;
    const pz = cz + random(wx, wy, wz, 2357) - z;
    distance = Math.min(distance, px * px + py * py + pz * pz);
  }
  return clamp(1 - Math.sqrt(distance));
}

/** Texel-centred 3D shape: broad rounded mass in R, smaller erosion in G. */
export function bakeCloudShape(size = 64) {
  if (!Number.isInteger(size) || size < 8 || size > 128) throw new RangeError('Cloud volume size must be 8–128.');
  const data = new Uint8Array(size ** 3 * 2);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + .5) / size, v = (y + .5) / size, w = (z + .5) / size;
    const broad = noise(u * 4, v * 4, w * 4, 4, 719);
    const middle = noise(u * 8, v * 8, w * 8, 8, 911);
    // Rounded cellular lobes carry the silhouette; lattice noise only
    // modulates them, avoiding large squared-off cloud banks.
    const cellular = worley(u * 6, v * 6, w * 6, 6);
    const fine = noise(u * 16, v * 16, w * 16, 16, 1237);
    const offset = ((z * size + y) * size + x) * 2;
    data[offset] = Math.round(clamp(broad * .30 + middle * .12 + cellular * .58) * 255);
    data[offset + 1] = Math.round(clamp(fine * .55 + middle * .45) * 255);
  }
  return { size, data };
}

const CLOUD_BANKS = [
  [.12, .15, .075, .055], [.37, .09, .10, .06], [.68, .19, .075, .045],
  [.88, .39, .08, .06], [.18, .52, .085, .065], [.49, .45, .07, .05],
  [.70, .65, .09, .06], [.30, .78, .10, .05], [.93, .85, .085, .055],
  [.55, .93, .09, .05], [.04, .94, .065, .045],
];

/** Kilometre-scale cumulus groups with genuine clear corridors between banks. */
export function bakeCloudWeather(size = 128) {
  if (!Number.isInteger(size) || size < 8 || size > 512) throw new RangeError('Cloud weather size must be 8–512.');
  const data = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = (x + .5) / size, v = (z + .5) / size;
    // Separate rounded banks with broad clear corridors. Weather only defines
    // the envelope; the shared 3D medium supplies the billowed silhouette.
    let coverage = 0;
    for (const [cx, cz, rx, rz] of CLOUD_BANKS) {
      const dx = Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx)) / (rx * 1.5);
      const dz = Math.min(Math.abs(v - cz), 1 - Math.abs(v - cz)) / (rz * 1.15);
      const radius = Math.hypot(dx, dz);
      coverage = Math.max(coverage, 1 - smooth(.30, 1.0, radius));
    }
    data[z * size + x] = Math.round(coverage * 255);
  }
  return { size, data };
}

function sample2(field, u, v) {
  const n = field.size, x = mod(u, 1) * n - .5, y = mod(v, 1) * n - .5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const at = (dx, dy) => field.data[mod(iy + dy, n) * n + mod(ix + dx, n)] / 255;
  return mix(mix(at(0, 0), at(1, 0), fx), mix(at(0, 1), at(1, 1), fx), fy);
}

function sample3(field, x, y, z, channel = 0) {
  const n = field.size, px = mod(x, 1) * n - .5, py = mod(y, 1) * n - .5, pz = mod(z, 1) * n - .5;
  const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  const fx = px - ix, fy = py - iy, fz = pz - iz;
  const at = (dx, dy, dz) => field.data[((mod(iz + dz, n) * n + mod(iy + dy, n)) * n + mod(ix + dx, n)) * 2 + channel] / 255;
  return mix(mix(mix(at(0, 0, 0), at(1, 0, 0), fx), mix(at(0, 1, 0), at(1, 1, 0), fx), fy),
    mix(mix(at(0, 0, 1), at(1, 0, 1), fx), mix(at(0, 1, 1), at(1, 1, 1), fx), fy), fz);
}

/** Matches CLOUD_DENSITY_GLSL, including the soft, eroded lower boundary. */
export function sampleCloudDensity(shape, weather, x, y, z) {
  const { bottom, top, period, shapePeriod } = CLOUD_FIELD;
  const coverage = smooth(.16, .86, sample2(weather, x / period, z / period));
  const h = (y - bottom) / (top - bottom);
  const bankTop = .28 + coverage * .7;
  const profile = smooth(0, .12, h) * (1 - smooth(bankTop * .65, bankTop, h));
  if (profile <= 0 || coverage < .08) return 0;
  const base = sample3(shape, x / shapePeriod, y / shapePeriod, z / shapePeriod);
  const erosion = sample3(shape, x / shapePeriod, y / shapePeriod, z / shapePeriod, 1);
  const threshold = .58 - coverage * .25;
  const mass = smooth(threshold, threshold + .15, base);
  return clamp(mass * profile - (1 - erosion) * .025) * (.42 + coverage * .58);
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
export function bakeCloudShadow(shape, weather, sunDirection, size = 128, slices = 16) {
  const [sx, sy0, sz] = Array.isArray(sunDirection) ? sunDirection : [sunDirection.x, sunDirection.y, sunDirection.z];
  const sy = Math.max(.08, sy0), { bottom, top, period, extinction } = CLOUD_FIELD;
  const data = new Uint8Array(size * size);
  const step = (top - bottom) / slices;
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const wx = (x + .5) / size * period, wz = (z + .5) / size * period;
    let opticalDepth = 0;
    for (let slice = 0; slice < slices; slice++) {
      const y = bottom + (slice + .5) * step;
      opticalDepth += sampleCloudDensity(shape, weather, wx + sx / sy * y, y, wz + sz / sy * y) * step / sy * extinction;
    }
    data[z * size + x] = Math.round((1 - Math.exp(-opticalDepth)) * 255);
  }
  return { size, data };
}

export const CLOUD_DENSITY_GLSL = /* glsl */`
  precision highp sampler3D;
  uniform sampler3D aerialCloudShape;
  uniform sampler2D aerialCloudWeather;
  uniform vec2 aerialWindOffset;
  float aerialCloudDensity(vec3 p) {
    p.xz -= aerialWindOffset;
    float coverage = smoothstep(0.16, 0.86, texture(aerialCloudWeather, p.xz / ${CLOUD_FIELD.period.toFixed(1)}).r);
    float h = (p.y - ${CLOUD_FIELD.bottom.toFixed(1)}) / ${(CLOUD_FIELD.top - CLOUD_FIELD.bottom).toFixed(1)};
    float bankTop = 0.28 + coverage * 0.7;
    float profile = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(bankTop * 0.65, bankTop, h));
    if (profile <= 0.0 || coverage < 0.08) return 0.0;
    vec2 shape = texture(aerialCloudShape, p / ${CLOUD_FIELD.shapePeriod.toFixed(1)}).rg;
    float threshold = 0.58 - coverage * 0.25;
    float mass = smoothstep(threshold, threshold + 0.15, shape.r);
    return clamp(mass * profile - (1.0 - shape.g) * 0.025, 0.0, 1.0) * (0.42 + coverage * 0.58);
  }
`;
