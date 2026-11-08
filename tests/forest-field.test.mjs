import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { createForestField, createForestCoverageTexture } from '../range/forest-field.js';

test('woodland clearance, deterministic placement and actual canopy coverage agree', () => {
  const options = { minX: -260, minZ: -700, size: 540, spacing: 10.5,
    groundHeight: (x, z) => 100 + x * .01 + z * .02,
    ecologyAt: (x, z) => ({ rock: x < -200 ? 1 : 0, path: z < -665 ? 1 : 0 }) };
  const field = createForestField(options), repeat = createForestField(options);
  assert.deepEqual(field.pixels, repeat.pixels);
  assert.deepEqual(field.trees, repeat.trees);
  assert.ok(field.trees.length > 300);
  for (const tree of field.trees) {
    assert.ok(tree.x >= -200 && tree.z >= -665, 'rock and trail exclude planting');
    assert.equal(tree.y, options.groundHeight(tree.x, tree.z) - .08);
    assert.ok(!(tree.z > -635 && tree.z < 70 && Math.abs(tree.x) < 30), 'launch and approach stay clear');
    assert.ok(Math.hypot(tree.x, tree.z) > 115, 'landing meadow remains open');
    assert.ok(field.coverageAt(tree.x, tree.z) > .4, 'every actual crown contributes to its shared coverage');
  }
  assert.equal(field.coverageAt(-10000, 0), 0);
  assert.equal(field.coverageAt(0, -560), 0);
  assert.equal(new Set(field.cells.flatMap(cell => cell.trees)).size, field.trees.length);
  const texture = createForestCoverageTexture(THREE, field);
  assert.equal(texture.image.data, field.pixels);
  assert.equal(texture.flipY, false);
  texture.dispose();
});
