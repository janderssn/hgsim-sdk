/** Pure, stable site clearings shared by forest, surface paint and prop placement. */
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };

export const ALPINE_SITES = Object.freeze([
  Object.freeze({ id: 'launch-staging', x: -30, z: -620, yaw: .87, radiusX: 16, radiusZ: 15,
    footprints: [[0, 0, 3.0, .8], [0, 2.2, 2.2, .9], [-4, -.45, .8, .7], [4.7, 3.7, 1.8, .9]] }),
  Object.freeze({ id: 'landing-refuge', x: -205, z: 122, yaw: -.92, radiusX: 25, radiusZ: 22,
    footprints: [[0, 0, 4.8, 3.3], [-1.5, -8.6, 2.1, 1.5], [5.9, -1.05, .8, 1.2],
      [7.2, 3, 2.2, .8], [-7.6, -3, 1.8, .9], [-5.1, 3.5, 2.3, .8], [-5.5, 1.9, .7, .7]] }),
  Object.freeze({ id: 'meadow-gate', x: 184, z: -42, yaw: .20, radiusX: 12, radiusZ: 9,
    footprints: [[-4.3, 3, 1.7, .7], [-2.8, 0, .3, .3], [2.8, .2, .3, .3]] }),
  Object.freeze({ id: 'woodland-rest', x: -233, z: -646, yaw: -.40, radiusX: 12, radiusZ: 12,
    footprints: [[-1.8, 1.5, 2.1, .8], [2.8, 2.5, 1.7, .8], [-4.2, 2.2, .5, .5]] }),
]);
const TRAILS = [
  [[-8, -665], [-14, -640], [-30, -620], [-10, -604], [-7, -589]],
  [[-145, 88], [-166, 106], [-188, 115], [-205, 122]],
  [[161, -88], [184, -42], [197, -12]],
  [[-242, -682], [-233, -646], [-219, -620]],
];

function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

/** Shared paint/plant masks; these never modify the physical ground. */
export function sampleAlpineSiteGround(x, z) {
  let clearing = 0, path = 0, occupied = 0;
  for (const site of ALPINE_SITES) {
    const distance = Math.hypot((x - site.x) / site.radiusX, (z - site.z) / site.radiusZ);
    clearing = Math.max(clearing, 1 - smooth(.56, 1.14, distance));
    const dx = x - site.x, dz = z - site.z, c = Math.cos(site.yaw), s = Math.sin(site.yaw);
    const lx = c * dx - s * dz, lz = s * dx + c * dz;
    for (const [px, pz, halfX, halfZ] of site.footprints) {
      const outside = Math.hypot(Math.max(0, Math.abs(lx - px) - halfX), Math.max(0, Math.abs(lz - pz) - halfZ));
      occupied = Math.max(occupied, 1 - smooth(0, .5, outside));
    }
  }
  for (const trail of TRAILS) for (let i = 1; i < trail.length; i++) {
    path = Math.max(path, 1 - smooth(1.0, 2.6, segmentDistance(x, z, trail[i - 1], trail[i])));
  }
  // The target and the centre of the final approach remain meadow.
  if (Math.hypot(x, z) < 150) return { clearing: 0, path: 0, occupied: 0 };
  return { clearing, path, occupied };
}

/** Reserve composed human clearings before forest/ground-cover placement. */
export function alpineSiteExclusionAt(x, z) {
  const { clearing, path } = sampleAlpineSiteGround(x, z);
  return Math.max(clearing, path * .85);
}
