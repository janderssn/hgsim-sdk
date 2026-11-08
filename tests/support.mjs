// Test support: steps the force model through a plain environment object, as the physics tests describe their worlds:
// { terrainHeight(x, z), skimHeight(x, z), wind, thermals, thermalCeiling, thermalFadeStart, terrainSkimming, skimClearance }.
import { createWorld, stepFlight, GLIDER_DEFAULTS } from '../src/index.js';

const worlds = new WeakMap();
export function worldOf(env = {}) {
  let world = worlds.get(env);
  if (!world) {
    world = createWorld({ terrain: env.terrainHeight ?? (() => 0), surface: env.skimHeight ?? null, wind: () => env.wind ?? { x: 0, z: 0 },
      thermals: env.thermals ?? [], air: { ...(env.thermalCeiling && { thermalCeiling: env.thermalCeiling }), ...(env.thermalFadeStart && { thermalFadeStart: env.thermalFadeStart }) } });
    worlds.set(env, world);
  }
  return world;
}
/** stepFlight with an environment object; input.ground is the SDK's input.field. */
export function stepSoaring(state, input = {}, dt, env = {}, cfg = GLIDER_DEFAULTS) {
  return stepFlight(state, { ...input, field: input.ground }, dt, worldOf(env), cfg, env.terrainSkimming ? { clearance: env.skimClearance } : null);
}
export const sampleAir = (x, y, z, env = {}) => worldOf(env).airAt(x, y, z);
