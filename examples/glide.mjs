// A hands-off glide over flat ground in a 3 m/s headwind, stepped offline at 60 Hz until the glider touches down.
// node examples/glide.mjs
import { createSoaringState, stepSoaring, scoreLanding, stallSpeed } from '../src/index.js';

const environment = { terrainHeight: () => 0, wind: { x: 0, z: -3 }, thermals: [] };   // wind: where the air goes (here, toward -z)
const glider = createSoaringState({ x: 0, y: 60, z: 0, heading: 0 });               // heading 0 flies toward +z
let t = 0;
while (glider.y - 2.3 > 0 && t < 120) { stepSoaring(glider, { roll: 0, pitch: 0 }, 1 / 60, environment); t += 1 / 60; }
console.log(`stall ${(stallSpeed(0) * 3.6).toFixed(0)} km/h; glided ${glider.z.toFixed(0)} m in ${t.toFixed(1)} s, ` +
  `${(glider.airspeed * 3.6).toFixed(0)} km/h airspeed, sinking ${(-glider.verticalSpeed).toFixed(2)} m/s at the ground`);
const result = scoreLanding({ verticalSpeed: -glider.verticalSpeed, groundSpeed: glider.groundSpeed ?? glider.airspeed - 3, heading: 0, airspeed: glider.airspeed, wind: environment.wind, flare: { pressed: false } });
console.log('landing hands off:', result.judged, result.notes.join('; '));
