// Isolate cloud and scene work with nonblocking GPU queries. Start the server first.
import { parseArgs } from 'node:util';
import { launchChrome, connect, sleep } from './cdp.mjs';
const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4180' },
  view: { type: 'string', default: 'flight' },
  quality: { type: 'string', default: 'medium' },
  samples: { type: 'string', default: '3' },
} });
if (!['flight', 'woodland'].includes(values.view) || !['high', 'medium', 'low'].includes(values.quality)) throw new Error('Use --view flight|woodland and --quality high|medium|low.');
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 1 || samples > 24) throw new Error('--samples must be 1–24.');
let browser, page;
try {
  const port = 9400 + Math.floor(Math.random() * 400);
  browser = await launchChrome({ port, width: 960, height: 600 });
  page = await connect({ port });
  const errors = [];
  page.on(message => {
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
  });
  const url = new URL('range/', values.url.replace(/\/+$/, '') + '/');
  url.searchParams.set('quality', values.quality);
  await page.goto(url.href);
  let ready = false;
  for (let i = 0; i < 240; i++) {
    if (await page.eval('!!window.rangeDemo?.rig')) { ready = true; break; }
    await sleep(250);
  }
  if (!ready) throw new Error('Range did not load.');
  const result = await page.eval(`(async () => {
    const d = rangeDemo, id = requestAnimationFrame(() => {});
    for (let n = Math.max(0, id - 32); n <= id; n++) cancelAnimationFrame(n);
    const raf = requestAnimationFrame.bind(window); window.requestAnimationFrame = () => 0;
    if (${JSON.stringify(values.view)} === 'woodland') {
      const x=-240,z=-670,y=d.terrainHeight(x,z);
      d.camera.position.set(x,y+1.7,z); d.camera.lookAt(x+8,d.terrainHeight(x+8,z+35)+3,z+35);
    } else { d.camera.position.set(0,223,-480); d.camera.lookAt(0,0,0); }
    d.render();
    const { createGPUProfiler } = await import('./gpu-profiler.js');
    const timer = createGPUProfiler(d.renderer,{maxPending:48}), results=[];
    if (!timer.available) return {available:false,reason:timer.reason};
    for (let i=0;i<${samples};i++) {
      timer.begin('cloud'); d.aerial.render(d.renderer,d.camera,0); timer.end();
      timer.begin('beauty+AO'); d.renderFinish.render(); timer.end();
      results.push(...timer.poll()); await new Promise(resolve => raf(resolve));
    }
    // Readback is after the measured commands; it is not part of any query.
    d.renderer.domElement.toDataURL();
    for (let i=0;i<120 && timer.stats.pending;i++) {
      await new Promise(resolve => raf(resolve)); results.push(...timer.poll());
    }
    const gl=d.renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
    const result={available:true,results,render:{...d.renderer.info.render},
      canvas:{width:d.renderer.domElement.width,height:d.renderer.domElement.height},
      renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
      shaderErrors:d.renderer.info.programs.filter(program=>program.diagnostics?.runnable===false).length,
      queryStats:timer.stats};
    timer.dispose(); return result;
  })()`);
  console.log(JSON.stringify({ protocol: 'Static 960×600 camera, one warm draw, alternating cloud/beauty elapsed queries; no native GPU claim.', view: values.view, quality: values.quality, ...result, errors }, null, 2));
  if (errors.length || result.shaderErrors) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { page?.close(); await browser?.close(); }
