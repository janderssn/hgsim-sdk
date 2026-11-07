import assert from 'node:assert/strict';
import { runProfile, windOnRun, createLaunch, stepLaunch, launchPose, barForSpeed, runHold } from '../src/launch.js';
import { stepSoaring } from '../src/flight.js';

const stall = 9.7, run = (headwind, crosswind = 0, distance = 60) => runProfile({ headwind, crosswind }, stall, distance);
const still = run(0), breeze = run(4), strong = run(9), tail = run(-3, 0, 200), cross = run(1, 6), slope = runProfile({ headwind: 4 }, stall, 60, .12);
console.log(JSON.stringify({ still: [still.reason, still.lift.toFixed(2), still.groundSpeed.toFixed(1)], breeze: [breeze.reason, breeze.lift.toFixed(2)], slope: [slope.reason, slope.liftDistance?.toFixed(1)], strong: [strong.reason, strong.liftDistance?.toFixed(1)], tail: [tail.reason, tail.lift.toFixed(2)], cross: cross.failed }));

assert.ok(still.reason === 'edge' && still.lift > .1 && still.lift < .6 && still.groundSpeed < 7.5 && still.flight.bar < -.3, 'no wind: nobody runs at flying speed, so the pilot runs off the edge with the wing part flying, pulling in for the dive');
assert.ok(breeze.lift > .9 && (!breeze.lifted || breeze.liftDistance > 8), 'a breeze on the flat: a long run before the wing carries the pilot, if it ever does (nothing but gravity down a slope or a strong wind gets a wing off quickly)');
assert.ok(slope.lifted && slope.liftDistance > 3 && slope.liftDistance < 25, 'the same breeze on a slope: the wing lifts the pilot off after a short run');
assert.ok(strong.lifted && strong.liftDistance < 2, 'a strong headwind: a step or two');
assert.ok(tail.reason === 'edge' && tail.lift < .3, 'a tailwind: the wing never gets near flying');
assert.equal(cross.failed, 'crosswind', 'a strong crosswind spoils the launch');
// Wind is the direction the air moves toward: air moving toward -z meets a run toward +z head on.
const w = windOnRun({ x: 0, z: -5 }, 0); assert.ok(Math.abs(w.headwind - 5) < 1e-9 && Math.abs(w.crosswind) < 1e-9);

// A whole launch: pickup, balance, run, lift-off, with the wing's height and attitude continuous throughout.
const s = createLaunch(), phases = new Set(); let prev = launchPose(s, 0), jump = 0, step = 0;
for (let i = 0; i < 20 * 60 && !s.airborne; i++) {
  stepLaunch(s, 1 / 60, { headwind: 4, slope: .2, edgeAhead: 40, x: 0, y: 100, z: s.distance, heading: 0 }); phases.add(s.phase);
  step += (1 / 60) * Math.PI * 2 * 1.9 * (s.phase === 'run' ? 1 : 0);
  const p = launchPose(s, step); jump = Math.max(jump, Math.abs(p.height - prev.height), Math.abs(p.pitch - prev.pitch) * .5, Math.abs(p.lean - prev.lean) * .2); prev = p;
}
assert.deepEqual([...phases], ['pickup', 'balance', 'run']);
assert.ok(s.airborne && s.reason === 'flying', 'lifted off in a 4 m/s headwind on a slope');
assert.ok(jump < .03, 'no jumps in the wing: biggest frame step ' + jump.toFixed(3));
assert.ok(launchPose(createLaunch(), 0).height < .3 && launchPose(s, 0).height > 1, 'from the bar on the ground to carried on the shoulders');
// One physics: the feet stay planted to the last step, and the flight carries on from the launch's own state, the wing's path
// through the air down the slope it ran on, at the angle of attack the pilot held it at, with nothing changing in the first step.
const off = launchPose(s, 0), f = s.flight, before = { v: f.airspeed, path: f.pathAngle, alpha: f.alpha, bar: f.bar };
assert.ok(off.plant === 1 && Math.abs(off.pathAngle - f.pathAngle) < 1e-9 && off.pathAngle < -.07 && Math.abs(f.alpha - runHold(undefined, undefined, 1).alpha) < .03, 'the lift-off path is the run down the slope, with the nose let up to the lift-off angle: ' + JSON.stringify({ path: off.pathAngle, alpha: f.alpha }));
assert.ok(Math.abs(f.loadFactor - 1) < .03 && f.airspeed > 9.5 && f.airspeed < 11, 'it lifts off with the wing carrying the weight, just above the stall: ' + f.airspeed.toFixed(2));
stepSoaring(f, { pitch: s.barHold }, 1 / 60, { terrainHeight: () => 0 });
assert.ok(Math.abs(f.airspeed - before.v) < .08 && Math.abs(f.pathAngle - before.path) < .01 && Math.abs(f.alpha - before.alpha) < .01 && Math.abs(f.bar - before.bar) < .1, 'the first airborne step changes nothing by more than a step (the bar only starts easing from the lift-off hold to the run hold): ' + JSON.stringify({ dv: f.airspeed - before.v, dpath: f.pathAngle - before.path, dalpha: f.alpha - before.alpha }));
assert.ok(Math.abs(barForSpeed(10.5, b => 13 - 3.3 * b) - (13 - 10.5) / 3.3) < 1e-3, 'the held bar trims to the lift-off speed');
// Rising air carries a wing that has the pilot's weight off a gentler slope, but never a wing that has not got it yet.
const inLift = createLaunch(); inLift.phase = 'run'; inLift.k = 1; let liftedAt = null, offAt = null;
for (let i = 0; i < 3000 && !inLift.airborne; i++) { stepLaunch(inLift, 1 / 60, { headwind: 6, slope: .12, edgeAhead: 300, airLift: 1.5 }); if (inLift.lifted && liftedAt === null) liftedAt = inLift.distance; }
offAt = inLift.distance;
assert.ok(inLift.airborne && inLift.reason === 'flying' && liftedAt !== null && offAt - liftedAt < 1, 'off the gentle slope the moment the wing carries the pilot, in rising air');
const still2 = createLaunch(); still2.phase = 'run'; still2.k = 1; for (let i = 0; i < 3000 && !still2.airborne; i++) stepLaunch(still2, 1 / 60, { headwind: 6, slope: .12, edgeAhead: 300 });
assert.ok(!inLift.airborne || inLift.distance <= still2.distance + .5, 'rising air never puts the lift-off further off: ' + inLift.distance.toFixed(1) + ' m against ' + still2.distance.toFixed(1));
console.log('launch checks passed');

// A cliff: standing at the edge there is no run, a step out and a jump with the bar pulled in, and the same wing dives for its speed.
const cliff = createLaunch(); cliff.phase = 'balance'; cliff.k = 1; cliff.phaseT = 9;
for (let i = 0; i < 600 && !cliff.airborne; i++) stepLaunch(cliff, 1 / 60, { headwind: 3, slope: 0, edgeAhead: 1.2 - cliff.distance });
assert.ok(cliff.airborne && cliff.cliff && cliff.jumped && cliff.reason === 'edge' && cliff.groundSpeed > 2 && cliff.groundSpeed < 4.5, 'off the cliff at a step-out pace: ' + cliff.groundSpeed.toFixed(2));
assert.ok(cliff.flight.verticalSpeed > .5 && cliff.flight.bar < -.3 && cliff.flight.alpha < runHold().alpha - .05, 'the jump goes up and out with the bar in: ' + JSON.stringify({ vs: cliff.flight.verticalSpeed, bar: cliff.flight.bar, alpha: cliff.flight.alpha }));
// A realistic launch is the pilot's: left alone in a crosswind the wing goes over; balanced, run and jumped off, it flies.
const alone = createLaunch(); alone.phase = 'balance'; alone.k = 1;
let warned = null; for (let i = 0; i < 60 * 25 && !alone.failed; i++) { stepLaunch(alone, 1 / 60, { headwind: 3, crosswind: 2, manual: true }); if (alone.warn && warned === null) warned = alone.t; }
assert.ok(alone.failed === 'wingdrop' && alone.t > 4 && warned !== null && alone.t - warned > 1, 'the reflexes hold the small things, but a wing left alone for long warns, then goes over: ' + JSON.stringify({ warned, failedAt: alone.t }));
const answers = createLaunch(); answers.phase = 'balance'; answers.k = 1;
for (let i = 0; i < 60 * 30 && !answers.failed; i++) stepLaunch(answers, 1 / 60, { headwind: 3, crosswind: 2, manual: true, balance: answers.warn || 0 });
assert.ok(!answers.failed, 'a player who answers the warnings holds it level, in a crosswind too');
const mine = createLaunch(); mine.phase = 'balance'; mine.k = 1; let went = 0, jumpedAt = null;
for (let i = 0; i < 1200 && !mine.airborne && !mine.failed; i++) {
  const bal = -clampTest(mine.roll * 3 + mine.rollV * .6, -1, 1), lifting = mine.lift > .8;
  stepLaunch(mine, 1 / 60, { headwind: 3, crosswind: 2, slope: .15, edgeAhead: 60, manual: true, balance: bal, nose: mine.phase !== 'run' ? 0 : mine.lift >= .85 ? (mine.noseCmd < .8 * Math.PI / 180 ? 1 : 0) : (mine.noseCmd > -1.5 * Math.PI / 180 ? -1 : 0), push: 1, go: i > 30, jump: mine.lift > .92 && mine.phaseT > 1 });
  if (mine.phase === 'run' && !went) went = i; if (mine.jumped && jumpedAt === null) jumpedAt = mine.distance;
}
assert.ok(!mine.failed && mine.airborne && mine.reason === 'flying' && went > 30 && jumpedAt !== null, 'balanced, run on go, nose up and jumped off as it lifted: ' + JSON.stringify({ failed: mine.failed, reason: mine.reason, dist: mine.distance, jumpedAt }));
assert.ok(mine.flight.verticalSpeed > -mine.groundSpeed * .15 + .5, 'the jump put energy into the wing: ' + mine.flight.verticalSpeed.toFixed(2));
function clampTest(v, a, b) { return Math.max(a, Math.min(b, v)); }
console.log('realistic launch checks passed');
// The nose on a realistic run: level or a touch down gets off; held high it stalls the sail, so on a slope it never flies (and
// wanders off in yaw), while off a ramp's lip the wing can still dive for its speed.
{ const D = Math.PI / 180, lev = s => -Math.max(-1, Math.min(1, s.roll * 3 + s.rollV * .6));
  const runWith = (off, slope, edge) => { const s = createLaunch(); s.phase = 'run'; s.k = 1; s.noseCmd = off * D;
    for (let i = 0; i < 60 * 15 && !s.airborne && !s.failed; i++) stepLaunch(s, 1 / 60, { headwind: 3, slope, edgeAhead: edge - s.distance, manual: true, push: 1, balance: lev(s), nose: Math.max(-1, Math.min(1, (off * D - s.noseCmd) / (2 * D))) }); return s; };
  const level = runWith(0, .1, 400), low = runWith(-4, .1, 400), high = runWith(2, .1, 400), higher = runWith(6, .1, 400), lip = runWith(3, .2, 22);
  assert.ok(level.reason === 'flying' && low.reason === 'flying' && low.distance > level.distance * 1.5, 'nose too low: it flies, after a much longer run');
  assert.ok(!high.airborne && !high.failed, 'nose high on a slope: it never gets off');
  assert.equal(higher.failed, 'turned', 'nose well past the stall: the wing wanders off and the wind takes it round');
  assert.ok(lip.airborne && lip.distance > 20, 'nose high on a ramp: no lift-off on the deck, only off the lip, pulled in to dive for its speed: ' + JSON.stringify({ failed: lip.failed, reason: lip.reason, at: lip.distance })); }
console.log('nose checks passed');
