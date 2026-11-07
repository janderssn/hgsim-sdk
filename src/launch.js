/**
 * The launch: picking the wing up off the ground, balancing it on the shoulders and the run with it until it flies, shared by
 * the range and the map. There is one physics from the first step to the flight: the flight model's own wing (its lift and
 * drag at the angle of attack the pilot holds it at, its pitch lag, ground effect) acts on the one flight state the whole way,
 * and the ground is a contact the legs push against. While the feet carry weight the legs run the body toward the pilot's
 * running speed; as the wing takes the weight the legs have less to push with and the wing's own forces take over; when the
 * ground's reaction reaches zero the feet leave it and the same equations simply carry on, so there is nothing to hand over
 * and nothing can change in a step: not the speed, not the path, not the wing's angle.
 *
 * At rest the glider sits on its base bar with the nose up and the pilot stands inside the frame, bent forward holding the
 * uprights. Picking it up levels the wing and settles it on the shoulders, hands down the uprights. On the run the wing feels
 * the airspeed, the running speed plus the headwind: first it floats its own weight off the shoulders, then the straps come
 * taut and pull, the strides lengthen and the pilot leans into them. In no wind a pilot cannot run at flying speed, so the
 * run ends where the ground ends, the ramp lip, a cliff edge or the break of a slope, and the wing flies off it as fast as
 * it is going: below flying speed the pilot pulls in and it drops its nose for the airspeed it lacks. Standing at a cliff's
 * edge there is no run at all: a step and a jump out, the bar in, and the dive. In a strong headwind the wing flies within a
 * step or two. A tailwind takes airspeed away, and a crosswind stronger than the headwind lifts a wing and spoils the launch.
 *
 * Easy launches do all of this for the pilot. Realistic ones are the pilot's own: balancing the wing against the wind and
 * its own wobble (balance, weight shift), holding its nose (nose), pushing harder or jogging (push), starting the run (go)
 * and jumping off as the wing lifts (jump), which puts a little of the legs' energy into the wing.
 */
import { createSoaringState, liftCoefficient, dragCoefficient, groundEffectFactor, getSoaringTuning, stallSpeed, barTargetSpeed } from './flight.js';

export const LAUNCH = {
  pickupSeconds: 1.5,  // bar on the ground to balanced on the shoulders
  settleSeconds: .6,   // balancing it before the first step (an easy launch; a realistic one waits for go)
  accel: 1.9,          // m/s^2 the legs can give, carrying the wing
  runGain: .7,         // per second: how hard the legs work toward the running speed (accel caps it); the wing's drag holds them below it
  topSpeed: 6.8,       // m/s flat out carrying the wing ...
  liftedSpeed: .5,     // ... and this much more once the straps carry the weight: longer, lighter strides
  jogShare: .65,       // a realistic run without the push held is this share of flat out
  legShare: .08,       // the legs push fully while at least this share of the weight is on the feet (a stride pushes on light feet too), fading to nothing as it goes
  holdLift: .85,       // the wing's lift at the angle the pilot holds it on the run, as a share of the weight, at the stall speed (just under the stall warning)
  liftOffLift: 1,      // ... and at the angle the pilot lets it up to as the feet go light (letFly): right up to the stall, to get off.
                       // A realistic launch's wing, left to itself, sits there too: nose high, all drag. The pilot holds it level or a
                       // little down to run up speed (too low and it will not lift, so the run goes on), and lets it up to fly off.
  letFly: [.75, .97],  // the share of the weight the wing carries over which an easy launch lets the nose up to fly it off
  noseRange: 10 * Math.PI / 180,  // a realistic launch: how far the pilot can move the held angle of attack (and the wing's pitch with it) either way:
                       // nose down sheds lift and drag and the run gathers speed, nose up lifts the wing off the shoulders but brakes the run
  noseRate: 12 * Math.PI / 180,   // rad/s the nose moves while W or S is held; let go and the arms hold it where it is
  noseTau: .15,        // s for the arms to bring the nose to where the pilot wants it
  noseRise: 3 * Math.PI / 180,    // rad/s the nose rises on its own in a realistic launch, at the stall speed (the wind gets under the sail):
  noseSwell: 1.2 * Math.PI / 180, // ... and wanders with the air, per 5 m/s of it: the pilot keeps it level or a touch down with W
  noseWarn: .5 * Math.PI / 180,   // past the stall by this much, the pilot is warned (s.noseWarn)
  wingShare: .28,      // the wing's own weight as a share of the whole: lift below this only floats it off the shoulders
  liftClear: .08,      // how much more the straps stretch once the wing carries the whole weight
  maxCrosswind: 4.5,   // m/s across the run that lifts a wing, once it is more than the headwind
  rollTip: 1.4,        // per second: how fast a wing that is off level falls further over (a realistic launch: the pilot catches it)
  rollWind: .12,       // rad/s^2 per m/s of crosswind getting under the upwind wing
  rollAuthority: 2.4,  // rad/s^2 of righting the pilot's weight shift gives
  rollLimit: .4,       // a wing further over than this touches a tip: the launch is spoiled
  reflexK: 10,         // a realistic launch: the pilot's own reflexes hold the wing level against the small gusts and wobble (rad/s^2 per rad) ...
  reflexD: 2.5,        // ... damped ...
  reflexMax: .6,       // ... but only this hard (rad/s^2): more than that is the player's to correct
  drift: 1.05,         // rad/s^2 of slow drift (seconds long, eased in after the pickup) beyond what the reflexes hold: left alone, the wing goes over
  warnRoll: .16,       // a wing this far over warns the pilot (s.warn) before it goes
  gustRoll: .08,       // rad/s^2 of roll the air's slow swells give per m/s of air over the wing: a light wing on the shoulders moves with them
  gustYaw: .05,        // ... and of yaw
  yawAero: 2.2,        // rad/s^2 per radian of sideslip at the stall speed: the wing weathervanes its nose into the air it meets
  yawHold: 3,          // rad/s^2 per radian the pilot's arms hold the nose straight down the run (an easy launch holds it harder)
  yawHoldEasy: 10,
  rollYaw: 5,          // rad/s^2 of yaw per radian of roll at the stall speed: the high wing catches the wind and the nose swings its way
  runStall: [0, 4 * Math.PI / 180],   // held past the stall on the run, the sail stalls (unlike the flight's soft stall): over this many
  runStallLift: .7,    // radians past the stall angle it loses this share of its lift (stalled, it cannot carry the pilot at any running speed) ...
  runStallDrag: 1.2,   // ... and its drag grows by this share, from a degree before the stall: a nose-high run never reaches flying speed
  noseYaw: 70,         // a nose held well past the stall (more than -noseYawFrom beyond it) leaves the wing without directional stability:
  noseYawFrom: -2.5 * Math.PI / 180,  // it wanders off in yaw, harder the higher and faster (per radian of excess angle)
  yawCatch: .26,       // past this the wind is on the sail's side and takes it further round ...
  yawRun: 5,           // ... this hard (rad/s^2 per radian beyond it) ...
  yawFail: 1.1,        // ... until the wind is on top of the sail and dumps the pilot (a realistic launch; an easy one holds the nose)
  followYaw: 1.3,      // per second: the pilot runs where the nose points (s.turnRate, for the game to turn the run), so a wing let
                       // go round takes the run with it, off the side of a ramp or across the slope
  yawDamp: 5,
  yawLimit: .22,       // the arms stop the nose here
  jumpUp: 1.1,         // m/s the pilot's jump adds upward ...
  jumpAlong: .4,       // ... and along the run
  jumpLift: .5,        // a jump before the wing carries this share of the weight is only a hop
  jumpEdge: 2.5,       // m: nearer the edge than this at the start, the pilot does not run but steps out and jumps
  jumpSpeed: 3.2,      // m/s of the step out off a cliff
  diveBar: .5,         // off an edge below flying speed the pilot pulls the bar in this far
  restPitch: -.35,     // nose up with the bar on the ground (model rotation.x: negative is nose up)
  runPitch: .06,       // carried with the nose a little low: a low angle of attack ...
  flyPitch: -.13,      // ... and let up to its flying attitude as the wing takes the weight
  restCarry: .21,      // the wing origin above the ground with the bar on the ground
  carry: .95,          // the wing origin above the feet, carried on the shoulders
  riseTaut: .22,       // how far the wing rises off the shoulders as the straps come taut
  restBend: .35,       // the pilot's forward bend holding the resting wing
  strapLean: .5,       // the lean into the straps once they carry the weight
  bob: .05,            // the wing's bob with each stride while it rides on the shoulders
  nod: .035,           // and its nod
  wobble: .035,        // the slow roll of balancing it
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };
const finite = (v, d = 0) => Number.isFinite(v) ? v : d;
const smoothstep = (a, b, t) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
function spring(s, key, target, omega, zeta, dt) { const v = key + 'V'; s[v] += (omega * omega * (target - s[key]) - 2 * zeta * omega * s[v]) * dt; s[key] += s[v] * dt; }

/** Head and cross components of the wind for a run along heading (wind is the direction the air moves toward). */
export function windOnRun(wind, heading) {
  const fx = Math.sin(heading), fz = Math.cos(heading), wx = wind?.x || 0, wz = wind?.z || 0;
  return { headwind: -(wx * fx + wz * fz), crosswind: wx * fz - wz * fx };
}

/**
 * The bar position that trims the flight model to the given airspeed (barTargetSpeed is the model's own mapping, falling as the
 * bar goes out).
 */
export function barForSpeed(speed, barTargetSpeed) {
  let lo = -1, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (barTargetSpeed(mid) > speed) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * How the pilot holds the wing: at the angle of attack that gives a share of the weight at the stall speed (holdLift on the
 * run; as the feet go light the pilot lets the nose up toward liftOffLift and the wing flies off), and the bar that holds it.
 */
export function runHold(cfg = LAUNCH, T = getSoaringTuning(), letFly = 0) {
  const share = lerp(cfg.holdLift, cfg.liftOffLift, letFly), alpha = T.zeroLiftAlpha + share * liftCoefficient(T.stallAlpha, T) / T.liftSlope, speed = stallSpeed(0, T) / Math.sqrt(share);
  return { alpha, speed, bar: barForSpeed(speed, b => barTargetSpeed(b, 0, T)) };
}

/** The bar that holds the wing at this angle of attack in the flight model (its trim speed is where that angle carries the weight). */
export function barForAlpha(alpha, T = getSoaringTuning()) {
  const cl = Math.max(.05, liftCoefficient(Math.min(alpha, T.stallAlpha), T));
  return barForSpeed(Math.sqrt(2 * T.mass * T.gravity / (T.airDensity * T.wingArea * cl)), b => barTargetSpeed(b, 0, T));
}

/** A launch, with the flight state it will fly on (the same object the flight model then keeps stepping). */
export function createLaunch(flight = createSoaringState()) {
  return { phase: 'pickup', t: 0, phaseT: 0, k: 0, groundSpeed: 0, airspeed: 0, lift: 0, tension: 0, carry: 1, normal: 1, distance: 0,
    lifted: false, liftDistance: null, airborne: false, reason: null, failed: null, rise: 0, riseV: 0, roll: 0, rollV: 0, barHold: 0, alphaHold: 0, tilt: null,
    go: false, cliff: false, jumped: false, nose: 0, noseCmd: 0, yaw: 0, yawV: 0, shift: 0, flight };
}

/**
 * Advances the launch. headwind/crosswind m/s; slope the ground's fall per metre ahead (positive downhill); edgeAhead the
 * metres left to where the ground ends (a lip, a cliff edge, a slope's break); airLift the air's own rise at the wing (m/s:
 * ridge lift, a thermal); x, y, z, heading where the body is, kept on the flight state. manual makes it a realistic launch,
 * the pilot's own: balance -1..1 (weight shift against a wing going over), nose -1..1 (moves the held angle of attack while held, + up), go
 * (start the run from the balance; the pilot then runs flat out) and jump (off the ground as the wing lifts, or off an edge).
 * Returns the distance moved over the ground this step. Afterwards airborne says the flight carries on from s.flight, with
 * reason 'flying' (the wing carries the whole weight) or 'edge' (off the end, or a jump, below flying speed: the pilot pulls
 * in for the airspeed); failed names how the launch went wrong ('crosswind', 'wingdrop': a tip in the ground; 'turned': the wind took
 * the sail round), which the games play out as a crash where it happened. turnRate (rad/s) turns the run after the wing.
 */
export function stepLaunch(s, dt, { headwind = 0, crosswind = 0, slope = 0, edgeAhead = Infinity, airLift = 0, x, y, z, heading, manual = false, balance = 0, nose = 0, push = 0, go = false, jump = false } = {}, cfg = LAUNCH) {
  if (s.airborne || s.failed) return 0;
  const T = getSoaringTuning(), g = T.gravity, m = T.mass, W = m * g, f = s.flight;
  s.t += dt; s.phaseT += dt; if (go) s.go = true;
  if (s.phase === 'pickup') { s.k = ease(s.phaseT / cfg.pickupSeconds); if (s.phaseT >= cfg.pickupSeconds) { s.phase = 'balance'; s.phaseT = 0; s.k = 1; } }
  else if (s.phase === 'balance') { if (manual ? s.go : s.phaseT >= cfg.settleSeconds) { s.phase = 'run'; s.phaseT = 0; s.cliff = edgeAhead < cfg.jumpEdge; } }
  const running = s.phase === 'run';
  // The hold: an easy launch lets the nose up as the feet go light; a realistic one holds the nose where the pilot puts it.
  // Running out of ground below flying speed (an edge, a cliff) the pilot pulls in for the dive.
  const hold = runHold(cfg, T, manual ? 1 : running ? smoothstep(cfg.letFly[0], cfg.letFly[1], s.lift) : 0);
  if (manual && s.phase !== 'pickup') {
    const vNow = Math.max(0, s.groundSpeed + headwind), q0 = clamp((vNow / 9.7) ** 2, 0, 1.6), swell = Math.sin(s.t * .83 + .6) * Math.sin(s.t * .37 + 1.9);
    s.noseCmd = clamp(s.noseCmd + (clamp(nose, -1, 1) * cfg.noseRate + cfg.noseRise * q0 + cfg.noseSwell * Math.min(2, vNow / 5) * swell) * dt, -cfg.noseRange, cfg.noseRange);
  } else s.noseCmd = 0;
  s.nose += (s.noseCmd - s.nose) * (1 - Math.exp(-dt / cfg.noseTau));
  hold.alpha += s.nose;
  const pullIn = running && (!manual || s.cliff) && s.lift < .8 ? smoothstep(1.5, .4, edgeAhead) : 0;   // (an easy launch pulls in for the dive off an edge, and a cliff launch always does: it is a jump into the dive)   // (an easy launch pulls in for the dive off an edge; a realistic pilot does it themselves)
  const alphaDive = T.alphaTrim - smoothstep(0, .9, cfg.diveBar) * (T.alphaTrim - T.alphaMin);
  hold.alpha = lerp(hold.alpha, alphaDive, pullIn); hold.bar = lerp(hold.bar, -cfg.diveBar, pullIn);
  if (manual) hold.bar = lerp(barForAlpha(hold.alpha, T), hold.bar, pullIn);
  s.barHold = pullIn > .5 || manual ? hold.bar : runHold(cfg, T).bar; s.alphaHold = hold.alpha;   // (barHold: what the pilot holds once off: a realistic pilot keeps their own)

  // The air the wing meets: the run along the ground plus the headwind, and the ground's fall plus any rising air from below.
  const theta = Math.atan(slope), gs = s.groundSpeed, vx = gs + headwind, vy = -gs * slope - airLift;
  const v = vx > 0 ? Math.hypot(vx, vy) : 0, gammaAir = vx > 0 ? Math.atan2(vy, vx) : -theta;
  // The arms hold the wing's attitude, so a change in where the air comes from (the ground falling away, rising air) changes
  // the angle of attack at once; the pilot then holds the angle they feel in the bar, bringing it back through the pitch lag.
  const tilt = gammaAir + theta;   // the air path against the ground
  f.alpha = finite(f.alpha, hold.alpha) - (tilt - finite(s.tilt, tilt)); s.tilt = tilt;
  f.alpha += (hold.alpha - f.alpha) * (1 - Math.exp(-dt / T.pitchTau));
  const qS = .5 * T.airDensity * v * v * T.wingArea, sigma = groundEffectFactor(2.3 - T.footHeight + T.wingAboveBody, T);
  const slip = vx > .5 ? s.yaw + Math.atan2(crosswind, vx) : 0, slipLoss = Math.cos(clamp(slip, -1, 1)) ** 2;   // (sideslip: the nose off the air it meets)
  const over = f.alpha - T.stallAlpha, stalled = smoothstep(cfg.runStall[0], cfg.runStall[1], over), dragging = smoothstep(-1 * Math.PI / 180, cfg.runStall[1], over);
  const L = qS * liftCoefficient(f.alpha, T) * slipLoss * (1 - cfg.runStallLift * stalled), D = qS * dragCoefficient(f.alpha, sigma, T) * (1 + cfg.runStallDrag * dragging);
  s.lift = L / W;
  s.tension = clamp((s.lift - cfg.wingShare) / (1 - cfg.wingShare), 0, 1);
  s.carry = clamp(1 - s.lift / cfg.wingShare, 0, 1);
  // What the ground still carries: the weight less what the wing lifts off it.
  const N = W * Math.cos(theta) - L * Math.cos(tilt) + D * Math.sin(tilt);
  s.normal = clamp(N / (W * Math.cos(theta)), 0, 1);

  let moved = 0;
  if (running) {
    // The legs run the body toward the running speed while they have weight to push with; gravity along the slope, the wing's
    // drag and the forward lean of its lift act on the body the whole time, so when the legs let go nothing changes in a step.
    // At a cliff's edge there is no run: a step out and a jump.
    const share = clamp(s.normal / cfg.legShare, 0, 1), top = cfg.topSpeed;   // (the pilot runs flat out once the run starts)
    const target = s.cliff ? cfg.jumpSpeed : top + cfg.liftedSpeed * s.tension;
    const legs = s.cliff ? clamp(3 * (target - gs), -4, 4) * share : clamp(cfg.runGain * (target - gs), -cfg.accel, cfg.accel) * share;
    const along = legs + g * Math.sin(theta) - (D * Math.cos(tilt) + L * Math.sin(tilt)) / m;
    s.groundSpeed = Math.max(0, gs + along * dt); moved = s.groundSpeed * dt; s.distance += moved;
  }
  s.airspeed = v;
  // The straps catch with a little bounce. The wing on the shoulders wants to go over: its own wobble and a crosswind under
  // the upwind tip. An easy launch balances it; a realistic one is balanced by the pilot's weight shift, and a wing that gets
  // away touches a tip. Once the straps carry the weight the wing flies itself level.
  spring(s, 'rise', cfg.riseTaut * s.tension + (s.lifted ? cfg.liftClear : 0), 7, .5, dt);
  if (s.phase !== 'pickup') {
    // The air over the wing is never smooth: gusts in proportion to the wind and the run, felt most while the wing is light.
    const t = s.t, airOver = Math.min(12, Math.hypot(headwind, crosswind) + .4 * gs), loose = 1 - s.tension;
    // (slow swells only, under 1 Hz: a wing in moving air, never a shake)
    const gustA = Math.sin(t * 1.9 + 1.3) * Math.sin(t * .61) + .5 * Math.sin(t * 1.1 + .4) * Math.sin(t * .37 + 2);
    const gustB = Math.sin(t * 1.6 + 4.1) * Math.sin(t * .73 + .5) + .5 * Math.sin(t * .9 + 2.2) * Math.sin(t * .29);
    const wobble = cfg.wobble * (Math.sin(t * 1.7) * Math.sin(t * .7 + 1));
    // The pilot's hands: keys in a realistic launch, an attentive pilot of its own in an easy one.
    // A realistic pilot's reflexes catch the small things on their own; the slow drift is theirs to feel and correct.
    const reflex = clamp(s.roll * 3 + s.rollV * .6, -1, 1), drift = cfg.drift * smoothstep(1, 5, t - cfg.pickupSeconds) * Math.sin(t * .43 + .8) * (.8 + .2 * Math.sin(t * .17 + 2.1));
    const held = manual ? clamp(cfg.reflexK * s.roll + cfg.reflexD * s.rollV, -cfg.reflexMax, cfg.reflexMax) : 0;
    // (a shift right, + or D, brings the right wing down, roll +, as in flight)
    const shift = manual ? clamp(balance, -1, 1) : -clamp(reflex + .3 * (s.yaw * 2 + s.yawV * .4), -1, 1);
    s.shownShift = clamp(shift - held / cfg.rollAuthority, -1, 1);
    s.shift += (shift - s.shift) * (1 - Math.exp(-dt / .12));
    s.shiftDrawn = finite(s.shiftDrawn) + (s.shownShift - finite(s.shiftDrawn)) * (1 - Math.exp(-dt / .12));
    s.rollV += (loose * (cfg.rollTip * s.roll + cfg.rollWind * crosswind + wobble * 6 + (manual ? drift : 0)) - held + (.4 + .6 * loose) * cfg.gustRoll * airOver * gustA
      + s.shift * cfg.rollAuthority - s.rollV * (2.5 + 4 * s.tension) - s.tension * 1.2 * s.roll) * dt;

    s.roll += s.rollV * dt;
    // Yaw: the nose weathervanes toward the air it meets (stiffer the faster it goes), the gusts push it about, a weight shift
    // swings it with the roll, and the pilot's arms hold it down the run.
    const q = clamp((v / 9.7) ** 2, 0, 1.6), into = vx > .5 ? -Math.atan2(crosswind, vx) : 0;
    const caught = Math.max(0, Math.abs(s.yaw) - cfg.yawCatch) * Math.sign(s.yaw);
    s.yawV += (cfg.yawAero * q * (into - s.yaw) - (manual ? cfg.yawHold : cfg.yawHoldEasy) * s.yaw + (.4 + .6 * loose) * cfg.gustYaw * airOver * gustB
      + loose * q * (cfg.rollYaw * s.roll + (manual ? cfg.yawRun * caught : 0))
      + q * cfg.noseYaw * Math.max(0, f.alpha - (T.stallAlpha - cfg.noseYawFrom)) * (s.yaw * 6 + .25 * gustB) - cfg.yawDamp * s.yawV) * dt;   // (nose too high: it wanders)
    s.yaw += s.yawV * dt;
    if (!manual) { s.yaw = clamp(s.yaw, -cfg.yawLimit, cfg.yawLimit); if (Math.abs(s.yaw) >= cfg.yawLimit) s.yawV = 0; }
    s.turnRate = running && s.normal > .05 ? s.yaw * cfg.followYaw * clamp(gs / 2, 0, 1) : 0;
    if (manual && Math.abs(s.yaw) > cfg.yawFail) { s.failed = 'turned'; return moved; }
    s.noseWarn = manual && running && f.alpha > T.stallAlpha + cfg.noseWarn;
    s.warn = manual && (Math.abs(s.roll) > cfg.warnRoll || Math.abs(s.yaw) > cfg.yawCatch * .7) ? -Math.sign(Math.abs(s.roll) > cfg.warnRoll ? s.roll : s.yaw) : 0;   // (the shift that answers it: +1 right, D; -1 left, A)
    if (manual && Math.abs(s.roll) > cfg.rollLimit) { s.failed = 'wingdrop'; return moved; }
    if (!manual) s.roll = clamp(s.roll, -.12, .12);
  }
  // The flight state is the launch's state: the wing's speed through the air, its path and its angle, where the body is.
  f.airspeed = Math.max(1, v); f.pathAngle = gammaAir; f.bar = hold.bar; f.verticalSpeed = v * Math.sin(gammaAir); f.groundSpeed = gs; f.loadFactor = s.lift;
  if (Number.isFinite(x)) f.x = x; if (Number.isFinite(y)) f.y = y; if (Number.isFinite(z)) f.z = z; if (Number.isFinite(heading)) f.heading = heading;
  // A crosswind gets under the upwind wing as soon as it is lifted level (an easy launch; a realistic one lets the pilot fight it).
  const cross = Math.abs(crosswind);
  if (!manual && s.phase !== 'pickup' && cross > cfg.maxCrosswind && cross > headwind) { s.failed = 'crosswind'; return moved; }
  if (!running) return 0;
  // The feet leave the ground where it no longer carries anything, where it ends, or where the pilot jumps: off a cliff
  // always, on a run when asked. The jump puts the legs' last push into the wing, up and along.
  const atEdge = edgeAhead - moved <= 0, jumping = s.cliff ? atEdge : manual && jump;
  if (N <= 0 && !s.lifted) { s.lifted = true; s.liftDistance = s.distance; }
  // A jump with a wing that is not carrying the pilot (stalled, or too slow) is only a hop: the feet come back down.
  if (jumping && !s.jumped && !s.cliff && s.lift < cfg.jumpLift && edgeAhead > 1.5) s.hops = (s.hops || 0) + 1;   // (near an edge a jump leaves it, flying or not)
  else if (jumping && !s.jumped) {
    s.jumped = true; s.groundSpeed += cfg.jumpAlong;
    const vx2 = s.groundSpeed + headwind, vy2 = vy + cfg.jumpUp;
    f.airspeed = Math.max(1, Math.hypot(Math.max(0, vx2), vy2)); f.pathAngle = Math.atan2(vy2, Math.max(.1, vx2)); f.verticalSpeed = vy2; f.groundSpeed = s.groundSpeed;
    if (!s.lifted) { s.lifted = s.lift >= cfg.jumpLift; s.liftDistance = s.distance; }
  }
  if (s.lifted) { s.airborne = true; s.reason = s.lift >= .85 || N <= 0 ? 'flying' : 'edge'; }
  else if (atEdge || s.jumped) { s.airborne = true; s.reason = 'edge'; }
  return moved;
}

/**
 * Where the wing and the pilot are for a launch state: the wing origin's height above the ground, its pitch (model rotation.x)
 * and roll, the pilot's forward lean in the world, the stride amount, how far the straps carry (lift), how much of the wing
 * rides on the shoulders (carry), how high the hands hold the uprights (grip: 1 mid-upright at rest, 0 down for the run), the
 * feet on the ground (plant 1: a run keeps them there however hard the straps pull) and the wing's path through the air
 * (pathAngle, the flight state's own). step: the rig's stride phase, for the bob and nod of a wing carried on the shoulders.
 */
/** Where the uprights rest on the pilot's shoulders, in the wing's frame (x right, y up, z forward): the point the held wing pivots about. */
export const SHOULDERS = [0, .56, .81];

/**
 * How far to move the wing's reference point so that, drawn at this attitude (rotation.set(pitch, heading, roll, 'YXZ')), the
 * point on the shoulders stays where it would be with the wing level: the held wing turns about the shoulders. w: how much of
 * it rests on them (0..1).
 */
export function shoulderPivot(pitch, heading, roll, w = 1, out = [0, 0, 0]) {
  const [x, y, z] = SHOULDERS, cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch), ch = Math.cos(heading), sh = Math.sin(heading);
  const x1 = x * cr - y * sr, y1 = x * sr + y * cr, y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;   // roll about z, then pitch about x
  const dx = x - x1, dy = y - y2, dz = z - z2;   // (level minus tilted, before the heading turns both)
  out[0] = w * (dx * ch + dz * sh); out[1] = w * dy; out[2] = w * (-dx * sh + dz * ch);
  return out;
}

export function launchPose(s, step = 0, cfg = LAUNCH) {
  const r = s.phase === 'run' ? clamp(s.groundSpeed / 1.5, 0, 1) : 0, onShoulders = s.carry * r, settled = s.k, alpha0 = runHold(cfg).alpha;
  return {
    height: lerp(cfg.restCarry, cfg.carry, settled) + s.rise + cfg.bob * onShoulders * Math.abs(Math.sin(step)),
    // The wing is drawn at the attitude the physics has it at: the angle of attack the pilot holds (and lets up, or pulls in), so
    // nothing but the pilot and the air moves the nose.
    pitch: lerp(cfg.restPitch, cfg.runPitch - (finite(s.flight?.alpha, alpha0) - alpha0), settled) + cfg.nod * onShoulders * Math.sin(2 * step + 1),
    roll: s.roll, yaw: finite(s.yaw), shift: finite(s.shiftDrawn, finite(s.shift)),
    lean: cfg.restBend * (1 - settled) + cfg.strapLean * s.tension,
    run: r, lift: s.tension, carry: s.carry, grip: 1 - settled, plant: 1,
    shoulders: settled * (1 - clamp(s.tension, 0, 1)),   // the uprights on the shoulders (the wing pivots there) until the straps take the weight
    pathAngle: finite(s.flight?.pathAngle, 0),
  };
}

/** The run alone (no pickup) over this much ground: for planning a launch. */
export function runProfile(air, stall, distance, slope = 0, cfg = LAUNCH) {
  const s = createLaunch(); s.phase = 'run'; s.k = 1; let guard = 0;
  while (!s.airborne && !s.failed && guard++ < 3000) stepLaunch(s, 1 / 30, { ...air, slope, edgeAhead: distance - s.distance }, cfg);
  return s;
}
