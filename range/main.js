/**
 * The landing range: a small world for tuning the flight, the launch and the landing. One ridge with a ramp and a cliff to
 * launch from, a flat field with a bullseye, a windsock by the field and streamers on the launch, one thermal marked by
 * birds. A side panel sets the wind and the main feel numbers live (Tab hides it, so the sock is the only wind cue); every
 * round is recorded for review (tools/flight-report.mjs).
 *
 * This file is the app: the game loop, the launch run-up, the flight and its landing, the camera and the HUD. The world
 * it flies over is world.js (where the ground is) and scenery.js (how it is drawn); the simulation is the hgsim SDK in src/ (one createWorld, one createGlider).
 * Open http://127.0.0.1:4180/range/ (npm start). URL options: wind (m/s), from (bearing, degrees), launch=real,
 * model=original (the older flight model), assist=on (the game's terrain-skimming assist), glider (a preset id, such as t2c-144).
 */
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createPilotRig, addSailFlutter, createLandingCues } from '../src/three/index.js';
import { createWorld, createGlider, forceModel, classicModel, PRESETS, bankedClearance, createTumble, stepTumble, scoreLanding, LANDING_RULES, dropToImpact,
  createFlightRecorder, createWind, describeWind, compassName, directionFromBearing, bearingFromDirection } from '../src/index.js';
import { createLaunch, launchPose, shoulderPivot } from '../src/launch.js';
import { createWindsock, createStreamer, createWindRod, createWindIndicators } from './wind-indicators.js';
import { createSpeedStreaks } from './speed-streaks.js';
import { createAudio } from './audio.js';
import { createGamepad } from './gamepad.js';
import { createTouchControls } from './touch.js';
import { createFullscreen } from './fullscreen.js';
import { terrainHeight, slopeAt, landableAt, LAUNCH, MARK, THERMAL, WING_CARRY, DECK_BACK, DECK_LIP, deckY, CLIFF, SLOPE, RAMP_POSTS, LAUNCH_SITES, SITE_ORDER, rockTop, groundUnder } from './world.js';
import { buildScenery } from './scenery.js';
import { createPolarChart } from './polar-chart.js';
import { createPitchChart } from './pitch-chart.js';
import { createSimulationLoop } from './simulation-loop.js';
import { readFlightControls, createTakeoffControls } from './controls.js';
import { createRenderQuality } from './rendering.js';
import { createHud } from './hud.js';
import { interpolateMotion } from './motion.js';
import { createChaseCamera } from './camera.js';
import { getAirframePose } from './airframe-pose.js';

// ?model=original flies the older, simpler flight model (src/models/classic.js), for a side-by-side comparison.
const MODEL = new URLSearchParams(location.search).get('model') === 'original' ? 'original' : 'force';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c6d8); scene.fog = new THREE.FogExp2(0xb8cfdc, .00028);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .4, 9000);
scene.add(new THREE.HemisphereLight(0xcfe3f5, 0x6f7a55, 1.05));
const sun = new THREE.DirectionalLight(0xffe4c0, 3); sun.position.set(-900, 1300, 700); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 4000 }); sun.shadow.bias = -.0002; sun.shadow.normalBias = 1;
scene.add(sun, sun.target);

const { birds, setQuality: setSceneQuality, updateDetail } = buildScenery(THREE, scene);
const quality = createRenderQuality({
  renderer, sun, width: innerWidth, height: innerHeight,
  pixelRatio: devicePixelRatio, onChange: setSceneQuality,
});

// The resting wing, bar on the ground, for the pose while standing at a launch.
const REST = createLaunch();
// tumble: a launch or a landing gone wrong, carried on as a rigid body (src/tumble.js); wreck: where it came to rest.
// pilotStand: sitting up in flight by choice (Space), for drag and a slow landing.
let tumble = null, wreck = null, pilotStand = false;
/** Carry the current simulation pose and velocity into the crash solver. */
function tumbleFromFlight() {
  const fx = Math.sin(heading), fz = Math.cos(heading), h = speed * Math.cos(soaring.pathAngle || 0);
  const pose = getAirframePose({
    position: pos, heading, pitch, bank, visualBank: soaring.visualBank ?? bank,
    ground: terrainHeight(pos.x, pos.z), takeoff, lowest: rig?.lowest ?? -.65,
    hasRig: !!rig, mode, settle,
  });
  tumble = createTumble({ ...pose,
    velocity: [fx * h + (soaring.windX || 0), verticalSpeed, fz * h + (soaring.windZ || 0)], yawRate: soaring.headingRate || 0, ground: groundUnder, wind: { x: wind.x, z: wind.z } });
  tumble.inRound = true; takeoff = null; mode = 'tumbling';
}

/* ---------- wind and its indicators ---------- */
// The wind: ?wind (m/s, default 5) and ?from (the bearing it blows from; 180, the default, is straight up the launch).
const params = new URLSearchParams(location.search);
const wind = createWind({ speed: Number(params.get('wind')) || 5, direction: directionFromBearing(Number(params.get('from')) || 180), variability: 1 });
const indicators = createWindIndicators(THREE);
// Each stands on whatever is underfoot there: the deck, a rock or the terrain.
const sockAt = (x, z, scale = 1) => { const s = createWindsock(THREE, { scale }); scene.add(s.group); indicators.add(s, x, groundUnder(x, z), z); return s; };
const streamerAt = (x, z, color, size = {}) => { const s = createStreamer(THREE, { color, ...size }); scene.add(s.group); indicators.add(s, x, groundUnder(x, z), z); return s; };
sockAt(MARK.x + 46, MARK.z + 12);                     // by the field
// The ramp: tall streamers on poles beside the deck (on arms out from it, clear of the wing) at mid-run and at the lip, and a
// windsock on the rock behind the start of the deck.
sockAt(LAUNCH.x - 5, LAUNCH.z - 28, .85);
RAMP_POSTS.forEach((p, i) => { const s = createStreamer(THREE, { color: i % 3 ? '#f07f2c' : '#f6f1e6', pole: 3, length: 2.2 }); scene.add(s.group); indicators.add(s, p.x, p.y, p.z); });
// The cliff: a paraglider-style fishing rod on its top, back from the edge, and a streamer near the edge.
{ const r = createWindRod(THREE); scene.add(r.group); indicators.add(r, CLIFF.x + 7, groundUnder(CLIFF.x + 7, CLIFF.cz + 4), CLIFF.cz + 4); }
streamerAt(CLIFF.x - 6, CLIFF.edge - 7, '#f07f2c');
// The slope: a windsock beside the start (on the side away from the launch view, so it is in sight) and streamers down the
// run either side, outside the wing's span.
sockAt(SLOPE.x + 10, SLOPE.z + 6, .85);
for (const [dx, dz, c] of [[-7, 18, '#f07f2c'], [7, 22, '#f6f1e6'], [-7, 38, '#f07f2c']]) streamerAt(SLOPE.x + dx, SLOPE.z + dz, c);
for (const [dx, dz] of [[-52, -30], [55, 40]]) streamerAt(MARK.x + dx, MARK.z + dz, '#f07f2c');

/* ---------- glider ---------- */
const player = new THREE.Group(); scene.add(player);
let wing = new THREE.Group(), pilot = new THREE.Group(), rig = null, flutter = null;
{ // procedural stand-in until the model loads
  const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.15, 3.9, -7.2, 1.25, -2.4, 0, 1.6, -.4, 0, 2.15, 3.9, 0, 1.6, -.4, 7.2, 1.25, -2.4], 3)); sail.computeVertexNormals();
  wing.add(new THREE.Mesh(sail, new THREE.MeshStandardMaterial({ color: 0xe16231, side: THREE.DoubleSide, roughness: .72 })));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .8, 3, 6), new THREE.MeshStandardMaterial({ color: 0x243b43 })); body.rotation.x = Math.PI / 2; body.position.set(0, -.5, -.45); pilot.add(body);
  player.add(wing, pilot);
}
try {
  const gltf = await new GLTFLoader().loadAsync('./assets/hang-glider.glb');
  const modelWing = gltf.scene.getObjectByName('Wing'), modelPilot = gltf.scene.getObjectByName('Pilot');
  if (modelWing && modelPilot) { player.remove(wing, pilot); wing = modelWing; pilot = modelPilot; player.add(gltf.scene); rig = createPilotRig(THREE, pilot); flutter = addSailFlutter(wing); }
} catch (error) { console.warn('procedural glider fallback:', error.message); }
player.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

/* ---------- flight ---------- */
// The range flies without the game's terrain-skimming assist, so all height control is the pilot's; ?assist=on brings it back to compare.
const SKIM_ASSIST = MODEL === 'original' || new URLSearchParams(location.search).get('assist') === 'on';
// Easy launches run themselves; realistic ones are the pilot's: balance the wing (A/D), hold its nose (W/S), push (Shift), start and jump (Space).
const REAL_LAUNCH = new URLSearchParams(location.search).get('launch') === 'real';
// The SDK's world and glider (src/): the range's terrain, its live wind and its thermal, and the one glider flown over them.
const world = createWorld({ terrain: terrainHeight, wind, thermals: [THERMAL], air: { thermalCeiling: 1500, thermalFadeStart: 1150 } });
// ?glider picks the wing (src/presets.js); the force model's own defaults are the 'intermediate' preset.
const PRESET = MODEL === 'original' ? null : (PRESETS[new URLSearchParams(location.search).get('glider')] ?? PRESETS.intermediate);
const glider = createGlider({ world, model: MODEL === 'original' ? classicModel : forceModel, preset: PRESET, skim: SKIM_ASSIST && { clearance: bankedClearance } });
const keys = new Set();
// New code on the server is picked up on its own, but never in the air or over a landing result: the page reloads as soon as
// you are standing at launch, or when you next start a round.
let loadedVersion = null, staleVersion = false;
function reloadIfStale() { if (staleVersion) location.reload(); return staleVersion; }
setInterval(() => { fetch('/__version').then(r => r.ok ? r.text() : null).then(v => { if (!v) return; loadedVersion ??= v; if (v !== loadedVersion && !staleVersion) { staleVersion = true; toast('New version: loads when you next start a round', 4); } if (staleVersion && mode === 'ready') reloadIfStale(); }, () => {}); }, 2000);
// Every round is recorded for play-test review: tools/flight-report.mjs reads what the local server saved in work/flights.
let storageForFlights = null; try { storageForFlights = localStorage; } catch {}
const recorder = createFlightRecorder({ storage: storageForFlights, send: flight => fetch('/__flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flight) }).then(r => { flightsServerOk = r.ok; updateRecorderPanel(); }, () => { flightsServerOk = false; updateRecorderPanel(); }) });
let flightsServerOk = null, roundClock = 0, scrapes = 0;
function beginRound(start) { roundClock = 0; scrapes = 0; recorder.begin({ start, model: MODEL, assist: SKIM_ASSIST, wind: { speed: +wind.meanSpeed.toFixed(1), fromDeg: Math.round(bearingFromDirection(wind.meanDirection)), variability: wind.variability }, tuning: glider.overrides }); updateRecorderPanel(); }
function markMoment() { const where = recorder.mark(); toast(where ? 'Moment marked' : 'Nothing to mark yet', 1.2); updateRecorderPanel(); }
function updateRecorderPanel() { const list = recorder.list(), el = $('recorderStatus'); if (!el) return; el.textContent = `${list.length} round${list.length === 1 ? '' : 's'} kept here${flightsServerOk === true ? ', saved for review' : flightsServerOk === false ? ', server not saving: use Download' : ''}`; }
const streaks = createSpeedStreaks(THREE, scene), audio = createAudio();
const cues = createLandingCues(THREE, scene, { onFlareCue() { audio.emit('tip'); } });
const pos = new THREE.Vector3();
let soaring = glider.state, mode = 'ready', heading = LAUNCH.heading, pitch = 0, bank = 0, speed = 0, verticalSpeed = 0;
let elapsed = 0, rounds = 0, best = Number(localStorage.getItem('above-micro-best') || 0), result = null, toastUntil = 0;
let distanceFlown = 0, maxSpeed = 0, edgeTurning = false, pilotUpright = 0, settle = 0, pilotShift = 0, takeoff = null, runUp = null, rigSnap = true, launchSite = 'ramp';
const footBox = new THREE.Box3(), footWorld = new THREE.Vector3();
const renderPosition = new THREE.Vector3();
let previousMotion = null, renderedMotion = {};
function captureMotion() {
  return { x: pos.x, y: pos.y, z: pos.z, heading, pitch, bank, visualBank: soaring.visualBank ?? bank };
}
function resetMotion() {
  previousMotion = captureMotion();
  Object.assign(renderedMotion, previousMotion);
  renderPosition.copy(pos);
}
let runOut = null, impact = 0;
const dust = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#c9bb94', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.userData.noShadow = true; scene.add(m); return { m, t: 9, vx: 0, vz: 0 }; });
function kickDust(x, y, z, n) { let k = 0; for (const d of dust) { if (k >= n) break; if (d.t < 1) continue; const a = Math.random() * 6.28, r = .4 + Math.random() * 1.2; d.t = 0; d.vx = Math.cos(a) * r; d.vz = Math.sin(a) * r; d.m.position.set(x, y + .25, z); d.m.visible = true; k++; } }
function updateFeel(dt) {
  for (const d of dust) { if (d.t >= 1) continue; d.t += dt / 1.3; d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt; d.m.position.y += .35 * dt; d.m.scale.setScalar(.3 + d.t * 1.5); d.m.material.opacity = .4 * (1 - d.t) * (1 - d.t); if (d.t >= 1) d.m.visible = false; }
  if (runOut) { const r = runOut; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), v = r.v * (1 - k) * (1 - k); pos.x += r.dx * v * dt; pos.z += r.dz * v * dt; pos.y = terrainHeight(pos.x, pos.z) + 2.4; speed = v; if (v > 1.5 && Math.random() < dt * 9) kickDust(pos.x, pos.y - 2.4, pos.z, 1);
    if (k >= 1) { runOut = null; speed = 0; showCard(result); } }
  impact = Math.max(0, impact - dt * 2.4);
}

/** The launch site the pilot is at (world.js LAUNCH_SITES): where they stand, the ground of the run, its fall and its edge. */
const site = () => LAUNCH_SITES[launchSite];
/** The site C goes to next: ramp, cliff, slope, and round again. */
const nextSite = () => SITE_ORDER[(SITE_ORDER.indexOf(launchSite) + 1) % SITE_ORDER.length];
/** Stand at a launch site (ramp, cliff or slope; by default the current one), the wing resting, ready to launch. */
function standAtSite(name = launchSite) {
  tumble = wreck = null; launchSite = name; runOut = null; takeoff = null; runUp = null; rigSnap = true; recorder.end({ outcome: 'abandoned' });
  const { x, z, heading: h } = site().start;
  pos.set(x, site().ground(x, z) + 2.3, z); heading = h; pitch = .05; bank = 0; speed = verticalSpeed = 0; mode = 'ready';
  soaring = glider.reset({ x, y: pos.y, z, heading }).state; resetMotion(); snapCamera();
}
function launch() {
  if (reloadIfStale()) return;
  if (runOut || runUp) return;
  if (mode === 'gliding') return;
  if (mode === 'landed' || mode === 'crashed') standAtSite();
  hideCard(); glider.place({ x: pos.x, y: pos.y, z: pos.z, heading });
  const handle = glider.launch({ site: site(), manual: REAL_LAUNCH }); soaring = glider.state; runUp = { t: 0, handle, launch: handle.state };
}
/**
 * The launch (src/launch.js): the wing is picked up, balanced and run with until it flies or the ground ends, then the flight takes
 * over from the wing's own place and speed. Off the edge below flying speed it dives for its airspeed. A crosswind that lifts a
 * wing ends the launch.
 */
function stepRunUp(dt) {
  if (mode !== 'ready') { runUp = null; return; }
  const { handle } = runUp, s = handle.state; runUp.t += dt;
  // The launch reads the run's ground from the site (its fall along the run, and how far ahead it ends: the ramp's lip or a side
  // of its deck, the cliff's edge; a slope carries on) and the wind and rising air from the world, and moves the glider along it.
  const controls = readFlightControls(keys, pad);
  handle.step(dt, { nose: controls.nose, balance: controls.roll, push: controls.push, go: !!s.go, jump: !!runUp.jump }); runUp.jump = false;
  pos.set(soaring.x, soaring.y, soaring.z); heading = soaring.heading; speed = s.airspeed;
  if (handle.failed) {   // it went wrong: the glider and pilot carry on as a body, from exactly this state, until they come to rest
    tumble = handle.tumble({ stride: rig?.step ?? 0, ground: groundUnder }); runUp = null; mode = 'tumbling';
    return;
  }
  if (!handle.airborne) return;
  // The flight carries on from the launch's own state: the same wing, speed, path and angle of attack, nothing handed over.
  const flyingOff = s.reason === 'flying', pose = handle.pose(rig?.step ?? 0);
  runUp = null; leaveGround(s, pose, !flyingOff);
}
/**
 * The flight starts where the wing is, at its speed. The legs stop holding the body up over the next third of a second (plant, from
 * the ground where they left it), the straps' pull and the wing on the shoulders fade with it, and the wing's attitude eases into
 * the flight's. dropped: off the edge before it flew, so the pilot goes prone on the bar for the dive; otherwise the pilot holds the
 * bar out (holdBar) to fly away at the lift-off speed, easing it in over the next seconds.
 */
function leaveGround(launchState, pose, dropped) {
  pilotStand = false;
  // The reference stays 2.3 m over the ground as on the run; the contact offset that draws the model is the run's own height, so
  // the wing is drawn exactly where the last running frame drew it (the rig's smoothed feet point would lag a fast stride).
  const ground = site().ground(pos.x, pos.z), lowest = -pose.height;
  pos.y = ground + 2.3;
  glider.place({ x: pos.x, y: pos.y, z: pos.z, heading }); soaring = glider.state; speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0;
  mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; rounds++; beginRound(site().round);
  takeoff = { t: 0, dropped, site: launchSite, launch: launchState, ground, lowest0: lowest, pitch0: pose.pitch, roll0: pose.roll, yaw0: pose.yaw, lean0: pose.lean, run0: pose.run,
    lift0: pose.lift, carry0: pose.carry, shoulders0: pose.shoulders, plant0: pose.plant, ground0: -pose.height / Math.cos(pose.pitch), tilt0: Math.tan(pose.pitch) - site().fall(pos.x, pos.z, heading),
    holdBar: dropped ? 0 : launchState.barHold,
    controls: createTakeoffControls({
      heldPitch: readFlightControls(keys, pad).pitch,
      holdBar: dropped ? 0 : launchState.barHold,
      dropped, cliff: launchState.cliff, realistic: REAL_LAUNCH,
    }),
  };
}
/** Start in the air over the field: downwind at 110 m, on the downwind side, so the round is only the pattern and the landing. */
function overhead() { if (reloadIfStale()) return; tumble = wreck = null; pilotStand = false;
  runOut = null; takeoff = null; runUp = null; rigSnap = true;
  const d = wind.direction;                                 // start 260 m upwind of the mark, flying downwind past it
  const x = MARK.x - Math.sin(d) * 260, z = MARK.z - Math.cos(d) * 260;
  pos.set(x, terrainHeight(x, z) + 110, z); heading = wrapAngle(d + .35);
  soaring = glider.reset({ x, y: pos.y, z, heading, airspeed: 22 }).state; speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0;
  mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; rounds++; beginRound('overhead'); resetMotion(); snapCamera();
}
// Xbox-style controller, the same as the game: left stick steers and moves the bar, RT dives, LT pushes out, A launches.
// Its buttons arrive as key events: X (KeyE) starts over the field, D-pad up (KeyR) returns to launch, View (KeyM) toggles the panel.
let padActive = false;
const gamepad = createGamepad({ context: () => 'world', onActive: on => { padActive = on; }, onConnect: () => toast('Controller connected') });
// On a touchscreen, a thumb stick that adds to the controller's left stick, and buttons that send keys.
const touch = createTouchControls({ root: document.querySelector('.hud') });
const fullscreen = createFullscreen([...document.querySelectorAll('[data-fullscreen]')]);
const pad = { get lx() { return gamepad.state.lx + touch.state.lx; }, get ly() { return gamepad.state.ly + touch.state.ly; }, get lt() { return gamepad.state.lt; }, get rt() { return gamepad.state.rt; } };
function updateFlight(dt) {
  const { roll: turn, pitch: pitchInput } = readFlightControls(keys, pad);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const landable = pitchInput <= .1 || landableAt(pos.x, pos.z) || landableAt(pos.x + fx * 30, pos.z + fz * 30) || landableAt(pos.x + fx * 60, pos.z + fz * 60);
  const groundLandable = pos.y - terrainHeight(pos.x, pos.z) < 14 && landableAt(pos.x, pos.z);
  // Range edge: bank round toward the field instead of flying off the map.
  const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z)) > 1450, steer = edge ? clamp(-wrapAngle(Math.atan2(-pos.x, -pos.z) - heading) * 2.5, -1, 1) : 0;
  edgeTurning = edge;
  pilotShift = edge ? steer : turn;
  // Through a take-off the pilot flies the wing: off an edge below flying speed the bar comes in for the dive (unless pushed out); off
  // a run it is held out to fly away at the lift-off speed, eased in over the next seconds, until the pilot takes the bar themselves.
  const barInput = takeoff
    ? takeoff.controls.pitch(pitchInput, { age: takeoff.t, airspeed: soaring.airspeed })
    : pitchInput;
  glider.step(dt, { stand: pilotStand, roll: edge ? steer : turn, pitch: barInput, landable, field: groundLandable });
  const px = pos.x, pz = pos.z;
  pos.set(soaring.x, soaring.y, soaring.z); heading = soaring.heading; bank = soaring.bank; pitch = soaring.pitch; speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed;
  roundClock += dt; recorder.sample(roundClock, { x: pos.x, y: pos.y, z: pos.z, clear: pos.y - terrainHeight(pos.x, pos.z) - 2.3, kmh: speed * 3.6, vs: verticalSpeed, heading, bank, pitch, path: soaring.pathAngle, alpha: soaring.alpha ?? 0, load: soaring.loadFactor ?? 1, bar: soaring.bar, inRoll: edge ? steer : turn, inPitch: pitchInput, upright: soaring.upright ?? 0, stalled: soaring.stalled ? 1 : 0, windX: soaring.windX, windZ: soaring.windZ });
  distanceFlown += Math.hypot(pos.x - px, pos.z - pz); maxSpeed = Math.max(maxSpeed, speed);
  // Solid things: the ramp's deck and the frame under it, and the rocks. (Not in the first moments of the launch off them.)
  if (!(takeoff && takeoff.t < .25)) {
    const onDeck = Math.abs(pos.x - LAUNCH.x) < 3.6 && pos.z > LAUNCH.z + DECK_BACK && pos.z < LAUNCH.z + DECK_LIP;
    const hit = onDeck && pos.y - 2.3 < deckY(pos.z) - .3 && pos.y + 1 > deckY(pos.z) - 3 ? 'the ramp' : rockTop(pos.x, pos.z) > pos.y - 1.6 ? 'the rock' : null;
    if (hit) { touchdown({ verticalSpeed: 9, groundSpeed: speed, slope: 0, bank, heading, airspeed: speed, wind: { x: soaring.windX, z: soaring.windZ }, x: pos.x, z: pos.z, flare: { pressed: false } }); return; }
  }
  const ground = terrainHeight(pos.x, pos.z);
  // Just off the ground the feet may still brush it: that is the end of the run, not a landing.
  if (pos.y < ground + 2.3 - (takeoff && takeoff.t < 1.2 ? .3 : 0)) {
    const gx = (terrainHeight(pos.x + 12, pos.z) - terrainHeight(pos.x - 12, pos.z)) / 24, gz = (terrainHeight(pos.x, pos.z + 12) - terrainHeight(pos.x, pos.z - 12)) / 24;
    const slope = Math.hypot(gx, gz), horizontal = speed * Math.cos(soaring.pathAngle || 0), vx = fx * horizontal + soaring.windX, vz = fz * horizontal + soaring.windZ;
    const groundSpeed = Math.hypot(vx, vz), contact = (gx * vx + gz * vz - verticalSpeed) / Math.sqrt(1 + slope * slope);
    if (glider.scrape({ verticalSpeed: contact, groundSpeed, slope, bank, ground })) {
      pos.y = soaring.y; speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; scrapes++;
      impact = Math.max(impact, clamp(.25 + contact / 5, .25, .9)); kickDust(pos.x, ground, pos.z, 4 + Math.round(contact * 2)); audio.emit('touchdown', { speed, contact }); toast('Scraped', .8);
      return;
    }
    touchdown({ verticalSpeed: contact, groundSpeed, slope, bank, heading, airspeed: speed, wind: { x: soaring.windX, z: soaring.windZ }, x: pos.x, z: pos.z,
      flare: { pressed: !!soaring.flarePressed, feet: soaring.flareFeet, ratio: soaring.flareRatio, balloon: soaring.flareBalloon } });
  }
}
function touchdown(contact) {
  // A crash is not decided here: the glider carries on as a body, from the flight's own state, until it comes to rest (src/tumble.js).
  if (!contact.settled && scoreLanding(contact, MARK, glider.rules).judged === 'crash') { tumbleFromFlight(); return; }
  result = scoreLanding(contact, MARK, glider.rules);
  // (a wreck that has tumbled to rest was heard when it hit: its crash is not played again now)
  if (result.judged === 'crash') { if (!contact.settled) audio.emit('crash', { severity: clamp(contact.verticalSpeed / 7, .25, 1), kind: 'terrain' }); }
  else audio.emit('touchdown', { speed: contact.airspeed, contact: contact.verticalSpeed, soft: result.judged === 'soft' });
  result.contact = contact; result.distanceFlown = distanceFlown; result.maxSpeed = maxSpeed;
  recorder.end({ outcome: result.judged, scrapes, result: { judged: result.judged, points: result.points, stars: result.stars, notes: result.notes, noStep: result.noStep, distance: result.distance, headwind: result.headwind, sink: contact.verticalSpeed, groundSpeed: contact.groundSpeed, airspeed: contact.airspeed, bank: contact.bank, flare: contact.flare, maxSpeed } });
  mode = result.judged === 'crash' ? 'crashed' : 'landed'; keys.clear();
  pos.y = terrainHeight(pos.x, pos.z) + 2.4; verticalSpeed = 0; settle = 0;
  // The feet take it: an impact felt in the camera, dust, and a run-out as long as the ground speed asks for.
  const crash = mode === 'crashed', g = contact.groundSpeed, h = Math.hypot(contact.groundSpeed, 0) || 1;
  runOut = { t: 0, dur: crash ? .35 : clamp(.35 + g * .11, .4, 1.8), v: crash ? g * .4 : g, dx: Math.sin(heading), dz: Math.cos(heading) }; void h;
  impact = clamp(contact.verticalSpeed / 4.5 + g / 40, .12, crash ? 1.6 : 1); kickDust(pos.x, terrainHeight(pos.x, pos.z), pos.z, 3 + Math.round(impact * 11));
  if (mode === 'landed' && result.points > best) { best = result.points; localStorage.setItem('above-micro-best', String(best)); }
  updateBest();
}

/* ---------- camera ---------- */
const chaseCamera = createChaseCamera(THREE, camera, { terrainHeight });
function updateCamera(dt, snap = false) {
  const motion = snap ? captureMotion() : renderedMotion;
  chaseCamera.update({
    position: snap ? pos : renderPosition,
    modelPosition: player.position,
    mode, heading: motion.heading, bank: motion.bank, speed,
    pathAngle: soaring.pathAngle, runUp: !!runUp, takeoff, impact,
    time: performance.now() / 1000,
  }, dt, { snap });
}
function snapCamera() { updateCamera(1 / 60, true); }

/* ---------- HUD, cards and panel ---------- */
function toast(text, seconds = 2.5) { $('toast').textContent = text; $('toast').classList.add('on'); toastUntil = elapsed + seconds; }
function hideCard() { $('card').classList.remove('on', 'crash'); }
function showCard(r) {
  const card = $('card'), crash = r.judged === 'crash', c = r.contact;
  const title = crash ? 'CRASHED' : r.noStep && r.stars === 3 ? 'NO-STEPPER · NAILED IT' : r.noStep ? 'NO-STEPPER' : r.stars === 3 ? 'NAILED IT' : r.stars === 2 ? 'GOOD LANDING' : r.judged === 'rough' ? 'ROUGH LANDING' : 'LANDED';
  const f = c.flare, flareLine = !f?.pressed ? 'none · the wing mushed on' : `S at ${f.feet.toFixed(1)} m and ${(f.ratio * 100).toFixed(0)}% of stall speed` + (r.notes.includes('Flared too early') ? ' · too early, it ballooned' : r.notes.includes('Flared late') ? ' · late' : r.noStep ? ' · perfect' : ' · good');
  const stars = [1, 2, 3].map(i => `<span class="${i <= r.stars ? '' : 'off'}">★</span>`).join('');
  const windLine = r.windSpeed < 1.5 ? 'calm air' : `${r.headwind >= 0 ? 'headwind' : 'tailwind'} ${Math.abs(r.headwind).toFixed(1)} m/s · wind ${describeWind(wind)}`;
  const why = crash ? r.headwind < -LANDING_RULES.tailwindFree && c.verticalSpeed < LANDING_RULES.softTouchdown.vertical ? `Too fast to run it out: a ${(-r.headwind).toFixed(1)} m/s tailwind made it ${(c.groundSpeed * 3.6).toFixed(0)} km/h over the ground.` : (Math.abs(c.bank) > LANDING_RULES.maxTouchdownBank ? 'Wings not level at touchdown.' : c.verticalSpeed >= 2.8 && c.groundSpeed >= 10.5 ? 'Too fast and sinking too hard: slow down into the wind and push out low.' : c.verticalSpeed >= 3.6 ? 'Dropped in from too high: you stalled above the ground. Start holding S lower, at about 3 m.' : c.groundSpeed >= 19 ? 'Far too fast over the ground: bleed off speed, land into the wind.' : 'Too steep a slope to land on.') : '';
  const tip = !crash && r.notes.includes('Downwind') ? 'Landing downwind: the ground speed was the airspeed plus the wind. Turn into the wind next time; the windsock points the way the air moves.' : !crash && r.notes.includes('Flared too early') ? 'Too early: you ran out of speed high up. Start holding S lower, at about 3 m.' : !crash && r.notes.includes('Too fast to flare') ? 'Too fast: the wing could not be pushed out before the ground. Slow down on final.' : !crash && r.notes.includes('No flare') ? 'No flare: on final, hold S from about 3 m and keep holding.' : !crash && r.notes.includes('Flared late') ? 'Late: start holding S a little higher, at about 3 m.' : !crash && r.judged === 'rough' ? 'Fast over the ground: bleed speed before the flare.' : !crash && r.ring === null ? 'Plan the pattern so the final approach ends on the mark.' : '';
  card.className = 'card on' + (crash ? ' crash' : '');
  card.innerHTML = `<h2>${title}</h2><div class="stars">${stars}</div>
    <table>
      <tr><td>Touchdown</td><td>${crash ? 'crash' : r.judged} · ${c.verticalSpeed.toFixed(1)} m/s down · ${c.groundSpeed.toFixed(1)} m/s over the ground</td></tr>
      <tr><td>Flare</td><td>${flareLine}</td></tr>
      <tr><td>Wind</td><td>${windLine}</td></tr>
      <tr><td>Mark</td><td>${r.distance === null ? '—' : r.distance < 1 ? 'dead centre' : Math.round(r.distance) + ' m off' + (r.ring === 'bullseye' ? ' · bullseye' : r.ring === 'inner' ? ' · inner ring' : r.ring === 'outer' ? ' · outer ring' : r.ring === 'pad' ? ' · in the zone' : ' · outside the zone')}</td></tr>
      <tr><td>Notes</td><td>${r.notes.join(' · ') || '—'}</td></tr>
    </table>
    <div class="pts">${crash ? '0' : r.points} pts</div>
    <p>${why}${tip}</p><p class="keys">Space · launch again &nbsp;·&nbsp; C · other launch &nbsp;·&nbsp; 1 · start over the field</p>`;
}
function updateBest() { $('best').textContent = `Best round: ${best ? best + ' pts' : '—'} · rounds flown ${rounds}`; }
const hud = createHud();
function updateHud() {
  const snapshot = {
    mode, speed, verticalSpeed,
    agl: pos.y - terrainHeight(pos.x, pos.z),
    distance: Math.hypot(pos.x - MARK.x, pos.z - MARK.z),
    alpha: soaring.alpha, stalled: soaring.stalled,
    padActive, pilotStand, launchPhase: runUp?.launch.phase,
    realLaunch: REAL_LAUNCH, launchSite, nextSite: nextSite(),
    wind: { speed: wind.speed, from: wind.from, meanSpeed: wind.meanSpeed, meanFrom: bearingFromDirection(wind.meanDirection) },
  };
  hud.update(snapshot); touch.update(snapshot);
  if (elapsed > toastUntil) $('toast').classList.remove('on');
}
// Panel: wind
const windSpeed = $('windSpeed'), windDir = $('windDir'), windVar = $('windVar');
function syncWindPanel() { windSpeed.value = wind.meanSpeed; windDir.value = Math.round(bearingFromDirection(wind.meanDirection)); windVar.value = wind.variability; $('windSpeedV').textContent = wind.meanSpeed.toFixed(1) + ' m/s'; $('windDirV').textContent = windDir.value + '° (' + compassName(wrapAngle(wind.meanDirection + Math.PI)) + ')'; $('windVarV').textContent = Number(windVar.value).toFixed(1); }
windSpeed.addEventListener('input', () => { wind.set({ speed: Number(windSpeed.value) }); syncWindPanel(); });
windDir.addEventListener('input', () => { wind.set({ direction: directionFromBearing(Number(windDir.value)) }); syncWindPanel(); });
windVar.addEventListener('input', () => { wind.set({ variability: Number(windVar.value), gusts: Number(windVar.value) }); syncWindPanel(); });
$('windRandom').addEventListener('click', () => { wind.set({ speed: 2 + Math.random() * 6, direction: directionFromBearing(Math.random() * 360) }); syncWindPanel(); toast('New wind · read the sock'); });
$('windCalm').addEventListener('click', () => { wind.set({ speed: 0 }); syncWindPanel(); });
// Panel: tuning
const tuneInputs = [...document.querySelectorAll('[data-tune]')];
function syncTunePanel() { const t = glider.config; for (const input of tuneInputs) { const key = input.dataset.tune, deg = !!input.dataset.deg, v = deg ? t[key] / DEG : t[key]; input.value = v; $('t-' + key).textContent = deg ? (Math.round(v * 10) / 10) + '°' : key === 'cd0' ? Number(v).toFixed(3) : Number(v).toFixed(1); } }
for (const input of tuneInputs) input.addEventListener('input', () => { const key = input.dataset.tune, v = Number(input.value); glider.tune({ [key]: input.dataset.deg ? v * DEG : v }); syncTunePanel(); drawPolar(true); });
$('tuneReset').addEventListener('click', () => { glider.tune(); syncTunePanel(); drawPolar(true); toast(glider.preset ? `${glider.preset.name} restored` : 'Defaults restored'); });
$('tuneCopy').addEventListener('click', () => { const diff = glider.overrides; navigator.clipboard?.writeText(JSON.stringify(diff)); toast(Object.keys(diff).length ? 'Copied: ' + JSON.stringify(diff) : 'Nothing changed from the defaults', 4); });
// Panel: the glider. A preset picker, what the wing is, and its polar, live: tuning moves the curve, and the green dot is where
// the wing is flying now (its own sink at this drag, so turns, dives and the flare are seen leaving the steady glide).
const presetSelect = $('preset'), polarChart = createPolarChart($('polar')), pitchChart = createPitchChart($('pitch'));
for (const p of Object.values(PRESETS)) presetSelect.add(new Option(`${p.name} · ${p.era}`, p.id));
const otherPolars = Object.values(PRESETS).map(p => ({ id: p.id, polar: createGlider({ preset: p }).polar() }));
let polarNow = null, pitchNow = null, polarDrawn = 0;
function describePreset() {
  const p = glider.preset; presetSelect.value = p?.id ?? '';
  $('presetInfo').textContent = p ? p.description : 'The original physics: its own fixed polar.';
}
function drawPolar(changed = false) {
  if (changed || !polarNow) {
    polarNow = glider.polar({ maxSpeed: 120 / 3.6 });
    const k = v => (v * 3.6).toFixed(0);
    $('polarStats').textContent = polarNow ? `stall ${k(polarNow.stallSpeed)} · trim ${k(polarNow.trimSpeed)} km/h · min sink ${polarNow.minSink.sink.toFixed(2)} m/s at ${k(polarNow.minSink.airspeed)} · best glide ${polarNow.bestGlide.glideRatio.toFixed(1)} at ${k(polarNow.bestGlide.airspeed)} km/h` : '';
  }
  if (changed || !pitchNow) {
    pitchNow = glider.pitchStability();
    const d = r => (r * 180 / Math.PI).toFixed(0), t = pitchNow?.curves.find(c => c.bar === 0)?.trim;
    $('pitchStats').textContent = pitchNow && t ? `hands-off trim ${d(t.alpha)}° at ${(t.airspeed * 3.6).toFixed(0)} km/h · stiffness ${(-pitchNow.stiffness).toFixed(1)}/s · nose-up recovery when steep ${d(pitchNow.lowAlphaRecovery)}°/s` : '';
  }
  const flying = mode === 'gliding' && glider.performance?.pitchResponse;
  pitchChart.draw({ stability: pitchNow, stallAlpha: glider.config.stallAlpha, now: flying ? { alpha: soaring.alpha, rate: glider.performance.pitchResponse(soaring.alpha, soaring.bar) } : null });
  polarChart.draw({ polar: polarNow, others: otherPolars.filter(o => o.id !== glider.preset?.id), now: mode === 'gliding' ? { airspeed: soaring.airspeed, sink: soaring.sinkRate } : null, reference: glider.reference?.points });
}
presetSelect.addEventListener('change', () => {
  glider.usePreset(presetSelect.value); vgTarget = glider.vg; syncVG(); describePreset(); syncTunePanel(); drawPolar(true);
  const q = new URLSearchParams(location.search); q.set('glider', presetSelect.value); history.replaceState(null, '', '?' + q);
  toast(glider.preset.name, 1.6); $('world').focus();
});
// The VG: V pulls it on or lets it off (the rope takes about two seconds); the slider sets it anywhere between.
let vgTarget = glider.vg;
function stepVG(dt) {
  if (!glider.hasVG || glider.vg === vgTarget) return;
  const v = glider.vg, next = v + Math.max(-dt * .5, Math.min(dt * .5, vgTarget - v));
  glider.setVG(Math.abs(next - vgTarget) < 1e-3 ? vgTarget : next); syncVG(); polarNow = pitchNow = null;
}
function syncVG() {
  $('vgRow').hidden = !glider.hasVG; $('vg').value = vgTarget; $('vgV').textContent = glider.vg < .02 ? 'off (loose)' : glider.vg > .98 ? 'on (tight)' : Math.round(glider.vg * 100) + '%';
}
$('vg').addEventListener('input', () => { vgTarget = Number($('vg').value); });
describePreset(); syncVG();
for (const [id, name] of [['btnLaunch', 'ramp'], ['btnCliff', 'cliff'], ['btnSlope', 'slope']]) $(id).addEventListener('click', () => { standAtSite(name); launch(); $('world').focus(); });
$('btnOverhead').addEventListener('click', () => { overhead(); $('world').focus(); });
$('btnMark').addEventListener('click', () => { markMoment(); $('world').focus(); });
$('btnFlights').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(recorder.list())], { type: 'application/json' })); a.download = 'above-flights.json'; a.click(); URL.revokeObjectURL(a.href); });
addEventListener('pagehide', () => recorder.end({ outcome: 'abandoned' }));
updateRecorderPanel();
for (const el of [windSpeed, windDir, windVar, ...tuneInputs]) el.addEventListener('keydown', e => e.stopPropagation());

// The panel: Tab, the controller's View, its own hide button and the settings button bring it back. A small screen starts without it.
function togglePanel() { $('panel').classList.toggle('hidden'); }
if (innerWidth < 760 || matchMedia('(pointer: coarse)').matches) $('panel').classList.add('hidden');
$('panelHide').addEventListener('click', togglePanel); $('panelShow').addEventListener('click', togglePanel);
addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); togglePanel(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  audio.unlock(); if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space' || e.code === 'Enter') { if (runUp) { const s = runUp.launch; if (s.phase === 'balance') s.go = true; else if (s.phase === 'run') runUp.jump = true; } else if (mode === 'gliding') { pilotStand = !pilotStand; if (takeoff) takeoff.ownStance = true; } else launch(); }
  if (e.code === 'Digit1' || e.code === 'KeyE') overhead();
  if (e.code === 'KeyV' && !e.repeat && glider.hasVG) { vgTarget = vgTarget > .5 ? 0 : 1; toast(vgTarget ? 'VG on: tight for the glide' : 'VG off: loose to turn and land', 1.4); }
  if (e.code === 'KeyM') togglePanel();
  if (e.code === 'KeyF') fullscreen.toggle();
  if (e.code === 'KeyN' && !e.repeat) markMoment();
  if (e.code === 'KeyR') { standAtSite(); hideCard(); }
  if (e.code === 'KeyC' && mode !== 'gliding' && !runOut) { hideCard(); standAtSite(nextSite()); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  quality.resize(innerWidth, innerHeight, devicePixelRatio);
});

/* ---------- simulation and presentation ---------- */
// Only this callback advances physical time. A render can contain zero or many
// ticks, but each tick performs exactly one lifecycle phase.
function stepSimulation(dt) {
  stepVG(dt);
  previousMotion = captureMotion();
  elapsed += dt;
  gamepad.poll();
  wind.update(dt);
  if (runUp) {
    stepRunUp(dt);
  } else if (tumble) {
    stepTumble(tumble, dt);
    pos.set(tumble.x, tumble.y + 1.3, tumble.z);
    speed = Math.hypot(tumble.v[0], tumble.v[2]);
    verticalSpeed = tumble.v[1];
    if (tumble.impact > 2.5 && !tumble.felt) {
      tumble.felt = true;
      impact = Math.max(impact, clamp(tumble.impact / 7, .3, .9));
      audio.emit('crash', { severity: clamp(tumble.impact / 8, .25, 1), kind: 'terrain' });
    }
    if (tumble.done) {
      wreck = tumble;
      tumble = null;
      if (!wreck.inRound) beginRound(site().round);
      touchdown({ settled: true, verticalSpeed: Math.max(6, wreck.impact), groundSpeed: wreck.speed0, slope: 0, bank: 0, heading, airspeed: wreck.speed0, wind: { x: wind.x, z: wind.z }, x: pos.x, z: pos.z, flare: { pressed: false } });
    }
  } else if (mode === 'gliding') {
    updateFlight(dt);
  }
  updateFeel(dt);
  if (mode === 'landed' || mode === 'crashed') settle = Math.min(1, settle + dt / .8);
  const flying = mode === 'gliding';
  if (takeoff) { takeoff.t += dt; if (takeoff.t > 8 || !flying) takeoff = null; }
  // The pilot goes prone once the wing is flying (or as they pull in to dive for it).
  if (takeoff && takeoff.proneAt == null && (takeoff.launch?.cliff || soaring.airspeed >= 1.05 * glider.performance.stallSpeed() || (soaring.bar || 0) < -.25)) takeoff.proneAt = takeoff.t;
}

function renderFrame(dt, alpha) {
  renderedMotion = interpolateMotion(previousMotion, captureMotion(), alpha, renderedMotion);
  renderPosition.set(renderedMotion.x, renderedMotion.y, renderedMotion.z);
  const pos = renderPosition;
  const { heading, pitch, bank, visualBank } = renderedMotion;
  // On the ground the wing is set down: the pilot stands with the nose up and the keel resting on the ground.
  const grounded = mode === 'landed' || mode === 'crashed';

  const eased = settle * settle * (3 - 2 * settle);
  const flying = mode === 'gliding';
  const tk = takeoff?.t ?? 9, standing = mode === 'ready';
  // The launch (src/launch.js): the wing is picked up off the ground, balanced on the shoulders and run with until it flies or the
  // ground falls away; from there the flight carries it and the pilot folds up into the pod. Off an edge below flying speed the
  // pilot goes straight down prone on the bar for the dive, and eases back as the wing gets its airspeed.
  const launching = runUp?.launch ?? (standing ? REST : null), pose = launching ? launchPose(launching, rig?.step ?? 0, glider.config) : null;
  const dropped = !!takeoff?.dropped, jumpedOff = !!takeoff?.launch?.jumped, flare = clamp((soaring.flare - .08) / .35, 0, 1) * clamp((12 - (pos.y - terrainHeight(pos.x, pos.z))) / 6, 0, 1);
  const wantUpright = tumble ? 1 : flying && pilotStand ? 1 : flying ? Math.max(takeoff ? (takeoff.proneAt == null ? 1 : 1 - smooth(takeoff.proneAt, takeoff.proneAt + .2, tk)) : 0, flare) : grounded || pose ? 1 : 0;
  pilotUpright = lerp(pilotUpright, wantUpright, 1 - Math.exp(-dt * 3.5));
  if (!rig) { pilot.rotation.set(-pilotUpright * 1.25, 0, 0, 'ZYX'); pilot.position.set(0, -pilotUpright * .15, -pilotUpright * .25); }
  flutter?.update(dt, { speed: flying ? soaring.airspeed : launching ? launching.airspeed : 0, stall: flying ? soaring.stalled ? 1 : soaring.stallWarning ? .45 : 0 : 0 });
  // Flight shares a reference 2.3 m above the ground at contact: near the ground the model is drawn lower, so its lowest point
  // (the bar in flight, the feet when upright) reaches the ground exactly at contact. Through a take-off that offset is held at
  // its lift-off value and measured from the ground the pilot left (the deck, not the terrain far below it), so the wing is
  // drawn where it was at lift-off and folding the legs up never moves it.
  player.position.copy(pos);
  const siteGround = site().ground(pos.x, pos.z), groundHere = terrainHeight(pos.x, pos.z);
  if (pose) { player.position.y = siteGround + pose.height; player.rotation.set(pose.pitch, heading + pose.yaw, pose.roll, 'YXZ'); const o = shoulderPivot(pose.pitch, heading + pose.yaw, pose.roll, pose.shoulders); player.position.x += o[0]; player.position.y += o[1]; player.position.z += o[2]; }
  else {
    const framePose = getAirframePose({
      position: pos, heading, pitch, bank, visualBank, ground: groundHere,
      takeoff, lowest: rig?.lowest ?? -.65, hasRig: !!rig, mode, settle,
    });
    player.position.set(framePose.x, framePose.y, framePose.z);
    player.rotation.set(framePose.pitch, framePose.heading, framePose.roll, 'YXZ');
  }
  if (mode === 'landed') player.position.y = lerp(player.position.y, groundHere + WING_CARRY, eased);
  // A wreck is drawn where the physics has it.
  const body = tumble || (mode === 'crashed' ? wreck : null);
  if (body) { player.position.set(body.x, body.y, body.z); player.quaternion.set(body.q[0], body.q[1], body.q[2], body.q[3]); }
  if (rig) {
    const rx = player.rotation.x;
    // On the ground the body moves under the wing to keep the feet planted, so a stride never moves the wing, and leans into the straps as they pull.
    if (pose) rig.update(dt, { upright: 1, level: -rx, shoulders: pose.shoulders, shift: pose.shift, standRoll: -pose.roll, standYaw: -pose.yaw, run: pose.run, lift: pose.lift, carry: pose.carry, grip: pose.grip, lean: pose.lean - rx, speed: launching.groundSpeed, ground: (siteGround - player.position.y) / Math.cos(rx), tilt: Math.tan(rx) - site().fall(pos.x, pos.z, heading), plant: pose.plant }, rigSnap);
    else {
      const l = takeoff?.launch, run = takeoff ? (dropped || jumpedOff ? 1 - smooth(0, .45, tk) : 1 - smooth(.3, 1.5, tk)) * (takeoff.run0 ?? 1) : runOut ? clamp(speed / 3.5, 0, 1) : 0;
      const letGo = smooth(0, .35, tk), eased2 = smooth(0, .5, tk);
      rig.update(dt, { swing: takeoff && takeoff.proneAt != null && !takeoff.ownStance && !tumble ? 1 : 0, quick: (dropped || jumpedOff) && tk < 1.5 && !takeoff?.ownStance, standRoll: takeoff ? -takeoff.roll0 * (1 - smooth(0, 1, tk)) : 0, standYaw: takeoff ? -(takeoff.yaw0 ?? 0) * (1 - smooth(0, 1.2, tk)) : 0, bar: flying ? (dropped ? Math.max(-(soaring.bar || 0), .85 * (1 - smooth(1.6, 2.4, tk))) : -(soaring.bar || 0)) : 0, handGap: flare > .05 && !pilotStand ? .2 : undefined, shift: flying ? pilotShift : 0, upright: wantUpright, lift: takeoff ? lerp(takeoff.lift0, 1, eased2) : 1, carry: takeoff ? takeoff.carry0 * (1 - eased2) : 0, shoulders: takeoff ? (takeoff.shoulders0 ?? 0) * (1 - eased2) : 0, lean: takeoff ? (takeoff.lean0 - rx) * (1 - smooth(.3, 1.6, tk)) : 0, run, speed: takeoff ? l?.groundSpeed ?? 6 : speed, crashed: tumble ? smooth(0, .5, tumble.t) : mode === 'crashed' ? 1 : 0, ground: mode === 'landed' ? (groundHere - player.position.y) / Math.cos(rx) : takeoff ? takeoff.ground0 : 0, tilt: takeoff ? lerp(takeoff.tilt0, Math.tan(rx), letGo) : Math.tan(rx), plant: mode === 'landed' ? eased : takeoff ? takeoff.plant0 * (1 - letGo) : 0 }, rigSnap);
    }
    rigSnap = false;
  }
  if (rig && mode === 'crashed' && !wreck) {
    player.updateMatrixWorld(true); footWorld.copy(rig.feetPoint).applyMatrix4(pilot.matrixWorld);
    player.position.y -= (footWorld.y - terrainHeight(pos.x, pos.z)) * eased;
  } else if (grounded && !rig) { player.updateMatrixWorld(true); footBox.setFromObject(pilot); player.position.y -= (footBox.min.y - terrainHeight(pos.x, pos.z)) * eased; }
  updateCamera(dt);
  updateDetail(camera.position);
  indicators.update(wind, elapsed, camera.position);
  birds.forEach((b, i) => { const a = elapsed * (.12 + i * .01) + i * 1.9, r = 60 + i * 11; b.position.set(THERMAL.x + Math.cos(a) * r, terrainHeight(THERMAL.x, THERMAL.z) + 170 + i * 22 + Math.sin(a * 2) * 6, THERMAL.z + Math.sin(a) * r); b.rotation.set(0, -a, -.2); });
  sun.target.position.set(pos.x, pos.y, pos.z); sun.position.set(pos.x - 900, pos.y + 1300, pos.z + 700);
  updateHud();
  if (elapsed - polarDrawn > .2 && !$('panel').classList.contains('hidden')) { polarDrawn = elapsed; drawPolar(); }
  { const f = mode === 'gliding', g = terrainHeight(pos.x, pos.z); cues.update({ flying: f, x: pos.x, z: pos.z, ground: g, feet: pos.y - g - 2.3, speedRatio: speed / glider.performance.stallSpeed(), bar: soaring.bar || 0, sink: -verticalSpeed, landable: slopeAt(pos.x, pos.z) < .42, speed, dropToImpact: f && verticalSpeed < -3 ? dropToImpact({ x: pos.x, feetY: pos.y - 2.3, z: pos.z, vx: Math.sin(heading) * Math.cos(soaring.pathAngle || 0) * speed + (soaring.windX || 0), vy: verticalSpeed, vz: Math.cos(heading) * Math.cos(soaring.pathAngle || 0) * speed + (soaring.windZ || 0), terrainHeight }) : null }); }
  { const flying = mode === 'gliding', cg = Math.cos(soaring.pathAngle || 0); streaks.update(camera.position, { x: Math.sin(heading) * cg, y: Math.sin(soaring.pathAngle || 0), z: Math.cos(heading) * cg }, flying ? speed : 0, dt);
    audio.update({ mode: flying ? 'gliding' : 'foot', paused: false, speed, verticalSpeed, lift: flying ? soaring.lift : 0, thermalLift: flying ? soaring.thermalLift : 0, ridgeLift: flying ? soaring.ridgeLift : 0, clearance: pos.y - terrainHeight(pos.x, pos.z), skim: flying ? clamp(soaring.skimAssist || 0, 0, 1) : 0, stalled: flying && !!soaring.stalled, stallWarning: flying && !!soaring.stallWarning, pullUp: flying && !!soaring.pullUp, bank, walking: false, sprinting: false, biome: 'alpine', nearSea: 0, altitude: pos.y }, dt); }
  renderer.render(scene, camera);
}
const simulationLoop = createSimulationLoop({ step: stepSimulation, render: renderFrame });
let previousFrame = null;
function frame(now) {
  if (!document.hidden) {
    quality.sample(previousFrame === null ? 0 : (now - previousFrame) / 1000);
    simulationLoop.frame(now);
  }
  previousFrame = now;
  requestAnimationFrame(frame);
}
addEventListener('visibilitychange', () => {
  keys.clear();
  simulationLoop.reset();
  quality.reset();
  previousFrame = null;
  resetMotion();
});

standAtSite('ramp'); syncWindPanel(); syncTunePanel(); drawPolar(true); updateBest();
{ const other = new URLSearchParams(location.search); if (MODEL === 'original') other.delete('model'); else other.set('model', 'original'); const q = other.toString();
  $('modelName').textContent = MODEL === 'original' ? 'Original physics' : 'Force model'; $('modelSwitch').textContent = MODEL === 'original' ? 'Switch to force model' : 'Switch to original physics'; $('modelSwitch').href = location.pathname + (q ? '?' + q : '');
  $('feelSection').hidden = MODEL === 'original'; $('preset').disabled = MODEL === 'original'; }
{ const other = new URLSearchParams(location.search); if (SKIM_ASSIST) other.delete('assist'); else other.set('assist', 'on'); const q = other.toString();
  $('assistName').textContent = SKIM_ASSIST ? 'Skim assist on' : 'Skim assist off'; $('assistSwitch').textContent = SKIM_ASSIST ? 'Turn skim assist off' : 'Turn skim assist on'; $('assistSwitch').href = location.pathname + (q ? '?' + q : ''); $('assistSwitch').parentElement.hidden = MODEL === 'original'; }
{ const other = new URLSearchParams(location.search); if (REAL_LAUNCH) other.delete('launch'); else other.set('launch', 'real'); const q = other.toString();
  $('launchName').textContent = REAL_LAUNCH ? 'Realistic launch: you balance, run and jump' : 'Easy launch: it runs itself'; $('launchSwitch').textContent = REAL_LAUNCH ? 'Switch to easy launches' : 'Switch to realistic launches'; $('launchSwitch').href = location.pathname + (q ? '?' + q : ''); }
$('loading').hidden = true; $('world').focus();
window.rangeDemo = window.microDemo = { get quality() { return quality.level; }, pad: gamepad.state, model: MODEL, audio, get rig() { return rig; }, camera, player, scene, renderer, deckY, get soaring() { return soaring; }, get launchSite() { return launchSite; }, get takeoff() { return takeoff; }, get runUp() { return runUp; }, get tumble() { return tumble; }, get wreck() { return wreck; }, standAtSite, standAtCliff: () => standAtSite('cliff'), standAtSlope: () => standAtSite('slope'), CLIFF, SLOPE, measure() { player.updateMatrixWorld(true); const g = terrainHeight(pos.x, pos.z), pb = new THREE.Box3().setFromObject(pilot), wb = new THREE.Box3().setFromObject(wing); return { mode, bodyAboveGround: +(pos.y - g).toFixed(2), pilotLowAboveGround: +(pb.min.y - g).toFixed(2), wingLowAboveGround: +(wb.min.y - g).toFixed(2), pilotLowBelowBody: +(pos.y - pb.min.y).toFixed(2), wingLowBelowBody: +(pos.y - wb.min.y).toFixed(2), upright: +pilotUpright.toFixed(2) }; }, startAt({ x, z, agl = 12, heading: h = 0, kmh = 0, pathDeg = 0 }) { tumble = wreck = null; pilotStand = false; runOut = null; takeoff = null; rigSnap = true; pos.set(x, terrainHeight(x, z) + agl, z); heading = h; soaring = glider.reset({ x, y: pos.y, z, heading: h }).state; if (kmh) { soaring.airspeed = kmh / 3.6; soaring.pathAngle = pathDeg * Math.PI / 180; soaring.verticalSpeed = soaring.airspeed * Math.sin(soaring.pathAngle); soaring.alpha = -1.5 * Math.PI / 180; } speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0; mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; beginRound('final'); resetMotion(); snapCamera(); }, recorder, getState: () => ({ mode, position: pos.toArray(), speed, heading, bank, verticalSpeed, airspeed: soaring.airspeed, pathAngle: soaring.pathAngle, clearance: pos.y - terrainHeight(pos.x, pos.z), wind: { x: wind.x, z: wind.z, speed: wind.speed }, result, rounds, best }), setKey: (code, down) => down ? keys.add(code) : keys.delete(code), launch, overhead, wind, tune: patch => glider.tune(patch), glider, world, terrainHeight, MARK, LAUNCH };
requestAnimationFrame(frame);
