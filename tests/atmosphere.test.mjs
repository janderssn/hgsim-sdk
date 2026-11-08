import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createAtmosphere, parseAlpineHeightfield, loadAlpineHeightfield, sampleAlpineHeight } from '../range/atmosphere.js';
import { terrainHeight } from '../range/world.js';

const bytes = readFileSync(new URL('../range/assets/terrain/sierra-heightfield.bin', import.meta.url));
const terrain = parseAlpineHeightfield(bytes);

// Test the drawn triangles, including interpolated points between vertices.
function drawnHeight(geometry, x, z) {
  if (x < geometry.boundingBox.min.x || x > geometry.boundingBox.max.x
    || z < geometry.boundingBox.min.z || z > geometry.boundingBox.max.z) return -Infinity;
  const positions = geometry.getAttribute('position');
  const indices = geometry.index;
  let height = -Infinity;
  for (let index = 0; index < indices.count; index += 3) {
    const a = indices.getX(index), b = indices.getX(index + 1), c = indices.getX(index + 2);
    const ax = positions.getX(a), az = positions.getZ(a);
    const bx = positions.getX(b), bz = positions.getZ(b);
    const cx = positions.getX(c), cz = positions.getZ(c);
    if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx)
      || z < Math.min(az, bz, cz) || z > Math.max(az, bz, cz)) continue;
    const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(denominator) < 1e-10) continue;
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
    const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
    const w = 1 - u - v;
    if (u >= -1e-7 && v >= -1e-7 && w >= -1e-7) {
      height = Math.max(height, u * positions.getY(a) + v * positions.getY(b) + w * positions.getY(c));
    }
  }
  return height;
}

test('the bundled geological data retain metre scale, valley alignment and source provenance', () => {
  assert.equal(terrain.width, 513);
  assert.equal(terrain.height, 513);
  assert.equal(terrain.terrainBounds.width, 14000);
  assert.ok(sampleAlpineHeight(terrain, 0, 0) > -5 && sampleAlpineHeight(terrain, 0, 0) < 60,
    'the recentered origin must lie on the actual valley floor');
  assert.ok(terrain.metadata.maximum > 1400);
  assert.match(terrain.metadata.sourceDataset, /USGS/);
  assert.match(terrain.metadata.sourceSha256, /^[0-9a-f]{64}$/);
  assert.ok(terrain.metadata.nodataSampleFraction > 0 && terrain.metadata.nodataSampleFraction < .2);
  assert.equal(terrain.normalBytes.length, 513 * 513 * 4);
  assert.throws(() => parseAlpineHeightfield(bytes.subarray(0, bytes.length - 1)), /Truncated/);
  assert.throws(() => parseAlpineHeightfield(new Uint8Array(12)), /Invalid/);
});

test('heightfield headers must provide both finite world origins', () => {
  const headerLength = bytes.readUInt32LE(4);
  for (const missing of ['minX', 'minZ']) {
    const malformed = Buffer.from(bytes);
    const header = JSON.parse(bytes.subarray(8, 8 + headerLength).toString());
    delete header.bounds[missing];
    const replacement = Buffer.from(JSON.stringify(header));
    assert.ok(replacement.length <= headerLength);
    malformed.fill(32, 8, 8 + headerLength);
    replacement.copy(malformed, 8);
    assert.equal(malformed.length, bytes.length, 'payload length and sample data remain valid');
    assert.throws(() => parseAlpineHeightfield(malformed), /Invalid elevation dimensions/,
      `missing ${missing} must be rejected before it can create NaN geometry`);
  }
});

test('decorative DEM triangles are finite and stay below every playable corner', () => {
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(THREE, scene, { terrain, sky: false });
  try {
    const backdrop = scene.getObjectByName('AlpineBackdrop');
    assert.equal(backdrop.userData.decorative, true);
    assert.equal(backdrop.children.length, 48);
    const meshes = backdrop.children;
    for (const mesh of meshes) {
      assert.equal(mesh.castShadow, false);
      const geometry = mesh.geometry, positions = geometry.getAttribute('position');
      for (const name of ['position', 'normal', 'color', 'uv']) {
        assert.ok(geometry.getAttribute(name).array.every(Number.isFinite), `${name} must be finite`);
      }
      for (const index of geometry.index.array) assert.ok(index >= 0 && index < positions.count);
    }
    const coordinates = [-1450, -1350, -1200, -950, -600, 0, 600, 950, 1200, 1350, 1450];
    const quadrants = new Set();
    let covered = 0;
    for (const x of coordinates) for (const z of coordinates) {
      const height = Math.max(...meshes.map(mesh => drawnHeight(mesh.geometry, x, z)));
      if (!Number.isFinite(height)) continue;
      assert.ok(height < terrainHeight(x, z) - .1,
        `backdrop intrudes at ${x}, ${z}: ${height} versus terrain ${terrainHeight(x, z)}`);
      if (Math.abs(x) > 1000 && Math.abs(z) > 1000) quadrants.add(`${Math.sign(x)},${Math.sign(z)}`);
      covered++;
    }
    assert.ok(covered >= 60, 'the regression must exercise the actual overlap skirt');
    assert.equal(quadrants.size, 4);
  } finally { atmosphere.dispose(); }
});

test('different patch LODs share exactly the same boundary samples', () => {
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(THREE, scene, { terrain, sky: false });
  try {
    atmosphere.setQuality('low');
    atmosphere.update(new THREE.Vector3(0, 250, 0));
    const left = scene.getObjectByName('AlpinePatch-4-3').geometry;
    const right = scene.getObjectByName('AlpinePatch-5-3').geometry;
    assert.notEqual(left.index.count, right.index.count, 'the regression must compare different LODs');
    const edge = geometry => {
      const map = new Map(), position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) if (Math.abs(position.getX(i) - 3000) < .001) map.set(position.getZ(i), position.getY(i));
      return map;
    };
    const a = edge(left), b = edge(right);
    assert.equal(a.size, 65);
    assert.deepEqual(a, b);
  } finally { atmosphere.dispose(); }
});

test('camera updates move only optional sky and dispose owned resources once', () => {
  const scene = new THREE.Scene(), unrelated = new THREE.Group();
  scene.add(unrelated);
  const sharedMaterial = new THREE.MeshStandardMaterial();
  let sharedDisposed = 0;
  sharedMaterial.addEventListener('dispose', () => sharedDisposed++);
  const atmosphere = createAtmosphere(THREE, scene, { terrain, material: sharedMaterial });
  const sky = scene.getObjectByName('AlpineSky'), backdrop = scene.getObjectByName('AlpineBackdrop');
  const resources = new Set([sky.geometry, sky.material, sky.material.uniforms.clouds.value, atmosphere.terrainNormal]);
  const observed = new Map();
  const observe = () => {
    for (const mesh of backdrop.children) resources.add(mesh.geometry);
    for (const resource of resources) if (!observed.has(resource)) {
      observed.set(resource, 0);
      resource.addEventListener('dispose', () => observed.set(resource, observed.get(resource) + 1));
    }
  };
  observe();
  const camera = new THREE.Vector3(110, 800, -500);
  atmosphere.update(camera);
  assert.deepEqual(sky.position.toArray(), camera.toArray());
  camera.x += 50;
  assert.equal(sky.position.x, 110);
  atmosphere.setQuality('low');
  atmosphere.update(new THREE.Vector3(-300, 10, 1000));
  observe();
  assert.deepEqual(backdrop.position.toArray(), [0, 0, 0]);
  atmosphere.dispose();
  assert.deepEqual(scene.children, [unrelated]);
  for (const count of observed.values()) assert.equal(count, 1);
  assert.equal(sharedDisposed, 0, 'surface materials are owned by their caller');
  sharedMaterial.dispose();
});

test('unavailable elevation assets leave a safe empty decorative group', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  t.mock.method(console, 'warn', () => {});
  assert.equal(await loadAlpineHeightfield('https://example.invalid/terrain'), null);
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(THREE, scene, { sky: false });
  assert.equal(scene.getObjectByName('AlpineBackdrop').children.length, 0);
  atmosphere.update(new THREE.Vector3());
  atmosphere.dispose();
  assert.equal(scene.children.length, 0);
});
