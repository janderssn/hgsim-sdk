import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createCorridorDetails } from '../range/corridor-details.js';

function kit(height = 12, options = {}) {
  const scene = new THREE.Scene(), launch = { x: 300, z: 200 };
  const deckY = z => height + 6 - (z - launch.z) * .22;
  const detail = createCorridorDetails(THREE, scene, { terrainHeight: () => height,
    groundUnder: () => height, launch, deckY, ...options });
  return { scene, detail, launch, deckY };
}

test('launch kit stays below the wing at deck edges and keeps trail furniture behind the run', () => {
  const { scene, detail, launch, deckY } = kit();
  assert.equal(detail.stats.anchors, 6);
  assert.equal(detail.stats.markers, 3);
  assert.ok(detail.stats.draws <= 6 && detail.stats.triangles < 6000, 'small furniture shares bounded opaque batches');
  for (const mesh of scene.children) {
    assert.equal(mesh.userData.decorative, true);
    assert.equal(mesh.material.transparent, false);
    const p = mesh.geometry.attributes.position;
    assert.ok(p.array.every(Number.isFinite));
    assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));
    for (let index = 0; index < p.count; index++) {
      const x = p.getX(index) - launch.x, z = p.getZ(index) - launch.z;
      if (mesh.name.startsWith('LaunchAnchorHardware')) {
        assert.ok(Math.abs(x) > 2.9 && Math.abs(x) < 3.5, 'plates stay along deck edges');
        assert.ok(p.getY(index) < deckY(p.getZ(index)) + .21, 'eyelets remain below the control-frame envelope');
      } else {
        assert.ok(z < -28, 'trail furniture stays behind the run');
        assert.ok(Math.abs(x) > 8, 'trail furniture stays outside the wing span');
      }
    }
  }
  detail.dispose();
});

test('all furnishing heights follow the supplied canonical ground and deck', () => {
  const low = kit(12), high = kit(48);
  assert.equal(low.scene.children.length, high.scene.children.length);
  low.scene.children.forEach((mesh, batch) => {
    const a = mesh.geometry.attributes.position, b = high.scene.children[batch].geometry.attributes.position;
    assert.equal(a.count, b.count);
    for (let index = 0; index < a.count; index++) {
      assert.equal(a.getX(index), b.getX(index));
      assert.equal(a.getZ(index), b.getZ(index));
      assert.ok(Math.abs(b.getY(index) - a.getY(index) - 36) < .00001);
    }
  });
  low.detail.dispose(); high.detail.dispose();
});

test('quality hides small trail decoration and disposal preserves caller materials', () => {
  const timber = new THREE.MeshStandardMaterial(), metal = new THREE.MeshStandardMaterial();
  const { scene, detail } = kit(12, { materials: { timber, metal } });
  const unrelated = new THREE.Group(); scene.add(unrelated);
  let geometryDisposals = 0, callerDisposals = 0;
  const batches = scene.children.filter(mesh => mesh.userData.corridorDetail);
  for (const mesh of batches) mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  for (const material of [timber, metal]) material.addEventListener('dispose', () => callerDisposals++);
  detail.setQuality('low');
  assert.equal(detail.stats.draws, 1, 'only the shared anchor hardware batch remains at low detail');
  detail.setQuality('high');
  assert.equal(detail.stats.draws, batches.length);
  detail.dispose(); detail.dispose();
  assert.equal(geometryDisposals, batches.length);
  assert.equal(callerDisposals, 0);
  assert.deepEqual(scene.children, [unrelated]);
  timber.dispose(); metal.dispose();
});
