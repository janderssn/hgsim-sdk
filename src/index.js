/**
 * hgsim: the hang-glider simulation from Above. Plain ES modules with no dependencies; metres, seconds, radians.
 *
 * - Flight (flight.js): a force model of the wing (lift, drag, ground effect, stall, flare), the air it flies in (wind, thermals,
 *   ridge lift) and the judgement of a touchdown. flight-classic.js is the older, simpler model kept for comparison.
 * - Launch (launch.js): picking the wing up, balancing it, running and leaving the ground in the same flight model, so the run
 *   and the flight are one physics; tumble.js carries a launch or a landing gone wrong on as a rigid body until it stops.
 * - Landing (landing-cues.js): when to round out and flare, and the cues shown for it.
 * - Pilot (pilot-rig.js): the pilot's body for a skinned glider model: hanging, prone and upright, standing under the wing on a
 *   run, the swing into the harness, weight shift and push-out. Takes Three.js as an argument.
 * - Terrain following (terrain-skimming.js, skim-pose.js): the optional assist that keeps a low glider off the ground.
 * - Wind (wind.js) and the flight recorder (flight-recorder.js).
 */
export {
  SOARING_DEFAULTS, tuneSoaring, getSoaringTuning, liftCoefficient, dragCoefficient, groundEffectFactor, stallSpeed, barTargetSpeed,
  sinkPolar, glidePathAngle, createSoaringState, sampleSoaringAir, stepSoaring, judgeTouchdown, scrapeGround, scoreLanding,
} from './flight.js';
export * as classic from './flight-classic.js';
export { LAUNCH, SHOULDERS, createLaunch, stepLaunch, launchPose, shoulderPivot, windOnRun, barForSpeed, barForAlpha, runHold, runProfile } from './launch.js';
export { createTumble, stepTumble, quaternionOf } from './tumble.js';
export { ZONE_LOW, pullOutHeights, dropToImpact, createLandingCues } from './landing-cues.js';
export { createPilotRig, addSailFlutter } from './pilot-rig.js';
export { SKIM_DEFAULTS, skimGuidance } from './terrain-skimming.js';
export { SKIM_CLEARANCE, getSkimClearance, updateSkimPose } from './skim-pose.js';
export { createWind, describeWind, compassName, directionFromBearing, bearingFromDirection } from './wind.js';
export { FLIGHT_FIELDS, SAMPLE_PERIOD, createFlightRecorder } from './flight-recorder.js';
