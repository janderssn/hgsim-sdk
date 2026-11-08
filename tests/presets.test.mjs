// Glider presets: each flies to its own polar, launches, lands, and handles as its kind of wing should.
import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESETS, getPreset, createGlider, createWorld, GLIDER_DEFAULTS, polarOf, performance, defineConfig } from '../src/index.js';

const ids = Object.keys(PRESETS);
const polarFor = (id, vg = 1) => createGlider({ preset: id }).setVG(vg).polar();   // (rated with the VG on)

test('each preset is calibrated to its reference figures', () => {
  for (const id of ids) {
    const { specs } = getPreset(id), p = polarFor(id);
    assert.ok(Math.abs(p.bestGlide.glideRatio - specs.bestGlide) < 0.4, `${id} best glide ${p.bestGlide.glideRatio}`);
    if (specs.bestGlideLoose) assert.ok(Math.abs(polarFor(id, 0).bestGlide.glideRatio - specs.bestGlideLoose) < 0.4, `${id} best glide with the VG off`);
    assert.ok(Math.abs(p.minSink.sink - specs.minSink) / specs.minSink < 0.12, `${id} min sink ${p.minSink.sink}`);
    assert.ok(Math.abs(p.stallSpeed * 3.6 - specs.stallKmh) < 2.5, `${id} stall ${p.stallSpeed * 3.6}`);
  }
});

test('the eras are in order: each generation glides flatter than the last', () => {
  const ld = id => polarFor(id).bestGlide.glideRatio;
  assert.ok(ld('rogallo-1975') < ld('alpha-235') && ld('alpha-235') < ld('vintage-1985') && ld('vintage-1985') < ld('intermediate') && ld('intermediate') < ld('sport-2') && ld('sport-2') < ld('t2c-144'));
  assert.ok(polarFor('t2c-144').minSink.sink < polarFor('alpha-235').minSink.sink, 'the topless wing sinks least');
  assert.ok(polarFor('t2c-144').speedToFly({ headwind: 5 }).airspeed > polarFor('t2c-144').bestGlide.airspeed, 'into wind, fly faster');
});

test('every preset trims hands off to its polar, launches off a slope and lands softly from a well-timed flare', () => {
  const slope = createWorld({ terrain: (x, z) => (z < 40 ? -0.15 * z : -300), wind: { x: 0, z: -4 } });
  const field = createWorld({ wind: { x: 0, z: -3 } });
  for (const id of ids) {
    const g = createGlider({ preset: id, at: { y: 2000 } });
    for (let i = 0; i < 1800; i++) g.step(1 / 60);
    const p = g.polar();
    assert.ok(Math.abs(g.state.airspeed - p.trimSpeed) < 0.3 && Math.abs(-g.state.verticalSpeed - p.trimSink) < 0.1, `${id} trim`);
    const runner = createGlider({ preset: id, world: slope }), launch = runner.launch({ site: { fall: () => 0.15, edgeAhead: (x, z) => 40 - z } });
    for (let i = 0; i < 1200 && !launch.airborne && !launch.failed; i++) launch.step(1 / 60);
    assert.equal(launch.reason, 'flying', `${id} launches`);
    // (each wing has its own moment to flare: lighter, slower wings a little lower)
    const flareFrom = h => { const lander = createGlider({ preset: id, world: field, at: { y: 25 } }); let on = false;
      for (let i = 0; i < 6000 && !lander.contact(); i++) { if (lander.height() - 2.4 < h) on = true; lander.step(1 / 60, { pitch: on ? 1 : 0, field: lander.height() < 14 }); }
      return lander.land().judged; };
    const judged = [1.5, 2, 2.5, 3, 3.5].map(flareFrom);
    assert.ok(judged.includes('soft') && !judged.includes('crash'), `${id} lands softly from a flare between 1.5 and 3.5 m: ${judged}`);
  }
});

test('handling: the trainer rolls quickest, the Rogallo slowest, the topless wing heavier than the intermediate', () => {
  const quarterTurn = (id, vg = 1) => { const g = createGlider({ preset: id, at: { y: 2000 } }).setVG(vg); let t = 0; while (Math.abs(g.state.heading) < Math.PI / 2) { g.step(1 / 60, { roll: 1 }); t += 1 / 60; } return t; };
  const t = Object.fromEntries(ids.map(id => [id, quarterTurn(id)]));
  assert.ok(t['alpha-235'] < t.intermediate && t.intermediate < t['t2c-144'] && t['t2c-144'] < t['rogallo-1975'], JSON.stringify(t));
  assert.ok(quarterTurn('t2c-144', 0) < t['t2c-144'] - 0.15 && quarterTurn('sport-2', 0) < quarterTurn('sport-2', 1), 'VG off rolls quicker');
});

test('presets are tunable and switchable, and their tuning is relative to the preset', () => {
  const g = createGlider({ preset: 't2c-144', config: { mass: 120 } });
  assert.equal(g.preset.id, 't2c-144'); assert.equal(g.config.span, 10.15); assert.equal(g.config.mass, 120);
  assert.deepEqual(g.overrides, { mass: 120 });
  const before = g.polar().stallSpeed; g.tune({ mass: 90 });
  assert.ok(g.polar().stallSpeed < before, 'the polar follows the tuning');
  g.tune(); assert.equal(g.config.mass, PRESETS['t2c-144'].config.mass, 'tune() restores the preset');
  g.usePreset('rogallo-1975'); assert.equal(g.config.span, 6.5); assert.deepEqual(g.overrides, {});
  g.usePreset(null); assert.equal(g.config, GLIDER_DEFAULTS);
  assert.throws(() => createGlider({ preset: 'nope' }), /unknown glider preset "nope" \(known: rogallo-1975/);
  assert.deepEqual(polarOf(performance(defineConfig(GLIDER_DEFAULTS, PRESETS['alpha-235'].config))).bestGlide, polarFor('alpha-235').bestGlide);
});

test('VG: loose for handling, tight for glide; tuning stays on top of it and the polar follows', () => {
  const g = createGlider({ preset: 't2c-144', config: { mass: 115 } });
  assert.ok(g.hasVG && g.vg === 0);
  const loose = g.polar(); g.setVG(1); const tight = g.polar();
  assert.ok(tight.bestGlide.glideRatio > loose.bestGlide.glideRatio + 1.5 && tight.topSpeed > loose.topSpeed, 'tight glides flatter and goes faster');
  assert.ok(g.config.rollFrequency < PRESETS['t2c-144'].vg.loose.rollFrequency, 'and is heavier in roll');
  assert.equal(g.config.mass, 115, 'the tuning survives the VG');
  g.setVG(0.5); assert.ok(Math.abs(g.config.cd0 - (0.0244 + 0.0195) / 2) < 1e-9, 'half VG blends the sail');
  g.tune({ cd0: 0.03 }); g.setVG(1); assert.equal(g.config.cd0, 0.03, 'a tuned value wins over the VG');
  const plain = createGlider({ preset: 'alpha-235' }); assert.ok(!plain.hasVG); plain.setVG(1); assert.equal(plain.vg, 0);
});
