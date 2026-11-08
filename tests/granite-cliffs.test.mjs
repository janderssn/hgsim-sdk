import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { LAUNCH_GEOLOGY, CLIFF, LAUNCH, DECK_BACK, DECK_LIP, deckY,
  terrainHeight, rockTop, rockSurfaceAt, physicalGroundHeight, groundUnder,
  sampleTerrainEcology, hash } from '../range/world.js';
import { createLaunchEscarpmentGeometry } from '../range/granite-cliffs.js';

function rayHeight(mesh, x, z) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 400, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(mesh, false)[0]?.point.y ?? -Infinity;
}

test('one connected escarpment has finite structural faces and two bounded material draws', () => {
  const source = LAUNCH_GEOLOGY;
  assert.ok(source.indices.length / 3 > 5000 && source.indices.length / 3 < 12000);
  const parents = Array.from({ length: source.positions.length / 3 }, (_, i) => i);
  const find = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  const edges = new Map();
  for (let face = 0; face < source.indices.length / 3; face++) {
    const vertices = Array.from(source.indices.subarray(face * 3, face * 3 + 3));
    for (let i = 0; i < 3; i++) {
      const a = vertices[i], b = vertices[(i + 1) % 3];
      parents[find(a)] = find(b);
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
    const normal = source.normals.subarray(face * 3, face * 3 + 3);
    assert.ok(normal.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-5);
    assert.ok(normal[1] > 0, 'all contact triangles face upward and the surface does not fold');
  }
  assert.equal(new Set(parents.map((_, i) => find(i))).size, 1, 'no disconnected launch pillars');
  assert.ok([...edges.values()].every(count => count <= 2), 'no duplicated or nonmanifold faces');
  assert.equal([...edges.values()].filter(count => count === 1).length,
    2 * (source.columns - 1) + 2 * (source.rows - 1), 'only the buried perimeter is open');
  const geometry = createLaunchEscarpmentGeometry(THREE);
  assert.equal(geometry.groups.length, 2);
  assert.equal(geometry.groups.reduce((sum, group) => sum + group.count, 0), source.indices.length);
  assert.ok(geometry.groups.every(group => group.count > 0));
  assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  assert.equal(geometry.userData.sharedPhysicalSurface, 'launch-escarpment');
  geometry.dispose();
});

test('physical rock heights match actual rendered triangles, including fracture edges', () => {
  const geometry = createLaunchEscarpmentGeometry(THREE);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material); mesh.updateMatrixWorld(true);
  const source = LAUNCH_GEOLOGY;
  let checked = 0;
  const check = (x, z) => {
    const expected = rayHeight(mesh, x, z), actual = rockTop(x, z);
    assert.ok(Math.abs(expected - actual) < .0001,
      `draw/contact differs at ${x}, ${z}: ${expected} vs ${actual}`);
    checked++;
  };
  for (let face = 0; face < source.indices.length / 3; face += 13) {
    const a = source.indices[face * 3] * 3, b = source.indices[face * 3 + 1] * 3, c = source.indices[face * 3 + 2] * 3;
    for (const weights of [[1 / 3, 1 / 3, 1 / 3], [.4999, .4999, .0002]]) {
      check(source.positions[a] * weights[0] + source.positions[b] * weights[1] + source.positions[c] * weights[2],
        source.positions[a + 2] * weights[0] + source.positions[b + 2] * weights[1] + source.positions[c + 2] * weights[2]);
    }
  }
  for (let i = 0; i < 220; i++) {
    const x = -175 + hash(i, 137) * 358;
    const { edge, depth } = source.crestAt(x);
    check(x, edge - 125 + hash(i, 139) * (125 + depth * .95));
  }
  assert.ok(checked > 1500);
  geometry.dispose(); material.dispose();
});

test('authored launch heights and the first metres beyond their edges remain usable', () => {
  assert.ok(Math.abs(rockTop(CLIFF.x, CLIFF.z) - CLIFF.ground) < .00002);
  const shelf = rockSurfaceAt(CLIFF.x, CLIFF.z);
  assert.ok(shelf.slope < .001);
  for (const dx of [-4.5, 0, 4.5]) for (const dz of [-6, -1.5, -.1]) {
    assert.ok(Math.abs(rockTop(CLIFF.x + dx, CLIFF.edge + dz) - CLIFF.ground) < .00002,
      'the standing shelf does not have invisible gaps or a collision inset');
  }
  assert.ok(rockTop(CLIFF.x, CLIFF.edge + 1.5) < CLIFF.ground - 5, 'the cliff falls away after its actual edge');
  const back = LAUNCH.z + DECK_BACK + .1, lip = LAUNCH.z + DECK_LIP - .1;
  assert.equal(groundUnder(0, back), deckY(back));
  assert.equal(groundUnder(0, lip), deckY(lip));
  assert.ok(physicalGroundHeight(0, lip) < deckY(lip) - 12, 'the short timber overhang clears the steep spur face');
  for (const z of [-582, -575, -565, -559]) {
    const support = deckY(z) - rockTop(0, z);
    assert.ok(support > 1.3 && support < 2.5, 'the run rests just above the connected natural rock spur');
  }
  assert.ok(rockTop(-80, -625) > terrainHeight(-80, -625) + 10, 'the escarpment continues west of both launch sites');
  assert.ok(rockTop(95, -610) > terrainHeight(95, -610) + 10, 'the escarpment continues east of both launch sites');
  assert.equal(rockTop(500, CLIFF.z), -Infinity);
});

test('shared ecology is deterministic, bounded and follows the rock, toe and access path', () => {
  for (let x = -210; x < 220; x += 13) for (let z = -950; z < -400; z += 17) {
    const ecology = sampleTerrainEcology(x, z);
    assert.deepEqual(ecology, sampleTerrainEcology(x, z));
    for (const weight of Object.values(ecology)) assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1);
  }
  assert.ok(sampleTerrainEcology(0, -556).rock > .95, 'bare cliff faces exclude soil and vegetation');
  assert.ok(sampleTerrainEcology(0, -530).talus > .6, 'broken rock continues onto the downslope toe');
  assert.ok(sampleTerrainEcology(-8, -650).path > .8, 'the approach path is authored in the shared world');
  assert.ok(sampleTerrainEcology(0, 0).rock < .05, 'the landing field stays meadow');
});
