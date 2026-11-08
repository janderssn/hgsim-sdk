// Glider presets: each flies at its own ballpark speeds with the default wing's feel, and the ladder of modern wings (Alpha, Falcon,
// Sport 2, U2, T2C) runs from the easiest to launch, fly and land to the hardest. Judged by flying the tuning scenarios.
import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESETS, getPreset, defineWing, wingConfig, handlingFor, TRAITS, createGlider, GLIDER_DEFAULTS, LAUNCH_DEFAULTS, runScenario, startScenario, SCENARIOS } from '../src/index.js';

const ids = Object.keys(PRESETS), LADDER = ['alpha-235', 'falcon-170', 'sport-2', 'u2-160', 't2c-144'];
const kmh = v => v * 3.6;
const fly = (id, wing, vg = 0) => runScenario(id, { preset: wing, vg });

test('each preset flies at the speeds and glide it was defined with, at both ends of a VG', () => {
  for (const id of ids) {
    const p = getPreset(id);
    if (!p.targets) continue;
    for (const [vg, side] of p.vg ? [[0, p.targets.vg.loose], [1, p.targets.vg.tight]] : [[0, {}]]) {
      const want = { ...p.targets, ...side }, polar = createGlider({ preset: id }).setVG(vg).polar(), name = `${id}${p.vg ? ` VG ${vg ? 'on' : 'off'}` : ''}`;
      for (const [what, got, target] of [['stall', kmh(polar.stallSpeed), want.stall], ['trim', kmh(polar.trimSpeed), want.trim], ['top', kmh(polar.topSpeed), want.top]])
        assert.ok(Math.abs(got - target) < 1, `${name} ${what} ${got.toFixed(1)} km/h, defined ${target}`);
      assert.ok(Math.abs(polar.bestGlide.glideRatio - want.glide) < 0.35, `${name} glide ${polar.bestGlide.glideRatio.toFixed(2)}, defined ${want.glide}`);
    }
  }
});

test('ballpark speeds: the T2C dives to 150 km/h with the VG on, and the eras glide flatter as they go', () => {
  const polar = (id, vg = 0) => createGlider({ preset: id }).setVG(vg).polar();
  assert.ok(Math.abs(kmh(polar('t2c-144', 1).topSpeed) - 150) < 1);
  const glide = id => polar(id, 1).bestGlide.glideRatio;
  const eras = ['rogallo-1975', 'cable-1979', 'vintage-1985', 'performance-1992', 'sport-2', 't2c-144'];
  for (let i = 1; i < eras.length; i++) assert.ok(glide(eras[i]) > glide(eras[i - 1]), `${eras[i]} glides flatter than ${eras[i - 1]}`);
  for (let i = 1; i < LADDER.length; i++) assert.ok(polar(LADDER[i]).stallSpeed >= polar(LADDER[i - 1]).stallSpeed, `${LADDER[i]} stalls no slower than ${LADDER[i - 1]}`);
});

test('a dive held with the bar in keeps going: the speed builds toward the top speed and the path stays steep', () => {
  for (const id of [...LADDER, 'intermediate']) for (const vg of PRESETS[id].vg ? [0, 1] : [0]) {
    const r = fly('dive-hold', id, vg), top = kmh(createGlider({ preset: id }).setVG(vg).polar().topSpeed);
    assert.ok(r.metrics.endKmh > 0.75 * top && r.metrics.steepestDeg < -40, `${id} VG ${vg}: ${JSON.stringify(r.metrics)}, top ${top.toFixed(0)}`);
  }
});

test('the Rogallo luffs: dived, its nose keeps tucking hands off, and only a full push-out brings it back, slowly', () => {
  const D = Math.PI / 180, dive = push => { const run = startScenario('dive-release', { preset: 'rogallo-1975', pilot: 'you' });
    while (!run.done) run.step(1 / 60, { pitch: run.t < 4 ? -1 : push }); return run.result.samples.filter(s => s.t > 4); };
  const handsOff = dive(0), pushed = dive(1), out = pushed.find(s => s.pathAngle > -15 * D);
  assert.ok(handsOff.every(s => s.pathAngle < -25 * D), 'hands off it stays in the dive');
  assert.ok(out && out.t - 4 > 3, 'pushed out hard, it comes back, after seconds: ' + (out && (out.t - 4).toFixed(1)));
  assert.equal(fly('dive-release', 'falcon-170').metrics.settleSeconds !== null, true, 'a modern wing comes back by itself');
});

test('the ladder on launch: a sloppy pilot gets the easy wings off, and the hard ones go over sooner', () => {
  const sloppy = Object.fromEntries(LADDER.map(id => [id, fly('ramp-sloppy', id).outcome]));
  assert.deepEqual(sloppy, { 'alpha-235': 'flying', 'falcon-170': 'flying', 'sport-2': 'flying', 'u2-160': 'wingdrop', 't2c-144': 'wingdrop' });
  const heldFor = id => { const r = runScenario({ ...SCENARIOS.find(s => s.id === 'ramp-hands-off'), id: 'probe', wind: { head: 5, gusts: 1.6 } }, { preset: id }); return r.outcome === 'wingdrop' ? r.at : Infinity; };
  const times = LADDER.map(heldFor);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] <= times[i - 1], `nobody balancing, each harder wing goes over no later: ${times.map(t => t.toFixed?.(1))}`);
  for (const id of LADDER) for (const sc of ['ramp-calm', 'ramp-breeze', 'slope-calm', 'slope-breeze', 'cliff-light']) assert.equal(fly(sc, id).outcome, 'flying', `${id} launches in ${sc} with a good pilot`);
  assert.equal(fly('ramp-nose-high', 't2c-144').outcome !== 'flying', true, 'the nose held high spoils the run');
});

test('the ladder in the air: slower to roll when slow, and a sharper stall that drops a tip', () => {
  const roll = LADDER.map(id => fly('roll-slow', id).metrics.to30Seconds), drop = LADDER.map(id => fly('stall-straight', id).metrics.dropDeg);
  for (let i = 1; i < LADDER.length; i++) assert.ok(roll[i] >= roll[i - 1], `each harder wing rolls no quicker near the stall: ${roll}`);
  assert.ok(drop[4] > 2 * drop[0] && drop[4] > drop[2], `the T2C drops a tip, the Alpha mushes: ${drop}`);
  assert.ok(fly('roll-reversal', 'rogallo-1975').metrics.reversalSeconds > 1.5 * fly('roll-reversal', 'alpha-235').metrics.reversalSeconds, 'the Rogallo is heavy in roll');
});

test('landing: a flare at the cue lands softly on every modern wing; no flare is a whack on all of them', () => {
  for (const id of [...LADDER, 'intermediate']) {
    assert.equal(fly('land-cue', id).outcome, 'soft', `${id} at the cue`);
    assert.notEqual(fly('land-no-flare', id).outcome, 'soft', `${id} unflared`);
  }
});

test('defineWing makes a wing from ballpark numbers and a character', () => {
  const wing = defineWing({ id: 'mine', name: 'Mine', mass: 100, stall: 26, trim: 35, top: 90, glide: 10, aspectRatio: 6, difficulty: 0.3, character: { stall: 0.9 }, launch: { topSpeed: 7 } });
  const g = createGlider({ preset: wing }), p = g.polar();
  assert.ok(Math.abs(kmh(p.stallSpeed) - 26) < 1 && Math.abs(kmh(p.trimSpeed) - 35) < 1 && Math.abs(kmh(p.topSpeed) - 90) < 1 && Math.abs(p.bestGlide.glideRatio - 10) < 0.35);
  assert.equal(g.config.stallBlend, handlingFor({ difficulty: 0.3, stall: 0.9 }).config.stallBlend, 'a trait overrides the difficulty');
  assert.equal(g.launchConfig.topSpeed, 7, 'its launch values reach the launch');
  assert.equal(g.launchConfig.rollTip, handlingFor(0.3).launch.rollTip);
  assert.deepEqual(TRAITS, ['roll', 'stall', 'pitch', 'flare', 'launch']);
  assert.throws(() => wingConfig({ mass: 100, stall: 30, trim: 28, top: 90, glide: 10 }), /stall < trim < top/);
  const easy = handlingFor(0), hard = handlingFor(1);
  assert.ok(easy.config.rollFrequency > hard.config.rollFrequency && easy.launch.rollTip < hard.launch.rollTip && easy.config.stallBlend > hard.config.stallBlend);
});

test('presets are tunable and switchable; the default wing is the force model\'s own', () => {
  const g = createGlider({ preset: 't2c-144', config: { mass: 120 } });
  assert.equal(g.preset.id, 't2c-144'); assert.deepEqual(g.overrides, {});   // (120 kg is the preset's own mass)
  g.tune({ mass: 90 }); assert.deepEqual(g.overrides, { mass: 90 });
  const before = g.polar().stallSpeed; g.tune({ mass: 120 }); assert.ok(g.polar().stallSpeed > before, 'the polar follows the tuning');
  g.tune(); assert.equal(g.config.mass, PRESETS['t2c-144'].config.mass, 'tune() restores the preset');
  g.usePreset('rogallo-1975'); assert.deepEqual(g.overrides, {}); assert.ok(g.config.luffTuck > 0);
  g.usePreset('intermediate'); assert.equal(g.launchConfig, LAUNCH_DEFAULTS);
  g.usePreset(null); assert.equal(g.config, GLIDER_DEFAULTS);
  assert.throws(() => createGlider({ preset: 'nope' }), /unknown glider preset "nope" \(known: rogallo-1975/);
});

test('VG: loose for handling, tight for glide and speed; tuning stays on top and the polar follows', () => {
  const g = createGlider({ preset: 't2c-144' });
  assert.ok(g.hasVG && g.vg === 0);
  const loose = g.polar(); g.setVG(1); const tight = g.polar();
  assert.ok(tight.bestGlide.glideRatio > loose.bestGlide.glideRatio + 1 && tight.topSpeed > loose.topSpeed + 5 && tight.trimSpeed > loose.trimSpeed + 1);
  assert.ok(g.config.rollFrequency < PRESETS['t2c-144'].vg.loose.rollFrequency, 'and is heavier in roll');
  g.tune({ cd0: 0.03 }); g.setVG(0.5); assert.equal(g.config.cd0, 0.03, 'a tuned value wins over the VG');
  const half = createGlider({ preset: 't2c-144' }).setVG(0.5);
  assert.ok(Math.abs(half.config.alphaTrim - (PRESETS['t2c-144'].vg.loose.alphaTrim + PRESETS['t2c-144'].vg.tight.alphaTrim) / 2) < 1e-12, 'half VG blends the sail');
  const plain = createGlider({ preset: 'alpha-235' }); assert.ok(!plain.hasVG); plain.setVG(1); assert.equal(plain.vg, 0);
});

test('the flare zone is measured per wing and per approach speed', () => {
  const g = createGlider({ preset: 't2c-144' }).setVG(1), zone = g.flareZone();
  assert.equal(g.flareZone(), zone, 'measured once per config');
  assert.ok(zone.at(2.5 * g.performance.stallSpeed()) === null && zone.at(0.9 * g.performance.stallSpeed()) === null, 'no zone outside the measured speeds');
  g.tune({ mass: 100 }); assert.notEqual(g.flareZone(), zone, 'measured again after tuning');
  const standard = createGlider({ preset: 'intermediate' }), z = standard.flareZone().at(standard.performance.trimSpeed());
  assert.ok(z.low < 3.3 && z.high > 2.7, 'the default wing\'s hands-off zone overlaps the tested 2.7-3.3 m: ' + JSON.stringify(z));
});

test('scenarios are repeatable, and a "you" run takes your controls', () => {
  const a = runScenario('roll-reversal', { preset: 'u2-160' }), b = runScenario('roll-reversal', { preset: 'u2-160' });
  assert.deepEqual(a.metrics, b.metrics);
  const run = startScenario('trim', { preset: 'falcon-170', pilot: 'you' });
  for (let i = 0; i < 120; i++) run.step(1 / 60, { roll: 1 });
  assert.ok(run.glider.state.bank > 0.5, 'your weight shift banks it');
  assert.throws(() => runScenario('nope'), /unknown scenario "nope"/);
  // Nothing is cut short: a launch that goes wrong plays out as the tumble until the wreck is still.
  const over = runScenario('ramp-sloppy', { preset: 't2c-144' }), wreck = over.samples.filter(s => s.phase === 'tumble');
  assert.equal(over.outcome, 'wingdrop');
  assert.ok(wreck.length > 5 && wreck.at(-1).q.length === 4 && over.metrics.impactMs > 0, 'the wreck is played out to rest');
  for (const sc of SCENARIOS) assert.ok(sc.name && sc.look && ['launch', 'flight', 'landing'].includes(sc.kind), sc.id);
});
