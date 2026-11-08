import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOptionalFallback } from '../tools/range-visual-check.mjs';

const cloud = () => ({ blockedUrls: ['http://localhost/range/assets/clouds/shape.bin'],
  warnings: ['Cloud asset fallback: injected network failure'], visuals: { clouds: 'basic' },
  hasAdvancedClouds: false, waterTriangles: 15000 });

test('cloud fallback smoke requires an intercepted request, warning and active basic provider', () => {
  assert.doesNotThrow(() => assertOptionalFallback('clouds', 'shape.bin', cloud()));
  for (const patch of [{ blockedUrls: [] }, { warnings: [] }, { hasAdvancedClouds: true },
    { visuals: { clouds: 'takram-webgl2' } }, { waterTriangles: 0 }])
    assert.throws(() => assertOptionalFallback('clouds', 'shape.bin', { ...cloud(), ...patch }));
  assert.throws(() => assertOptionalFallback('clouds', 'transmittance.bin', cloud()), /not blocked/,
    'an unrelated failure cannot masquerade as the intended fallback');
});

test('lakeside fallback smoke distinguishes missing models from missing lake geometry', () => {
  const lake = { blockedUrls: ['http://localhost/range/assets/lakeside/lakeside.glb'],
    warnings: ['Lakeside model fallback: injected network failure'], visuals: { lakeside: 'fallback' },
    hasLakesideModels: false, waterTriangles: 15000 };
  assert.doesNotThrow(() => assertOptionalFallback('lakeside', 'lakeside.glb', lake));
  for (const patch of [{ hasLakesideModels: true }, { waterTriangles: NaN },
    { warnings: ['Cloud asset fallback: an unrelated fallback'] }])
    assert.throws(() => assertOptionalFallback('lakeside', 'lakeside.glb', { ...lake, ...patch }));
});
