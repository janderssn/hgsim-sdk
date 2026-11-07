import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderQuality } from '../range/rendering.js';

function setup({ width = 960, height = 540, pixelRatio = 2, maxTextureSize = 8192 } = {}) {
  const calls = { ratios: [], sizes: [], levels: [], disposed: 0 };
  const renderer = {
    capabilities: { maxTextureSize }, shadowMap: {},
    setPixelRatio(value) { calls.ratios.push(value); },
    setSize(...size) { calls.sizes.push(size); },
  };
  const sun = { shadow: {
    mapSize: { x: 512, y: 512, set(x, y) { this.x = x; this.y = y; } },
  } };
  const quality = createRenderQuality({ renderer, sun, width, height, pixelRatio,
    onChange: level => calls.levels.push(level),
  });
  const frames = (count, interval = 1 / 60, active = true) => {
    for (let i = 0; i < count; i++) quality.sample(interval, active);
  };
  return { quality, sun, renderer, calls, frames };
}

test('starts with full detail and leaves healthy frames allocation-free', () => {
  const { quality, sun, calls, frames } = setup();
  assert.equal(quality.level, 'high');
  assert.equal(quality.pixelRatio, 1.5);
  assert.equal(sun.shadow.mapSize.x, 2048);
  frames(600);
  assert.deepEqual(calls.ratios, [1.5]);
  assert.deepEqual(calls.sizes, [[960, 540]]);
  assert.deepEqual(calls.levels, ['high']);
});

test('sustained slow frames reduce work and dispose obsolete shadow targets once', () => {
  const { quality, sun, renderer, calls, frames } = setup();
  sun.shadow.map = { dispose() { calls.disposed++; } };
  sun.shadow.mapPass = { dispose() { calls.disposed++; } };
  frames(24, .1);
  assert.equal(quality.level, 'medium');
  assert.equal(quality.pixelRatio, 1);
  assert.equal(sun.shadow.mapSize.x, 1024);
  assert.equal(calls.disposed, 2);
  assert.equal(sun.shadow.map, null);
  assert.equal(sun.shadow.mapPass, null);
  assert.equal(renderer.shadowMap.needsUpdate, true);
  frames(30, .1);
  assert.equal(quality.level, 'low');
  assert.equal(sun.shadow.mapSize.x, 512);
  frames(100, .1);
  assert.equal(calls.disposed, 2);
  assert.deepEqual(calls.ratios, [1.5, 1, .75]);
  assert.deepEqual(calls.levels, ['high', 'medium', 'low']);
});

test('detail recovers slowly after sustained fast rendering', () => {
  const { quality, frames } = setup();
  frames(50, .1);
  assert.equal(quality.level, 'low');
  frames(180);
  assert.equal(quality.level, 'low', 'three seconds alone must not trigger an upgrade');
  frames(360);
  assert.equal(quality.level, 'medium');
  frames(540);
  assert.equal(quality.level, 'high');
});

test('inactive pages and isolated long tasks do not reduce detail', () => {
  const { quality, frames } = setup();
  frames(60, 1, false);
  assert.equal(quality.level, 'high');
  quality.reset();
  quality.sample(10);
  frames(180);
  assert.equal(quality.level, 'high');
  frames(3, Number.NaN);
  frames(3, -1);
  assert.equal(quality.level, 'high');
});

test('repeated GPU stalls count toward sustained load despite bursts of fast frames', () => {
  const { quality, frames } = setup();
  quality.sample(9);
  assert.equal(quality.level, 'high', 'one shader compilation must not reduce detail');
  frames(37);
  quality.sample(9);
  assert.equal(quality.level, 'medium', 'recurring long stalls must count as slow rendering');
  frames(37);
  quality.sample(9);
  frames(37);
  quality.sample(9);
  assert.equal(quality.level, 'low');
});

test('framebuffer size respects native DPR, pixel budgets and GPU limits', () => {
  const { quality, calls } = setup({ pixelRatio: .5 });
  assert.equal(quality.pixelRatio, .5, 'small headless/native DPR must never be upscaled');
  quality.resize(7680, 4320, 2);
  assert.ok(7680 * 4320 * quality.pixelRatio ** 2 <= 4_000_000 + 1);
  quality.resize(100_000, 10, 2);
  assert.ok(100_000 * quality.pixelRatio <= 8192);
  const count = calls.sizes.length;
  quality.resize(100_000, 10, 2);
  assert.equal(calls.sizes.length, count, 'unchanged viewport must not resize the canvas again');
  assert.deepEqual(calls.levels, ['high'], 'resizes must not notify unchanged quality');
});

test('resize adapts physical resolution and resets stale timing samples', () => {
  const { quality, calls, frames } = setup();
  frames(9, .1);
  quality.resize(1280, 720, 1);
  frames(3, .1);
  assert.equal(quality.level, 'high');
  assert.equal(quality.pixelRatio, 1);
  assert.deepEqual(calls.sizes.at(-1), [1280, 720]);
});
