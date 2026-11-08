/**
 * The classic model: the older, simpler, energy-based flight model, kept for side-by-side comparison with the force model
 * (createGlider({ model: classicModel })). Its numbers are fixed (CLASSIC_DEFAULTS); a config passed to it is validated but
 * not used, and it samples the world's air with its own original ridge-lift formula. Metres, seconds, radians.
 * Positive roll banks right; this scene's right turn decreases heading.
 *
 * Lateral: a critically damped roll spring toward the bank target and a coordinated turn rate g·tan(bank)/v.
 * Longitudinal (energy based): the bar sets a TARGET airspeed. The flight-path angle (pathAngle, relative to the air)
 * follows a command through a critically damped second-order filter with limits on path-angle acceleration and on
 * normal acceleration (pull-up and push-over g). Airspeed changes only through gravity along the path and drag:
 *   dv/dt = -g·sin(gamma) - D,   D = g·sink(v, bank)/v (+ dissipative extras)
 * so a steady glide reproduces the sink polar exactly and nothing (bar pumping, flaring, skimming) can create energy
 * in still air: d(y + v²/2g)/dt = lift - v·D/g. Dives build speed, pull-outs zoom-climb, and climbs cost speed.
 * No rendering, collisions or external dependencies; terrain following lives in assists/terrain-skimming.js.
 */
import { skimGuidance } from '../assists/terrain-skimming.js';
import { tryWheelScrape } from '../contact.js';

const DEG = Math.PI / 180;
export const CLASSIC_DEFAULTS = Object.freeze({
  gravity: 9.81,
  // Bar -> target airspeed: full bar in (W) 30 m/s, building toward 46 m/s while a deep dive is held (drag caps the
  // real speed near 45 m/s on the 40 degree dive limit); neutral trims at 15 m/s; full flare (S) slows to 10.5 m/s,
  // just above the 9.3 m/s stall. In a bank the target never drops below 1.2x the loaded stall speed (unless flaring).
  // The build only applies past diveBuildBar of bar travel and saturates within diveBuildEnd seconds, so a steady
  // analog bar settles on a steady speed instead of creeping.
  trimSpeed: 15,
  diveSpeed: 30,
  maxDiveSpeed: 46,
  diveBuildStart: 1,
  diveBuildEnd: 5,
  diveBuildBar: 0.6,
  flareSpeed: 10.5,
  turnSpeedMargin: 1.2,
  minimumSinkSpeed: 12,
  minimumSink: 0.95,
  polarCurvature: 0.014,
  maxBank: 55 * DEG,
  rollFrequency: 2.4,
  hardRollFrequency: 2.5,
  stallSpeed: 9.3,
  // Extra dissipative drag in steep turns (m/s² at load factor 2), forgiven in strong lift so thermal circles climb.
  turnDrag: 1.0,
  // Above 34 m/s the sail and the pilot's body drag rises steeply: steady full dive near 45 m/s, long downhill skims
  // stay below ~50 m/s.
  highSpeedStart: 34,
  highSpeedDrag: 0.025,
  // Speed loop: path angle per m/s of speed error, with a short prediction so zooms and dives settle without overshoot.
  speedGain: 0.065,
  speedLead: 0.4,
  maxClimbAngle: 30 * DEG,
  maxDiveAngle: 40 * DEG,
  // Path-angle filter: critically damped, 3 rad/s, with an acceleration cap (rad/s²) and normal-acceleration limits:
  // 2 g pull-up (2.4 g with S held hard), 0.25 g push-over (a brief light, floating moment as W tips the nose over;
  // 0.15 g when stalled, so the nose drops).
  pathFrequency: 3,
  pathAccelMax: 2.6,
  pullG: 2,
  hardPullG: 2.4,
  pushG: 0.25,
  stallPushG: 0.15,
  // Partial bar: how far below the steady glide the nose may go to gain speed is maxDiveAngle times the square of the
  // bar travel, never less than minDiveShare of it (so half a bar dives about 16 degrees, not 22, before settling).
  minDiveShare: 0.3,
  // Keyboard bar is binary: slew it so the target never jumps (0 -> 1 in 0.3 s, back in 0.25 s).
  barRise: 1 / 0.3,
  barReturn: 1 / 0.25,
  // Ground effect: sink reduced up to 40% when the wing is within about half a span of the surface.
  groundEffect: 0.4,
  groundEffectFull: 2.8,
  groundEffectEnd: 7,
  // Landing (S held low over landable ground): a steeper high-drag approach, then a flare that arrests the sink in
  // ground effect while the sail bleeds speed, settling to touchdown at walking pace.
  landingHeight: 40,
  landingSpeed: 11.5,
  approachSink: 2.6,
  landingDrag: 1.6,
  flareDrag: 5,
  flareStart: 4.2,
  flareEnd: 1.2,
  flareSinkMin: 0.45,
  flareSinkRate: 0.7,
  flareSettle: 0.8,
  // Seconds of look-ahead on the ground rising toward the glider (uphill approaches round out earlier).
  flareRiseLook: 1.3,
  // Neutral bar just above landable ground: a gentle automatic round-out (this share of a full flare).
  autoFlare: 0.6,
  footHeight: 2.4,
  // Touchdown judgement (vertical contact speed and ground speed), see judgeTouchdown. A rough landing (a gentle sink
  // but a fast skid-in, e.g. no flare at trim with a tailwind) scuffs the battens instead of breaking the frame.
  softTouchdown: { vertical: 1.8, ground: 10 },
  firmTouchdown: { vertical: 3.5, ground: 14 },
  roughTouchdown: { vertical: 2.5, ground: 19 },
  maxTouchdownSlope: 0.45,
  maxTouchdownBank: 0.42,
  // Visual nose angle = path angle + angle of attack (from speed and load) + flare pitch-up, smoothed.
  trimAlpha: 4.5 * DEG,
  pitchFrequency: 7,
  gradientSample: 48,
  ridgeDecayHeight: 350,
  maxRidgeLift: 7,
  maxThermalLift: 7,
  thermalFadeStart: 3900,
  thermalCeiling: 4400,
  minimumSpeed: 2.5,
  maxFrameTime: 0.25,
  maxStep: 1 / 120,
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
const angle = (value) => Math.atan2(Math.sin(value), Math.cos(value));

/** Positive downward speed through still air. Bank increases wing loading. */
export function sinkPolar(airspeed, bank = 0) {
  const cfg = CLASSIC_DEFAULTS;
  const load = 1 / Math.max(0.5, Math.cos(bank));
  const adjustedSpeed = Math.max(0, airspeed) / Math.sqrt(load);
  const speedError = adjustedSpeed - cfg.minimumSinkSpeed;
  return Math.pow(load, 1.5) * (cfg.minimumSink + cfg.polarCurvature * speedError * speedError);
}

/** Steady still-air glide angle (negative = descending) at an airspeed and bank. */
export function glidePathAngle(airspeed, bank = 0) {
  const v = Math.max(1, airspeed);
  return -Math.asin(clamp(sinkPolar(v, bank) / v, 0, 0.99));
}

/** Target airspeed for a bar position (-1 full dive .. +1 full flare), a held-dive time and the loaded stall speed. */
export function barTargetSpeed(bar, diveHold = 0, stallSpeed = CLASSIC_DEFAULTS.stallSpeed) {
  const cfg = CLASSIC_DEFAULTS;
  let speed;
  if (bar < 0) {
    const d = -bar;
    speed = cfg.trimSpeed + d * (cfg.diveSpeed - cfg.trimSpeed) + smoothstep(cfg.diveBuildBar, 1, d)
      * (cfg.maxDiveSpeed - cfg.diveSpeed) * smoothstep(cfg.diveBuildStart, cfg.diveBuildEnd, diveHold);
  } else speed = cfg.trimSpeed - bar * (cfg.trimSpeed - cfg.flareSpeed);
  // Pilots speed up to bank steeply; a deliberate flare can still stall a turn.
  return Math.max(speed, cfg.turnSpeedMargin * stallSpeed * (1 - Math.max(0, bar)));
}

/** Initial airborne state; set x/y/z/heading to the chosen launch location. */
export function createSoaringState(overrides = {}) {
  const cfg = CLASSIC_DEFAULTS;
  const speed = finite(overrides.airspeed, cfg.trimSpeed);
  const path = finite(overrides.pathAngle, glidePathAngle(speed));
  const sink = sinkPolar(speed);
  const pitch = path + alphaFor(speed, 1, 0);
  return Object.assign({
    x: 0, y: 1700, z: 0, heading: 0,
    bank: 0, bankRate: 0, pitch, pitchRate: 0, visualBank: 0,
    airspeed: speed, pathAngle: path, pathRate: 0, bar: 0, diveHold: 0,
    verticalSpeed: speed * Math.sin(path),
    lift: 0, thermalLift: 0, ridgeLift: 0,
    sinkRate: sink, windX: 0, windZ: 0, groundSpeed: speed * Math.cos(path),
    stallWarning: false, stalled: false, stallRatio: speed / cfg.stallSpeed, stallSpeed: cfg.stallSpeed,
    skimAssist: 0, skimBlend: 0, skimProtect: 0, pullUp: false, pullUpReason: '', pullUpTurn: 0, pullUpLead: 0,
    groundEffect: 0, landing: 0, autoFlare: 0, flare: 0, energyExchange: 0,
  }, overrides);
}

function terrainAt(environment, x, z) {
  return environment.terrainHeight ? finite(environment.terrainHeight(x, z)) : 0;
}

/**
 * Sample vertical air motion. Thermals stay anchored to authored locations so
 * scene cues match the usable lift. Horizontal wind advects the glider.
 */
export function sampleSoaringAir(x, y, z, environment = {}) {
  const cfg = CLASSIC_DEFAULTS;
  const windX = finite(environment.wind?.x);
  const windZ = finite(environment.wind?.z);
  const groundHeight = terrainAt(environment, x, z);
  const aboveGround = Math.max(0, y - groundHeight);
  const thermalCeiling = finite(environment.thermalCeiling, cfg.thermalCeiling);
  const thermalFadeStart = Math.min(thermalCeiling - 1,
    finite(environment.thermalFadeStart, Math.min(cfg.thermalFadeStart, thermalCeiling - 500)));
  let thermalLift = 0;
  for (const thermal of environment.thermals || []) {
    if (!Number.isFinite(thermal.x) || !Number.isFinite(thermal.z)) continue;
    const radius = Math.max(20, finite(thermal.radius, 180));
    const strength = clamp(finite(thermal.strength), 0, cfg.maxThermalLift);
    const dx = x - thermal.x;
    const dz = z - thermal.z;
    thermalLift += strength * Math.exp(-(dx * dx + dz * dz) / (2 * radius * radius));
  }
  thermalLift = Math.min(cfg.maxThermalLift, thermalLift)
    * (1 - smoothstep(thermalFadeStart, thermalCeiling, y))
    * (0.12 + 0.88 * smoothstep(15, 180, aboveGround));

  let ridgeLift = 0;
  if (environment.terrainHeight && (windX !== 0 || windZ !== 0)) {
    const distance = cfg.gradientSample;
    const gradientX = (terrainAt(environment, x + distance, z)
      - terrainAt(environment, x - distance, z)) / (2 * distance);
    const gradientZ = (terrainAt(environment, x, z + distance)
      - terrainAt(environment, x, z - distance)) / (2 * distance);
    // Wind is the direction the air travels toward, so uphill flow is positive.
    const uphillFlow = Math.max(0, windX * gradientX + windZ * gradientZ);
    ridgeLift = Math.min(cfg.maxRidgeLift, uphillFlow)
      * Math.exp(-aboveGround / cfg.ridgeDecayHeight);
  }
  return { thermalLift, ridgeLift, lift: thermalLift + ridgeLift,
    windX, windZ, groundHeight, aboveGround };
}

/** Angle of attack for the drawn wing: larger when slow or loaded, small in a fast dive. */
function alphaFor(speed, load, landingAlpha) {
  const cfg = CLASSIC_DEFAULTS;
  const ratio = cfg.trimSpeed / Math.max(3, speed);
  return clamp(cfg.trimAlpha * load * ratio * ratio, 0.5 * DEG, 16 * DEG) + landingAlpha;
}

/**
 * Touchdown judgement. verticalSpeed: speed into the ground (m/s, positive down; pass the contact speed on a slope),
 * groundSpeed: horizontal speed over the ground. Returns 'soft', 'firm', 'rough' or 'crash'.
 */
export function judgeTouchdown({ verticalSpeed = 0, groundSpeed = 0, slope = 0, bank = 0 } = {}) {
  const cfg = CLASSIC_DEFAULTS;
  const vertical = Math.max(0, finite(verticalSpeed)), ground = Math.abs(finite(groundSpeed));
  if (!(finite(slope, 1) < cfg.maxTouchdownSlope) || Math.abs(finite(bank)) > cfg.maxTouchdownBank) return 'crash';
  if (vertical < cfg.softTouchdown.vertical && ground < cfg.softTouchdown.ground) return 'soft';
  if (vertical < cfg.firmTouchdown.vertical && ground < cfg.firmTouchdown.ground) return 'firm';
  if (vertical < cfg.roughTouchdown.vertical && ground < cfg.roughTouchdown.ground) return 'rough';
  return 'crash';
}

/**
 * Mutates and returns state.
 * input.roll: A/left=-1, D/right=+1. input.pitch (bar): W/dive=-1, S/flare=+1. input.landable: false over ground
 * that cannot be landed on (water, buildings, steep slopes) so S there is an ordinary flare. input.ground: true when
 * the ground just below is landable (enables the neutral-bar auto round-out; leave it out to disable that).
 * environment: { terrainHeight(x,z), thermals:[{x,z,radius,strength}], wind:{x,z}, terrainSkimming, skimHeight(x,z),
 * skimClearance }.
 * A long frame is capped at 0.25 seconds; call repeatedly for offline simulation.
 */
export function stepSoaring(state, input = {}, dt = 0, environment = {}) {
  const cfg = CLASSIC_DEFAULTS, g = cfg.gravity;
  if (!Number.isFinite(dt) || dt <= 0) return state;
  for (const key of ['x', 'y', 'z', 'heading', 'bank', 'bankRate', 'pitch', 'pitchRate', 'pathRate', 'bar',
    'diveHold', 'skimAssist', 'skimBlend', 'skimProtect', 'landing', 'autoFlare', 'flare']) {
    state[key] = finite(state[key]);
  }
  state.airspeed = Math.max(1, finite(state.airspeed, cfg.trimSpeed));
  state.pathAngle = finite(state.pathAngle, glidePathAngle(state.airspeed, state.bank));
  const rollInput = clamp(finite(input.roll), -1, 1);
  const pitchInput = clamp(finite(input.pitch), -1, 1);
  const landable = input.landable !== false, groundLandable = input.ground === true;
  const freeBankTarget = Math.sign(rollInput) * Math.pow(Math.abs(rollInput), 1.65) * cfg.maxBank;
  const surfaceAt = environment.skimHeight || environment.terrainHeight;
  const duration = Math.min(dt, cfg.maxFrameTime);
  const count = Math.ceil(duration / cfg.maxStep);
  const step = duration / count;
  let totalVertical = 0;

  for (let index = 0; index < count; index++) {
    // Bar slew: moving away from neutral at barRise, back toward (and through) neutral at barReturn.
    const away = Math.abs(pitchInput) > Math.abs(state.bar) && pitchInput * state.bar >= 0;
    const slew = (away ? cfg.barRise : cfg.barReturn) * step;
    state.bar = clamp(state.bar + clamp(pitchInput - state.bar, -slew, slew), -1, 1);
    const bar = state.bar;
    state.diveHold = bar < -0.3 ? Math.min(cfg.diveBuildEnd + 1, state.diveHold + step)
      : Math.max(0, state.diveHold - 3 * step);

    const v = state.airspeed, gamma = state.pathAngle;
    const air = sampleSoaringAir(state.x, state.y, state.z, environment);
    const surface = surfaceAt ? Math.max(air.groundHeight, finite(surfaceAt(state.x, state.z), air.groundHeight))
      : air.groundHeight;
    const clearance = state.y - surface, feet = finite(input.contactClearance, clearance - cfg.footHeight);
    const verticalNow = v * Math.sin(gamma) + air.lift;

    // Landing: S held low over landable ground at approach speed. flare = round-out weight near the ground.
    const wantsLanding = bar > 0.2 && landable && clearance < cfg.landingHeight && state.skimAssist < 0.5;
    const landingTarget = wantsLanding ? 1 - smoothstep(17, 21, v) : 0;
    state.landing = clamp(state.landing + clamp(landingTarget - state.landing, -1.5 * step, step), 0, 1);
    // Neutral bar sinking onto landable ground: a gentle automatic round-out, so a glide-in settles instead of
    // skidding in at trim speed.
    const autoTarget = groundLandable && Math.abs(bar) < 0.25 && state.skimAssist < 0.3 && !state.stalled
      ? cfg.autoFlare * (1 - smoothstep(2.5, 5.5, feet)) * (1 - smoothstep(17, 21, v)) : 0;
    state.autoFlare = clamp(state.autoFlare + clamp(autoTarget - state.autoFlare, -2 * step, 1.2 * step), 0, 1);
    const landing = state.landing, rounding = Math.max(landing, state.autoFlare);
    // Ground rising toward the glider along its track brings the round-out forward (uphill approaches); ground
    // falling away is followed down by the flare (downhill approaches), so both settle onto the slope.
    let terrainRate = 0;
    if (rounding > 0) {
      const ground = v * Math.cos(gamma), tx = Math.sin(state.heading) * ground + air.windX,
        tz = Math.cos(state.heading) * ground + air.windZ, look = 0.6;
      // (bounded to slope-like rates: a pad's cliff edge ahead is not a slope to follow down)
      terrainRate = clamp((terrainAt(environment, state.x + tx * look, state.z + tz * look) - air.groundHeight) / look, -4, 8);
    }
    const predictedFeet = feet + Math.min(0, verticalNow) * 0.35 - cfg.flareRiseLook * Math.max(0, terrainRate);
    state.flare = rounding * (1 - smoothstep(cfg.flareEnd, cfg.flareStart, predictedFeet));
    const flare = state.flare, deliberateFlare = flare > 0.3;

    // Roll (critically damped spring). Skimming keeps weight-shift steering with a shallower wing; a landing
    // flare close to the ground levels the wings.
    // The shallow skim bank only applies while genuinely skimming low, and never during a PULL UP (turning away is
    // the escape).
    const skimSteering = environment.terrainSkimming && !state.pullUp ? clamp(state.skimAssist, 0, 1) : 0;
    const levelling = 0.85 * rounding * (1 - smoothstep(4, 14, feet));
    const bankTarget = freeBankTarget * (1 - skimSteering * (1 - 28 / 55)) * (1 - levelling);
    const rollFrequency = (cfg.rollFrequency + (cfg.hardRollFrequency - cfg.rollFrequency)
      * smoothstep(0.2, 1, Math.abs(rollInput))) * (state.stalled ? 0.55 : 1);
    const error = state.bank - bankTarget;
    const decay = Math.exp(-rollFrequency * step);
    const spring = (state.bankRate + rollFrequency * error) * step;
    state.bank = bankTarget + (error + spring) * decay;
    state.bankRate = (state.bankRate - rollFrequency * spring) * decay;
    state.bank = clamp(state.bank, -cfg.maxBank, cfg.maxBank);

    // Stall: lift collapses below the loaded stall speed; a deliberate landing flare at the ground is exempt.
    const load = 1 / Math.max(0.5, Math.cos(state.bank));
    state.stallSpeed = cfg.stallSpeed * Math.sqrt(load);
    state.stallRatio = v / state.stallSpeed;
    if (deliberateFlare) state.stalled = state.stallWarning = false;
    else {
      state.stallWarning = state.stallRatio < 1.12;
      state.stalled = state.stalled ? state.stallRatio < 1.12 : state.stallRatio < 0.98;
    }
    const stallDepth = deliberateFlare ? 0 : 1 - smoothstep(0.75, 1.12, state.stallRatio);

    // Drag. Everything here is dissipative: it can only remove energy.
    state.groundEffect = 1 - smoothstep(cfg.groundEffectFull, cfg.groundEffectEnd, clearance);
    const polar = sinkPolar(v, state.bank) * (1 - cfg.groundEffect * state.groundEffect);
    const stallSink = (state.stalled ? 1 : 0) + 2.5 * stallDepth;
    const turnDrag = cfg.turnDrag * (load - 1) * (load - 1) * (1 - smoothstep(2, 5, air.lift));
    const fast = Math.max(0, v - cfg.highSpeedStart);
    // The approach airbrake holds at least approachSink of descent, cancelling up to 2 m/s of lift so a pad in a
    // thermal skirt can still be landed on, and steepening to follow ground that falls away (downhill approaches).
    const approachDrag = Math.max(cfg.landingDrag,
      g * (cfg.approachSink + clamp(air.lift, 0, 2) + Math.max(0, -terrainRate) - polar) / v);
    // The flaring sail is an air brake: its drag falls with the square of the airspeed, so the glider settles
    // toward walking pace instead of stopping in the air.
    const flareDrag = cfg.flareDrag * Math.min(1, (v / 8) * (v / 8));
    const landingDrag = landing * (1 - flare) * approachDrag + rounding * flare * flareDrag;
    // The polar describes flight with lift equal to weight. Below ~0.9x the stall speed a wing no longer carries the
    // glider (the path angle drops instead), so its drag falls with the square of the airspeed from there.
    const reference = Math.max(v, 0.9 * state.stallSpeed), lowSpeed = (v / reference) * (v / reference);
    const drag = g * (polar + stallSink) / reference * lowSpeed + turnDrag + cfg.highSpeedDrag * fast * fast + landingDrag;
    state.sinkRate = drag * v / g;

    // Free-flight command: the path angle that holds the target speed (steady glide) corrected by the speed error.
    const steady = -Math.asin(clamp(drag / g, 0, 0.99));
    let targetSpeed = barTargetSpeed(bar, state.diveHold, state.stallSpeed);
    targetSpeed += (cfg.landingSpeed - targetSpeed) * landing * (1 - flare);
    const acceleration = -g * Math.sin(gamma) - drag;
    // Partial bar limits how far below the steady glide the nose may go to gain speed (measured from the steady path,
    // so landing drag and turns keep their steeper glide): half a bar is a gentle dive, not a deep nose-over.
    const diveLimit = Math.min(cfg.maxDiveAngle, cfg.maxDiveAngle * Math.max(cfg.minDiveShare, -bar * Math.abs(bar)) - steady);
    const free = clamp(steady - cfg.speedGain * (targetSpeed - (v + acceleration * cfg.speedLead)),
      -diveLimit, cfg.maxClimbAngle);
    let command = free;
    let pullG = cfg.pullG + (cfg.hardPullG - cfg.pullG) * smoothstep(0.5, 1, bar) * (1 - landing);
    let frequency = cfg.pathFrequency;

    if (environment.terrainSkimming) {
      const skim = skimGuidance(state, { v, gamma, heading: state.heading, headingRate: finite(state.headingRate),
        windX: air.windX, windZ: air.windZ, lift: air.lift, bar, command, surface, dt: step,
        pullAccel: (cfg.pullG - 1) * g, hardPullAccel: (cfg.hardPullG - 1) * g,
        maxClimb: cfg.maxClimbAngle, maxDive: cfg.maxDiveAngle,
        stallSpeed: state.stallSpeed }, { surfaceAt: environment.skimHeight || environment.terrainHeight,
        clearance: typeof environment.skimClearance === 'function' ? environment.skimClearance(state) : environment.skimClearance });
      // The assist may spend speed on climbs, but never below 1.2x the stall speed: it cannot stall the wing.
      const energyCap = steady - cfg.speedGain * (1.2 * state.stallSpeed - (v + acceleration * cfg.speedLead));
      command = Math.min(skim.command, Math.max(energyCap, free));
      frequency += skim.frequencyBoost;
    } else {
      state.skimAssist = state.skimBlend = state.skimProtect = state.pullUpTurn = state.pullUpLead = 0;
      state.pullUp = false;
      state.pullUpReason = '';
    }
    if (state.stalled) command = Math.min(command, -24 * DEG);

    // Landing round-out: an exponential flare law on the feet height arrests the sink in ground effect; below
    // the stall speed the wing settles a little faster.
    if (flare > 0) {
      const settle = cfg.flareSettle * Math.max(0, 1 - v / cfg.stallSpeed);
      const flareSink = cfg.flareSinkMin + cfg.flareSinkRate * Math.max(0, predictedFeet) + settle;
      const flarePath = Math.asin(clamp((Math.min(0, terrainRate) - flareSink - air.lift) / Math.max(v, 3), -0.6, 0.35));
      if (state.autoFlare > landing) {
        // Automatic round-out: hold a gentle, slowing descent onto the ground (never steeper than the glide now, and
        // never below the free path) while the sail bleeds speed.
        const autoSink = clamp(cfg.flareSinkMin + 0.35 * Math.max(0, predictedFeet), cfg.flareSinkMin,
          Math.max(cfg.flareSinkMin, -verticalNow));
        const autoPath = Math.asin(clamp((-autoSink - air.lift) / Math.max(v, 3), -0.6, 0.35));
        command = Math.max(command, command + (autoPath - command) * Math.min(1, flare / cfg.autoFlare));
      } else command += (flarePath - command) * flare;
      pullG = Math.max(pullG, 2);
    }

    // Critically damped path-angle filter with an acceleration cap and normal-acceleration limits.
    const pushG = state.stalled ? cfg.stallPushG : cfg.pushG;
    const pathAccel = clamp(frequency * frequency * (command - gamma) - 2 * frequency * state.pathRate,
      -cfg.pathAccelMax, cfg.pathAccelMax);
    state.pathRate += pathAccel * step;
    const cosine = Math.cos(gamma);
    state.pathRate = clamp(state.pathRate, (pushG - cosine) * g / v, (pullG - cosine) * g / v);
    const midPath = gamma + state.pathRate * step * 0.5;
    state.pathAngle = clamp(gamma + state.pathRate * step, -75 * DEG, 50 * DEG);

    // Energy: speed changes only through gravity along the path and drag. Position uses the same mid-step path
    // angle and mean speed, so the discrete update dissipates exactly v·D/g per second.
    let nextSpeed = v + (-g * Math.sin(midPath) - drag) * step;
    let floorLift = 0;
    if (nextSpeed < cfg.minimumSpeed) {
      // Never create speed from nothing: a floor on airspeed is paid for with height.
      floorLift = (nextSpeed * nextSpeed - cfg.minimumSpeed * cfg.minimumSpeed) / (2 * g);
      nextSpeed = cfg.minimumSpeed;
    }
    const averageSpeed = (v + nextSpeed) * 0.5;
    state.airspeed = nextSpeed;
    state.energyExchange = (v * v - nextSpeed * nextSpeed) / (2 * g) / step;
    const verticalMove = (averageSpeed * Math.sin(midPath) + air.lift) * step + floorLift;
    const horizontalSpeed = averageSpeed * Math.cos(midPath);
    state.headingRate = -g * Math.tan(state.bank) / Math.max(averageSpeed, 1) * (1 - 0.65 * stallDepth);
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

    // Drawn nose angle: path + angle of attack (+ the landing flare's pitch-up), through a light second-order
    // smoother so it never steps.
    const normalLoad = load * Math.max(0, Math.cos(state.pathAngle) + nextSpeed * state.pathRate / g);
    const pitchTarget = clamp(state.pathAngle + alphaFor(nextSpeed, normalLoad, rounding * (6 * DEG + 18 * DEG * flare)),
      -60 * DEG, 38 * DEG);
    const w = cfg.pitchFrequency;
    state.pitchRate += (w * w * (pitchTarget - state.pitch) - 2 * w * state.pitchRate) * step;
    state.pitch += state.pitchRate * step;
  }
  state.verticalSpeed = totalVertical / duration;
  return state;
}

/**
 * The classic model as a flight model for createGlider. Input: roll, pitch, landable (false over ground that cannot be landed
 * on), field (low over landable ground: the neutral-bar round-out). skim: the terrain-skimming assist's options, or null.
 */
export const classicModel = Object.freeze({
  name: 'classic',
  defaults: CLASSIC_DEFAULTS,
  createState: init => createSoaringState(init),
  step(state, input = {}, dt, world, cfg, skim = null) {
    const environment = {
      terrainHeight: world.heightAt, skimHeight: world.surfaceAt, thermals: world.thermals,
      wind: world.windAt(state.x, state.y, state.z),
      thermalCeiling: world.config.thermalCeiling, thermalFadeStart: world.config.thermalFadeStart,
      terrainSkimming: !!skim, skimClearance: skim?.clearance,
    };
    return stepSoaring(state, { roll: input.roll, pitch: input.pitch, landable: input.landable,
      ground: input.field, contactClearance: input.contactClearance }, dt, environment);
  },
  scrape(state, contact, ground, rules, cfg) {
    const stall = classicModel.performance().stallSpeed(contact.bank);
    return tryWheelScrape(state, contact, ground + cfg.footHeight, stall, rules);
  },
  performance: () => Object.freeze({
    stallSpeed: (bank = 0) => CLASSIC_DEFAULTS.stallSpeed / Math.sqrt(Math.max(0.5, Math.cos(bank))),
    trimSpeed: (bar = 0) => barTargetSpeed(bar),
    sink: (airspeed, bank = 0) => sinkPolar(airspeed, bank),
    glideAngle: (airspeed, bank = 0) => glidePathAngle(airspeed, bank),
    glideRatio: (airspeed, bank = 0) => Math.max(1, airspeed) / sinkPolar(airspeed, bank),
  }),
});
