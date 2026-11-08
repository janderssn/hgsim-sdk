import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { AERIAL_QUALITY, createAerialAtmosphere, sampleSkyRadiance, atmosphereTransmittance } from '../range/aerial-atmosphere.js';
import { CLOUD_FIELD, bakeCloudShape, bakeCloudShadow, sampleCloudDensity, cloudShadowCoordinates } from '../range/cloud-field.js';

const sun = new THREE.Vector3(.5904601, .6817721, .4319070).normalize();
const create = () => createAerialAtmosphere(THREE, { sunDirection: sun, shapeSize: 16, shadowSize: 16 });
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test('spectral aerial extinction has correct distance, altitude and reciprocal-path behaviour', () => {
  assert.deepEqual(atmosphereTransmittance(0, 200, 200), [1, 1, 1]);
  assert.deepEqual(atmosphereTransmittance(-100), [1, 1, 1]);
  for (const distance of [100, 1200, 8000]) {
    const lower = atmosphereTransmittance(distance, 0, 0);
    const upper = atmosphereTransmittance(distance, 1800, 1800);
    assert.ok(lower.every((channel, i) => channel > 0 && channel < upper[i] && upper[i] < 1));
    assert.ok(lower[0] > lower[1] && lower[1] > lower[2], 'short blue wavelengths scatter most strongly');
    const rising = atmosphereTransmittance(distance, 120, 2300);
    const descending = atmosphereTransmittance(distance, 2300, 120);
    rising.forEach((channel, i) => near(channel, descending[i]));
  }
  // The analytic exponential-height integral agrees with independent numerical
  // quadrature along a steep ray; a mean-height approximation does not.
  const start = 150, end = 2700, distance = 9000, bins = 20000;
  const beta = [5.8e-6, 13.5e-6, 33.1e-6];
  const opticalDepth = [0, 0, 0];
  for (let i = 0; i < bins; i++) {
    const y = start + (end - start) * (i + .5) / bins;
    for (let c = 0; c < 3; c++) opticalDepth[c] += (beta[c] * Math.exp(-y / 8000) + 2.4e-5 * Math.exp(-y / 1200)) * distance / bins;
  }
  atmosphereTransmittance(distance, start, end).forEach((channel, i) => near(channel, Math.exp(-opticalDepth[i]), 1e-9));
});

test('illustrated aerial depth preserves the near corridor and smoothly separates distant slopes', () => {
  const style = { style: 'illustrated-alpine' };
  assert.deepEqual(atmosphereTransmittance(500, 200, 300, style), atmosphereTransmittance(500, 200, 300));
  const distant = atmosphereTransmittance(3500, 200, 1000, style);
  const clear = atmosphereTransmittance(3500, 200, 1000);
  assert.ok(distant.every((channel, i) => channel > 0 && channel < clear[i] * .9));
  const reverse = atmosphereTransmittance(3500, 1000, 200, style);
  distant.forEach((channel, i) => near(channel, reverse[i]));
  for (const distance of [700, 3000]) {
    const before = atmosphereTransmittance(distance - .01, 200, 500, style);
    const after = atmosphereTransmittance(distance + .01, 200, 500, style);
    before.forEach((channel, i) => near(channel, after[i], .00001));
  }
});

test('single-scattering sky is finite at the horizon and sun-aligned across sky and IBL', () => {
  for (const elevation of [-1, -.035, -1e-9, 0, .001, .5, 1]) {
    const value = sampleSkyRadiance([Math.sqrt(1 - elevation ** 2), elevation, 0], sun);
    assert.ok(value.every(channel => Number.isFinite(channel) && channel >= 0 && channel < 200));
  }
  const zenith = sampleSkyRadiance([0, 1, 0], sun);
  assert.ok(zenith[2] > zenith[1] && zenith[1] > zenith[0]);
  const disc = sampleSkyRadiance(sun, sun), glow = sampleSkyRadiance(sun, sun, { sunDisk: false });
  assert.ok(disc[0] > glow[0] * 10, 'the fixed directional sun also determines the sky disc');
  const aerial = create();
  try {
    const texture = aerial.generateRadiance(THREE, 32, 16);
    assert.equal(texture.type, THREE.FloatType);
    assert.equal(texture.mapping, THREE.EquirectangularReflectionMapping);
    assert.equal(texture.colorSpace, THREE.NoColorSpace);
    const x = 7, y = 11, latitude = ((y + .5) / 16 - .5) * Math.PI;
    const longitude = ((x + .5) / 32 - .5) * Math.PI * 2;
    const ray = [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)];
    const expected = aerial.sampleSkyRadiance(ray, { sunDisk: false });
    const offset = (y * 32 + x) * 4;
    expected.forEach((channel, i) => near(texture.image.data[offset + i], channel, 1e-6));
    assert.equal(texture.image.data[offset + 3], 1);
    texture.dispose();
  } finally { aerial.dispose(); }
});

test('illustrated afternoon keeps one linear solar colour across sky, IBL and cloud lighting', () => {
  const direction = new THREE.Vector3(.7, .45, .55).normalize();
  const sunColor = new THREE.Color().setRGB(1, .83, .64);
  const style = 'illustrated-alpine';
  const aerial = createAerialAtmosphere(THREE, { sunDirection: direction, sunColor, style,
    shapeSize: 16, shadowSize: 16 });
  try {
    assert.deepEqual(aerial.uniforms.aerialSunColor.value.toArray(), [1, .83, .64]);
    const disc = aerial.sampleSkyRadiance(direction), diffuse = aerial.sampleSkyRadiance(direction, { sunDisk: false });
    const transmittance = aerial.uniforms.aerialSunTransmittance.value.toArray();
    [1, .83, .64].forEach((channel, i) => near((disc[i] - diffuse[i]) / (160 * transmittance[i]), channel, 1e-10));
    const zenith = aerial.sampleSkyRadiance([0, 1, 0], { sunDisk: false });
    assert.ok(zenith[0] < zenith[1] * .5 && zenith[1] > zenith[2] * .55,
      'warm direct sunlight leaves a saturated cyan-blue diffuse sky');
    const reference = sampleSkyRadiance([0, 1, 0], direction, { sunColor, style, sunDisk: false });
    zenith.forEach((channel, i) => near(channel, reference[i]));
    const ibl = aerial.generateRadiance(THREE, 32, 16);
    for (const [x, y] of [[3, 12], [18, 10], [21, 5]]) {
      const lat = ((y + .5) / 16 - .5) * Math.PI, lon = ((x + .5) / 32 - .5) * Math.PI * 2;
      const sample = aerial.sampleSkyRadiance([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)], { sunDisk: false });
      sample.forEach((channel, i) => near(channel, ibl.image.data[(y * 32 + x) * 4 + i], 1e-6));
    }
    assert.ok(aerial.uniforms.aerialInscatterTint.value.z > aerial.uniforms.aerialInscatterTint.value.y,
      'the height-integrated aerial spectrum shifts toward slate/lavender');
    ibl.dispose();
  } finally { aerial.dispose(); }
});

test('periodic 3D cloud banks and their sun optical-depth map share one medium', () => {
  const shape = bakeCloudShape(24);
  assert.deepEqual(bakeCloudShape(24), shape, 'reloading uses the same deterministic field');
  assert.throws(() => bakeCloudShape(0), /size/);
  for (const [x, y, z] of [[-300, 2500, 900], [2300, 2900, -8000], [6400, 3100, 300]]) {
    const value = sampleCloudDensity(shape, x, y, z);
    near(value, sampleCloudDensity(shape, x + CLOUD_FIELD.period, y, z));
    near(value, sampleCloudDensity(shape, x, y, z - CLOUD_FIELD.period));
    assert.equal(sampleCloudDensity(shape, x, 2200, z), 0);
    assert.equal(sampleCloudDensity(shape, x, 3600, z), 0);
  }
  let occupied = 0;
  for (let x = 0; x < CLOUD_FIELD.period; x += 800) for (let z = 0; z < CLOUD_FIELD.period; z += 800) {
    const y = CLOUD_FIELD.bottom + (CLOUD_FIELD.top - CLOUD_FIELD.bottom) * .35;
    const density = sampleCloudDensity(shape, x, y, z);
    if (density < .04) continue;
    occupied++;
    near(density, sampleCloudDensity(shape, x + CLOUD_FIELD.period, y, z));
    near(density, sampleCloudDensity(shape, x, y, z - CLOUD_FIELD.period));
  }
  assert.ok(occupied > 0, 'periodicity must exercise occupied cloud, not only clear samples');
  const shadow = bakeCloudShadow(shape, sun, 32, 24);
  assert.ok(shadow.data.some(x => x === 0), 'clear sky leaves real sunlit gaps');
  assert.ok(shadow.data.some(x => x > 200), 'thick banks cast readable shadows');
  for (const [x, z] of [[2, 7], [15, 21], [27, 4]]) {
    const wx = (x + .5) / shadow.size * CLOUD_FIELD.period;
    const wz = (z + .5) / shadow.size * CLOUD_FIELD.period;
    const slices = 512, step = (CLOUD_FIELD.top - CLOUD_FIELD.bottom) / slices;
    let tau = 0;
    for (let i = 0; i < slices; i++) {
      const y = CLOUD_FIELD.bottom + (i + .5) * step;
      tau += sampleCloudDensity(shape, wx + sun.x / sun.y * y, y, wz + sun.z / sun.y * y) * step / sun.y * CLOUD_FIELD.extinction;
    }
    near(shadow.data[z * shadow.size + x] / 255, 1 - Math.exp(-tau), .045);
  }
});

test('cloud shadows remain fixed in world space and correctly project different object heights', () => {
  const point = new THREE.Vector3(410, 90, -720);
  const sameRay = point.clone().addScaledVector(sun, 1300);
  const a = cloudShadowCoordinates(point, sun), b = cloudShadowCoordinates(sameRay, sun);
  a.forEach((coordinate, i) => near(coordinate, b[i]));
  const after = cloudShadowCoordinates(point, sun, 30);
  near(after[0] - a[0], -CLOUD_FIELD.windX * 30 / CLOUD_FIELD.period);
  near(after[1] - a[1], -CLOUD_FIELD.windZ * 30 / CLOUD_FIELD.period);
});

test('material hooks compose once, preserve instancing, and scatter in linear light', () => {
  const aerial = create(), material = new THREE.MeshStandardMaterial();
  let previousCalls = 0;
  material.onBeforeCompile = shader => { previousCalls++; shader.fragmentShader += '\n// previous surface patch'; };
  material.customProgramCacheKey = () => 'photographic-surface';
  try {
    aerial.installMaterial(material); aerial.installMaterial(material);
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader, {});
    assert.equal(previousCalls, 1);
    assert.match(material.customProgramCacheKey(), /^photographic-surface\|above-aerial/);
    assert.match(shader.vertexShader, /aerialWorld = instanceMatrix \* aerialWorld/);
    assert.match(shader.vertexShader, /aerialWorld = batchingMatrix \* aerialWorld/);
    assert.match(shader.vertexShader, /aerialSegment\(vAerialWorldPosition, vAerialTransmittance, vAerialInscatter\)/);
    assert.doesNotMatch(shader.fragmentShader, /aerialPathIntegral|aerialSkyRadiance|aerialSegment/);
    assert.match(shader.fragmentShader, /previous surface patch/);
    assert.equal(shader.uniforms.aerialSunDirection, aerial.uniforms.aerialSunDirection);
    assert.match(shader.fragmentShader, /reflectedLight\.directDiffuse \*= aerialBeamVisibility/);
    assert.doesNotMatch(shader.fragmentShader, /reflectedLight\.indirectDiffuse \*= aerialBeamVisibility/);
    assert.doesNotMatch(shader.fragmentShader, /#include <fog_fragment>/);
    assert.ok(shader.fragmentShader.indexOf('gl_FragColor.rgb = gl_FragColor.rgb * vAerialTransmittance') < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'));
  } finally { material.dispose(); aerial.dispose(); }
});

test('cloned surface callbacks nested in a ground-cover wrapper keep one complete aerial program', () => {
  const aerial = create(), source = new THREE.MeshStandardMaterial();
  let surfaceCompiles = 0, coverCompiles = 0;
  source.onBeforeCompile = shader => {
    surfaceCompiles++;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\ndiffuseColor.rgb *= vec3(0.8, 0.9, 1.0); // inherited surface');
  };
  source.customProgramCacheKey = () => 'granite-surface';
  aerial.installMaterial(source);
  const pebble = source.clone();
  const inheritedCompile = source.onBeforeCompile;
  // This is the production composition: clone() does not copy callbacks, so
  // coverMaterial explicitly invokes its source callback, then adds wind.
  pebble.onBeforeCompile = function (shader, renderer) {
    coverCompiles++;
    inheritedCompile.call(this, shader, renderer);
    shader.uniforms.coverWind = { value: .15 };
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x += 0.15; // cloned cover deformation');
  };
  pebble.customProgramCacheKey = () => `${source.customProgramCacheKey()}|streamed-cover`;
  try {
    // A later scene traversal installs the common atmosphere on every mesh.
    aerial.installMaterial(pebble);
    for (let compile = 0; compile < 2; compile++) {
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      pebble.onBeforeCompile(shader, {});
      assert.equal(shader.vertexShader.match(/varying vec3 vAerialWorldPosition;/g)?.length, 1);
      assert.equal(shader.vertexShader.match(/vec4 aerialWorld =/g)?.length, 1);
      assert.equal(shader.vertexShader.match(/vec3 aerialApply\(/g)?.length, 1);
      assert.equal(shader.fragmentShader.match(/float aerialCloudVisibility\(/g)?.length, 1);
      assert.equal(shader.fragmentShader.match(/gl_FragColor\.rgb = gl_FragColor\.rgb \* vAerialTransmittance/g)?.length, 1);
      assert.equal(shader.fragmentShader.match(/reflectedLight\.directDiffuse \*= aerialBeamVisibility/g)?.length, 1);
      assert.match(shader.fragmentShader, /inherited surface/);
      assert.match(shader.vertexShader, /cloned cover deformation/);
      assert.equal(shader.uniforms.coverWind.value, .15);
      assert.equal(shader.uniforms.aerialCloudShadow, aerial.uniforms.aerialCloudShadow);
    }
    assert.equal(surfaceCompiles, 2);
    assert.equal(coverCompiles, 2);
  } finally { source.dispose(); pebble.dispose(); aerial.dispose(); }
});

test('cloud work is capped at 4K, follows camera without moving the field, and restores render state', () => {
  const aerial = create(), camera = new THREE.PerspectiveCamera(56, 16 / 9, .4, 16000);
  camera.position.set(200, 500, -1000);
  const target = {}, seen = [], resources = new Set([aerial.sky.geometry, aerial.sky.material]);
  const renderer = {
    current: target, xr: { enabled: true }, info: { autoReset: true },
    extensions: { has: () => true },
    getDrawingBufferSize: v => v.set(3840, 2160),
    getRenderTarget() { return this.current; },
    setRenderTarget(value) { this.current = value; },
    render(scene) {
      seen.push([this.current.width, this.current.height]); resources.add(this.current);
      for (const mesh of scene.children) {
        resources.add(mesh.geometry); resources.add(mesh.material);
        for (const uniform of Object.values(mesh.material.uniforms)) if (uniform.value?.isTexture) resources.add(uniform.value);
      }
    },
  };
  try {
    for (const level of ['high', 'medium', 'low']) {
      aerial.setQuality(level); aerial.render(renderer, camera, 20);
      const budget = AERIAL_QUALITY[level], [width, height] = seen.at(-1);
      assert.ok(width <= budget.maxWidth && height <= budget.maxHeight);
      assert.equal(renderer.current, target);
      assert.equal(renderer.xr.enabled, true);
      assert.equal(renderer.info.autoReset, true);
    }
    assert.deepEqual(aerial.sky.position.toArray(), camera.position.toArray());
    assert.deepEqual(aerial.uniforms.aerialWindOffset.value.toArray(), [CLOUD_FIELD.offsetX + 84, CLOUD_FIELD.offsetZ + 26]);
    renderer.extensions.has = () => false;
    aerial.render(renderer, camera, 20);
    assert.equal(aerial.sky.material.uniforms.cloudDecodeScale.value, 4,
      'RGBA8 fallback still displays the same volume that casts ground shadows');
    assert.equal(aerial.sky.material.uniforms.cloudRadiance.value.type, THREE.UnsignedByteType);
    const fixedShadow = aerial.uniforms.aerialCloudShadow.value;
    camera.position.x += 900; aerial.update(camera, 20);
    assert.equal(aerial.uniforms.aerialCloudShadow.value, fixedShadow);
    renderer.render = () => { throw new Error('simulated GPU failure'); };
    assert.throws(() => aerial.render(renderer, camera), /simulated GPU/);
    assert.equal(renderer.current, target); assert.equal(renderer.xr.enabled, true); assert.equal(renderer.info.autoReset, true);
    const counts = new Map();
    for (const resource of resources) {
      counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
    aerial.dispose(); aerial.dispose();
    for (const count of counts.values()) assert.equal(count, 1);
  } finally { aerial.dispose(); }
});
