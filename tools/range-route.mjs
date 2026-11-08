// Fixed-quality, moving-camera evidence through the actual production draw path.
// Start the local range server first. GPU timings are optional and asynchronous.
// node tools/range-route.mjs --url http://127.0.0.1:4180 --quality high --out work/route
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchChrome, connect, sleep } from './cdp.mjs';

let browser, page;
try {
  const { values } = parseArgs({ options: {
    url: { type: 'string', default: 'http://127.0.0.1:4180' },
    quality: { type: 'string', default: 'high' },
    out: { type: 'string', default: 'work/route' },
    frames: { type: 'string', default: '24' },
    warmup: { type: 'string', default: '3' },
    width: { type: 'string', default: '960' },
    height: { type: 'string', default: '600' },
  } });
  const frames = Number(values.frames), warmup = Number(values.warmup), width = Number(values.width), height = Number(values.height);
  if (!['high', 'medium', 'low'].includes(values.quality)) throw new Error('Use --quality high|medium|low.');
  if (!Number.isInteger(frames) || frames < 4 || frames > 240) throw new Error('--frames must be an integer from 4 to 240 per segment.');
  if (!Number.isInteger(warmup) || warmup < 1 || warmup > 60) throw new Error('--warmup must be an integer from 1 to 60 frames per waypoint.');
  if (![width, height].every(value => Number.isInteger(value) && value >= 240 && value <= 4096)) {
    throw new Error('Viewport dimensions must be integers from 240 to 4096.');
  }
  const url = new URL('range/', values.url.replace(/\/+$/, '') + '/');
  url.searchParams.set('quality', values.quality);
  const port = 9400 + Math.floor(Math.random() * 400);
  browser = await launchChrome({ port, width, height, uncapped: true });
  page = await connect({ port });
  await page.viewport(width, height);
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const routeFetch = window.fetch;
    window.fetch = function(input, options) {
      if (String(input).endsWith('/__version')) return Promise.resolve(new Response('', {status:404}));
      return routeFetch.call(this, input, options);
    };` });
  const errors = [];
  page.on(message => {
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(argument => argument.value || argument.description || '').join(' '));
    }
  });
  await page.goto(url.href);
  let ready = false;
  for (let attempt = 0; attempt < 240; attempt++) {
    if (await page.eval('!!window.rangeDemo?.rig')) { ready = true; break; }
    await sleep(250);
  }
  if (!ready) throw new Error('The range did not finish loading within 60 seconds.');
  await page.eval(`(() => {
    const last = requestAnimationFrame(() => {});
    for (let id = Math.max(0, last - 32); id <= last; id++) cancelAnimationFrame(id);
    window.__routeRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = () => 0;
    document.getElementById('panel').classList.add('hidden');
    document.getElementById('toast').style.display = 'none';
    document.querySelector('.hud').style.display = 'none';
    rangeDemo.player.visible = false;
    return 1;
  })()`);
  const metadata = await page.eval(`(async () => {
    const { createGPUProfiler } = await import('./gpu-profiler.js');
    const d = rangeDemo, gl = d.renderer.getContext();
    window.__routeGPU = createGPUProfiler(d.renderer, { maxPending: 16 });
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const deck = d.deckY(d.LAUNCH.z), z = d.LAUNCH.z;
    const ground = (x, zz) => d.physicalGroundHeight ? d.physicalGroundHeight(x, zz) : d.terrainHeight(x, zz);
    window.__routePoints = [
      { name: 'launch', position: [14, deck + 6, z - 35], target: [0, deck - 12, z + 180] },
      { name: 'escarpment', position: [100, deck + 12, z + 100], target: [0, deck - 32, z - 28] },
      { name: 'departure', position: [0, ground(0, -440) + 90, -440], target: [0, ground(0, 0), 0] },
      { name: 'woodland', position: [-240, ground(-240, -670) + 2, -670], target: [-232, ground(-232, -635) + 3, -635] },
      { name: 'approach', position: [0, ground(0, -145) + 35, -145], target: [0, ground(0, 25), 25] },
      { name: 'valley', position: [-230, ground(-230, 180) + 260, 180], target: [0, deck - 45, z] },
    ];
    window.__routeSamples = [];
    const sun = d.scene.children.find(object => object.isDirectionalLight && object.castShadow);
    window.__routeSun = sun ? { light: sun, direction: sun.position.clone().sub(sun.target.position).normalize() } : null;
    return {
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      userAgent: navigator.userAgent,
      gpuTimer: { available: __routeGPU.available, reason: __routeGPU.reason },
      quality: d.quality,
      canvas: { width: d.renderer.domElement.width, height: d.renderer.domElement.height },
      route: __routePoints,
      visuals: d.scene.userData.visuals || null,
    };
  })()`);
  await mkdir(values.out, { recursive: true });
  // Visit every camera before timing so initial shader compilation and texture
  // upload do not masquerade as the route's steady rendering cost.
  for (let point = 0; point < metadata.route.length; point++) {
    await page.eval(`(async () => {
      const d = rangeDemo, point = __routePoints[${point}];
      d.camera.position.set(...point.position); d.camera.lookAt(...point.target); d.camera.updateMatrixWorld(true);
      for (let i = 0; i < ${warmup}; i++) {
        await new Promise(resolve => __routeRAF(resolve));
        d.render();
      }
    })()`);
  }
  const segments = [];
  for (let segment = 0; segment < metadata.route.length; segment++) {
    // Each segment runs in a separate DevTools call so captures and progress can
    // be consumed as they arrive. Frame intervals include GPU queue stalls.
    const result = await page.eval(`(async () => {
      const d = rangeDemo, timer = __routeGPU, route = __routePoints;
      const a = route[Math.max(0, ${segment} - 1)], b = route[${segment}];
      const samples = [], gpu = [], calls = [], triangles = [];
      let previous = null;
      for (let frame = 0; frame < ${frames}; frame++) {
        await new Promise(resolve => __routeRAF(resolve));
        const now = performance.now();
        if (previous !== null) samples.push(now - previous);
        previous = now;
        const t = frame / (${frames} - 1), blend = t * t * (3 - 2 * t);
        const position = a.position.map((value, index) => value + (b.position[index] - value) * blend);
        const target = a.target.map((value, index) => value + (b.target[index] - value) * blend);
        d.camera.position.set(...position); d.camera.lookAt(...target); d.camera.updateMatrixWorld(true);
        // The production shadow volume follows the pilot. For this free-camera
        // inspection, centre the same volume on the inspected patch of ground.
        if (__routeSun) {
          const light = __routeSun.light;
          const ground = d.physicalGroundHeight || d.terrainHeight;
          light.target.position.set(position[0], ground(position[0], position[2]) + 12, position[2]);
          light.position.copy(__routeSun.direction).multiplyScalar(2000).add(light.target.position);
        }
        gpu.push(...timer.poll());
        const measuring = timer.begin(b.name);
        const start = performance.now();
        try { d.render(); } finally { if (measuring) timer.end(); }
        __routeSamples.push({ segment: b.name, cpuSubmitMs: performance.now() - start });
        calls.push(d.renderer.info.render.calls); triangles.push(d.renderer.info.render.triangles);
      }
      gpu.push(...timer.poll());
      // Force one final draw and read that draw immediately; compositor screen
      // captures can show the previous camera on a slow software renderer.
      d.render();
      return { name: b.name, frameMs: samples, gpu, calls, triangles,
        image: d.renderer.domElement.toDataURL('image/jpeg', .94) };
    })()`);
    const file = `${String(segment + 1).padStart(2, '0')}-${result.name}.jpg`;
    await writeFile(path.join(values.out, file), Buffer.from(result.image.slice(result.image.indexOf(',') + 1), 'base64'));
    delete result.image;
    segments.push({ ...result, screenshot: file });
    console.log(`Captured ${result.name} (${segment + 1}/${metadata.route.length}).`);
  }
  const timing = await page.eval(`(async () => {
    const gpu = [];
    // Yield to allow the final asynchronous query to complete. No busy-wait or
    // blocking GPU synchronization; unsupported/disjoint results stay absent.
    for (let i = 0; i < 12 && __routeGPU.stats.pending; i++) {
      await new Promise(resolve => __routeRAF(resolve));
      gpu.push(...__routeGPU.poll());
    }
    const result = { gpu, stats: __routeGPU.stats, cpu: __routeSamples };
    __routeGPU.dispose();
    return result;
  })()`);
  const summarize = numbers => {
    if (!numbers.length) return null;
    const sorted = numbers.slice().sort((a, b) => a - b);
    return {
      count: numbers.length,
      meanMs: +(numbers.reduce((sum, n) => sum + n, 0) / numbers.length).toFixed(3),
      p95Ms: +sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)].toFixed(3),
    };
  };
  const gpuSamples = [...segments.flatMap(segment => segment.gpu), ...timing.gpu];
  const report = {
    url: url.href, timestamp: new Date().toISOString(), metadata,
    protocol: {
      framesPerSegment: frames, warmupFramesPerWaypoint: warmup, note: 'Fixed quality, six moving-camera segments, simulation paused; production shadow volume is centred on the inspected ground. CPU submission includes driver work; frame intervals include asynchronous queue stalls. GPU timings are elapsed queries when supported. Screenshot readback is outside measured frames. This is a rendering route, not a flight physics benchmark.',
    },
    frameTiming: summarize(segments.flatMap(segment => segment.frameMs)),
    cpuSubmission: summarize(timing.cpu.map(sample => sample.cpuSubmitMs)),
    gpuTiming: summarize(gpuSamples.map(sample => sample.milliseconds)),
    gpuQueryStats: timing.stats, segments, finalGPUQueries: timing.gpu, cpuSamples: timing.cpu, errors,
  };
  await writeFile(path.join(values.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: values.out, frameTiming: report.frameTiming, gpuTiming: report.gpuTiming, renderer: metadata.renderer, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  page?.close();
  await browser?.close();
}
