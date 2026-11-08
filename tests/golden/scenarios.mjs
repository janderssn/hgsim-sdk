/**
 * Golden scenarios: fixed scripts flown through the SDK, sampled into plain numbers. tests/golden/golden.json holds what the
 * physics produced when it was recorded; tests/golden.test.mjs flies them again and requires the same numbers. A refactor that
 * changes the physics shows up here, field by field. To re-record after an intended change of the physics:
 *   node tests/golden/record.mjs
 * `api` adapts the scenarios to the API under test (see adapter.mjs).
 */
const DEG = Math.PI / 180;
const hill = (x, z) => 80 * Math.exp(-((x - 40) ** 2 + (z - 400) ** 2) / (2 * 180 ** 2)) + 0.02 * z;
const FLIGHT_KEYS = ['x', 'y', 'z', 'heading', 'bank', 'pitch', 'airspeed', 'pathAngle', 'alpha', 'bar', 'verticalSpeed', 'loadFactor', 'lift',
  'thermalLift', 'ridgeLift', 'groundSpeed', 'stalled', 'upright', 'flarePressed', 'flareFeet', 'flareBalloon', 'skimAssist', 'skimBlend', 'pullUp', 'pullUpTurn'];
const LAUNCH_KEYS = ['phase', 't', 'distance', 'groundSpeed', 'airspeed', 'lift', 'tension', 'normal', 'roll', 'yaw', 'side', 'airborne', 'reason', 'failed', 'barHold', 'alphaHold', 'turnRate'];
const TUMBLE_KEYS = ['x', 'y', 'z', 'impact', 'done', 't'];
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, num(o[k])]));
const num = v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(12) : String(v)) : v ?? null;

function flight(api, { config, init, env, seconds, input, every = 30, skimPose = false }) {
  const g = api.glider({ config, init, env }), out = [];
  for (let i = 0; i < seconds * 60; i++) {
    g.step(input(i / 60, g.state), 1 / 60);
    if (skimPose) g.skimPose(1 / 60);
    if (i % every === every - 1) out.push(pick(g.state, skimPose ? [...FLIGHT_KEYS, 'visualBank'] : FLIGHT_KEYS));
  }
  return out;
}

function launch(api, { config, setup, conditions, seconds = 20, every = 15 }) {
  const l = api.launch({ config }), out = [];
  setup?.(l.state);
  for (let i = 0; i < seconds * 60 && !l.state.airborne && !l.state.failed; i++) {
    const c = conditions(i / 60, l.state);
    l.step(c, 1 / 60);
    if (i % every === 0) out.push(pick(l.state, LAUNCH_KEYS));
  }
  out.push(pick(l.state, LAUNCH_KEYS), pick(l.state.flight, FLIGHT_KEYS), pick(l.pose(0.7), ['height', 'pitch', 'roll', 'lean', 'lift', 'carry', 'shoulders', 'pathAngle']));
  return out;
}

export function scenarios(api) {
  const still = { terrain: () => 0, wind: { x: 0, z: 0 } };
  const breezy = { terrain: hill, wind: { x: 1.2, z: -4 }, thermals: [{ x: 60, z: 300, radius: 120, strength: 3 }], thermalCeiling: 1500, thermalFadeStart: 1150 };
  const r = {};
  r.handsOff = flight(api, { env: { terrain: () => 0, wind: { x: 0, z: -3 } }, init: { x: 0, y: 60, z: 0, heading: 0 }, seconds: 50, input: () => ({}) });
  r.manoeuvres = flight(api, { env: breezy, init: { x: 0, y: 220, z: 0, heading: 0.2 }, seconds: 60,
    input: t => ({ roll: Math.sin(t * .7) * .8, pitch: t < 10 ? -1 : t < 14 ? 1 : Math.sin(t * .5) * .6, stand: t > 50 && t < 55 }) });
  r.landing = flight(api, { env: { ...still, wind: { x: 0, z: -2.5 } }, init: { x: 0, y: 12, z: 0, heading: 0, airspeed: 16 }, seconds: 14, every: 10,
    input: (t, s) => ({ pitch: s.y - 2.4 < 3 ? 1 : 0, ground: s.y < 14, landable: true }) });
  r.tuned = flight(api, { config: { cd0: 0.035, mass: 95, liftSlope: 4.4, groundCushion: 0 }, env: breezy, init: { y: 150, heading: -0.4 }, seconds: 30,
    input: t => ({ roll: t > 5 && t < 9 ? -1 : 0, pitch: t > 15 ? .4 : 0 }) });
  r.skimming = flight(api, { env: { terrain: (x, z) => z * 0.18, terrainSkimming: true, skimClearance: 'pose', wind: { x: 0, z: 0 } }, init: { y: 45, airspeed: 30, pathAngle: 0 },
    seconds: 12, every: 12, input: t => ({ pitch: t < 9 ? -1 : 1, roll: t > 6 ? .3 : 0 }), skimPose: true });
  r.classic = api.classic ? flight({ glider: api.classic }, { env: breezy, init: { y: 300 }, seconds: 30, input: t => ({ roll: Math.sin(t) * .5, pitch: t < 8 ? -1 : 0 }) }) : null;

  r.launchEasySlope = launch(api, { conditions: (t, s) => ({ headwind: 4, slope: .15, edgeAhead: 40 - s.distance }) });
  r.launchCalmRamp = launch(api, { conditions: (t, s) => ({ headwind: 0, crosswind: .5, slope: .05, edgeAhead: 18 - s.distance, airLift: .2 }) });
  r.launchManual = launch(api, { conditions: (t, s) => ({ headwind: 5, crosswind: 1, slope: .1, edgeAhead: 60 - s.distance, manual: true,
    balance: Math.max(-1, Math.min(1, -s.roll * 6 - s.rollV)), nose: s.flight.alpha > .2 ? -1 : 0, go: t > 2, jump: s.lift > .9 }) });
  r.launchCliff = launch(api, { setup: s => { s.phase = 'balance'; s.k = 1; s.phaseT = 9; }, conditions: (t, s) => ({ headwind: 3, edgeAhead: 1.2 - s.distance }) });
  r.launchCross = launch(api, { conditions: () => ({ headwind: 1, crosswind: 6, edgeAhead: 60 }) });
  r.launchTuned = launch(api, { config: { mass: 120, wingArea: 16 }, conditions: (t, s) => ({ headwind: 6, slope: .12, edgeAhead: 300 }) });

  const tumble = api.tumble({ x: 0, y: 3, z: 0, pitch: .2, heading: .4, roll: .3, speed: 9, vy: -3, rollRate: 1, yawRate: -.5, ground: (x, z) => 0.05 * x, wind: { x: 1, z: -4 } }), tr = [];
  for (let i = 0; i < 400 && !tumble.done; i++) { api.stepTumble(tumble, 1 / 60); if (i % 20 === 0) tr.push(pick(tumble, TUMBLE_KEYS)); }
  tr.push(pick(tumble, TUMBLE_KEYS), tumble.q.map(num));
  r.tumble = tr;

  const wind = api.wind({ speed: 5, direction: 2.4, variability: 1, gusts: 1, drift: 1, seed: 3 }), wr = [];
  for (let i = 0; i < 200; i++) { wind.update(7.3); if (i % 10 === 0) wr.push([num(wind.x), num(wind.z), num(wind.speed), num(wind.from)]); }
  r.wind = wr;

  const judged = [];
  for (const verticalSpeed of [0, 1.5, 2.5, 4, 6]) for (const groundSpeed of [3, 8, 12, 20]) for (const heading of [0, Math.PI]) {
    judged.push(api.score({ verticalSpeed, groundSpeed, heading, bank: .1, slope: .05, airspeed: groundSpeed, wind: { x: 0, z: -4 }, x: 3, z: 9,
      flare: { pressed: verticalSpeed < 2, feet: 2.8, ratio: 1.2, balloon: 0 } }, { x: 0, z: 0, radius: 60 }));
  }
  r.scores = judged.map(s => [s.judged, s.points, s.stars, s.notes.join('|'), s.ring]);
  r.polar = [];
  for (let v = 8; v <= 30; v += 2.2) r.polar.push(num(api.sinkPolar(v)), num(api.sinkPolar(v, 30 * DEG)));
  r.polar.push(num(api.stallSpeed()), num(api.stallSpeed(.5)), num(api.barTargetSpeed(-1)), num(api.barTargetSpeed(.5)));
  return r;
}
