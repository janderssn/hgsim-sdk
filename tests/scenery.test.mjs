import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { buildScenery } from '../range/scenery.js';
import { terrainHeight, LAUNCH, CLIFF, DECK_BACK, DECK_LIP } from '../range/world.js';

function createScenery() {
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene);
  const terrain = scene.children.find(object => object.geometry?.type === 'PlaneGeometry');
  assert.ok(terrain, 'the terrain is a plane sampled from the world');
  return { scene, scenery, terrain };
}

// Interpolate the actual indexed plane triangles, as the rendered surface does.
function drawnHeight(geometry, x, z) {
  const { width, widthSegments: segments } = geometry.parameters;
  const size = width / segments;
  const column = Math.min(segments - 1, Math.floor((x + width / 2) / size));
  const row = Math.min(segments - 1, Math.floor((z + width / 2) / size));
  const positions = geometry.attributes.position;
  const a = row * (segments + 1) + column;
  const b = a + segments + 1;
  const c = b + 1;
  const d = a + 1;
  const u = (x - positions.getX(a)) / (positions.getX(d) - positions.getX(a));
  const v = (z - positions.getZ(a)) / (positions.getZ(b) - positions.getZ(a));
  return u + v <= 1
    ? positions.getY(a) + (positions.getY(d) - positions.getY(a)) * u + (positions.getY(b) - positions.getY(a)) * v
    : positions.getY(c) + (positions.getY(b) - positions.getY(c)) * (1 - u) + (positions.getY(d) - positions.getY(c)) * (1 - v);
}

test('quality changes only terrain detail and reuses geometry when quality recovers', () => {
  const { scene, scenery, terrain } = createScenery();
  const children = [...scene.children];
  const otherGeometry = children.filter(object => object !== terrain).map(object => object.geometry);
  const material = terrain.material;
  const high = terrain.geometry;
  assert.equal(high.index.count / 3, 115_200);

  scenery.setQuality('medium');
  const medium = terrain.geometry;
  assert.equal(medium.index.count / 3, 51_200);
  scenery.setQuality('low');
  const low = terrain.geometry;
  assert.equal(low.index.count / 3, 18_432);
  scenery.setQuality('high');
  assert.equal(terrain.geometry, high);
  scenery.setQuality('medium');
  assert.equal(terrain.geometry, medium);
  scenery.setQuality('low');
  assert.equal(terrain.geometry, low);
  assert.equal(scenery.setQuality('low'), false);
  assert.equal(scenery.setQuality('unknown'), false);
  assert.equal(terrain.material, material);
  assert.equal(terrain.receiveShadow, true);
  assert.deepEqual(scene.children, children);
  assert.deepEqual(children.filter(object => object !== terrain).map(object => object.geometry), otherGeometry);
});

test('coarse terrain preserves the shared world and critical launch and field surfaces', () => {
  const { scenery, terrain } = createScenery();
  const high = terrain.geometry;
  for (const level of ['medium', 'low']) {
    scenery.setQuality(level);
    const geometry = terrain.geometry;
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 31) {
      assert.ok(Math.abs(positions.getY(index) - terrainHeight(positions.getX(index), positions.getZ(index))) < 1e-4);
    }
    const points = [];
    for (let x = -8; x <= 8; x += 1) {
      for (let z = LAUNCH.z + DECK_BACK - 5; z <= LAUNCH.z + DECK_LIP + 10; z += 1) points.push([x, z]);
    }
    for (let x = -85; x <= 85; x += 5) {
      for (let z = -85; z <= 85; z += 5) points.push([x, z]);
    }
    for (let x = CLIFF.x - 10; x <= CLIFF.x + 10; x += 2) {
      for (let z = CLIFF.z - 10; z <= CLIFF.z + 10; z += 2) points.push([x, z]);
    }
    for (const [x, z] of points) {
      const difference = Math.abs(drawnHeight(geometry, x, z) - drawnHeight(high, x, z));
      assert.ok(difference < 1, `${level} terrain differs by ${difference} m at ${x}, ${z}`);
    }
    assert.equal(drawnHeight(geometry, 0, 0), drawnHeight(high, 0, 0));
    assert.ok(geometry.attributes.color && geometry.attributes.normal);
  }
});

test('grass tiles retain all instances and expose finite bounds for frustum culling', () => {
  const { scene } = createScenery();
  const chunks = scene.children.filter(object => object.isInstancedMesh && object.userData.noShadow);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.reduce((total, chunk) => total + chunk.count, 0), 9000);
  const matrix = new THREE.Matrix4();
  const centre = new THREE.Vector3();
  const positions = new Set();
  for (const chunk of chunks) {
    assert.equal(chunk.geometry, chunks[0].geometry);
    assert.equal(chunk.material, chunks[0].material);
    assert.equal(chunk.frustumCulled, true);
    assert.equal(chunk.boundingBox.isEmpty(), false);
    assert.ok(Number.isFinite(chunk.boundingSphere.radius) && chunk.boundingSphere.radius > 0);
    assert.ok(chunk.boundingBox.max.x - chunk.boundingBox.min.x < 210);
    assert.ok(chunk.boundingBox.max.z - chunk.boundingBox.min.z < 210);
    for (let index = 0; index < chunk.count; index++) {
      chunk.getMatrixAt(index, matrix);
      centre.setFromMatrixPosition(matrix);
      assert.ok(chunk.boundingBox.containsPoint(centre));
      assert.ok(chunk.boundingSphere.containsPoint(centre));
      positions.add(`${centre.x},${centre.z}`);
    }
    assert.equal(chunk.instanceColor.count, chunk.count);
  }
  assert.equal(positions.size, 9000, 'partitioning does not duplicate or discard grass');

  const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
  chunks[0].boundingBox.getCenter(centre);
  camera.position.copy(centre).add(new THREE.Vector3(0, 30, 50));
  camera.lookAt(centre);
  camera.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  assert.equal(frustum.intersectsObject(chunks[0]), true);
  assert.ok(chunks.some(chunk => !frustum.intersectsObject(chunk)));
});

test('detail follows the camera with hysteresis and reuses instance buffers', () => {
  const { scene, scenery } = createScenery();
  const chunks = scene.children.filter(object => object.isInstancedMesh && object.userData.noShadow);
  const buffers = chunks.map(chunk => [chunk.instanceMatrix, chunk.instanceColor, chunk.boundingBox, chunk.boundingSphere]);
  const versions = chunks.map(chunk => [chunk.instanceMatrix.version, chunk.instanceColor.version]);
  const chunk = chunks[0];
  const cameraPosition = chunk.boundingBox.getCenter(new THREE.Vector3());
  scenery.updateDetail(cameraPosition);
  assert.ok(chunks.every(item => item.visible), 'high quality keeps distant grass available');
  scenery.setQuality('low');
  assert.equal(chunk.visible, true);
  assert.ok(chunks.some(item => !item.visible));
  const lowCount = chunks.filter(item => item.visible).length;
  scenery.setQuality('medium');
  assert.ok(chunks.filter(item => item.visible).length > lowCount);
  scenery.setQuality('high');
  assert.ok(chunks.every(item => item.visible));

  scenery.setQuality('low');
  cameraPosition.x = chunk.boundingBox.min.x - 230;
  scenery.updateDetail(cameraPosition);
  assert.equal(chunk.visible, true, 'a visible tile stays on inside the 25 m margin');
  cameraPosition.x = chunk.boundingBox.min.x - 250;
  scenery.updateDetail(cameraPosition);
  assert.equal(chunk.visible, false);
  cameraPosition.x = chunk.boundingBox.min.x - 230;
  scenery.updateDetail(cameraPosition);
  assert.equal(chunk.visible, false, 'a hidden tile stays off until it is within range');
  cameraPosition.x = chunk.boundingBox.min.x - 210;
  scenery.updateDetail(cameraPosition);
  assert.equal(chunk.visible, true);
  assert.deepEqual(chunks.map(item => [item.instanceMatrix, item.instanceColor, item.boundingBox, item.boundingSphere]), buffers);
  assert.deepEqual(chunks.map(item => [item.instanceMatrix.version, item.instanceColor.version]), versions);
});
