import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { ALPINE_SITES, sampleAlpineSiteGround, alpineSiteExclusionAt, createAlpineSetDressing } from '../range/alpine-set-dressing.js';
import { physicalGroundHeight, sampleTerrainEcology } from '../range/world.js';

test('composed clearings and access trails reserve space while keeping the complete target meadow', () => {
  for (const site of ALPINE_SITES) {
    assert.equal(sampleAlpineSiteGround(site.x, site.z).clearing, 1);
    assert.equal(alpineSiteExclusionAt(site.x, site.z), 1);
  }
  for (let x = -149; x <= 149; x += 11) for (let z = -149; z <= 149; z += 11) {
    if (Math.hypot(x, z) >= 150) continue;
    assert.deepEqual(sampleAlpineSiteGround(x, z), { clearing: 0, path: 0, occupied: 0 });
  }
  for (let x = -290; x <= 230; x += 17) for (let z = -720; z <= 180; z += 19) {
    const masks = sampleAlpineSiteGround(x, z);
    assert.ok(Object.values(masks).every(value => value >= 0 && value <= 1));
    assert.deepEqual(masks, sampleAlpineSiteGround(x, z));
  }
  assert.ok(sampleAlpineSiteGround(-166, 106).path > .95);
  assert.equal(alpineSiteExclusionAt(0, -400), 0, 'the departure corridor remains open');
});

test('original prop kit is grounded, keeps gameplay clearances and has a bounded shared draw budget', () => {
  const scene = new THREE.Scene();
  const kit = createAlpineSetDressing(THREE, scene, { groundHeight: physicalGroundHeight, ecologyAt: sampleTerrainEcology });
  assert.equal(kit.stats.sites, 4);
  assert.ok(kit.stats.mergedDraws + kit.stats.instancedDraws <= 12);
  assert.ok(kit.stats.triangles > 6000 && kit.stats.triangles < 20000);
  assert.ok(kit.stats.stones <= 80);
  for (const placement of kit.placements) {
    assert.equal(placement.y, physicalGroundHeight(placement.x, placement.z));
    assert.ok(!placement.bounds.isEmpty());
    if (placement.id === 'landing-refuge' || placement.id === 'meadow-gate') {
      const closestX = Math.max(placement.bounds.min.x, Math.min(0, placement.bounds.max.x));
      const closestZ = Math.max(placement.bounds.min.z, Math.min(0, placement.bounds.max.z));
      assert.ok(Math.hypot(closestX, closestZ) > 150, 'all human structures stay outside the landing field');
    }
    if (placement.id === 'launch-staging') {
      assert.ok(placement.bounds.max.x < -10, 'gear is outside the full wing/run span');
      assert.ok(placement.bounds.max.z < -590, 'gear remains behind the launch run');
    }
  }
  let meshes = 0;
  kit.group.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(object.geometry.attributes.normal.array.every(Number.isFinite));
    assert.ok(object.geometry.attributes.color);
    assert.ok(object.geometry.boundingBox && !object.geometry.boundingBox.isEmpty());
  });
  assert.equal(meshes, kit.stats.mergedDraws + kit.stats.instancedDraws);
  const positions = kit.placements.map(placement => placement.bounds.clone());
  assert.equal(kit.setQuality('low'), true);
  kit.update(new THREE.Vector3(0, 240, -560), 10, { x: 5, z: 1 });
  for (const [i, placement] of kit.placements.entries()) assert.ok(placement.bounds.equals(positions[i]), 'quality never moves props or contact ground');
  assert.equal(kit.setQuality('medium'), true);
  assert.equal(kit.setQuality('high'), true);
  kit.dispose(); assert.equal(scene.children.length, 0);
});

test('shared materials receive the atmosphere once and kit disposal releases each owned resource once', () => {
  const scene = new THREE.Scene(), installed = new Set();
  const kit = createAlpineSetDressing(THREE, scene, { atmosphere: { installMaterial(material) {
    assert.ok(!installed.has(material)); installed.add(material);
  } } });
  assert.equal(installed.size, 4);
  const geometries = new Set(), materials = new Set(), counts = new Map();
  kit.group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
  for (const resource of [...geometries, ...materials]) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
  kit.dispose(); kit.dispose();
  for (const resource of [...geometries, ...materials]) assert.equal(counts.get(resource), 1);
});
