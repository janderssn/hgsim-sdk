/**
 * Launch sites read from the world: where a hang glider (or a paraglider) can run and where its run ends. A site is what
 * round.standAt and glider.launch take: { start: { x, z, heading }, fall(x, z, heading), edgeAhead(x, z, heading), ground(x, z) }.
 *
 *   round.standAt(terrainSite(world, { x, z, heading }));
 *
 * The run's ground is the world's (groundAt: the terrain, or a ramp's deck above it). The fall is the ground's drop per metre along
 * the run. The edge is where the ground stops carrying the pilot: it drops away steeper than the edge slope (a cliff, the lip of a
 * ramp, the side of its deck), or meets water, a solid thing or the map's edge, within look metres; past look the run is open.
 */
import { defineConfig } from './config.js';
import { finite } from './math.js';

export const SITE_DEFAULTS = Object.freeze({
  /** How far ahead the edge is looked for, m. */
  look: 80,
  /** The step the ground is sampled at along the run, m. */
  step: 0.5,
  /** Ground falling away steeper than this (drop per metre) is an edge. 1.2 is about 50 degrees. */
  edgeSlope: 1.2,
  /** The length the fall is measured over, m. */
  span: 2,
});

export function terrainSite(world, { x = 0, z = 0, heading = 0, ...options } = {}) {
  if (typeof world?.groundAt !== 'function') throw new TypeError('terrainSite: world must come from createWorld()');
  const cfg = defineConfig(SITE_DEFAULTS, options, 'terrainSite');
  if (cfg.step <= 0 || cfg.span <= 0) throw new RangeError('terrainSite: step and span must be positive');
  const ground = (px, pz) => world.groundAt(px, pz);
  const fall = (px, pz, h) => (ground(px, pz) - ground(px + Math.sin(h) * cfg.span, pz + Math.cos(h) * cfg.span)) / cfg.span;
  const edgeAhead = (px, pz, h) => {
    const dx = Math.sin(h), dz = Math.cos(h);
    let prev = ground(px, pz);
    for (let d = cfg.step; d <= cfg.look; d += cfg.step) {
      const qx = px + dx * d, qz = pz + dz * d;
      if (!world.inBounds(qx, qz)) return Math.max(0, d - cfg.step);
      const g = ground(qx, qz), water = world.waterAt(qx, qz);
      if ((prev - g) / cfg.step > cfg.edgeSlope || (water !== null && water > g)
        || world.solidAt(qx, g + 1, qz)) return Math.max(0, d - cfg.step);
      prev = g;
    }
    return Infinity;
  };
  return { start: { x: finite(x), z: finite(z), heading: finite(heading) }, ground, fall, edgeAhead };
}
