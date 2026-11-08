// The SDK's own surface: worlds, gliders, configs, models, launches and landings, as a user of hgsim meets them.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWorld, createGlider, defineConfig, overridesOf, GLIDER_DEFAULTS, LANDING_RULES, forceModel, classicModel,
  createWind, stepTumble, bankedClearance,
} from '../src/index.js';

const glideDown = (glider, input = {}, seconds = 120) => {
  for (let i = 0; i < seconds * 60 && !glider.contact(); i++) glider.step(1 / 60, input);
  return glider.contact();
};

test('a glider flies down to the ground and its landing is judged and scored', () => {
  const world = createWorld({ wind: { x: 0, z: -3 } });
  const glider = createGlider({ world, at: { y: 60 } });
  const contact = glideDown(glider);
  assert.ok(contact, 'it reaches the ground');
  assert.ok(contact.groundSpeed > 6 && contact.groundSpeed < 14 && contact.verticalSpeed > 0, JSON.stringify(contact));
  const score = glider.land({ x: 0, z: contact.z, radius: 60 });
  assert.ok(['soft', 'firm', 'rough', 'crash'].includes(score.judged) && score.notes.includes('Into wind'), JSON.stringify(score));
  assert.equal(score.ring, 'bullseye');
  assert.throws(() => createGlider({ world, at: { y: 100 } }).land(), /not on the ground/);
});

test('configs are per glider: tuning one never moves another', () => {
  const world = createWorld();
  const light = createGlider({ world, at: { y: 500 } }), heavy = createGlider({ world, at: { y: 500 }, config: { mass: 140 } });
  assert.ok(heavy.performance.stallSpeed() > light.performance.stallSpeed());
  for (let i = 0; i < 600; i++) { light.step(1 / 60); heavy.step(1 / 60); }
  assert.ok(heavy.state.airspeed > light.state.airspeed + 1, 'the heavier wing flies faster');
  assert.deepEqual(heavy.overrides, { mass: 140 });
  light.tune({ cd0: 0.04 });
  assert.equal(light.config.cd0, 0.04); assert.equal(heavy.config.cd0, GLIDER_DEFAULTS.cd0); assert.equal(GLIDER_DEFAULTS.cd0, 0.028);
  light.tune();
  assert.deepEqual(light.overrides, {});
  assert.ok(Object.isFrozen(light.config));
});

test('config mistakes fail loudly, naming the key', () => {
  assert.throws(() => createGlider({ config: { mas: 100 } }), /unknown key "mas"/);
  assert.throws(() => createGlider({ config: { mass: 'heavy' } }), /mass: expected a finite number/);
  assert.throws(() => createGlider({ rules: { softTouchdown: { vertical: 'x' } } }), /softTouchdown/);
  assert.throws(() => createWorld({ air: { ridgeDecay: 1 } }), /unknown key "ridgeDecay"/);
  const rules = defineConfig(LANDING_RULES, { softTouchdown: { vertical: 3 } });
  assert.deepEqual(rules.softTouchdown, { vertical: 3, ground: LANDING_RULES.softTouchdown.ground }, 'nested values patch in part');
  assert.deepEqual(overridesOf(rules, LANDING_RULES), { softTouchdown: { vertical: 3, ground: 8.6 } });
});

test('the world is extensible: wind as a function, your own lift sources, a surface above the terrain', () => {
  const shear = (x, y) => ({ x: 0, z: -y / 50 });
  const wave = (x, y, z) => (Math.abs(z - 500) < 100 ? 2 : 0);
  const world = createWorld({ wind: shear, lift: [wave], surface: (x, z) => (z > 1000 ? 20 : 0) });
  assert.deepEqual(world.windAt(0, 100, 0), { x: 0, z: -2 });
  const air = world.airAt(0, 300, 500);
  assert.equal(air.extraLift, 2); assert.equal(air.lift, air.thermalLift + air.ridgeLift + 2); assert.equal(air.windZ, -6);
  assert.equal(world.surfaceAt(0, 2000), 20); assert.equal(world.heightAt(0, 2000), 0);
  const inWave = createGlider({ world, at: { y: 300, z: 500 } }), still = createGlider({ at: { y: 300, z: 500 } });
  for (let i = 0; i < 120; i++) { inWave.step(1 / 60); still.step(1 / 60); }
  assert.ok(inWave.state.y > still.state.y + 3, 'the wave lift holds the wing up');
  const live = createWind({ speed: 5, direction: 0, variability: 0, gusts: 0 }), windy = createWorld({ wind: live });
  live.set({ speed: 8 });
  assert.equal(windy.windAt(0, 0, 0).speed, 8, 'a wind object is read live');
});

test('models plug in: classic flies the same world, and any { createState, step } is a model', () => {
  const world = createWorld({ wind: { x: 0, z: -2 } });
  const classic = createGlider({ world, model: classicModel, at: { y: 200 } });
  for (let i = 0; i < 600; i++) classic.step(1 / 60, { pitch: -0.5 });
  assert.ok(classic.state.y < 200 && classic.state.airspeed > 15);
  assert.ok(classic.performance.stallSpeed() > 9);
  const brick = { name: 'brick', defaults: { g: 9.81 }, createState: init => ({ x: 0, y: 0, z: 0, heading: 0, vy: 0, ...init }),
    step(s, input, dt, w, cfg) { s.vy -= cfg.g * dt; s.y += s.vy * dt; return s; } };
  const dropped = createGlider({ world, model: brick, at: { y: 10 }, config: { g: 2 } });
  dropped.step(1);
  assert.equal(dropped.state.vy, -2);
  assert.throws(() => createGlider({ model: { name: 'x' } }), /no "defaults"/);
  assert.equal(forceModel.name, 'force');
});

test('a launch steps the glider\'s own flight state, so the flight just carries on', () => {
  const world = createWorld({ terrain: (x, z) => -0.15 * z, wind: { x: 0, z: -4 } });
  const glider = createGlider({ world, at: { x: 0, z: 0, heading: 0 } });
  const site = { fall: () => 0.15, edgeAhead: (x, z) => 40 - z };
  const launch = glider.launch({ site });
  const phases = new Set();
  for (let i = 0; i < 20 * 60 && !launch.airborne && !launch.failed; i++) { launch.step(1 / 60); phases.add(launch.phase); }
  assert.deepEqual([...phases], ['pickup', 'balance', 'run']);
  assert.ok(launch.airborne && launch.reason === 'flying', 'it flies off the slope');
  assert.equal(launch.state.flight, glider.state, 'one state from the run to the flight');
  assert.ok(glider.state.z > 3 && glider.state.z < 40, 'the run moved the glider down the slope: ' + glider.state.z);
  assert.ok(Math.abs(glider.height() - glider.config.contactHeight) < .05, 'feet on the ground at lift-off');
  const speed = glider.state.airspeed;
  glider.step(1 / 60, { pitch: launch.barHold });
  assert.ok(Math.abs(glider.state.airspeed - speed) < .1, 'nothing jumps at lift-off');
  assert.ok(launch.pose().height > 1);
});

test('a launch gone wrong becomes a tumble that comes to rest', () => {
  const glider = createGlider({ world: createWorld({ wind: { x: 12, z: -1 } }) });   // (a crosswind stronger than the weight shift)
  const launch = glider.launch();
  for (let i = 0; i < 600 && !launch.failed; i++) launch.step(1 / 60);
  assert.equal(launch.failed, 'wingdrop');
  const wreck = launch.tumble();
  for (let i = 0; i < 600 && !wreck.done; i++) stepTumble(wreck, 1 / 60);
  assert.ok(wreck.done && wreck.y < 3);
});

test('the terrain-skimming assist is an option of the glider', () => {
  const world = createWorld({ terrain: () => 0 });
  const skimmer = createGlider({ world, skim: { clearance: bankedClearance }, at: { y: 40, airspeed: 30, pathAngle: 0 } });
  const plain = createGlider({ world, at: { y: 40, airspeed: 30, pathAngle: 0 } });
  for (let i = 0; i < 9 * 60; i++) { skimmer.step(1 / 60, { pitch: -1 }); plain.step(1 / 60, { pitch: -1 }); }
  assert.ok(!skimmer.contact() && skimmer.state.skimAssist > .9, 'held off the ground at about 6.5 m: ' + skimmer.height());
  assert.ok(plain.contact() || plain.height() < 2.3, 'without it a held dive meets the ground');
});

test('scrapes skip a fast, light, level touch off the ground', () => {
  const glider = createGlider({ at: { y: 2.2, airspeed: 40, pathAngle: -0.03 } });
  const contact = glider.contact();
  assert.ok(contact);
  assert.equal(glider.scrape(contact), true);
  assert.ok(glider.state.airspeed < 40 && glider.state.verticalSpeed > 0 && !glider.contact());
});

test('round events: one type, all of them, once, and mistakes named', async () => {
  const { createRound, SITES, ROUND_EVENTS } = await import('../src/index.js');
  const world = createWorld({ terrain: SITES.ramp.terrain, wind: { x: 0, z: -4 } });
  const round = createRound({ glider: createGlider({ world, preset: 'falcon-170' }), realistic: false });
  const all = [], liftoffs = [], launches = [];
  round.on(e => all.push(e.type));
  const off = round.on('airborne', e => liftoffs.push(e.dropped));
  round.once('launch', () => launches.push(1));
  round.standAt(SITES.ramp).launch();
  for (let i = 0; i < 60 * 15 && round.phase === 'launch'; i++) round.step(1 / 60);
  assert.deepEqual(all.slice(0, 2), ['launch', 'airborne']);
  assert.equal(liftoffs.length, 1); assert.equal(typeof liftoffs[0], 'boolean');
  off(); round.standAt(SITES.ramp).launch();
  for (let i = 0; i < 60 * 15 && round.phase === 'launch'; i++) round.step(1 / 60);
  assert.equal(liftoffs.length, 1, 'off() stops listening'); assert.equal(launches.length, 1, 'once() hears one');
  assert.ok(ROUND_EVENTS.includes('touchdown') && Object.isFrozen(ROUND_EVENTS));
  assert.throws(() => round.on('landed', () => {}), /unknown event "landed"/);
  assert.throws(() => round.on('touchdown'), /listener function/);
  assert.throws(() => round.standAt({ start: { x: 0, z: 0 } }), /round.standAt/);
  assert.throws(() => createRound({}), /createRound: glider/);
  assert.throws(() => createRound({ glider: createGlider(), ground: 3 }), /ground must be a function/);
});

test('a time step must be a finite number of seconds; a copied state restores a flight exactly', () => {
  const glider = createGlider({ at: { y: 400 } });
  assert.throws(() => glider.step(NaN), RangeError);
  assert.throws(() => glider.step(-1 / 60), RangeError);
  assert.throws(() => glider.step(Infinity), RangeError);
  glider.step(0);
  for (let i = 0; i < 120; i++) glider.step(1 / 60, { roll: 0.3 });
  const saved = structuredClone(glider.state), after = [];
  for (let i = 0; i < 120; i++) after.push(glider.step(1 / 60, { roll: -0.5, pitch: 0.2 }).y);
  glider.reset(saved);
  for (let i = 0; i < 120; i++) assert.equal(glider.step(1 / 60, { roll: -0.5, pitch: 0.2 }).y, after[i]);
});

test('the version, the exports and the generated config types agree with the code', async () => {
  const { VERSION } = await import('../src/index.js');
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
  assert.ok(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').includes(`## [${VERSION}]`), 'the CHANGELOG has this version');
  assert.deepEqual(Object.keys(pkg.exports), ['.', './three', './ground', './package.json']);
  const { configTypes } = await import('../tools/config-types.mjs');
  assert.equal(readFileSync(new URL('../types/configs.d.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n'),
    configTypes(), 'npm run types:configs');
  // every runtime export is declared
  const missingIn = (declared, module) => Object.keys(module).filter(name => !['const', 'function'].some(kind => declared.includes(`export ${kind} ${name}:`) || declared.includes(`export ${kind} ${name}(`) || declared.includes(`export ${kind} ${name}<`)));
  assert.deepEqual(missingIn(readFileSync(new URL('../types/ground.d.ts', import.meta.url), 'utf8'), await import('../src/ground/index.js')), [], 'hgsim/ground exports without declarations');
  const declared = readFileSync(new URL('../types/index.d.ts', import.meta.url), 'utf8');
  const index = await import('../src/index.js');
  const missing = Object.keys(index).filter(name => !['const', 'function'].some(kind => declared.includes(`export ${kind} ${name}:`) || declared.includes(`export ${kind} ${name}(`) || declared.includes(`export ${kind} ${name}<`)));
  assert.deepEqual(missing, [], 'exports without declarations');
});
