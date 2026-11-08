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
  assert.ok(sampleAlpineSiteGround(-42, -304).path > .95);
  assert.equal(alpineSiteExclusionAt(0, -400), 0, 'the departure corridor remains open');
});

test('original prop kit is grounded, keeps gameplay clearances and has a bounded shared draw budget', () => {
  const scene = new THREE.Scene();
  const kit = createAlpineSetDressing(THREE, scene, { groundHeight: physicalGroundHeight, ecologyAt: sampleTerrainEcology });
  assert.equal(kit.stats.sites, 4);
  assert.ok(kit.stats.mergedDraws + kit.stats.instancedDraws <= 12);
  assert.ok(kit.stats.triangles > 6000 && kit.stats.triangles < 42000);
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

test('trail boards show a shared original contour map and release its texture once', async () => {
  const { createAlpineRouteMap } = await import('../range/alpine-route-map.js');
  const flat = createAlpineRouteMap(THREE, () => 0, ALPINE_SITES);
  const relief = createAlpineRouteMap(THREE, (x,z) => 160 + x * .3 + Math.sin(z / 60) * 35, ALPINE_SITES);
  assert.equal(flat.image.width, 384);
  assert.equal(flat.image.height, 256);
  assert.notDeepEqual(flat.image.data, relief.image.data, 'contours actually reflect the physical ground source');
  assert.ok(relief.image.data.filter((_,i) => i % 4 === 3).every(alpha => alpha === 255));
  const kit = createAlpineSetDressing(THREE, new THREE.Scene());
  const maps = new Set();
  let boards = 0;
  kit.group.traverse(object => {
    if (object.material?.userData.routeMap) maps.add(object.material.userData.routeMap);
    if (object.geometry?.attributes.storyFinish?.array.includes(4)) boards++;
  });
  assert.equal(maps.size, 1, 'all route boards share one texture and material');
  assert.equal(boards, 4, 'each composed site retains its contour board after static batching');
  for (const placement of kit.placements) {
    const siteGroup = kit.group.children.find(child => child.name === `AlpineSite:${placement.id}`);
    siteGroup.traverse(object => {
      const finish = object.geometry?.attributes.storyFinish;
      if (!finish) return;
      const p = object.geometry.attributes.position, uv = object.geometry.attributes.uv, vertices = [];
      for (let i=0; i<finish.count; i++) if (finish.getX(i) === 4) vertices.push({
        x: Math.cos(placement.yaw) * (p.getX(i)-placement.x) - Math.sin(placement.yaw) * (p.getZ(i)-placement.z),
        y: p.getY(i), u: uv.getX(i), v: uv.getY(i),
      });
      if (!vertices.length) return;
      const xs=vertices.map(vertex=>vertex.x), ys=vertices.map(vertex=>vertex.y);
      const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
      for (const vertex of vertices) {
        assert.ok(Math.abs(vertex.u - (right-vertex.x)/(right-left)) < 1e-4, 'front-facing boards read left to right');
        assert.ok(Math.abs(vertex.v - (vertex.y-bottom)/(top-bottom)) < 1e-4, 'texture up remains world up after batching');
      }
    });
  }
  let releases = 0;
  [...maps][0].addEventListener('dispose', () => releases++);
  kit.dispose(); kit.dispose();
  assert.equal(releases, 1);
  flat.dispose(); relief.dispose();
});
