import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { createRenderFinish } from '../range/render-finish.js';

function fixture(hdr = true) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const calls = [];
  let target = null;
  const renderer = {
    extensions: { has: () => hdr },
    capabilities: { maxSamples: 4 },
    info: { autoReset: true, reset() {} },
    xr: { enabled: true },
    getDrawingBufferSize: vector => vector.set(1280, 721),
    getRenderTarget: () => target,
    setRenderTarget: value => { target = value; },
    render(renderedScene) { calls.push({ scene: renderedScene, target }); },
  };
  return { renderer, scene, camera, calls, finish: createRenderFinish(THREE, renderer, scene, camera) };
}

test('contact occlusion reads depth from the original beauty pass, with no material override', () => {
  const { finish, renderer, scene, calls } = fixture();
  const original = new THREE.MeshBasicMaterial({ alphaTest: .35 });
  const tree = new THREE.Mesh(new THREE.PlaneGeometry(), original);
  scene.add(tree);
  try {
    finish.render();
    assert.equal(calls.length, 3);
    assert.equal(calls[0].scene, scene);
    assert.equal(scene.overrideMaterial, null);
    assert.equal(tree.material, original);
    assert.equal(calls[0].target.width, 1280);
    assert.equal(calls[0].target.height, 721);
    assert.equal(calls[0].target.depthTexture.isDepthTexture, true);
    assert.equal(calls[0].target.samples, 4);
    assert.equal(calls[1].target.width, 640);
    assert.equal(calls[1].target.height, 361);
    assert.equal(calls[2].target, null);
    assert.equal(renderer.getRenderTarget(), null);
    assert.equal(renderer.info.autoReset, true);
    assert.equal(renderer.xr.enabled, true);
  } finally { finish.dispose(); original.dispose(); tree.geometry.dispose(); }
});

test('low quality and devices without HDR buffers render directly', () => {
  for (const hdr of [true, false]) {
    const { finish, scene, calls } = fixture(hdr);
    if (hdr) finish.setQuality('low');
    try {
      finish.render();
      assert.equal(calls.length, 1);
      assert.equal(calls[0].scene, scene);
      assert.equal(calls[0].target, null);
    } finally { finish.dispose(); }
  }
});

test('medium reduces AO sampling and resolution and restores high without resizing the viewport', () => {
  const { finish, calls } = fixture();
  try {
    finish.render();
    finish.setQuality('medium');
    calls.length = 0;
    finish.render();
    assert.equal(calls[0].target.samples, 2);
    assert.equal(calls[1].target.width, 427);
    assert.equal(calls[1].target.height, 241);
    const output = calls[2].scene.children[0].material;
    assert.equal(output.uniforms.crossResolve.value, true);
    finish.setQuality('high');
    calls.length = 0;
    finish.render();
    assert.equal(calls[0].target.samples, 4);
    assert.equal(calls[1].target.width, 640);
    assert.equal(calls[1].target.height, 361);
    assert.equal(output.uniforms.crossResolve.value, false);
  } finally { finish.dispose(); }
});

test('a failed render restores the caller target, statistics mode, and XR state', () => {
  const { finish, renderer } = fixture();
  const target = new THREE.WebGLRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render = () => { throw new Error('lost context'); };
  try {
    assert.throws(() => finish.render(), /lost context/);
    assert.equal(renderer.getRenderTarget(), target);
    assert.equal(renderer.info.autoReset, true);
    assert.equal(renderer.xr.enabled, true);
  } finally { finish.dispose(); target.dispose(); }
});
