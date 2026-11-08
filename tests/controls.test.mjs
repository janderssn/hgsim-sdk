import assert from 'node:assert/strict';
import test from 'node:test';
import { readFlightControls, createTakeoffControls } from '../range/controls.js';
import { createLaunch, stepLaunch, windOnRun } from '../src/launch.js';
import { stepSoaring, sampleSoaringAir } from '../src/flight.js';
import { createWind, directionFromBearing } from '../src/wind.js';
import { LAUNCH, THERMAL, RUN_DIST, DECK_FALL, DECK_BACK, DECK_LIP, deckY, deckLine, terrainHeight } from '../range/world.js';

test('keyboard and gamepad controls combine, cancel, and stay within their range', () => {
  assert.deepEqual(readFlightControls(new Set()), { roll: 0, pitch: 0, nose: 0, push: 0 });
  assert.deepEqual(readFlightControls(new Set(['KeyD', 'ArrowRight', 'KeyS', 'ShiftLeft']), { lx: .5, ly: .9 }),
    { roll: 1, pitch: 1, nose: 1, push: 1 });
  assert.deepEqual(readFlightControls(new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS'])),
    { roll: 0, pitch: 0, nose: 0, push: 0 });
  assert.equal(readFlightControls(new Set(['ArrowUp', 'ArrowLeft'])).pitch, -1);
  assert.equal(readFlightControls(new Set(['ArrowUp', 'ArrowLeft'])).roll, -1);
});

test('triggers affect the airborne bar while the launch nose follows the stick', () => {
  const dive = readFlightControls(new Set(), { rt: 1 });
  assert.equal(dive.pitch, -1);
  assert.equal(dive.nose, 0);
  assert.equal(dive.push, 1);
  assert.equal(readFlightControls(new Set(), { lt: 1 }).pitch, 1);
  assert.deepEqual(readFlightControls(new Set(), { lx: NaN, ly: Infinity, rt: .06 }),
    { roll: 0, pitch: 0, nose: 0, push: 0 });
});

test('releasing an inherited launch key keeps trim until a new flight command', () => {
  const control = createTakeoffControls({ heldPitch: 1, holdBar: .58, realistic: true });
  assert.equal(control.pitch(1), .58);
  assert.equal(control.pitch(1, { age: .5 }), .58);
  assert.equal(control.pitch(0, { age: 1 }), .58);
  assert.equal(control.handed, false);
  assert.equal(control.pitch(0, { age: 3 }), .58);
  assert.equal(control.pitch(1, { age: 3.1 }), 1);
  assert.equal(control.handed, true);
  assert.equal(control.pitch(0), 0);
});

test('a reversed launch input or a fresh flight input takes over immediately', () => {
  const reversed = createTakeoffControls({ heldPitch: .7, holdBar: .58, realistic: true });
  assert.equal(reversed.pitch(-.4), -.4);
  assert.equal(reversed.handed, true);
  const fresh = createTakeoffControls({ holdBar: .58, realistic: true });
  assert.equal(fresh.pitch(.02), .58);
  assert.equal(fresh.pitch(-.2), -.2);
  assert.equal(fresh.pitch(0), 0);
});

test('Easy launches ease their held bar in after two seconds', () => {
  const control = createTakeoffControls({ holdBar: .6 });
  assert.equal(control.pitch(0, { age: 0 }), .6);
  assert.equal(control.pitch(0, { age: 2 }), .6);
  assert.equal(control.pitch(0, { age: 4.5 }), .3);
  assert.equal(control.pitch(0, { age: 7 }), 0);
  assert.equal(control.pitch(.5, { age: 1 }), .5);
  assert.equal(control.pitch(0), 0);
});

test('cliff and Easy edge launches dive for speed while allowing pilot override', () => {
  for (const options of [{ dropped: true }, { dropped: true, cliff: true, realistic: true }]) {
    const control = createTakeoffControls(options);
    assert.equal(control.pitch(0, { airspeed: 5 }), -.3);
    assert.equal(control.pitch(-.7, { airspeed: 5 }), -.7);
    assert.equal(control.pitch(.6, { airspeed: 5 }), .6);
    assert.equal(control.pitch(0, { airspeed: 16 }), 0);
  }
  assert.equal(createTakeoffControls({ dropped: true, realistic: true }).pitch(0, { airspeed: 5 }), 0);
});

/** Fly the browser checker's pilot with the actual world and launch physics. */
function launchFromRamp(dt) {
  const wind = createWind({ speed: 5, direction: directionFromBearing(180) });
  const environment = { terrainHeight, wind, thermals: [THERMAL], thermalCeiling: 1500, thermalFadeStart: 1150 };
  const launch = createLaunch();
  let x = LAUNCH.x, z = LAUNCH.z - RUN_DIST, y = deckY(z) + 2.3, heading = LAUNCH.heading, nose = 0;

  for (let time = 0; time < 30 && !launch.airborne && !launch.failed; time += dt) {
    wind.update(dt);
    const error = launch.roll * 3 + launch.rollV * .6;
    const balance = error > .05 ? -1 : error < -.05 ? 1 : 0;
    const degrees = Math.PI / 180;
    // (S held as the wing takes the whole weight, through the lift-off frame: the input the regression releases)
    nose = launch.phase !== 'run' ? 0 : launch.lift >= .95 ? 1 : launch.lift >= .85
      ? (launch.noseCmd < .8 * degrees ? 1 : 0)
      : (launch.noseCmd > -1.5 * degrees ? -1 : 0);
    const side = Math.sin(heading);
    const toLip = (LAUNCH.z + DECK_LIP - z) / Math.cos(heading);
    const toSide = Math.abs(side) < 1e-3 ? Infinity : ((side > 0 ? 3.4 : -3.4) - x) / side;
    const moved = stepLaunch(launch, dt, {
      ...windOnRun(wind, heading), slope: DECK_FALL, edgeAhead: Math.max(0, Math.min(toLip, toSide)),
      airLift: sampleSoaringAir(x, y, z, environment).lift, x, y, z, heading, manual: true, nose, balance,
      go: launch.phase === 'balance' && launch.phaseT > 2.2,
    });
    x += Math.sin(heading) * moved;
    z += Math.cos(heading) * moved;
    heading += (launch.turnRate || 0) * dt;
    y = deckLine(z) + 2.3;
  }

  assert.equal(launch.failed, null);
  assert.equal(launch.reason, 'flying');
  Object.assign(launch.flight, { x, y, z, heading });
  return { launch, environment, heldPitch: nose };
}

test('a launch input released after lift-off cannot drop the glider back onto the ramp', () => {
  for (const dt of [1 / 60, 1 / 30, 1 / 20]) {
    const { launch, environment, heldPitch } = launchFromRamp(dt);
    if (dt >= 1 / 30) assert.equal(heldPitch, 1, 'regression exercises S held on the lift-off frame');
    const control = createTakeoffControls({ heldPitch, holdBar: launch.barHold, realistic: true });
    const flight = launch.flight;
    for (let time = 0; time < 4; time += dt) {
      if (time) environment.wind.update(dt);
      const pitch = control.pitch(time ? 0 : heldPitch, { age: time, airspeed: flight.airspeed });
      stepSoaring(flight, { roll: 0, pitch }, dt, environment);
      const onDeck = Math.abs(flight.x - LAUNCH.x) < 3.6
        && flight.z > LAUNCH.z + DECK_BACK && flight.z < LAUNCH.z + DECK_LIP;
      if (onDeck) assert.ok(flight.y - 2.3 >= deckY(flight.z) - .3,
        `dt=${dt}, t=${time}: feet should stay above the ramp collision threshold`);
    }
    assert.equal(control.handed, false, 'release preserves launch trim');
  }
});
