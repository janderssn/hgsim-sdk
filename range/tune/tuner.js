/**
 * The tuner: an app for tuning how a wing feels. One scenario at a time (src/scenarios.js) is flown on one wing, by a scripted pilot
 * the same way every time, or by you (Fly), and recorded every frame. The stage shows it in a game view behind the glider, or from
 * the side, the top, behind or in front, or all four at once. The timeline under it replays the recording, steps it frame by frame,
 * holds the traces of the run lined up with the playhead, and carries your notes, each pinned to a moment and saved for review
 * (work/notes). The inspector holds the result, the feel values that shape it, comparisons with other wings, and the notes.
 * mountTuner(kind) builds it for 'launch', 'flight' or 'landing'. URL options: glider (a preset id), vg (0..1), scenario (an id),
 * compare (a preset id), view (game, side, top, rear, front, quad).
 */
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createPilotRig } from '../../src/three/index.js';
import { PRESETS, SCENARIOS, startScenario, runScenario, createGlider } from '../../src/index.js';
import { shoulderPivot } from '../../src/launch.js';
import { getAirframePose } from '../airframe-pose.js';

const DEG = Math.PI / 180, KMH = 3.6, FRAME = 1 / 60;
const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const deg = v => v / DEG;
const LADDER = ['alpha-235', 'falcon-170', 'sport-2', 'u2-160', 't2c-144'];

/* ---------- what each mode shows ---------- */

const PAGES = {
  launch: {
    title: 'Launch', keys: 'A/D balance · W/S nose · Shift run hard · Space run, then jump',
    channels: [
      { label: 'Roll on the shoulders', unit: '°', get: s => s.phase === 'launch' ? deg(s.bank) : null },
      { label: 'Nose', unit: '°', get: s => deg(s.alpha) },
      { label: 'Weight carried', unit: '', get: s => s.phase === 'launch' ? s.lift : null },
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
    ],
    sliders: [
      ['launch', 'rollTip', 'Wing goes over', 0.2, 3, 0.05], ['launch', 'drift', 'Slow drift', 0, 2.5, 0.05], ['launch', 'reflexMax', 'Reflexes hold', 0, 1.2, 0.02],
      ['launch', 'gustRoll', 'Gusts roll it', 0, 0.3, 0.01], ['launch', 'rollLimit', 'Tip touches at', 0.2, 0.6, 0.01, true], ['launch', 'rollAuthority', 'Weight shift', 0.5, 4, 0.05],
      ['launch', 'noseRise', 'Nose rises', 0, 8, 0.1, true], ['launch', 'noseSwell', 'Nose wanders', 0, 4, 0.1, true], ['launch', 'noseRate', 'Nose control', 4, 25, 0.5, true],
      ['launch', 'wingShare', 'Wing weight share', 0.1, 0.45, 0.01], ['launch', 'holdLift', 'Held lift share', 0.6, 1, 0.01], ['launch', 'runStallLift', 'Run stall loss', 0.2, 1, 0.02],
      ['launch', 'topSpeed', 'Run speed', 4, 9, 0.1], ['launch', 'accel', 'Run acceleration', 0.8, 3.5, 0.05], ['launch', 'yawAero', 'Weathervane', 0.5, 5, 0.1],
    ],
    groups: [['Balance on the shoulders', ['rollTip', 'drift', 'reflexMax', 'gustRoll', 'rollLimit', 'rollAuthority']], ['The nose', ['noseRise', 'noseSwell', 'noseRate', 'holdLift', 'runStallLift']], ['The run', ['wingShare', 'topSpeed', 'accel', 'yawAero']]],
  },
  flight: {
    title: 'Flight', keys: 'W/S bar · A/D weight shift',
    channels: [
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
      { label: 'Angle of attack', unit: '°', get: s => deg(s.alpha) },
      { label: 'Flight path', unit: '°', get: s => deg(s.pathAngle) },
      { label: 'Bank', unit: '°', get: s => deg(s.bank) },
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
    groups: [['Roll', ['rollFrequency', 'slowBank', 'stallRollFactor']], ['Stall', ['rollDamping', 'airRoughness', 'stallBlend', 'plateLift']], ['Pitch', ['pitchTau', 'speedStability', 'pitchDamping', 'freeLoad', 'loadLimit']], ['Speed and glide', ['alphaMin', 'alphaTrim', 'cd0']], ['Old sails', ['luffTuck', 'luffLoss']]],
  },
  landing: {
    title: 'Landing', keys: 'W/S bar (hold S to flare) · A/D weight shift',
    channels: [
      { label: 'Height of the feet', unit: 'm', get: s => s.feet },
      { label: 'Airspeed', unit: 'km/h', get: s => s.airspeed * KMH },
      { label: 'Sink', unit: 'm/s', get: s => -s.verticalSpeed },
      { label: 'Bar (+ out)', unit: '', get: s => s.bar },
    ],
    sliders: [
      ['config', 'dynamicLift', 'Flare lift spike', 0.5, 2.5, 0.02], ['config', 'barOutSeconds', 'Push-out time', 0.2, 1.2, 0.02], ['config', 'outCurve', 'Push-out curve', 1, 3, 0.05],
      ['config', 'barPressureMax', 'Bar pressure', 1, 3, 0.05], ['config', 'groundCushion', 'Ground cushion', 0, 6, 0.1], ['config', 'uprightDrag', 'Upright drag', 0, 0.5, 0.01],
      ['config', 'finalUpright', 'Upright on final', 0, 0.6, 0.01], ['config', 'settleAngle', 'Settle under S', 0, 10, 0.1], ['config', 'pitchAuthority', 'Flare authority', 0.02, 0.3, 0.005],
      ['config', 'plateDrag', 'Stalled sail drag', 0.5, 2, 0.02], ['config', 'plateLift', 'Stalled sail lift', 0.8, 2, 0.01], ['config', 'stallBlend', 'Stall softness', 4, 24, 0.5, true],
      ['config', 'rollDamping', 'Tip drop (stall)', 0, 12, 0.1],
    ],
    groups: [['The flare', ['dynamicLift', 'barOutSeconds', 'outCurve', 'barPressureMax', 'pitchAuthority']], ['The final', ['groundCushion', 'uprightDrag', 'finalUpright', 'settleAngle']], ['The stall', ['plateDrag', 'plateLift', 'stallBlend', 'rollDamping']]],
  },
};
const VIEW_NAMES = { game: 'Game', side: 'Side', top: 'Top', rear: 'Behind', front: 'In front', quad: 'All four' };
const QUAD = ['side', 'top', 'rear', 'front'];

/* ---------- icons ---------- */
const ICON = {
  restart: '<path d="M5 5v14M19 6l-9 6 9 6z"/>', back: '<path d="M7 6v12M18 6l-8 6 8 6z"/>', play: '<path d="M8 5l12 7-12 7z"/>', pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>',
  fwd: '<path d="M17 6v12M6 6l8 6-8 6z"/>', fly: '<circle cx="12" cy="12" r="6"/>', note: '<path d="M5 4h14v12l-4 4H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="2"/>',
  panel: '<path d="M4 5h16v14H4zM14 5v14" fill="none" stroke="currentColor" stroke-width="2"/>', list: '<path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="2"/>',
  traces: '<path d="M3 15l4-6 4 4 4-8 6 10" fill="none" stroke="currentColor" stroke-width="2"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

/* ---------- the app ---------- */

export async function mountTuner(kind) {
  const page = PAGES[kind], scenarios = SCENARIOS.filter(s => s.kind === kind);
  const q = new URLSearchParams(location.search);
  const prefs = {
    preset: PRESETS[q.get('glider')] ? q.get('glider') : 'falcon-170',
    vg: Number(q.get('vg')) || 0,
    scenario: scenarios.find(s => s.id === q.get('scenario'))?.id ?? scenarios[0].id,
    compare: PRESETS[q.get('compare')] ? q.get('compare') : '',
    view: VIEW_NAMES[q.get('view')] ? q.get('view') : 'game',
    speed: 1, pilot: 'script', traces: true,
    tuning: { config: {}, launch: {} },
  };
  document.title = `${page.title} · hgsim tuner`;
  document.body.className = 'app';
  document.body.innerHTML = layout(kind, page, scenarios);

  /* the 3D stage */
  const canvas = $('#stage canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setScissorTest(true);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c6d8); scene.fog = new THREE.Fog(0xb8cfdc, 400, 2200);
  scene.add(new THREE.HemisphereLight(0xdcecf8, 0x6d7a57, 1.4));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(-300, 600, 200); scene.add(sun);
  const groundGroup = new THREE.Group(); scene.add(groundGroup);
  // World-fixed grids every 10 m that follow the glider, so speed, height and path read against something even high up.
  const wallGrid = new THREE.GridHelper(400, 40, 0x6f8797, 0x8fa7b6); wallGrid.rotation.z = Math.PI / 2; wallGrid.layers.set(1); scene.add(wallGrid);   // (layer 1: the side view's)
  const floorGrid = new THREE.GridHelper(400, 40, 0x6f8797, 0x9fb6c4); floorGrid.layers.set(2); scene.add(floorGrid);   // (layer 2: the views from above and behind)
  const trail = makeLine(0xf28c28), ghost = makeLine(0x34495e, true); scene.add(trail.line, ghost.line);
  const player = new THREE.Group(); scene.add(player);
  let rig = null;
  try {
    const gltf = await new GLTFLoader().loadAsync('../../assets/hang-glider.glb');
    player.add(gltf.scene); const pilot = gltf.scene.getObjectByName('Pilot'); rig = pilot ? createPilotRig(THREE, pilot) : null;
  } catch (e) { console.warn('glider model:', e.message); player.add(new THREE.Mesh(new THREE.ConeGeometry(5, 4, 3), new THREE.MeshStandardMaterial({ color: 0xe16231 }))); }

  const views = {
    game: { camera: new THREE.PerspectiveCamera(58, 1, 0.3, 6000), zoom: kind === 'launch' ? 9 : 13, smooth: null },
    side: { camera: new THREE.OrthographicCamera(), zoom: kind === 'flight' ? 22 : 9 },
    top: { camera: new THREE.OrthographicCamera(), zoom: kind === 'flight' ? 30 : 12 },
    rear: { camera: new THREE.PerspectiveCamera(48, 1, 0.3, 4000), zoom: 16 },
    front: { camera: new THREE.PerspectiveCamera(48, 1, 0.3, 4000), zoom: 16 },
  };
  views.side.camera.layers.enable(1); views.top.camera.layers.enable(2); views.rear.camera.layers.enable(2); views.game.camera.layers.enable(2);
  let hovered = 'game';
  for (const [id, v] of Object.entries(views)) {
    v.el = $(`#stage .pane[data-view="${id}"]`);
    v.el.addEventListener('wheel', e => { e.preventDefault(); v.zoom = clamp(v.zoom * Math.exp(e.deltaY * 0.001), 3, 400); }, { passive: false });
    v.el.addEventListener('dblclick', () => setView(prefs.view === 'quad' ? id : prefs.view === id && QUAD.includes(id) ? 'quad' : prefs.view));
    v.el.addEventListener('mouseenter', () => { hovered = id; });
  }
  let lastView = 'quad';
  function setView(id) {
    if (id !== prefs.view && prefs.view !== 'game') lastView = prefs.view;
    prefs.view = id; $('#stage').dataset.mode = id;
    for (const b of document.querySelectorAll('[data-view-btn]')) b.classList.toggle('on', b.dataset.viewBtn === id);
    saveUrl();
  }
  for (const b of document.querySelectorAll('[data-view-btn]')) b.onclick = () => setView(b.dataset.viewBtn);

  /* state */
  let run = null, result = null, compare = null, pinned = null, scrub = null, mode = null, replayT = 0, last = performance.now(), poseBlend = 0, lastLaunchPose = null, pendingJump = null;
  const keys = new Set(); let spaceLatch = false;
  let notes = loadNotes();

  /* the app bar and the inspector */
  const presetSel = $('#preset'), vgInput = $('#vg'), compareSel = $('#compare');
  for (const p of Object.values(PRESETS)) { presetSel.add(new Option(`${p.name} · ${p.era}`, p.id)); compareSel.add(new Option(p.name, p.id)); }
  presetSel.value = prefs.preset; compareSel.value = prefs.compare; vgInput.value = prefs.vg;
  presetSel.onchange = () => { prefs.preset = presetSel.value; prefs.tuning = { config: {}, launch: {} }; syncWing(); restart(); };
  vgInput.oninput = () => { prefs.vg = Number(vgInput.value); $('#vgV').textContent = vgLabel(prefs.vg); if (run && mode === 'live') run.glider.setVG(prefs.vg); syncSliders(); saveUrl(); };
  vgInput.onchange = () => restart();
  compareSel.onchange = () => { prefs.compare = compareSel.value; pinned = null; computeCompare(); saveUrl(); };
  for (const b of document.querySelectorAll('[data-scenario]')) b.onclick = () => { prefs.scenario = b.dataset.scenario; restart(); };
  for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => showTab(b.dataset.tab);
  function showTab(name) {
    const open = !$('#inspector').classList.contains('closed') && $(`[data-tab="${name}"]`).classList.contains('on');
    $('#inspector').classList.toggle('closed', open);   // (the open tab, clicked again, folds the inspector away)
    for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === name && !open);
    for (const pane of document.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== name;
  }
  $('#scenarioToggle').onclick = () => $('#scenarioPanel').classList.toggle('closed');
  $('#tracesToggle').onclick = () => { prefs.traces = !prefs.traces; $('#dock').classList.toggle('noTraces', !prefs.traces); $('#tracesToggle').classList.toggle('on', prefs.traces); };
  $('#pin').onclick = () => { if (result) { pinned = { label: `pinned: ${wingLabel(result.preset, result.vg)}`, result }; compareSel.value = ''; prefs.compare = ''; compare = pinned; showResults(); syncGhost(); } };
  $('#allWings').onclick = allWings;
  $('#copy').onclick = copyValues;
  $('#resetTuning').onclick = () => { prefs.tuning = { config: {}, launch: {} }; if (run) run.glider.tune(); syncSliders(); restart(); };

  /* the transport */
  $('#restart').onclick = () => restart();
  $('#play').onclick = togglePlay;
  $('#back').onclick = () => stepFrames(-1);
  $('#fwd').onclick = () => stepFrames(1);
  $('#fly').onclick = () => { prefs.pilot = prefs.pilot === 'you' ? 'script' : 'you'; if (prefs.pilot === 'you') setView('game'); restart(); canvas.focus(); };
  $('#noteBtn').onclick = openNote;
  for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => { prefs.speed = Number(b.dataset.speed); for (const c of document.querySelectorAll('[data-speed]')) c.classList.toggle('on', c === b); };

  /* feel sliders, in groups */
  const sliderBox = $('#sliders'), groupOf = {};
  page.groups.forEach(([name, list], i) => {
    const d = document.createElement('details'); d.open = i === 0; d.innerHTML = `<summary>${name}</summary>`; sliderBox.append(d);
    for (const key of list) groupOf[key] = d;
  });
  for (const [target, key, label, min, max, step, isDeg] of page.sliders) {
    const row = document.createElement('label'); row.className = 'slider';
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
    const input = $('input', row), out = $('output', row);
    input.oninput = () => {
      const value = Number(input.value) * (isDeg ? DEG : 1);
      prefs.tuning[target][key] = value; out.textContent = format(Number(input.value)); row.classList.add('changed');
      if (target === 'config' && run) run.glider.tune({ [key]: value });   // (live, in this run; the launch's values apply from the next run)
      if (target === 'launch') $('#launchNote').hidden = false;
      markGroups();
    };
    row.dataset.key = key; row.dataset.target = target; row.dataset.deg = isDeg ? 1 : ''; (groupOf[key] ?? sliderBox).append(row);
  }
  function markGroups() { for (const d of sliderBox.querySelectorAll('details')) d.classList.toggle('changed', !!d.querySelector('.slider.changed')); }
  function syncSliders() {
    const g = createGlider({ preset: prefs.preset }); if (g.hasVG) g.setVG(prefs.vg);
    for (const row of sliderBox.querySelectorAll('.slider')) {
      const { key, target } = row.dataset, base = target === 'config' ? g.config[key] : g.launchConfig[key];
      const tuned = prefs.tuning[target][key], value = (tuned ?? base) / (row.dataset.deg ? DEG : 1);
      $('input', row).value = value; $('output', row).textContent = format(value); row.classList.toggle('changed', tuned !== undefined);
    }
    $('#launchNote').hidden = true; markGroups();
  }
  function syncWing() {
    const p = PRESETS[prefs.preset];
    $('#vgRow').hidden = !p.vg; $('#vgV').textContent = vgLabel(prefs.vg); presetSel.title = p.description;
    const polar = createGlider({ preset: p.id }).setVG(prefs.vg).polar(), k = v => (v * KMH).toFixed(0);
    $('#wingStats').textContent = `${k(polar.stallSpeed)} · ${k(polar.trimSpeed)} · ${k(polar.topSpeed)} km/h · ${polar.bestGlide.glideRatio.toFixed(1)}:1`;
    $('#wingStats').title = 'stall · trim · top speed · best glide';
    syncSliders(); saveUrl();
  }

  /* running and replaying */
  function options(preset = prefs.preset, vg = prefs.vg, pilot = prefs.pilot) {
    return { preset, vg, pilot, config: preset === prefs.preset ? prefs.tuning.config : {}, launch: preset === prefs.preset ? prefs.tuning.launch : {} };
  }
  function restart() {
    const sc = scenarios.find(s => s.id === prefs.scenario);
    for (const b of document.querySelectorAll('[data-scenario]')) b.classList.toggle('on', b.dataset.scenario === sc.id);
    $('#look').textContent = sc.look; $('#scenarioName').textContent = sc.name;
    run = startScenario(sc.id, options()); result = null; scrub = null; mode = 'live'; poseBlend = 0; lastLaunchPose = null; spaceLatch = false; views.game.smooth = null;
    buildGround(run.site, sc.kind); trail.reset();
    if (pinned && pinned.result.scenario !== sc.id) pinned = null;
    $('#fly').classList.toggle('on', prefs.pilot === 'you'); $('#flyHint').hidden = prefs.pilot !== 'you';
    computeCompare(); showResults(); showNotes(); saveUrl();
  }
  function computeCompare() {
    if (pinned) compare = pinned;
    else if (prefs.compare) { const r = runScenario(prefs.scenario, { preset: prefs.compare, vg: prefs.vg }); compare = { label: wingLabel(prefs.compare, r.vg), result: r }; }
    else compare = null;
    syncGhost(); showResults();
  }
  function syncGhost() { ghost.set(compare ? compare.result.samples : []); }
  const index = () => scrub ?? run.samples.length - 1;
  function togglePlay() {
    if (mode) { mode = null; return; }   // (pause, live or replay)
    const end = run.samples.length - 1;
    if (!run.done && index() >= end) { scrub = null; mode = 'live'; return; }   // (carry on flying)
    replayT = run.samples[index() >= end ? 0 : index()].t; mode = 'replay';   // (play the recording back from here, or from the start)
  }
  function stepFrames(n) {
    mode = null;
    const i = index() + n, end = run.samples.length - 1;
    if (i > end && !run.done) { run.step(FRAME, prefs.pilot === 'you' ? yourControls() : {}); scrub = null; finishIfDone(); return; }   // (one frame further than recorded: fly it)
    scrub = clamp(i, 0, end); if (scrub === end) scrub = run.done ? end : null;
  }
  function finishIfDone() {
    if (run.done && !result) {
      result = run.result; mode = null; showResults(); showNotes();
      if (pendingJump !== null) { scrub = nearestIndex(pendingJump); pendingJump = null; }
    }
  }
  function nearestIndex(t) { const s = run.samples; let lo = 0, hi = s.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m].t < t) lo = m + 1; else hi = m; } return lo; }

  function yourControls() {
    const held = (...codes) => codes.some(c => keys.has(c)) ? 1 : 0;
    const lr = held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), ud = held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp');
    if (run.phase === 'launch') {
      const s = run.launch.state, space = keys.has('Space'), press = space && !spaceLatch; spaceLatch = space;
      return { balance: lr, nose: ud, push: held('ShiftLeft', 'ShiftRight'), go: s.go || (press && s.phase !== 'run'), jump: press && s.phase === 'run' };
    }
    return { roll: lr, pitch: ud, field: run.samples.at(-1)?.feet < 12 };
  }

  let trailAt = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (run) {
      if (mode === 'live' && !run.done) { run.step(dt * prefs.speed, prefs.pilot === 'you' ? yourControls() : {}); finishIfDone(); }
      else if (mode === 'replay') {
        replayT += dt * prefs.speed; scrub = nearestIndex(replayT);
        if (scrub >= run.samples.length - 1) { scrub = run.done ? run.samples.length - 1 : null; mode = run.done ? null : 'live'; }
      } else if (mode === 'live' && run.done) mode = null;
      if (now - trailAt > 100) { trailAt = now; trail.set(run.samples, scrub ?? run.samples.length - 1); }
      draw(dt); drawTimeline(); syncTransport();
    }
    requestAnimationFrame(frame);
  }

  /* drawing the glider */
  function draw(dt) {
    const samples = run.samples, live = scrub === null || (scrub >= samples.length - 1 && !run.done);
    const sm = live ? null : samples[scrub];
    let x, y, z, heading;
    if (sm?.q || (live && run.wreck)) {   // (it went wrong: the glider and pilot as one body until the wreck is still)
      const w = sm ?? run.wreck; x = w.x; y = w.y; z = w.z; heading = samples.at(-1)?.heading ?? 0;
      player.position.set(x, y, z); player.quaternion.set(...w.q); rig?.update(dt, { crashed: 1 }, !live);
    } else if ((live && run.phase === 'launch') || sm?.pose) {   // (on the run: the wing on the shoulders)
      const s = live ? run.glider.state : sm, pose = live ? run.launch.pose(rig?.step ?? 0) : sm.pose;
      x = s.x; z = s.z; heading = s.heading;
      const ground = (run.site.site?.ground ?? run.world.heightAt)(x, z);
      player.position.set(x, ground + pose.height, z); player.rotation.set(pose.pitch, heading + pose.yaw, pose.roll, 'YXZ');
      const o = shoulderPivot(pose.pitch, heading + pose.yaw, pose.roll, pose.shoulders); player.position.x += o[0]; player.position.y += o[1]; player.position.z += o[2];
      const rx = player.rotation.x;
      rig?.update(dt, { upright: 1, level: -rx, shoulders: pose.shoulders, shift: pose.shift, standRoll: -pose.roll, standYaw: -pose.yaw, run: pose.run, lift: pose.lift, carry: pose.carry, grip: pose.grip,
        lean: pose.lean - rx, speed: s.groundSpeed, ground: (ground - player.position.y) / Math.cos(rx), tilt: Math.tan(rx) - run.site.site.fall(x, z, heading), plant: pose.plant }, !live || !lastLaunchPose);
      if (live) lastLaunchPose = { position: player.position.clone(), quaternion: player.quaternion.clone() };
      y = player.position.y;
    } else {   // (in the air)
      const s = live ? run.glider.state : sm; x = s.x; z = s.z; heading = s.heading;
      const pose = getAirframePose({ position: { x, y: s.y, z }, heading, pitch: s.pitch, bank: s.bank, visualBank: s.visualBank ?? s.bank, ground: run.world.heightAt(x, z), lowest: rig?.lowest ?? -0.65, hasRig: !!rig, mode: 'gliding' });
      player.position.set(pose.x, pose.y, pose.z); player.rotation.set(pose.pitch, pose.heading, pose.roll, 'YXZ');
      if (live && lastLaunchPose && poseBlend < 1) {   // (just off a launch: ease from the run's attitude to the flight's)
        poseBlend = Math.min(1, poseBlend + dt / 0.6); const k = smooth(0, 1, poseBlend);
        player.position.lerpVectors(lastLaunchPose.position, player.position, k); player.quaternion.slerpQuaternions(lastLaunchPose.quaternion, player.quaternion, k);
      }
      const c = (sm ?? samples.at(-1))?.controls ?? {};
      rig?.update(dt, { bar: -(s.bar || 0), shift: c.roll ?? 0, upright: s.upright ?? 0, handGap: (s.flare ?? 0) > 0.05 ? 0.2 : undefined }, !live);
      y = player.position.y;
    }
    const cx = player.position.x, cy = player.position.y, cz = player.position.z;
    wallGrid.position.set(cx - 25, Math.round(cy / 10) * 10, Math.round(cz / 10) * 10);
    floorGrid.position.set(Math.round(cx / 10) * 10, cy - 12, Math.round(cz / 10) * 10); floorGrid.visible = kind === 'flight';
    renderViews(cx, cy, cz, heading, dt);
    readouts(sm ?? samples.at(-1));
  }

  function renderViews(x, y, z, heading, dt) {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(rect.width, rect.height, false); }
    const fx = Math.sin(heading), fz = Math.cos(heading), shown = prefs.view === 'quad' ? QUAD : [prefs.view];
    for (const id of shown) {
      const v = views[id], r = v.el.getBoundingClientRect(), w = r.width, h = r.height, left = r.left - rect.left, bottom = rect.bottom - r.bottom;
      if (w < 2 || h < 2) continue;
      renderer.setViewport(left, bottom, w, h); renderer.setScissor(left, bottom, w, h);
      const cam = v.camera, aspect = w / h;
      if (cam.isOrthographicCamera) { const half = v.zoom; Object.assign(cam, { left: -half * aspect, right: half * aspect, top: half, bottom: -half, near: -2000, far: 4000 }); cam.updateProjectionMatrix(); }
      else { cam.aspect = aspect; cam.updateProjectionMatrix(); }
      if (id === 'game') {   // (a chase camera behind and above, easing after the glider as the range's does)
        const want = new THREE.Vector3(x - fx * v.zoom, y + v.zoom * 0.3, z - fz * v.zoom);
        if (!v.smooth) v.smooth = want.clone(); else v.smooth.lerp(want, 1 - Math.exp(-Math.max(dt, FRAME) * 3));
        cam.up.set(0, 1, 0); cam.position.copy(v.smooth); cam.lookAt(x + fx * 4, y + 0.6, z + fz * 4);
      }
      else if (id === 'side') { cam.up.set(0, 1, 0); cam.position.set(x + 100, y, z); cam.lookAt(x, y, z); }
      else if (id === 'top') { cam.up.set(0, 0, 1); cam.position.set(x, y + 200, z); cam.lookAt(x, y, z); }
      else if (id === 'rear') { cam.up.set(0, 1, 0); cam.position.set(x - fx * v.zoom, y + v.zoom * 0.18, z - fz * v.zoom); cam.lookAt(x, y, z); }
      else { cam.up.set(0, 1, 0); cam.position.set(x + fx * v.zoom, y + v.zoom * 0.12, z + fz * v.zoom); cam.lookAt(x, y, z); }
      renderer.render(scene, cam);
    }
  }

  function readouts(s = {}) {
    $('#hudSpeed').textContent = ((s.airspeed ?? 0) * KMH).toFixed(0);
    $('#hudHeight').textContent = (s.feet ?? 0).toFixed(1);
    $('#hudVario').textContent = (s.verticalSpeed ?? 0).toFixed(1);
    $('#hudLine').textContent = describe(s);
    const t = s.t ?? 0, near = notes.filter(n => sameRun(n) && Math.abs(n.t - t) < 0.5);
    $('#noteFlag').hidden = !near.length; $('#noteFlag').textContent = near.map(n => n.text).join(' · ');
  }

  /** One line on the moment: what the wing is doing (for the HUD and for a note). */
  function describe(s) {
    const d = v => `${deg(v ?? 0).toFixed(0)}°`;
    return s.phase === 'tumble' ? 'crashed: the wreck comes to rest'
      : s.phase === 'launch' ? `${s.launchPhase ?? ''} · roll ${d(s.bank)} · wing carries ${Math.round((s.lift ?? 0) * 100)}%`
      : `path ${d(s.pathAngle)} · bank ${d(s.bank)} · α ${d(s.alpha)}${s.stalled ? ' · STALLED' : ''}`;
  }

  function buildGround(place, scKind) {
    groundGroup.clear();
    const span = scKind === 'landing' ? { x0: -160, x1: 160, z0: -460, z1: 200, step: 4 } : scKind === 'launch' ? { x0: -80, x1: 80, z0: -60, z1: 300, step: 1 } : { x0: -400, x1: 400, z0: -400, z1: 1200, step: 10 };
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

  /* the timeline: the playhead, the traces lined up with it, and the notes */
  const timeline = $('#timeline');
  function tMax() { return Math.max(run?.scenario.seconds ?? 1, run?.samples.at(-1)?.t ?? 0, compare?.result.samples.at(-1)?.t ?? 0); }
  function seekTo(clientX) {
    const r = timeline.getBoundingClientRect(), t = clamp((clientX - r.left - 8) / (r.width - 16), 0, 1) * tMax();
    mode = null; scrub = nearestIndex(Math.min(t, run.samples.at(-1).t));
    const flag = notes.find(n => sameRun(n) && Math.abs(n.t - t) < tMax() * 0.006); if (flag) scrub = nearestIndex(flag.t);
  }
  let dragging = false;
  timeline.addEventListener('pointerdown', e => { dragging = true; timeline.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  timeline.addEventListener('pointermove', e => { if (dragging) seekTo(e.clientX); const hit = noteAt(e.clientX); timeline.title = hit ? `${hit.t.toFixed(2)} s: ${hit.text}` : ''; });
  timeline.addEventListener('pointerup', () => { dragging = false; });
  function noteAt(clientX) { const r = timeline.getBoundingClientRect(), t = (clientX - r.left - 8) / (r.width - 16) * tMax(); return notes.find(n => sameRun(n) && Math.abs(n.t - t) < tMax() * 0.006); }
  function drawTimeline() {
    const r = timeline.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    if (timeline.width !== Math.round(r.width * dpr) || timeline.height !== Math.round(r.height * dpr)) { timeline.width = r.width * dpr; timeline.height = r.height * dpr; }
    const g = timeline.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const css = getComputedStyle(document.body), dim = css.getPropertyValue('--dim'), accent = css.getPropertyValue('--accent'), cmp = css.getPropertyValue('--compare'), line = css.getPropertyValue('--line');
    const T = tMax(), X = t => 8 + (r.width - 16) * t / T, track = 22;
    // The ruler: seconds, and the part of the run recorded so far.
    g.font = '10px system-ui'; g.textBaseline = 'middle'; g.fillStyle = dim; g.strokeStyle = line;
    const every = T > 30 ? 5 : T > 12 ? 2 : 1;
    for (let s = 0; s <= T; s += every) { g.beginPath(); g.moveTo(X(s), 4); g.lineTo(X(s), track - 6); g.stroke(); g.fillText(`${s}`, X(s) + 3, 9); }
    g.fillStyle = 'rgba(242,140,40,.28)'; g.fillRect(X(0), track - 5, X(run.samples.at(-1).t) - X(0), 3);
    // The traces, one lane each.
    if (prefs.traces) {
      const lanes = page.channels, laneH = (r.height - track - 4) / lanes.length, series = [compare?.result.samples ?? [], run.samples];
      lanes.forEach((ch, i) => {
        const top = track + 2 + i * laneH, vals = series.flatMap(s => s.map(ch.get)).filter(v => v !== null && Number.isFinite(v));
        let lo = Math.min(...vals, 0), hi = Math.max(...vals, 0.001); if (hi - lo < 1e-6) hi = lo + 1;
        const Y = v => top + laneH - 3 - (laneH - 6) * (v - lo) / (hi - lo);
        g.strokeStyle = line; g.beginPath(); g.moveTo(X(0), top + laneH); g.lineTo(X(T), top + laneH); g.stroke();
        [[series[0], cmp], [series[1], accent]].forEach(([s, color]) => {
          g.strokeStyle = color; g.lineWidth = 1.4; g.beginPath(); let pen = false;
          for (let k = 0; k < s.length; k += 2) { const p = s[k], v = ch.get(p); if (v === null || !Number.isFinite(v)) { pen = false; continue; } if (pen) g.lineTo(X(p.t), Y(v)); else { g.moveTo(X(p.t), Y(v)); pen = true; } }
          g.stroke();
        });
        g.lineWidth = 1; g.fillStyle = dim; g.fillText(`${ch.label} ${lo.toFixed(0)}…${hi.toFixed(0)}${ch.unit ? ` ${ch.unit}` : ''}`, 12, top + 8);
      });
    }
    // The notes, as pins, and the playhead.
    for (const n of notes) if (sameRun(n)) { g.fillStyle = '#ffd36b'; g.beginPath(); g.moveTo(X(n.t) - 5, 2); g.lineTo(X(n.t) + 5, 2); g.lineTo(X(n.t), 10); g.fill(); g.fillRect(X(n.t) - 0.5, 10, 1, r.height - 10); }
    const t = run.samples[index()].t;
    g.fillStyle = '#fff'; g.fillRect(X(t) - 1, 0, 2, r.height);
  }

  function syncTransport() {
    $('#play').innerHTML = icon(mode ? 'pause' : 'play'); $('#play').title = mode ? 'Pause (P)' : run.done ? 'Replay (P)' : 'Play (P)';
    $('#clock').textContent = `${run.samples[index()].t.toFixed(2)} / ${tMax().toFixed(0)} s`;
    $('#pin').disabled = !result;
  }

  /* results and comparisons */
  function showResults() {
    const box = $('#results');
    if (!result) { box.innerHTML = '<p class="dim">Flying…</p>'; return; }
    const m = result.metrics, c = compare?.result.metrics ?? {}, keysOf = Object.keys({ ...c, ...m }).filter(k => !Array.isArray(m[k] ?? c[k]));
    const cell = v => v === null || v === undefined ? '–' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : v;
    box.innerHTML = `<div class="outcome ${outcomeClass(result.outcome)}">${result.outcome}</div>
      ${m.notes?.length ? `<p class="dim">${m.notes.join(' · ')}</p>` : ''}
      <table><tr><th></th><th>${wingLabel(result.preset, result.vg)}</th>${compare ? `<th>${compare.label}</th>` : ''}</tr>
      ${compare ? `<tr><td>outcome</td><td>${result.outcome}</td><td>${compare.result.outcome}</td></tr>` : ''}
      ${keysOf.map(k => `<tr><td>${humanize(k)}</td><td>${cell(m[k])}</td>${compare ? `<td>${cell(c[k])}</td>` : ''}</tr>`).join('')}</table>`;
  }
  function allWings() {
    const box = $('#all'), ids = [...LADDER, ...Object.keys(PRESETS).filter(id => !LADDER.includes(id))];
    const rows = ids.flatMap(id => (PRESETS[id].vg ? [0, 1] : [0]).map(vg => ({ id, vg, r: runScenario(prefs.scenario, { preset: id, vg }) })));
    const keysShown = Object.keys(rows[0].r.metrics).filter(k => !Array.isArray(rows[0].r.metrics[k])).slice(0, 3);
    box.innerHTML = `<table><tr><th>wing</th><th>outcome</th>${keysShown.map(k => `<th>${humanize(k)}</th>`).join('')}</tr>${rows.map(({ id, vg, r }) =>
      `<tr><td>${wingLabel(id, vg)}</td><td class="${outcomeClass(r.outcome)}">${r.outcome}</td>${keysShown.map(k => `<td>${r.metrics[k] ?? '–'}</td>`).join('')}</tr>`).join('')}</table>`;
  }
  function copyValues() {
    const fmt = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toPrecision(4)]));
    const text = JSON.stringify({ preset: prefs.preset, vg: prefs.vg, config: fmt(prefs.tuning.config), launch: fmt(prefs.tuning.launch) }, null, 2);
    navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast('Copy failed: see the box'));
    $('#copied').value = text; $('#copied').hidden = false;
  }

  /* notes: pinned to a moment of a run, kept in the browser and saved for review */
  function loadNotes() { try { return JSON.parse(localStorage.getItem('hgsim-tuner-notes') || '[]'); } catch { return []; } }
  function storeNotes() { try { localStorage.setItem('hgsim-tuner-notes', JSON.stringify(notes)); } catch {} }
  const sameRun = n => n.kind === kind && n.scenario === prefs.scenario && n.preset === prefs.preset;
  function openNote() {
    mode = null;
    const box = $('#noteBox'), input = $('#noteText'), t = run.samples[index()].t;
    $('#noteAt').textContent = `${t.toFixed(2)} s · ${VIEW_NAMES[prefs.view === 'quad' ? hovered : prefs.view]}`;
    box.hidden = false; input.value = ''; input.focus();
    input.onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Escape') { box.hidden = true; canvas.focus(); }
      if (e.key === 'Enter' && input.value.trim()) { addNote(t, input.value.trim()); box.hidden = true; canvas.focus(); }
    };
  }
  function addNote(t, text) {
    const s = run.samples[nearestIndex(t)], view = prefs.view === 'quad' ? hovered : prefs.view;
    const note = { id: `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), kind, scenario: prefs.scenario, preset: prefs.preset, vg: prefs.vg,
      pilot: prefs.pilot, t: +t.toFixed(3), view, text, readout: `${((s.airspeed ?? 0) * KMH).toFixed(0)} km/h, ${(s.feet ?? 0).toFixed(1)} m, ${describe(s)}`, tuning: prefs.tuning, outcome: result?.outcome ?? null };
    notes.push(note); storeNotes(); showNotes(); toast('Note saved');
    // For review: the note with the run around it. A run you flew yourself is kept whole (every third frame), as it cannot be flown again.
    const keep = ['t', 'phase', 'x', 'y', 'z', 'heading', 'bank', 'pitch', 'alpha', 'airspeed', 'pathAngle', 'verticalSpeed', 'feet', 'bar', 'lift', 'controls'];
    const flight = prefs.pilot === 'you' ? run.samples.filter((_, i) => i % 3 === 0).map(p => Object.fromEntries(keep.map(k => [k, typeof p[k] === 'number' ? +p[k].toFixed(3) : p[k]]))) : null;
    fetch('/__notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...note, sample: s, metrics: result?.metrics ?? null, flight }) }).catch(() => {});
  }
  function showNotes() {
    const list = $('#noteList'), mine = notes.filter(n => n.kind === kind).slice().reverse();
    $('[data-tab="notes"]').textContent = `Notes${mine.length ? ` (${mine.length})` : ''}`;
    if (!mine.length) { list.innerHTML = '<p class="dim">Press N (or the note button) to pin a note to the moment you are looking at. Notes are saved for review.</p>'; return; }
    list.innerHTML = mine.map(n => `<div class="note${sameRun(n) ? ' here' : ''}" data-note="${n.id}"><div><b>${n.t.toFixed(2)} s</b> <span class="dim">${scenarios.find(s => s.id === n.scenario)?.name ?? n.scenario} · ${PRESETS[n.preset]?.name ?? n.preset} · ${VIEW_NAMES[n.view] ?? n.view}${n.pilot === 'you' ? ' · you flew' : ''}</span></div><p>${escapeHtml(n.text)}</p><button class="x" title="Delete">×</button></div>`).join('');
    for (const el of list.querySelectorAll('.note')) {
      const n = notes.find(x => x.id === el.dataset.note);
      el.onclick = e => {
        if (e.target.classList.contains('x')) { notes = notes.filter(x => x !== n); storeNotes(); showNotes(); return; }
        if (sameRun(n)) { mode = null; scrub = nearestIndex(n.t); return; }
        prefs.scenario = n.scenario; prefs.preset = n.preset; prefs.vg = n.vg; presetSel.value = n.preset; vgInput.value = n.vg; syncWing(); restart(); pendingJump = n.t; mode = 'live'; prefs.speed = 8;
        const restore = setInterval(() => { if (run.done) { prefs.speed = Number(document.querySelector('[data-speed].on')?.dataset.speed ?? 1); clearInterval(restore); } }, 100);
      };
    }
  }
  $('#copyNotes').onclick = () => {
    const text = notes.filter(n => n.kind === kind).map(n => `${n.scenario} · ${n.preset}${PRESETS[n.preset]?.vg ? ` VG ${n.vg}` : ''} · ${n.t.toFixed(2)} s · ${n.view}: ${n.text} [${n.readout}]`).join('\n');
    navigator.clipboard?.writeText(text).then(() => toast('Notes copied'), () => toast('Copy failed'));
  };

  function saveUrl() {
    const p = new URLSearchParams({ glider: prefs.preset, scenario: prefs.scenario, view: prefs.view }); if (PRESETS[prefs.preset].vg) p.set('vg', prefs.vg); if (prefs.compare) p.set('compare', prefs.compare);
    history.replaceState(null, '', `?${p}`);
  }

  /* keys */
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea')) return;
    const flying = prefs.pilot === 'you' && mode === 'live';
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyR') restart();
    else if (e.code === 'KeyP' || (e.code === 'Space' && !flying && prefs.pilot !== 'you')) togglePlay();
    else if (e.code === 'Comma' || (e.code === 'ArrowLeft' && !flying)) stepFrames(e.shiftKey ? -10 : -1);
    else if (e.code === 'Period' || (e.code === 'ArrowRight' && !flying)) stepFrames(e.shiftKey ? 10 : 1);
    else if (e.code === 'KeyN') { e.preventDefault(); openNote(); }
    else if (e.code === 'KeyF') $('#fly').click();
    else if (e.code === 'KeyG') setView('game');
    else if (e.code === 'KeyQ') setView('quad');
    else if (e.code === 'Escape' && prefs.view !== 'quad' && prefs.view !== 'game') setView(lastView);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // New code on the server is picked up between runs, as on the range.
  let version = null; setInterval(() => fetch('/__version').then(r => r.ok ? r.text() : null).then(v => { if (!v) return; version ??= v; if (v !== version && !mode) location.reload(); }, () => {}), 2000);

  function toast(text) { const t = $('#toast'); t.textContent = text; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1400); }

  setView(prefs.view); syncWing(); restart(); requestAnimationFrame(frame);
}

/* ---------- helpers ---------- */

function makeLine(color, dashed = false) {
  const max = 12000, geo = new THREE.BufferGeometry(), buf = new Float32Array(max * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(buf, 3)); geo.setDrawRange(0, 0);
  const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 1.5, gapSize: 1 }) : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat); line.frustumCulled = false;
  return {
    line,
    reset() { geo.setDrawRange(0, 0); },
    /** The path through the samples, up to sample upTo (the playhead). */
    set(samples, upTo = samples.length - 1) {
      let n = 0;
      for (let i = 0; i <= upTo && n < max; i += 2) { const s = samples[i]; buf.set([s.x, s.y - (s.feet < 8 ? 1.65 * clamp(1 - s.feet / 8, 0, 1) : 0), s.z], n * 3); n++; }
      geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; if (dashed) line.computeLineDistances();
    },
  };
}
const vgLabel = v => v < 0.02 ? 'off' : v > 0.98 ? 'on' : `${Math.round(v * 100)}%`;
const wingLabel = (id, vg) => `${PRESETS[id]?.name ?? id}${PRESETS[id]?.vg ? (vg > 0.5 ? ' VG on' : ' VG off') : ''}`;
const format = v => Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
const humanize = k => k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/ (kmh|deg|metres|seconds|ms)$/, (m, u) => ({ kmh: ' (km/h)', deg: ' (°)', metres: ' (m)', seconds: ' (s)', ms: ' (m/s)' })[u]);
const outcomeClass = o => ['soft', 'flying', 'done'].includes(o) ? 'good' : ['firm', 'no launch', 'sank back'].includes(o) ? 'warn' : o ? 'bad' : '';
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function layout(kind, page, scenarios) {
  const mode = k => k === kind ? `<span class="on">${PAGES[k].title}</span>` : `<a href="../${k}/${location.search.replace(/scenario=[^&]*&?/, '')}">${PAGES[k].title}</a>`;
  const btn = (id, name, title, cls = '') => `<button id="${id}" class="icon ${cls}" title="${title}">${icon(name)}</button>`;
  return `
  <section id="stage" data-mode="game">
    <canvas tabindex="0"></canvas>
    <div class="pane" data-view="game"></div>
    ${QUAD.map(v => `<div class="pane" data-view="${v}"><b>${VIEW_NAMES[v]}</b></div>`).join('')}
    <div id="hud"><div><b id="hudSpeed">0</b><small>km/h</small></div><div><b id="hudHeight">0</b><small>m</small></div><div><b id="hudVario">0</b><small>m/s</small></div><p id="hudLine"></p></div>
    <div id="noteFlag" hidden></div>
    <div id="flyHint" hidden>You are flying · ${page.keys} · R restart</div>
  </section>

  <div id="appbar" class="float">
    <span class="logo">hgsim <i>tuner</i></span>
    <nav class="seg">${['launch', 'flight', 'landing'].map(mode).join('')}</nav>
    <select id="preset"></select>
    <label id="vgRow" title="VG: the sail pulled tight for speed and glide">VG <input id="vg" type="range" min="0" max="1" step="0.05"><output id="vgV"></output></label>
    <span id="wingStats" class="dim"></span>
  </div>
  <nav id="viewbar" class="float seg">${['game', 'quad', ...QUAD].map(v => `<button data-view-btn="${v}">${VIEW_NAMES[v]}</button>`).join('')}</nav>
  <a id="toRange" class="float" href="../../" title="Back to the range">Range</a>

  <div id="scenarioPanel" class="float">
    <button id="scenarioToggle" class="icon" title="Scenarios">${icon('list')}</button>
    <div class="body"><h3>${page.title} scenarios</h3>${scenarios.map(s => `<button data-scenario="${s.id}" title="${s.look}">${s.name}</button>`).join('')}</div>
  </div>

  <aside id="inspector" class="float">
    <nav class="tabs"><button data-tab="result" class="on">Result</button><button data-tab="feel">Feel</button><button data-tab="compare">Compare</button><button data-tab="notes">Notes</button></nav>
    <div data-pane="result"><div id="results"></div></div>
    <div data-pane="feel" hidden>
      <p id="launchNote" class="dim" hidden>Launch values apply from the next run (R).</p>
      <div id="sliders"></div>
      <div class="row"><button id="copy">Copy values</button><button id="resetTuning">Reset</button></div>
      <textarea id="copied" hidden readonly></textarea>
    </div>
    <div data-pane="compare" hidden>
      <label>With <select id="compare"><option value="">nothing</option></select></label>
      <div class="row"><button id="pin">Pin this run</button><button id="allWings">Every wing</button></div>
      <div id="all"></div>
    </div>
    <div data-pane="notes" hidden><div id="noteList"></div><div class="row"><button id="copyNotes">Copy notes</button></div></div>
  </aside>

  <div id="dock" class="float">
    <div class="bar">
      <span id="scenarioName"></span>
      <span class="transport">
        ${btn('restart', 'restart', 'Restart (R)')}${btn('back', 'back', 'Back one frame (, or ←; Shift: 10)')}${btn('play', 'play', 'Play (P)', 'big')}${btn('fwd', 'fwd', 'Forward one frame (. or →; Shift: 10)')}
        ${btn('fly', 'fly', 'Fly it yourself (F)', 'rec')}${btn('noteBtn', 'note', 'Note this moment (N)')}
      </span>
      <span class="seg speeds">${[0.25, 0.5, 1, 2].map(v => `<button data-speed="${v}"${v === 1 ? ' class="on"' : ''}>${v === 0.25 ? '¼' : v === 0.5 ? '½' : v}×</button>`).join('')}</span>
      <span id="clock"></span>
      ${btn('tracesToggle', 'traces', 'Traces', 'on')}
    </div>
    <p id="look"></p>
    <canvas id="timeline"></canvas>
    <div id="noteBox" hidden><span id="noteAt"></span><input id="noteText" placeholder="What do you see here? Enter to save, Esc to cancel"></div>
  </div>
  <div id="toast"></div>`;
}
