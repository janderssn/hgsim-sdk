import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { downsampleRadiance, estimateSun, integrateIrradiance } from '../range/lighting.js';

test('HDR reduction preserves linear radiance and leaves the photographic source untouched', () => {
  const data = new Uint16Array(8 * 4 * 4);
  let sourceEnergy = 0;
  for (let pixel = 0; pixel < 8 * 4; pixel++) {
    const radiance = pixel % 3 === 0 ? 4096 : 1;
    sourceEnergy += radiance;
    for (let channel = 0; channel < 3; channel++) {
      data[pixel * 4 + channel] = THREE.DataUtils.toHalfFloat(radiance);
    }
    data[pixel * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const original = data.slice();
  const source = new THREE.DataTexture(data, 8, 4, THREE.RGBAFormat, THREE.HalfFloatType);
  source.flipY = true;
  const reduced = downsampleRadiance(THREE, source, 4);
  assert.equal(reduced.image.width, 4);
  assert.equal(reduced.image.height, 2);
  assert.equal(reduced.type, THREE.FloatType);
  assert.equal(reduced.colorSpace, THREE.LinearSRGBColorSpace);
  assert.equal(reduced.flipY, true);
  let reducedEnergy = 0;
  for (let pixel = 0; pixel < 8; pixel++) reducedEnergy += reduced.image.data[pixel * 4];
  assert.equal(reducedEnergy * 4, sourceEnergy, 'the sun must retain its HDR energy after reduction');
  assert.ok(Math.max(...reduced.image.data) > 255, 'radiance must not be clipped to display bytes');
  assert.deepEqual(source.image.data, original);
  assert.equal(downsampleRadiance(THREE, source, 16), source);
  assert.throws(() => downsampleRadiance(THREE,
    new THREE.DataTexture(new Uint8Array(4), 1, 1)), /floating-point linear radiance/);
  reduced.dispose();
  source.dispose();
});

test('the directional key points at the sun in the unrotated equirectangular sky', () => {
  const width = 16, height = 8;
  const data = new Float32Array(width * height * 4);
  const column = 12, row = 2;
  data[(row * width + column) * 4] = 1000;
  data[(row * width + column) * 4 + 1] = 500;
  data[(row * width + column) * 4 + 2] = 250;
  // A brighter ground reflection must not become the directional sun.
  data[((height - 1) * width + 2) * 4] = 10000;
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.flipY = true;
  const { sunDirection, sunColor } = estimateSun(THREE, texture);
  const direction = new THREE.Vector3(...sunDirection);
  assert.ok(Math.abs(direction.length() - 1) < 1e-12);
  // The shader samples u=atan(z,x)/(2π)+½, v=asin(y)/π+½;
  // HDRLoader's flipped image has row zero at the zenith.
  const u = Math.atan2(direction.z, direction.x) / (2 * Math.PI) + .5;
  const v = Math.asin(direction.y) / Math.PI + .5;
  assert.ok(Math.abs(u - (column + .5) / width) < 1e-12);
  assert.ok(Math.abs(v - (1 - (row + .5) / height)) < 1e-12);
  assert.equal(sunColor, new THREE.Color(1, .5, .25).getHex(THREE.SRGBColorSpace));
  texture.dispose();
});

test('a constant HDR environment gives π times its radiance on every surface', () => {
  const width = 256, height = 128;
  const radiance = [2, 1, .5];
  const data = new Uint16Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      data[pixel * 4 + channel] = THREE.DataUtils.toHalfFloat(radiance[channel]);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  const probe = integrateIrradiance(THREE, texture);
  assert.equal(probe.isLightProbe, true);
  assert.equal(probe.intensity, 1);
  for (const normal of [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, -2, 3).normalize()]) {
    const irradiance = probe.sh.getIrradianceAt(normal, new THREE.Vector3()).toArray();
    irradiance.forEach((value, channel) => {
      assert.ok(Math.abs(value - Math.PI * radiance[channel]) < .0005,
        `constant radiance must conserve diffuse energy: ${value}`);
    });
  }
  texture.dispose();
});

test('a brighter upper sky produces the matching analytic diffuse illumination', () => {
  const width = 256, height = 128;
  const data = new Float32Array(width * height * 4);
  // L(y)=2+y has an exact hemispherical irradiance of 2π+(2π/3)normal.y.
  for (let row = 0; row < height; row++) {
    const y = Math.sin((.5 - (row + .5) / height) * Math.PI);
    for (let column = 0; column < width; column++) {
      const index = (row * width + column) * 4;
      data[index] = data[index + 1] = data[index + 2] = 2 + y;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.flipY = true;
  const probe = integrateIrradiance(THREE, texture);
  for (const normal of [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(1, 0, 0)]) {
    const irradiance = probe.sh.getIrradianceAt(normal, new THREE.Vector3());
    const expected = 2 * Math.PI + 2 * Math.PI / 3 * normal.y;
    assert.ok(Math.abs(irradiance.x - expected) < .0007,
      `the light probe must align the HDR sky with world up: ${irradiance.x} vs ${expected}`);
    assert.ok(Math.abs(irradiance.y - expected) < .0007);
    assert.ok(Math.abs(irradiance.z - expected) < .0007);
  }
  texture.dispose();
});
