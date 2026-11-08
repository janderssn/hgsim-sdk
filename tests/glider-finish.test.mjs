import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { finishGlider } from '../range/glider-finish.js';
import { addSailFlutter } from '../src/pilot-rig.js';

function fixture() {
  const scene = new THREE.Group();
  const pilot = new THREE.Group();
  pilot.name = 'Pilot';
  pilot.userData = { hangPoint: [0, 1, .8], bar: [[-.64, -.58, 1], [.64, -.58, 1]] };
  const pelvis = new THREE.Bone();
  pelvis.name = 'Pelvis';
  const chest = new THREE.Bone();
  chest.name = 'Chest';
  chest.position.y = .4;
  pelvis.add(chest);

  const skinGeometry = new THREE.BufferGeometry();
  skinGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.2, -.8, 0, .2, -.8, 0, -.2, .6, 0, .2, .6, .05,
  ], 3));
  skinGeometry.setIndex([0, 1, 2, 2, 1, 3]);
  skinGeometry.computeVertexNormals();
  skinGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([
    0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
  ], 4));
  skinGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([
    1, 0, 0, 0, 1, 0, 0, 0, .8, .2, 0, 0, .7, .3, 0, 0,
  ], 4));
  const skinMaterial = new THREE.MeshStandardMaterial({ name: 'Pilot / alpine teal shell' });
  const skin = new THREE.SkinnedMesh(skinGeometry, skinMaterial);
  pilot.add(pelvis, skin);
  skin.bind(new THREE.Skeleton([pelvis, chest]));

  const wing = new THREE.Group();
  wing.name = 'Wing';
  wing.userData = { span: 9.125, lowestY: -.611 };
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 1.45, 2.42, -4.52, .81, -1.04, 4.52, .81, -1.04,
  ], 3));
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeometry, new THREE.MeshStandardMaterial({
    name: 'Sail / ivory dacron', side: THREE.DoubleSide,
  }));
  sail.userData = { isSail: true, componentKey: 'battens' };
  const metalMaterial = new THREE.MeshStandardMaterial({ name: 'Frame / anodised aluminium' });
  const metal = new THREE.Mesh(new THREE.BoxGeometry(.6, .04, .04), metalMaterial);
  const otherMetal = new THREE.Mesh(metal.geometry, metalMaterial);
  otherMetal.position.y = .5;
  wing.add(sail, metal, otherMetal);
  scene.add(pilot, wing);
  scene.updateMatrixWorld(true);
  return { scene, pilot, wing, skin, sail, metal, otherMetal, bones: [pelvis, chest] };
}

test('glider finishing preserves rig and geometry while adding finite UVs and shared materials', () => {
  const model = fixture();
  const protectedAttributes = [];
  const metadata = new Map();
  model.scene.traverse(node => {
    metadata.set(node, { reference: node.userData, value: structuredClone(node.userData) });
    if (!node.isMesh) return;
    for (const name of ['position', 'normal', 'skinIndex', 'skinWeight']) {
      const attribute = node.geometry.getAttribute(name);
      if (attribute) protectedAttributes.push({ mesh: node, geometry: node.geometry, name, attribute, array: attribute.array, values: attribute.array.slice() });
    }
  });
  const skeleton = model.skin.skeleton;
  const bindMatrix = model.skin.bindMatrix.clone();
  const originalUVs = model.metal.geometry.getAttribute('uv');
  const originalSkinMaterial = model.skin.material;
  const originalSkinColor = originalSkinMaterial.color.clone();

  const finished = finishGlider(THREE, model.scene);
  for (const { mesh, geometry, name, attribute, array, values } of protectedAttributes) {
    assert.equal(mesh.geometry, geometry);
    assert.equal(mesh.geometry.getAttribute(name), attribute);
    assert.equal(attribute.array, array);
    assert.deepEqual(attribute.array, values);
  }
  for (const [node, data] of metadata) {
    assert.equal(node.userData, data.reference);
    assert.deepEqual(node.userData, data.value);
  }
  assert.equal(model.skin.skeleton, skeleton);
  assert.deepEqual(model.skin.skeleton.bones, model.bones);
  assert.deepEqual(model.skin.bindMatrix.elements, bindMatrix.elements);
  assert.equal(model.scene.getObjectByName('Pilot'), model.pilot);
  assert.equal(model.scene.getObjectByName('Wing'), model.wing);
  assert.equal(model.metal.geometry.getAttribute('uv'), originalUVs, 'authored UVs are retained');
  for (const mesh of [model.skin, model.sail]) {
    const uv = mesh.geometry.getAttribute('uv');
    assert.equal(uv.count, mesh.geometry.getAttribute('position').count);
    assert.ok([...uv.array].every(Number.isFinite));
    assert.ok(mesh.material.map?.isDataTexture && mesh.material.normalMap?.isDataTexture);
    assert.notEqual(mesh.material, originalSkinMaterial);
  }
  assert.deepEqual(originalSkinMaterial.color, originalSkinColor, 'shared source materials are not recoloured');
  assert.equal(model.metal.material, model.otherMetal.material, 'shared finishes stay shared');
  const finishedMaterials = [model.skin.material, model.sail.material, model.metal.material];
  assert.equal(finishGlider(THREE, model.scene), finished, 'repeat calls reuse all finish resources');
  assert.deepEqual([model.skin.material, model.sail.material, model.metal.material], finishedMaterials);
});

test('textured sail keeps its flutter shader and animation resources on repeated finishing', () => {
  const { scene, wing, sail } = fixture();
  finishGlider(THREE, scene);
  const maps = { color: sail.material.map, normal: sail.material.normalMap, roughness: sail.material.roughnessMap };
  const positions = sail.geometry.getAttribute('position');
  const values = positions.array.slice();
  const flutter = addSailFlutter(wing);
  const flutterMaterial = sail.material;
  flutter.update(1 / 60, { speed: 20 });
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>' };
  sail.material.onBeforeCompile(shader);
  const calm = shader.uniforms.uFlutterAmp.value;
  assert.ok(calm > 0 && shader.uniforms.uFlutterTime.value > 0);
  flutter.update(1 / 60, { speed: 20, stall: 1 });
  assert.ok(shader.uniforms.uFlutterAmp.value > calm, 'stall flutter still responds to flight state');
  finishGlider(THREE, scene);
  assert.equal(sail.material, flutterMaterial, 'finishing twice does not replace an installed animation hook');
  assert.equal(sail.userData.isSail, true);
  assert.equal(sail.material.map, maps.color);
  assert.equal(sail.material.normalMap, maps.normal);
  assert.equal(sail.material.roughnessMap, maps.roughness);
  assert.equal(sail.geometry.getAttribute('position'), positions);
  assert.deepEqual(positions.array, values);
});

test('adaptive quality retains albedo and flutter while reusing maps without redundant shader updates', () => {
  const { scene, wing, skin, sail, metal, otherMetal } = fixture();
  const finish = finishGlider(THREE, scene);
  addSailFlutter(wing);
  const originals = new Map([skin.material, sail.material, metal.material].map(material => [material, {
    normal: material.normalMap, roughness: material.roughnessMap,
    albedo: material.map, color: material.color.clone(), hook: material.onBeforeCompile,
  }]));
  const textures = finish.textures.slice();
  const textureVersions = textures.map(map => map.version);
  assert.equal(finish.setQuality('medium'), true);
  for (const [material, original] of originals) {
    assert.equal(material.normalMap, original.normal);
    assert.equal(material.roughnessMap, null);
  }
  const mediumVersions = [...originals.keys()].map(material => material.version);
  assert.equal(finish.setQuality('medium'), false);
  assert.deepEqual([...originals.keys()].map(material => material.version), mediumVersions);

  assert.equal(finish.setQuality('low'), true);
  for (const [index, [material, original]] of [...originals].entries()) {
    assert.equal(material.normalMap, null);
    assert.equal(material.roughnessMap, null);
    assert.equal(material.version, mediumVersions[index] + (original.normal ? 1 : 0),
      'shared materials must be invalidated once per changed quality');
    assert.equal(material.map, original.albedo);
    assert.deepEqual(material.color, original.color);
    assert.equal(material.onBeforeCompile, original.hook);
  }
  const lowVersions = [...originals.keys()].map(material => material.version);
  assert.equal(finish.setQuality('low'), false);
  assert.deepEqual([...originals.keys()].map(material => material.version), lowVersions);

  assert.equal(finish.setQuality('high'), true);
  for (const [material, original] of originals) {
    assert.equal(material.normalMap, original.normal);
    assert.equal(material.roughnessMap, original.roughness);
    assert.equal(material.map, original.albedo);
    assert.equal(material.onBeforeCompile, original.hook);
  }
  const highVersions = [...originals.keys()].map(material => material.version);
  assert.equal(finish.setQuality('high'), false);
  assert.equal(finish.setQuality('invalid'), false);
  assert.deepEqual([...originals.keys()].map(material => material.version), highVersions);
  assert.equal(metal.material, otherMetal.material);
  assert.deepEqual(finish.textures, textures);
  assert.deepEqual(textures.map(map => map.version), textureVersions);
  assert.equal(finishGlider(THREE, scene), finish);
});

test('flutter composes the cloth and preceding lighting callbacks instead of replacing them', () => {
  const {scene, wing, sail} = fixture();
  finishGlider(THREE, scene);
  const clothCompile = sail.material.onBeforeCompile;
  sail.material.onBeforeCompile = function(shader, renderer) {
    clothCompile.call(this, shader, renderer);
    shader.uniforms.sharedLightingProbe = { value: 7 };
  };
  addSailFlutter(wing);
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>',
    fragmentShader: '#include <map_fragment>\n#include <lights_physical_pars_fragment>' };
  sail.material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.sharedLightingProbe.value, 7);
  assert.ok(shader.uniforms.uFlutterAmp);
  assert.match(shader.vertexShader, /vAircraftRestPosition = position/);
  assert.match(shader.fragmentShader, /RE_Direct_Sail/);
  assert.match(shader.fragmentShader, /ivoryFlash/);
});

test('equipment follows the original pilot bones while prone and upright poses remain unchanged', async () => {
  const { registerHooks } = await import('node:module');
  const { readFile } = await import('node:fs/promises');
  const hook = registerHooks({ resolve(specifier, context, next) {
    return next(specifier === 'three' ? new URL('../range/vendor/three.module.js', import.meta.url).href : specifier, context);
  } });
  try {
    const { GLTFLoader } = await import('../range/vendor/GLTFLoader.js');
    const { createPilotRig } = await import('../src/pilot-rig.js');
    const source = await readFile(new URL('../range/assets/hang-glider.glb', import.meta.url));
    const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    const before = (await new GLTFLoader().parseAsync(buffer, '')).scene;
    const after = (await new GLTFLoader().parseAsync(buffer, '')).scene;
    const result = finishGlider(THREE, after), equipment = [];
    after.traverse(object => { if (object.name.startsWith('FlightEquipment-')) equipment.push(object); });
    assert.equal(equipment.length, 5, 'equipment is batched by bone/material');
    assert.ok(result.geometries.reduce((sum, geometry) => sum + geometry.attributes.position.count / 3, 0) < 5000);
    const pilotBefore = before.getObjectByName('Pilot'), pilotAfter = after.getObjectByName('Pilot');
    const rigBefore = createPilotRig(THREE, pilotBefore), rigAfter = createPilotRig(THREE, pilotAfter);
    let boneCount = 0; pilotAfter.traverse(object => { if (object.isBone) boneCount++; });
    assert.equal(boneCount, 19);
    for (const pose of [{upright:0}, {upright:1}, {upright:0,bar:.8,shift:.7}, {upright:1,run:1,speed:6}]) {
      rigBefore.update(1/60, pose, true); rigAfter.update(1/60, pose, true);
      before.updateMatrixWorld(true); after.updateMatrixWorld(true);
      pilotBefore.traverse(object => {
        if (!object.isBone) return;
        const match = pilotAfter.getObjectByName(object.name);
        assert.deepEqual(match.matrixWorld.elements, object.matrixWorld.elements, object.name + ' keeps its original pose');
      });
      for (const mesh of equipment) {
        assert.ok(mesh.parent.isBone, 'hardware follows the existing rig');
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite));
      }
    }
    rigAfter.update(0,{upright:0},true);after.updateMatrixWorld(true);
    const head = pilotAfter.getObjectByName('Head').getWorldPosition(new THREE.Vector3());
    const foot = pilotAfter.getObjectByName('Foot_L').getWorldPosition(new THREE.Vector3());
    assert.ok(head.z-foot.z > 1.2 && Math.abs(head.y-foot.y) < .6, 'the flight pilot is physically prone, not standing');
  } finally { hook.deregister(); }
});
