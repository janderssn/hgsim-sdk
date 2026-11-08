import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseAlpineHeightfield, sampleAlpineHeight } from '../range/atmosphere.js';

test('Sierra backdrop faces the measured western ridgeline and retains source provenance', () => {
  const terrain = parseAlpineHeightfield(readFileSync(new URL('../range/assets/terrain/sierra-heightfield.bin', import.meta.url)));
  const metadata = JSON.parse(readFileSync(new URL('../range/assets/terrain/sierra-source.json', import.meta.url)));
  assert.deepEqual(terrain.metadata, metadata);
  assert.equal(terrain.width, 513);
  assert.equal(terrain.terrainBounds.width, 14000);
  assert.match(metadata.worldAlignment, /\+Z west/);
  assert.equal(metadata.sourceSha256, '9dac84bde8f0f0920a7351c000b33eba827ab395155f493016179bbb73fb000a');
  assert.match(metadata.sourceDataset, /USGS.*public domain/);
  assert.ok(metadata.nodataSampleFraction > 0 && metadata.nodataSampleFraction < .11);
  assert.ok(sampleAlpineHeight(terrain, 0, 0) > 0 && sampleAlpineHeight(terrain, 0, 0) < 60);
  assert.ok(sampleAlpineHeight(terrain, 0, 6000) > 1400, 'the high alpine ridge is ahead of the flight corridor');
  assert.ok(sampleAlpineHeight(terrain, 0, -6000) < 0, 'the eastern valley recedes behind the launch');
  assert.ok(terrain.heights.every(Number.isFinite));
  assert.equal(terrain.normalBytes.length, 513 * 513 * 4);
});
