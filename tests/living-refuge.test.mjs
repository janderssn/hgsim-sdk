import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { createLivingRefuge, REFUGE_LIFE_FOOTPRINTS } from '../range/living-refuge.js';
import { ALPINE_SITES } from '../range/alpine-sites.js';
import { physicalGroundHeight } from '../range/world.js';

test('inhabited refuge details align to the actual cabin and stay outside flight clearances', () => {
  const scene=new THREE.Scene();
  const life=createLivingRefuge(THREE,scene,{groundHeight:physicalGroundHeight});
  const site=ALPINE_SITES.find(site=>site.id==='landing-refuge'),c=Math.cos(site.yaw),s=Math.sin(site.yaw);
  const floor=Math.max(...[[-4.5,-3],[4.5,-3],[-4.5,3],[4.5,3]].map(([x,z])=>physicalGroundHeight(site.x+c*x+s*z,site.z-s*x+c*z)))+.28;
  assert.ok(Math.abs(life.chimney.x-(site.x+c*2.6+s*1.35))<1e-8);
  assert.ok(Math.abs(life.chimney.y-(floor+6.36))<1e-8);
  assert.ok(Math.abs(life.chimney.z-(site.z-s*2.6+c*1.35))<1e-8);
  assert.equal(life.stats.draws,4);
  assert.ok(life.stats.triangles>3000&&life.stats.triangles<18000);
  assert.ok(life.bounds.max.x<-50&&life.bounds.max.z<-330,'daily-life props stay beside the refuge');
  assert.deepEqual(life.footprints,REFUGE_LIFE_FOOTPRINTS);
  for(const mesh of life.group.children){
    for(const attribute of Object.values(mesh.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
  }
  life.dispose();assert.equal(scene.children.length,0);
});

test('linen is pinned at the rope and quality/animation reuse fixed resources', () => {
  const life=createLivingRefuge(THREE,new THREE.Scene());
  const linen=life.group.children.find(mesh=>mesh.material.name==='Drying woven linen');
  const smoke=life.group.getObjectByName('RefugeChimneySmoke');
  const weights=linen.geometry.attributes.linenFlutter.array;
  assert.ok(weights.some(v=>v===0)&&weights.some(v=>v===1));
  assert.ok(weights.every(v=>v>=0&&v<=1));
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  linen.material.onBeforeCompile(shader,{});
  assert.match(shader.vertexShader,/linenFlutter/);assert.match(shader.fragmentShader,/fwidth/);
  const original=linen.geometry.attributes.position.array.slice(),uniforms=shader.uniforms;
  const smokeUniform=smoke.material.uniforms.smokeWind.value;
  life.update(new THREE.Vector3(-76,0,-360),12,{x:4,z:-1});
  assert.equal(uniforms.refugeTime.value,12);
  assert.equal(smoke.material.uniforms.smokeWind.value,smokeUniform);
  assert.deepEqual(linen.geometry.attributes.position.array,original,'wind moves pinned mesh in the shader');
  life.setQuality('low');assert.equal(smoke.geometry.instanceCount,12);
  life.setQuality('medium');assert.equal(smoke.geometry.instanceCount,18);
  life.setQuality('high');assert.equal(smoke.geometry.instanceCount,24);
  assert.equal(life.setQuality('unknown'),false);
  life.update(new THREE.Vector3(0,0,3000),0,0);assert.equal(life.group.visible,false);
  life.dispose();
});

test('living refuge owns and disposes each resource once, with shared atmosphere hooks', () => {
  const scene=new THREE.Scene(),installed=new Set();
  const life=createLivingRefuge(THREE,scene,{atmosphere:{installMaterial(material){assert.ok(!installed.has(material));installed.add(material);}}});
  assert.equal(installed.size,3);
  const resources=new Set(life.group.children.flatMap(mesh=>[mesh.geometry,mesh.material]));
  const counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
  life.dispose();life.dispose();
  for(const resource of resources)assert.equal(counts.get(resource),1);
});
