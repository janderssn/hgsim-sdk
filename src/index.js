/**
 * hgsim: a hang-glider simulation SDK. Plain ES modules with no dependencies; metres, seconds, radians; x east, y up, z north.
 *
 * hgsim simulates air vehicles: the hang glider (createHangGlider, a round), with paragliders to follow. Each is a vehicle
 * (docs/vehicles.md), stepped at a fixed tick (createSimulationLoop) and drawn from its pose (lerpPose, applyPose); hgsim/ground
 * adds the vehicles on the ground (createWalker) on the same world.
 *
 * The flight's core is three things:
 * - createWorld: the ground, the wind and the air's rise (thermals, ridge lift, your own lift sources).
 * - createGlider: one glider in a world: its flight state, its config and the model that steps it, from the launch run
 *   (glider.launch) through the flight (glider.step) to the ground (glider.contact, glider.land).
 * - Flight models: forceModel (the default) and classicModel; any object with the same shape is one too. Presets (PRESETS)
 *   are named wings for the force model, from a 1970s Rogallo to a topless competition wing; glider.polar() charts any of them.
 *
 * Around it, each usable on its own: launch.js (the run), landing.js (judging and scoring touchdowns, approach helpers),
 * tumble.js (a crash as a rigid body), wind.js (live, gusting wind), recorder.js (recording flights), config.js.
 * Three.js presentation (the pilot's body, landing cues) is in hgsim/three. Types: types/index.d.ts (the package's "types").
 */
/** The SDK's version (semver), as in package.json: the CHANGELOG says what each one changed. */
export const VERSION = '0.4.0';
export { createWorld, AIR_DEFAULTS, MATERIALS } from './world.js';
export { createGlider } from './glider.js';
export { PRESETS, getPreset, defineWing, wingConfig, handlingFor, vgConfig, TRAITS } from './presets.js';
export { polarOf, pitchStabilityOf } from './polar.js';
export { defineConfig, overridesOf } from './config.js';
export { forceModel, GLIDER_DEFAULTS, performance, createFlightState, stepFlight } from './flight.js';
export { classicModel, CLASSIC_DEFAULTS } from './models/classic.js';
export { LAUNCH_DEFAULTS, windOnRun, runProfile, shoulderPivot } from './launch.js';
export { LANDING_RULES, judgeTouchdown, scoreLanding, measureFlareZone, ZONE_LOW, ZONE_HIGH, pullOutHeights, dropToImpact } from './landing.js';
export { sweepFlightContact, canRollOnWheels, advanceWheelRoll } from './contact.js';
export { createTumble, stepTumble } from './tumble.js';
export { createWind, describeWind, compassName, directionFromBearing, bearingFromDirection } from './wind.js';
export { createFlightRecorder, FLIGHT_FIELDS, SAMPLE_PERIOD } from './recorder.js';
export { createRound, createHangGlider, createTakeoffBar, takeoffPitch, ROUND_EVENTS } from './round.js';
export { terrainSite, SITE_DEFAULTS } from './sites.js';
export { createEmitter } from './events.js';
export { makePose, poseFromQuaternion, quaternionFrom, anglesOf, lerpPose, createPoseTrack, applyPose } from './pose.js';
export { createSimulationLoop } from './loop.js';
export { SCENARIOS, SITES, getScenario, startScenario, runScenario, flyScenario, scenarioWind, launchPilot, landingPilot } from './scenarios.js';
export { bankedClearance, SKIM_CLEARANCE } from './assists/skim-pose.js';
