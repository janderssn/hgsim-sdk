// End-to-end check of the landing range in a headless browser: it starts its own server, flies each kind of launch and a
// landing, and fails on any page error. node tools/range-check.mjs [--url https://hgsim.fly.dev]  (needs a local Chrome or Edge;
// see tools/cdp.mjs). With --url it checks that site instead of starting a server.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, connect, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4300 + Math.floor(Math.random() * 400), debugPort = 9400 + Math.floor(Math.random() * 400);
const urlArg = process.argv.indexOf('--url'), site = urlArg > 0 ? process.argv[urlArg + 1].replace(/\/+$/, '') : null;
const server = site ? { kill() {} } : spawn(process.execPath, [path.join(root, 'server.mjs'), String(port)], { stdio: 'ignore' });
const base = site || `http://127.0.0.1:${port}`;
let chrome = null, page = null, failed = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++; };

try {
  for (let i = 0; i < 300; i++) { try { if ((await fetch(`${base}/healthz`)).ok) break; } catch {} await sleep(100); }   // (a deployed machine may be waking)
  chrome = await launchChrome({ port: debugPort, width: 960, height: 540 });
  page = await connect({ port: debugPort });
  const errors = [];
  page.on(m => { if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
  const open = async query => {
    await page.goto(`${base}/range/?${query}`);
    for (let i = 0; i < 80; i++) { if (await page.eval('!!window.rangeDemo&&!!rangeDemo.rig')) return true; await sleep(250); }
    return false;
  };
  const state = () => page.eval(`JSON.stringify((() => { const d = rangeDemo, s = d.getState(), l = d.runUp?.launch; return { mode: s.mode, clearance: s.clearance, airspeed: s.airspeed, phase: l?.phase ?? null, roll: l?.roll ?? 0, rollV: l?.rollV ?? 0, lift: l?.lift ?? 0, judged: s.result?.judged ?? null }; })())`).then(JSON.parse);
  const until = async (test, seconds, each) => { const t = Date.now(); while (Date.now() - t < seconds * 1000) { const s = await state(); if (each) await each(s); if (test(s)) return s; await sleep(50); } return state(); };

  check(await open('wind=5&from=180&launch=easy'), 'the range loads');
  // The panel's switches (launch mode, flight model, skim assist) lead to pages that exist and keep the other options.
  const links = JSON.parse(await page.eval(`JSON.stringify(['launchSwitch', 'modelSwitch', 'assistSwitch'].map(id => document.getElementById(id).href))`));
  const reached = await Promise.all(links.map(async href => (await fetch(href)).status));
  check(reached.every(s => s === 200) && !links[0].includes('launch=') && links.every(h => h.includes('wind=5')), "the panel's switches lead to the range", links.map((h, i) => `${new URL(h).pathname}${new URL(h).search} ${reached[i]}`).join(', '));
  await page.eval(`document.getElementById('panel').classList.add('hidden'); 1`);

  // An easy launch from the ramp: it runs itself and flies off the lip.
  await page.eval(`rangeDemo.launch(); 1`);
  let s = await until(s => s.mode === 'gliding' || s.mode === 'crashed', 15);
  s = s.mode === 'gliding' ? await until(s => s.mode !== 'gliding', 4) : s;
  check(s.mode === 'gliding' && s.clearance > 3, 'an easy ramp launch flies', JSON.stringify({ mode: s.mode, clearance: +s.clearance.toFixed(1) }));

  // An easy cliff launch: a step off the edge and a dive for airspeed.
  await page.eval(`rangeDemo.standAtCliff(); rangeDemo.launch(); 1`);
  s = await until(s => s.mode === 'gliding' || s.mode === 'crashed', 15);
  s = s.mode === 'gliding' ? await until(s => s.mode !== 'gliding', 5) : s;
  check(s.mode === 'gliding' && s.airspeed > 9, 'an easy cliff launch flies', JSON.stringify({ mode: s.mode, airspeed: +s.airspeed.toFixed(1) }));

  // An easy slope launch in calm air: a run down open hillside until the wing carries the pilot, then flying clear of the
  // slope. (In the 5 m/s headwind the wing lifts after a few steps, as on a real hill.)
  await page.eval(`rangeDemo.wind.set({ speed: 0 }); rangeDemo.standAtSlope(); rangeDemo.launch(); 1`);
  const startedAt = JSON.parse(await page.eval('JSON.stringify(rangeDemo.getState().position)'));
  s = await until(s => s.mode === 'gliding' || s.mode === 'crashed' || s.mode === 'tumbling', 15);
  const leftAt = JSON.parse(await page.eval('JSON.stringify(rangeDemo.getState().position)'));
  s = s.mode === 'gliding' ? await until(s => s.mode !== 'gliding', 5) : s;
  const ran = Math.hypot(leftAt[0] - startedAt[0], leftAt[2] - startedAt[2]);
  await page.eval(`rangeDemo.wind.set({ speed: 5 }); 1`);
  check(s.mode === 'gliding' && ran > 8 && s.clearance > 6, 'an easy slope launch in calm air runs down the hill and flies',
    JSON.stringify({ mode: s.mode, ranMetres: +ran.toFixed(1), clearance: +s.clearance.toFixed(1) }));

  // A realistic launch, flown by a simple pilot: balance with A/D, start the run, keep the nose level, jump as it lifts.
  check(await open('wind=5&from=180'), 'the range loads with realistic launches (the default)');
  // The pilot runs in the page, every frame: balance against the roll, the nose a little low on the run and up as the wing
  // lifts, the run started after a moment, and off the end of the ramp.
  await page.eval(`document.getElementById('panel').classList.add('hidden'); rangeDemo.launch(); window.__jumped = false;
    (function pilot() { const d = rangeDemo, l = d.runUp?.launch, D = Math.PI / 180;
      if (l) {
        const e = l.roll * 3 + l.rollV * .6;   // (D, a shift right, brings the right wing down: roll +)
        d.setKey('KeyA', e > .05); d.setKey('KeyD', e < -.05);
        d.setKey('KeyW', l.phase === 'run' && l.lift < .85 && l.noseCmd > -1.5 * D); d.setKey('KeyS', l.phase === 'run' && l.lift >= .85 && l.noseCmd < .8 * D);
        if (l.phase === 'balance' && l.phaseT > 2.2 && !l.go) l.go = true;
        // (no jump on the deck: lifting off there barely above the stall, a gust can set the wing back down on it)
        requestAnimationFrame(pilot);
      } else { for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS']) d.setKey(k, false); if (d.getState().mode === 'ready') requestAnimationFrame(pilot); }
    })(); 1`);
  s = await until(s => s.mode === 'gliding' || s.mode === 'crashed' || s.mode === 'tumbling', 25);
  s = s.mode === 'gliding' ? await until(s => s.mode !== 'gliding', 4) : s;
  check(s.mode === 'gliding', 'a realistic launch, balanced and run off the ramp, flies', JSON.stringify({ mode: s.mode, clearance: +s.clearance.toFixed(1) }));

  // Sitting up and back down in flight (Space), then a landing from overhead, hands off, judged.
  const key = code => page.eval(`dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: ' ', bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { code: '${code}', key: ' ', bubbles: true })); 1`);
  await key('Space'); await sleep(2500); const up = await page.eval('rangeDemo.rig.upright');
  await key('Space'); await sleep(2500); const down = await page.eval('rangeDemo.rig.upright');
  check(up > .9 && down < .1, 'Space sits the pilot up and lays them prone again', JSON.stringify({ up: +up.toFixed(2), down: +down.toFixed(2) }));
  await page.eval(`rangeDemo.overhead(); 1`);
  s = await until(s => s.judged, 150);
  check(!!s.judged, 'a flight from overhead lands and is judged', JSON.stringify({ mode: s.mode, judged: s.judged }));

  // On a phone: nothing until the screen is touched, then a stick that balances the wing and a button that launches; a key
  // press puts them away again. The panel starts hidden on a small screen.
  await page.viewport(812, 375, true); await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  // The lab: a landing scenario flown by its scripted pilot in the range, recorded, then stepped back through the same renderer.
  check(await open('wind=4&from=180&lab=landing&scenario=land-cue&glider=falcon-170'), 'the range loads with the lab open');
  let outcome = null;
  for (let i = 0; i < 160 && !outcome; i++) { await sleep(250); outcome = await page.eval(`document.querySelector('.lab-outcome')?.textContent ?? null`); }
  const labClockBefore = await page.eval(`document.getElementById('labClock').textContent`);
  await page.eval(`for (let i = 0; i < 60; i++) document.getElementById('labBack').click(); 1`); await sleep(300);
  const stepped = { a: labClockBefore, b: await page.eval(`document.getElementById('labClock').textContent`) };
  check(outcome === 'soft' && parseFloat(stepped.a) - parseFloat(stepped.b) > .9, 'the lab flies a scenario in the range and steps back through its recording', JSON.stringify({ outcome, ...stepped }));
  await page.eval(`localStorage.clear(); 1`);

  check(await open('wind=4&from=180'), 'the range loads on a phone');
  const touch = (type, points) => page.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const touchState = () => page.eval(`JSON.stringify({ shown: document.body.classList.contains('touching'), panel: !document.getElementById('panel').classList.contains('hidden'), label: document.querySelector('.touch-action').textContent, phase: rangeDemo.runUp?.launch.phase ?? null, shift: rangeDemo.runUp?.launch.shift ?? 0 })`).then(JSON.parse);
  const before = await touchState();
  await touch('touchStart', [[400, 150]]); await touch('touchEnd', []); await sleep(200);
  const shown = await touchState();
  const button = JSON.parse(await page.eval(`JSON.stringify((r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector('.touch-action').getBoundingClientRect()))`));
  await touch('touchStart', [button]); await sleep(80); await touch('touchEnd', []); await sleep(2500);
  const launched = await touchState();
  await touch('touchStart', [[110, 265]]); await touch('touchMove', [[160, 265]]); await sleep(400);
  const stick = await touchState(); await touch('touchEnd', []);
  const fullButton = JSON.parse(await page.eval(`JSON.stringify((r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector('.touch [data-fullscreen]').getBoundingClientRect()))`));
  await touch('touchStart', [fullButton]); await sleep(60); await touch('touchEnd', []); await sleep(500);
  const full = await page.eval('!!document.fullscreenElement');
  check(full, 'the Full screen button puts the range full screen');
  await page.key('KeyF'); await sleep(300);
  await page.key('KeyQ'); await sleep(100);
  const keyed = await touchState();
  check(!before.shown && !before.panel && shown.shown && launched.phase === 'balance' && launched.label === 'Run' && stick.shift > .5 && !keyed.shown,
    'touch controls appear on a touch, launch, balance the wing, and hide on a key', JSON.stringify({ before, shown: shown.shown, launched: [launched.phase, launched.label], shift: +stick.shift.toFixed(2), keyed: keyed.shown }));

  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
} catch (e) { check(false, 'the check ran', e.message); }
finally { page?.close(); await chrome?.close(); server.kill(); }
process.exitCode = failed ? 1 : 0;
