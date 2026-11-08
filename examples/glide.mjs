// A hands-off glide over flat ground in a 3 m/s headwind, stepped offline at 60 Hz until the glider touches down.
// node examples/glide.mjs
import { createWorld, createGlider } from '../src/index.js';

const world = createWorld({ terrain: (x, z) => 0, wind: { x: 0, z: -3 } });   // wind: where the air goes (here, toward -z)
const glider = createGlider({ world, at: { x: 0, y: 60, z: 0, heading: 0 } });   // heading 0 flies toward +z

let t = 0;
while (!glider.contact() && t < 120) { glider.step(1 / 60, { roll: 0, pitch: 0 }); t += 1 / 60; }

const { state, performance } = glider, landing = glider.land();
console.log(`stall ${(performance.stallSpeed() * 3.6).toFixed(0)} km/h; glided ${state.z.toFixed(0)} m in ${t.toFixed(1)} s, ` +
  `${(state.airspeed * 3.6).toFixed(0)} km/h airspeed, sinking ${(-state.verticalSpeed).toFixed(2)} m/s at the ground`);
console.log('landing hands off:', landing.judged, landing.notes.join('; '));
