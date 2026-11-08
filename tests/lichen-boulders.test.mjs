import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { createLichenBoulders, createWeatheredBoulderGeometry } from '../range/lichen-boulders.js';
import { physicalGroundHeight, rockSurfaceAt } from '../range/world.js';
import { sampleAlpineSiteGround } from '../range/alpine-sites.js';

test('rounded granite has welded smooth normals and finite bounded silhouette', () => {
  for (let variant = 0; variant < 4; variant++) {
    const geometry = createWeatheredBoulderGeometry(THREE, variant);
    assert.ok(geometry.attributes.position.count < geometry.index.count / 2);
    for (const attribute of ['position', 'normal', 'color']) assert.ok(geometry.attributes[attribute].array.every(Number.isFinite));
    assert.ok(geometry.boundingSphere.radius < 1.5);
    const normal = geometry.attributes.normal;
    for (let i = 0; i < normal.count; i++) assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < 1e-5);
    geometry.dispose();
  }
});

test('boulder clusters frame the staging area without occupying structures or launch corridors', () => {
  const scene = new THREE.Scene();
  const kit = createLichenBoulders(THREE, scene, { groundHeight: physicalGroundHeight, siteAt: sampleAlpineSiteGround });
  assert.ok(kit.stats.rocks > 50 && kit.stats.rocks <= 108);
  assert.ok(kit.stats.triangles < 130000 && kit.stats.draws === 4);
  for (const record of kit.records) {
    assert.ok(record.x < -17 || record.x > 60);
    assert.equal(record.y, physicalGroundHeight(record.x, record.z));
    assert.equal(kit.coverageAt(record.x, record.z), 1);
    const site = sampleAlpineSiteGround(record.x, record.z);
    assert.ok(site.path <= .35 && site.occupied <= .1);
  }
  assert.equal(kit.coverageAt(0, 0), 0);
  kit.dispose(); assert.equal(scene.children.length, 0);
});

test('launch staging shelf is physically walkable rather than a pointed summit', () => {
  for (const [x,z] of [[-30,-620],[-33,-623],[-27,-617],[-32,-616]]) {
    const sample = rockSurfaceAt(x,z);
    assert.ok(sample && sample.slope < .12);
    assert.ok(Math.abs(sample.height - 250.5) < .2);
  }
});

test('rock kit preserves shared scanned texture ownership and composes the source projection', () => {
  const normalMap = new THREE.Texture(), albedo = new THREE.Texture();
  const source = new THREE.MeshStandardMaterial({ normalMap });
  let sourceCalls = 0, disposedTexture = 0, disposedSource = 0;
  normalMap.addEventListener('dispose', () => disposedTexture++); albedo.addEventListener('dispose', () => disposedTexture++);
  source.addEventListener('dispose', () => disposedSource++);
  source.onBeforeCompile = shader => { sourceCalls++; shader.uniforms.surfaceGranitePaint = { value: null }; };
  const kit = createLichenBoulders(THREE, new THREE.Scene(), { groundHeight: () => 0, sourceMaterial: source, maps: { color: albedo } });
  const owned = kit.group.children[0].material;
  assert.notEqual(owned, source); assert.equal(owned.normalMap, normalMap);
  const shader = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <color_fragment>' };
  owned.onBeforeCompile(shader);
  assert.equal(sourceCalls, 1); assert.equal(shader.uniforms.surfaceGranitePaint.value, albedo);
  const resources = [...kit.group.children, ...kit.group.children.map(mesh => mesh.geometry), owned];
  const releases = new Map(resources.map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => releases.set(resource, releases.get(resource) + 1));
  kit.dispose(); kit.dispose();
  for (const count of releases.values()) assert.equal(count, 1, 'instance buffers, geometry and material are released exactly once');
  assert.equal(disposedTexture, 0); assert.equal(disposedSource, 0);
  source.dispose(); normalMap.dispose(); albedo.dispose();
});
