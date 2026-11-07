import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolateMotion } from '../range/motion.js';

const previous = { x: 0, y: 50, z: -20, heading: 0, pitch: -.2, bank: -.4, visualBank: -.3 };
const current = { x: 10, y: 60, z: 0, heading: .4, pitch: .2, bank: .4, visualBank: .5 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);

test('positions and drawing angles interpolate between snapshots with clamped endpoints', () => {
  assert.deepEqual(interpolateMotion(previous, current, -1), previous);
  assert.deepEqual(interpolateMotion(previous, current, 2), current);
  const middle = interpolateMotion(previous, current, .5);
  assert.equal(middle.x, 5);
  assert.equal(middle.y, 55);
  assert.equal(middle.z, -10);
  near(middle.heading, .2);
  near(middle.pitch, 0);
  near(middle.bank, 0);
  near(middle.visualBank, .1);
});

test('heading crosses the ±pi boundary over the shortest arc in either direction', () => {
  const before = { ...previous, heading: Math.PI - .1 };
  const after = { ...current, heading: -Math.PI + .1 };
  near(interpolateMotion(before, after, .5).heading, Math.PI);
  near(interpolateMotion(after, before, .5).heading, -Math.PI);
  near(interpolateMotion(before, after, .25).heading, Math.PI - .05);
});

test('interpolation leaves physics snapshots unchanged and can reuse an output object', () => {
  const before = Object.freeze({ ...previous }), after = Object.freeze({ ...current });
  const out = {};
  assert.equal(interpolateMotion(before, after, .25, out), out);
  assert.equal(out.x, 2.5);
  assert.equal(interpolateMotion(before, after, .75, out), out);
  assert.equal(out.x, 7.5);
  assert.deepEqual(before, previous);
  assert.deepEqual(after, current);
});
