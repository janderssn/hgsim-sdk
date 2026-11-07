// An easy launch down a 15% slope into a 4 m/s breeze: pick the wing up, balance it, run, and fly away on the same physics.
// node examples/launch.mjs
import { createLaunch, stepLaunch, windOnRun, stepSoaring } from '../src/index.js';

const air = windOnRun({ x: 0, z: -4 }, 0);   // the wind as the run meets it: headwind and crosswind
const launch = createLaunch();
let t = 0, last = '';
while (!launch.airborne && !launch.failed && t < 20) {
  stepLaunch(launch, 1 / 60, { ...air, slope: .15, edgeAhead: 40 - launch.distance });
  if (launch.phase !== last) { console.log(`${t.toFixed(2)} s  ${launch.phase}`); last = launch.phase; }
  t += 1 / 60;
}
console.log(`${t.toFixed(2)} s  off the ground (${launch.reason}) after ${launch.distance.toFixed(1)} m at ${launch.airspeed.toFixed(1)} m/s airspeed`);
const flight = launch.flight;   // the flight carries on from the very state the run was stepping
for (let i = 0; i < 180; i++) stepSoaring(flight, {}, 1 / 60, { terrainHeight: () => -1e3, wind: { x: 0, z: -4 }, thermals: [] });
console.log(`3 s later: ${(flight.airspeed * 3.6).toFixed(0)} km/h, sinking ${(-flight.verticalSpeed).toFixed(2)} m/s`);
