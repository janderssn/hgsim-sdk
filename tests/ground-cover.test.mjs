import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createGroundCover } from '../range/ground-cover.js';

function meadow(options = {}) {
  const scene = new THREE.Scene();
  const cover = createGroundCover(THREE, scene, { terrainHeight: () => 4, ...options });
  const meshes = scene.children.filter(object => object.userData.groundCover);
  const distantMesh = meshes.find(mesh => mesh.name === 'MidMeadowFans');
  const nearMeshes = meshes.filter(mesh => mesh !== distantMesh);
  return { scene, cover, meshes, nearMeshes, distantMesh };
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

function assertStreamBounds(meshes) {
  const matrix = new THREE.Matrix4(), instanceBounds = new THREE.Box3(), point = new THREE.Vector3();
  for (const mesh of meshes) {
    if (!mesh.count) continue;
    assert.ok(!mesh.boundingBox.isEmpty() && !mesh.boundingSphere.isEmpty(), `${mesh.name} has populated stream bounds`);
    assert.ok([...mesh.boundingBox.min, ...mesh.boundingBox.max, ...mesh.boundingSphere.center,
      mesh.boundingSphere.radius].every(Number.isFinite), `${mesh.name} bounds are finite`);
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix);
      instanceBounds.makeEmpty();
      let maximumDistance = 0;
      const vertices = mesh.geometry.attributes.position;
      // Transform actual vertices. Rotating a local AABB can invent empty corners
      // outside the plant's swept silhouette and wrongly reject valid bounds.
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        point.fromBufferAttribute(vertices, vertex).applyMatrix4(matrix);
        instanceBounds.expandByPoint(point);
        maximumDistance = Math.max(maximumDistance, point.distanceTo(mesh.boundingSphere.center));
      }
      instanceBounds.expandByScalar(.15);
      assert.ok(mesh.boundingBox.containsBox(instanceBounds), `${mesh.name} bounds contain complete geometry and wind motion`);
      assert.ok(maximumDistance + .15 <= mesh.boundingSphere.radius + .0001,
        `${mesh.name} sphere contains the streamed instance and its wind margin`);
    }
  }
}

test('a dense meadow uses bounded shared draws for expressive grass fans, herbs and seed heads', () => {
  const { cover, meshes, nearMeshes, distantMesh } = meadow();
  cover.update(new THREE.Vector3(210, 6, 210), 1);
  assert.equal(cover.stats.draws, 5, 'unused woodland batches add no meadow draws');
  assert.ok(cover.stats.tufts >= 500 && cover.stats.tufts <= 760);
  assert.ok(cover.stats.flowers > 40 && cover.stats.pebbles > 40);
  assert.ok(cover.stats.seeds > 40);
  assert.ok(cover.stats.triangles < 340000, 'fuller silhouettes and mid-distance strokes retain a bounded triangle budget');
  const grass = meshes[0].geometry;
  assert.equal(grass.index.count / 3, 264, 'six curved spans avoid the old angular blade silhouette');
  assert.ok(grass.attributes.color && grass.attributes.normal);
  assert.ok(grass.boundingBox.max.y < .75, 'grass has a plausible meadow scale');
  assert.ok(grass.boundingBox.max.x - grass.boundingBox.min.x > 1.2, 'clumps have visible spreading mass rather than isolated needles');
  assert.equal(nearMeshes.length, 8);
  assert.ok(distantMesh && distantMesh.frustumCulled, 'mid-distance fans use their refreshed stream bounds for frustum culling');
  for (const mesh of meshes) {
    assert.ok(mesh.count <= mesh.userData.capacity);
    assert.equal(mesh.instanceColor.count, mesh.userData.capacity);
    assert.equal(mesh.material.transparent, false, 'opaque geometry avoids alpha sorting and foliage overdraw');
    assert.equal(mesh.castShadow, false, 'small detail adds no shadow submissions');
    assert.equal(mesh.boundingSphere.isEmpty(), false);
    assert.ok(Number.isFinite(mesh.boundingSphere.radius));
  }
  eachPosition(meshes, position => assert.equal(position.y, 4, 'placement uses the supplied physical terrain'));
  assertStreamBounds(meshes);
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
  assertStreamBounds(meshes);
  cover.update(new THREE.Vector3(210.2, 6, 210.3), 4);
  assertStreamBounds(meshes);
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

test('streaming samples only entering world cells and bounds its cache along long flights', () => {
  let terrainSamples = 0;
  const { cover } = meadow({ terrainHeight: () => { terrainSamples++; return 4; }, forestCoverage: () => .8 });
  cover.update(new THREE.Vector3(210.2, 6, 210.2));
  const firstSamples = terrainSamples, firstBuilds = cover.stats.cellBuilds;
  cover.update(new THREE.Vector3(216.2, 6, 210.2));
  assert.ok(terrainSamples - firstSamples < firstSamples * .2, 'crossing one cell reuses the ecology and transforms of the overlapping disc');
  assert.ok(cover.stats.cellBuilds - firstBuilds < firstBuilds * .2);
  for (let step = 0; step < 12; step++) {
    cover.update(new THREE.Vector3(700 + step * 180, 6, 800 + step * 120));
    assert.ok(cover.stats.cachedCells <= 384, 'memory does not grow with flight distance');
    assert.ok(cover.stats.farCachedCells <= 256, 'mid-distance cells have a separate bounded cache');
  }
  cover.dispose();
  assert.equal(cover.stats.cachedCells, 0);
});

test('bullseye, elevated platforms, exposed rocks and steep terrain remain free of detail', () => {
  const terrainHeight = (x, z) => x > 205 ? (x - 205) * .8 : 0;
  const groundUnder = (x, z) => x > 180 && x < 190 && z > 180 && z < 230 ? 3 : terrainHeight(x, z);
  const rockTop = (x, z) => x > 193 && x < 198 && z > 190 && z < 225 ? 5 : -Infinity;
  const { cover, meshes } = meadow({ terrainHeight, groundUnder, rockTop });
  cover.update(new THREE.Vector3(192, 2, 208));
  assert.ok(cover.stats.tufts > 100, 'ordinary meadow around exclusions still receives detail');
  eachPosition(meshes, position => {
    assert.ok(!(position.x > 180 && position.x < 190 && position.z > 180 && position.z < 230), 'no grass on timber platforms');
    assert.ok(!(position.x > 193 && position.x < 198 && position.z > 190 && position.z < 225), 'no grass inside rocks');
    const measuredSlope = (terrainHeight(position.x + .75, position.z) - terrainHeight(position.x - .75, position.z)) / 1.5;
    assert.ok(measuredSlope <= .5 + 1e-5, 'steep faces do not grow upright meadow tufts');
  });
  cover.update(new THREE.Vector3(61, 2, 0));
  eachPosition(meshes, position => assert.ok(Math.hypot(position.x, position.z) >= 66 - 1e-5));
  cover.update(new THREE.Vector3(0, 2, 0));
  assert.ok(meshes.filter(mesh => mesh.name !== 'MidMeadowFans').every(mesh => mesh.count === 0), 'the landing target stays entirely clear');
  eachPosition(meshes, position => assert.ok(Math.hypot(position.x, position.z) >= 66 - 1e-5));
  cover.dispose();
});

test('terrain ecology keeps the shared trail and exposed-rock masks clear', () => {
  const { cover, meshes } = meadow({ ecologyAt: (x, z) => ({ path: x < 210 ? 1 : 0, rock: z < 210 ? 1 : 0 }) });
  cover.update(new THREE.Vector3(210, 6, 210));
  assert.ok(cover.stats.tufts > 100, 'clear meadow beside the trail still has cover');
  eachPosition(meshes, position => {
    assert.ok(position.x >= 210, 'the visually painted trail has no grass through it');
    assert.ok(position.z >= 210, 'exposed rock has no vegetation');
  });
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
  assert.ok(meshes.every(mesh => mesh.visible === (mesh.count > 0)));
  position.y = 100;
  cover.update(position, 6);
  cover.setQuality('low');
  assert.ok(meshes.every(mesh => !mesh.visible));
  position.y = 5;
  cover.update(position, 7);
  assert.ok(cover.stats.tufts > 50 && cover.stats.tufts <= 100);
  assert.equal(cover.stats.radius, 15);
  cover.dispose();
});

test('all quality levels reuse fixed capacity, shrink at the edge in the GPU and own only their resources', () => {
  const supplied = new THREE.MeshStandardMaterial();
  const { cover, meshes, nearMeshes, distantMesh, scene } = meadow({ materials: { grass: supplied } });
  const unrelated = new THREE.Group(); scene.add(unrelated);
  const buffers = meshes.map(mesh => mesh.instanceMatrix);
  for (const quality of ['low', 'medium', 'high', 'medium']) {
    cover.setQuality(quality);
    cover.update(new THREE.Vector3(-220, 7, 180), 12);
    assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix), buffers);
    const nearLimits = { low: [100, 16, 24, 0, 0, 32, 0, 8], medium: [360, 80, 60, 40, 90, 120, 12, 60],
      high: [760, 180, 120, 80, 180, 240, 24, 120] }[quality];
    assert.equal(nearMeshes.length, nearLimits.length);
    nearMeshes.forEach((mesh, index) => assert.ok(mesh.count >= (index < 3 ? 1 : 0) && mesh.count <= nearLimits[index], mesh.name));
    const distantLimit = { low: 140, medium: 450, high: 900 }[quality];
    assert.ok(distantMesh.count > 0 && distantMesh.count <= distantLimit);
    assert.equal(distantMesh.userData.capacity, 900, 'mid-layer quality reuses its fixed maximum allocation');
    assertStreamBounds(meshes);
  }
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>' };
  meshes[0].material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.coverTime.value, 12);
  assert.equal(shader.uniforms.coverRadius.value, 25);
  cover.update(new THREE.Vector3(-219, 7, 181), 20);
  assert.equal(shader.uniforms.coverTime.value, 20, 'wind uniforms update without rebuilding geometry');
  assert.deepEqual(shader.uniforms.coverCamera.value.toArray(), [-219, 181]);
  assert.notEqual(meshes[0].material, supplied, 'caller materials are cloned before adding shaders');
  assert.notEqual(distantMesh.material, supplied, 'the mid-layer owns its shader material clone');
  assert.notEqual(distantMesh.material, meshes[0].material, 'near/far materials keep independent fade uniforms');
  let ownDisposals = 0, suppliedDisposals = 0;
  for (const mesh of meshes) {
    mesh.geometry.addEventListener('dispose', () => ownDisposals++);
    mesh.material.addEventListener('dispose', () => ownDisposals++);
  }
  supplied.addEventListener('dispose', () => suppliedDisposals++);
  cover.dispose(); cover.dispose();
  assert.equal(ownDisposals, 18);
  assert.equal(suppliedDisposals, 0);
  assert.deepEqual(scene.children, [unrelated]);
  supplied.dispose();
});

test('actual tree coverage replaces meadow flora with layered woodland plants and debris', () => {
  const open = meadow(), woods = meadow({ forestCoverage: () => 1, ecologyAt: () => ({ moisture: .65 }) });
  const camera = new THREE.Vector3(210, 6, 210);
  open.cover.update(camera); woods.cover.update(camera);
  assert.ok(woods.cover.stats.tufts < open.cover.stats.tufts * .4, 'closed canopy has sparse grass');
  assert.ok(woods.cover.stats.flowers < open.cover.stats.flowers * .2, 'few meadow blooms reach the darker woodland floor');
  assert.ok(woods.cover.stats.seeds < open.cover.stats.seeds * .3, 'oat stems favour the sunny meadow');
  for (const kind of ['ferns', 'shrubs', 'litter', 'deadwood']) {
    assert.ok(woods.cover.stats[kind] > 0, `${kind} ground the woodland`);
    assert.equal(open.cover.stats[kind], 0, `${kind} follow the actual forest rather than appearing in every meadow`);
  }
  assert.ok(woods.cover.stats.draws <= 9 && woods.cover.stats.triangles < 280000);
  for (const mesh of woods.meshes) {
    assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));
  }
  const original = snapshot(woods.meshes), versions = woods.meshes.map(mesh => mesh.instanceMatrix.version);
  woods.cover.update(new THREE.Vector3(211, 6, 211), 5);
  assert.deepEqual(snapshot(woods.meshes), original);
  assert.deepEqual(woods.meshes.map(mesh => mesh.instanceMatrix.version), versions, 'woodland wind does not stream buffers each frame');
  woods.cover.setQuality('low');
  assert.equal(woods.cover.stats.ferns + woods.cover.stats.shrubs + woods.cover.stats.deadwood, 0);
  open.cover.dispose(); woods.cover.dispose();
});

test('shared mowing and moisture fields change botanical height, pigment and seed growth', () => {
  const mown = meadow(), dry = meadow(), wet = meadow({ ecologyAt: () => ({ moisture: 1 }) });
  mown.cover.update(new THREE.Vector3(100, 6, 0));
  dry.cover.update(new THREE.Vector3(210, 6, 210));
  wet.cover.update(new THREE.Vector3(210, 6, 210));
  function meanHeight(mesh) {
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
    let height = 0;
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix); scale.setFromMatrixScale(matrix); height += scale.y;
    }
    return height / mesh.count;
  }
  function warmth(mesh) {
    let red = 0, green = 0;
    for (let index = 0; index < mesh.count; index++) {
      red += mesh.instanceColor.getX(index); green += mesh.instanceColor.getY(index);
    }
    return red / green;
  }
  assert.ok(meanHeight(mown.meshes[0]) < meanHeight(dry.meshes[0]) * .5, 'landing meadow margins have short sage growth');
  assert.ok(warmth(dry.meshes[0]) > warmth(wet.meshes[0]) * 1.1, 'dry meadow fans follow the warm ochre terrain pigment');
  assert.ok(dry.cover.stats.seeds > wet.cover.stats.seeds, 'warm dry patches carry more seed-bearing grasses');
  mown.cover.dispose(); dry.cover.dispose(); wet.cover.dispose();
});

test('coarse meadow strokes bridge the near fade without restreaming at every near-cell crossing', () => {
  const { cover, meshes } = meadow();
  const far = meshes.find(mesh => mesh.name === 'MidMeadowFans');
  cover.update(new THREE.Vector3(204.2, 6, 204.2), 1);
  assert.ok(cover.stats.distantFans > 100);
  let reachesMidground = false;
  eachPosition([far], position => { if (Math.hypot(position.x - 204.2, position.z - 204.2) > 55) reachesMidground = true; });
  assert.equal(reachesMidground, true, 'vertical strokes continue beyond the near35m envelope');
  const version = far.instanceMatrix.version, firstBuilds = cover.stats.farCellBuilds;
  cover.update(new THREE.Vector3(210.2, 6, 204.2), 2);
  assert.equal(far.instanceMatrix.version, version, 'crossing a six-metre cell reuses the coarser twelve-metre batch');
  assert.equal(cover.stats.farCellBuilds, firstBuilds);
  const sharedPositions = new Set();
  eachPosition([far], position => {
    const distance = Math.hypot(position.x - 216.2, position.z - 204.2);
    if (distance > 35 && distance < 50) sharedPositions.add(`${position.x},${position.z}`);
  });
  assert.ok(sharedPositions.size > 0);
  cover.update(new THREE.Vector3(216.2, 6, 204.2), 3);
  let shared = 0;
  eachPosition([far], position => { if (sharedPositions.has(`${position.x},${position.z}`)) shared++; });
  assert.equal(shared, sharedPositions.size, 'crossing a twelve-metre cell preserves every shared midground position');
  assertStreamBounds([far]);
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>' };
  far.material.onBeforeCompile(shader);
  for (const [quality, outer, inner, nearEnd] of [['high', 75, 20, 35], ['medium', 50, 20, 25], ['low', 25, 12, 15]]) {
    cover.setQuality(quality);
    assert.equal(shader.uniforms.coverRadius.value, outer);
    assert.equal(shader.uniforms.coverInnerStart.value, inner);
    assert.equal(shader.uniforms.coverInnerEnd.value, nearEnd, 'the low fan grows into the existing near-layer fade');
  }
  cover.dispose();
});
