// Stepped-camera inspection of the production ground material and its filtering.
// node tools/range-ground-motion.mjs --url http://127.0.0.1:4180 --out work/ground-motion
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchChrome, connect, sleep } from './cdp.mjs';

const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4180' },
  out: { type: 'string', default: 'work/ground-motion' },
  frames: { type: 'string', default: '24' },
  width: { type: 'string', default: '960' },
  height: { type: 'string', default: '600' },
} });
const count = Number(values.frames), width = Number(values.width), height = Number(values.height);
if (!Number.isInteger(count) || count < 8 || count > 120) {
  throw new Error('--frames must be an integer between 8 and 120.');
}
if (![width, height].every(value => Number.isInteger(value) && value >= 240 && value <= 4096)) {
  throw new Error('--width and --height must be integers between 240 and 4096.');
}
const url = new URL('range/', values.url.replace(/\/+$/, '') + '/');
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('--url must use HTTP or HTTPS.');
url.searchParams.set('quality', 'high');
const report = { url: url.href, output: values.out, width, height, requestedFrames: count,
  step: { x: .25, z: .4 }, lookAhead: { x: 4, z: 14 }, simulationFrozen: true,
  cloudWarmupFrames: 0, errors: [], warnings: [], frames: [], started: new Date().toISOString() };
let browser, page;

try {
  await mkdir(values.out, { recursive: true });
  const port = 9400 + Math.floor(Math.random() * 400);
  browser = await launchChrome({ port, width, height });
  page = await connect({ port });
  page.on(message => {
    if (message.method === 'Runtime.exceptionThrown') {
      report.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      const text = message.params.args.map(argument => argument.value || argument.description || '').join(' ');
      (message.params.type === 'error' ? report.errors : report.warnings).push(text);
    }
  });
  await page.viewport(width, height);
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const captureFetch = window.fetch;
    window.fetch = function(input, options) {
      if (String(input).endsWith('/__version')) return Promise.resolve(new Response('', {status:404}));
      return captureFetch.call(this, input, options);
    };` });
  await page.goto(url.href);
  let ready = false;
  for (let attempt = 0; attempt < 240; attempt++) {
    if (await page.eval('!!window.rangeDemo?.rig && typeof rangeDemo.render === "function"')) { ready = true; break; }
    await sleep(250);
  }
  if (!ready) throw new Error('The production range did not finish loading within 60 seconds.');

  await page.eval(`(() => {
    const last = requestAnimationFrame(() => {});
    for (let id = Math.max(0, last - 32); id <= last; id++) cancelAnimationFrame(id);
    window.requestAnimationFrame = () => 0;
    document.getElementById('panel')?.classList.add('hidden');
    for (const element of document.querySelectorAll('.hud, #toast')) element.style.display = 'none';
    const d = rangeDemo;
    d.player.visible = false;
    d.camera.position.set(-91, d.terrainHeight(-91, -380) + 1.55, -380);
    d.camera.lookAt(-87, d.terrainHeight(-87, -366) + .35, -366);
    // Frame shadow coverage once, as in the still ground inspection. Light
    // direction stays fixed throughout the sequence; only the camera steps.
    const sun = d.scene.children.find(object => object.isDirectionalLight && object.castShadow);
    if (sun) {
      const delta = sun.position.clone().sub(sun.target.position);
      sun.target.position.copy(d.camera.position);
      sun.position.copy(d.camera.position).add(delta);
    }
    d.camera.updateMatrixWorld(true);
    d.render();
  })();1`);
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  report.cloudWarmupFrames = await page.eval(`(() => {
    const d = rangeDemo;
    if (!d.aerial?.advancedClouds) return 0;
    d.aerial.resetHistory();
    for (let frame = 0; frame < 32; frame++) d.aerial.render(d.renderer, d.camera, 0);
    return 32;
  })()`);

  for (let index = 0; index < count; index++) {
    const { image, ...frame } = await page.eval(`(() => {
      const d = rangeDemo, x = -91 + ${index} * .25, z = -380 + ${index} * .4;
      const target = [x + 4, d.terrainHeight(x + 4, z + 14) + .35, z + 14];
      d.camera.position.set(x, d.terrainHeight(x, z) + 1.55, z);
      d.camera.lookAt(...target);
      d.camera.updateMatrixWorld(true);
      // This is the same culling, streaming, cloud, reflection and finishing
      // path as gameplay. Read its drawing buffer before it can be discarded.
      d.render();
      return { camera: d.camera.position.toArray(), target, quality: d.quality,
        render: { ...d.renderer.info.render }, cover: d.coverStats,
        clouds: d.aerial?.advancedClouds?.stats ?? null,
        image: d.renderer.domElement.toDataURL('image/png') };
    })()`);
    if (report.errors.length) throw new Error(report.errors.join('\n'));
    const file = `frame-${String(index).padStart(4, '0')}.png`;
    await writeFile(path.join(values.out, file), Buffer.from(image.slice(image.indexOf(',') + 1), 'base64'));
    report.frames.push({ index, file, ...frame });
    console.log(JSON.stringify({ index, file, camera: frame.camera, render: frame.render }));
  }
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.failure = error.stack || String(error);
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  page?.close();
  await browser?.close();
  report.finished = new Date().toISOString();
  await mkdir(values.out, { recursive: true });
  await writeFile(path.join(values.out, 'sequence.json'), JSON.stringify(report, null, 2) + '\n');
}
