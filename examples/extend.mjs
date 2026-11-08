// Extending hgsim: a wind that strengthens with height, a lift source of your own (a wave), two gliders tuned differently
// side by side, and a flight model of your own.
// node examples/extend.mjs
import { createWorld, createGlider } from '../src/index.js';

const world = createWorld({
  wind: (x, y, z) => ({ x: 0, z: -(2 + y / 100) }),                    // wind gradient: faster higher up
  lift: [(x, y, z) => 1.5 * Math.exp(-(((z - 600) / 150) ** 2))],      // a band of wave lift 600 m north
});
const stock = createGlider({ world, at: { y: 400 } });
const racer = createGlider({ world, at: { y: 400 }, config: { mass: 130, cd0: 0.022 } });
for (let i = 0; i < 60 * 60; i++) { stock.step(1 / 60); racer.step(1 / 60); }
for (const [name, g] of [['stock', stock], ['racer', racer]])
  console.log(`${name}: ${g.state.z.toFixed(0)} m flown, ${g.state.y.toFixed(0)} m high, best glide ${g.performance.glideRatio(g.performance.trimSpeed()).toFixed(1)}`);
console.log('racer overrides:', JSON.stringify(racer.overrides));

// A model is { name, defaults, createState, step }: here a point mass gliding at a fixed glide ratio.
const pointMass = {
  name: 'point-mass',
  defaults: { speed: 12, glideRatio: 8 },
  createState: (init, cfg) => ({ x: 0, y: 100, z: 0, heading: 0, airspeed: cfg.speed, ...init }),
  step(s, input, dt, w, cfg) {
    const wind = w.windAt(s.x, s.y, s.z), air = w.airAt(s.x, s.y, s.z);
    s.heading += (input.roll || 0) * 0.5 * dt;
    s.x += (Math.sin(s.heading) * cfg.speed + wind.x) * dt; s.z += (Math.cos(s.heading) * cfg.speed + wind.z) * dt;
    s.y += (air.lift - cfg.speed / cfg.glideRatio) * dt;
    return s;
  },
};
const simple = createGlider({ world, model: pointMass, config: { glideRatio: 10 } });
for (let i = 0; i < 600; i++) simple.step(1 / 60, { roll: 0.2 });
console.log(`point mass after 10 s: ${simple.state.y.toFixed(1)} m high, heading ${simple.state.heading.toFixed(2)} rad`);
