import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
    for (const name of ['terrain-control.png', 'terrain-ecology.png', 'terrain-paint.webp']) {
      const texture = loadedTextures.find(texture => texture.name.endsWith('/' + name));
      assert.ok(texture);
      assert.equal(texture.flipY, false, `${name}: the atlas row origin is world minZ`);
      assert.equal(texture.colorSpace, name.endsWith('.webp') ? THREE.SRGBColorSpace : THREE.NoColorSpace,
        'paint is decoded as albedo while masks retain linear control values');
    }

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

test('forest coverage updates existing shaders without transferring ownership', async () => {
  class TextureLoader { async loadAsync() { return new THREE.Texture(); } }
  const surfaces = await createSurfaceMaterials({ ...THREE, TextureLoader });
  const shader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
  surfaces.terrain.onBeforeCompile(shader);
  const ledgeShader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
  surfaces.rock.onBeforeCompile(ledgeShader);
  const coverage = new THREE.DataTexture(new Uint8Array([128, 0, 0, 255]), 1, 1);
  let disposed = false;
  coverage.addEventListener('dispose', () => { disposed = true; });
  const originalUniform = shader.uniforms.forestCoverageMap;
  assert.equal(ledgeShader.uniforms.forestCoverageMap, originalUniform,
    'cliff ledges and valley floor follow the same actual canopy source');
  const version = surfaces.terrain.version;

  assert.equal(surfaces.setForestCoverage(coverage, { minX: -40, minZ: -70, width: 80, depth: 140 }), true);
  assert.equal(shader.uniforms.forestCoverageMap, originalUniform);
  assert.equal(originalUniform.value, coverage);
  assert.deepEqual(shader.uniforms.forestCoverageBounds.value.toArray(), [-40, -70, 80, 140]);
  assert.equal(surfaces.terrain.version, version);
  for (const bounds of [null, {}, { minX: 0, minZ: 0, size: 0 }, { minX: NaN, minZ: 0, size: 10 }]) {
    assert.equal(surfaces.setForestCoverage(coverage, bounds), false);
    assert.deepEqual(shader.uniforms.forestCoverageBounds.value.toArray(), [-40, -70, 80, 140]);
  }
  assert.equal(surfaces.setForestCoverage(coverage, { minX: -10, minZ: -10, size: 20 }), true);
  assert.deepEqual(shader.uniforms.forestCoverageBounds.value.toArray(), [-10, -10, 20, 20]);
  surfaces.dispose();
  assert.equal(disposed, false, 'the tree system still owns its externally supplied coverage texture');
  coverage.dispose();
});

test('one shared atmosphere installer preserves surface shader callbacks', async () => {
  class TextureLoader { async loadAsync() { return new THREE.Texture(); } }
  const surfaces = await createSurfaceMaterials({ ...THREE, TextureLoader });
  const installed = [];
  const atmosphere = {
    installMaterial(material) {
      installed.push(material);
      const surface = material.onBeforeCompile;
      material.onBeforeCompile = shader => {
        surface(shader);
        shader.uniforms.atmosphereInstalled = { value: 1 };
      };
    },
  };
  assert.equal(surfaces.setAtmosphere(null), false);
  assert.equal(surfaces.setAtmosphere({}), false);
  assert.equal(surfaces.setAtmosphere(atmosphere), true);
  assert.equal(installed.length, 8);
  assert.equal(new Set(installed).size, 8);
  assert.equal(surfaces.setAtmosphere(atmosphere), false);
  assert.equal(installed.length, 8);
  const shader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
  surfaces.terrain.onBeforeCompile(shader);
  assert.equal(shader.uniforms.atmosphereInstalled.value, 1);
  assert.ok(shader.uniforms.surfaceDetailDistance);
  assert.ok(shader.uniforms.forestCoverageMap);
  surfaces.dispose();
});

test('ecology controls retain opaque linear channels and match their physical source', async () => {
  const root = new URL('../', import.meta.url);
  const assets = new URL('range/assets/materials/', root);
  const manifest = JSON.parse(await readFile(new URL('terrain-controls.json', assets), 'utf8'));
  const hash = data => createHash('sha256').update(data).digest('hex');
  for (const entry of manifest.files) {
    const bytes = await readFile(new URL(entry.file, assets));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes[25], 2, 'opaque RGB PNG avoids losing control values to alpha premultiplication');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], manifest.dimensions);
    assert.equal(hash(bytes), entry.sha256);
  }
  for (const [path, expected] of [
    ['range/world.js', manifest.world_source_sha256],
    ['range/launch-geology.js', manifest.geology_source_sha256],
    ['range/surface-style.js', manifest.style_source_sha256],
    ['range/alpine-sites.js', manifest.site_source_sha256],
    ['tools/build-surface-textures.py', manifest.builder_sha256],
  ]) {
    assert.equal(hash(await readFile(new URL(path, root))), expected,
      `${path} changed: rebuild ecological masks with python3 tools/build-surface-textures.py`);
  }
  assert.equal(hash(await readFile(new URL(manifest.paint_atlas.file, assets))), manifest.paint_atlas.sha256);
  assert.equal(manifest.paint_atlas.color_space, 'sRGB');
});
