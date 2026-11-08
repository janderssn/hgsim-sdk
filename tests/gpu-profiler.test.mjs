import assert from 'node:assert/strict';
import test from 'node:test';
import { createGPUProfiler } from '../range/gpu-profiler.js';

function fixture({ extension = true } = {}) {
  const ext = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 };
  let sequence = 0, ready = false, disjoint = false;
  const calls = [];
  const gl = {
    QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4,
    getExtension: () => extension ? ext : null,
    createQuery: () => ({ id: sequence++ }),
    beginQuery: (...args) => calls.push(['begin', ...args]),
    endQuery: (...args) => calls.push(['end', ...args]),
    deleteQuery: query => calls.push(['delete', query.id]),
    getParameter: () => disjoint,
    getQueryParameter: (query, parameter) => {
      calls.push(['get', query.id, parameter]);
      return parameter === gl.QUERY_RESULT_AVAILABLE ? ready : 4_250_000;
    },
    isContextLost: () => false,
  };
  return { profiler: createGPUProfiler({ getContext: () => gl }, { maxPending: 2 }), calls,
    ready: value => { ready = value; }, disjoint: value => { disjoint = value; } };
}

test('GPU timing never reads an unavailable result and bounds outstanding queries', () => {
  const { profiler, calls, ready } = fixture();
  assert.equal(profiler.available, true);
  for (let i = 0; i < 2; i++) { assert.equal(profiler.begin(`frame-${i}`), true); profiler.end(); }
  assert.equal(profiler.begin('too many'), false);
  assert.deepEqual(profiler.poll(), []);
  assert.equal(calls.some(call => call[0] === 'get' && call[2] === 4), false);
  ready(true);
  assert.deepEqual(profiler.poll(), [
    { label: 'frame-0', milliseconds: 4.25 }, { label: 'frame-1', milliseconds: 4.25 },
  ]);
  assert.equal(profiler.stats.dropped, 1);
  assert.equal(calls.filter(call => call[0] === 'delete').length, 2);
  profiler.dispose();
});

test('a disjoint clock invalidates all queued results and can resume next frame', () => {
  const { profiler, calls, ready, disjoint } = fixture();
  for (let i = 0; i < 2; i++) { profiler.begin(); profiler.end(); }
  ready(true); disjoint(true);
  assert.deepEqual(profiler.poll(), []);
  assert.equal(profiler.stats.invalidated, 2);
  assert.equal(calls.filter(call => call[0] === 'delete').length, 2);
  disjoint(false);
  assert.equal(profiler.begin('recovered'), true);
  profiler.end();
  assert.equal(profiler.poll()[0].label, 'recovered');
  profiler.dispose();
});

test('missing extensions and disposed profilers are safe no-ops', () => {
  const { profiler, calls } = fixture({ extension: false });
  assert.equal(profiler.available, false);
  assert.match(profiler.reason, /unavailable/);
  assert.equal(profiler.begin(), false);
  assert.equal(profiler.end(), false);
  assert.deepEqual(profiler.poll(), []);
  profiler.dispose(); profiler.dispose();
  assert.deepEqual(calls, []);
});
