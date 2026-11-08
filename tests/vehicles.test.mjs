// The shared core for every vehicle (docs/vehicles.md): the world's queries, poses, launch sites from the world, the walker, and the
// hang glider (a round) under the same contract.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWorld, createWalker, createHangGlider, terrainSite, MATERIALS, makePose, lerpPose, createPoseTrack, applyPose, anglesOf,
  quaternionFrom, createSimulationLoop, SITES,
} from '../src/index.js';

const walk = (world, input, seconds = 4, at = {}) => {
  const walker = createWalker({ world, at }), events = [];
  walker.on(e => events.push(e));
  for (let i = 0; i < seconds * 60; i++) walker.step(1 / 60, input);
  return { walker, events, s: walker.state() };
};

test('the world answers every vehicle: ground, platforms, slope, normal, material, water, solids and bounds', () => {
  const world = createWorld({
    terrain: (x, z) => 0.5 * z, platform: (x, z) => (Math.abs(x) < 2 ? 10 : null), material: (x, z) => (x > 50 ? 'ice' : x > 20 ? { grip: 0.9 } : 'snow'),
    water: (x, z) => (z < -10 ? 0 : null), solid: (x, y, z) => (Math.hypot(x - 30, z) < 3 && y < 8 ? 'hut' : null), bounds: (x, z, m) => Math.abs(x) < 1000 - m,
  });
  assert.equal(world.groundAt(0, 0), 10, 'a platform above the terrain');
  assert.equal(world.groundAt(5, 4), 2, 'the terrain elsewhere'); assert.equal(world.heightAt(0, 0), 0);
  assert.ok(Math.abs(world.slopeAt(5, 4) - 0.5) < 1e-9);
  const n = world.normalAt(5, 4); assert.ok(Math.abs(Math.hypot(n.x, n.y, n.z) - 1) < 1e-9 && n.z < 0 && n.y > 0.8);
  assert.equal(world.materialAt(0, 0), MATERIALS.snow); assert.equal(world.materialAt(60, 0).name, 'ice'); assert.equal(world.materialAt(30, 0).grip, 0.9);
  assert.equal(world.waterAt(0, -20), 0); assert.equal(world.waterAt(0, 0), null);
  assert.equal(world.solidAt(30, 1, 0), 'hut'); assert.equal(world.solidAt(30, 9, 0), null);
  assert.ok(world.inBounds(0, 0) && !world.inBounds(990, 0, 20));
  const bare = createWorld();
  assert.equal(bare.materialAt(0, 0), MATERIALS.grass); assert.equal(bare.waterAt(0, 0), null); assert.equal(bare.solidAt(0, 0, 0), null); assert.ok(bare.inBounds(1e9, 0));
  assert.throws(() => createWorld({ water: 3 }), /water must be a function/);
});

test('poses: one orientation, readable angles, drawn between ticks along the short way round', () => {
  const p = makePose({ x: 1, y: 2, z: 3, heading: 0.7, pitch: 0.3, roll: -0.4 });
  const back = anglesOf(p.q);
  for (const k of ['heading', 'pitch', 'roll']) assert.ok(Math.abs(back[k] - p[k]) < 1e-9, k);
  const mid = lerpPose(makePose({ heading: 3 }), makePose({ heading: -3, x: 10 }), 0.5);
  assert.equal(mid.x, 5); assert.ok(Math.abs(Math.abs(mid.heading) - Math.PI) < 1e-6, 'across the wrap, not through north');
  const track = createPoseTrack(), now = makePose({ x: 10 });
  assert.equal(track.at(0.5, now).x, 10, 'nothing before: the current pose');
  track.push(makePose({ x: 0 })); assert.equal(track.at(0.25, now).x, 2.5);
  const object = { position: { set(...a) { this.v = a; } }, quaternion: { set(...a) { this.v = a; } } };
  applyPose(p, object); assert.deepEqual(object.position.v, [1, 2, 3]); assert.deepEqual(object.quaternion.v, p.q);
  // The same convention as the tumble and the range's drawing: three.js 'YXZ', and pitch + raises the nose (+z forward goes up).
  const q = quaternionFrom(0, 0.5, 0), up = 2 * (q[1] * q[2] - q[3] * q[0]);
  assert.ok(up > 0.4, `pitch + raises the nose (${up})`);
});

test('a launch site read from the world: the fall along the run and the edge ahead', () => {
  const world = createWorld({ terrain: (x, z) => (z < 0 ? 100 : z < 30 ? 100 - 0.35 * z : Math.max(0, 89.5 - 30 * (z - 30))), water: (x, z) => (z < -200 ? 150 : null) });
  const site = terrainSite(world, { x: 0, z: -5, heading: 0 });
  assert.equal(site.fall(0, -5, 0), 0); assert.ok(Math.abs(site.fall(0, 10, 0) - 0.35) < 1e-9);
  assert.equal(site.edgeAhead(0, -5, 0), 35, 'the cliff 35 m ahead');
  assert.equal(site.edgeAhead(0, 10, Math.PI), Infinity, 'open ground the other way, within the look');
  assert.ok(site.edgeAhead(0, -150, Math.PI) <= 50, 'water is an edge');
});

test('the walker: the ground sets the pace, water, solids and walls stop it, ledges are falls', () => {
  const flat = walk(createWorld(), { forward: 1 }), sprint = walk(createWorld(), { forward: 1, sprint: true });
  assert.ok(flat.walker.speed > 4 && flat.walker.speed < 4.6 && flat.s.phase === 'run', `${flat.walker.speed} ${flat.s.phase}`);
  assert.ok(sprint.walker.speed > flat.walker.speed * 1.4 && sprint.s.phase === 'sprint');
  assert.ok(walk(createWorld({ terrain: (x, z) => 0.3 * z }), { forward: 1 }).walker.speed < flat.walker.speed * 0.65, 'uphill is slower');
  assert.ok(walk(createWorld({ material: () => 'snow' }), { forward: 1 }).walker.speed < flat.walker.speed * 0.85, 'snow is slower');
  for (const [why, world] of [['water', createWorld({ water: (x, z) => (z > 5 ? 1 : null) })], ['solid', createWorld({ solid: (x, y, z) => (z > 5 && z < 6 ? 'hut' : null) })],
    ['slope', createWorld({ terrain: (x, z) => (z > 5 ? (z - 5) * 2 : 0) })], ['slope', createWorld({ platform: (x, z) => (z > 5 ? 1.5 : null) })], ['bounds', createWorld({ bounds: (x, z) => z < 5 })]]) {
    const r = walk(world, { forward: 1 });
    assert.ok(r.s.z <= 5.001 && r.s.z > 4.8, `${why}: stopped at the edge (${r.s.z})`);
    assert.deepEqual(r.events.map(e => e.type + ':' + e.by), [`blocked:${why}`], `${why}: one event while pressing on`);
  }
  assert.equal(walk(createWorld({ platform: (x, z) => (z > 5 ? 0.4 : null) }), { forward: 1 }).s.y, 0.4, 'a step up onto a deck');
  const cliff = walk(createWorld({ terrain: (x, z) => (z > 5 ? -20 : 0) }), { forward: 1 });
  assert.deepEqual(cliff.events.map(e => e.type), ['airborne', 'crash']); assert.ok(cliff.events[1].impact > 15 && cliff.s.phase === 'down');
  const ledge = walk(createWorld({ terrain: (x, z) => (z > 5 ? -1.5 : 0) }), { forward: 1 });
  assert.deepEqual(ledge.events.map(e => e.type), ['airborne', 'touchdown'], 'a short drop is landed on');
  assert.ok(walk(createWorld({ terrain: (x, z) => -0.3 * z, material: () => 'ice' }), {}).walker.speed > 3, 'ice slides down a slope');
  assert.ok(walk(createWorld({ terrain: (x, z) => -0.3 * z }), {}).walker.speed < 0.01, 'grass holds the feet');
  const turned = walk(createWorld(), { face: Math.PI / 2 }, 2);
  assert.ok(Math.abs(turned.s.heading - Math.PI / 2) < 1e-9, 'turns to face a heading');
  const w = createWalker({ world: createWorld() }); w.step(1 / 60, { forward: 1 });
  const saved = w.state(); for (let i = 0; i < 30; i++) w.step(1 / 60, { forward: 1, turn: 0.5 });
  const end = w.state(); w.restore(saved); for (let i = 0; i < 30; i++) w.step(1 / 60, { forward: 1, turn: 0.5 });
  assert.deepEqual(w.state(), end, 'state() restores exactly');
  assert.throws(() => w.step(NaN), RangeError); assert.throws(() => w.on('landed', () => {}), /unknown event/);
  assert.throws(() => createWalker({}), /world must come from createWorld/);
  assert.throws(() => createWalker({ world: createWorld(), config: { runSped: 3 } }), /unknown key "runSped"/);
});

test('the hang glider is a vehicle like the walker: pose, velocity, airborne, and crashes that say what and how hard', () => {
  const world = createWorld({ terrain: SITES.ramp.terrain, wind: { x: 0, z: -4 } });
  const hg = createHangGlider({ world, preset: 'falcon-170', realistic: false });
  assert.equal(hg.kind, 'hang-glider'); assert.equal(hg.glider.preset.id, 'falcon-170');
  const types = []; hg.on(e => types.push(e.type));
  hg.standAt(SITES.ramp).launch();
  const onRun = hg.pose(); assert.ok(onRun.q.length === 4 && Number.isFinite(onRun.y) && !hg.airborne);
  for (let i = 0; i < 60 * 15 && !hg.airborne; i++) hg.step(1 / 60);
  assert.ok(hg.airborne && types.includes('airborne'));
  const v = hg.velocity(), s = hg.glider.state;
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - (s.airspeed * Math.cos(s.pathAngle) - 4)) < 1, 'over the ground: airspeed less the headwind');
  const p = hg.pose(); assert.equal(p.x, s.x); assert.ok(Math.abs(p.pitch - s.pitch) < 1e-9);

  // Into water: a crash of kind 'water', and the wreck settles on the water, not the lake's bed.
  const lake = createWorld({ terrain: () => 0, water: () => 5 });
  const wet = createHangGlider({ world: lake }), crashes = [];
  wet.on('crash', e => crashes.push(e));
  wet.startAt({ x: 0, y: 12, z: 0, heading: 0 });
  for (let i = 0; i < 60 * 30 && wet.phase !== 'crashed'; i++) wet.step(1 / 60, { pitch: -1 });
  assert.equal(crashes[0].kind, 'water'); assert.equal(crashes[0].hit, 'water'); assert.ok(crashes[0].impact >= 9);
  assert.ok(wet.wreck.y > 4, `the wreck floats (${wet.wreck.y})`);

  // Into a building: kind 'solid', named.
  const town = createWorld({ solid: (x, y, z) => (z > 80 && z < 90 && y < 400 ? 'church' : null) });
  const hit = createHangGlider({ world: town }), what = [];
  hit.on('crash', e => what.push(e));
  hit.startAt({ x: 0, y: 300, z: 0, heading: 0 });
  for (let i = 0; i < 60 * 20 && !what.length; i++) hit.step(1 / 60);
  assert.equal(what[0].kind, 'solid'); assert.equal(what[0].hit, 'church');
});

test('a game loop: walk, launch, fly, all on one fixed clock and drawn between ticks', () => {
  const world = createWorld({ terrain: SITES.ramp.terrain, wind: { x: 0, z: -4 } });
  let vehicle = createWalker({ world, at: { x: 0, z: -40 } });
  const track = createPoseTrack(), drawn = [];
  const loop = createSimulationLoop({
    step: dt => { track.push(vehicle.pose()); vehicle.step(dt, vehicle.kind === 'walker' ? { forward: 1 } : {}); },
    render: (_, alpha) => drawn.push(track.at(alpha, vehicle.pose())),
  });
  for (let t = 0; t <= 4000; t += 16.7) loop.frame(t);
  assert.ok(vehicle.state().z > -26, `walked to the ramp (${vehicle.state().z})`);
  // Hand over: the walker's place becomes the launch.
  const at = vehicle.state();
  vehicle = createHangGlider({ world, realistic: false });
  vehicle.standAt(terrainSite(world, { x: at.x, z: at.z, heading: 0 })).launch(); track.clear();
  for (let t = 4000; t <= 20000 && !vehicle.airborne; t += 16.7) loop.frame(t);
  assert.ok(vehicle.airborne, 'flew off the ramp read from the world');
  assert.ok(drawn.every(p => Number.isFinite(p.x) && Number.isFinite(p.q[3])));
});
