// Compiled by npm run check:types: the declarations must describe how the SDK is really used (the README's samples), and reject misuse.
import {
  createWorld, createGlider, createRound, createSimulationLoop, defineConfig, defineWing, runScenario, startScenario, SITES,
  GLIDER_DEFAULTS, LANDING_RULES, PRESETS, VERSION, sweepFlightContact, type RoundEvent, type GliderConfig, type LandingScore,
} from 'hgsim';
import { createHangGlider, terrainSite, createPoseTrack, applyPose, MATERIALS, type Vehicle, type Pose } from 'hgsim';
import { createWalker } from 'hgsim/ground';
import { createLandingCues } from 'hgsim/three';

const world = createWorld({ wind: { x: 0, z: -3 }, thermals: [{ x: 0, z: 300, radius: 150, strength: 3 }], lift: [(x, y, z, air) => air.ridgeLift * 0.1] });
const glider = createGlider({ world, preset: 't2c-144', at: { y: 300 } });
glider.setVG(1).tune({ cd0: 0.03 });
const s = glider.step(1 / 60, { roll: 0.2, pitch: -0.1 });
const kmh: number = s.airspeed * 3.6;
const saved = structuredClone(glider.state); glider.reset(saved);
const best = glider.polar()?.bestGlide.glideRatio;
const contact = glider.contact();
if (contact) {
  const score = glider.land({ x: 0, z: 0, radius: 60 }, contact);
  const j: LandingScore['judged'] = score.judged;
  glider.scrape({ ...contact, part: 'wheel', airframeY: s.y });
}
const tire = { x: 0, y: .1, z: 0, clearance: .1, part: 'wheel' } as const;
const hit = sweepFlightContact([tire], [{ ...tire, y: 0, clearance: 0 }], world.heightAt, 1 / 60);
glider.step(1 / 60, { contactClearance: hit?.end.clearance });

const round = createRound({ glider, target: { x: 0, z: 0 } });
round.standAt(SITES.ramp).launch();
const off = round.on('touchdown', e => { const pts: number = e.result.points; });
round.once('airborne', e => { const dropped: boolean = e.dropped; });
round.on('crash', e => { if (e.kind === 'solid') void e.hit; const impact: number = e.impact; void impact; });
round.on((e: RoundEvent) => { if (e.type === 'failed') { const why: 'wingdrop' | 'turned' | 'stumbled' = e.reason; } });
off();
const loop = createSimulationLoop({ step: dt => round.step(dt, { roll: 0, go: true }), render: (dt, alpha) => void alpha });
loop.frame(16.7);

const heavy = defineConfig(GLIDER_DEFAULTS, { mass: 130 });
const m: number = heavy.mass;
const rules = defineConfig(LANDING_RULES, { softTouchdown: { vertical: 3 } });
const wing = defineWing({ id: 'mine', name: 'Mine', mass: 110, stall: 30, trim: 38, top: 90, glide: 11, difficulty: 0.4, wing: { mass: 28, span: 10 } });
const r = runScenario('dive-hold', { preset: wing, vg: 1 });
const top = r.metrics.topKmh;
const run = startScenario('land-cue', { preset: PRESETS['falcon-170'], pilot: 'you' });
run.step(1 / 60, { roll: 0, pitch: 0.4 });
const v: string = VERSION;
declare const THREE: unknown, scene: object;
createLandingCues(THREE, scene, { onFlareCue() {} });

// Vehicles: a walker carries the pilot to a launch, a hang glider takes over there.
const valley = createWorld({ terrain: (x, z) => z * 0.2, material: (x, z) => (z > 100 ? 'snow' : { grip: 0.7 }), water: () => null, solid: () => null });
const walker = createWalker({ world: valley, at: { x: 0, z: 0 }, config: { runSpeed: 14 } });
walker.on('blocked', e => { const by: 'water' | 'solid' | 'slope' | 'drop' | 'bounds' = e.by; void by; });
let active: Vehicle<any, any> = walker;
active.step(1 / 60, { forward: 1, sprint: true });
const here = walker.state();
const hang = createHangGlider({ world: valley, preset: 'falcon-170', realistic: false });
hang.standAt(terrainSite(valley, { x: here.x, z: here.z, heading: here.heading })).launch();
active = hang;
const track = createPoseTrack(); track.push(active.pose());
const drawnPose: Pose = track.at(0.5, active.pose());
declare const mesh: { position: { set(x: number, y: number, z: number): void }; quaternion: { set(x: number, y: number, z: number, w: number): void } };
applyPose(drawnPose, mesh);
const iceGrip: number = MATERIALS.ice.grip; void iceGrip;
// @ts-expect-error the walker is in hgsim/ground, not the air vehicles' entry
import('hgsim').then(m => m.createWalker);

// Misuse the types catch:
// @ts-expect-error the walker has no such event
walker.on('liftoff', () => {});
// @ts-expect-error unknown walker config key
createWalker({ world: valley, config: { runSped: 3 } });
// @ts-expect-error unknown config key
defineConfig(GLIDER_DEFAULTS, { mas: 100 });
// @ts-expect-error unknown event
round.on('liftoff', () => {});
// @ts-expect-error a round needs a glider
createRound({});
// @ts-expect-error configs are frozen
heavy.mass = 1;
export type { GliderConfig };
void [kmh, best, m, rules, top, v];
