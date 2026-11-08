import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../range/vendor/three.module.js';
import { terrainHeight } from '../range/world.js';
import { ALPINE_LAKE, getAlpineLakeField, alpineLakeDepthAt, alpineLakeExclusionAt,
  createAlpineWaterscape } from '../range/alpine-waterscape.js';

test('tarn occupies a closed existing basin and follows the exact terrain triangles',()=>{
  const field=getAlpineLakeField();
  assert.equal(getAlpineLakeField(),field,'basin topology is built once');
  assert.ok(field.area>50000&&field.area<60000);
  assert.ok(field.maxDepth>1&&field.maxDepth<1.2);
  for(const polygon of field.polygons)for(const point of polygon){
    assert.ok(Math.hypot(point.x,point.z)>150,'water keeps the entire landing field dry');
    assert.ok(point.x>ALPINE_LAKE.bounds.minX&&point.x<ALPINE_LAKE.bounds.maxX);
    assert.ok(point.z>ALPINE_LAKE.bounds.minZ&&point.z<ALPINE_LAKE.bounds.maxZ,'basin never reaches the search boundary');
    assert.ok(Math.abs(alpineLakeDepthAt(point.x,point.z)-point.depth)<.0001,
      'shoreline depth agrees with the sampled contact triangle');
  }
  for(let z=-800;z<=100;z+=20)for(let x=-150;x<=150;x+=20){
    assert.equal(alpineLakeDepthAt(x,z),0);assert.equal(alpineLakeExclusionAt(x,z),0);
  }
  assert.ok(alpineLakeDepthAt(...ALPINE_LAKE.seed)>.5);
  assert.equal(alpineLakeExclusionAt(...ALPINE_LAKE.seed),1);
  assert.equal(alpineLakeExclusionAt(430,330),0,'thermal remains unchanged');
});

test('water and shore kit are bounded, grounded and animate without rebuilding resources',()=>{
  const scene=new THREE.Scene(),kit=createAlpineWaterscape(THREE,scene,{groundHeight:terrainHeight});
  assert.ok(kit.stats.draws<=5&&kit.stats.triangles<19000);
  assert.ok(kit.stats.shoreStones>30&&kit.stats.reeds>200);
  const p=kit.water.geometry.attributes.position,n=kit.water.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
    assert.ok(Math.abs(p.getY(i)-ALPINE_LAKE.level-.008)<1e-5);
    assert.ok(n.getY(i)>.999,'water triangles face upward');
  }
  const geometries=[],matrices=[];
  kit.group.traverse(o=>{if(!o.isMesh)return;geometries.push(o.geometry);matrices.push(o.matrix.clone());
    for(const a of Object.values(o.geometry.attributes))assert.ok(a.array.every(Number.isFinite));
    assert.ok(o.geometry.boundingSphere?.radius>0);
  });
  for(const level of ['low','medium','high']){
    assert.equal(kit.setQuality(level),true);kit.update(new THREE.Vector3(-374,7,137),10,{x:4,z:2});
    let i=0;kit.group.traverse(o=>{if(!o.isMesh)return;assert.equal(o.geometry,geometries[i]);assert.ok(o.matrix.equals(matrices[i++]));});
  }
  assert.equal(kit.setQuality('unknown'),false);
  assert.ok(Math.abs(kit.boatAnchor.position.y-ALPINE_LAKE.level)<=.025);
  kit.dispose();assert.equal(scene.children.length,0);
});

test('water inherits sky reflection and atmosphere without owning external resources',()=>{
  const scene=new THREE.Scene(),environment=new THREE.Texture(),installed=new Set();
  let externalDisposals=0;environment.addEventListener('dispose',()=>externalDisposals++);
  const kit=createAlpineWaterscape(THREE,scene,{environment,atmosphere:{installMaterial(material){
    assert.ok(!installed.has(material));installed.add(material);
  }}});
  assert.equal(kit.water.material.envMap,environment);
  assert.equal(installed.size,5);
  const resources=new Set();kit.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
  const counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  kit.water.material.onBeforeCompile(shader,{});
  assert.match(shader.fragmentShader,/fwidth\(a\)/,'wave normals filter at flight distance');
  assert.match(shader.fragmentShader,/lakeAbsorb/);
  assert.match(shader.fragmentShader,/outgoingLight=mix\(outgoingLight,lakeReflected/,'reflection joins linear light before tone mapping');
  assert.match(shader.vertexShader,/vLakeReflection=lakeReflectionMatrix/);
  kit.dispose();kit.dispose();
  for(const resource of resources)assert.equal(counts.get(resource),1);
  assert.equal(externalDisposals,0);environment.dispose();
});

test('bounded planar reflection clips the underwater half-space and restores renderer state',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(56,1.6,.4,16000);
  camera.position.set(-374,7,137);camera.lookAt(-350,2,215);camera.updateMatrixWorld(true);
  const atmosphereCamera=new THREE.Vector3(20,30,40);
  const kit=createAlpineWaterscape(THREE,scene,{atmosphere:{uniforms:{aerialCameraPosition:{value:atmosphereCamera}}}});
  const cover=new THREE.Group();cover.userData.groundCover=true;scene.add(cover);
  const extra=new THREE.Group();extra.visible=false;extra.userData.skipWaterReflection=true;scene.add(extra);
  const originalTarget={},originalColor=new THREE.Color(.3,.4,.5),seen=[];
  const renderer={
    current:originalTarget,xr:{enabled:true},shadowMap:{autoUpdate:true,needsUpdate:true},info:{autoReset:true},
    autoClear:true,toneMapping:THREE.ACESFilmicToneMapping,clearColor:originalColor.clone(),clearAlpha:.4,
    viewport:new THREE.Vector4(1,2,1280,800),scissor:new THREE.Vector4(3,4,1200,700),scissorTest:true,
    extensions:{has:()=>true},getDrawingBufferSize:v=>v.set(1280,800),
    getRenderTarget(){return this.current;},setRenderTarget(v){this.current=v;},
    getClearColor(v){return v.copy(this.clearColor);},getClearAlpha(){return this.clearAlpha;},
    setClearColor(v,a){this.clearColor.set(v);this.clearAlpha=a;},
    getViewport(v){return v.copy(this.viewport);},setViewport(v,y,w,h){v?.isVector4?this.viewport.copy(v):this.viewport.set(v,y,w,h);},
    getScissor(v){return v.copy(this.scissor);},setScissor(v){this.scissor.copy(v);},
    getScissorTest(){return this.scissorTest;},setScissorTest(v){this.scissorTest=v;},clear(){},
    render(s,c){seen.push(c.clone());assert.equal(kit.water.visible,false);assert.equal(cover.visible,false);
      assert.equal(this.shadowMap.autoUpdate,false);assert.equal(this.shadowMap.needsUpdate,false);
      assert.equal(this.toneMapping,THREE.NoToneMapping);assert.ok(atmosphereCamera.equals(c.position));
    },
  };
  let skies=0;
  const sky=(r,c)=>{skies++;assert.equal(r.current,kit.reflectionTarget);assert.ok(c.position.y<0);};
  assert.equal(kit.renderReflection(renderer,camera,{seconds:1,renderSky:sky}),true);
  assert.equal(skies,1);assert.equal(kit.stats.reflection.width,512);assert.equal(kit.stats.reflection.height,320);
  assert.equal(kit.stats.reflection.frames,1);assert.equal(renderer.current,originalTarget);
  assert.ok(renderer.clearColor.equals(originalColor));assert.equal(renderer.clearAlpha,.4);
  assert.deepEqual(renderer.viewport.toArray(),[1,2,1280,800]);assert.deepEqual(renderer.scissor.toArray(),[3,4,1200,700]);
  assert.equal(renderer.scissorTest,true);assert.equal(renderer.autoClear,true);assert.equal(renderer.xr.enabled,true);
  assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,true);
  assert.equal(renderer.info.autoReset,true);assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);
  assert.equal(kit.water.visible,true);assert.equal(cover.visible,true);assert.equal(extra.visible,false);
  assert.deepEqual(atmosphereCamera.toArray(),[20,30,40]);
  const mirror=kit.reflectionCamera;
  assert.ok(Math.abs(mirror.position.y-(ALPINE_LAKE.level*2-camera.position.y))<1e-8);
  const above=new THREE.Vector3(-350,ALPINE_LAKE.level+.2,215).project(mirror);
  const below=new THREE.Vector3(-350,ALPINE_LAKE.level-.2,215).project(mirror);
  assert.ok(above.z>=-1&&below.z< -1,'oblique near plane retains dry banks but rejects lake bed');
  assert.equal(kit.renderReflection(renderer,camera,{seconds:1.02,renderSky:sky}),false,'static reflection is cached');
  camera.position.x+=.1;camera.updateMatrixWorld(true);
  assert.equal(kit.renderReflection(renderer,camera,{seconds:1.03,renderSky:sky}),false,'moving camera respects bounded cadence');
  assert.equal(kit.renderReflection(renderer,camera,{seconds:1.7,renderSky:sky}),true);
  kit.setQuality('low');assert.equal(kit.renderReflection(renderer,camera,{seconds:2,renderSky:sky}),false);
  kit.setQuality('medium');assert.equal(kit.renderReflection(renderer,camera,{seconds:3,renderSky:sky}),true);
  assert.equal(kit.stats.reflection.width,320);assert.equal(kit.stats.reflection.height,200);
  renderer.render=()=>{throw new Error('reflection device failure');};
  assert.throws(()=>kit.renderReflection(renderer,camera,{seconds:4,force:true}),/device failure/);
  assert.equal(renderer.current,originalTarget);assert.equal(renderer.autoClear,true);assert.equal(cover.visible,true);
  assert.deepEqual(atmosphereCamera.toArray(),[20,30,40]);assert.equal(kit.water.visible,true);
  kit.dispose();
});
