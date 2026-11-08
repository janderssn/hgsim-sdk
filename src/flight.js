/**
 * The force model: hgsim's hang glider.  Metres, seconds, radians. A force model, not a controller:
 *
 *   lift  L = q S CL(alpha)      drag D = q S CD(alpha, ground effect)      q = 1/2 rho V^2
 *   dV/dt     = -D/m - g sin(gamma)                        (airspeed along the flight path)
 *   dgamma/dt = (L cos(bank) - W cos(gamma)) / (m V)       (flight-path angle)
 *   dpsi/dt   = -L sin(bank) / (m V cos(gamma))            (heading; this scene's right turn decreases heading)
 *
 * The pilot's weight shift sets the wing's angle of attack: bar in (W) toward alphaMin for speed, neutral at the
 * trim angle, bar out (S) toward alphaMax, past the stall. The wing pitches toward that angle through a short lag and,
 * at speed, the bar pressure stops the pilot pushing out further than loadLimit g allows. Roll is a rate-limited
 * weight shift whose authority grows with airspeed. Everything the game asks for follows from the forces: a dive
 * steepens and settles where drag meets gravity; letting the bar out zooms the speed into height; a steep bank tilts
 * the lift so the nose drops, the speed builds and the sink grows (a turn only stalls when the bar is pushed out too
 * far for the banked stall speed); the wing stalls past stallAlpha and mushes; near the ground the span's ground
 * effect cuts the induced drag so the wing floats; and the flare is the sail pushed out past the stall at the right
 * moment, its lift spike arresting the sink and its flat-plate drag stopping the wing.
 * No rendering, collisions or external dependencies. The world (world.js) supplies the ground and the air; terrain following is the
 * optional assist in assists/terrain-skimming.js. Every function takes its config explicitly (GLIDER_DEFAULTS when left out).
 */
import { clamp, finite, smoothstep, wrapAngle as angle, DEG } from './math.js';
import { skimGuidance } from './assists/terrain-skimming.js';
import { LANDING_RULES } from './landing.js';

export const GLIDER_DEFAULTS = Object.freeze({
  gravity: 9.81,
  airDensity: 1.1,                 // kg/m^3, around 1500 m
  mass: 110,                       // pilot, harness and wing, kg
  wingArea: 15,                    // m^2
  span: 10,                        // m (aspect ratio 6.7)
  // Lift curve: linear to the stall, then blended into a flat plate (the sail pushed right out).
  liftSlope: 4.2,                  // per radian
  zeroLiftAlpha: -3 * DEG,
  stallAlpha: 16 * DEG,
  stallBlend: 14 * DEG,            // width of the post-stall blend (a hang glider's stall is soft)
  plateLift: 1.4,                  // flat-plate lift scale (CL = plateLift * 2 sin a cos a): the sail keeps lifting past the stall, a mush, not a break
  plateDrag: 1.0,                  // flat-plate drag scale (CD = plateDrag * 2 sin^2 a)
  // Drag: parasite (wing, pilot, wires) plus induced; oswald efficiency.
  cd0: 0.028,                      // matches the original model's sink at speed, so a skim carries its momentum
  // A flex wing's sail twists at speed: below twistLift of lift coefficient the washed-out tips fly at small or negative angles
  // and drag grows as twistDrag (twistLift - CL)^2, so the polar falls away at speed as measured hang glider polars do.
  twistDrag: 0,
  twistLift: 0.5,
  oswald: 0.8,
  // Ground effect on the induced drag: sigma = 16 (h/b)^2 / (1 + 16 (h/b)^2), h the wing's height above the ground.
  wingAboveBody: 1.3,
  // The bar. Angles of attack for full bar in (W), neutral, and full push-out (S); slew rates of the bar travel
  // (pulling in is quick, pushing out is deliberate: a tap of S slows the wing, a hold flares it).
  alphaMin: -2.2 * DEG,            // full bar in: CL about 0.04, so a held dive keeps steepening and building speed
  alphaTrim: 7.5 * DEG,
  alphaMax: 32 * DEG,              // full push-out, bar at the chest: the flare
  // Bar travel. Pushing out, most of the travel moves the angle of attack gently and the last part is the flare
  // (alpha = trim + (max - trim) * bar^outCurve). Pulling in is quick; pushing out takes barOutSeconds at the stall
  // speed and longer against the pressure at speed (times sqrt(V / Vstall)); the bar is let back to neutral over
  // barReturnSeconds (a pilot eases it, never dumps it).
  outCurve: 2,
  barInRate: 1 / 0.3,
  barOutSeconds: 0.6,              // at the stall speed; against the pressure it takes (V / Vstall)^barPressureExp times longer
  barReturnSeconds: 1.0,
  barPressureExp: 2,               // push-out time grows with (V / Vstall)^this, up to barPressureMax times
  barPressureMax: 2,
  // Unsteady lift: a quick push-out adds lift while the angle of attack is rising (CL += dynamicLift * chord * dalpha/dt / V),
  // which is what lets a sharp flare arrest the sink.
  chord: 1.8,
  dynamicLift: 1.4,
  // The pilot goes upright for the landing as the bar comes out low (under uprightHeight of feet height). Presentation.
  uprightHeight: 8,
  // On final (low and slow over landable ground, bar not held in) the pilot is already partly upright, at this share of the
  // upright drag, so a hands-off wing stops floating. W keeps the pilot prone.
  finalUpright: 0.2,
  // Ground cushion: a wing sinking toward the ground compresses the air under it, more the lower and the harder it sinks
  // (m/s^2 of lift per m/s of sink, scaled by how deep in ground effect it is). It needs speed: level flight and a landing approach feel nothing of it, so a flare stays yours.
  groundCushion: 3,
  // Pitch response: the wing follows the bar's angle through a lag and a rate limit. Static speed stability: the wing
  // pitches up a little when fast and down when slow (the pendulum pilot), which damps the phugoid.
  pitchTau: 0.2,
  pitchRateMax: 80 * DEG,
  // A luffing sail: below luffAlpha the sail's leading edge collapses and the wing loses luffLoss of its nose-up recovery (the
  // 1970s Rogallo's luffing dive). Modern wings have luff lines, reflex and battens instead: luffLoss 0, as here.
  luffAlpha: 4 * DEG,
  luffLoss: 0,
  // ... and a luffed sail tucks: its pitching moment turns nose-down, which moves the wing's trim angle down by luffTuck (rad). A dive
  // that luffs the sail then holds itself in the luff and runs away, unless the pilot pushes out hard enough, and early enough, to
  // lift the angle back above luffAlpha before the speed (and the bar's load limit) takes the authority away. 0 here.
  luffTuck: 0,
  speedStability: 0.35 * DEG,      // radians of alpha per m/s of speed away from the bar's trim speed
  // The bar pressure: at speed the pilot cannot push out beyond this load factor.
  loadLimit: 2.8,
  // How hard the wing pulls by itself: with the bar neutral the pendulum's trim pulls only freeLoad g (in the bank's
  // frame), so a recovery is gradual and yours to shape; pushing out brings the pull up to loadLimit, W stops it.
  freeLoad: 1.5,
  // Pitch authority falls with airspeed: pushing out can pull at most 1 + pitchAuthority (V / Vstall)^2 g, up to loadLimit,
  // so a slow flare barely rises and a fast one still balloons.
  pitchAuthority: 0.12,
  // Pitch damping: the wing resists changes of flight path (seconds of alpha per unit path rate), which takes out the
  // long porpoise after a dive or a release. Eases out as the bar nears full push-out, so it never blunts a flare.
  pitchDamping: 0.5,
  // Low over landable ground (input.ground) a final can be flown down: the terrain-skimming assist only acts at real skimming
  // speed, and a free bar settles slightly downhill instead of slowly climbing. Slopes and ridges keep the assist in full.
  skimFadeSpeed: 22,               // m/s: no assist at or below this ...
  skimFullSpeed: 30,               // ... and all of it from here up
  // Fine control for skimming: fast, low and nearly level, the first part of a bar movement is this many times slower and
  // small inputs ask for less, so the last metres can be trimmed while a held press still pulls up at once. Nothing holds the height: full input still reaches full bar, and a steep dive is untouched.
  lowBarSlow: 3,
  fieldSettle: -2,                 // degrees the free bar's level point moves down over landable ground
  zoomFadeStart: -4,               // degrees of climb where a free bar's pull starts fading ...
  zoomFadeEnd: 2,                  // ... and has become a gentle push-over, so a zoom flows on instead of hanging
  zoomPushOver: 0.06,
  bankExcessPower: 2,
  // Weight-shift roll: the bank the input asks for, reached through a critically damped spring.
  maxBank: 60 * DEG,
  rollFrequency: 2.8,              // rad/s of the critically damped roll spring at trim speed
  rollAuthority: [0.3, 1.25],      // clamp of V / trim speed: heavy and slow to roll near the stall, crisp when fast
  slowBank: 0.45,                  // share of the bank available at the stall speed (full from 1.3 x stall)
  uprightRoll: 0.5,                // share of the roll authority left with the pilot upright for the landing
  uprightDrag: 0.22,               // drag coefficient added by the pilot upright with the bar out: what bleeds speed on final
  standDrag: 0.7,                  // share of it the pilot sitting up by choice (input.stand) adds whatever the bar does: slower, for a landing
  settleAngle: 4,                  // degrees: a slow wing under S settles at this path while it bleeds speed
  // A stalled wing is sluggish in roll (blended in over a few degrees past the stall: no switch).
  stallRollFactor: 0.5,
  // Aerodynamic roll damping: a rolling wing's descending tip meets the air at a higher angle of attack than the rising one. While
  // more angle gives more lift that only damps the roll (the spring above stands for it); past a stall whose lift falls away with
  // angle, the descending tip loses lift and the roll feeds itself: the wing drops a tip and autorotates until the angle comes down.
  // rollDamping is that effect's strength (1/s at trim speed, per unit of the lift curve's fall against its linear slope): 0 here,
  // a mushing wing whose lift never falls; a sharp stall (small stallBlend, low plateLift) with it drops a tip by itself.
  rollDamping: 0,
  // The air is never quite smooth: small eddies roll the wing about by up to airRoughness rad/s^2 at trim speed (growing with the
  // speed, to half as much again). Too small to notice in flight; it is what starts a stalled wing's roll one way or the other.
  airRoughness: 0,
  // Stall warning this many degrees below the stall.
  stallWarnMargin: 2.5 * DEG,
  // The wing as a thing to carry and run with (the launch reads these): its own mass and span (its roll inertia on the shoulders),
  // its dihedral (a sail whose tips sit higher than its root rights itself in the air on the run; anhedral, negative, helps it
  // over), and carryAlpha, the angle of attack its sail meets the air at with the keel carried level on the run (a billowy
  // trainer meets it high and lifts near its stall; a tight, flat topless wing meets it low and must be run up to speed, or its
  // nose lifted, which is where a sharp stall bites).
  wingMass: 30.8,
  wingSpan: 10,
  dihedral: 0,
  carryAlpha: 13.15 * DEG,
  // Geometry: the body reference sits footHeight above the feet for the flare and ground effect, and a body reference lower than
  // contactHeight over the ground is on it (a touchdown; see Glider.contact).
  footHeight: 2.4,
  contactHeight: 2.3,
  // A light touch at speed is a scrape, not a crash: under scrapeSink m/s of sink, wings about level and too fast to land (the
  // rules' rough ground speed), the wing skips off the ground and pays in speed. Anything harder, steeper or banked still crashes.
  scrapeSink: 4.5,
  // Flare bookkeeping: a push-out that starts this low counts as the flare.
  flareWindow: 6,
  minimumSpeed: 2,
  maxFrameTime: 0.25,
  maxStep: 1 / 120,
});

/* ---------- aerodynamics ---------- */
const weight = cfg => cfg.mass * cfg.gravity;
const inducedK = cfg => 1 / (Math.PI * cfg.oswald * (cfg.span * cfg.span / cfg.wingArea));
/** Lift coefficient: linear to the stall, blended into the flat plate beyond it. */
export function liftCoefficient(alpha, cfg = GLIDER_DEFAULTS) {
  const linear = cfg.liftSlope * (Math.min(alpha, cfg.stallAlpha) - cfg.zeroLiftAlpha);
  const w = smoothstep(cfg.stallAlpha, cfg.stallAlpha + cfg.stallBlend, alpha);
  const plate = cfg.plateLift * 2 * Math.sin(alpha) * Math.cos(alpha);
  return Math.max(0, (1 - w) * linear + w * plate);
}
/** Drag coefficient: parasite, induced (reduced in ground effect, sigma 0..1), the stalled sail's plate drag and the twisted sail's drag at speed. */
export function dragCoefficient(alpha, sigma = 1, cfg = GLIDER_DEFAULTS) {
  const linear = cfg.liftSlope * (Math.min(alpha, cfg.stallAlpha) - cfg.zeroLiftAlpha);
  const w = smoothstep(cfg.stallAlpha, cfg.stallAlpha + cfg.stallBlend, alpha);
  const s = Math.sin(alpha);
  const twist = Math.max(0, cfg.twistLift - linear);
  return cfg.cd0 + inducedK(cfg) * linear * linear * sigma + w * cfg.plateDrag * 2 * s * s + cfg.twistDrag * twist * twist;
}
/** Ground-effect factor on the induced drag for a wing this high above the ground (1 = none). */
export function groundEffectFactor(wingHeight, cfg = GLIDER_DEFAULTS) {
  const r = Math.max(0, wingHeight) / cfg.span, t = 16 * r * r;
  return t / (1 + t);
}
/** Stall speed in level flight (load factor 1), and in a bank. */
export function stallSpeed(bank = 0, cfg = GLIDER_DEFAULTS) {
  const clMax = liftCoefficient(cfg.stallAlpha, cfg);
  const load = 1 / Math.max(0.5, Math.cos(bank));
  return Math.sqrt(2 * weight(cfg) * load / (cfg.airDensity * cfg.wingArea * clMax));
}
/**
 * The feel was tuned on GLIDER_DEFAULTS; the speeds at which its helpers come in (fine bar control at skimming speed, the ground
 * cushion, the field's settle, the skim assist's fade) scale with a wing's stall speed against that wing's, so a slower wing
 * feels the same at the same share of its own speed range.
 */
const REFERENCE_STALL = stallSpeed(0, GLIDER_DEFAULTS);
/** The angle of attack that carries the weight at this airspeed and bank (capped at the stall). */
function alphaForLevel(speed, bank, cfg) {
  const q = 0.5 * cfg.airDensity * Math.max(1, speed) * Math.max(1, speed);
  const cl = weight(cfg) / (q * cfg.wingArea * Math.max(0.5, Math.cos(bank)));
  return Math.min(cfg.stallAlpha, cfg.zeroLiftAlpha + cl / cfg.liftSlope);
}
function barAlpha(bar, cfg) {
  return bar < 0 ? cfg.alphaTrim - smoothstep(0, 0.9, -bar) * (cfg.alphaTrim - cfg.alphaMin) : cfg.alphaTrim + Math.pow(bar, cfg.outCurve) * (cfg.alphaMax - cfg.alphaTrim);
}
/** Trim airspeed for a bar position (-1 full in .. +1 full out): the speed at which the bar's angle carries the weight. */
export function barTargetSpeed(bar = 0, bank = 0, cfg = GLIDER_DEFAULTS) {
  const alpha = barAlpha(clamp(finite(bar), -1, 1), cfg);
  const cl = Math.max(0.05, liftCoefficient(Math.min(alpha, cfg.stallAlpha), cfg));
  return Math.sqrt(2 * weight(cfg) / (cfg.airDensity * cfg.wingArea * cl * Math.max(0.5, Math.cos(bank))));
}
/**
 * Still-air sink (m/s, positive down) of the steady glide at an airspeed and bank: the wing trimmed to carry the
 * weight at that speed. Below the banked stall speed the wing cannot, and the sink rises steeply.
 */
export function sinkPolar(airspeed, bank = 0, cfg = GLIDER_DEFAULTS) {
  const v = Math.max(1, airspeed), load = 1 / Math.max(0.5, Math.cos(bank));
  const q = 0.5 * cfg.airDensity * v * v, clNeeded = weight(cfg) * load / (q * cfg.wingArea);
  const clMax = liftCoefficient(cfg.stallAlpha, cfg);
  const alpha = cfg.zeroLiftAlpha + Math.min(clNeeded, clMax) / cfg.liftSlope;
  const cd = dragCoefficient(alpha, 1, cfg), cl = liftCoefficient(alpha, cfg);
  // Steady banked glide: L cos(bank) = W cos(gamma), D = W sin(gamma), so tan(gamma) = CD / (CL cos(bank)); sink = V sin(gamma).
  // A wing short of lift sinks faster still.
  const gamma = Math.atan2(cd, Math.max(cl, 0.05) * Math.max(0.5, Math.cos(bank)));
  const shortfall = Math.max(0, clNeeded - clMax) / Math.max(clMax, 0.5);
  return v * Math.sin(gamma) + shortfall * 6;
}
/** Steady still-air glide angle (negative = descending) at an airspeed and bank. */
export function glidePathAngle(airspeed, bank = 0, cfg = GLIDER_DEFAULTS) {
  const v = Math.max(1, airspeed);
  return -Math.asin(clamp(sinkPolar(v, bank, cfg) / v, 0, 0.99));
}

/**
 * The angle of attack the wing pitches toward at this bar position and airspeed: the bar's own angle plus the pendulum's static
 * speed stability (fast: the nose comes up; slow: it goes down). The pilot holding the bar in or out overrides most of that
 * trimming. Before the flight's load cap, pitch damping and assists; the wing reaches it through the pitch lag.
 */
export function pitchTrimAlpha(bar, airspeed, cfg = GLIDER_DEFAULTS) {
  return barAlpha(bar, cfg) + cfg.speedStability * (airspeed - barTargetSpeed(bar, 0, cfg)) * (1 - smoothstep(0, 0.5, Math.abs(bar)));
}

/**
 * How fast the wing pitches (rad/s of angle of attack, + nose up) from alpha toward alphaTarget: through the pitch lag and its
 * rate limit. A luffing sail (below luffAlpha) loses luffLoss of its nose-up recovery and has its trim moved down by luffTuck.
 */
export function pitchRate(alpha, alphaTarget, cfg = GLIDER_DEFAULTS) {
  if (!(cfg.luffLoss > 0) && !(cfg.luffTuck > 0)) return clamp((alphaTarget - alpha) / cfg.pitchTau, -cfg.pitchRateMax, cfg.pitchRateMax);
  const luffing = smoothstep(cfg.luffAlpha, cfg.luffAlpha - 4 * DEG, alpha);
  const rate = clamp((alphaTarget - finite(cfg.luffTuck) * luffing - alpha) / cfg.pitchTau, -cfg.pitchRateMax, cfg.pitchRateMax);
  return rate > 0 ? rate * (1 - cfg.luffLoss * luffing) : rate;
}

/**
 * A flight state: where the glider is and how it is flying. init sets any field (x, y, z, heading, airspeed, pathAngle, ...);
 * airspeed defaults to the trim speed and pathAngle to its steady glide.
 */
export function createFlightState(overrides = {}, cfg = GLIDER_DEFAULTS) {
  const speed = finite(overrides.airspeed, barTargetSpeed(0, 0, cfg));
  const path = finite(overrides.pathAngle, glidePathAngle(speed, 0, cfg));
  const alpha = alphaForLevel(speed, 0, cfg);
  const stall = stallSpeed(0, cfg);
  return Object.assign({
    x: 0, y: 1700, z: 0, heading: 0,
    bank: 0, bankRate: 0, pitch: path + alpha, pitchRate: 0, visualBank: 0,
    airspeed: speed, pathAngle: path, pathRate: 0, bar: 0, alpha, alphaTarget: alpha,
    verticalSpeed: speed * Math.sin(path),
    lift: 0, thermalLift: 0, ridgeLift: 0, loadFactor: 1,
    sinkRate: sinkPolar(speed, 0, cfg), windX: 0, windZ: 0, groundSpeed: speed * Math.cos(path),
    stallWarning: false, stalled: false, stallRatio: speed / stall, stallSpeed: stall,
    skimAssist: 0, skimBlend: 0, skimProtect: 0, pullUp: false, pullUpReason: '', pullUpTurn: 0, pullUpLead: 0,
    groundEffect: 0, landing: 0, autoFlare: 0, flare: 0, floatWeight: 0, energyExchange: 0,
    flarePressed: false, flareFeet: NaN, flareRatio: NaN, flareBalloon: 0, flareLow: Infinity, flareHigh: -Infinity, flareStallFeet: NaN,
    headingRate: 0, upright: 0, groundClosing: 0,
  }, overrides);
}

/**
 * Advances a flight state by dt seconds through world (createWorld). Mutates and returns state.
 * input: roll -1 (left) .. +1 (right) weight shift; pitch, the bar, -1 (pulled in: dive) .. +1 (pushed out: slow, flare);
 * stand, the pilot sitting up (drag, for a slow landing); field, true when low over ground that can be landed on (a hands-off
 * final settles onto it). assist: null, or the terrain-skimming assist's options { clearance: m or (state) => m }.
 * A long frame is capped at maxFrameTime and divided into steps of at most maxStep; call repeatedly for offline simulation.
 */
export function stepFlight(state, input = {}, dt = 0, world, cfg = GLIDER_DEFAULTS, assist = null) {
  const g = cfg.gravity, W = weight(cfg), m = cfg.mass;
  if (!Number.isFinite(dt) || dt <= 0) return state;
  for (const key of ['x', 'y', 'z', 'heading', 'bank', 'bankRate', 'pitch', 'pitchRate', 'pathRate', 'bar',
    'skimAssist', 'skimBlend', 'skimProtect', 'flareBalloon']) state[key] = finite(state[key]);
  state.airspeed = Math.max(1, finite(state.airspeed, barTargetSpeed(0, 0, cfg)));
  state.pathAngle = finite(state.pathAngle, glidePathAngle(state.airspeed, state.bank, cfg));
  state.alpha = finite(state.alpha, alphaForLevel(state.airspeed, state.bank, cfg));
  const rollInput = clamp(finite(input.roll), -1, 1);
  const pitchInput = clamp(finite(input.pitch), -1, 1);
  const bankWanted = Math.sign(rollInput) * Math.pow(Math.abs(rollInput), 1.65) * cfg.maxBank;
  const duration = Math.min(dt, cfg.maxFrameTime);
  const count = Math.ceil(duration / cfg.maxStep);
  const step = duration / count;
  let totalVertical = 0;
  const clMax = liftCoefficient(cfg.stallAlpha, cfg);
  const ks = stallSpeed(0, cfg) / REFERENCE_STALL;   // (the feel's speed thresholds, scaled to this wing)

  for (let index = 0; index < count; index++) {
    // The bar: pulled in quickly, pushed out deliberately, released back to neutral.
    const fineControl = (assist ? 0 : 1) * (1 - smoothstep(6, 12, finite(state.lastFeet, 99))) * smoothstep(18 * ks, 24 * ks, state.airspeed) * (1 - smoothstep(6 * DEG, 14 * DEG, Math.abs(state.pathAngle)));
    const barInput = pitchInput + (Math.sign(pitchInput) * pitchInput * pitchInput - pitchInput) * fineControl;
    const away = Math.abs(barInput) > Math.abs(state.bar) && barInput * state.bar >= 0;
    const pressure = Math.min(cfg.barPressureMax, Math.pow(Math.max(1, state.airspeed / stallSpeed(0, cfg)), cfg.barPressureExp));
    const rate = away ? (barInput < 0 ? cfg.barInRate : state.bar < 0 ? 1 / cfg.barReturnSeconds : 1 / (cfg.barOutSeconds * pressure)) / (1 + (cfg.lowBarSlow - 1) * fineControl * (1 - (barInput < 0 ? smoothstep(0.3, 0.8, -state.bar) : smoothstep(0.1, 0.3, state.bar))))
      : state.bar < 0 ? 1 / cfg.barReturnSeconds : 1 / 0.5;
    const previousBar = state.bar;
    state.bar = clamp(state.bar + clamp(barInput - state.bar, -rate * step, rate * step), -1, 1);
    const bar = state.bar;

    const v = state.airspeed, gamma = state.pathAngle, bank = state.bank;
    const air = world.airAt(state.x, state.y, state.z);
    const surface = Math.max(air.groundHeight, world.surfaceAt(state.x, state.z));
    const clearance = state.y - surface, feet = clearance - cfg.footHeight;
    // How fast the ground comes up to the feet (m/s, + closing), smoothed: a landing approach closes on the ground, a take-off
    // climbs away from it.
    if (Number.isFinite(state.lastFeet)) state.groundClosing = finite(state.groundClosing) + ((state.lastFeet - feet) / step - finite(state.groundClosing)) * (1 - Math.exp(-step / 0.25));
    state.lastFeet = feet;
    const q = 0.5 * cfg.airDensity * v * v, qS = q * cfg.wingArea;
    const stall = stallSpeed(bank, cfg);
    state.stallSpeed = stall;
    state.stallRatio = v / stall;

    // What the bar asks for, with the pendulum's speed stability, and what the bar pressure allows at this speed.
    let alphaTarget = pitchTrimAlpha(bar, v, cfg);
    // (the bar held in holds the dive: the pendulum's trimming only acts on a free bar)
    // (the free bar's pull fades as the nose rises, so a recovery zooms and flows on instead of hanging; S still climbs)
    const fieldShift = input.field ? cfg.fieldSettle * DEG * (1 - 0.5 * smoothstep(18 * ks, 24 * ks, v)) * (1 - smoothstep(0, 0.1, bar)) : 0;   // (hands off only: S flares as it always did)
    const zoomFade = smoothstep(cfg.zoomFadeStart * DEG + fieldShift, cfg.zoomFadeEnd * DEG + fieldShift, gamma);
    const freePull = cfg.freeLoad + (Math.cos(gamma) - cfg.zoomPushOver - cfg.freeLoad) * zoomFade;
    const speedRatio = v / stallSpeed(0, cfg), pushPull0 = Math.min(cfg.loadLimit, 1 + cfg.pitchAuthority * speedRatio * speedRatio),
      // (a slow wing has no authority to raise its nose further: it bleeds speed level, then stalls; a fast one balloons)
      // (a slow wing holds about level under S; with the pilot upright for the landing it settles gently as it bleeds, so a
      // push-out begun at a few metres arrives near the ground as the speed runs out)
      pushPull = pushPull0 + (clamp(Math.cos(gamma) - 4 * (gamma - (2 - (2 + cfg.settleAngle) * clamp(finite(state.upright), 0, 1)) * DEG), 0.7, pushPull0) - pushPull0) * (1 - smoothstep(1.5, 2.2, speedRatio));
    // In a bank the wing pulls what holds the height, plus the excess only as far as the wings are level: a hard turn
    // carves flat and pays for it in speed instead of climbing away.
    const cosBank0 = Math.max(0.5, Math.cos(bank)), excess = freePull + (pushPull - freePull) * smoothstep(0, 0.7, bar) - 1;
    // (at skim speed the bar's own angle sits far above what level flight needs, so without this a small pull-in would do nothing)
    const pullNow = (1 / cosBank0 + excess * Math.pow(cosBank0, cfg.bankExcessPower)) * (1 - fineControl * Math.max(0, -bar));
    const alphaCap = cfg.zeroLiftAlpha + Math.max(0.05, pullNow * W / Math.max(1, qS)) / cfg.liftSlope;
    // Near the stall the pitch limit lets go: slow enough, the sail can be pushed right out (the flare, or a real stall).
    const capLetGo = 1 - smoothstep(1.0, 1.12, v / stallSpeed(0, cfg));
    alphaTarget -= cfg.pitchDamping * finite(state.pathRate) * (1 - smoothstep(0.1, 0.4, Math.abs(bar)));   // (free bar only: W and S act at once)
    alphaTarget = clamp(alphaTarget, cfg.alphaMin, Math.max(alphaCap + (cfg.alphaMax - alphaCap) * capLetGo * Math.max(0, bar), cfg.alphaMin));   // (the bar stops at alphaMin)
    // Terrain skimming (W held fast and low): the assist asks for a flight-path angle; the pilot flies it with the
    // bar, never past the stall and never beyond the pull the bar allows.
    let frequencyBoost = 0;
    if (assist) {
      const barIntent = pitchInput > 0.2 ? Math.max(bar, 0.6) : bar;
      const slow = smoothstep(1.7, 1.25, v / stall);
      const requested = typeof assist.clearance === 'function' ? assist.clearance(state) : assist.clearance;
      const base = Number.isFinite(requested) ? requested : 6.5;
      const skim = skimGuidance(state, { v, gamma, heading: state.heading, headingRate: finite(state.headingRate),
        windX: air.windX, windZ: air.windZ, lift: air.lift, bar: barIntent, command: gamma, surface, dt: step,
        pullAccel: (Math.min(cfg.loadLimit, 2.2) - 1) * g, hardPullAccel: (Math.min(cfg.loadLimit, 2.6) - 1) * g,
        maxClimb: 30 * DEG, maxDive: 45 * DEG, stallSpeed: stall }, { surfaceAt: world.surfaceAt, clearance: slow > 0 ? base + (3.8 - base) * slow : requested });
      const weightOn = Math.max(clamp(state.skimBlend, 0, 1), clamp(state.skimProtect, 0, 1)) * (input.field ? smoothstep(cfg.skimFadeSpeed * ks, cfg.skimFullSpeed * ks, v) : 1);
      // (the look-ahead command moves as the heading does; it is smoothed over a quarter second before it is flown)
      state.skimCommand = Number.isFinite(state.skimCommand) ? state.skimCommand + (skim.command - state.skimCommand) * (1 - Math.exp(-step / 0.25)) : skim.command;
      if (weightOn > 0.001) {
        const wantedRate = clamp((state.skimCommand - gamma) * 2.5, -1.2, 1.2);
        const n = clamp(Math.cos(gamma) + v * wantedRate / g, 0.15, Math.min(cfg.loadLimit, 2.6));
        const cl = clamp(n * W / (qS * Math.max(0.5, Math.cos(bank))), 0.05, clMax * 0.95);
        const alphaSkim = cfg.zeroLiftAlpha + cl / cfg.liftSlope;
        // Pulling out (S) always wins over the assist; the assist only ever adds angle to a bar held in.
        const blend = weightOn * (1 - smoothstep(0.15, 0.5, barIntent));
        alphaTarget = alphaTarget + (Math.max(alphaTarget, alphaSkim) - alphaTarget) * blend;
      }
      frequencyBoost = skim.frequencyBoost;
    } else {
      state.skimAssist = state.skimBlend = state.skimProtect = state.pullUpTurn = state.pullUpLead = 0;
      state.pullUp = false;
      state.pullUpReason = '';
    }
    state.alphaTarget = alphaTarget;

    // Pitch: the wing follows the bar through a lag and a rate limit.
    const alphaRate = pitchRate(state.alpha, alphaTarget, cfg) * (1 + frequencyBoost * 0.3);
    state.alpha = clamp(state.alpha + alphaRate * step, cfg.alphaMin - 2 * DEG, cfg.alphaMax + 5 * DEG);
    const alpha = state.alpha;

    // Stall flags from the angle of attack (the loaded stall speed follows from it).
    state.stallWarning = alpha > cfg.stallAlpha - cfg.stallWarnMargin;
    state.stalled = alpha > cfg.stallAlpha;

    // Forces.
    const wingHeight = clearance - cfg.footHeight + cfg.wingAboveBody;
    const sigma = groundEffectFactor(wingHeight, cfg);
    state.groundEffect = 1 - sigma;
    state.alphaRateSmooth = finite(state.alphaRateSmooth) + (Math.max(0, alphaRate) - finite(state.alphaRateSmooth)) * (1 - Math.exp(-step / 0.15));
    const CL = liftCoefficient(alpha, cfg) + cfg.dynamicLift * cfg.chord * state.alphaRateSmooth / Math.max(v, 3), CD = dragCoefficient(alpha, sigma, cfg) + cfg.uprightDrag * Math.max(clamp(finite(state.upright), 0, 1) * clamp(bar, 0, 1), Math.min(clamp(finite(state.upright), 0, 1), cfg.finalUpright), state.standing ? clamp(finite(state.upright), 0, 1) * cfg.standDrag : 0);
    const L = qS * CL + m * cfg.groundCushion * smoothstep(15 * ks, 25 * ks, v) * (1 - sigma) * Math.max(0, -v * Math.sin(gamma)), D = qS * CD;
    const n = L / W;
    state.loadFactor = n;
    const accel = -D / m - g * Math.sin(gamma);
    const cosBank = Math.cos(bank);
    const pathRate = (L * cosBank - W * Math.cos(gamma)) / (m * v);
    state.pathRate = pathRate;
    state.headingRate = -L * Math.sin(bank) / (m * v * Math.max(0.2, Math.cos(gamma)));
    state.sinkRate = D * v / W;   // the glide's own sink at this drag, m/s (energy dissipation)

    // Roll: weight shift toward the wanted bank, rate limited, with authority growing with airspeed.
    const stallBlend = smoothstep(cfg.stallAlpha - 2 * DEG, cfg.stallAlpha + 4 * DEG, alpha);
    const authority = clamp(v / barTargetSpeed(0, 0, cfg), cfg.rollAuthority[0], cfg.rollAuthority[1]) * (1 - (1 - cfg.stallRollFactor) * stallBlend) * (1 - (1 - cfg.uprightRoll) * clamp(finite(state.upright), 0, 1));
    const bankShare = cfg.slowBank + (1 - cfg.slowBank) * smoothstep(0.95, 1.3, v / stallSpeed(0, cfg));
    const bankTarget = bankWanted * bankShare;
    const w0 = cfg.rollFrequency * authority, rollError = bank - bankTarget, rollDecay = Math.exp(-w0 * step), rollSpring = (state.bankRate + w0 * rollError) * step;
    state.bank = clamp(bankTarget + (rollError + rollSpring) * rollDecay, -cfg.maxBank, cfg.maxBank);
    state.bankRate = (state.bankRate - w0 * rollSpring) * rollDecay;
    // The air's own roll: a falling lift curve (past a sharp stall) turns the tips' damping round, and the air's eddies give it a start.
    if (cfg.rollDamping > 0 || cfg.airRoughness > 0) {
      const trimV = barTargetSpeed(0, 0, cfg), da = 0.5 * DEG;
      const falling = Math.max(0, -(liftCoefficient(alpha + da, cfg) - liftCoefficient(alpha - da, cfg)) / (2 * da) / cfg.liftSlope);
      const eddy = Math.sin(state.x * 0.091 + state.z * 0.047 + 1.3) * Math.sin(state.x * 0.023 - state.z * 0.067 + 0.4) + 0.5 * Math.sin(state.x * 0.17 - state.z * 0.13 + 2.1);
      state.bankRate += (cfg.rollDamping * falling * (v / trimV) * state.bankRate + cfg.airRoughness * Math.min(1.5, v / trimV) * eddy) * step;
    }

    // Integrate speed and path (semi-implicit on the mean speed for an exact energy book).
    let nextSpeed = v + accel * step;
    let floorLift = 0;
    if (nextSpeed < cfg.minimumSpeed) {
      floorLift = (nextSpeed * nextSpeed - cfg.minimumSpeed * cfg.minimumSpeed) / (2 * g);
      nextSpeed = cfg.minimumSpeed;
    }
    const midPath = gamma + pathRate * step * 0.5;
    state.pathAngle = clamp(gamma + pathRate * step, -85 * DEG, 60 * DEG);
    const averageSpeed = (v + nextSpeed) * 0.5;
    state.airspeed = nextSpeed;
    state.energyExchange = (v * v - nextSpeed * nextSpeed) / (2 * g) / step;
    const verticalMove = (averageSpeed * Math.sin(midPath) + air.lift) * step + floorLift;
    const horizontalSpeed = averageSpeed * Math.cos(midPath);
    const midHeading = state.heading + state.headingRate * step * 0.5;
    state.heading = angle(state.heading + state.headingRate * step);
    const groundX = Math.sin(midHeading) * horizontalSpeed + air.windX;
    const groundZ = Math.cos(midHeading) * horizontalSpeed + air.windZ;
    state.x += groundX * step;
    state.z += groundZ * step;
    state.y += verticalMove;
    totalVertical += verticalMove;
    state.groundSpeed = Math.hypot(groundX, groundZ);
    state.thermalLift = air.thermalLift;
    state.ridgeLift = air.ridgeLift;
    state.lift = air.lift;
    state.windX = air.windX;
    state.windZ = air.windZ;

    // Flare bookkeeping for the landing score: the push-out that starts low is the flare; the height it gains
    // afterwards says whether it ballooned.
    const pushingOut = bar > 0.5 && previousBar <= 0.5;
    // (the last push-out is the flare: earlier taps were feathering)
    if (pushingOut && feet < cfg.flareWindow) {
      state.flarePressed = true; state.flareFeet = feet; state.flareRatio = v / stall; state.flareLow = feet; state.flareHigh = feet; state.flareStallFeet = NaN; state.flareBalloon = 0;
    }
    if (state.flarePressed) {
      state.flareHigh = Math.max(state.flareHigh, feet);
      if (!Number.isFinite(state.flareStallFeet) && alpha > cfg.stallAlpha) state.flareStallFeet = feet;
      // Ballooned: climbed well above where the push-out began, or stalled while still high up.
      state.flareBalloon = state.flareHigh - finite(state.flareFeet) > 1.8 || finite(state.flareStallFeet, 0) > 2.2 ? 1 : 0;
    }
    // The pilot goes upright as the bar comes out low with the ground coming up (the landing), and stays upright once there, through
    // a balloon too. Climbing away from the ground (a take-off with the bar still out from the run) the pilot stays prone.
    const closing = finite(state.groundClosing), approaching = closing > 0.2 || state.upright > 0.5;
    const onFinal = input.field && feet < cfg.uprightHeight && v < 1.7 * stall && bar > -0.1 && closing > -0.2 ? cfg.finalUpright : 0;
    state.standing = !!input.stand;   // (the pilot sitting up by choice, anywhere: Space)
    const wantUpright = state.standing ? 1 : feet < cfg.uprightHeight && bar > 0.15 && v < 1.7 * stall && approaching ? 1 : feet < 3 && state.upright > 0.5 ? 1 : onFinal;   // (not in a fast pull-out)
    state.upright = clamp(finite(state.upright) + (wantUpright - finite(state.upright)) * (1 - Math.exp(-step / 0.4)), 0, 1);
    // Presentation: how far the bar is pushed out past trim (the HUD's "flare" cue) and the drawn nose.
    state.flare = clamp((alpha - cfg.alphaTrim) / (cfg.alphaMax - cfg.alphaTrim), 0, 1);
    state.landing = 0; state.autoFlare = 0; state.floatWeight = clamp(1 - sigma, 0, 1) * (bar > -0.2 ? 1 : 0);
    const pitchTarget = clamp(state.pathAngle + alpha, -70 * DEG, 60 * DEG);
    const w = 9;
    state.pitchRate += (w * w * (pitchTarget - state.pitch) - 2 * w * state.pitchRate) * step;
    state.pitch += state.pitchRate * step;
  }
  state.verticalSpeed = totalVertical / duration;
  return state;
}

/** The glider's performance for a config: its polar and the speeds that matter, as plain functions. */
export function performance(cfg = GLIDER_DEFAULTS) {
  return Object.freeze({
    /** Stall speed, m/s, level or in a bank (rad). */
    stallSpeed: (bank = 0) => stallSpeed(bank, cfg),
    /** Trim airspeed, m/s, for a bar position (-1 in .. +1 out). */
    trimSpeed: (bar = 0, bank = 0) => barTargetSpeed(bar, bank, cfg),
    /** Still-air sink, m/s (positive down), of the steady glide at an airspeed. */
    sink: (airspeed, bank = 0) => sinkPolar(airspeed, bank, cfg),
    /** Steady still-air glide angle, rad (negative descending). */
    glideAngle: (airspeed, bank = 0) => glidePathAngle(airspeed, bank, cfg),
    /** Glide ratio (distance per height) in still air at an airspeed. */
    glideRatio: (airspeed, bank = 0) => Math.max(1, airspeed) / sinkPolar(airspeed, bank, cfg),
    /** The airspeed at which this angle of attack carries the weight in steady, level-winged flight (Infinity at zero lift). */
    steadySpeed: alpha => { const cl = liftCoefficient(alpha, cfg); return cl > 0 ? Math.sqrt(2 * weight(cfg) / (cfg.airDensity * cfg.wingArea * cl)) : Infinity; },
    /**
     * Static pitch stability: how fast (rad/s, + nose up) the wing pitches back toward its trim when it sits at this angle of
     * attack at the steady speed for it, with the bar held at bar. Zero at the trim; the steeper it falls through zero, the
     * stiffer the wing holds its trim.
     */
    pitchResponse: (alpha, bar = 0) => {
      const cl = liftCoefficient(alpha, cfg), v = cl > 0 ? Math.sqrt(2 * weight(cfg) / (cfg.airDensity * cfg.wingArea * cl)) : 60;
      return pitchRate(alpha, pitchTrimAlpha(bar, Math.min(v, 60), cfg), cfg);
    },
    liftCoefficient: alpha => liftCoefficient(alpha, cfg),
    dragCoefficient: (alpha, sigma = 1) => dragCoefficient(alpha, sigma, cfg),
  });
}

/**
 * Ground contact too fast to land, but light and wings level: skips the wing off the ground and takes speed for it.
 * contact: { verticalSpeed (into the ground), groundSpeed, slope, bank }; rules: LANDING_RULES or a variant of them.
 * Returns true when it scraped; the flight then carries on.
 */
export function scrapeGround(state, contact, groundHeight, rules = LANDING_RULES, cfg = GLIDER_DEFAULTS) {
  const sink = Math.max(0, finite(contact.verticalSpeed));
  if (!(sink < cfg.scrapeSink) || Math.abs(finite(contact.groundSpeed)) < rules.roughTouchdown.ground || !(finite(contact.slope, 1) < rules.maxTouchdownSlope) || Math.abs(finite(contact.bank)) > rules.maxTouchdownBank) return false;
  state.airspeed = Math.max(rules.roughTouchdown.ground * 0.9, state.airspeed - (0.5 + sink * 1.5));
  const up = Math.max(0.3, sink * 0.3);
  state.pathAngle = Math.asin(clamp(up / state.airspeed, 0, 0.3));
  state.verticalSpeed = up; state.y = groundHeight + cfg.footHeight + 0.02;
  return true;
}

/** The force model, as a flight model for createGlider (see models.js for the interface). */
export const forceModel = Object.freeze({
  name: 'force',
  defaults: GLIDER_DEFAULTS,
  createState: createFlightState,
  step: stepFlight,
  performance,
  scrape: scrapeGround,
});
