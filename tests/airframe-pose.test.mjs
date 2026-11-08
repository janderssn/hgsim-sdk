import assert from 'node:assert/strict';
import test from 'node:test';
import { getAirframePose } from '../range/airframe-pose.js';
import { createSimulationLoop } from '../src/loop.js';
import { createLaunch, launchPose, shoulderPivot } from '../src/launch.js';
import { createTumble } from '../src/tumble.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const flight = { position: { x: 3, y: 40, z: 8 }, heading: .4, pitch: .1, bank: -.2, visualBank: -.3, ground: 0 };

test('airframe origin follows the flight in high air and lowers the model only near contact', () => {
  assert.deepEqual(getAirframePose(flight), { x: 3, y: 40, z: 8, pitch: -.1, heading: .4, roll: -.3 });
  const nearGround = { ...flight, position: { ...flight.position, y: 2.3 }, lowest: -1.2 };
  close(getAirframePose(nearGround).y, 1.2);
  close(getAirframePose({ ...nearGround, hasRig: false }).y, .65);
  assert.equal(flight.position.y, 40, 'drawing must not move the simulation reference');
});

test('lift-off preserves the launch shoulder pivot and blends continuously into the airborne origin', () => {
  const launch = createLaunch();
  Object.assign(launch, { phase: 'run', k: 1, carry: 1, groundSpeed: 7, tension: .2, roll: .12, yaw: -.06 });
  const held = launchPose(launch, .4);
  const takeoff = { t: 0, ground: 20, lowest0: -held.height, pitch0: held.pitch,
    roll0: held.roll, yaw0: held.yaw, shoulders0: held.shoulders, dropped: false };
  const snapshot = { ...flight, position: { x: 3, y: 22.3, z: 8 }, ground: 0, takeoff };
  const atLiftOff = getAirframePose(snapshot);
  const pivot = shoulderPivot(held.pitch, flight.heading + held.yaw, held.roll, held.shoulders);
  close(atLiftOff.x, 3 + pivot[0]);
  close(atLiftOff.y, 20 + held.height + pivot[1]);
  close(atLiftOff.z, 8 + pivot[2]);
  close(atLiftOff.pitch, held.pitch);
  close(atLiftOff.heading, flight.heading + held.yaw);
  close(atLiftOff.roll, held.roll);

  const justAfter = getAirframePose({ ...snapshot, takeoff: { ...takeoff, t: 1e-6 } });
  assert.ok(Math.hypot(justAfter.x - atLiftOff.x, justAfter.y - atLiftOff.y, justAfter.z - atLiftOff.z) < 1e-6);
  const finished = getAirframePose({ ...snapshot, takeoff: { ...takeoff, t: 8 } });
  const airborne = getAirframePose({ ...snapshot, takeoff: null });
  for (const key of Object.keys(airborne)) close(finished[key], airborne[key]);
});

test('settling a grounded wing levels it while retaining its current heading', () => {
  const settled = getAirframePose({ ...flight, mode: 'landed', settle: 1 });
  close(settled.pitch, -.2);
  close(settled.roll, 0);
  close(settled.heading, flight.heading);
});

test('a collision during catch-up seeds the tumble from current physics, independent of stale rendering', () => {
  const position = { x: 0, y: 30, z: 0 };
  const staleRender = { ...position };
  let body = null, renders = 0;
  const loop = createSimulationLoop({
    step(dt) {
      if (body) return;
      position.z += 18 * dt;
      if (position.z >= 2) {
        const pose = getAirframePose({ ...flight, position, pitch: -.25 });
        body = createTumble({ ...pose, velocity: [0, -2, 18], ground: () => 0 });
      }
    },
    render() { renders++; },
  });
  loop.frame(0);
  assert.equal(loop.frame(250).steps, 15);
  assert.equal(renders, 2, 'all catch-up ticks happen before the second render');
  assert.ok(body);
  close(body.z, position.z);
  close(body.y, position.y);
  assert.ok(body.z - staleRender.z >= 2, 'the crash must not rewind to the last rendered frame');
  assert.deepEqual(staleRender, { x: 0, y: 30, z: 0 });
});
