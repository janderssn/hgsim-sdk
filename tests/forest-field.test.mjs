import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { createForestField, createForestCoverageTexture, forestTreeBounds, forestCanopyTint } from '../range/forest-field.js';

test('woodland clearance, deterministic placement and actual canopy coverage agree', () => {
  const options = { minX: -260, minZ: -700, size: 540, spacing: 10.5,
    groundHeight: (x, z) => 100 + x * .01 + z * .02,
    ecologyAt: (x, z) => ({ rock: x < -200 ? 1 : 0, path: z < -665 ? 1 : 0 }) };
  const field = createForestField(options), repeat = createForestField(options);
  assert.deepEqual(field.pixels, repeat.pixels);
  assert.deepEqual(field.trees, repeat.trees);
  assert.ok(field.trees.length > 300);
  for (const tree of field.trees) {
    assert.ok(tree.x >= -200 && tree.z >= -665, 'rock and trail exclude planting');
    assert.equal(tree.y, options.groundHeight(tree.x, tree.z) - .08);
    assert.ok(!(tree.z > -635 && tree.z < 70 && Math.abs(tree.x) < 30), 'launch and approach stay clear');
    assert.ok(Math.hypot(tree.x, tree.z) > 115, 'landing meadow remains open');
    assert.ok(field.coverageAt(tree.x, tree.z) > .4, 'every actual crown contributes to its shared coverage');
  }
  const parents = new Map(field.trees.filter(tree => !tree.understory).map(tree => [tree.seed, tree]));
  const saplings = field.trees.filter(tree => tree.understory);
  assert.ok(saplings.length > 20 && saplings.length < field.trees.length * .25, 'regeneration forms a bounded lower woodland layer');
  for (const sapling of saplings) {
    const parent = parents.get(sapling.parentSeed);
    assert.ok(parent, 'each sapling belongs to an existing canopy group');
    assert.ok(sapling.height < parent.height * .6, 'regeneration fills beneath the mature boughs');
    assert.ok(Math.hypot(sapling.x - parent.x, sapling.z - parent.z) < parent.crownRadius * 1.2, 'saplings gather near canopy edges');
  }
  assert.equal(field.coverageAt(-10000, 0), 0);
  assert.equal(field.coverageAt(0, -560), 0);
  assert.equal(new Set(field.cells.flatMap(cell => cell.trees)).size, field.trees.length);
  const texture = createForestCoverageTexture(THREE, field);
  assert.equal(texture.image.data, field.pixels);
  assert.equal(texture.flipY, false);
  texture.dispose();
});


test('rotated culling bounds contain every corner of an asymmetric wide crown', () => {
  const profile = { cullBounds: { min: [-9, -.2, -5], max: [12, 22, 7] } };
  const tree = { x: 150, y: 30, z: -260, size: 1.3, yaw: Math.PI * .37, crownRadius: 12, height: 22 * 1.3 };
  const bounds = forestTreeBounds(profile, tree);
  const rotation = new THREE.Matrix4().makeRotationY(tree.yaw);
  for (const x of [-9,12]) for (const y of [-.2,22]) for (const z of [-5,7]) {
    const p = new THREE.Vector3(x,y,z).multiplyScalar(tree.size).applyMatrix4(rotation).add(new THREE.Vector3(tree.x,tree.y,tree.z));
    assert.ok(p.x >= bounds.minX - 1e-10 && p.x <= bounds.maxX + 1e-10);
    assert.ok(p.y >= bounds.minY - 1e-10 && p.y <= bounds.maxY + 1e-10);
    assert.ok(p.z >= bounds.minZ - 1e-10 && p.z <= bounds.maxZ + 1e-10);
    assert.ok(p.distanceTo(new THREE.Vector3(...bounds.center)) <= bounds.radius + 1e-10);
  }
  assert.ok(bounds.radius > tree.height * .62, 'wide crowns exceed the old height-only culling approximation');
});


test('composed sites reserve tree-free space and grove pigments keep warm edges distinct from cool interiors', () => {
  const exclusionAt = (x,z) => Math.hypot(x + 235,z + 645) < 25 ? 1 : 0;
  const field = createForestField({ minX:-320,minZ:-735,size:180,exclusionAt });
  assert.ok(field.trees.length>80);
  for(const tree of field.trees) {
    assert.ok(exclusionAt(tree.x,tree.z)<=.15);
    assert.equal(tree.crownTint.length,3);
    assert.ok(tree.crownTint.every(channel=>Number.isFinite(channel)&&channel>.4&&channel<2.3));
  }
  const gold = forestCanopyTint({family:'ash',edge:1,moisture:.2,grove:.8,accent:.5});
  const cool = forestCanopyTint({family:'fir',edge:0,moisture:.9,grove:.5});
  assert.ok(gold[0]/gold[2]>3,'warm edge grove has deliberate golden pigment');
  assert.ok(cool[2]/cool[0]>.9,'moist interior retains cool teal foliage');
  assert.ok(gold[0]/gold[1]>cool[0]/cool[1]+.3,'palette families remain visibly distinct');
});

test('neighboring trees form coherent species and age stands instead of independent speckle', () => {
  const field = createForestField({ minX: -1200, minZ: -1000, size: 1000 });
  let nearPairs = 0, farPairs = 0, sameNear = 0, sameFar = 0, ageNear = 0, ageFar = 0;
  for (let i = 0; i < field.trees.length; i += 11) for (let j = i + 1; j < field.trees.length; j += 7) {
    const a = field.trees[i], b = field.trees[j], distance = Math.hypot(a.x - b.x, a.z - b.z);
    const sameFamily = (a.variant === 3) === (b.variant === 3);
    if (distance < 45) { nearPairs++; sameNear += sameFamily; ageNear += Math.abs(a.size - b.size); }
    else if (distance > 300 && distance < 500) { farPairs++; sameFar += sameFamily; ageFar += Math.abs(a.size - b.size); }
  }
  assert.ok(nearPairs > 100 && farPairs > 100);
  assert.ok(sameNear / nearPairs > sameFar / farPairs + .12, 'nearby crowns belong to recognizable broadleaf/conifer stands');
  assert.ok(ageNear / nearPairs < ageFar / farPairs * .7, 'local regeneration cohorts retain a shared height character');
});
