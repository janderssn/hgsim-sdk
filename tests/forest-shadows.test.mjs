import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createForestShadowMap } from '../range/forest-shadows.js';

function sample(texture, bounds, x, z) {
  const image = texture.image;
  const column = Math.max(0, Math.min(image.width - 1, Math.floor((x - bounds.minX) / bounds.size * image.width)));
  const row = Math.max(0, Math.min(image.height - 1, Math.floor((z - bounds.minZ) / bounds.size * image.height)));
  return image.data[(row * image.width + column) * 4] / 255;
}

test('baked canopy/contact shading follows actual trees and leaves open ground white', () => {
  const { texture, bounds } = createForestShadowMap(THREE, [{ x: 0, z: 0, size: 1.5 }]);
  assert.equal(texture.image.width, 1024);
  assert.equal(texture.image.height, 1024);
  assert.equal(texture.flipY, false);
  assert.equal(texture.colorSpace, THREE.NoColorSpace);
  assert.ok(sample(texture, bounds, 0, 0) < .9, 'tree roots are anchored');
  assert.ok(sample(texture, bounds, -10, -7) < sample(texture, bounds, 10, 7), 'canopy shadow follows the sun azimuth');
  assert.equal(sample(texture, bounds, 1500, 1500), 1);
  assert.equal(sample(texture, bounds, -1590, -1590), 1);
});

test('overlapping crowns stay soft and bounded rather than multiplying to black', () => {
  const grove = Array.from({ length: 16 }, (_, index) => ({ x: index % 4 * 3, z: Math.floor(index / 4) * 3, size: 1.6 }));
  const { texture, bounds } = createForestShadowMap(THREE, grove);
  assert.ok(sample(texture, bounds, 4, 4) >= .42);
  assert.ok(sample(texture, bounds, 4, 4) < .7);
  const data = texture.image.data;
  for (let index = 0; index < data.length; index += 4) {
    assert.equal(data[index + 3], 255);
    assert.equal(data[index], data[index + 1]);
    assert.equal(data[index], data[index + 2]);
  }
});
