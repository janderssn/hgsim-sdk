// The golden scenarios against the SDK.
import { createWorld, createGlider, classicModel, defineConfig, GLIDER_DEFAULTS, createFlightState, performance, scoreLanding,
  createTumble, stepTumble, createWind, bankedClearance } from '../../src/index.js';
import { createLaunch, stepLaunch, launchPose } from '../../src/launch.js';

const gliderWith = model => ({ config, init, env }) => {
  const world = createWorld({ terrain: env.terrain, wind: env.wind, thermals: env.thermals || [],
    air: { ...(env.thermalCeiling && { thermalCeiling: env.thermalCeiling }), ...(env.thermalFadeStart && { thermalFadeStart: env.thermalFadeStart }) } });
  const skim = env.terrainSkimming ? (env.skimClearance === 'pose' ? { clearance: bankedClearance } : true) : false;
  const glider = createGlider({ world, model, config, at: init, skim });
  return { get state() { return glider.state; }, step(input, dt) { glider.step(dt, { ...input, field: input.ground }); }, skimPose() {} };
};
const polar = performance();
export const api = {
  glider: gliderWith(undefined),
  classic: gliderWith(classicModel),
  launch({ config }) {
    const cfg = defineConfig(GLIDER_DEFAULTS, config), state = createLaunch(createFlightState({}, cfg));
    return { state, step(c, dt) { stepLaunch(state, dt, c, cfg); }, pose: stride => launchPose(state, stride, cfg) };
  },
  tumble: createTumble, stepTumble, wind: createWind,
  score: (touchdown, target) => scoreLanding(touchdown, target),
  sinkPolar: polar.sink, stallSpeed: polar.stallSpeed, barTargetSpeed: polar.trimSpeed,
};
