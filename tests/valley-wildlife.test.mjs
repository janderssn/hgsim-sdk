import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { createValleyWildlife } from '../range/valley-wildlife.js';

const ground = (x,z) => 10+x*.002+z*.001;
const options = {groundHeight:ground,thermal:{x:430,z:330,radius:160},
  refuge:{x:-76,z:-360,yaw:.15},lake:{jetty:[-385,150],level:9.2}};
const matrices = kit => kit.group.children.map(mesh=>Array.from(mesh.instanceMatrix.array));
const positionAt = (mesh,index) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mesh.instanceMatrix.array,index*16));

test('wildlife uses bounded modeled silhouettes with natural bird and insect scales', () => {
  const scene=new THREE.Scene(),kit=createValleyWildlife(THREE,scene,options);
  assert.equal(kit.group.children.length,3);
  let totalTriangles=0;
  for(const mesh of kit.group.children) {
    assert.ok(mesh.isInstancedMesh);
    assert.equal(mesh.material.transparent,false);
    assert.equal(mesh.material.emissive.getHex(),0);
    assert.equal(mesh.castShadow,false);
    for(const name of ['position','normal','color','wingFlex']) {
      assert.ok(mesh.geometry.attributes[name].array.every(Number.isFinite));
    }
    const flex=mesh.geometry.attributes.wingFlex.array;
    assert.ok(flex.some(value=>value===0)&&flex.some(value=>value>.4),'body is rigid while actual wing vertices articulate');
    assert.ok(mesh.geometry.boundingSphere.radius<1.3);
    totalTriangles+=mesh.count*mesh.geometry.attributes.position.count/3;
  }
  assert.ok(totalTriangles<5000);
  const [raptors,swallows,butterflies]=kit.group.children;
  assert.ok(raptors.geometry.attributes.position.count/3>400,'bird body, cambered planform and feathers are modeled');
  for(let i=0;i<butterflies.count;i++) {
    const scale=new THREE.Vector3().setFromMatrixScale(new THREE.Matrix4().fromArray(butterflies.instanceMatrix.array,i*16));
    const span=scale.x*(butterflies.geometry.boundingBox.max.x-butterflies.geometry.boundingBox.min.x);
    assert.ok(span>.07&&span<.11,'butterflies remain small meadow insects');
  }
  assert.ok(swallows.geometry.boundingBox.max.z-swallows.geometry.boundingBox.min.z>.7,'fork tail and body have real length');
  kit.dispose();assert.equal(scene.children.length,0);
});

test('thermal birds remain useful cues while local wildlife follows bounded ground paths', () => {
  const kit=createValleyWildlife(THREE,new THREE.Scene(),options),camera=new THREE.Vector3(-81,10,-365);
  const buffers=kit.group.children.map(mesh=>mesh.instanceMatrix.array);
  for(let time=0;time<300;time+=7.3) {
    kit.update(camera,time,{x:4,z:-2});
    const [raptors,,butterflies]=kit.group.children;
    for(let i=0;i<raptors.count;i++) {
      const p=positionAt(raptors,i);
      assert.ok(Math.hypot(p.x-430,p.z-330)<110);
      assert.ok(p.y-ground(430,330)>165&&p.y-ground(430,330)<280);
    }
    for(let i=0;i<butterflies.count;i++) {
      const p=positionAt(butterflies,i);
      assert.ok(p.y-ground(p.x,p.z)>.35&&p.y-ground(p.x,p.z)<.8,'hover remains close to the actual ground');
      assert.ok(Math.min(Math.hypot(p.x+76,p.z+360),Math.hypot(p.x+385,p.z-150))<20,'insects stay at their two living sites');
    }
    kit.group.children.forEach((mesh,i)=>assert.equal(mesh.instanceMatrix.array,buffers[i],'updates retain fixed instance buffers'));
  }
  assert.equal(kit.group.children[0].visible,true);
  assert.equal(kit.group.children[2].visible,true);
  kit.update(new THREE.Vector3(10000,800,10000),400,0);
  assert.equal(kit.stats.draws,0,'distant batches stop submitting');
  kit.dispose();
});

test('wildlife timing is deterministic and lower quality retains thermal markers', () => {
  const first=createValleyWildlife(THREE,new THREE.Scene(),options),second=createValleyWildlife(THREE,new THREE.Scene(),options);
  const camera=new THREE.Vector3(-81,10,-365);
  first.update(camera,123.4,{x:7,z:1});second.update(camera,123.4,{x:7,z:1});
  assert.deepEqual(matrices(first),matrices(second));
  assert.equal(first.setQuality('medium'),true);first.update(camera,124,0);
  assert.equal(first.stats.raptors,4);assert.equal(first.stats.swallows,2);assert.equal(first.stats.butterflies,4);
  assert.equal(first.setQuality('low'),true);first.update(camera,125,0);
  assert.equal(first.stats.raptors,3);assert.equal(first.stats.swallows,0);assert.equal(first.stats.butterflies,0);
  assert.equal(first.group.children[0].visible,true);assert.equal(first.stats.draws,1);
  assert.equal(first.setQuality('low'),false);assert.equal(first.setQuality('unknown'),false);
  assert.equal(first.setQuality('high'),true);first.update(camera,123.4,{x:7,z:1});
  assert.deepEqual(matrices(first),matrices(second),'quality changes never change authored paths');
  first.dispose();second.dispose();
});

test('wing deformation composes with atmosphere and all owned GPU resources dispose once', () => {
  const installed=new Set();
  const kit=createValleyWildlife(THREE,new THREE.Scene(),{...options,atmosphere:{installMaterial(material){
    assert.ok(!installed.has(material));installed.add(material);
    const previous=material.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{previous(shader,renderer);shader.vertexShader+='\n// shared atmosphere';};
  }}});
  assert.equal(installed.size,3);
  const resources=[],released=new Map();
  for(const mesh of kit.group.children) {
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    mesh.material.onBeforeCompile(shader,{});
    assert.match(shader.vertexShader,/objectNormal\.xy=mat2/,'wing normals rotate with the surface');
    assert.match(shader.vertexShader,/transformed\.xy=mat2/);
    assert.match(shader.vertexShader,/shared atmosphere/);
    assert.ok(shader.uniforms.wildlifeCamera.value.isVector3);
    resources.push(mesh,mesh.geometry,mesh.material);
  }
  for(const resource of resources)resource.addEventListener('dispose',()=>released.set(resource,(released.get(resource)||0)+1));
  kit.dispose();kit.dispose();
  for(const resource of resources)assert.equal(released.get(resource),1);
  assert.equal(kit.setQuality('low'),false);
  assert.doesNotThrow(()=>kit.update(new THREE.Vector3(),0,0));
});
