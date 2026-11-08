/**
 * The tuning pages: one scenario at a time (src/scenarios.js) flown on one wing, seen from the side, the top, behind and in front,
 * with its numbers, its traces and the feel values that shape it. A scripted pilot flies it the same way every time, or you fly it
 * (Fly it); the same scenario on another wing, or a run pinned earlier, is drawn alongside to compare. mountTuner(kind) builds the
 * page for 'launch', 'flight' or 'landing'. URL options: glider (a preset id), vg (0..1), scenario (an id), compare (a preset id).
 */
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createPilotRig } from '../../src/three/index.js';
import { PRESETS, SCENARIOS, startScenario, runScenario, createGlider } from '../../src/index.js';
import { shoulderPivot } from '../../src/launch.js';
import { getAirframePose } from '../airframe-pose.js';

const DEG = Math.PI / 180, KMH = 3.6;
const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const LADDER = ['alpha-235', 'falcon-170', 'sport-2', 'u2-160', 't2c-144'];

/* ---------- what each page shows ---------- */

const deg = v => v / DEG;
const PAGES = {
  launch: {
    title: 'Launch tuning', intro: 'The pickup, the balance on the shoulders, the run and the lift-off, off the ramp, the cliff and the slope in different winds. Fly it: A/D balance, W/S the nose, Shift run hard, Space to start the run and to jump.',
    channels: [
      { label: 'Roll on the shoulders', unit: '°', get: s => s.phase === 'launch' ? deg(s.bank) : null },
      { label: 'Nose (angle of attack)', unit: '°', get: s => deg(s.alpha) },
      { label: 'Weight the wing carries', unit: '', get: s => s.phase === 'launch' ? s.lift : null },
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
      { label: 'Height of the feet', unit: 'm', get: s => s.feet },
    ],
    sliders: [
      ['launch', 'rollTip', 'Wing goes over', 0.2, 3, 0.05], ['launch', 'drift', 'Slow drift', 0, 2.5, 0.05], ['launch', 'reflexMax', 'Reflexes hold', 0, 1.2, 0.02],
      ['launch', 'gustRoll', 'Gusts roll it', 0, 0.3, 0.01], ['launch', 'rollLimit', 'Tip touches at', 0.2, 0.6, 0.01, true], ['launch', 'rollAuthority', 'Weight shift', 0.5, 4, 0.05],
      ['launch', 'noseRise', 'Nose rises', 0, 8, 0.1, true], ['launch', 'noseSwell', 'Nose wanders', 0, 4, 0.1, true], ['launch', 'noseRate', 'Nose control', 4, 25, 0.5, true],
      ['launch', 'wingShare', 'Wing weight share', 0.1, 0.45, 0.01], ['launch', 'holdLift', 'Held lift share', 0.6, 1, 0.01], ['launch', 'runStallLift', 'Run stall loss', 0.2, 1, 0.02],
      ['launch', 'topSpeed', 'Run speed', 4, 9, 0.1], ['launch', 'accel', 'Run acceleration', 0.8, 3.5, 0.05], ['launch', 'yawAero', 'Weathervane', 0.5, 5, 0.1],
    ],
  },
  flight: {
    title: 'Flight tuning', intro: 'Pitch, speed, roll and the stall: a held dive, a release, reversals, turns, a spiral and stalls straight and turning. Fly it: W/S the bar, A/D weight shift.',
    channels: [
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
      { label: 'Angle of attack', unit: '°', get: s => deg(s.alpha) },
      { label: 'Flight path', unit: '°', get: s => deg(s.pathAngle) },
      { label: 'Bank', unit: '°', get: s => deg(s.bank) },
      { label: 'Load', unit: 'g', get: s => s.load },
    ],
    sliders: [
      ['config', 'rollFrequency', 'Roll quickness', 1, 5, 0.05], ['config', 'slowBank', 'Bank when slow', 0.2, 1, 0.01], ['config', 'stallRollFactor', 'Roll when stalled', 0.1, 1, 0.01],
      ['config', 'rollDamping', 'Tip drop (stall)', 0, 12, 0.1], ['config', 'airRoughness', 'Air roughness', 0, 1, 0.01],
      ['config', 'stallBlend', 'Stall softness', 4, 24, 0.5, true], ['config', 'plateLift', 'Stalled sail lift', 0.8, 2, 0.01],
      ['config', 'pitchTau', 'Pitch lag', 0.08, 0.5, 0.01], ['config', 'speedStability', 'Speed stability', 0, 1, 0.01, true], ['config', 'pitchDamping', 'Pitch damping', 0, 1.5, 0.02],
      ['config', 'freeLoad', 'Hands-off pull', 1, 2.5, 0.05], ['config', 'loadLimit', 'Bar pull limit', 1.5, 4, 0.05],
      ['config', 'alphaMin', 'Full bar in (top speed)', -4, 4, 0.05, true], ['config', 'alphaTrim', 'Hands off (trim)', 2, 14, 0.05, true], ['config', 'cd0', 'Drag (glide)', 0.01, 0.12, 0.001],
      ['config', 'luffTuck', 'Luff tuck', 0, 6, 0.1, true], ['config', 'luffLoss', 'Luff recovery lost', 0, 1, 0.01],
    ],
  },
  landing: {
    title: 'Landing tuning', intro: 'The final and the flare: at the cue, early, late, none, fast, eased out, and in calm, wind and gusts. Fly it: W/S the bar (hold S to flare), A/D weight shift.',
    channels: [
      { label: 'Height of the feet', unit: 'm', get: s => s.feet },
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
      { label: 'Sink', unit: 'm/s', get: s => -s.verticalSpeed },
      { label: 'Angle of attack', unit: '°', get: s => deg(s.alpha) },
      { label: 'Bar (+ out)', unit: '', get: s => s.bar },
    ],
    sliders: [
      ['config', 'dynamicLift', 'Flare lift spike', 0.5, 2.5, 0.02], ['config', 'barOutSeconds', 'Push-out time', 0.2, 1.2, 0.02], ['config', 'outCurve', 'Push-out curve', 1, 3, 0.05],
      ['config', 'barPressureMax', 'Bar pressure', 1, 3, 0.05], ['config', 'groundCushion', 'Ground cushion', 0, 6, 0.1], ['config', 'uprightDrag', 'Upright drag', 0, 0.5, 0.01],
      ['config', 'finalUpright', 'Upright on final', 0, 0.6, 0.01], ['config', 'settleAngle', 'Settle under S', 0, 10, 0.1], ['config', 'pitchAuthority', 'Flare authority', 0.02, 0.3, 0.005],
      ['config', 'plateDrag', 'Stalled sail drag', 0.5, 2, 0.02], ['config', 'plateLift', 'Stalled sail lift', 0.8, 2, 0.01], ['config', 'stallBlend', 'Stall softness', 4, 24, 0.5, true],
      ['config', 'rollDamping', 'Tip drop (stall)', 0, 12, 0.1],
    ],
  },
};
const OTHER = { launch: ['flight', 'landing'], flight: ['launch', 'landing'], landing: ['launch', 'flight'] };

/* ---------- the page ---------- */

export async function mountTuner(kind) {
  const page = PAGES[kind], scenarios = SCENARIOS.filter(s => s.kind === kind);
  const q = new URLSearchParams(location.search);
  const prefs = {
    preset: PRESETS[q.get('glider')] ? q.get('glider') : 'falcon-170',
    vg: Number(q.get('vg')) || 0,
    scenario: scenarios.find(s => s.id === q.get('scenario'))?.id ?? scenarios[0].id,
    compare: PRESETS[q.get('compare')] ? q.get('compare') : '',
    speed: 1, pilot: 'script',
    tuning: { config: {}, launch: {} },
  };
  document.title = `${page.title} · hgsim`;
  document.body.innerHTML = layout(kind, page, scenarios);

  /* scene */
  const canvas = $('#views canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setScissorTest(true);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb7cfdd); scene.fog = new THREE.Fog(0xb7cfdd, 300, 1400);
  scene.add(new THREE.HemisphereLight(0xdcecf8, 0x6d7a57, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.2); sun.position.set(-300, 600, 200); scene.add(sun);
  const groundGroup = new THREE.Group(); scene.add(groundGroup);
  // World-fixed grids every 10 m that follow the glider, so speed, height and path read against something even high up.
  const wallGrid = new THREE.GridHelper(400, 40, 0x6f8797, 0x8fa7b6); wallGrid.rotation.z = Math.PI / 2; wallGrid.layers.set(1); scene.add(wallGrid);   // (layer 1: the side view's)
  const floorGrid = new THREE.GridHelper(400, 40, 0x6f8797, 0x9fb6c4); floorGrid.layers.set(2); scene.add(floorGrid);   // (layer 2: the top and behind views')
  const trail = makeLine(0xf28c28), ghost = makeLine(0x34495e, true); scene.add(trail.line, ghost.line);
  const player = new THREE.Group(); scene.add(player);
  let rig = null;
  try {
    const gltf = await new GLTFLoader().loadAsync('../../assets/hang-glider.glb');
    player.add(gltf.scene); const pilot = gltf.scene.getObjectByName('Pilot'); rig = pilot ? createPilotRig(THREE, pilot) : null;
  } catch (e) { console.warn('glider model:', e.message); player.add(new THREE.Mesh(new THREE.ConeGeometry(5, 4, 3), new THREE.MeshStandardMaterial({ color: 0xe16231 }))); }

  const views = [
    { id: 'side', label: 'Side', camera: new THREE.OrthographicCamera(), zoom: kind === 'flight' ? 22 : 9 },
    { id: 'top', label: 'Top', camera: new THREE.OrthographicCamera(), zoom: kind === 'flight' ? 30 : 12 },
    { id: 'rear', label: 'Behind', camera: new THREE.PerspectiveCamera(48, 1, 0.3, 4000), zoom: 16 },
    { id: 'front', label: 'In front', camera: new THREE.PerspectiveCamera(48, 1, 0.3, 4000), zoom: 16 },
  ];
  views[0].camera.layers.enable(1); views[1].camera.layers.enable(2); views[2].camera.layers.enable(2);
  for (const v of views) {
    v.el = $(`#views [data-view="${v.id}"]`);
    v.el.addEventListener('wheel', e => { e.preventDefault(); v.zoom = clamp(v.zoom * Math.exp(e.deltaY * 0.001), 3, 400); }, { passive: false });
  }

  /* state */
  let run = null, result = null, compare = null, pinned = null, scrub = null, playing = false, last = performance.now(), poseBlend = 0, lastLaunchPose = null;
  const keys = new Set(); let spaceLatch = false;

  /* controls in the side panel */
  const presetSel = $('#preset'), vgRow = $('#vgRow'), vgInput = $('#vg'), compareSel = $('#compare');
  for (const p of Object.values(PRESETS)) { presetSel.add(new Option(`${p.name} · ${p.era}`, p.id)); compareSel.add(new Option(p.name, p.id)); }
  presetSel.value = prefs.preset; compareSel.value = prefs.compare; vgInput.value = prefs.vg;
  presetSel.onchange = () => { prefs.preset = presetSel.value; prefs.tuning = { config: {}, launch: {} }; syncWing(); restart(); };
  vgInput.oninput = () => { prefs.vg = Number(vgInput.value); $('#vgV').textContent = vgLabel(prefs.vg); if (run && run.phase !== 'done') run.glider.setVG(prefs.vg); syncSliders(); saveUrl(); };
  vgInput.onchange = () => restart();
  compareSel.onchange = () => { prefs.compare = compareSel.value; pinned = null; computeCompare(); saveUrl(); };
  for (const b of document.querySelectorAll('[data-scenario]')) b.onclick = () => { prefs.scenario = b.dataset.scenario; restart(); };
  $('#play').onclick = () => { prefs.pilot = 'script'; restart(); };
  $('#fly').onclick = () => { prefs.pilot = 'you'; restart(); canvas.focus(); };
  $('#pause').onclick = () => { playing = !playing && !!run && run.phase !== 'done'; syncTransport(); };
  for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => { prefs.speed = Number(b.dataset.speed); syncTransport(); };
  $('#pin').onclick = () => { if (result) { pinned = { label: `pinned: ${wingLabel(result.preset, result.vg)}`, result }; compareSel.value = ''; prefs.compare = ''; compare = pinned; showResults(); drawCharts(); syncGhost(); } };
  $('#scrub').oninput = () => { scrub = Number($('#scrub').value); playing = false; syncTransport(); };
  $('#allWings').onclick = allWings;
  $('#copy').onclick = copyValues;
  $('#resetTuning').onclick = () => { prefs.tuning = { config: {}, launch: {} }; if (run) run.glider.tune(); syncSliders(); restart(); };

  /* feel sliders */
  const sliderBox = $('#sliders');
  for (const [target, key, label, min, max, step, isDeg] of page.sliders) {
    const row = document.createElement('label'); row.className = 'slider';
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
    const input = $('input', row), out = $('output', row);
    input.oninput = () => {
      const value = Number(input.value) * (isDeg ? DEG : 1);
      prefs.tuning[target][key] = value; out.textContent = format(Number(input.value)); row.classList.add('changed');
      if (target === 'config' && run) run.glider.tune({ [key]: value });   // (live, in this run; the launch's values apply from the next run)
      if (target === 'launch') $('#launchNote').hidden = false;
    };
    row.dataset.key = key; row.dataset.target = target; row.dataset.deg = isDeg ? 1 : ''; sliderBox.append(row);
  }

  function syncSliders() {
    const g = createGlider({ preset: prefs.preset }); if (g.hasVG) g.setVG(prefs.vg);
    for (const row of sliderBox.children) {
      const { key, target } = row.dataset, base = target === 'config' ? g.config[key] : g.launchConfig[key];
      const tuned = prefs.tuning[target][key], value = (tuned ?? base) / (row.dataset.deg ? DEG : 1);
      $('input', row).value = value; $('output', row).textContent = format(value); row.classList.toggle('changed', tuned !== undefined);
    }
    $('#launchNote').hidden = true;
  }
  function syncWing() {
    const p = PRESETS[prefs.preset];
    vgRow.hidden = !p.vg; $('#vgV').textContent = vgLabel(prefs.vg);
    $('#wingInfo').textContent = p.description;
    const polar = createGlider({ preset: p.id }).setVG(prefs.vg).polar(), k = v => (v * KMH).toFixed(0);
    $('#wingStats').textContent = `stall ${k(polar.stallSpeed)} · trim ${k(polar.trimSpeed)} · top ${k(polar.topSpeed)} km/h · glide ${polar.bestGlide.glideRatio.toFixed(1)}${p.difficulty !== undefined ? ` · difficulty ${p.difficulty}` : ''}`;
    syncSliders(); saveUrl();
  }

  /* running */
  function options(preset = prefs.preset, vg = prefs.vg, pilot = prefs.pilot) {
    return { preset, vg, pilot, config: preset === prefs.preset ? prefs.tuning.config : {}, launch: preset === prefs.preset ? prefs.tuning.launch : {} };
  }
  function restart() {
    const sc = scenarios.find(s => s.id === prefs.scenario);
    for (const b of document.querySelectorAll('[data-scenario]')) b.classList.toggle('on', b.dataset.scenario === sc.id);
    $('#look').textContent = sc.look;
    run = startScenario(sc.id, options()); result = null; scrub = null; playing = true; poseBlend = 0; lastLaunchPose = null; spaceLatch = false;
    buildGround(run.site, sc.kind); trail.reset();
    if (pinned && pinned.result.scenario !== sc.id) pinned = null;
    computeCompare(); showResults(); syncTransport(); saveUrl();
    $('#flyHint').hidden = prefs.pilot !== 'you';
  }
  function computeCompare() {
    if (pinned) compare = pinned;
    else if (prefs.compare) { const r = runScenario(prefs.scenario, { preset: prefs.compare, vg: prefs.vg }); compare = { label: wingLabel(prefs.compare, r.vg), result: r }; }
    else compare = null;
    syncGhost(); showResults(); drawCharts();
  }
  function syncGhost() { ghost.set(compare ? compare.result.samples : []); }

  function yourControls() {
    const held = (...codes) => codes.some(c => keys.has(c)) ? 1 : 0;
    const lr = held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), ud = held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp');
    if (run.phase === 'launch') {
      const s = run.launch.state, space = keys.has('Space'), press = space && !spaceLatch; spaceLatch = space;
      return { balance: lr, nose: ud, push: held('ShiftLeft', 'ShiftRight'), go: s.go || (press && s.phase !== 'run'), jump: press && s.phase === 'run' };
    }
    return { roll: lr, pitch: ud, field: run.samples.at(-1)?.feet < 12 };
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (run && playing && run.phase !== 'done') {
      run.step(dt * prefs.speed, prefs.pilot === 'you' ? yourControls() : {});
      if (run.phase === 'done') { result = run.result; playing = false; scrub = result.samples.length - 1; showResults(); syncTransport(); }
      $('#clock').textContent = `${run.t.toFixed(1)} s`;
    }
    if (run) { draw(dt); drawChartsThrottled(now); }
    requestAnimationFrame(frame);
  }

  /* drawing the glider and the views */
  function draw(dt) {
    const s = run.glider.state, samples = run.samples;
    let x = s.x, y = s.y, z = s.z, heading = s.heading;
    const scrubbing = scrub !== null && run.phase === 'done' && scrub < samples.length - 1;
    if (scrubbing) {
      const sm = samples[scrub]; x = sm.x; y = sm.y; z = sm.z; heading = sm.heading;
      player.position.set(x, y - (sm.feet < 8 ? 2.3 - 0.65 : 0) * clamp(1 - sm.feet / 8, 0, 1), z);
      player.rotation.set(-(sm.phase === 'launch' ? 0 : sm.pitch), heading, sm.bank, 'YXZ');
      rig?.update(0, { bar: -sm.bar, shift: sm.controls?.roll ?? 0, upright: sm.upright, run: sm.phase === 'launch' ? 1 : 0 });
      $('#clock').textContent = `${sm.t.toFixed(1)} s`;
    } else if (run.phase === 'launch' || (run.phase === 'done' && run.launch && !run.launch.airborne)) {
      const l = run.launch, pose = l.pose(rig?.step ?? 0), ground = (run.site.site.ground ?? run.world.heightAt)(x, z);
      player.position.set(x, ground + pose.height, z);
      player.rotation.set(pose.pitch, heading + pose.yaw, pose.roll, 'YXZ');
      const o = shoulderPivot(pose.pitch, heading + pose.yaw, pose.roll, pose.shoulders); player.position.x += o[0]; player.position.y += o[1]; player.position.z += o[2];
      const rx = player.rotation.x;
      rig?.update(dt, { upright: 1, level: -rx, shoulders: pose.shoulders, shift: pose.shift, standRoll: -pose.roll, standYaw: -pose.yaw, run: pose.run, lift: pose.lift, carry: pose.carry, grip: pose.grip,
        lean: pose.lean - rx, speed: l.state.groundSpeed, ground: (ground - player.position.y) / Math.cos(rx), tilt: Math.tan(rx) - run.site.site.fall(x, z, heading), plant: pose.plant }, !lastLaunchPose);
      lastLaunchPose = { position: player.position.clone(), quaternion: player.quaternion.clone() };
    } else {
      const ground = run.world.heightAt(x, z);
      const pose = getAirframePose({ position: { x, y, z }, heading, pitch: s.pitch, bank: s.bank, visualBank: s.visualBank ?? s.bank, ground, lowest: rig?.lowest ?? -0.65, hasRig: !!rig, mode: 'gliding' });
      player.position.set(pose.x, pose.y, pose.z); player.rotation.set(pose.pitch, pose.heading, pose.roll, 'YXZ');
      if (lastLaunchPose && poseBlend < 1) {   // (just off a launch: ease from the run's attitude to the flight's)
        poseBlend = Math.min(1, poseBlend + dt / 0.6); const k = smooth(0, 1, poseBlend);
        player.position.lerpVectors(lastLaunchPose.position, player.position, k); player.quaternion.slerpQuaternions(lastLaunchPose.quaternion, player.quaternion, k);
      }
      const c = samples.at(-1)?.controls ?? {};
      rig?.update(dt, { bar: -(s.bar || 0), shift: c.roll ?? 0, upright: s.upright ?? 0, handGap: s.flare > 0.05 ? 0.2 : undefined });
    }
    if (!scrubbing) trail.push(player.position.x, player.position.y, player.position.z);
    const cx = player.position.x, cy = player.position.y, cz = player.position.z;
    wallGrid.position.set(cx - 25, Math.round(cy / 10) * 10, Math.round(cz / 10) * 10);
    floorGrid.position.set(Math.round(cx / 10) * 10, cy - 12, Math.round(cz / 10) * 10);   // (high up, a floor to read the top view and the turn against)
    floorGrid.visible = kind === 'flight';
    renderViews(cx, cy, cz, heading);
    readouts(scrubbing ? samples[scrub] : null);
  }

  function renderViews(x, y, z, heading) {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) renderer.setSize(rect.width, rect.height, false), renderer.setPixelRatio(dpr);
    const fx = Math.sin(heading), fz = Math.cos(heading);
    for (const v of views) {
      const r = v.el.getBoundingClientRect(), w = r.width, h = r.height, left = r.left - rect.left, bottom = rect.bottom - r.bottom;
      renderer.setViewport(left, bottom, w, h); renderer.setScissor(left, bottom, w, h);
      const cam = v.camera, aspect = w / Math.max(1, h);
      if (cam.isOrthographicCamera) { const half = v.zoom; Object.assign(cam, { left: -half * aspect, right: half * aspect, top: half, bottom: -half, near: -2000, far: 4000 }); cam.updateProjectionMatrix(); }
      else { cam.aspect = aspect; cam.updateProjectionMatrix(); }
      if (v.id === 'side') { cam.up.set(0, 1, 0); cam.position.set(x + 100, y, z); cam.lookAt(x, y, z); }
      else if (v.id === 'top') { cam.up.set(0, 0, 1); cam.position.set(x, y + 200, z); cam.lookAt(x, y, z); }
      else if (v.id === 'rear') { cam.up.set(0, 1, 0); cam.position.set(x - fx * v.zoom, y + v.zoom * 0.18, z - fz * v.zoom); cam.lookAt(x, y, z); }
      else { cam.up.set(0, 1, 0); cam.position.set(x + fx * v.zoom, y + v.zoom * 0.12, z + fz * v.zoom); cam.lookAt(x, y, z); }
      renderer.render(scene, cam);
    }
  }

  function readouts(sm) {
    const s = sm ?? run.samples.at(-1) ?? {}, d = v => `${deg(v ?? 0).toFixed(0)}°`;
    const launching = s.phase === 'launch';
    $('[data-view="side"] .info').textContent = `path ${d(s.pathAngle)} · α ${d(s.alpha)} · ${((s.airspeed ?? 0) * KMH).toFixed(0)} km/h · feet ${(s.feet ?? 0).toFixed(1)} m`;
    $('[data-view="top"] .info').textContent = `heading ${d(s.heading)} · over the ground ${((s.groundSpeed ?? 0) * KMH).toFixed(0)} km/h`;
    $('[data-view="rear"] .info').textContent = launching ? `wing roll ${d(s.bank)} · yaw ${d(s.yaw)} · carries ${Math.round((s.lift ?? 0) * 100)}%` : `bank ${d(s.bank)} · load ${(s.load ?? 1).toFixed(2)} g`;
    $('[data-view="front"] .info').textContent = launching ? `${s.launchPhase ?? ''}` : `bar ${(s.bar ?? 0).toFixed(2)}${s.stalled ? ' · STALLED' : ''}`;
  }

  function buildGround(place, scKind) {
    groundGroup.clear();
    const span = scKind === 'landing' ? { x0: -120, x1: 120, z0: -420, z1: 160, step: 4 } : scKind === 'launch' ? { x0: -60, x1: 60, z0: -40, z1: 240, step: 1 } : { x0: -300, x1: 300, z0: -300, z1: 900, step: 10 };
    const nx = Math.round((span.x1 - span.x0) / span.step), nz = Math.round((span.z1 - span.z0) / span.step);
    const geo = new THREE.PlaneGeometry(span.x1 - span.x0, span.z1 - span.z0, nx, nz); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (span.x0 + span.x1) / 2, z = pos.getZ(i) + (span.z0 + span.z1) / 2, y = place.terrain(x, z);
      pos.setXYZ(i, x, y, z);
      const stripe = (Math.floor(x / 10) + Math.floor(z / 10)) % 2 ? 0.94 : 1;   // (10 m checks: a scale on the ground)
      colors.push(0.42 * stripe, 0.56 * stripe, 0.3 * stripe);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    groundGroup.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })));
    if (place.name === 'ramp') {   // the deck: timber over the run
      const len = 18 / Math.cos(20 * DEG), deck = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, len), new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.8 }));
      deck.position.set(0, place.terrain(0, -9) - 0.12, -9); deck.rotation.x = 20 * DEG; groundGroup.add(deck);
    }
    if (scKind === 'landing') {   // the mark on the field
      const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.05, 0); groundGroup.add(ring);
    }
  }

  /* results, comparison and traces */
  function showResults() {
    const box = $('#results');
    if (!result && !compare) { box.innerHTML = '<p class="dim">Running…</p>'; return; }
    const m = result?.metrics ?? {}, c = compare?.result.metrics ?? {}, keysOf = Object.keys({ ...c, ...m }).filter(k => !Array.isArray(m[k] ?? c[k]));
    const cell = v => v === null || v === undefined ? '–' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : v;
    box.innerHTML = `<div class="outcome ${outcomeClass(result?.outcome)}">${result ? result.outcome : '…'}</div>
      ${result?.metrics?.notes?.length ? `<p class="dim">${result.metrics.notes.join(' · ')}</p>` : ''}
      <table><tr><th></th><th>${wingLabel(prefs.preset, prefs.vg)}</th>${compare ? `<th>${compare.label}</th>` : ''}</tr>
      ${compare ? `<tr><td>outcome</td><td>${result?.outcome ?? '…'}</td><td>${compare.result.outcome}</td></tr>` : ''}
      ${keysOf.map(k => `<tr><td>${humanize(k)}</td><td>${result ? cell(m[k]) : '…'}</td>${compare ? `<td>${cell(c[k])}</td>` : ''}</tr>`).join('')}</table>`;
  }
  let chartsAt = 0;
  function drawChartsThrottled(now) { if (now - chartsAt > 120) { chartsAt = now; drawCharts(); } }
  function drawCharts() {
    const cv = $('#charts'), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    cv.width = r.width * dpr; cv.height = r.height * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const css = getComputedStyle(document.body), ink = css.getPropertyValue('--dim'), accent = css.getPropertyValue('--accent'), cmp = css.getPropertyValue('--compare');
    const series = [run?.samples ?? [], compare?.result.samples ?? []], tMax = Math.max(1, ...series.map(s => s.at(-1)?.t ?? 0));
    const rows = page.channels, h = r.height / rows.length, padL = 150;
    g.font = '11px system-ui'; g.textBaseline = 'middle';
    rows.forEach((ch, i) => {
      const top = i * h, vals = series.flatMap(s => s.map(ch.get)).filter(v => v !== null && Number.isFinite(v));
      let lo = Math.min(...vals, 0), hi = Math.max(...vals, 0.001); if (hi - lo < 1e-6) hi = lo + 1; const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const X = t => padL + (r.width - padL - 8) * t / tMax, Y = v => top + h - 4 - (h - 8) * (v - lo) / (hi - lo);
      g.strokeStyle = 'rgba(128,140,150,.25)'; g.beginPath(); g.moveTo(padL, Y(0)); g.lineTo(r.width - 8, Y(0)); g.stroke();
      g.fillStyle = ink; g.fillText(`${ch.label}${ch.unit ? ` (${ch.unit})` : ''}`, 8, top + h / 2 - 7);
      g.fillText(`${hi.toFixed(1)} … ${lo.toFixed(1)}`, 8, top + h / 2 + 8);
      [[series[1], cmp], [series[0], accent]].forEach(([s, color]) => {
        g.strokeStyle = color; g.lineWidth = 1.6; g.beginPath(); let pen = false;
        for (const p of s) { const v = ch.get(p); if (v === null || !Number.isFinite(v)) { pen = false; continue; } if (pen) g.lineTo(X(p.t), Y(v)); else { g.moveTo(X(p.t), Y(v)); pen = true; } }
        g.stroke();
      });
      if (scrub !== null && run?.samples[scrub]) { g.strokeStyle = ink; g.beginPath(); g.moveTo(X(run.samples[scrub].t), top + 2); g.lineTo(X(run.samples[scrub].t), top + h - 2); g.stroke(); }
    });
  }

  function syncTransport() {
    $('#pause').textContent = playing ? 'Pause' : 'Resume';
    $('#pause').disabled = !run || run.phase === 'done';
    for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === prefs.speed);
    const sc = $('#scrub'); sc.disabled = !result; if (result) { sc.max = result.samples.length - 1; sc.value = scrub ?? sc.max; }
    $('#pin').disabled = !result;
    drawCharts();
  }

  function allWings() {
    const box = $('#all'), ids = [...LADDER, ...Object.keys(PRESETS).filter(id => !LADDER.includes(id))];
    const rows = ids.flatMap(id => (PRESETS[id].vg ? [0, 1] : [0]).map(vg => ({ id, vg, r: runScenario(prefs.scenario, { preset: id, vg }) })));
    const keysShown = Object.keys(rows[0].r.metrics).filter(k => !Array.isArray(rows[0].r.metrics[k])).slice(0, 4);
    box.innerHTML = `<table><tr><th>wing</th><th>outcome</th>${keysShown.map(k => `<th>${humanize(k)}</th>`).join('')}</tr>${rows.map(({ id, vg, r }) =>
      `<tr><td>${wingLabel(id, vg)}</td><td class="${outcomeClass(r.outcome)}">${r.outcome}</td>${keysShown.map(k => `<td>${r.metrics[k] ?? '–'}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  function copyValues() {
    const fmt = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toPrecision(4)]));
    const text = JSON.stringify({ preset: prefs.preset, vg: prefs.vg, config: fmt(prefs.tuning.config), launch: fmt(prefs.tuning.launch) }, null, 2);
    navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast('Copy failed: see the box'));
    $('#copied').value = text; $('#copied').hidden = false;
  }

  function saveUrl() {
    const p = new URLSearchParams({ glider: prefs.preset, scenario: prefs.scenario }); if (PRESETS[prefs.preset].vg) p.set('vg', prefs.vg); if (prefs.compare) p.set('compare', prefs.compare);
    history.replaceState(null, '', `?${p}`);
  }

  /* keys */
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea')) return;
    if (prefs.pilot === 'you' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyR') restart();
    if (e.code === 'KeyP') $('#pause').click();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // New code on the server is picked up between runs, as on the range.
  let version = null; setInterval(() => fetch('/__version').then(r => r.ok ? r.text() : null).then(v => { if (!v) return; version ??= v; if (v !== version && !playing) location.reload(); }, () => {}), 2000);

  function toast(text) { const t = $('#toast'); t.textContent = text; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1400); }

  syncWing(); restart(); requestAnimationFrame(frame);
}

/* ---------- helpers ---------- */

function makeLine(color, dashed = false) {
  const max = 6000, geo = new THREE.BufferGeometry(), buf = new Float32Array(max * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(buf, 3)); geo.setDrawRange(0, 0);
  const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 1.5, gapSize: 1 }) : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat); line.frustumCulled = false;
  let n = 0;
  return {
    line,
    reset() { n = 0; geo.setDrawRange(0, 0); },
    push(x, y, z) { if (n >= max) return; if (n && Math.hypot(buf[n * 3 - 3] - x, buf[n * 3 - 2] - y, buf[n * 3 - 1] - z) < 0.3) return; buf.set([x, y, z], n * 3); n++; geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; },
    set(samples) { n = 0; for (const s of samples) { if (n >= max) break; buf.set([s.x, s.y - (s.feet < 8 ? 1.65 * clamp(1 - s.feet / 8, 0, 1) : 0), s.z], n * 3); n++; } geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; if (dashed) line.computeLineDistances(); },
  };
}
const vgLabel = v => v < 0.02 ? 'off (loose)' : v > 0.98 ? 'on (tight)' : `${Math.round(v * 100)}%`;
const wingLabel = (id, vg) => `${PRESETS[id]?.name ?? id}${PRESETS[id]?.vg ? (vg > 0.5 ? ' VG on' : ' VG off') : ''}`;
const format = v => Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
const humanize = k => k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/ (kmh|deg|metres|seconds|ms)$/, (m, u) => ({ kmh: ' (km/h)', deg: ' (°)', metres: ' (m)', seconds: ' (s)', ms: ' (m/s)' })[u]);
const outcomeClass = o => ['soft', 'flying', 'done'].includes(o) ? 'good' : ['firm', 'no launch', 'sank back'].includes(o) ? 'warn' : o ? 'bad' : '';

function layout(kind, page, scenarios) {
  return `
  <header>
    <h1>${page.title}</h1>
    <nav>${OTHER[kind].map(k => `<a href="../${k}/${location.search}">${PAGES[k].title}</a>`).join('')}<a href="../../">Range</a></nav>
    <p>${page.intro}</p>
  </header>
  <main>
    <section id="views">
      <canvas tabindex="0"></canvas>
      ${['side', 'top', 'rear', 'front'].map(v => `<div class="view" data-view="${v}"><b>${{ side: 'Side', top: 'Top', rear: 'Behind', front: 'In front' }[v]}</b><span class="info"></span></div>`).join('')}
      <div id="flyHint" hidden>You are flying: ${kind === 'launch' ? 'A/D balance · W/S nose · Shift run hard · Space run, then jump' : 'W/S bar · A/D weight shift'} · R restart</div>
    </section>
    <aside>
      <div class="group">
        <label>Wing <select id="preset"></select></label>
        <label id="vgRow">VG <input id="vg" type="range" min="0" max="1" step="0.05"><output id="vgV"></output></label>
        <p id="wingInfo" class="dim"></p><p id="wingStats"></p>
      </div>
      <div class="group">
        <h2>Scenario</h2>
        <div class="scenarios">${scenarios.map(s => `<button data-scenario="${s.id}" title="${s.look}">${s.name}</button>`).join('')}</div>
        <p id="look" class="dim"></p>
        <div class="transport">
          <button id="play">Run</button><button id="fly">Fly it</button><button id="pause">Pause</button>
          <span class="speeds">${[0.25, 0.5, 1, 2].map(s => `<button data-speed="${s}">${s}×</button>`).join('')}</span><span id="clock"></span>
        </div>
        <input id="scrub" type="range" min="0" max="0" value="0" disabled>
      </div>
      <div class="group">
        <h2>Result</h2>
        <label>Compare with <select id="compare"><option value="">nothing</option></select></label>
        <button id="pin">Pin this run</button> <button id="allWings">Every wing</button>
        <div id="results"></div><div id="all"></div>
      </div>
      <div class="group">
        <h2>Feel</h2>
        <p id="launchNote" class="dim" hidden>Launch values apply from the next run (R).</p>
        <div id="sliders"></div>
        <button id="copy">Copy values</button> <button id="resetTuning">Reset to the wing</button>
        <textarea id="copied" hidden readonly></textarea>
      </div>
    </aside>
    <canvas id="charts"></canvas>
  </main>
  <div id="toast"></div>`;
}
