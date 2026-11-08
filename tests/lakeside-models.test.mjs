import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../range/vendor/three.module.js';
import { prepareLakesideModels, loadLakesideModels } from '../range/lakeside-models.js';

const base = new URL('../range/assets/lakeside/', import.meta.url);
const sha = data => createHash('sha256').update(data).digest('hex');

test('authored Blender lakeside assets retain source, texture provenance and bounded geometry', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', base)));
  const bytes = readFileSync(new URL(manifest.geometry, base));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(sha(bytes), manifest.geometry_sha256);
  assert.equal(sha(readFileSync(new URL(manifest.blend, base))), manifest.blend_sha256);
  assert.equal(sha(readFileSync(new URL('../' + manifest.generator, import.meta.url))), manifest.source_builder_sha256);
  const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  const binary = bytes.subarray(28 + jsonLength);
  for (const name of ['LakesideBoathouse', 'LakesideRowboat']) assert.ok(gltf.nodes.some(node => node.name === name));
  assert.equal(manifest.original_geometry, true);
  assert.ok(manifest.triangles.LakesideBoathouse > 1000);
  assert.ok(manifest.triangles.LakesideRowboat > 1000);
  assert.ok(Object.values(manifest.triangles).reduce((sum, value) => sum + value, 0) < 50000);
  assert.ok(manifest.draws <= 24);
  const house = manifest.bounds.LakesideBoathouse, boat = manifest.bounds.LakesideRowboat;
  assert.ok(house.max[0] - house.min[0] < 4.2 && house.max[2] - house.min[2] < 6.2);
  assert.ok(house.max[1] < 4 && house.min[1] >= -.6);
  assert.ok(boat.max[2] - boat.min[2] > 3.5 && boat.max[2] - boat.min[2] < 3.9);
  assert.ok(boat.min[1] < 0 && boat.max[1] > .35, 'the boat crosses its declared waterline');
  let triangles = 0;
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const material = gltf.materials[primitive.material];
    if (material.pbrMetallicRoughness?.baseColorTexture) assert.ok(primitive.attributes.TEXCOORD_0 !== undefined);
    assert.ok(primitive.attributes.NORMAL !== undefined);
    triangles += gltf.accessors[primitive.indices].count / 3;
    for (const attribute of ['POSITION', 'NORMAL', 'TEXCOORD_0']) {
      if (attribute === 'TEXCOORD_0' && primitive.attributes[attribute] === undefined) continue;
      const accessor = gltf.accessors[primitive.attributes[attribute]];
      const view = gltf.bufferViews[accessor.bufferView], channels = attribute === 'TEXCOORD_0' ? 2 : 3;
      assert.equal(accessor.componentType, 5126);
      const stride = view.byteStride || channels * 4;
      for (let index = 0; index < accessor.count; index++) {
        const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0) + index * stride;
        const values = Array.from({ length: channels }, (_, channel) => binary.readFloatLE(offset + channel * 4));
        assert.ok(values.every(Number.isFinite));
        if (attribute === 'NORMAL') assert.ok(Math.abs(Math.hypot(...values) - 1) < .02);
      }
    }
  }
  assert.equal(triangles, Object.values(manifest.triangles).reduce((sum, value) => sum + value, 0));
  assert.ok(gltf.materials.filter(material => material.normalTexture && material.pbrMetallicRoughness?.baseColorTexture
    && material.pbrMetallicRoughness?.metallicRoughnessTexture).length >= 5, 'photographic PBR companions are exported together');
  for (const texture of manifest.textures) {
    assert.equal(sha(readFileSync(new URL(texture.file, base))), texture.sha256);
    assert.equal(sha(readFileSync(new URL('../../../' + texture.source, base))), texture.source_sha256);
  }
});

function fixture() {
  const group = new THREE.Group(), material = new THREE.MeshStandardMaterial(), texture = new THREE.Texture();
  material.map = texture; material.normalMap = texture;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  for (const name of ['LakesideBoathouse', 'LakesideRowboat']) {
    const root = new THREE.Group(); root.name = name; root.add(new THREE.Mesh(geometry, material)); group.add(root);
  }
  return { group, geometry, material, texture };
}

test('lakeside importer preserves materials and releases shared owned resources once', () => {
  const { group, geometry, material, texture } = fixture();
  const environment = new THREE.Texture(); material.metalness = .5;
  let environmentReleases = 0; environment.addEventListener('dispose', () => environmentReleases++);
  const released = new Map([geometry, material, texture].map(resource => [resource, 0]));
  for (const resource of released.keys()) resource.addEventListener('dispose', () => released.set(resource, released.get(resource) + 1));
  let installs = 0;
  const kit = prepareLakesideModels(THREE, group, { anisotropy: 4, environment, atmosphere: { installMaterial(value) {
    assert.equal(value, material); installs++;
  } } });
  const world = new THREE.Scene(); world.add(kit.house, kit.boat);
  assert.equal(installs, 1); assert.equal(texture.anisotropy, 4);
  assert.equal(material.envMap, environment);
  assert.equal(kit.house.children[0].material, material);
  assert.equal(kit.boat.children[0].castShadow, true);
  assert.equal(kit.stats.draws, 2);
  kit.dispose(); kit.dispose();
  assert.equal(world.children.length, 0);
  for (const count of released.values()) assert.equal(count, 1);
  assert.equal(environmentReleases, 0, 'the supplied sky environment remains caller-owned');
  environment.dispose();
});

test('missing optional lakeside GLB returns a usable fallback signal', async () => {
  let reported = 0;
  assert.equal(await loadLakesideModels(THREE, { load: async () => { throw new Error('asset intentionally unavailable'); },
    onError: error => { assert.match(error.message, /intentionally/); reported++; } }), null);
  assert.equal(reported, 1);
  const model = fixture(); model.group.remove(model.group.children[1]);
  let disposed = 0; model.geometry.addEventListener('dispose', () => disposed++);
  assert.equal(await loadLakesideModels(THREE, { load: async () => ({ scene: model.group }) }), null);
  assert.equal(disposed, 1, 'an invalid imported library does not leak its geometry');
});
