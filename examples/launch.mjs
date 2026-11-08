// An easy launch down a 15% slope, which drops away after 40 m, into a 4 m/s breeze: pick the wing up, balance it, run, and fly away on the same physics.
// node examples/launch.mjs
import { createWorld, createGlider } from '../src/index.js';

const world = createWorld({ terrain: (x, z) => (z < 40 ? -0.15 * z : -200), wind: { x: 0, z: -4 } });
const glider = createGlider({ world });
// A launch site: how steeply the ground falls along the run, and how far ahead it ends.
const site = { fall: () => 0.15, edgeAhead: (x, z) => 40 - z };

const launch = glider.launch({ site });
let t = 0, last = '';
while (!launch.airborne && !launch.failed && t < 20) {
  launch.step(1 / 60);
  if (launch.phase !== last) { console.log(`${t.toFixed(2)} s  ${launch.phase}`); last = launch.phase; }
  t += 1 / 60;
}
console.log(`${t.toFixed(2)} s  off the ground (${launch.reason}) after ${launch.state.distance.toFixed(1)} m at ${launch.state.airspeed.toFixed(1)} m/s airspeed`);

// The flight carries on from the very state the run was stepping.
for (let i = 0; i < 300; i++) glider.step(1 / 60, { pitch: i < 60 ? launch.barHold : 0 });
console.log(`5 s later: ${(glider.state.airspeed * 3.6).toFixed(0)} km/h, ${glider.state.z.toFixed(0)} m out, ${glider.height().toFixed(0)} m over the ground`);
