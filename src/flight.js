/**
 * Hang glider flight model for Above. Metres, seconds, radians. A force model, not a controller:
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
 * No rendering, collisions or external dependencies; terrain following lives in terrain-skimming.js.
 */
import { skimGuidance } from './terrain-skimming.js';

const DEG = Math.PI / 180;
export const SOARING_DEFAULTS = Object.freeze({
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
  plateLift: 1.4,                  // the sail keeps lifting past the stall: a mush, not a break (a game-friendly value)                  // flat-plate lift scale (CL = plateLift * 2 sin a cos a)
  plateDrag: 1.0,                  // flat-plate drag scale (CD = plateDrag * 2 sin^2 a)
  // Drag: parasite (wing, pilot, wires) plus induced; oswald efficiency.
  cd0: 0.028,                      // matches the original model's sink at speed, so a skim carries its momentum
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
  // Stall warning this many degrees below the stall.
  stallWarnMargin: 2.5 * DEG,
  // Air.
  gradientSample: 48,
  ridgeDecayHeight: 350,
  // Ridge lift is the wind following the slope: its uphill part times the sine of the slope. Near the ground the wind is
  // slower (wind shear: full speed from ridgeShearHeight up, falling as (height / ridgeShearHeight)^ridgeShearExp below), so
  // a slope that holds a wing at ridge height will not hold it a few metres off the ground. Behind a slope the air sinks.
  ridgeShearHeight: 80,
  ridgeShearExp: 0.5,
  leeSink: 0.5,             // share of the windward lift that sinks on a lee slope
  maxRidgeLift: 7,
  maxThermalLift: 7,
  thermalFadeStart: 3900,
  thermalCeiling: 4400,
  // Touchdown judgement (vertical contact speed and ground speed), see judgeTouchdown. A flared touchdown is near
  // 3-5 m/s airspeed, so the ground speed is set by the wind.
  // (the pilot's legs take a 2 m/s step-down; beyond 3.6 m/s the frame does)
  softTouchdown: { vertical: 2.2, ground: 8.6 },
  firmTouchdown: { vertical: 4.8, ground: 10.5 },
  roughTouchdown: { vertical: 2.8, ground: 19 },
  maxTouchdownSlope: 0.45,
  maxTouchdownBank: 0.42,
  footHeight: 2.4,
  // Landing score (scoreLanding).
  landingPoints: { soft: 300, firm: 150, rough: 50, crash: 0, headwind: 250, bullseye: 500, inner: 300, outer: 150, pad: 60, noStep: 300 },
  noStepTouchdown: { vertical: 2.2, ground: 3.8 },
  // Downwind the ground speed is the airspeed plus the wind, and few pilots can run that out. Above tailwindFree (m/s) only a
  // well flared, slow touchdown survives: airspeed under tailwindAirspeed, less tailwindSlope per m/s of extra tailwind.
  tailwindFree: 1, tailwindAirspeed: 8.5, tailwindSlope: 0.5,
  // A light touch at speed is a scrape, not a crash: under scrapeSink m/s of sink, wings about level and too fast to land, the
  // wing skips off the ground and pays in speed. Anything harder, steeper or banked still crashes.
  scrapeSink: 4.5,
  bullseyeRadius: 6,
  innerRingRadius: 15,
  outerRingRadius: 30,
  // Flare bookkeeping: a push-out that starts this low counts as the flare.
  flareWindow: 6,
  minimumSpeed: 2,
  maxFrameTime: 0.25,
  maxStep: 1 / 120,
});

// The live tuning: SOARING_DEFAULTS plus whatever tuneSoaring() has changed (the range's sliders).
let tuning = { ...SOARING_DEFAULTS };
/** Override tuning values at runtime (numbers only); tuneSoaring() with no argument restores the defaults. */
export function tuneSoaring(patch) {
  if (!patch) { tuning = { ...SOARING_DEFAULTS }; return tuning; }
  for (const [key, value] of Object.entries(patch)) if (key in SOARING_DEFAULTS && Number.isFinite(value)) tuning[key] = value;
  return tuning;
}
export function getSoaringTuning() { return tuning; }

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
const angle = (value) => Math.atan2(Math.sin(value), Math.cos(value));

/* ---------- aerodynamics ---------- */
const weight = cfg => cfg.mass * cfg.gravity;
const inducedK = cfg => 1 / (Math.PI * cfg.oswald * (cfg.span * cfg.span / cfg.wingArea));
/** Lift coefficient: linear to the stall, blended into the flat plate beyond it. */
export function liftCoefficient(alpha, cfg = tuning) {
  const linear = cfg.liftSlope * (Math.min(alpha, cfg.stallAlpha) - cfg.zeroLiftAlpha);
  const w = smoothstep(cfg.stallAlpha, cfg.stallAlpha + cfg.stallBlend, alpha);
  const plate = cfg.plateLift * 2 * Math.sin(alpha) * Math.cos(alpha);
  return Math.max(0, (1 - w) * linear + w * plate);
}
/** Drag coefficient: parasite, induced (reduced in ground effect, sigma 0..1) and the stalled sail's plate drag. */
export function dragCoefficient(alpha, sigma = 1, cfg = tuning) {
  const linear = cfg.liftSlope * (Math.min(alpha, cfg.stallAlpha) - cfg.zeroLiftAlpha);
  const w = smoothstep(cfg.stallAlpha, cfg.stallAlpha + cfg.stallBlend, alpha);
  const s = Math.sin(alpha);
  return cfg.cd0 + inducedK(cfg) * linear * linear * sigma + w * cfg.plateDrag * 2 * s * s;
}
/** Ground-effect factor on the induced drag for a wing this high above the ground (1 = none). */
export function groundEffectFactor(wingHeight, cfg = tuning) {
  const r = Math.max(0, wingHeight) / cfg.span, t = 16 * r * r;
  return t / (1 + t);
}
/** Stall speed in level flight (load factor 1), and in a bank. */
export function stallSpeed(bank = 0, cfg = tuning) {
  const clMax = liftCoefficient(cfg.stallAlpha, cfg);
  const load = 1 / Math.max(0.5, Math.cos(bank));
  return Math.sqrt(2 * weight(cfg) * load / (cfg.airDensity * cfg.wingArea * clMax));
}
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
export function barTargetSpeed(bar = 0, bank = 0, cfg = tuning) {
  const alpha = barAlpha(clamp(finite(bar), -1, 1), cfg);
  const cl = Math.max(0.05, liftCoefficient(Math.min(alpha, cfg.stallAlpha), cfg));
  return Math.sqrt(2 * weight(cfg) / (cfg.airDensity * cfg.wingArea * cl * Math.max(0.5, Math.cos(bank))));
}
/**
 * Still-air sink (m/s, positive down) of the steady glide at an airspeed and bank: the wing trimmed to carry the
 * weight at that speed. Below the banked stall speed the wing cannot, and the sink rises steeply.
 */
export function sinkPolar(airspeed, bank = 0, cfg = tuning) {
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
export function glidePathAngle(airspeed, bank = 0, cfg = tuning) {
  const v = Math.max(1, airspeed);
  return -Math.asin(clamp(sinkPolar(v, bank, cfg) / v, 0, 0.99));
}

/** Initial airborne state; set x/y/z/heading to the chosen launch location. */
export function createSoaringState(overrides = {}) {
  const cfg = tuning;
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
    headingRate: 0, upright: 0,
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
  const cfg = tuning;
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
    const slopeFlow = (windX * gradientX + windZ * gradientZ) / Math.sqrt(1 + gradientX * gradientX + gradientZ * gradientZ);
    const shear = Math.pow(clamp(aboveGround / cfg.ridgeShearHeight, .02, 1), cfg.ridgeShearExp);
    ridgeLift = clamp(slopeFlow > 0 ? slopeFlow : slopeFlow * cfg.leeSink, -cfg.maxRidgeLift, cfg.maxRidgeLift)
      * shear * Math.exp(-aboveGround / cfg.ridgeDecayHeight);
  }
  return { thermalLift, ridgeLift, lift: thermalLift + ridgeLift,
    windX, windZ, groundHeight, aboveGround };
}

/**
 * Touchdown judgement. verticalSpeed: speed into the ground (m/s, positive down; pass the contact speed on a slope),
 * groundSpeed: horizontal speed over the ground. Returns 'soft', 'firm', 'rough' or 'crash'.
 */
export function judgeTouchdown({ verticalSpeed = 0, groundSpeed = 0, slope = 0, bank = 0, tailwind = 0 } = {}) {
  const cfg = tuning;
  const vertical = Math.max(0, finite(verticalSpeed)), ground = Math.abs(finite(groundSpeed));
  if (!(finite(slope, 1) < cfg.maxTouchdownSlope) || Math.abs(finite(bank)) > cfg.maxTouchdownBank) return 'crash';
  const tail = finite(tailwind);
  if (tail > cfg.tailwindFree && (vertical >= cfg.softTouchdown.vertical || ground - tail >= cfg.tailwindAirspeed - cfg.tailwindSlope * (tail - cfg.tailwindFree))) return 'crash';
  if (vertical < cfg.softTouchdown.vertical && ground < cfg.softTouchdown.ground) return 'soft';
  if (vertical < cfg.firmTouchdown.vertical && ground < cfg.firmTouchdown.ground) return 'firm';
  if (vertical < cfg.roughTouchdown.vertical && ground < cfg.roughTouchdown.ground) return 'rough';
  return 'crash';
}

/**
 * Ground contact too fast to land, but light and wings level: skips the wing off the ground and takes speed for it.
 * contact: { verticalSpeed (into the ground), groundSpeed, slope, bank }. Returns true when it scraped; the caller then keeps flying.
 */
export function scrapeGround(state, contact, groundHeight) {
  const cfg = tuning, sink = Math.max(0, finite(contact.verticalSpeed));
  if (!(sink < cfg.scrapeSink) || Math.abs(finite(contact.groundSpeed)) < cfg.roughTouchdown.ground || !(finite(contact.slope, 1) < cfg.maxTouchdownSlope) || Math.abs(finite(contact.bank)) > cfg.maxTouchdownBank) return false;
  state.airspeed = Math.max(cfg.roughTouchdown.ground * 0.9, state.airspeed - (0.5 + sink * 1.5));
  const up = Math.max(0.3, sink * 0.3);
  state.pathAngle = Math.asin(clamp(up / state.airspeed, 0, 0.3));
  state.verticalSpeed = up; state.y = groundHeight + cfg.footHeight + 0.02;
  return true;
}

/**
 * Landing score for the HUD (every term is something a real pilot plans for).
 * touchdown: { verticalSpeed, groundSpeed, slope, bank } as for judgeTouchdown, plus heading (rad), airspeed, the
 * wind {x, z} at touchdown and flare { pressed, feet, ratio, balloon } (the state's flare bookkeeping); target:
 * { x, z, radius } of the landing mark (optional) with the touchdown position { x, z }.
 * Returns { judged, points, headwind, tailwind, windSpeed, distance, ring, stars, notes, noStep }.
 */
export function scoreLanding(touchdown = {}, target = null) {
  const cfg = tuning, pts = cfg.landingPoints;
  const windX = finite(touchdown.wind?.x), windZ = finite(touchdown.wind?.z), windSpeed = Math.hypot(windX, windZ);
  const heading = finite(touchdown.heading);
  // Wind is the direction the air travels toward: a headwind blows against the heading.
  const headwind = -(Math.sin(heading) * windX + Math.cos(heading) * windZ);
  const judged = judgeTouchdown({ ...touchdown, tailwind: -headwind });
  const notes = [];
  let points = pts[judged] || 0;
  if (judged === 'soft') notes.push('Soft touchdown');
  else if (judged === 'firm') notes.push('Firm touchdown');
  else if (judged === 'rough') notes.push('Rough touchdown');
  let windPoints = 0;
  if (windSpeed > 1.5 && judged !== 'crash') {
    const share = clamp(headwind / windSpeed, -1, 1);
    windPoints = Math.round(pts.headwind * clamp(share / 0.7, 0, 1));
    if (share >= 0.7) notes.push('Into wind');
    else if (share > 0.25) notes.push('Crosswind');
    else if (share < -0.33) notes.push('Downwind');
    else notes.push('Across the wind');
  }
  points += windPoints;
  // The flare: a no-stepper is the prize; a balloon, a late flare or no flare at all is named so it can be learned.
  const vertical = Math.max(0, finite(touchdown.verticalSpeed)), ground = Math.abs(finite(touchdown.groundSpeed));
  let noStep = false;
  if (judged === 'soft' && vertical < cfg.noStepTouchdown.vertical && ground < cfg.noStepTouchdown.ground) { noStep = true; points += pts.noStep; notes.push('No-stepper'); }
  const flare = touchdown.flare;
  if (flare && judged !== 'crash') {
    if (flare.balloon > 0.5) notes.push('Flared too early');
    else if (flare.pressed && finite(flare.feet, 9) < 0.45) notes.push(finite(flare.ratio, 1) > 1.5 ? 'Too fast to flare' : 'Flared late');
    else if (!flare.pressed && !noStep) notes.push('No flare');
  }
  let distance = null, ring = null;
  if (target && Number.isFinite(target.x) && Number.isFinite(target.z) && Number.isFinite(touchdown.x) && Number.isFinite(touchdown.z)) {
    distance = Math.hypot(touchdown.x - target.x, touchdown.z - target.z);
    const radius = finite(target.radius, 60);
    if (judged !== 'crash') {
      if (distance <= cfg.bullseyeRadius) { ring = 'bullseye'; points += pts.bullseye; notes.push('Bullseye'); }
      else if (distance <= cfg.innerRingRadius) { ring = 'inner'; points += pts.inner; notes.push('On the mark'); }
      else if (distance <= cfg.outerRingRadius) { ring = 'outer'; points += pts.outer; notes.push('Near the mark'); }
      else if (distance <= radius) { ring = 'pad'; points += pts.pad; }
    }
  }
  const best = pts.soft + pts.headwind + pts.bullseye + pts.noStep;
  const stars = judged === 'crash' ? 0 : points >= best * 0.85 ? 3 : points >= best * 0.5 ? 2 : 1;
  return { judged, points, headwind, tailwind: -headwind, windSpeed, distance, ring, stars, notes, noStep };
}

/**
 * Mutates and returns state.
 * input.roll: A/left=-1, D/right=+1. input.pitch (bar): W/in=-1, S/out=+1. input.landable and input.ground are
 * accepted for compatibility (the landing is pure physics now). environment: { terrainHeight(x,z),
 * thermals:[{x,z,radius,strength}], wind:{x,z}, terrainSkimming, skimHeight(x,z), skimClearance }.
 * A long frame is capped at 0.25 seconds; call repeatedly for offline simulation.
 */
export function stepSoaring(state, input = {}, dt = 0, environment = {}) {
  const cfg = tuning, g = cfg.gravity, W = weight(cfg), m = cfg.mass;
  if (!Number.isFinite(dt) || dt <= 0) return state;
  for (const key of ['x', 'y', 'z', 'heading', 'bank', 'bankRate', 'pitch', 'pitchRate', 'pathRate', 'bar',
    'skimAssist', 'skimBlend', 'skimProtect', 'flareBalloon']) state[key] = finite(state[key]);
  state.airspeed = Math.max(1, finite(state.airspeed, barTargetSpeed(0, 0, cfg)));
  state.pathAngle = finite(state.pathAngle, glidePathAngle(state.airspeed, state.bank, cfg));
  state.alpha = finite(state.alpha, alphaForLevel(state.airspeed, state.bank, cfg));
  const rollInput = clamp(finite(input.roll), -1, 1);
  const pitchInput = clamp(finite(input.pitch), -1, 1);
  const bankWanted = Math.sign(rollInput) * Math.pow(Math.abs(rollInput), 1.65) * cfg.maxBank;
  const surfaceAt = environment.skimHeight || environment.terrainHeight;
  const duration = Math.min(dt, cfg.maxFrameTime);
  const count = Math.ceil(duration / cfg.maxStep);
  const step = duration / count;
  let totalVertical = 0;
  const clMax = liftCoefficient(cfg.stallAlpha, cfg);

  for (let index = 0; index < count; index++) {
    // The bar: pulled in quickly, pushed out deliberately, released back to neutral.
    const fineControl = (environment.terrainSkimming ? 0 : 1) * (1 - smoothstep(6, 12, finite(state.lastFeet, 99))) * smoothstep(18, 24, state.airspeed) * (1 - smoothstep(6 * DEG, 14 * DEG, Math.abs(state.pathAngle)));
    const barInput = pitchInput + (Math.sign(pitchInput) * pitchInput * pitchInput - pitchInput) * fineControl;
    const away = Math.abs(barInput) > Math.abs(state.bar) && barInput * state.bar >= 0;
    const pressure = Math.min(cfg.barPressureMax, Math.pow(Math.max(1, state.airspeed / stallSpeed(0, cfg)), cfg.barPressureExp));
    const rate = away ? (barInput < 0 ? cfg.barInRate : state.bar < 0 ? 1 / cfg.barReturnSeconds : 1 / (cfg.barOutSeconds * pressure)) / (1 + (cfg.lowBarSlow - 1) * fineControl * (1 - (barInput < 0 ? smoothstep(0.3, 0.8, -state.bar) : smoothstep(0.1, 0.3, state.bar))))
      : state.bar < 0 ? 1 / cfg.barReturnSeconds : 1 / 0.5;
    const previousBar = state.bar;
    state.bar = clamp(state.bar + clamp(barInput - state.bar, -rate * step, rate * step), -1, 1);
    const bar = state.bar;

    const v = state.airspeed, gamma = state.pathAngle, bank = state.bank;
    const air = sampleSoaringAir(state.x, state.y, state.z, environment);
    const surface = surfaceAt ? Math.max(air.groundHeight, finite(surfaceAt(state.x, state.z), air.groundHeight))
      : air.groundHeight;
    const clearance = state.y - surface, feet = clearance - cfg.footHeight;
    state.lastFeet = feet;
    const q = 0.5 * cfg.airDensity * v * v, qS = q * cfg.wingArea;
    const stall = stallSpeed(bank, cfg);
    state.stallSpeed = stall;
    state.stallRatio = v / stall;

    // What the bar asks for, with the pendulum's speed stability, and what the bar pressure allows at this speed.
    const trimSpeed = barTargetSpeed(bar, 0, cfg);
    // (the pilot holding the bar in or out overrides most of the pendulum's own trimming)
    let alphaTarget = barAlpha(bar, cfg) + cfg.speedStability * (v - trimSpeed) * (1 - smoothstep(0, 0.5, Math.abs(bar)));
    // (the bar held in holds the dive: the pendulum's trimming only acts on a free bar)
    // (the free bar's pull fades as the nose rises, so a recovery zooms and flows on instead of hanging; S still climbs)
    const fieldShift = input.ground ? cfg.fieldSettle * DEG * (1 - 0.5 * smoothstep(18, 24, v)) * (1 - smoothstep(0, 0.1, bar)) : 0;   // (hands off only: S flares as it always did)
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
    if (environment.terrainSkimming) {
      const barIntent = pitchInput > 0.2 ? Math.max(bar, 0.6) : bar;
      const slow = smoothstep(1.7, 1.25, v / stall);
      const requested = typeof environment.skimClearance === 'function' ? environment.skimClearance(state) : environment.skimClearance;
      const base = Number.isFinite(requested) ? requested : 6.5;
      const skimEnvironment = slow > 0 ? { ...environment, skimClearance: base + (3.8 - base) * slow } : environment;
      const skim = skimGuidance(state, { v, gamma, heading: state.heading, headingRate: finite(state.headingRate),
        windX: air.windX, windZ: air.windZ, lift: air.lift, bar: barIntent, command: gamma, surface, dt: step,
        pullAccel: (Math.min(cfg.loadLimit, 2.2) - 1) * g, hardPullAccel: (Math.min(cfg.loadLimit, 2.6) - 1) * g,
        maxClimb: 30 * DEG, maxDive: 45 * DEG, stallSpeed: stall }, skimEnvironment);
      const weightOn = Math.max(clamp(state.skimBlend, 0, 1), clamp(state.skimProtect, 0, 1)) * (input.ground ? smoothstep(cfg.skimFadeSpeed, cfg.skimFullSpeed, v) : 1);
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
    const alphaRate = clamp((alphaTarget - state.alpha) / cfg.pitchTau, -cfg.pitchRateMax, cfg.pitchRateMax) * (1 + frequencyBoost * 0.3);
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
    const L = qS * CL + m * cfg.groundCushion * smoothstep(15, 25, v) * (1 - sigma) * Math.max(0, -v * Math.sin(gamma)), D = qS * CD;
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
    const bankShare = cfg.slowBank + (1 - cfg.slowBank) * smoothstep(0.95, 1.3, v / stallSpeed(0, cfg)), bankTarget = bankWanted * bankShare;
    const w0 = cfg.rollFrequency * authority, rollError = bank - bankTarget, rollDecay = Math.exp(-w0 * step), rollSpring = (state.bankRate + w0 * rollError) * step;
    state.bank = clamp(bankTarget + (rollError + rollSpring) * rollDecay, -cfg.maxBank, cfg.maxBank);
    state.bankRate = (state.bankRate - w0 * rollSpring) * rollDecay;

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
    // The pilot goes upright as the bar comes out low, and stays upright once there (the landing).
    const onFinal = input.ground && feet < cfg.uprightHeight && v < 1.7 * stall && bar > -0.1 ? cfg.finalUpright : 0;
    state.standing = !!input.stand;   // (the pilot sitting up by choice, anywhere: Space)
    const wantUpright = state.standing ? 1 : feet < cfg.uprightHeight && bar > 0.15 && v < 1.7 * stall ? 1 : feet < 3 && state.upright > 0.5 ? 1 : onFinal;   // (not in a fast pull-out)
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
