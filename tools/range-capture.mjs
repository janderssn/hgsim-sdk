// Reproducible in-engine captures, including the production detail and HDR/AO path.
// node tools/range-capture.mjs --view flight --out work/flight.jpg
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchChrome, connect, sleep } from './cdp.mjs';

let browser, page;
try {
  const { values } = parseArgs({ options: {
    url: { type: 'string', default: 'http://127.0.0.1:4180' },
    view: { type: 'string', default: 'flight' },
    quality: { type: 'string', default: 'high' },
    out: { type: 'string', default: 'work/range.jpg' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '800' },
  } });
  if (!['flight', 'launch', 'meadow'].includes(values.view)
    || !['high', 'medium', 'low'].includes(values.quality)) {
    throw new Error('Use --view flight|launch|meadow and --quality high|medium|low.');
  }
  const width = Number(values.width), height = Number(values.height);
  if (![width, height].every(value => Number.isInteger(value) && value >= 240 && value <= 4096)) {
    throw new Error('Capture dimensions must be integers between 240 and 4096.');
  }
  const url = new URL('range/', values.url.replace(/\/+$/, '') + '/');
  url.searchParams.set('quality', values.quality);
  const port = 9400 + Math.floor(Math.random() * 400);
  browser = await launchChrome({ port, width, height });
  page = await connect({ port });
  await page.viewport(width, height);
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
  await page.eval("document.getElementById('panel').classList.add('hidden');1");
  if (values.view === 'flight') {
    await page.eval('rangeDemo.startAt({x:0,z:-470,agl:75,heading:0,kmh:48,pathDeg:-3});1');
  } else if (values.view === 'meadow') {
    // Center the sun's local shadow volume here before inspecting nearby grass.
    await page.eval('rangeDemo.startAt({x:200,z:-250,agl:3,heading:0,kmh:0});1');
  }
  await sleep(1000);
  await page.eval('(() => { const last = requestAnimationFrame(() => {}); for (let id = Math.max(0, last - 32); id <= last; id++) cancelAnimationFrame(id); window.requestAnimationFrame=()=>0; })();1');
  await sleep(600);
  // Inspection views move only the camera. drawScene refreshes real production
  // culling, terrain LOD and ground-cover streaming at that camera position.
  const frame = await page.eval(`(() => {
    const d = rangeDemo;
    document.getElementById('toast').style.display = 'none';
    if (${JSON.stringify(values.view)} === 'launch') {
      const z = d.LAUNCH.z, y = d.deckY(z);
      d.camera.position.set(78, y + 13, z + 88);
      d.camera.lookAt(13, y - 22, z - 15);
    } else if (${JSON.stringify(values.view)} === 'meadow') {
      const x = 200, z = -250, y = d.terrainHeight(x, z);
      d.player.visible = false;
      d.camera.position.set(x, y + 1.25, z);
      d.camera.lookAt(x - 3, y + .7, z + 35);
      document.querySelector('.hud').style.display = 'none';
    }
    d.camera.updateMatrixWorld(true);
    d.render ? d.render() : d.renderer.render(d.scene, d.camera);
    // Read the same draw before the WebGL drawing buffer is discarded. This
    // avoids a stale compositor frame when rendering on a slow software GPU.
    return { camera: d.camera.position.toArray(), render: { ...d.renderer.info.render }, image: d.renderer.domElement.toDataURL(${JSON.stringify(values.out.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')}, .95) };
  })()`);
  await mkdir(path.dirname(values.out), { recursive: true });
  await writeFile(values.out, Buffer.from(frame.image.slice(frame.image.indexOf(',') + 1), 'base64'));
  console.log(JSON.stringify({
    output: values.out, view: values.view, errors,
    scene: JSON.parse(await page.eval(`JSON.stringify({
      quality: rangeDemo.quality, visuals: rangeDemo.scene.userData.visuals,

    })`)),
    camera: frame.camera, render: frame.render,
  }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  page?.close();
  await browser?.close();
}
