import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createSurfaceMaterials } from '../range/surface-materials.js';

for (const maximumAnisotropy of [1, 4, 16]) {
  test(`surface quality preserves PBR maps and bounds texture uploads (maximum ${maximumAnisotropy}×)`, async t => {
    const loadedTextures = [];
    class TextureLoader {
      async loadAsync(url) {
        const texture = new THREE.Texture();
        texture.name = new URL(url).pathname;
        loadedTextures.push(texture);
        return texture;
      }
    }
    const surfaces = await createSurfaceMaterials({ ...THREE, TextureLoader }, {
      anisotropy: maximumAnisotropy,
    });
    t.after(() => surfaces.dispose());

    const bindings = [];
    for (const name of ['terrain', 'rock', 'granite', 'timber', 'timberBeam', 'mountain']) {
      for (const property of ['map', 'normalMap', 'roughnessMap']) {
        const texture = surfaces[name][property];
        assert.ok(texture?.isTexture, `${name}.${property} remains a PBR texture`);
        bindings.push({ name, property, texture });
      }
    }
    for (const property of ['map', 'normalMap', 'roughnessMap']) {
      assert.notEqual(surfaces.timberBeam[property], surfaces.timber[property],
        'rotated beam maps own their sampling transforms');
    }
    const textures = [...new Set([...loadedTextures, ...bindings.map(binding => binding.texture)])];
    const projectedMaterials = ['terrain', 'rock', 'granite', 'mountain'].map(name => surfaces[name]);
    const materialVersions = projectedMaterials.map(material => material.version);
    const compiledShaders = projectedMaterials.map(material => {
      const shader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
      material.onBeforeCompile(shader);
      return shader;
    });
    const snapshotVersions = () => textures.map(texture => texture.version);
    const assertBindings = () => {
      for (const { name, property, texture } of bindings) {
        assert.equal(surfaces[name][property], texture, `${name}.${property} retains its identity`);
      }
    };
    assert.ok(textures.every(texture => texture.anisotropy === Math.min(8, maximumAnisotropy)));

    for (const [level, cap] of [['low', 1], ['medium', 2], ['high', 8]]) {
      const target = Math.min(cap, maximumAnisotropy);
      const previous = textures.map(texture => ({ value: texture.anisotropy, version: texture.version }));
      surfaces.setQuality(level);
      for (const shader of compiledShaders) {
        assert.equal(shader.uniforms.surfaceDetailDistance.value, { low: 80, medium: 160, high: 300 }[level]);
        assert.equal(shader.uniforms.surfaceDominantAxis.value, Number(level === 'low'));
      }
      assert.deepEqual(projectedMaterials.map(material => material.version), materialVersions,
        'distance and projection quality changes update shared uniforms without requesting program recompilation');
      textures.forEach((texture, index) => {
        assert.equal(texture.anisotropy, target, `${texture.name}: ${level} sampler cap`);
        assert.equal(texture.version, previous[index].version + Number(previous[index].value !== target),
          'only a changed sampler requests one texture upload');
      });
      assertBindings();

      const versions = snapshotVersions();
      surfaces.setQuality(level);
      for (const invalid of [undefined, null, '', 'auto', 'ultra', 'toString']) surfaces.setQuality(invalid);
      assert.deepEqual(snapshotVersions(), versions, 'repeated and invalid quality requests never request uploads');
      assert.ok(textures.every(texture => texture.anisotropy === target));
      assertBindings();
    }
  });
}
