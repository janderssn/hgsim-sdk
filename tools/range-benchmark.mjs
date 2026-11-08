// Repeatable rendering measurement; start the range server before running this.
// node tools/range-benchmark.mjs [--url http://127.0.0.1:4180] [--seconds 10] [--warmup 5]
import { parseArgs } from 'node:util';
import { launchChrome, connect, sleep } from './cdp.mjs';

let browser, page;
try {
  const { values } = parseArgs({ options: {
    url: { type: 'string', default: 'http://127.0.0.1:4180' },
    seconds: { type: 'string', default: '10' },
    warmup: { type: 'string', default: '5' },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('Usage: node tools/range-benchmark.mjs [--url http://127.0.0.1:4180] [--seconds 10] [--warmup 5]');
  } else {
    const seconds = Number(values.seconds), warmup = Number(values.warmup);
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(warmup) || warmup < 0) {
      throw new Error('--seconds must be positive and --warmup must be non-negative.');
    }
    const url = new URL('range/', values.url.replace(/\/+$/, '') + '/').href;
    const port = 9400 + Math.floor(Math.random() * 400);
    browser = await launchChrome({ port, width: 960, height: 540 });
    page = await connect({ port });
    await page.goto(url);
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await page.eval('!!window.rangeDemo?.rig')) { ready = true; break; }
      await sleep(250);
    }
    if (!ready) throw new Error('The range did not finish loading within 30 seconds.');
    await sleep(warmup * 1000);

    const result = await page.eval(`new Promise((resolve, reject) => {
      const intervals = [];
      let started = null, previous = null, frame;
      const timeout = setTimeout(() => {
        cancelAnimationFrame(frame);
        reject(new Error('No animation frames completed the benchmark.'));
      }, ${seconds * 1000 + 30000});
      function sample(now) {
        started ??= now;
        if (previous !== null) intervals.push(now - previous);
        previous = now;
        if (now - started < ${seconds * 1000}) {
          frame = requestAnimationFrame(sample);
          return;
        }
        clearTimeout(timeout);
        const duration = intervals.reduce((sum, value) => sum + value, 0);
        const sorted = intervals.slice().sort((a, b) => a - b);
        const d = window.rangeDemo, renderer = d.renderer, canvas = renderer.domElement;
        resolve({
          fps: +(intervals.length * 1000 / duration).toFixed(2),
          meanMs: +(duration / intervals.length).toFixed(2),
          p95Ms: +sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)].toFixed(2),
          frames: intervals.length,
          durationSeconds: +(duration / 1000).toFixed(2),
          dpr: devicePixelRatio,
          adapter: (() => {
            const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
            return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable';
          })(),
          canvas: { width: canvas.width, height: canvas.height },
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          quality: typeof d.getQuality === 'function' ? d.getQuality() : d.quality ?? null,
        });
      }
      frame = requestAnimationFrame(sample);
    })`);
    console.log(JSON.stringify({ url, warmupSeconds: warmup, ...result }, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try { await page?.close(); }
  finally { await browser?.close(); }
}
