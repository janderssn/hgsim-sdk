// Optional-asset and alternate-mode smoke checks; start the local server first.
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { launchChrome, connect, sleep } from './cdp.mjs';
const {values} = parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:4180'}}});
let browser, page;
try {
  const port = 9400 + Math.floor(Math.random() * 400);
  browser = await launchChrome({port,width:800,height:500});
  page = await connect({port});
  const errors=[];
  page.on(message=>{
    if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error') errors.push(message.params.args.map(arg=>arg.value||arg.description||'').join(' '));
    if(message.method==='Fetch.requestPaused') void page.send('Fetch.failRequest',{requestId:message.params.requestId,errorReason:'Failed'});
  });
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const visualFetch=window.fetch;
    window.fetch=function(input,options){
      if(String(input).endsWith('/__version'))return Promise.resolve(new Response('',{status:404}));
      return visualFetch.call(this,input,options);
    };`});
  async function open(query='') {
    const url=new URL('range/',values.url.replace(/\/+$/,'')+'/');
    url.search=new URLSearchParams('quality=low&'+query);
    await page.goto(url.href);
    for(let i=0;i<240;i++) { if(await page.eval('!!window.rangeDemo?.rig'))return; await sleep(250); }
    throw new Error('Range failed to load.');
  }
  async function launch() {
    await page.eval('rangeDemo.launch();1');
    for(let i=0;i<160;i++) {
      const mode=await page.eval('rangeDemo.getState().mode');
      if(mode==='gliding')return;
      assert.ok(!['crashed','tumbling'].includes(mode),mode);
      await sleep(100);
    }
    throw new Error('Launch did not reach flight.');
  }
  for(const query of ['model=original','assist=on']) {
    await open(query);
    const data=await page.eval(`(()=>{let bones=0;rangeDemo.player.traverse(o=>{if(o.isBone)bones++});return {visuals:rangeDemo.scene.userData.visuals,bones};})()`);
    assert.equal(data.visuals.forest,'forest');assert.equal(data.visuals.props,'illustrated-kit');assert.ok(data.visuals.forestMipLevels.every(level=>level===8));assert.equal(data.bones,19);
    await launch();console.log('PASS '+query+' assets, rig and launch');
  }
  await page.viewport(480,720);await sleep(500);
  assert.ok(await page.eval('Math.abs(rangeDemo.camera.aspect-480/720)<.001'));
  assert.ok(await page.eval('!rangeDemo.renderer.info.programs.some(p=>p.diagnostics?.runnable===false)'));
  console.log('PASS portrait resize and shader programs');
  await page.send('Fetch.enable',{patterns:[{urlPattern:'*assets/forest/*-mips.bin.gz*',requestStage:'Request'}]});
  await open();
  const sourceAtlas=await page.eval('rangeDemo.scene.userData.visuals');
  assert.equal(sourceAtlas.forest,'forest');assert.ok(sourceAtlas.forestMipLevels.every(level=>level===0));
  await launch();console.log('PASS intentionally missing prepared mips fall back to PNG atlases and launch');
  await page.send('Fetch.disable');
  await page.send('Fetch.enable',{patterns:[
    {urlPattern:'*assets/forest/*',requestStage:'Request'},
    {urlPattern:'*yosemite-heightfield.bin*',requestStage:'Request'},
    {urlPattern:'*assets/materials/*',requestStage:'Request'},
  ]});
  await open();
  const fallback=await page.eval('rangeDemo.scene.userData.visuals');
  assert.equal(fallback.models,'fallback');assert.equal(fallback.forest,'fallback');
  assert.equal(fallback.terrain,false);assert.equal(fallback.surfaces,false);
  await launch();console.log('PASS intentionally missing forest/elevation/surfaces still launch with local story props');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS no runtime or shader errors');
} catch(error) { console.error(error.stack||error.message);process.exitCode=1; }
finally { page?.close();await browser?.close(); }
