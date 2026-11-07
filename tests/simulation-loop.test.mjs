import assert from 'node:assert/strict';
import test from 'node:test';
import { createSimulationLoop } from '../range/simulation-loop.js';

test('one second advances the same 60 simulation ticks at fast and slow render rates', () => {
  for (const fps of [10, 30, 60, 144]) {
    const ticks = [], frames = [];
    const loop = createSimulationLoop({ step: dt => ticks.push(dt), render: (dt, alpha) => frames.push({ dt, alpha }) });
    for (let frame = 0; frame <= fps; frame++) loop.frame(frame * 1000 / fps);
    assert.equal(ticks.length, 60, `${fps} fps`);
    assert.ok(ticks.every(dt => dt === 1 / 60));
    assert.equal(frames.length, fps + 1, 'draw exactly once per frame');
    assert.equal(frames[0].dt, 0, 'first frame initializes the clock');
    assert.ok(frames.every(({ alpha }) => alpha >= 0 && alpha < 1));
  }
});

test('fractional elapsed time is retained until a full tick is available', () => {
  let ticks = 0;
  const loop = createSimulationLoop({ step: () => ticks++, stepSeconds: 0.01 });
  assert.deepEqual(loop.frame(0), { delta: 0, alpha: 0, steps: 0 });
  assert.equal(loop.frame(6).steps, 0);
  assert.equal(loop.frame(12).steps, 1);
  assert.equal(loop.frame(20).steps, 1);
  assert.equal(ticks, 2);
});

test('a long pause caps catch-up work and preserves only the fractional remainder', () => {
  let ticks = 0;
  const loop = createSimulationLoop({ step: () => ticks++ });
  loop.frame(0);
  loop.frame(8);
  const paused = loop.frame(60008);
  assert.equal(paused.steps, 15);
  assert.equal(paused.delta, 0.25);
  assert.ok(Math.abs(paused.alpha - 0.48) < 1e-8);
  assert.equal(loop.frame(60017).steps, 1);
  assert.equal(ticks, 16, 'discard the minute-long backlog');
});

test('reset drops pending time and can anchor the next visible frame explicitly', () => {
  let ticks = 0;
  const loop = createSimulationLoop({ step: () => ticks++, stepSeconds: 0.01 });
  loop.frame(0);
  loop.frame(8);
  loop.reset();
  assert.equal(loop.frame(60000).steps, 0);
  assert.equal(loop.frame(60005).steps, 0, 'fraction before reset was discarded');
  loop.reset(70000);
  assert.equal(loop.frame(70010).steps, 1);
  assert.equal(ticks, 1);
});

test('invalid and backward timestamps neither advance nor corrupt the clock', () => {
  let ticks = 0, renders = 0;
  const loop = createSimulationLoop({ step: () => ticks++, render: () => renders++, stepSeconds: 0.01 });
  loop.frame(NaN);
  loop.frame(100);
  loop.frame(106);
  for (const timestamp of [undefined, Infinity, NaN, 90]) {
    const frame = loop.frame(timestamp);
    assert.equal(frame.delta, 0);
    assert.equal(frame.steps, 0);
  }
  assert.equal(loop.frame(110).steps, 1);
  assert.equal(ticks, 1);
  assert.equal(renders, 8);
});
