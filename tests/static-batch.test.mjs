import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { batchStaticMeshes } from '../range/static-batch.js';

function close(actual, expected, message) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index++) {
    assert.ok(Math.abs(actual[index] - expected[index]) < 2e-5, `${message}: component ${index}`);
  }
}

test('static batching preserves transformed surfaces, UVs and normals without changing source buffers', () => {
  const material = new THREE.MeshStandardMaterial();
  const indexed = new THREE.BoxGeometry(2, .5, 3);
  const nonindexed = new THREE.CylinderGeometry(.2, .3, 4, 6).toNonIndexed();
  for (const geometry of [indexed, nonindexed]) {
    const colors = new Float32Array(geometry.attributes.position.count * 3).fill(.67);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const parent = new THREE.Group();
  parent.position.set(10, 23, -60); parent.rotation.y = .7;
  const plank = new THREE.Mesh(indexed, material), beam = new THREE.Mesh(nonindexed, material);
  plank.position.set(-2, 5, 8); plank.rotation.set(.2, .3, -.1); plank.scale.set(1, 1.3, .8);
  beam.position.set(2, -1, -3); beam.rotation.z = .9; beam.scale.set(1.1, .8, 1.4);
  plank.castShadow = true; beam.receiveShadow = true;
  parent.add(plank, beam); parent.updateMatrixWorld(true);
  const sources = [indexed, nonindexed].map(geometry => ({
    arrays: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attribute]) => [key, attribute.array])),
    values: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attribute]) => [key, attribute.array.slice()])),
    index: geometry.index?.array.slice(),
  }));
  const expected = [plank, beam].map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  let sourceDisposals = 0;
  indexed.addEventListener('dispose', () => sourceDisposals++);
  nonindexed.addEventListener('dispose', () => sourceDisposals++);
  material.addEventListener('dispose', () => sourceDisposals++);
  const [batch] = batchStaticMeshes(THREE, [plank, beam], { name: 'LaunchTimbers' });
  assert.equal(batch.name, 'LaunchTimbers');
  assert.equal(batch.material, material);
  assert.equal(batch.castShadow, true); assert.equal(batch.receiveShadow, true);
  assert.ok(batch.matrix.equals(new THREE.Matrix4()), 'world vertices use an identity output transform');
  assert.equal(batch.geometry.groups.length, 0, 'box face groups collapse to one draw for the single material');
  const expectedBounds = new THREE.Box3();
  let offset = 0;
  for (const geometry of expected) {
    for (const key of ['position', 'normal', 'uv', 'color']) {
      const source = geometry.getAttribute(key), actual = batch.geometry.getAttribute(key);
      close(actual.array.slice(offset * actual.itemSize, (offset + source.count) * actual.itemSize), source.array, key);
    }
    geometry.computeBoundingBox(); expectedBounds.union(geometry.boundingBox);
    offset += geometry.attributes.position.count;
  }
  close(batch.geometry.boundingBox.min.toArray(), expectedBounds.min.toArray(), 'bounds min');
  close(batch.geometry.boundingBox.max.toArray(), expectedBounds.max.toArray(), 'bounds max');
  assert.equal(batch.geometry.index.count, indexed.index.count + nonindexed.attributes.position.count);
  [indexed, nonindexed].forEach((geometry, index) => {
    for (const [key, attribute] of Object.entries(geometry.attributes)) {
      assert.equal(attribute.array, sources[index].arrays[key], 'source allocation is retained');
      assert.deepEqual(attribute.array, sources[index].values[key], 'source vertex values are retained');
    }
    assert.deepEqual(geometry.index?.array, sources[index].index);
  });
  assert.equal(sourceDisposals, 0, 'ownership of caller resources stays with caller');
});

test('shared materials partition many timbers into two colour and two shadow draws', () => {
  const timber = new THREE.MeshStandardMaterial(), darkTimber = timber.clone();
  const geometry = new THREE.BoxGeometry();
  const parts = Array.from({ length: 35 }, (_, index) => {
    const mesh = new THREE.Mesh(geometry, index < 23 ? timber : darkTimber);
    mesh.position.set(index % 5, index * .2, Math.floor(index / 5));
    mesh.castShadow = true;
    return mesh;
  });
  const batches = batchStaticMeshes(THREE, parts);
  assert.equal(batches.length, 2);
  assert.deepEqual(batches.map(batch => batch.material), [timber, darkTimber]);
  assert.deepEqual(batches.map(batch => batch.userData.staticBatch.sourceCount), [23, 12]);
  assert.equal(batches.filter(batch => batch.castShadow).length, 2);
  assert.equal(batches.reduce((sum, batch) => sum + batch.geometry.index.count, 0), geometry.index.count * 35);
  assert.deepEqual(batchStaticMeshes(THREE, []), []);
});

test('mirrored geometry keeps the source front face after baking its world transform', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  mesh.scale.x = -1;
  const [batch] = batchStaticMeshes(THREE, [mesh]);
  assert.deepEqual(Array.from(batch.geometry.index.array), [0, 2, 1]);
  const position = batch.geometry.attributes.position, normal = batch.geometry.attributes.normal;
  const a = new THREE.Vector3().fromBufferAttribute(position, 0);
  const b = new THREE.Vector3().fromBufferAttribute(position, 2);
  const c = new THREE.Vector3().fromBufferAttribute(position, 1);
  assert.ok(b.sub(a).cross(c.sub(a)).normalize().dot(new THREE.Vector3().fromBufferAttribute(normal, 0)) > .999);
  assert.equal(geometry.index, null, 'a source without indices remains unmodified');
});

test('unsupported dynamic or incompatible meshes fail explicitly before touching source resources', () => {
  const material = new THREE.MeshStandardMaterial(), geometry = new THREE.BoxGeometry();
  const mesh = new THREE.Mesh(geometry, material);
  for (const unsupported of [new THREE.InstancedMesh(geometry, material, 1), new THREE.SkinnedMesh(geometry, material),
    new THREE.Mesh(geometry, [material, material])]) {
    assert.throws(() => batchStaticMeshes(THREE, [unsupported]), TypeError);
  }
  const withoutUV = geometry.clone(); withoutUV.deleteAttribute('uv');
  assert.throws(() => batchStaticMeshes(THREE, [mesh, new THREE.Mesh(withoutUV, material)]), /compatible vertex attributes/);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.parent, null);
});
