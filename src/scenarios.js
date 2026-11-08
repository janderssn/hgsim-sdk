/**
 * Scenarios: short, repeatable test flights for tuning how a wing feels, flown by a scripted pilot or by you. Each sets up the
 * world and the start (a launch site and wind, a dive at height, a final approach), flies one thing (a launch, a manoeuvre, a
 * landing) and reports what happened as plain numbers, so the same scenario can be flown on every wing and compared.
 *
 *   import { SCENARIOS, runScenario } from 'hgsim/scenarios.js';
 *   const r = runScenario('dive-hold', { preset: 't2c-144', vg: 1 });   // flown offline at 60 Hz
 *   r.outcome   // 'done', or for a landing 'soft' | 'firm' | 'rough' | 'crash', for a launch 'flying' | 'wingdrop' | ...
 *   r.metrics   // { topSpeed: 150, ... } in km/h, degrees, metres and seconds; r.samples, every 1/20 s
 *
 *   const run = startScenario('ramp-calm', { preset: 'falcon-170', pilot: 'you' });   // live, one frame at a time:
 *   run.step(dt, { roll, pitch, stand, go, jump, push });   // your controls (ignored for a scripted pilot)
 *   run.glider, run.launch, run.site, run.phase ('launch' | 'flight' | 'tumble' | 'done'), run.samples, run.result once run.done
 *
 * Nothing is cut short: a launch that goes wrong, or a crash, is played out as the rigid-body tumble (tumble.js) until the wreck
 * comes to rest (phase 'tumble', samples with the wreck's position and quaternion q). The outcome is what happened when it went
 * wrong; the result comes once the wreck is still.
 *
 * The world of every scenario is one of SITES: a flat field, or a ramp, a cliff or a slope 60 m up on a ridge with the field below.
 * Frame as everywhere in hgsim: x east, y up, z north; every launch and every final heads north (+z), into a wind from the north.
 */
import { createWorld } from './world.js';
import { createGlider } from './glider.js';
import { createWind } from './wind.js';
import { createTumble, stepTumble } from './tumble.js';
import { barForSpeed } from './launch.js';
import { clamp, finite, DEG } from './math.js';

const KMH = 3.6;
const deg = r => r / DEG;

/* ---------- sites ---------- */

const RIDGE = 60;          // the launch's height above the field, m
const DECK = 18, DECK_FALL = Math.tan(20 * DEG), SLOPE_FALL = Math.tan(20 * DEG);

/**
 * The places scenarios fly from: terrain(x, z), the launch site the glider's launch runs on ({ fall, edgeAhead, ground }), and where
 * the pilot stands. The ramp is an 18 m timber deck falling at 20 degrees to a lip at z = 0, with a steep face below it; the cliff is a flat
 * top with a sheer edge 1.5 m ahead; the slope a steady 20-degree hillside that runs on down to the field. Each is 60 m up.
 */
export const SITES = Object.freeze({
  field: Object.freeze({ name: 'field', label: 'the field', terrain: () => 0, start: { x: 0, z: 0 }, site: null }),
  ramp: Object.freeze({
    name: 'ramp', label: 'the ramp',
    terrain: (x, z) => z < -DECK ? RIDGE : z <= 0 ? RIDGE - DECK_FALL * (z + DECK) : Math.max(0, RIDGE - DECK_FALL * DECK - 1.6 * z),
    start: { x: 0, z: -DECK },
    site: { fall: () => DECK_FALL, edgeAhead: (x, z, heading) => Math.cos(heading) > 0.05 ? Math.max(0, -z / Math.cos(heading)) : Infinity, ground: (x, z) => RIDGE - DECK_FALL * (Math.max(-DECK, z) + DECK) },
  }),
  cliff: Object.freeze({
    name: 'cliff', label: 'the cliff',
    terrain: (x, z) => z < 0 ? RIDGE : Math.max(0, RIDGE - 30 * z),
    start: { x: 0, z: -1.5 },
    site: { fall: () => 0, edgeAhead: (x, z, heading) => Math.cos(heading) > 0.05 ? Math.max(0, -z / Math.cos(heading)) : Infinity, ground: () => RIDGE },
  }),
  slope: Object.freeze({
    name: 'slope', label: 'the slope',
    terrain: (x, z) => z < 0 ? RIDGE : Math.max(0, RIDGE - SLOPE_FALL * z),
    start: { x: 0, z: 2 },
    site: { fall: (x, z) => z < 0 ? 0 : SLOPE_FALL, edgeAhead: () => Infinity },
  }),
});

/* ---------- scripted pilots ---------- */

/**
 * A launch pilot, flying it as taught: balances the wing against its roll (weight shift, after a reaction delay, at a gain), runs
 * with the nose held down (runNose degrees, and lower in a wind that would lift it early: the wing carries little, so the run
 * gathers speed) until the airspeed reaches
 * flyAt x the stall speed, then lets it up to noseAt and flies off, jumping as the wing lifts. It starts the run at goAt seconds
 * and runs flat out. skill 1 is a good pilot, 0.5 a sloppy one (slow and weak on the balance and the nose), 0 does nothing with
 * the balance. Returns (t, launch state, { stallSpeed }) => controls, with its own memory of the delay.
 */
export function launchPilot({ skill = 1, noseAt = -1, runNose = -4, flyAt = 1.2, goAt = 5, push = true } = {}) {
  const delay = 0.12 + 0.35 * (1 - skill), seen = [];
  return (t, s, { stallSpeed = 0 } = {}) => {
    seen.push([t, s.roll, s.rollV, finite(s.noseCmd)]); while (seen.length > 2 && seen[1][0] <= t - delay) seen.shift();
    const [, roll, rollV, noseSeen] = seen[0];
    const balance = skill > 0 ? clamp(-(4 * skill * roll + 0.9 * skill * rollV), -1, 1) : 0;
    // (in a strong wind the wing would lift the pilot before the run: the nose goes lower still until it carries less than 85%)
    const early = s.phase !== 'run' || s.airspeed < flyAt * stallSpeed;
    const wanted = early ? Math.max(-10, Math.min(runNose, noseAt) - 30 * Math.max(0, finite(s.lift) - 0.85)) : noseAt;
    const nose = clamp((wanted * DEG - noseSeen) * (4 + 56 * skill), -1, 1);
    return { balance, nose, push: push ? 1 : 0, go: t >= goAt, jump: s.phase === 'run' && s.lift > 0.92 };
  };
}

/**
 * The pilot just off a launch, as the range flies it: holds the bar where it was on the run for 1.5 s, then eases it back to
 * hands off over the next 2.5 s, so the wing gathers speed without settling back. Hanging over the launch in a strong wind (barely
 * moving over the ground) the pilot pulls in for speed to get away from the hill.
 */
function afterLiftoff(glider, barHold, from) {
  const away = holdSpeed(glider, 1.35 * glider.performance.stallSpeed());
  return (t, s) => {
    const feet = s.y - glider.world.heightAt(s.x, s.z) - glider.config.contactHeight, hovering = s.groundSpeed < 1.5 && feet > 0.05 && t - from > 0.6;
    return { pitch: hovering ? Math.min(0, away(s)) : finite(barHold) * clamp(1 - (t - from - 1.5) / 2.5, 0, 1) };
  };
}

/** Holds the bar where it gives this airspeed (m/s), with a little of the pilot's correction on top: a speed-holding pilot. */
const holdSpeed = (g, target) => { const bar = barForSpeed(target, b => g.performance.trimSpeed(b)); return s => clamp(bar + (s.airspeed - target) * 0.08, -1, 1); };

/* ---------- the scenarios ---------- */

const flightStart = (g, { height = 600, kmh = null, trimShare = null } = {}) => {
  const p = g.performance, v = kmh ? kmh / KMH : trimShare ? p.trimSpeed() * trimShare : p.trimSpeed();
  return { x: 0, y: height, z: 0, heading: 0, airspeed: v, pathAngle: p.glideAngle(v) };
};
/** A final: on the glide toward the field from this height (m of feet above it), at the hands-off trim or a given airspeed. */
const finalStart = (g, { feet = 30, airspeed = null } = {}) => {
  const p = g.performance, v = airspeed ?? p.trimSpeed(), path = p.glideAngle(v);
  return { x: 0, y: feet + g.config.contactHeight, z: -feet / Math.tan(Math.max(0.02, -path)), heading: 0, airspeed: v, pathAngle: path };
};
/**
 * A landing pilot: flies the approach (approach: 'trim', hands off, or 'fast', holding 1.5 x the stall speed) and flares from
 * flareAt ('cue', the middle of the wing's flare zone at its airspeed 12 m up; 'early' 1.5 m above it; 'late' below it; 'none'; or
 * a height in m), holding the bar fully out (style 'hold') or easing it out to full at the ground ('progressive').
 * Returns (t, state, ctx) => controls.
 */
export function landingPilot({ approach = 'trim', flareAt = 'cue', style = 'hold' } = {}) {
  let hold = null, from = null, flaring = false;
  return (t, s, ctx) => {
    const g = ctx.glider, feet = ctx.feet;
    if (approach === 'fast' && !hold) hold = holdSpeed(g, 1.5 * g.performance.stallSpeed());
    if (from === null && feet < 12) {
      const zone = g.flareZone()?.at(s.airspeed);
      from = flareAt === 'none' ? -Infinity : typeof flareAt === 'number' ? flareAt
        : zone ? (flareAt === 'early' ? zone.high + 1.5 : flareAt === 'late' ? Math.max(0.15, zone.low - 0.35) : (zone.low + zone.high) / 2) : 1.5;
      ctx.note('flareFrom', from);
    }
    if (from !== null && feet < from) flaring = true;
    const bar = flaring ? (style === 'progressive' ? clamp(0.35 + (from - feet) / Math.max(0.5, from) * 0.9, 0.35, 1) : 1) : hold ? hold(s) : 0;
    return { pitch: bar, field: feet < 12 };
  };
}

const steady = (pitch = 0, roll = 0) => () => ({ pitch, roll });   // (a flight pilot is a plain function of time and state)
const LAND = { kind: 'landing', site: 'field', wind: 2, seconds: 60, start: finalStart };

/**
 * Every scenario, by kind. Each: id, kind ('launch' | 'flight' | 'landing'), name, look (what to watch for), site, wind (m/s from
 * ahead; or { head, cross, gusts }), seconds (the longest it runs), and how it is flown: a launch has manual (a realistic launch)
 * and pilot (launchPilot options); a landing has start(glider) (the flight state to begin from) and pilot (landingPilot options);
 * a flight has start(glider) and pilot(t, state, ctx), a plain function of the time and the flight state. A fresh scripted pilot
 * is made for every run.
 */
export const SCENARIOS = Object.freeze([
  // Launches: the run, the balance, the nose and the speed, off each site in its wind.
  ...[
    ['ramp-calm', 'Ramp, no wind', 'ramp', 0, 'All the airspeed comes from the run and the drop off the lip: a heavy, fast wing needs every step.'],
    ['ramp-breeze', 'Ramp, 4 m/s', 'ramp', 4, 'The usual day: lifts off the deck before the lip.'],
    ['ramp-cross', 'Ramp, crosswind', 'ramp', { head: 3, cross: 3 }, 'A wind 45 degrees off: the upwind wing wants to lift, and the pilot has to keep it down.'],
    ['ramp-gusty', 'Ramp, gusty 5 m/s', 'ramp', { head: 5, gusts: 1.6 }, 'Gusts rock the wing on the shoulders: balance it the whole way.'],
    ['cliff-strong', 'Cliff, 8 m/s', 'cliff', 8, 'Strong wind at the edge: the wing flies almost at once and must be held down and level.'],
    ['cliff-light', 'Cliff, 2 m/s', 'cliff', 2, 'A step off into a dive for airspeed: the nose must go down, not up.'],
    ['slope-calm', 'Slope, no wind', 'slope', 0, 'A long run down a 20-degree hill to flying speed: the nose held level the whole way.'],
    ['slope-breeze', 'Slope, 3 m/s', 'slope', 3, 'A short run into the breeze.'],
  ].map(([id, name, site, wind, look]) => ({ id, kind: 'launch', name, look, site, wind, manual: true, seconds: 25, pilot: {} })),
  { id: 'ramp-sloppy', kind: 'launch', name: 'Ramp, sloppy balance', look: 'Nine seconds on the shoulders with slow, weak balancing, then the run: the Alpha, Falcon and Sport 2 forgive it, a U2 or a T2C goes over.', site: 'ramp', wind: { head: 4, gusts: 1.2 }, manual: true, seconds: 25, pilot: { skill: 0.15, goAt: 9 } },
  { id: 'ramp-hands-off', kind: 'launch', name: 'Ramp, no balancing', look: 'Nobody balancing: how long the wing stays level on the shoulders by itself (a trainer stays up; the harder the wing, the sooner it goes).', site: 'ramp', wind: 4, manual: true, seconds: 40, pilot: { skill: 0, goAt: 99 } },
  { id: 'ramp-nose-high', kind: 'launch', name: 'Ramp, nose held high', look: 'The nose held 6 degrees up: the sail stalls on the run and the speed never comes.', site: 'ramp', wind: 2, manual: true, seconds: 25, pilot: { noseAt: 6, runNose: 6 } },
  { id: 'slope-nose-low', kind: 'launch', name: 'Slope, nose held low', look: 'The nose held 5 degrees down: fast, but it will not lift until let up.', site: 'slope', wind: 1, manual: true, seconds: 25, pilot: { noseAt: -5, runNose: -5 } },

  // Flight: pitch, speed, roll, stall.
  { id: 'trim', kind: 'flight', name: 'Hands-off glide', look: 'Settles at its trim speed and glide: no porpoise.', site: 'field', wind: 0, seconds: 25, start: g => ({ ...flightStart(g), airspeed: g.performance.trimSpeed() * 1.3 }), pilot: steady() },
  { id: 'dive-hold', kind: 'flight', name: 'Dive, bar held in', look: 'Full bar in and held: the speed keeps building toward the top speed, the path steepens and stays down.', site: 'field', wind: 0, seconds: 25, start: g => flightStart(g, { height: 1500 }), pilot: steady(-1) },
  { id: 'dive-release', kind: 'flight', name: 'Dive and let go', look: '8 s full bar in, then hands off: the zoom back up and how quickly the swing dies away.', site: 'field', wind: 0, seconds: 40, start: g => flightStart(g, { height: 1500 }), pilot: t => ({ pitch: t < 8 ? -1 : 0 }) },
  { id: 'pitch-tap', kind: 'flight', name: 'Bar tap', look: 'A one-second push-out from trim, then hands off: the pitch response and the damping.', site: 'field', wind: 0, seconds: 20, start: flightStart, pilot: t => ({ pitch: t > 2 && t < 3 ? 0.6 : 0 }) },
  { id: 'roll-reversal', kind: 'flight', name: 'Roll reversal', look: 'Full weight shift one way, then the other, at trim: how quickly and how heavily it rolls.', site: 'field', wind: 0, seconds: 10, start: flightStart, pilot: t => ({ roll: t < 1 ? 0 : t < 4 ? 1 : t < 7 ? -1 : 0 }) },
  { id: 'roll-slow', kind: 'flight', name: 'Roll when slow', look: 'The same reversal near the stall: a trainer still rolls, a topless wing barely does.', site: 'field', wind: 0, seconds: 10, start: g => flightStart(g, { trimShare: 0.85 }), pilot: (t, s, ctx) => ({ roll: t < 1 ? 0 : t < 4 ? 1 : t < 7 ? -1 : 0, pitch: ctx.hold(1.08 * ctx.glider.performance.stallSpeed())(s) }) },
  { id: 'turn-360', kind: 'flight', name: '360 at 30 degrees', look: 'A steady turn: the time round, the height it costs and the speed it settles at.', site: 'field', wind: 0, seconds: 30, start: flightStart, pilot: (t, s) => ({ roll: t < 0.5 ? 0 : clamp(0.7 + (30 * DEG - Math.abs(s.bank)) * 2, 0, 1) }) },
  { id: 'spiral', kind: 'flight', name: 'Spiral dive', look: 'Full weight shift with the bar in: the bank, the speed and the sink of a spiral.', site: 'field', wind: 0, seconds: 20, start: g => flightStart(g, { height: 1500 }), pilot: t => ({ roll: t < 1 ? 0 : 1, pitch: t < 1 ? 0 : -0.6 }) },
  { id: 'stall-straight', kind: 'flight', name: 'Straight stall', look: 'The bar pushed slowly all the way out and held: a mush straight ahead, or a break that drops a tip.', site: 'field', wind: 0, seconds: 20, start: flightStart, pilot: t => ({ pitch: clamp((t - 1) / 5, 0, 1) }) },
  { id: 'stall-turn', kind: 'flight', name: 'Stall in a turn', look: 'Pushing out in a 30-degree turn: the inside wing goes first on a sharp wing.', site: 'field', wind: 0, seconds: 20, start: flightStart, pilot: (t, s) => ({ roll: t < 5 ? clamp(0.7 + (30 * DEG - Math.abs(s.bank)) * 2, 0, 1) : 0, pitch: clamp((t - 3) / 3, 0, 1) }) },
  { id: 'whip-stall', kind: 'flight', name: 'Whip stall', look: 'A dive, then the bar shoved out: the zoom, the stall at the top and the drop after it.', site: 'field', wind: 0, seconds: 25, start: g => flightStart(g, { height: 1500 }), pilot: t => ({ pitch: t < 4 ? -1 : t < 8 ? 1 : 0 }) },

  // Landings: the final, the flare, the touchdown.
  { ...LAND, id: 'land-cue', name: 'Final, flare at the cue', look: 'Hands off at trim and the flare held from the middle of the cue: the reference landing.', pilot: {} },
  { ...LAND, id: 'land-no-flare', name: 'Final, no flare', look: 'Never pushed out: the wing lands on its base bar.', pilot: { flareAt: 'none' } },
  { ...LAND, id: 'land-early', name: 'Flare too early', look: '1.5 m above the cue: it balloons and drops; a sharp wing drops a tip.', pilot: { flareAt: 'early' } },
  { ...LAND, id: 'land-late', name: 'Flare too late', look: 'Below the cue: the feet hit before the wing stops.', pilot: { flareAt: 'late' } },
  { ...LAND, id: 'land-fast', name: 'Fast final', look: 'Approach at 1.5 x the stall speed, flare at the cue: the float in ground effect and a flare that has to wait.', pilot: { approach: 'fast' } },
  { ...LAND, id: 'land-progressive', name: 'Progressive flare', look: 'The bar eased out from the cue and fully out at the ground, as taught: how much timing it forgives.', pilot: { style: 'progressive' } },
  { ...LAND, id: 'land-calm', name: 'No wind', look: 'The cue on a calm day: the ground speed is all airspeed, so the flare has to stop it all.', wind: 0, pilot: {} },
  { ...LAND, id: 'land-windy', name: '6 m/s headwind', look: 'Slow over the ground: the wing hangs and comes down almost vertically.', wind: 6, pilot: {} },
  { ...LAND, id: 'land-gusty', name: 'Gusty 4 m/s', look: 'The airspeed comes and goes on final: the cue moves with it.', wind: { head: 4, gusts: 1.6 }, pilot: {} },
].map(s => Object.freeze(s)));

/** The scenario with this id (or the object itself); an unknown id throws, listing the known ones. */
export function getScenario(id) {
  if (typeof id === 'object' && id) return id;
  const s = SCENARIOS.find(x => x.id === id);
  if (!s) throw new TypeError(`unknown scenario "${id}" (known: ${SCENARIOS.map(x => x.id).join(', ')})`);
  return s;
}

/* ---------- running one ---------- */

const windOf = w => typeof w === 'number' ? { head: w, cross: 0, gusts: 0 } : { head: finite(w?.head), cross: finite(w?.cross), gusts: finite(w?.gusts) };
const SAMPLE = 1 / 20;

/**
 * Starts a scenario on a wing. options: preset (id or object), vg (0..1), config (force-model overrides, as glider.tune), launch
 * (LAUNCH_DEFAULTS overrides), pilot ('script', the default, or 'you': your controls in step()), wind (overrides the scenario's).
 * Returns a run: step(dt, controls) advances it; phase, samples, glider and launch are live; result is set once done.
 */
export function startScenario(id, { preset = 'intermediate', vg = null, config = null, launch: launchConfig = {}, pilot = 'script', wind: windOverride = null } = {}) {
  const sc = getScenario(id), place = SITES[sc.site] ?? SITES.field, w = windOf(windOverride ?? sc.wind);
  const air = createWind({ x: -w.cross, z: -w.head, variability: 0, gusts: w.gusts, seed: 1 });
  air.x = -w.cross; air.z = -w.head;   // (steady until the first update; then the gusts, if any, move it)
  const world = createWorld({ terrain: place.terrain, wind: air });
  const glider = createGlider({ world, preset });
  if (glider.hasVG && vg !== null) glider.setVG(vg);
  if (config && Object.keys(config).length) glider.tune(config);
  const you = pilot === 'you', notes = {}, samples = [];
  const ctx = { glider, world, notes, note: (k, v) => { notes[k] = v; }, hold: v => holdSpeed(glider, v), feet: 0 };
  let phase, handle = null, script = null, t = 0, nextSample = 0, liftoff = null, result = null, maxRoll = 0, maxNose = -Infinity, wreck = null, ending = null;
  if (sc.kind === 'launch') {
    glider.reset({ ...place.start, y: place.terrain(place.start.x, place.start.z) + glider.config.contactHeight, heading: 0 });
    handle = glider.launch({ site: place.site, manual: sc.manual, config: launchConfig });
    script = launchPilot(sc.pilot); phase = 'launch';
  } else {
    glider.reset(sc.start(glider)); phase = 'flight';
    script = sc.kind === 'landing' ? landingPilot(sc.pilot) : sc.pilot;
  }

  const feetNow = () => glider.state.y - world.heightAt(glider.state.x, glider.state.z) - glider.config.contactHeight;
  const sample = controls => {
    const s = glider.state, l = handle?.state;
    samples.push({ t: +t.toFixed(3), phase, x: s.x, y: s.y, z: s.z, heading: s.heading, bank: phase === 'launch' ? finite(l?.roll) : s.bank,
      pitch: s.pitch, alpha: s.alpha, airspeed: s.airspeed, pathAngle: s.pathAngle, verticalSpeed: s.verticalSpeed, load: finite(s.loadFactor, 1),
      bar: finite(s.bar), feet: feetNow(), stalled: !!s.stalled, upright: finite(s.upright), groundSpeed: finite(phase === 'launch' ? l?.groundSpeed : s.groundSpeed),
      yaw: finite(l?.yaw), lift: finite(l?.lift, 1), launchPhase: l?.phase ?? null, controls: { ...controls } });
  };
  const finish = (outcome, extra = {}) => { phase = 'done'; result = { scenario: sc.id, kind: sc.kind, preset: glider.preset?.id ?? null, vg: glider.vg, outcome, ...extra, metrics: measure(sc, samples, { ...extra, notes, liftoff, maxRoll, maxNose, glider }), samples };
    if (wreck) result.metrics.impactMs = +wreck.impact.toFixed(1); };
  // It went wrong: the glider and pilot carry on as one body from exactly this state, and the run ends when the wreck is still.
  const crash = (outcome, extra, body) => { wreck = body; ending = { outcome, extra }; phase = 'tumble'; };
  const fromFlight = () => {
    const st = glider.state, horizontal = st.airspeed * Math.cos(st.pathAngle || 0), drop = glider.config.contactHeight - 0.65;
    return createTumble({ x: st.x, y: st.y - drop, z: st.z, pitch: -st.pitch, heading: st.heading, roll: st.visualBank ?? st.bank, ground: world.heightAt, wind: { x: air.x, z: air.z },
      velocity: [Math.sin(st.heading) * horizontal + finite(st.windX), st.verticalSpeed, Math.cos(st.heading) * horizontal + finite(st.windZ)], yawRate: finite(st.headingRate) });
  };
  const sampleWreck = () => {
    const last = samples.at(-1) ?? {}, v = wreck.v;
    samples.push({ ...last, t: +t.toFixed(3), phase: 'tumble', x: wreck.x, y: wreck.y, z: wreck.z, q: [...wreck.q], airspeed: Math.hypot(v[0], v[1], v[2]), verticalSpeed: v[1],
      feet: wreck.y - world.heightAt(wreck.x, wreck.z), controls: {} });
  };

  const run = {
    scenario: sc, glider, world, wind: air, site: place,
    get launch() { return handle; },
    /** The wreck (tumble.js) once something went wrong, else null: x, y, z and the quaternion q to draw it with. */
    get wreck() { return wreck; },
    get phase() { return phase; },
    get t() { return t; },
    get done() { return phase === 'done'; },
    get result() { return result; },
    samples,
    /** Advances by dt seconds (stepped at most 1/60 s at a time). controls: yours, when the pilot is 'you'. */
    step(dt, controls = {}) {
      for (let left = Math.min(dt, 0.25); left > 1e-9 && phase !== 'done'; left -= 1 / 60) {
        const h = Math.min(left, 1 / 60); t += h; air.update(h); ctx.feet = feetNow();
        let input;
        if (phase === 'tumble') {
          wreck.wind = { x: air.x, z: air.z }; stepTumble(wreck, h);
          if (t >= nextSample) { sampleWreck(); nextSample += SAMPLE; }
          if (wreck.done) { sampleWreck(); finish(ending.outcome, ending.extra); break; }
          continue;
        }
        if (phase === 'launch') {
          input = you ? controls : script(t, handle.state, { stallSpeed: glider.performance.stallSpeed() });
          handle.step(h, input);
          const l = handle.state; maxRoll = Math.max(maxRoll, Math.abs(l.roll)); maxNose = Math.max(maxNose, finite(l.noseCmd));
          if (handle.failed) { sample(input); crash(handle.failed, { at: t }, handle.tumble({ ground: world.heightAt })); continue; }
          if (handle.airborne) { liftoff = { t, distance: l.liftDistance ?? l.distance, airspeed: glider.state.airspeed, reason: l.reason, groundSpeed: l.groundSpeed }; phase = 'flight';
            script = afterLiftoff(glider, handle.barHold, t); }
        } else {
          input = you ? controls : script(t, glider.state, ctx);
          glider.step(h, input);
          // (just off a launch the feet may brush the ground for a moment: the end of the run, not a landing)
          const contact = glider.contact({ tolerance: liftoff && t - liftoff.t < 1.2 ? 0.3 : 0 });
          if (contact) {
            const landed = glider.land(null, contact), extra = sc.kind === 'launch' ? { at: t } : { at: t, landing: landed, touchdown: contact }, outcome = sc.kind === 'launch' && landed.judged !== 'crash' ? 'sank back' : landed.judged;
            sample(input);
            if (landed.judged === 'crash') { crash(outcome, extra, fromFlight()); continue; }
            finish(outcome, extra); break;
          }
          if (sc.kind === 'launch' && liftoff && t - liftoff.t > 6) { finish('flying', { at: t }); break; }
        }
        if (t >= nextSample) { sample(input); nextSample += SAMPLE; }
        if (t >= sc.seconds) { finish(phase === 'launch' ? 'no launch' : 'done', { at: t }); break; }
      }
      return run;
    },
  };
  sample({});
  return run;
}

/** Runs a scenario offline to its end at 60 Hz (startScenario's options) and returns its result. */
export function runScenario(id, options = {}) {
  const run = startScenario(id, { ...options, pilot: 'script' });
  while (!run.done) run.step(1 / 60);
  return run.result;
}

/** The numbers each kind of scenario is judged by (km/h, degrees, metres, seconds). */
function measure(sc, samples, { notes, liftoff, maxRoll, maxNose, glider, landing, touchdown }) {
  const r = n => +n.toFixed(1), at = (from, to = Infinity) => samples.filter(s => s.t >= from && s.t <= to && s.phase !== 'launch');
  const max = (list, f) => list.reduce((m, s) => Math.max(m, f(s)), -Infinity), min = (list, f) => list.reduce((m, s) => Math.min(m, f(s)), Infinity);
  const flight = at(0), p = glider.performance;
  if (sc.kind === 'launch') {
    const after = liftoff ? at(liftoff.t, liftoff.t + 6) : [];
    return { liftoffSeconds: liftoff ? r(liftoff.t) : null, runMetres: liftoff ? r(liftoff.distance) : null, liftoffKmh: liftoff ? r(liftoff.airspeed * KMH) : null,
      how: liftoff?.reason ?? null, maxRollDeg: r(deg(maxRoll)), maxNoseDeg: r(deg(Math.max(0, maxNose))),
      lowestAfterMetres: after.length ? r(min(after, s => s.feet)) : null, slowestAfterKmh: after.length ? r(min(after, s => s.airspeed) * KMH) : null };
  }
  if (sc.kind === 'landing') {
    const flareFrom = finite(notes.flareFrom, NaN), flared = flight.find(s => s.controls.pitch > 0.5);
    return { touchdownSinkMs: touchdown ? r(Math.max(0, touchdown.verticalSpeed)) : null, groundKmh: touchdown ? r(touchdown.groundSpeed * KMH) : null,
      airspeedKmh: touchdown ? r(touchdown.airspeed * KMH) : null, bankDeg: touchdown ? r(deg(Math.abs(touchdown.bank))) : null, points: landing?.points ?? null,
      cueMetres: Number.isFinite(flareFrom) ? r(flareFrom) : null, flareKmh: flared ? r(flared.airspeed * KMH) : null,
      floatMetres: flared && touchdown ? r(Math.hypot(touchdown.x - flared.x, touchdown.z - flared.z)) : null,
      ballooned: !!touchdown?.flare?.balloon, notes: landing?.notes ?? [] };
  }
  const speeds = flight.map(s => s.airspeed), last = flight.at(-1) ?? samples.at(-1), first = flight[0] ?? samples[0];
  const common = { topKmh: r(Math.max(...speeds) * KMH), lowKmh: r(Math.min(...speeds) * KMH), endKmh: r(last.airspeed * KMH), steepestDeg: r(deg(min(flight, s => s.pathAngle))),
    maxBankDeg: r(deg(max(flight, s => Math.abs(s.bank)))), maxLoad: +max(flight, s => s.load).toFixed(2), heightLostMetres: r(first.y - last.y) };
  if (sc.id === 'roll-reversal' || sc.id === 'roll-slow') {
    const to = (from, sign) => { const s = flight.find(x => x.t > from && sign * x.bank >= 30 * DEG); return s ? r(s.t - from) : null; };
    return { ...common, to30Seconds: to(1, 1), reversalSeconds: to(4, -1) };
  }
  if (sc.id === 'dive-release' || sc.id === 'pitch-tap') {
    const from = sc.id === 'dive-release' ? 8 : 3, trim = p.trimSpeed(), after = at(from);
    const settled = after.findIndex((s, i) => after.slice(i).every(x => Math.abs(x.airspeed - trim) < 0.08 * trim));
    return { ...common, zoomDeg: r(deg(max(after, s => s.pathAngle))), settleSeconds: settled >= 0 ? r(after[settled].t - from) : null };
  }
  if (sc.id.startsWith('stall') || sc.id === 'whip-stall') {
    const stalled = flight.filter(s => s.stalled);
    return { ...common, stalledSeconds: r(stalled.length * SAMPLE), dropDeg: r(deg(max(stalled.length ? stalled : flight, s => Math.abs(s.bank)))) };
  }
  if (sc.id === 'turn-360') {
    const round = flight.find(s => s.t > 2 && Math.abs(s.heading) < 0.05 && s.t > 5);
    return { ...common, roundSeconds: round ? r(round.t) : null, sinkMs: r((first.y - last.y) / Math.max(1, last.t - first.t)) };
  }
  return common;
}
