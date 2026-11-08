import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createEnvironmentModels } from '../range/environment-models.js';
import { buildScenery } from '../range/scenery.js';

const propNames = ['BoulderA', 'BoulderB', 'Cairn', 'TrailSign', 'EquipmentCrate', 'Cabin'];

test('Blender library includes detailed trees and a self-contained multi-view atlas', () => {
  const bytes = fs.readFileSync(new URL('../range/assets/alpine/environment.glb', import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.ok(document.images.length >= 3);
  assert.ok(document.images.every(image => image.bufferView !== undefined && !image.uri), 'textures are embedded, with no network dependencies');
  assert.ok(document.images.some(image => image.name === 'spruce-atlas'));
  assert.ok(document.extensionsUsed.includes('EXT_texture_webp'));
  for (const name of propNames) assert.ok(document.nodes.some(node => node.name === name), name);
  for (const variant of ['SpruceA', 'SpruceB', 'SpruceC']) {
    for (const [detail, budget] of [['Near', 20_000], ['Far', 2]]) {
      const node = document.nodes.find(node => node.name === `${variant}_${detail}`);
      assert.ok(node);
      const primitive = document.meshes[node.mesh].primitives[0];
      assert.ok(document.accessors[primitive.indices].count / 3 <= budget);
      if (detail === 'Near') {
        assert.ok(document.accessors[primitive.indices].count / 3 > 10_000, 'close trees have real needle geometry');
        const colour = document.accessors[primitive.attributes.COLOR_0];
        assert.equal(colour.componentType, 5121);
        assert.equal(colour.type, 'VEC4');
        assert.equal(colour.normalized, true);
        const position = document.accessors[primitive.attributes.POSITION];
        assert.ok(position.max[1] > 18 && position.max[1] < 22.25, 'foliage uses Y-up metres within the baked frame');
        assert.ok(position.min[1] > -.1, 'drooping ground-level needles stay within ten centimetres of the soil');
        assert.ok(Math.max(Math.abs(position.min[0]), Math.abs(position.max[0]),
          Math.abs(position.min[2]), Math.abs(position.max[2])) < 23 / 3, 'the fuller crown fits its impostor frame');
      } else {
        assert.equal(node.extras.impostorColumns, 4);
        assert.equal(node.extras.impostorRows, 3);
        assert.ok(primitive.attributes.TEXCOORD_0 !== undefined);
      }
    }
  }
  assert.ok(bytes.byteLength < 7_000_000, 'detail and atlas remain within the web asset budget');
});

test('asset adapter bakes node transforms once without changing source geometry', () => {
  const library = new THREE.Group();
  for (const name of propNames) { const group = new THREE.Group(); group.name = name; library.add(group); }
  const source = new THREE.BoxGeometry(2, 4, 2);
  for (const variant of ['SpruceA', 'SpruceB', 'SpruceC']) {
    for (const detail of ['Near', 'Far', 'Trunk']) {
      const object = new THREE.Mesh(source, new THREE.MeshStandardMaterial());
      object.name = `${variant}_${detail}`; object.position.set(3, 10, 5); library.add(object);
    }
  }
  const original = source.attributes.position.array.slice();
  const models = createEnvironmentModels(THREE, library);
  models.treeVariants[0].near.computeBoundingBox();
  assert.deepEqual(models.treeVariants[0].near.boundingBox.min.toArray(), [2, 8, 4]);
  assert.deepEqual(models.treeVariants[0].near.boundingBox.max.toArray(), [4, 12, 6]);
  assert.deepEqual(source.attributes.position.array, original);
  assert.notEqual(models.treeVariants[0].near, source);
});

test('props-only adapter retains original props without touching legacy tree geometry', () => {
  const library = new THREE.Group();
  const expected = {};
  for (const [index, name] of propNames.entries()) {
    const prop = new THREE.Group(); prop.name = name; prop.position.set(index, 2, -3);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1 + index, 2, 3), new THREE.MeshStandardMaterial());
    mesh.rotation.y = .3; prop.add(mesh); library.add(prop); expected[name] = prop;
  }
  const obsolete = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  obsolete.name = 'SpruceA_Far';
  obsolete.geometry.clone = () => { throw new Error('obsolete tree geometry was cloned'); };
  library.add(obsolete);
  const before = Object.fromEntries(propNames.map(name => [name, new THREE.Box3().setFromObject(expected[name]).clone()]));
  const models = createEnvironmentModels(THREE, library, { trees: false });
  assert.deepEqual(models.treeVariants, []);
  assert.deepEqual(models.props, expected, 'prop objects retain their geometry, transforms and shared materials');
  for (const name of propNames) assert.deepEqual(new THREE.Box3().setFromObject(models.props[name]), before[name]);
  library.remove(obsolete);
  assert.doesNotThrow(() => createEnvironmentModels(THREE, library, { trees: false }), 'trimmed library needs no tree nodes');
  assert.throws(() => createEnvironmentModels(THREE, library), /missing mesh SpruceA_Far/, 'legacy default remains strict');
  assert.equal(createEnvironmentModels(THREE, null, { trees: false }).treeVariants.length, 0);
  assert.equal(createEnvironmentModels(THREE).treeVariants.length, 3, 'procedural forest fallback remains available');
});

test('tree detail uses a bounded number of shared draws and culls behind the camera', () => {
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene);
  const trees = scene.children.filter(object => object.userData.alpineTree);
  assert.equal(trees.length, 9, 'three variants share near/far/trunk draws');
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 9000);
  camera.position.set(0, 250, -560); camera.lookAt(0, 250, 500); camera.updateMatrixWorld();
  scenery.updateDetail(camera.position, camera);
  const forward = trees.reduce((total, object) => total + object.count, 0);
  assert.ok(forward > 0 && forward < trees[0].userData.placementCount * 2, 'unseen trees are removed before instance submission');
  const geometry = trees.map(object => object.geometry);
  scenery.setQuality('low');
  scenery.updateDetail(camera.position, camera);
  assert.deepEqual(trees.map(object => object.geometry), geometry);
  assert.ok(trees.every(object => !object.castShadow), 'low quality avoids expensive tree shadow passes');
  const props = scene.children.filter(object => object.userData.decorative);
  assert.ok(props.some(object => object.name === 'AlpineCabin'));
  assert.ok(props.some(object => object.name === 'AlpineCairn'));
});

test('evergreen stands create clustered mature forests and preserve meadow clearances', () => {
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene);
  scenery.updateDetail(new THREE.Vector3(0, 300, -560));
  const trunks = scene.children.filter(object => object.userData.treePart === 'trunk');
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
  const trees = [];
  for (const trunk of trunks) for (let index = 0; index < trunk.count; index++) {
    trunk.getMatrixAt(index, matrix);
    position.setFromMatrixPosition(matrix);
    trees.push({ x: position.x, z: position.z, scale: new THREE.Vector3().setFromMatrixScale(matrix).x });
  }
  assert.ok(trees.length >= 10_000 && trees.length <= 15_000, 'valley margins form a substantial forest');
  let closeNeighbours = 0;
  for (const [index, tree] of trees.entries()) {
    assert.ok(Math.hypot(tree.x, tree.z) >= 150, 'landing field stays open');
    assert.ok(Math.abs(tree.x) >= 70 || Math.abs(tree.z + 560) >= 70, 'launch run stays open');
    if (trees.some((other, next) => index !== next && (tree.x - other.x) ** 2 + (tree.z - other.z) ** 2 < 400)) closeNeighbours++;
  }
  assert.ok(closeNeighbours / trees.length > .8, 'most trees belong to dense stands rather than uniform scatter');
  assert.ok(Math.max(...trees.map(tree => tree.scale)) >= 1.79, 'mature ridge trees provide scale');
  assert.ok(Math.min(...trees.map(tree => tree.scale)) < 1.15, 'younger trees soften the forest edges');
});

test('stationary lens and viewport changes rebuild the tree frustum', () => {
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene);
  const trunks = scene.children.filter(object => object.userData.treePart === 'trunk');
  const count = () => trunks.reduce((total, object) => total + object.count, 0);
  const camera = new THREE.PerspectiveCamera(95, 1.7, .1, 9000);
  camera.position.set(0, 650, -1300);
  camera.lookAt(0, 150, 250);
  camera.updateMatrixWorld();
  scenery.updateDetail(camera.position, camera);
  const wide = count();
  const view = camera.matrixWorldInverse.clone();
  camera.fov = 15;
  camera.updateProjectionMatrix();
  scenery.updateDetail(camera.position, camera);
  const narrow = count();
  assert.ok(narrow > 0 && narrow < wide, 'a narrower field of view must cull more trees');
  assert.deepEqual(camera.matrixWorldInverse, view, 'only the lens changed');
  camera.aspect = .3;
  camera.updateProjectionMatrix();
  scenery.updateDetail(camera.position, camera);
  const portrait = count();
  camera.aspect = 3;
  camera.updateProjectionMatrix();
  scenery.updateDetail(camera.position, camera);
  assert.ok(count() > portrait, 'a wider viewport restores trees without moving the camera');
});

test('distant trees use opaque alpha-tested atlas cards instead of full branch geometry', () => {
  const library = new THREE.Group(), atlas = new THREE.Texture();
  for (const name of propNames) { const group = new THREE.Group(); group.name = name; library.add(group); }
  for (const variant of ['SpruceA', 'SpruceB', 'SpruceC']) {
    for (const detail of ['Near', 'Far', 'Trunk']) {
      const object = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial());
      object.name = `${variant}_${detail}`;
      if (detail === 'Far') object.material.map = atlas;
      library.add(object);
    }
  }
  const models = createEnvironmentModels(THREE, library);
  const material = models.treeVariants[0].impostorMaterial;
  assert.equal(material.map, atlas);
  assert.equal(material.transparent, false);
  assert.equal(material.depthWrite, true);
  assert.equal(material.toneMapped, true, 'direct and postprocessed quality paths apply the same final output curve');
  assert.ok(material.alphaTest > 0, 'needle silhouette is alpha tested, not a solid rectangle');
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene, { models });
  scenery.updateDetail(new THREE.Vector3(0, 1500, -560));
  const trees = scene.children.filter(object => object.userData.alpineTree);
  assert.equal(trees.filter(object => object.userData.treePart === 'trunk').reduce((total, object) => total + object.count, 0), 0);
  const cards = trees.filter(object => object.userData.treePart === 'far');
  assert.ok(cards.reduce((total, object) => total + object.count, 0) >= 10_000);
  for (const card of cards) {
    const views = card.geometry.attributes.impostorView;
    for (let index = 0; index < card.count; index++) assert.ok(views.getX(index) >= 0 && views.getX(index) < 4);
  }
});
