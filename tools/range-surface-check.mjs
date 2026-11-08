// Reproduce sampler-budget, material-clone, quality and portrait checks in Chrome.
// node tools/range-surface-check.mjs --url http://127.0.0.1:4180 --cap 16
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchChrome, connect, sleep } from './cdp.mjs';

const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4180' },
  out: { type: 'string', default: 'work/surface-checks.json' },
  cap: { type: 'string', default: '16' },
} });
const cap = Number(values.cap);
if (!Number.isInteger(cap) || cap < 16 || cap > 64) {
  throw new Error('Use --cap with an integer between 16 and 64.');
}
const url = new URL('range/', values.url.replace(/\/+$/, '') + '/');
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('--url must use HTTP or HTTPS.');
url.searchParams.set('quality', 'high');
const expectLean = cap < 22;
const report = { forcedFragmentCap:cap, errors:[], warnings:[], states:[], started:new Date().toISOString() };
let browser, page;
const recordSource = `(() => {
  const d=rangeDemo, r=d.renderer, gl=r.getContext();
  const samplerTypes=new Set(['SAMPLER_2D','SAMPLER_CUBE','SAMPLER_3D','SAMPLER_2D_SHADOW','SAMPLER_2D_ARRAY','SAMPLER_2D_ARRAY_SHADOW','SAMPLER_CUBE_SHADOW','INT_SAMPLER_2D','INT_SAMPLER_3D','INT_SAMPLER_CUBE','INT_SAMPLER_2D_ARRAY','UNSIGNED_INT_SAMPLER_2D','UNSIGNED_INT_SAMPLER_3D','UNSIGNED_INT_SAMPLER_CUBE','UNSIGNED_INT_SAMPLER_2D_ARRAY'].map(name=>gl[name]).filter(Number.isFinite));
  const programs=[];
  for(const wrapper of r.info.programs){
    const program=wrapper.program, attached=gl.getAttachedShaders(program)||[];
    const sources=attached.map(shader=>({type:gl.getShaderParameter(shader,gl.SHADER_TYPE),source:gl.getShaderSource(shader)||''}));
    const fragment=sources.find(shader=>shader.type===gl.FRAGMENT_SHADER)?.source||'';
    const vertex=sources.find(shader=>shader.type===gl.VERTEX_SHADER)?.source||'';
    const kind=fragment.includes('surfaceControls')?'terrain':fragment.includes('cliffControls')?'cliff':null;
    if(!kind)continue;
    const samplers=[];
    for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
      const u=gl.getActiveUniform(program,i);if(samplerTypes.has(u.type))samplers.push({name:u.name,size:u.size,type:u.type});
    }
    const vertexOnly=samplers.filter(u=>u.name==='skyProbeRadiance'&&!fragment.includes('skyProbeRadiance')&&vertex.includes('skyProbeRadiance'));
    const total=samplers.reduce((sum,u)=>sum+u.size,0), fragmentCount=total-vertexOnly.reduce((sum,u)=>sum+u.size,0);
    programs.push({id:wrapper.id,kind,linked:gl.getProgramParameter(program,gl.LINK_STATUS),lean:/#define SURFACE_LEAN\\s+1/.test(fragment),total,fragmentCount,vertexOnly:samplers.filter(u=>vertexOnly.includes(u)).map(u=>u.name),samplers});
  }
  const terrainMaterials=new Map();let meshes=0;
  d.scene.traverse(o=>{if(o.isMesh)meshes++;for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(m.name==='Alpine meadow, humus and mineral ground'||m.name==='Fractured launch granite')terrainMaterials.set(m.uuid,{name:m.name,lean:!!m.defines?.SURFACE_LEAN});});
  return {quality:d.quality,viewport:{width:innerWidth,height:innerHeight,aspect:d.camera.aspect,canvas:[r.domElement.width,r.domElement.height]},caps:{reported:r.capabilities.maxTextures,actual:window.__nativeFragmentCap,vertex:gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),combined:gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)},ready:{rig:!!d.rig,model:d.model,meshes,clouds:!!d.aerial.advancedClouds,terrainSamples:[[-91,-380],[80,-200],[0,0]].map(([x,z])=>({x,z,height:d.terrainHeight(x,z)}))},draws:{...r.info.render},cover:d.coverStats,materials:[...terrainMaterials.values()],programs};
})()`;
try {
  const port=9480+Math.floor(Math.random()*100);
  browser=await launchChrome({port,width:960,height:600});page=await connect({port});
  page.on(m=>{if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type)){const text=m.params.args.map(a=>a.value||a.description||'').join(' ');(m.params.type==='error'?report.errors:report.warnings).push(text);}});
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const original=WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter=function(parameter){const result=original.call(this,parameter);if(parameter===this.MAX_TEXTURE_IMAGE_UNITS){window.__nativeFragmentCap=result;return ${cap};}return result;};
    const originalFetch=window.fetch;window.fetch=function(input,options){if(String(input).endsWith('/__version'))return Promise.resolve(new Response('',{status:404}));return originalFetch.call(this,input,options);};
  `});
  await page.viewport(960,600);await page.goto(url.href);
  let ready=false;for(let i=0;i<240;i++){if(await page.eval('!!window.rangeDemo?.rig')){ready=true;break;}await sleep(250);}
  if(!ready)throw new Error('Range startup did not complete');
  await page.eval(`(()=>{const id=requestAnimationFrame(()=>{});for(let n=Math.max(0,id-32);n<=id;n++)cancelAnimationFrame(n);window.requestAnimationFrame=()=>0;document.getElementById('panel').classList.add('hidden');})();1`);
  await page.eval('rangeDemo.render();1');
  if(report.errors.length)throw new Error('Startup render errors: '+report.errors.join('\n'));
  report.initial=await page.eval(recordSource);
  for(const [width,height] of [[960,600],[390,780]]){
    await page.viewport(width,height);await page.eval('dispatchEvent(new Event("resize"));1');
    for(const quality of ['high','medium','low']){
      await page.eval(`(()=>{const d=rangeDemo;d.setQuality(${JSON.stringify(quality)});d.player.visible=false;d.camera.position.set(-91,d.terrainHeight(-91,-380)+1.55,-380);d.camera.lookAt(-87,d.terrainHeight(-87,-366)+.35,-366);d.camera.updateMatrixWorld(true);d.render();})();1`);
      const state=await page.eval(recordSource);report.states.push(state);
      if(report.warnings.length)throw new Error('Console warnings: '+report.warnings.join('\n'));
      if(report.errors.length)throw new Error('Render errors after '+quality+': '+report.errors.join('\n'));
      if(state.caps.reported!==cap)throw new Error('The forced renderer sampler budget was not selected');
      if(!state.programs.some(p=>p.kind==='terrain')||!state.programs.some(p=>p.kind==='cliff'))throw new Error('Both material programs must be compiled');
      if(state.programs.some(p=>!p.linked||p.lean!==expectLean||p.fragmentCount>cap||p.total>cap))throw new Error('A material selected the wrong variant or exceeded the sampler budget');
      if(!state.ready.rig||!state.ready.terrainSamples.every(p=>Number.isFinite(p.height))||state.draws.calls<=0)throw new Error('Missing geometry or terrain during rendering');
      if(state.quality!==quality||state.viewport.width!==width||state.viewport.height!==height)throw new Error('Quality/resize did not reach the renderer');
      console.log(JSON.stringify({quality,viewport:[width,height],samplers:state.programs.map(p=>({kind:p.kind,count:p.fragmentCount})),draws:state.draws.calls}));
    }
  }
  report.ok=true;
} catch(error) {report.ok=false;report.failure=error.stack||String(error);process.exitCode=1;console.error(report.failure);}
finally {
  page?.close();
  await browser?.close();
  report.finished = new Date().toISOString();
  await mkdir(path.dirname(values.out), { recursive: true });
  await writeFile(values.out, JSON.stringify(report, null, 2) + '\n');
}
