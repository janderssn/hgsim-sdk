/**
 * The landing range: a small world for tuning the flight, the launch and the landing. One ridge with a ramp and a cliff to
 * launch from, a flat field with a bullseye, a windsock by the field and streamers on the launch, one thermal marked by
 * birds. A side panel sets the wind and the main feel numbers live (Tab hides it, so the sock is the only wind cue); every
 * round is recorded for review (tools/flight-report.mjs).
 *
 * This file is the app: the game loop, the launch run-up, the flight and its landing, the camera and the HUD. The world
 * it flies over is world.js (where the ground is) and scenery.js (how it is drawn); the simulation is the library in src/.
 * Open http://127.0.0.1:4180/range/ (npm start). URL options: wind (m/s), from (bearing, degrees), launch=real,
 * model=original (the older flight model), assist=on (the game's terrain-skimming assist).
 */
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createPilotRig, addSailFlutter } from '../src/pilot-rig.js';
import { createLaunch, stepLaunch, launchPose, windOnRun, barForSpeed, shoulderPivot } from '../src/launch.js';
import { createTumble, stepTumble } from '../src/tumble.js';
import { createSoaringState as createForce, stepSoaring as stepForce, scoreLanding, scrapeGround, tuneSoaring, getSoaringTuning, stallSpeed, SOARING_DEFAULTS, sampleSoaringAir, barTargetSpeed } from '../src/flight.js';
import { updateSkimPose, getSkimClearance } from '../src/skim-pose.js';
import { createWind, describeWind, compassName, directionFromBearing, bearingFromDirection } from '../src/wind.js';
import { createWindsock, createStreamer, createWindRod, createWindIndicators } from './wind-indicators.js';
import { createSpeedStreaks } from './speed-streaks.js';
import { createAudio } from './audio.js';
import { createGamepad } from './gamepad.js';
import { createLandingCues, dropToImpact } from '../src/landing-cues.js';
import { createFlightRecorder } from '../src/flight-recorder.js';
import { terrainHeight, slopeAt, landableAt, LAUNCH, MARK, THERMAL, RUN_DIST, WING_CARRY, DECK_FALL, DECK_BACK, DECK_LIP, deckY, deckLine, CLIFF, RAMP_POSTS, rockTop, groundUnder } from './world.js';
import { buildScenery } from './scenery.js';

// ?model=original flies the older, simpler flight model (src/flight-classic.js), for a side-by-side comparison.
const MODEL = new URLSearchParams(location.search).get('model') === 'original' ? 'original' : 'force';
const { createSoaringState, stepSoaring } = MODEL === 'original' ? await import('../src/flight-classic.js') : { createSoaringState: createForce, stepSoaring: stepForce };

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c6d8); scene.fog = new THREE.FogExp2(0xb8cfdc, .00028);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .4, 9000);
scene.add(new THREE.HemisphereLight(0xcfe3f5, 0x6f7a55, 1.05));
const sun = new THREE.DirectionalLight(0xffe4c0, 3); sun.position.set(-900, 1300, 700); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 4000 }); sun.shadow.bias = -.0002; sun.shadow.normalBias = 1;
scene.add(sun, sun.target);

const { birds } = buildScenery(THREE, scene);   // (the birds circle the thermal: the only cue for it, as in the game)

// The resting wing, bar on the ground, for the pose while standing at a launch.
const REST = createLaunch();
// tumble: a launch or a landing gone wrong, carried on as a rigid body (src/tumble.js); wreck: where it came to rest.
// pilotStand: sitting up in flight by choice (Space), for drag and a slow landing. pivotHeld: how much of the wing still turns
// about the shoulders just after lift-off.
let tumble = null, wreck = null, pilotStand = false, pivotHeld = 0;
/** The flight ends against something: the glider as drawn, at the flight's own velocity (wind drift and sink), becomes a tumbling body. */
function tumbleFromFlight() {
  const fx = Math.sin(heading), fz = Math.cos(heading), h = speed * Math.cos(soaring.pathAngle || 0);
  tumble = createTumble({ x: player.position.x, y: player.position.y, z: player.position.z, pitch: player.rotation.x, heading: player.rotation.y, roll: player.rotation.z,
    velocity: [fx * h + (soaring.windX || 0), verticalSpeed, fz * h + (soaring.windZ || 0)], yawRate: soaring.headingRate || 0, ground: groundUnder, wind: { x: wind.x, z: wind.z } });
  tumble.inRound = true; takeoff = null; mode = 'tumbling';
}
// The cliff launch, on its own rock beside the ramp: stand at the edge and step off. The flight starts slow, so the wing dives until it has airspeed.
// Prone on the bar, the pilot holds it in a little until the wing is flying, so the nose keeps dropping as the speed builds; pushing out cancels that.
const STEP_OFF = { airspeed: 5, pathAngle: -.3 }, DIVE_BAR = -.3, DIVE_UNTIL = 16;

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
const flightEnvironment = { terrainHeight, terrainSkimming: SKIM_ASSIST, thermals: [THERMAL], wind, thermalCeiling: 1500, thermalFadeStart: 1150 };
flightEnvironment.skimClearance = state => getSkimClearance(state, flightEnvironment);
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
function beginRound(start) { roundClock = 0; scrapes = 0; recorder.begin({ start, model: MODEL, assist: SKIM_ASSIST, wind: { speed: +wind.meanSpeed.toFixed(1), fromDeg: Math.round(bearingFromDirection(wind.meanDirection)), variability: wind.variability }, tuning: tuningDiff() }); updateRecorderPanel(); }
function tuningDiff() { const t = getSoaringTuning(), d = {}; for (const k of Object.keys(SOARING_DEFAULTS)) if (t[k] !== SOARING_DEFAULTS[k]) d[k] = t[k]; return d; }
function markMoment() { const where = recorder.mark(); toast(where ? 'Moment marked' : 'Nothing to mark yet', 1.2); updateRecorderPanel(); }
function updateRecorderPanel() { const list = recorder.list(), el = $('recorderStatus'); if (!el) return; el.textContent = `${list.length} round${list.length === 1 ? '' : 's'} kept here${flightsServerOk === true ? ', saved for review' : flightsServerOk === false ? ', server not saving: use Download' : ''}`; }
const streaks = createSpeedStreaks(THREE, scene), audio = createAudio();
const cues = createLandingCues(THREE, scene, { onFlareCue() { audio.emit('tip'); } });
const pos = new THREE.Vector3();
let soaring = createSoaringState(), mode = 'ready', heading = LAUNCH.heading, pitch = 0, bank = 0, speed = 0, verticalSpeed = 0;
let elapsed = 0, last = performance.now(), rounds = 0, best = Number(localStorage.getItem('above-micro-best') || 0), result = null, toastUntil = 0;
let distanceFlown = 0, maxSpeed = 0, edgeTurning = false, pilotUpright = 0, settle = 0, pilotShift = 0, takeoff = null, runUp = null, rigSnap = true, launchSite = 'ramp';
const footBox = new THREE.Box3(), footWorld = new THREE.Vector3();
let runOut = null, impact = 0;
const dust = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#c9bb94', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.userData.noShadow = true; scene.add(m); return { m, t: 9, vx: 0, vz: 0 }; });
function kickDust(x, y, z, n) { let k = 0; for (const d of dust) { if (k >= n) break; if (d.t < 1) continue; const a = Math.random() * 6.28, r = .4 + Math.random() * 1.2; d.t = 0; d.vx = Math.cos(a) * r; d.vz = Math.sin(a) * r; d.m.position.set(x, y + .25, z); d.m.visible = true; k++; } }
function updateFeel(dt) {
  for (const d of dust) { if (d.t >= 1) continue; d.t += dt / 1.3; d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt; d.m.position.y += .35 * dt; d.m.scale.setScalar(.3 + d.t * 1.5); d.m.material.opacity = .4 * (1 - d.t) * (1 - d.t); if (d.t >= 1) d.m.visible = false; }
  if (runOut) { const r = runOut; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), v = r.v * (1 - k) * (1 - k); pos.x += r.dx * v * dt; pos.z += r.dz * v * dt; pos.y = terrainHeight(pos.x, pos.z) + 2.4; speed = v; if (v > 1.5 && Math.random() < dt * 9) kickDust(pos.x, pos.y - 2.4, pos.z, 1);
    if (k >= 1) { runOut = null; speed = 0; showCard(result); } }
  impact = Math.max(0, impact - dt * 2.4);
}

function standAtCliff() { standAt(LAUNCH.x, LAUNCH.z, LAUNCH.heading); launchSite = 'cliff'; pos.set(CLIFF.x, CLIFF.y, CLIFF.z); soaring = createSoaringState({ x: pos.x, y: pos.y, z: pos.z, heading }); snapCamera(); }
function standAtSite() { if (launchSite === 'cliff') standAtCliff(); else standAt(LAUNCH.x, LAUNCH.z, LAUNCH.heading); }
function standAt(x, z, h) { tumble = wreck = null; launchSite = 'ramp'; runOut = null; takeoff = null; runUp = null; rigSnap = true; recorder.end({ outcome: 'abandoned' }); pos.set(x, deckY(z - RUN_DIST) + 2.3, z - RUN_DIST); heading = h; pitch = .05; bank = 0; speed = verticalSpeed = 0; mode = 'ready'; soaring = createSoaringState({ x, y: pos.y, z: pos.z, heading }); snapCamera(); }
function launch() {
  if (reloadIfStale()) return;
  if (runOut || runUp) return;
  if (mode === 'gliding') return;
  if (mode === 'landed' || mode === 'crashed') standAtSite();
  hideCard(); runUp = { t: 0, launch: createLaunch() };
}
/**
 * The launch (src/launch.js): the wing is picked up, balanced and run with until it flies or the ground ends, then the flight takes
 * over from the wing's own place and speed. Off the edge below flying speed it dives for its airspeed. A crosswind that lifts a
 * wing ends the launch.
 */
function stepRunUp(dt) {
  if (mode !== 'ready') { runUp = null; return; }
  const s = runUp.launch, cliff = launchSite === 'cliff', slope = cliff ? 0 : DECK_FALL; runUp.t += dt;
  // Where the ground ends along the way the pilot is running: the lip (or the cliff edge) ahead, or a side of the deck.
  const fx = Math.sin(heading), fz = Math.cos(heading), toLip = fz > .05 ? ((cliff ? CLIFF.edge - .5 : LAUNCH.z + DECK_LIP) - pos.z) / fz : Infinity;
  const toSide = cliff || Math.abs(fx) < 1e-3 ? Infinity : ((fx > 0 ? LAUNCH.x + 3.4 : LAUNCH.x - 3.4) - pos.x) / fx, edgeAhead = Math.max(0, Math.min(toLip, toSide));
  const airLift = sampleSoaringAir(pos.x, pos.y, pos.z, flightEnvironment).lift, run = windOnRun(wind, heading);
  const p = gamepad.state, held = (a, b) => (keys.has(a) || keys.has(b) ? 1 : 0);
  const moved = stepLaunch(s, dt, { ...run, slope, edgeAhead, airLift, x: pos.x, y: pos.y, z: pos.z, heading, manual: REAL_LAUNCH, nose: clamp(held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp') + padAxis(p.ly), -1, 1), balance: clamp(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft') + p.lx, -1, 1), push: keys.has('ShiftLeft') || trigger(p.rt) > .3 ? 1 : 0, go: !!s.go, jump: !!runUp.jump }); runUp.jump = false;
  pos.x += Math.sin(heading) * moved; pos.z += Math.cos(heading) * moved; heading += (s.turnRate || 0) * dt; speed = s.airspeed; pos.y = (cliff ? CLIFF.ground : deckLine(pos.z)) + 2.3;
  if ((s.warn || s.noseWarn) && REAL_LAUNCH && (runUp.warnAt ?? -9) < runUp.t - 1.5) { runUp.warnAt = runUp.t; toast(s.warn ? 'The wing is going over: shift your weight with ' + (s.warn > 0 ? 'D' : 'A') : 'Nose too high: ease it down with W', 1.4); }
  if (s.failed) {   // it went wrong: the glider and pilot carry on as a body, from exactly this state, until they come to rest
    const pose = launchPose(s, rig?.step ?? 0); runUp = null; mode = 'tumbling';
    const o = shoulderPivot(pose.pitch, heading + pose.yaw, pose.roll, pose.shoulders);
    tumble = createTumble({ x: pos.x + o[0], y: (cliff ? CLIFF.ground : deckLine(pos.z)) + pose.height + o[1], z: pos.z + o[2], pitch: pose.pitch, heading: heading + pose.yaw, roll: pose.roll, speed: s.groundSpeed,
      rollRate: s.rollV || 0, yawRate: (s.yawV || 0) + (s.turnRate || 0), ground: groundUnder, wind: { x: wind.x, z: wind.z } });
    return;
  }
  if (!s.airborne) return;
  // The flight carries on from the launch's own state: the same wing, speed, path and angle of attack, nothing handed over.
  const flyingOff = s.reason === 'flying', pose = launchPose(s, rig?.step ?? 0); if (REAL_LAUNCH && s.jumped && !s.cliff) toast(flyingOff ? 'Off: the wing has you' : 'A hop: too early. Pull in for speed', 2.5);
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
  const ground = launchSite === 'cliff' ? CLIFF.ground : deckLine(pos.z), lowest = -pose.height;
  pos.y = ground + 2.3;
  soaring = launchState.flight; soaring.x = pos.x; soaring.y = pos.y; soaring.z = pos.z; soaring.heading = heading; speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0;
  mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; rounds++; beginRound(launchSite === 'cliff' ? 'cliff' : 'launch');
  takeoff = { t: 0, dropped, site: launchSite, launch: launchState, ground, lowest0: lowest, pitch0: pose.pitch, roll0: pose.roll, yaw0: pose.yaw, lean0: pose.lean, run0: pose.run,
    lift0: pose.lift, carry0: pose.carry, shoulders0: pose.shoulders, plant0: pose.plant, ground0: -pose.height / Math.cos(pose.pitch), tilt0: Math.tan(pose.pitch) - (launchSite === 'cliff' ? 0 : DECK_FALL),
    holdBar: dropped ? 0 : launchState.barHold };
}
/** Start in the air over the field: downwind at 110 m, on the downwind side, so the round is only the pattern and the landing. */
function overhead() { if (reloadIfStale()) return; tumble = wreck = null; pilotStand = false;
  runOut = null; takeoff = null; runUp = null; rigSnap = true;
  const d = wind.direction;                                 // start 260 m upwind of the mark, flying downwind past it
  const x = MARK.x - Math.sin(d) * 260, z = MARK.z - Math.cos(d) * 260;
  pos.set(x, terrainHeight(x, z) + 110, z); heading = wrapAngle(d + .35);
  soaring = createSoaringState({ x, y: pos.y, z, heading, airspeed: 22 }); speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0;
  mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; rounds++; beginRound('overhead'); snapCamera();
}
// Xbox-style controller, the same as the game: left stick steers and moves the bar, RT dives, LT pushes out, A launches.
// Its buttons arrive as key events: X (KeyE) starts over the field, D-pad up (KeyR) returns to launch, View (KeyM) toggles the panel.
const padAxis = v => { const a = Math.min(1, Math.abs(v) / .9); return Math.sign(v) * a * (.4 + .6 * a); }, trigger = v => v > .06 ? (v - .06) / .94 : 0;
let padActive = false;
const gamepad = createGamepad({ context: () => 'world', onActive: on => { padActive = on; }, onConnect: () => toast('Controller connected') });
function updateFlight(dt) {
  const p = gamepad.state;
  const turn = clamp((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + p.lx, -1, 1);
  const pitchInput = clamp((keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + padAxis(p.ly + trigger(p.lt) - trigger(p.rt)), -1, 1);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const landable = pitchInput <= .1 || landableAt(pos.x, pos.z) || landableAt(pos.x + fx * 30, pos.z + fz * 30) || landableAt(pos.x + fx * 60, pos.z + fz * 60);
  const groundLandable = pos.y - terrainHeight(pos.x, pos.z) < 14 && landableAt(pos.x, pos.z);
  // Range edge: bank round toward the field instead of flying off the map.
  const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z)) > 1450, steer = edge ? clamp(-wrapAngle(Math.atan2(-pos.x, -pos.z) - heading) * 2.5, -1, 1) : 0;
  if (edge && !edgeTurning) toast('Edge of the range · turning back'); edgeTurning = edge;
  pilotShift = edge ? steer : turn;
  // Through a take-off the pilot flies the wing: off an edge below flying speed the bar comes in for the dive (unless pushed out); off
  // a run it is held out to fly away at the lift-off speed, eased in over the next seconds, until the pilot takes the bar themselves.
  const barInput = takeoff?.dropped && (!REAL_LAUNCH || takeoff.launch?.cliff) ? (pitchInput <= 0 && soaring.airspeed < DIVE_UNTIL ? Math.min(pitchInput, DIVE_BAR) : pitchInput)
    : takeoff && !takeoff.handed && Math.abs(pitchInput) < .05 ? takeoff.holdBar * (REAL_LAUNCH ? 1 : 1 - smooth(2, 7, takeoff.t)) : pitchInput;
  if (takeoff && Math.abs(pitchInput) >= .05) takeoff.handed = true;   // (a realistic launch keeps the bar where the pilot held it until they move it)
  stepSoaring(soaring, { stand: pilotStand, roll: edge ? steer : turn, pitch: barInput, landable, ground: groundLandable }, dt, flightEnvironment);
  updateSkimPose(soaring, dt, flightEnvironment);
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
    if (MODEL === 'force' && scrapeGround(soaring, { verticalSpeed: contact, groundSpeed, slope, bank }, ground)) {
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
  if (!contact.settled && scoreLanding(contact, MARK).judged === 'crash') { tumbleFromFlight(); return; }
  result = scoreLanding(contact, MARK);
  if (result.judged === 'crash') audio.emit('crash', { severity: clamp(contact.verticalSpeed / 7, .25, 1), kind: 'terrain' }); else audio.emit('touchdown', { speed: contact.airspeed, contact: contact.verticalSpeed, soft: result.judged === 'soft' });
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

/* ---------- camera: the game's chase camera (critically damped springs behind the flight path) ---------- */
const chaseOffset = new THREE.Vector3(), chaseOffsetVel = new THREE.Vector3(), chaseAim = new THREE.Vector3(), chaseAimVel = new THREE.Vector3();
const wantOffset = new THREE.Vector3(), wantAim = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0), target = new THREE.Vector3();
let chaseLive = false;
function spring3(value, velocity, want, omega, dt) { for (const k of ['x', 'y', 'z']) { const e = value[k] - want[k], c = velocity[k] + omega * e, d = Math.exp(-omega * dt); value[k] = want[k] + (e + c * dt) * d; velocity[k] = (velocity[k] - omega * c * dt) * d; } }
function snapCamera() { chaseLive = false; updateCamera(1 / 60, true); }
const sideCam = new THREE.Vector3(), launchCam = new THREE.Vector3(); let launchCamLive = false;
function updateCamera(dt, snap = false) {
  const flying = mode === 'gliding', path = flying ? soaring.pathAngle || 0 : 0;
  const gv = clamp(path, -.75, .5) * .85, cg = Math.cos(gv), dx = Math.sin(heading) * cg, dy = Math.sin(gv), dz = Math.cos(heading) * cg, sx = -Math.cos(heading), sz = Math.sin(heading);
  // (near the ground the camera comes down and in, so the height reads against the horizon)
  const lowView = flying ? 1 - smooth(4, 22, pos.y - terrainHeight(pos.x, pos.z)) : 0;
  const back = flying ? (10.5 + speed * .05) * (1 - .15 * lowView) : 11, rise = flying ? 3.9 - 2.2 * lowView : 3.4, ahead = 55;
  wantOffset.set(-dx * back - sx * bank * 6, -dy * back + rise, -dz * back - sz * bank * 6);
  const floor = Math.max(terrainHeight(pos.x + wantOffset.x, pos.z + wantOffset.z) + 4, terrainHeight(pos.x + wantOffset.x * .5, pos.z + wantOffset.z * .5) + 3) - pos.y;
  if (wantOffset.y < floor) wantOffset.y = floor;
  wantAim.set(dx * ahead + sx * bank * 14, dy * ahead - 6, dz * ahead + sz * bank * 14);
  if (snap || !chaseLive) { chaseOffset.copy(wantOffset); chaseAim.copy(wantAim); chaseOffsetVel.set(0, 0, 0); chaseAimVel.set(0, 0, 0); chaseLive = true; }
  else { spring3(chaseOffset, chaseOffsetVel, wantOffset, 3.2, dt); spring3(chaseAim, chaseAimVel, wantAim, 4.5, dt); }
  camera.position.set(pos.x + chaseOffset.x, Math.max(pos.y + chaseOffset.y, terrainHeight(pos.x + chaseOffset.x, pos.z + chaseOffset.z) + 1.5), pos.z + chaseOffset.z);
  target.set(pos.x + chaseAim.x, pos.y + chaseAim.y, pos.z + chaseAim.z);
  // A launch is watched from beside it, a little ahead, where the pickup, the strides and the nose can be seen; the view lags a
  // little, so the acceleration shows, and the chase view comes back once the wing is away.
  const launchView = mode === 'ready' || runUp ? 1 : takeoff ? 1 - smooth(1.4, 2.8, takeoff.t) : 0;
  if (launchView > 0) {
    // (on a snap the drawn position is stale, so the view is placed from the flight position instead)
    const p = player.position, fresh = !snap && launchCamLive; sideCam.set(pos.x - 9, (fresh ? p.y : pos.y - 2.1) + 1.1, pos.z + 4.5);
    if (!fresh) { launchCam.copy(sideCam); launchCamLive = true; } else launchCam.lerp(sideCam, 1 - Math.exp(-dt * 4));
    camera.position.lerp(launchCam, launchView); target.lerp(sideCam.set(p.x, p.y - .3, p.z + .8), launchView);
  } else launchCamLive = false;
  camUp.set(sx * bank * .12, 1, sz * bank * .12); camera.up.lerp(camUp, 1 - Math.exp(-dt * 5)).normalize(); camera.lookAt(target);
  camera.fov = lerp(camera.fov, flying ? 58 + speed * .22 : 50, snap ? 1 : 1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix();
  if (impact > .005) { const rt = performance.now() / 1000, q = impact * impact; camera.position.y -= q * .9; camera.rotateX((Math.sin(rt * 37) + Math.sin(rt * 23)) * q * .014 + q * .05); camera.rotateZ(Math.sin(rt * 31) * q * .012); }
  // The same high-speed buzz as the game, so speed reads in the view as well as on the numbers.
  if (flying) { const buzz = clamp((speed - 26) / 18, 0, 1) * .05 * (1 + (pos.y - terrainHeight(pos.x, pos.z) < 30 ? 1.5 : 0)), rt = performance.now() / 1000; if (buzz > .001) { camera.rotateX((Math.sin(rt * 47) + Math.sin(rt * 29)) * buzz * .01); camera.rotateY((Math.sin(rt * 41) + Math.sin(rt * 23)) * buzz * .01); } }
}

/* ---------- HUD, cards and panel ---------- */
function toast(text, seconds = 2.5) { $('toast').textContent = text; $('toast').classList.add('on'); toastUntil = elapsed + seconds; }
function hideCard() { $('card').classList.remove('on', 'crash'); }
function showCard(r) {
  const card = $('card'), crash = r.judged === 'crash', c = r.contact;
  const title = crash ? 'CRASHED' : r.noStep && r.stars === 3 ? 'NO-STEPPER · NAILED IT' : r.noStep ? 'NO-STEPPER' : r.stars === 3 ? 'NAILED IT' : r.stars === 2 ? 'GOOD LANDING' : r.judged === 'rough' ? 'ROUGH LANDING' : 'LANDED';
  const f = c.flare, flareLine = !f?.pressed ? 'none · the wing mushed on' : `S at ${f.feet.toFixed(1)} m and ${(f.ratio * 100).toFixed(0)}% of stall speed` + (r.notes.includes('Flared too early') ? ' · too early, it ballooned' : r.notes.includes('Flared late') ? ' · late' : r.noStep ? ' · perfect' : ' · good');
  const stars = [1, 2, 3].map(i => `<span class="${i <= r.stars ? '' : 'off'}">★</span>`).join('');
  const windLine = r.windSpeed < 1.5 ? 'calm air' : `${r.headwind >= 0 ? 'headwind' : 'tailwind'} ${Math.abs(r.headwind).toFixed(1)} m/s · wind ${describeWind(wind)}`;
  const why = crash ? r.headwind < -SOARING_DEFAULTS.tailwindFree && c.verticalSpeed < SOARING_DEFAULTS.softTouchdown.vertical ? `Too fast to run it out: a ${(-r.headwind).toFixed(1)} m/s tailwind made it ${(c.groundSpeed * 3.6).toFixed(0)} km/h over the ground.` : (Math.abs(c.bank) > SOARING_DEFAULTS.maxTouchdownBank ? 'Wings not level at touchdown.' : c.verticalSpeed >= 2.8 && c.groundSpeed >= 10.5 ? 'Too fast and sinking too hard: slow down into the wind and push out low.' : c.verticalSpeed >= 3.6 ? 'Dropped in from too high: you stalled above the ground. Start holding S lower, at about 3 m.' : c.groundSpeed >= 19 ? 'Far too fast over the ground: bleed off speed, land into the wind.' : 'Too steep a slope to land on.') : '';
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
    <p>${why}${tip}</p><p>Space · launch again &nbsp;·&nbsp; C · other launch &nbsp;·&nbsp; 1 · start over the field</p>`;
}
function updateBest() { $('best').textContent = `Best round: ${best ? best + ' pts' : '—'} · rounds flown ${rounds}`; }
function updateHud() {
  const agl = pos.y - terrainHeight(pos.x, pos.z), flying = mode === 'gliding';
  $('speed').textContent = Math.round(speed * 3.6);
  $('vario').textContent = (verticalSpeed >= 0 ? '+' : '') + verticalSpeed.toFixed(1); $('varioBox').className = 'vario ' + (verticalSpeed > .4 ? 'up' : verticalSpeed < -2.5 ? 'down' : '');
  $('agl').textContent = Math.max(0, Math.round(agl - 2.3)); $('dist').textContent = Math.round(Math.hypot(pos.x - MARK.x, pos.z - MARK.z));
  $('alpha').textContent = flying ? ((soaring.alpha || 0) / DEG).toFixed(0) + '°' + (soaring.stalled ? ' stall' : '') : '—';
  // (a stall in the last few metres is the flare, not a mistake)
  const warn = flying && soaring.pullUp ? 'PULL UP' : flying && agl > 8 && soaring.stalled ? 'STALL · LOWER THE NOSE' : flying && agl > 8 && soaring.stallWarning ? 'STALL WARNING' : '';
  $('warn').textContent = warn; $('warn').classList.toggle('on', !!warn);
  $('hints').innerHTML = padActive ? (flying ? '<b>B</b>mark this moment <b>RT</b>dive <b>LT</b>push out · on final hold it from about 3 m <b>LS</b>steer <b>D-pad ↑</b>back to launch <b>View</b>panel' : '<b>A</b>launch from the ridge <b>X</b>start over the field <b>View</b>panel') : flying ? '<b>Space</b>' + (pilotStand ? 'go prone' : 'sit up (slow down)') + ' <b>N</b>mark this moment <b>W</b>pull in (dive) <b>S</b>push out · on final hold it from about 3 m <b>A</b><b>D</b>weight shift <b>R</b>back to launch <b>Tab</b>panel' : runUp && REAL_LAUNCH ? (runUp.launch.phase === 'run' ? '<b>A</b><b>D</b>balance the wing <b>W</b><b>S</b>nose <b>Space</b>jump off as it lifts, or off the edge' : '<b>A</b><b>D</b>balance the wing <b>W</b><b>S</b>nose down / up <b>Space</b>' + (launchSite === 'cliff' ? 'step out and jump' : 'start the run')) : (launchSite === 'cliff' ? '<b>Space</b>pick up and step off the cliff <b>C</b>go to the ramp' : '<b>Space</b>pick up and run down the ramp <b>C</b>go to the cliff') + ' <b>1</b>start over the field <b>Tab</b>panel';
  $('windNow').innerHTML = `${wind.speed.toFixed(1)} m/s from the ${compassName(wind.from)} <small>(mean ${wind.meanSpeed.toFixed(1)} m/s from ${Math.round(bearingFromDirection(wind.meanDirection))}°)</small>`;
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
function syncTunePanel() { const t = getSoaringTuning(); for (const input of tuneInputs) { const key = input.dataset.tune, deg = !!input.dataset.deg, v = deg ? t[key] / DEG : t[key]; input.value = v; $('t-' + key).textContent = deg ? (Math.round(v * 10) / 10) + '°' : key === 'cd0' ? Number(v).toFixed(3) : Number(v).toFixed(1); } }
for (const input of tuneInputs) input.addEventListener('input', () => { const key = input.dataset.tune, v = Number(input.value); tuneSoaring({ [key]: input.dataset.deg ? v * DEG : v }); syncTunePanel(); });
$('tuneReset').addEventListener('click', () => { tuneSoaring(); syncTunePanel(); toast('Defaults restored'); });
$('tuneCopy').addEventListener('click', () => { const t = getSoaringTuning(), diff = {}; for (const k of Object.keys(SOARING_DEFAULTS)) if (t[k] !== SOARING_DEFAULTS[k]) diff[k] = t[k]; navigator.clipboard?.writeText(JSON.stringify(diff)); toast(Object.keys(diff).length ? 'Copied: ' + JSON.stringify(diff) : 'Nothing changed from the defaults', 4); });
$('btnLaunch').addEventListener('click', () => { standAt(LAUNCH.x, LAUNCH.z, LAUNCH.heading); launch(); $('world').focus(); });
$('btnCliff').addEventListener('click', () => { standAtCliff(); launch(); $('world').focus(); });
$('btnOverhead').addEventListener('click', () => { overhead(); $('world').focus(); });
$('btnMark').addEventListener('click', () => { markMoment(); $('world').focus(); });
$('btnFlights').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(recorder.list())], { type: 'application/json' })); a.download = 'above-flights.json'; a.click(); URL.revokeObjectURL(a.href); });
addEventListener('pagehide', () => recorder.end({ outcome: 'abandoned' }));
updateRecorderPanel();
for (const el of [windSpeed, windDir, windVar, ...tuneInputs]) el.addEventListener('keydown', e => e.stopPropagation());

addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); $('panel').classList.toggle('hidden'); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  audio.unlock(); if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space' || e.code === 'Enter') { if (runUp) { const s = runUp.launch; if (s.phase === 'balance') s.go = true; else if (s.phase === 'run') runUp.jump = true; } else if (mode === 'gliding') { pilotStand = !pilotStand; if (takeoff) takeoff.ownStance = true; } else launch(); }
  if (e.code === 'Digit1' || e.code === 'KeyE') overhead();
  if (e.code === 'KeyM') $('panel').classList.toggle('hidden');
  if (e.code === 'KeyN' && !e.repeat) markMoment();
  if (e.code === 'KeyR') { standAtSite(); hideCard(); }
  if (e.code === 'KeyC' && mode !== 'gliding' && !runOut) { hideCard(); if (launchSite === 'cliff') standAt(LAUNCH.x, LAUNCH.z, LAUNCH.heading); else standAtCliff(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ---------- frame ---------- */
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now; elapsed += dt;
  gamepad.poll();
  wind.update(dt);
  if (runUp) stepRunUp(dt);
  if (tumble) {
    stepTumble(tumble, dt); pos.set(tumble.x, tumble.y + 1.3, tumble.z); speed = Math.hypot(tumble.v[0], tumble.v[2]); verticalSpeed = tumble.v[1];
    if (tumble.impact > 2.5 && !tumble.felt) { tumble.felt = true; impact = Math.max(impact, clamp(tumble.impact / 7, .3, .9)); audio.emit('crash', { severity: clamp(tumble.impact / 8, .25, 1), kind: 'terrain' }); }
    if (tumble.done) { wreck = tumble; tumble = null; if (!wreck.inRound) beginRound(launchSite === 'cliff' ? 'cliff' : 'launch');
      touchdown({ settled: true, verticalSpeed: Math.max(6, wreck.impact), groundSpeed: wreck.speed0, slope: 0, bank: 0, heading, airspeed: wreck.speed0, wind: { x: wind.x, z: wind.z }, x: pos.x, z: pos.z, flare: { pressed: false } }); }
  }
  if (mode === 'gliding') updateFlight(dt);
  updateFeel(dt);
  // On the ground the wing is set down: the pilot stands with the nose up and the keel resting on the ground.
  const grounded = mode === 'landed' || mode === 'crashed';
  settle = grounded ? Math.min(1, settle + dt / 0.8) : 0;
  const eased = settle * settle * (3 - 2 * settle);
  const flying = mode === 'gliding';
  if (takeoff) { takeoff.t += dt; if (takeoff.t > 8 || !flying) takeoff = null; }
  // The pilot goes prone once the wing is flying (or as they pull in to dive for it).
  if (takeoff && takeoff.proneAt == null && (takeoff.launch?.cliff || soaring.airspeed >= 1.05 * stallSpeed(0) || (soaring.bar || 0) < -.25)) takeoff.proneAt = takeoff.t;
  const tk = takeoff?.t ?? 9, standing = mode === 'ready';
  // The launch (src/launch.js): the wing is picked up off the ground, balanced on the shoulders and run with until it flies or the
  // ground falls away; from there the flight carries it and the pilot folds up into the pod. Off an edge below flying speed the
  // pilot goes straight down prone on the bar for the dive, and eases back as the wing gets its airspeed.
  const launching = runUp?.launch ?? (standing ? REST : null), pose = launching ? launchPose(launching, rig?.step ?? 0) : null;
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
  const siteGround = launchSite === 'cliff' ? CLIFF.ground : deckLine(pos.z), groundHere = terrainHeight(pos.x, pos.z);
  if (pose) { player.position.y = siteGround + pose.height; player.rotation.set(pose.pitch, heading + pose.yaw, pose.roll, 'YXZ'); const o = shoulderPivot(pose.pitch, heading + pose.yaw, pose.roll, pose.shoulders); player.position.x += o[0]; player.position.y += o[1]; player.position.z += o[2]; }
  else {
    const contactLowest = takeoff ? lerp(takeoff.lowest0, rig?.lowest ?? -.65, smooth(2, 8, tk)) : rig?.lowest ?? -.65;
    // How near the ground the model is drawn as being: for the first seconds after a take-off against the ground it left, blending
    // to the terrain under it. The blend is of the nearness itself, never of the two ground heights, so a deck high over a valley
    // does not sweep the drawn wing up through the whole offset in a second.
    const near = g => { const t = clamp(1 - (pos.y - g - 2.3) / 10, 0, 1); return t * t * (3 - 2 * t); };
    const closeness = takeoff ? lerp(near(takeoff.ground), near(groundHere), smooth(2, 8, tk)) : near(groundHere);
    player.position.y -= (flying || grounded) ? (rig ? 2.3 + contactLowest : 1.65) * closeness : 0;
    pivotHeld = takeoff ? (takeoff.shoulders0 ?? 0) * (1 - smooth(0, .5, tk)) : 0;
    player.rotation.set(grounded ? lerp(-pitch, -0.2, eased) : takeoff ? lerp(takeoff.pitch0, -pitch, smooth(0, dropped ? .6 : 1, tk)) : -pitch, heading + (takeoff ? (takeoff.yaw0 ?? 0) * (1 - smooth(0, 1.2, tk)) : 0), grounded ? bank * (1 - eased) : takeoff ? lerp(takeoff.roll0, soaring.visualBank ?? bank, smooth(0, 1, tk)) : flying ? soaring.visualBank ?? bank : bank, 'YXZ');
  }
  if (pivotHeld && !pose) { const r = player.rotation, o = shoulderPivot(r.x, r.y, r.z, pivotHeld); player.position.x += o[0]; player.position.y += o[1]; player.position.z += o[2]; }   // (the wing leaves the shoulders over half a second)
  pivotHeld = 0;
  if (mode === 'landed') player.position.y = lerp(player.position.y, groundHere + WING_CARRY, eased);
  // A wreck is drawn where the physics has it.
  const body = tumble || (mode === 'crashed' ? wreck : null);
  if (body) { player.position.set(body.x, body.y, body.z); player.quaternion.set(body.q[0], body.q[1], body.q[2], body.q[3]); }
  if (rig) {
    const rx = player.rotation.x;
    // On the ground the body moves under the wing to keep the feet planted, so a stride never moves the wing, and leans into the straps as they pull.
    if (pose) rig.update(dt, { upright: 1, level: -rx, shoulders: pose.shoulders, shift: pose.shift, standRoll: -pose.roll, standYaw: -pose.yaw, run: pose.run, lift: pose.lift, carry: pose.carry, grip: pose.grip, lean: pose.lean - rx, speed: launching.groundSpeed, ground: (siteGround - player.position.y) / Math.cos(rx), tilt: Math.tan(rx) - (launchSite === 'cliff' ? 0 : DECK_FALL), plant: pose.plant }, rigSnap);
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
  indicators.update(wind, elapsed, camera.position);
  birds.forEach((b, i) => { const a = elapsed * (.12 + i * .01) + i * 1.9, r = 60 + i * 11; b.position.set(THERMAL.x + Math.cos(a) * r, terrainHeight(THERMAL.x, THERMAL.z) + 170 + i * 22 + Math.sin(a * 2) * 6, THERMAL.z + Math.sin(a) * r); b.rotation.set(0, -a, -.2); });
  sun.target.position.set(pos.x, pos.y, pos.z); sun.position.set(pos.x - 900, pos.y + 1300, pos.z + 700);
  updateHud();
  { const f = mode === 'gliding', g = terrainHeight(pos.x, pos.z); cues.update({ flying: f, x: pos.x, z: pos.z, ground: g, feet: pos.y - g - 2.3, speedRatio: speed / stallSpeed(0), bar: soaring.bar || 0, sink: -verticalSpeed, landable: slopeAt(pos.x, pos.z) < .42, speed, dropToImpact: f && verticalSpeed < -3 ? dropToImpact({ x: pos.x, feetY: pos.y - 2.3, z: pos.z, vx: Math.sin(heading) * Math.cos(soaring.pathAngle || 0) * speed + (soaring.windX || 0), vy: verticalSpeed, vz: Math.cos(heading) * Math.cos(soaring.pathAngle || 0) * speed + (soaring.windZ || 0), terrainHeight }) : null }); }
  { const flying = mode === 'gliding', cg = Math.cos(soaring.pathAngle || 0); streaks.update(camera.position, { x: Math.sin(heading) * cg, y: Math.sin(soaring.pathAngle || 0), z: Math.cos(heading) * cg }, flying ? speed : 0, dt);
    audio.update({ mode: flying ? 'gliding' : 'foot', paused: false, speed, verticalSpeed, lift: flying ? soaring.lift : 0, thermalLift: flying ? soaring.thermalLift : 0, ridgeLift: flying ? soaring.ridgeLift : 0, clearance: pos.y - terrainHeight(pos.x, pos.z), skim: flying ? clamp(soaring.skimAssist || 0, 0, 1) : 0, stalled: flying && !!soaring.stalled, stallWarning: flying && !!soaring.stallWarning, pullUp: flying && !!soaring.pullUp, bank, walking: false, sprinting: false, biome: 'alpine', nearSea: 0, altitude: pos.y }, dt); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
standAt(LAUNCH.x, LAUNCH.z, LAUNCH.heading); syncWindPanel(); syncTunePanel(); updateBest();
{ const other = new URLSearchParams(location.search); if (MODEL === 'original') other.delete('model'); else other.set('model', 'original'); const q = other.toString();
  $('modelName').textContent = MODEL === 'original' ? 'Original physics' : 'Force model'; $('modelSwitch').textContent = MODEL === 'original' ? 'Switch to force model' : 'Switch to original physics'; $('modelSwitch').href = location.pathname + (q ? '?' + q : '');
  $('feelSection').hidden = MODEL === 'original'; }
{ const other = new URLSearchParams(location.search); if (SKIM_ASSIST) other.delete('assist'); else other.set('assist', 'on'); const q = other.toString();
  $('assistName').textContent = SKIM_ASSIST ? 'Skim assist on' : 'Skim assist off'; $('assistSwitch').textContent = SKIM_ASSIST ? 'Turn skim assist off' : 'Turn skim assist on'; $('assistSwitch').href = location.pathname + (q ? '?' + q : ''); $('assistSwitch').parentElement.hidden = MODEL === 'original'; }
{ const other = new URLSearchParams(location.search); if (REAL_LAUNCH) other.delete('launch'); else other.set('launch', 'real'); const q = other.toString();
  $('launchName').textContent = REAL_LAUNCH ? 'Realistic launch: you balance, run and jump' : 'Easy launch: it runs itself'; $('launchSwitch').textContent = REAL_LAUNCH ? 'Switch to easy launches' : 'Switch to realistic launches'; $('launchSwitch').href = location.pathname + (q ? '?' + q : ''); }
$('loading').hidden = true; $('world').focus();
window.rangeDemo = window.microDemo = { pad: gamepad.state, model: MODEL, get rig() { return rig; }, camera, player, scene, renderer, deckY, get soaring() { return soaring; }, get launchSite() { return launchSite; }, get takeoff() { return takeoff; }, get runUp() { return runUp; }, get tumble() { return tumble; }, get wreck() { return wreck; }, standAtCliff, CLIFF, measure() { player.updateMatrixWorld(true); const g = terrainHeight(pos.x, pos.z), pb = new THREE.Box3().setFromObject(pilot), wb = new THREE.Box3().setFromObject(wing); return { mode, bodyAboveGround: +(pos.y - g).toFixed(2), pilotLowAboveGround: +(pb.min.y - g).toFixed(2), wingLowAboveGround: +(wb.min.y - g).toFixed(2), pilotLowBelowBody: +(pos.y - pb.min.y).toFixed(2), wingLowBelowBody: +(pos.y - wb.min.y).toFixed(2), upright: +pilotUpright.toFixed(2) }; }, startAt({ x, z, agl = 12, heading: h = 0, kmh = 0, pathDeg = 0 }) { tumble = wreck = null; pilotStand = false; runOut = null; takeoff = null; rigSnap = true; pos.set(x, terrainHeight(x, z) + agl, z); heading = h; soaring = createSoaringState({ x, y: pos.y, z, heading: h }); if (kmh) { soaring.airspeed = kmh / 3.6; soaring.pathAngle = pathDeg * Math.PI / 180; soaring.verticalSpeed = soaring.airspeed * Math.sin(soaring.pathAngle); soaring.alpha = -1.5 * Math.PI / 180; } speed = soaring.airspeed; verticalSpeed = soaring.verticalSpeed; pitch = bank = 0; mode = 'gliding'; result = null; hideCard(); distanceFlown = 0; maxSpeed = 0; beginRound('final'); snapCamera(); }, recorder, getState: () => ({ mode, position: pos.toArray(), speed, heading, bank, verticalSpeed, airspeed: soaring.airspeed, pathAngle: soaring.pathAngle, clearance: pos.y - terrainHeight(pos.x, pos.z), wind: { x: wind.x, z: wind.z, speed: wind.speed }, result, rounds, best }), setKey: (code, down) => down ? keys.add(code) : keys.delete(code), launch, overhead, wind, tune: tuneSoaring, terrainHeight, MARK, LAUNCH };
requestAnimationFrame(frame);
