import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../range/vendor/three.module.js';
import {createAdvancedClouds,ADVANCED_CLOUD_SHADOW_GLSL} from '../range/advanced-clouds.js';

test('retained cloud/LUT assets and single-Three vendor bundle match pinned manifest',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../range/assets/clouds/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.versions.three,'0.180.0');
 for(const [path,record]of Object.entries(manifest.files)){
  const data=await readFile(new URL('../'+path,import.meta.url));assert.equal(data.length,record.bytes,path);
  assert.equal(createHash('sha256').update(data).digest('hex'),record.sha256,path);
 }
 const code=await readFile(new URL('../range/vendor/takram-clouds.js',import.meta.url),'utf8');
 assert.match(code,/from["']\.\/three\.module\.js["']/);
 assert.doesNotMatch(code,/from["']react["']/);
 const noise=await readFile(new URL('../range/assets/clouds/blue-noise-rotation.bin',import.meta.url));
 assert.equal(noise.length,64*64*64);const histogram=new Uint16Array(256);
 for(let i=0;i<4096;i++)histogram[noise[i]]++;
 assert.ok(histogram.every(count=>count===16),'rank tile uniformly covers the scalar domain');
});

test('provider preserves renderer precision contract, bounded quality and unique ownership',async()=>{
 const fetch=globalThis.fetch,ProgressEvent=globalThis.ProgressEvent;
 globalThis.ProgressEvent??=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
 globalThis.fetch=async request=>new Response(await readFile(new URL(request.url??request)));
 const imageTextures=[];
 class TextureLoader{async loadAsync(){const t=new THREE.Texture();imageTextures.push(t);return t;}}
 const renderer={getDrawingBufferSize:v=>v.set(3840,2160)};
 let provider;
 try{
  provider=await createAdvancedClouds({...THREE,TextureLoader},renderer,new THREE.PerspectiveCamera(56,16/9,.4,16000));
  assert.equal(provider.skyMaterial.toneMapped,false);assert.equal(provider.effect.cloudsPass.currentMaterial.toneMapped,false);
  assert.ok(provider.stats.width<=640&&provider.stats.height<=400);
  assert.equal(provider.effect.clouds.maxIterationCount,240);assert.equal(provider.effect.temporalUpscale,false);
  provider.setQuality('low');assert.ok(provider.stats.width<=320);assert.equal(provider.effect.clouds.maxIterationCount,100);
  assert.equal(provider.effect.shadow.cascadeCount,2);
  const sun=provider.getSunColor();assert.ok(sun.toArray().every(value=>Number.isFinite(value)&&value>0));
  assert.equal(provider.shadowGLSL,ADVANCED_CLOUD_SHADOW_GLSL);
  const owned=new Set([...imageTextures,provider.skyMaterial]);
  for(const pass of [provider.effect.cloudsPass,provider.effect.shadowPass])for(const value of Object.values(pass))
   if(value?.isWebGLRenderTarget||value?.isMaterial)owned.add(value);
  const counts=new Map();for(const item of owned){counts.set(item,0);item.addEventListener('dispose',()=>counts.set(item,counts.get(item)+1));}
  provider.dispose();provider.dispose();
  for(const [item,count]of counts)assert.equal(count,1,item.name||item.type||'resource');
 }finally{provider?.dispose();globalThis.fetch=fetch;if(ProgressEvent)globalThis.ProgressEvent=ProgressEvent;else delete globalThis.ProgressEvent;}
});

test('failed cloud initialization settles sibling loads and releases their textures once',async()=>{
 const originalFetch=globalThis.fetch;
 for(const failAt of ['transmittance.bin','local_weather.png']){
  const allocated=[];
  function track(texture){const record={texture,disposals:0};texture.addEventListener('dispose',()=>record.disposals++);allocated.push(record);return texture;}
  class DataTexture extends THREE.DataTexture{constructor(...args){super(...args);track(this);}}
  class Data3DTexture extends THREE.Data3DTexture{constructor(...args){super(...args);track(this);}}
  class TextureLoader{async loadAsync(url){if(url.endsWith(failAt))throw Error('injected asset failure');await new Promise(resolve=>setTimeout(resolve,5));return track(new THREE.Texture());}}
  globalThis.fetch=async request=>{
   const url=new URL(request.url??request);if(url.pathname.endsWith(failAt))throw Error('injected asset failure');
   await new Promise(resolve=>setTimeout(resolve,2));return new Response(await readFile(url));
  };
  try{
   await assert.rejects(createAdvancedClouds({...THREE,TextureLoader,DataTexture,Data3DTexture},{getDrawingBufferSize:v=>v.set(960,600)},new THREE.PerspectiveCamera()),/injected asset failure/);
   assert.equal(allocated.length,failAt==='transmittance.bin'?2:7,'all successful sibling allocations finished before rejection');
   for(const record of allocated)assert.equal(record.disposals,1);
  }finally{globalThis.fetch=originalFetch;}
 }
});
