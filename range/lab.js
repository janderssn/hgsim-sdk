/**
 * The lab: the range's own tools for tuning how a wing feels, in the game itself. Every tick of a round is recorded as the renderer
 * sees it (the range's captureFrame), so a round can be replayed through the same renderer, at a quarter to twice the speed, or
 * stepped a frame at a time, back and forth. Scenarios (src/scenarios.js) fly here, in the range's world and wind, with a scripted
 * pilot or with you; another wing can fly the same scenario alongside, headless on the same ground, as a ghost and as traces. The
 * views around the glider (side, top, behind, in front, all four) are drawn by the same renderer. Notes pin a remark to a moment and a
 * view, and are saved for review (work/notes).
 *
 * createLab(host): host is what the range lends it (see main.js). L shows or hides the lab; ?lab=launch|flight|landing opens it.
 */
import { SCENARIOS, PRESETS, flyScenario, scenarioWind, createWorld, createGlider, createRound, createWind } from '../src/index.js';

const DEG = Math.PI / 180, KMH = 3.6, TICK = 1 / 60, MAX_FRAMES = 60 * 60 * 5;
const KINDS = { launch: 'Launch', flight: 'Flight', landing: 'Landing' };
const VIEW_NAMES = { game: 'Game', quad: 'All four', side: 'Side', top: 'Top', rear: 'Behind', front: 'In front' };
const QUAD = ['side', 'top', 'rear', 'front'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deg = v => v / DEG;
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** What each kind of scenario shows on the timeline, read from a recorded frame. */
const LANES = {
  launch: [
    ['Roll on the shoulders', '°', f => f.runUp ? deg(f.runUp.launch.roll) : null],
    ['Weight carried', '%', f => f.runUp ? 100 * f.runUp.launch.lift : null],
    ['Airspeed', 'km/h', f => (f.runUp ? f.runUp.launch.airspeed : f.soaring.airspeed) * KMH],
    ['Height of the feet', 'm', f => f.feet],
  ],
  flight: [
    ['Airspeed', 'km/h', f => f.soaring.airspeed * KMH],
    ['Angle of attack', '°', f => deg(f.soaring.alpha)],
    ['Flight path', '°', f => deg(f.soaring.pathAngle)],
    ['Bank', '°', f => deg(f.soaring.bank)],
  ],
  landing: [
    ['Height of the feet', 'm', f => f.feet],
    ['Airspeed', 'km/h', f => f.soaring.airspeed * KMH],
    ['Sink', 'm/s', f => -f.soaring.verticalSpeed],
    ['Bar (+ out)', '', f => f.soaring.bar],
  ],
};
/** The same lanes for a headless run's samples (the compared wing). */
const SAMPLE_LANES = {
  launch: [s => s.phase === 'launch' ? deg(s.bank) : null, s => s.phase === 'launch' ? 100 * s.lift : null, s => s.airspeed * KMH, s => s.feet],
  flight: [s => s.airspeed * KMH, s => deg(s.alpha), s => deg(s.pathAngle), s => deg(s.bank)],
  landing: [s => s.feet, s => s.airspeed * KMH, s => -s.verticalSpeed, s => s.bar],
};

export function createLab(host) {
  const { THREE } = host, q = new URLSearchParams(location.search);
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./lab.css', import.meta.url).href; document.head.append(css);

  let enabled = false, kind = KINDS[q.get('lab')] ? q.get('lab') : 'launch', view = 'game', speed = 1;
  let frames = [], index = null, playing = false, replayT = 0, holding = false;
  let flight = null, pilotMode = 'script', scenario = null, result = null, compare = null, compareWing = '', notes = loadNotes();

  /* ---------- the DOM ---------- */
  const root = document.createElement('div'); root.id = 'lab'; root.hidden = true;
  // One slim bar along the bottom; the scenario list, and the traces with the result, the comparison and the notes, open above it on
  // demand. H folds it all down to one small button.
  const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICONS = { restart: 'M12 5a7 7 0 1 1-6.9 8.2h2.1A5 5 0 1 0 12 7v3L7.5 6 12 2v3z', back: 'M7 6h2v12H7zM19 6v12l-9-6z', play: 'M8 5v14l11-7z', pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
    fwd: 'M15 6h2v12h-2zM5 6v12l9-6z', fly: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', note: 'M4 17.3V20h2.7l8.1-8.1-2.7-2.7zM18.7 7.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.3 1.3 2.7 2.7z', more: 'M4 19h3v-7H4zm6.5 0h3V6h-3zM17 19h3v-10h-3z', hide: 'M6 11h12v2H6z' };
  root.innerHTML = `
    <div id="labPanes">${QUAD.map(v => `<b data-pane="${v}">${VIEW_NAMES[v]}</b>`).join('')}</div>
    <div id="labFlag" hidden></div>
    <div id="labPop" class="lab-float" hidden>
      <nav class="lab-seg">${Object.entries(KINDS).map(([k, n]) => `<button data-kind="${k}">${n}</button>`).join('')}</nav>
      <div id="labList"></div>
    </div>
    <section id="labDetails" class="lab-float" hidden>
      <div class="lab-traces"><p id="labLook" class="lab-dim"></p><canvas id="labTimeline"></canvas></div>
      <div class="lab-side">
        <nav class="lab-seg"><button data-tab="result">Result</button><button data-tab="compare">Compare</button><button data-tab="notes">Notes</button></nav>
        <div data-tab-pane="result" id="labResult"><p class="lab-dim">Pick a scenario, or fly: the round is recorded either way.</p></div>
        <div data-tab-pane="compare" hidden><label>Fly it alongside on <select id="labCompare"><option value="">nothing</option></select></label><div id="labCompareResult"></div></div>
        <div data-tab-pane="notes" hidden><div id="labNotes"></div><button id="labCopyNotes">Copy notes</button></div>
      </div>
    </section>
    <div id="labBar" class="lab-float">
      <button id="labPick" class="lab-pick" title="Scenarios"><span id="labPickName">Scenarios</span> <i>▴</i></button>
      <span class="lab-transport">
        <button id="labRestart" class="lab-icon" title="Run it again (R)">${icon(ICONS.restart)}</button>
        <button id="labBack" class="lab-icon" title="Back a frame (, or ←; Shift: ten)">${icon(ICONS.back)}</button>
        <button id="labPlay" class="lab-icon lab-play" title="Pause, play or replay (P)">${icon(ICONS.pause)}</button>
        <button id="labFwd" class="lab-icon" title="Forward a frame (. or →; Shift: ten)">${icon(ICONS.fwd)}</button>
        <button id="labFly" class="lab-icon lab-fly" title="Fly it yourself (F in the lab)">${icon(ICONS.fly)}</button>
        <button id="labNote" class="lab-icon" title="Note this moment (N)">${icon(ICONS.note)}</button>
      </span>
      <span class="lab-seg lab-speeds">${[0.25, 0.5, 1, 2].map(v => `<button data-speed="${v}">${v === .25 ? '¼' : v === .5 ? '½' : v}×</button>`).join('')}</span>
      <canvas id="labTrack" title="Drag to scrub"></canvas>
      <span id="labClock"></span>
      <select id="labView" title="View (G game, Q all four)">${['game', 'quad', ...QUAD].map(v => `<option value="${v}">${VIEW_NAMES[v]}</option>`).join('')}</select>
      <button id="labChip" class="lab-chip" hidden title="The result: details (T)"></button>
      <button id="labMore" class="lab-icon" title="Traces and details (T)">${icon(ICONS.more)}</button>
      <button id="labHide" class="lab-icon" title="Hide the lab (H)">${icon(ICONS.hide)}</button>
      <div id="labNoteBox" hidden><span id="labNoteAt"></span><input id="labNoteText" placeholder="What do you see here? Enter to save, Esc to cancel"></div>
    </div>
    <button id="labShow" class="lab-float" hidden title="Show the lab (H)">Lab</button>`;
  document.body.append(root);
  const $ = sel => root.querySelector(sel), timeline = $('#labTimeline'), track = $('#labTrack');
  let folded = false;   // (H: everything but one small button out of the way)
  const details = on => { $('#labDetails').hidden = !on; $('#labMore').classList.toggle('on', on); if (on) { $('#labPop').hidden = true; drawTimeline(); } };
  const fold = on => { folded = on; $('#labBar').hidden = on; $('#labShow').hidden = !on; if (on) { $('#labDetails').hidden = true; $('#labPop').hidden = true; $('#labNoteBox').hidden = true; } };
  for (const p of Object.values(PRESETS)) $('#labCompare').add(new Option(p.name, p.id));

  /* ---------- the other views, drawn by the game's renderer ---------- */
  const cameras = { side: new THREE.OrthographicCamera(), top: new THREE.OrthographicCamera(), rear: new THREE.PerspectiveCamera(48, 1, .3, 6000), front: new THREE.PerspectiveCamera(48, 1, .3, 6000) };
  const zoom = { side: 9, top: 14, rear: 15, front: 15 };
  const size = new THREE.Vector2();
  // Grids every 10 m that follow the glider, seen only by these views (layers 1 and 2; the game's camera sees neither): high up, they are
  // what speed, height and the path read against.
  const wall = new THREE.GridHelper(400, 40, 0x6f8797, 0x8fa7b6); wall.rotation.z = Math.PI / 2; wall.layers.set(1); host.scene.add(wall);
  const floor = new THREE.GridHelper(400, 40, 0x6f8797, 0x9fb6c4); floor.layers.set(2); host.scene.add(floor);
  cameras.side.layers.enable(1); for (const id of ['top', 'rear', 'front']) cameras[id].layers.enable(2);
  function placeCamera(id, cam, aspect) {
    const p = host.player.position, h = host.player.rotation.y, fx = Math.sin(h), fz = Math.cos(h), z = zoom[id];
    // (the side view is a slice 40 m either side of the glider, so it shows the ground under its path and not every tree in the valley;
    // the top view looks 300 m down onto it)
    if (cam.isOrthographicCamera) { Object.assign(cam, { left: -z * aspect, right: z * aspect, top: z, bottom: -z, near: id === 'side' ? 160 : 1, far: id === 'side' ? 240 : 2000 }); cam.updateProjectionMatrix(); }
    else { cam.aspect = aspect; cam.updateProjectionMatrix(); }
    if (id === 'side') { cam.up.set(0, 1, 0); cam.position.set(p.x + fz * 200, p.y, p.z - fx * 200); }   // (from the glider's right)
    else if (id === 'top') { cam.up.set(fx, 0, fz); cam.position.set(p.x, p.y + 300, p.z); }
    else if (id === 'rear') { cam.up.set(0, 1, 0); cam.position.set(p.x - fx * z, p.y + z * .18, p.z - fz * z); }
    else { cam.up.set(0, 1, 0); cam.position.set(p.x + fx * z, p.y + z * .12, p.z + fz * z); }
    cam.lookAt(p);
  }
  function render() {
    const r = host.renderer, p = host.player.position, yaw = host.player.rotation.y; r.getSize(size);
    wall.rotation.set(0, yaw, Math.PI / 2); wall.position.set(p.x - Math.cos(yaw) * 30, Math.round(p.y / 10) * 10, p.z + Math.sin(yaw) * 30);
    floor.position.set(Math.round(p.x / 10) * 10, Math.max(host.terrainHeight(p.x, p.z) + .05, p.y - 15), Math.round(p.z / 10) * 10);
    const panes = view === 'quad' ? QUAD : [view], w = size.x, h = size.y;
    r.setScissorTest(true);
    panes.forEach((id, i) => {
      const x = view === 'quad' ? (i % 2) * w / 2 : 0, y = view === 'quad' ? (i < 2 ? h / 2 : 0) : 0, pw = view === 'quad' ? w / 2 : w, ph = view === 'quad' ? h / 2 : h;
      r.setViewport(x, y, pw, ph); r.setScissor(x, y, pw, ph);
      const cam = cameras[id]; placeCamera(id, cam, pw / ph); r.render(host.scene, cam);
    });
    r.setScissorTest(false); r.setViewport(0, 0, w, h);
  }
  function setView(v) {
    view = v; $('#labView').value = v; $('#labPanes').dataset.mode = v; setQuery();
  }
  addEventListener('wheel', e => { if (!enabled || view === 'game') return; const id = view === 'quad' ? paneAt(e.clientX, e.clientY) : view; zoom[id] = clamp(zoom[id] * Math.exp(e.deltaY * .001), 2, 400); }, { passive: true });
  addEventListener('dblclick', e => { if (!enabled || e.target.closest('.lab-float')) return; if (view === 'quad') setView(paneAt(e.clientX, e.clientY)); else if (QUAD.includes(view)) setView('quad'); });
  const paneAt = (x, y) => QUAD[(x > innerWidth / 2 ? 1 : 0) + (y > innerHeight / 2 ? 2 : 0)];

  /* ---------- recording and replay ---------- */
  const at = () => index ?? frames.length - 1;
  function record(dt) {
    if (!enabled) return;
    const f = host.captureFrame(); f.feet = f.pos[1] - host.groundUnder(f.pos[0], f.pos[2]) - 2.3; frames.push(f);
    if (frames.length > MAX_FRAMES) frames.shift();
    if (flight && !flight.done && flight.record(dt)) finishScenario();
  }
  function hold(on) { if (on === holding) return; holding = on; if (!on) { host.resumeLive(frames.at(-1)); index = null; } }
  function togglePlay() {
    if (playing) { playing = false; hold(true); return; }
    if (!holding) { hold(true); return; }   // (live: pause)
    if (index === null || index >= frames.length - 1) { if (flight?.done || !flight) { replayT = 0; index = 0; playing = true; return; } hold(false); return; }
    replayT = index * TICK; playing = true;   // (replay from here)
  }
  function step(n) {
    if (!frames.length) return;
    playing = false; hold(true);
    const i = at() + n;
    if (i > frames.length - 1) { host.resumeLive(frames.at(-1)); host.stepOnce(); index = null; host.render(TICK, 1, true); return; }   // (a frame further than recorded: fly it)
    index = clamp(i, 0, frames.length - 1); drawAt(index, 1, true);
  }
  function drawAt(i, alpha = 1, snap = false, dt = TICK) { const a = frames[Math.max(0, i)], b = frames[Math.min(frames.length - 1, i + (alpha < 1 ? 1 : 0))]; host.renderAt(a, alpha < 1 ? b : a, alpha < 1 ? alpha : 1, dt, snap); }
  let last = null, drawnAt = 0;
  function frame(now) {
    const dt = last === null ? 0 : Math.min(.1, (now - last) / 1000); last = now;
    if (playing) {
      replayT += dt * speed;
      const exact = replayT / TICK, i = Math.floor(exact);
      if (i >= frames.length - 1) { playing = false; index = frames.length - 1; drawAt(index); }
      else { index = i; drawAt(i, exact - i, false, dt * speed); }
    } else if (index !== null) drawAt(index, 1, false, 0);
    else host.render(0, 1);
    drawTimeline(); readout();
  }

  /* ---------- scenarios ---------- */
  function listScenarios() {
    $('#labList').innerHTML = SCENARIOS.filter(s => s.kind === kind).map(s => `<button data-scenario="${s.id}" title="${escapeHtml(s.look)}"${s.id === scenario?.id ? ' class="on"' : ''}>${s.name}</button>`).join('');
    for (const b of root.querySelectorAll('[data-scenario]')) b.onclick = () => runScenario(b.dataset.scenario);
    for (const b of root.querySelectorAll('[data-kind]')) b.classList.toggle('on', b.dataset.kind === kind);
    drawTimeline(); readout();
  }
  /** The scenario's place in the range's world: a launch site, or a final into the mark from the north (clear of the ridge). */
  const placeOf = sc => sc.kind === 'launch' ? { site: host.LAUNCH_SITES[sc.site], start: host.LAUNCH_SITES[sc.site].start, name: sc.site } : sc.kind === 'landing' ? { mark: host.MARK, finalHeading: Math.PI } : {};
  function windFor(sc, place) {
    const w = scenarioWind(sc.id), h = sc.kind === 'launch' ? place.start.heading ?? 0 : sc.kind === 'landing' ? place.finalHeading : 0;
    const vx = -Math.sin(h) * w.head + Math.cos(h) * w.cross, vz = -Math.cos(h) * w.head - Math.sin(h) * w.cross;
    return { speed: Math.hypot(vx, vz), direction: Math.atan2(vx, vz), variability: 0, gusts: w.gusts };
  }
  function runScenario(id, mode = pilotMode) {
    const sc = SCENARIOS.find(s => s.id === id); if (!sc) return;
    scenario = sc; pilotMode = mode; result = null; playing = false;
    if (holding) hold(false);
    const place = placeOf(sc); host.wind.set(windFor(sc, place));
    flight = flyScenario(sc, { round: host.round, pilot: mode, place });
    flight.start({ standAt: () => { host.standAtSite(place.name); host.launch(); }, startAt: init => host.startInAir(init, 'final') });
    host.setPilot(mode === 'you' ? null : () => flight.input());
    $('#labPickName').textContent = sc.name; $('#labPick').title = sc.look; $('#labLook').textContent = sc.look; $('#labFly').classList.toggle('on', mode === 'you'); $('#labPop').hidden = true;
    listScenarios(); showResult(); computeCompare();
    setQuery();
  }
  function finishScenario() {
    host.setPilot(null); result = flight.result; showResult();
    playing = false; hold(true); index = frames.length - 1;   // (it is over: held on its last frame, to replay)
  }
  function showResult() {
    const box = $('#labResult'), chip = $('#labChip');
    chip.hidden = !result; if (result) { chip.textContent = result.outcome; chip.className = `lab-chip ${outcomeClass(result.outcome)}`; }
    if (!scenario) return;
    if (!result) { box.innerHTML = `<p class="lab-dim">${pilotMode === 'you' ? 'You are flying.' : 'Flying…'}</p>`; return; }
    const m = result.metrics, c = compare?.metrics ?? {}, keys = Object.keys({ ...c, ...m }).filter(k => !Array.isArray(m[k] ?? c[k]));
    const cell = v => v === null || v === undefined ? '–' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : v;
    box.innerHTML = `<div class="lab-outcome ${outcomeClass(result.outcome)}">${result.outcome}</div>${m.notes?.length ? `<p class="lab-dim">${m.notes.join(' · ')}</p>` : ''}
      <table><tr><th></th><th>${wingName(result.preset, result.vg)}</th>${compare ? `<th>${wingName(compare.preset, compare.vg)}</th>` : ''}</tr>
      ${compare ? `<tr><td>outcome</td><td>${result.outcome}</td><td>${compare.outcome}</td></tr>` : ''}
      ${keys.map(k => `<tr><td>${humanize(k)}</td><td>${cell(m[k])}</td>${compare ? `<td>${cell(c[k])}</td>` : ''}</tr>`).join('')}</table>`;
  }

  /* ---------- the same scenario on another wing, headless on the same ground ---------- */
  const ghostGeo = new THREE.BufferGeometry(), ghost = new THREE.Line(ghostGeo, new THREE.LineDashedMaterial({ color: 0x6fa8dc, dashSize: 2, gapSize: 1.2 }));
  ghost.frustumCulled = false; host.scene.add(ghost);
  function computeCompare() {
    compare = null; ghost.visible = false;
    if (scenario && compareWing) {
      const place = placeOf(scenario), w = windFor(scenario, place), air = createWind({ speed: w.speed, direction: w.direction, variability: 0, gusts: w.gusts, seed: 1 });
      const world = createWorld({ terrain: host.terrainHeight, wind: air }), glider = createGlider({ world, preset: compareWing });
      if (glider.hasVG) glider.setVG(host.glider.vg);
      const round = createRound({ glider, realistic: true, target: host.MARK, ground: host.groundUnder });
      const f = flyScenario(scenario, { round, place }).start();
      for (let i = 0; i < 60 * 120 && !f.done; i++) { air.update(TICK); round.step(TICK, f.input()); f.record(TICK); }
      compare = f.result;
      const pts = compare.samples.filter((_, i) => i % 3 === 0).flatMap(s => [s.x, s.y - 1.65, s.z]);
      ghostGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); ghost.computeLineDistances(); ghost.visible = true;
    }
    $('#labCompareResult').innerHTML = compare ? `<p><b class="${outcomeClass(compare.outcome)}">${compare.outcome}</b> on ${wingName(compare.preset, compare.vg)}: the blue dashed line, and the blue traces.</p>` : '';
    showResult();
  }
  $('#labCompare').onchange = () => { compareWing = $('#labCompare').value; computeCompare(); setQuery(); };

  /* ---------- the timeline ---------- */
  function seek(canvas, clientX) {
    if (!frames.length) return;
    const r = canvas.getBoundingClientRect(), T = span(), t = clamp((clientX - r.left - 8) / (r.width - 16), 0, 1) * T;
    playing = false; hold(true); index = clamp(Math.round(t / TICK), 0, frames.length - 1);
    const pin = notes.find(n => samePlace(n) && Math.abs(n.t - t) < T * .006); if (pin) index = clamp(Math.round(pin.t / TICK), 0, frames.length - 1);
    drawAt(index, 1, true);
  }
  for (const canvas of [timeline, track]) {
    let dragging = false;
    canvas.addEventListener('pointerdown', e => { dragging = true; canvas.setPointerCapture(e.pointerId); seek(canvas, e.clientX); });
    canvas.addEventListener('pointermove', e => { if (dragging) seek(canvas, e.clientX); });
    canvas.addEventListener('pointerup', () => { dragging = false; });
  }
  /** The slim track in the bar: the recorded part of the round, the note pins and the playhead. */
  function drawTrack() {
    const r = track.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    if (!r.width) return;
    if (track.width !== Math.round(r.width * dpr)) { track.width = r.width * dpr; track.height = r.height * dpr; }
    const g = track.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const T = span(), X = t => 8 + (r.width - 16) * t / T, mid = r.height / 2;
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X(0), mid - 2, X(T) - X(0), 4);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(X(0), mid - 2, X(frames.length * TICK) - X(0), 4);
    for (const n of notes) if (samePlace(n)) { g.fillStyle = '#ffd36b'; g.fillRect(X(n.t) - 1.5, mid - 7, 3, 14); }
    if (frames.length) { g.fillStyle = '#fff'; g.beginPath(); g.arc(X(at() * TICK), mid, 5, 0, Math.PI * 2); g.fill(); }
  }
  const span = () => Math.max(scenario?.seconds ?? 10, frames.length * TICK, compare ? compare.samples.at(-1).t : 0);
  function drawTimeline() {
    const r = timeline.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio);
    if (!r.width) return;
    if (timeline.width !== Math.round(r.width * dpr)) { timeline.width = r.width * dpr; timeline.height = r.height * dpr; }
    const g = timeline.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const T = span(), X = t => 8 + (r.width - 16) * t / T, top = 18, lanes = LANES[kind], laneH = (r.height - top - 2) / lanes.length;
    g.font = '10px system-ui'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(238,235,229,.5)'; g.strokeStyle = 'rgba(255,255,255,.09)';
    const every = T > 30 ? 5 : T > 12 ? 2 : 1;
    for (let s = 0; s <= T; s += every) { g.beginPath(); g.moveTo(X(s), 2); g.lineTo(X(s), top - 4); g.stroke(); g.fillText(`${s}`, X(s) + 3, 8); }
    lanes.forEach(([label, unit, get], li) => {
      const y0 = top + li * laneH, live = [], comp = [];
      for (let i = 0; i < frames.length; i += 2) { const v = get(frames[i]); if (v !== null && Number.isFinite(v)) live.push([i * TICK, v]); else live.push(null); }
      if (compare) for (let i = 0; i < compare.samples.length; i += 2) { const s = compare.samples[i], v = SAMPLE_LANES[kind][li](s); comp.push(v !== null && Number.isFinite(v) ? [s.t, v] : null); }
      const vals = [...live, ...comp].filter(Boolean).map(p => p[1]); let lo = Math.min(...vals, 0), hi = Math.max(...vals, .001); if (hi - lo < 1e-6) hi = lo + 1;
      const Y = v => y0 + laneH - 3 - (laneH - 14) * (v - lo) / (hi - lo);
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(X(0), y0 + laneH); g.lineTo(X(T), y0 + laneH); g.stroke();
      for (const [pts, color] of [[comp, '#6fa8dc'], [live, '#f28c28']]) { g.strokeStyle = color; g.lineWidth = 1.4; g.beginPath(); let pen = false; for (const p of pts) { if (!p) { pen = false; continue; } if (pen) g.lineTo(X(p[0]), Y(p[1])); else { g.moveTo(X(p[0]), Y(p[1])); pen = true; } } g.stroke(); }
      g.lineWidth = 1; g.fillStyle = 'rgba(238,235,229,.5)'; g.fillText(`${label} ${lo.toFixed(0)}…${hi.toFixed(0)}${unit ? ' ' + unit : ''}`, 12, y0 + 8);
    });
    for (const n of notes) if (samePlace(n)) { g.fillStyle = '#ffd36b'; g.beginPath(); g.moveTo(X(n.t) - 5, 0); g.lineTo(X(n.t) + 5, 0); g.lineTo(X(n.t), 8); g.fill(); g.fillRect(X(n.t) - .5, 8, 1, r.height); }
    if (frames.length) { const t = at() * TICK; g.fillStyle = '#fff'; g.fillRect(X(t) - 1, 0, 2, r.height); }
  }
  function readout() {
    const t = Math.max(0, at()) * TICK, running = playing || !holding;
    $('#labClock').textContent = `${t.toFixed(2)} s`; $('#labClock').title = holding ? (playing ? 'replaying' : 'held') : 'live';
    if ($('#labPlay').dataset.running !== String(running)) { $('#labPlay').dataset.running = running; $('#labPlay').innerHTML = icon(running ? ICONS.pause : ICONS.play); }
    drawTrack();
    const near = notes.filter(n => samePlace(n) && Math.abs(n.t - t) < .5);
    $('#labFlag').hidden = !near.length; $('#labFlag').textContent = near.map(n => n.text).join(' · ');
  }

  /* ---------- notes ---------- */
  function loadNotes() { try { return JSON.parse(localStorage.getItem('hgsim-lab-notes') || '[]'); } catch { return []; } }
  function storeNotes() { try { localStorage.setItem('hgsim-lab-notes', JSON.stringify(notes)); } catch {} }
  const samePlace = n => n.scenario === (scenario?.id ?? 'free') && n.preset === host.glider.preset?.id;
  function openNote() {
    if (!frames.length) return;
    playing = false; hold(true); if (index === null) index = frames.length - 1;
    const t = at() * TICK; $('#labNoteAt').textContent = `${t.toFixed(2)} s · ${VIEW_NAMES[view]}`;
    $('#labNoteBox').hidden = false; const input = $('#labNoteText'); input.value = ''; input.focus();
    input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') $('#labNoteBox').hidden = true; if (e.key === 'Enter' && input.value.trim()) { addNote(t, input.value.trim()); $('#labNoteBox').hidden = true; } };
  }
  function addNote(t, text) {
    const f = frames[at()], s = f.soaring, l = f.runUp?.launch;
    const moment = l ? `${l.phase}, ${(l.airspeed * KMH).toFixed(0)} km/h, roll ${deg(l.roll).toFixed(0)}°, wing carries ${Math.round(l.lift * 100)}%` : f.tumble || f.wreck ? 'crashed' : `${(s.airspeed * KMH).toFixed(0)} km/h, ${f.feet.toFixed(1)} m, path ${deg(s.pathAngle).toFixed(0)}°, bank ${deg(s.bank).toFixed(0)}°, α ${deg(s.alpha).toFixed(0)}°${s.stalled ? ', stalled' : ''}`;
    const note = { id: `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), scenario: scenario?.id ?? 'free', kind: scenario?.kind ?? null,
      preset: host.glider.preset?.id ?? null, vg: host.glider.vg, pilot: scenario ? pilotMode : 'you', t: +t.toFixed(3), view, text, moment, tuning: host.glider.overrides, outcome: result?.outcome ?? null };
    notes.push(note); storeNotes(); showNotes(); host.toast('Note saved', 1.2);
    // For review: the note with the round around it. A round you flew is kept whole (every third tick), as it cannot be flown again.
    const flown = note.pilot === 'you' ? frames.filter((_, i) => i % 3 === 0).map(fr => ({ t: +(frames.indexOf(fr) * TICK).toFixed(3), mode: fr.mode, x: +fr.pos[0].toFixed(2), y: +fr.pos[1].toFixed(2), z: +fr.pos[2].toFixed(2),
      airspeed: +fr.soaring.airspeed.toFixed(2), bank: +fr.soaring.bank.toFixed(3), alpha: +fr.soaring.alpha.toFixed(3), path: +fr.soaring.pathAngle.toFixed(3), bar: +(fr.soaring.bar ?? 0).toFixed(2), controls: fr.controls,
      launch: fr.runUp ? { phase: fr.runUp.launch.phase, roll: +fr.runUp.launch.roll.toFixed(3), lift: +fr.runUp.launch.lift.toFixed(2), nose: +(fr.runUp.launch.noseCmd ?? 0).toFixed(3) } : null })) : null;
    fetch('/__notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...note, metrics: result?.metrics ?? null, flight: flown }) }).catch(() => {});
  }
  function showNotes() {
    const list = notes.slice().reverse();
    root.querySelector('[data-tab="notes"]').textContent = `Notes${notes.length ? ` (${notes.length})` : ''}`;
    $('#labNotes').innerHTML = list.length ? list.map(n => `<div class="lab-note${samePlace(n) ? ' here' : ''}" data-note="${n.id}"><b>${n.t.toFixed(2)} s</b> <span class="lab-dim">${SCENARIOS.find(s => s.id === n.scenario)?.name ?? 'free flight'} · ${PRESETS[n.preset]?.name ?? n.preset} · ${VIEW_NAMES[n.view] ?? n.view}</span><p>${escapeHtml(n.text)}</p><button class="x" title="Delete">×</button></div>`).join('')
      : '<p class="lab-dim">N pins a note to the moment and the view you are looking at. Notes are saved for review.</p>';
    for (const el of root.querySelectorAll('.lab-note')) el.onclick = e => {
      const n = notes.find(x => x.id === el.dataset.note);
      if (e.target.classList.contains('x')) { notes = notes.filter(x => x !== n); storeNotes(); showNotes(); return; }
      if (samePlace(n) && frames.length) { playing = false; hold(true); index = clamp(Math.round(n.t / TICK), 0, frames.length - 1); drawAt(index, 1, true); }
    };
  }
  $('#labCopyNotes').onclick = () => navigator.clipboard?.writeText(notes.map(n => `${n.scenario} · ${n.preset}${PRESETS[n.preset]?.vg ? ` VG ${n.vg}` : ''} · ${n.t.toFixed(2)} s · ${n.view}: ${n.text} [${n.moment}]`).join('\n')).then(() => host.toast('Notes copied', 1.2));

  /* ---------- controls ---------- */
  root.querySelector('#labRestart').onclick = () => scenario ? runScenario(scenario.id) : host.standAtSite(host.site);
  root.querySelector('#labPlay').onclick = togglePlay;
  root.querySelector('#labBack').onclick = e => step(e.shiftKey ? -10 : -1);
  root.querySelector('#labFwd').onclick = e => step(e.shiftKey ? 10 : 1);
  root.querySelector('#labFly').onclick = () => { if (scenario) runScenario(scenario.id, pilotMode === 'you' ? 'script' : 'you'); };
  root.querySelector('#labNote').onclick = openNote;
  $('#labView').onchange = () => setView($('#labView').value);
  $('#labPick').onclick = () => { $('#labPop').hidden = !$('#labPop').hidden; if (!$('#labPop').hidden) details(false); };
  $('#labMore').onclick = () => details($('#labDetails').hidden);
  $('#labChip').onclick = () => details(true);
  $('#labHide').onclick = () => fold(true);
  $('#labShow').onclick = () => fold(false);
  for (const b of root.querySelectorAll('[data-kind]')) b.onclick = () => { kind = b.dataset.kind; listScenarios(); setQuery(); };
  for (const b of root.querySelectorAll('[data-speed]')) b.onclick = () => { speed = Number(b.dataset.speed); for (const c of root.querySelectorAll('[data-speed]')) c.classList.toggle('on', c === b); };
  for (const b of root.querySelectorAll('[data-tab]')) b.onclick = () => { for (const c of root.querySelectorAll('[data-tab]')) c.classList.toggle('on', c === b); for (const p of root.querySelectorAll('[data-tab-pane]')) p.hidden = p.dataset.tabPane !== b.dataset.tab; };
  root.querySelector('[data-tab="result"]').classList.add('on'); root.querySelector('[data-speed="1"]').classList.add('on');
  // The lab's keys come first; while the game is held (paused or replaying), the game's own keys wait.
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea')) return;
    if (e.code === 'KeyL') { show(!enabled); e.stopImmediatePropagation(); return; }
    if (!enabled) return;
    const k = e.code, mine = { KeyP: togglePlay, Comma: () => step(e.shiftKey ? -10 : -1), Period: () => step(e.shiftKey ? 10 : 1), KeyN: openNote, KeyG: () => setView('game'), KeyQ: () => setView('quad'),
      KeyT: () => details($('#labDetails').hidden), KeyH: () => fold(!folded) }[k];
    if (mine) { e.preventDefault(); e.stopImmediatePropagation(); mine(); return; }
    if (k === 'KeyR' && scenario) { e.stopImmediatePropagation(); runScenario(scenario.id); return; }
    if (k === 'Escape' && (!$('#labPop').hidden || !$('#labDetails').hidden)) { $('#labPop').hidden = true; details(false); e.stopImmediatePropagation(); return; }
    if (k === 'Escape' && QUAD.includes(view)) { setView('quad'); e.stopImmediatePropagation(); return; }
    if (holding && !['Tab', 'KeyM'].includes(k)) { if (['ArrowLeft', 'ArrowRight'].includes(k)) step(k === 'ArrowLeft' ? -1 : 1); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  function show(on) {
    enabled = on; root.hidden = !on; document.body.classList.toggle('lab-on', on);
    if (!on) { if (holding) hold(false); view = 'game'; host.setPilot(null); flight = null; }
    else listScenarios();
    setQuery();
  }
  function setQuery() {
    const p = new URLSearchParams(location.search);
    if (enabled) { p.set('lab', kind); if (scenario) p.set('scenario', scenario.id); else p.delete('scenario'); if (compareWing) p.set('compare', compareWing); else p.delete('compare'); if (view !== 'game') p.set('view', view); else p.delete('view'); }
    else { p.delete('lab'); p.delete('scenario'); p.delete('compare'); p.delete('view'); }
    history.replaceState(null, '', '?' + p);
  }

  showNotes();
  if (q.get('lab')) {
    show(true); setView(VIEW_NAMES[q.get('view')] ? q.get('view') : 'game');
    compareWing = PRESETS[q.get('compare')] ? q.get('compare') : ''; $('#labCompare').value = compareWing;
    const sc = SCENARIOS.find(s => s.id === q.get('scenario'));
    if (sc) { kind = sc.kind; queueMicrotask(() => runScenario(sc.id)); }
  }

  return {
    get holding() { return enabled && holding; },
    get drawsViews() { return enabled && view !== 'game'; },
    afterTick: record, frame, render,
    /** After every drawn frame: the clock and the timeline (a few times a second while live). */
    afterRender() { if (!enabled || holding) return; const now = performance.now(); if (now - drawnAt > 120) { drawnAt = now; drawTimeline(); readout(); } },
    /** A new round has started (standing at a launch, or in the air): a new recording. */
    newRound() { frames = []; index = null; playing = false; },
  };
}

const wingName = (id, vg) => `${PRESETS[id]?.name ?? id ?? 'the default wing'}${PRESETS[id]?.vg ? (vg > .5 ? ' VG on' : ' VG off') : ''}`;
const humanize = k => k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/ (kmh|deg|metres|seconds|ms)$/, (m, u) => ({ kmh: ' (km/h)', deg: ' (°)', metres: ' (m)', seconds: ' (s)', ms: ' (m/s)' })[u]);
const outcomeClass = o => ['soft', 'flying', 'done'].includes(o) ? 'good' : ['firm', 'no launch', 'sank back'].includes(o) ? 'warn' : o ? 'bad' : '';
