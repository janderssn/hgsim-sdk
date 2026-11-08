import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleGroundStyle, GROUND_PALETTE } from '../range/surface-style.js';

test('world pigment is deterministic, bounded and follows wet soil and mowing', () => {
  for (let x = -1500; x <= 1500; x += 91) for (let z = -1500; z <= 1500; z += 137) {
    const style = sampleGroundStyle(x, z, { moisture: .4, canopy: .2, path: .1 });
    assert.deepEqual(style, sampleGroundStyle(x, z, { moisture: .4, canopy: .2, path: .1 }));
    for (const value of [style.dryness, style.mown, style.patch, style.variation, style.wear, ...style.color]) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
    const wet = sampleGroundStyle(x, z, { moisture: .9, canopy: .6 });
    const dry = sampleGroundStyle(x, z, { moisture: .1 });
    assert.ok(wet.dryness <= dry.dryness, 'moist woodland never becomes drier than the same open soil');
  }
  assert.equal(sampleGroundStyle(0, 0).mown, 1);
  assert.equal(sampleGroundStyle(400, 0).mown, 0);
  const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
  const meadow = sampleGroundStyle(420, -230), path = sampleGroundStyle(420, -230, { path: 1 });
  assert.ok(distance(path.color, GROUND_PALETTE.umber) < distance(meadow.color, GROUND_PALETTE.umber));
});
