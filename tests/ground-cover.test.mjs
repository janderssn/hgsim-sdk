import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createGroundCover } from '../range/ground-cover.js';

function meadow(options = {}) {
  const scene = new THREE.Scene();
  const cover = createGroundCover(THREE, scene, { terrainHeight: () => 4, ...options });
  const meshes = scene.children.filter(object => object.userData.groundCover);
  return { scene, cover, meshes };
}

function snapshot(meshes) {
  return meshes.map(mesh => ({
    count: mesh.count,
    matrices: mesh.instanceMatrix.array.slice(0, mesh.count * 16),
    colors: mesh.instanceColor.array.slice(0, mesh.count * 3),
  }));
}

function eachPosition(meshes, callback) {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
  for (const mesh of meshes) for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix);
    position.setFromMatrixPosition(matrix);
    callback(position, mesh);
  }
}

test('a dense meadow uses three bounded shared draws with curved, pointed grass geometry', () => {
  const { cover, meshes } = meadow();
  cover.update(new THREE.Vector3(210, 6, 210), 1);
  assert.equal(meshes.length, 3);
  assert.ok(cover.stats.tufts >= 3500 && cover.stats.tufts <= 5000);
  assert.ok(cover.stats.flowers > 40 && cover.stats.pebbles > 40);
  const grass = meshes[0].geometry;
  assert.equal(grass.index.count / 3, 45, 'nine curved ribbon blades have 45 triangles per tuft');
  assert.ok(grass.attributes.color && grass.attributes.normal);
  assert.ok(grass.boundingBox.max.y < .7, 'grass has a plausible meadow scale');
  for (const mesh of meshes) {
    assert.ok(mesh.count <= mesh.userData.capacity);
    assert.equal(mesh.instanceColor.count, mesh.userData.capacity);
    assert.equal(mesh.material.transparent, false, 'opaque geometry avoids alpha sorting and foliage overdraw');
    assert.equal(mesh.castShadow, false, 'detail stays within its three colour draws');
    assert.equal(mesh.boundingSphere.isEmpty(), false);
    assert.ok(Number.isFinite(mesh.boundingSphere.radius));
  }
  eachPosition(meshes, position => assert.equal(position.y, 4, 'placement uses the supplied physical terrain'));
  cover.dispose();
});

test('world anchoring survives camera movement and return visits without reallocating buffers', () => {
  const { cover, meshes } = meadow();
  const camera = new THREE.Vector3(210.2, 6, 210.3);
  cover.update(camera, 1);
  const original = snapshot(meshes);
  const buffers = meshes.map(mesh => [mesh.instanceMatrix, mesh.instanceColor, mesh.instanceMatrix.array, mesh.instanceColor.array]);
  const versions = meshes.map(mesh => [mesh.instanceMatrix.version, mesh.instanceColor.version]);
  camera.x += 3; camera.z += 2;
  cover.update(camera, 2);
  assert.deepEqual(snapshot(meshes), original, 'moving inside a six metre cell never reshuffles blades');
  assert.deepEqual(meshes.map(mesh => [mesh.instanceMatrix.version, mesh.instanceColor.version]), versions,
    'stationary-cell updates send no new instance buffers');

  cover.update(new THREE.Vector3(-305, 6, 175), 3);
  cover.update(new THREE.Vector3(210.2, 6, 210.3), 4);
  assert.deepEqual(snapshot(meshes), original, 'returning to a cell recreates exactly the same meadow');
  for (let index = 0; index < meshes.length; index++) {
    assert.deepEqual([meshes[index].instanceMatrix, meshes[index].instanceColor,
      meshes[index].instanceMatrix.array, meshes[index].instanceColor.array], buffers[index]);
  }
  cover.dispose();
});

test('neighbouring streaming cells keep the positions of shared world tufts', () => {
  const { cover, meshes } = meadow();
  cover.update(new THREE.Vector3(210.2, 6, 210.2));
  const positions = new Set();
  eachPosition([meshes[0]], position => {
    if (Math.hypot(position.x - 216, position.z - 213) < 18) positions.add(`${position.x},${position.z}`);
  });
  cover.update(new THREE.Vector3(216.2, 6, 210.2));
  let shared = 0;
  eachPosition([meshes[0]], position => { if (positions.has(`${position.x},${position.z}`)) shared++; });
  assert.equal(shared, positions.size, 'streaming moves the envelope, not the world-anchored blades');
  cover.dispose();
});

test('bullseye, elevated platforms, exposed rocks and steep terrain remain free of detail', () => {
  const terrainHeight = (x, z) => x > 205 ? (x - 205) * .8 : 0;
  const groundUnder = (x, z) => x > 180 && x < 190 && z > 180 && z < 230 ? 3 : terrainHeight(x, z);
  const rockTop = (x, z) => x > 193 && x < 198 && z > 190 && z < 225 ? 5 : -Infinity;
  const { cover, meshes } = meadow({ terrainHeight, groundUnder, rockTop });
  cover.update(new THREE.Vector3(192, 2, 208));
  assert.ok(cover.stats.tufts > 500, 'ordinary meadow around exclusions still receives detail');
  eachPosition(meshes, position => {
    assert.ok(!(position.x > 180 && position.x < 190 && position.z > 180 && position.z < 230), 'no grass on timber platforms');
    assert.ok(!(position.x > 193 && position.x < 198 && position.z > 190 && position.z < 225), 'no grass inside rocks');
    const measuredSlope = (terrainHeight(position.x + .75, position.z) - terrainHeight(position.x - .75, position.z)) / 1.5;
    assert.ok(measuredSlope <= .5 + 1e-5, 'steep faces do not grow upright meadow tufts');
  });
  cover.update(new THREE.Vector3(61, 2, 0));
  eachPosition(meshes, position => assert.ok(Math.hypot(position.x, position.z) >= 66 - 1e-5));
  cover.update(new THREE.Vector3(0, 2, 0));
  assert.ok(meshes.every(mesh => mesh.count === 0), 'the landing target stays entirely clear');
  cover.dispose();
});

test('altitude suppresses invisible detail, restores cached buffers and allows quality changes aloft', () => {
  const { cover, meshes } = meadow();
  const position = new THREE.Vector3(210, 5, 210);
  cover.update(position, 2);
  const original = snapshot(meshes);
  const versions = meshes.map(mesh => mesh.instanceMatrix.version);
  position.y = 65;
  cover.update(position, 3);
  assert.equal(cover.stats.active, false);
  assert.ok(meshes.every(mesh => !mesh.visible));
  cover.update(new THREE.Vector3(450, 100, -700), 4);
  assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.version), versions, 'flying above the cover does not stream unused cells');
  position.y = 5;
  cover.update(position, 5);
  assert.deepEqual(snapshot(meshes), original);
  assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.version), versions, 'restoration within a cached cell needs no upload');
  assert.ok(meshes.every(mesh => mesh.visible));
  position.y = 100;
  cover.update(position, 6);
  cover.setQuality('low');
  assert.ok(meshes.every(mesh => !mesh.visible));
  position.y = 5;
  cover.update(position, 7);
  assert.ok(cover.stats.tufts > 200 && cover.stats.tufts <= 750);
  assert.equal(cover.stats.radius, 15);
  cover.dispose();
});

test('all quality levels reuse fixed capacity, shrink at the edge in the GPU and own only their resources', () => {
  const supplied = new THREE.MeshStandardMaterial();
  const { cover, meshes, scene } = meadow({ materials: { grass: supplied } });
  const unrelated = new THREE.Group(); scene.add(unrelated);
  const buffers = meshes.map(mesh => mesh.instanceMatrix);
  for (const quality of ['low', 'medium', 'high', 'medium']) {
    cover.setQuality(quality);
    cover.update(new THREE.Vector3(-220, 7, 180), 12);
    assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix), buffers);
    const limits = { low: [750, 24, 30], medium: [2400, 80, 80], high: [5000, 150, 150] }[quality];
    meshes.forEach((mesh, index) => assert.ok(mesh.count > 0 && mesh.count <= limits[index]));
  }
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>' };
  meshes[0].material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.coverTime.value, 12);
  assert.equal(shader.uniforms.coverRadius.value, 25);
  assert.ok(shader.vertexShader.includes('smoothstep(coverRadius - 5.0'));
  cover.update(new THREE.Vector3(-219, 7, 181), 20);
  assert.equal(shader.uniforms.coverTime.value, 20, 'wind uniforms update without rebuilding geometry');
  assert.deepEqual(shader.uniforms.coverCamera.value.toArray(), [-219, 181]);
  assert.notEqual(meshes[0].material, supplied, 'caller materials are cloned before adding shaders');
  let ownDisposals = 0, suppliedDisposals = 0;
  for (const mesh of meshes) {
    mesh.geometry.addEventListener('dispose', () => ownDisposals++);
    mesh.material.addEventListener('dispose', () => ownDisposals++);
  }
  supplied.addEventListener('dispose', () => suppliedDisposals++);
  cover.dispose(); cover.dispose();
  assert.equal(ownDisposals, 6);
  assert.equal(suppliedDisposals, 0);
  assert.deepEqual(scene.children, [unrelated]);
  supplied.dispose();
});
