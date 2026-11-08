/**
 * The walker: a person on foot, on the world's ground. A vehicle like any other (docs/vehicles.md): step(dt, input) at the fixed
 * tick, pose() to draw, velocity(), events ('airborne', 'touchdown', 'crash', 'blocked') and state().
 *
 *   const walker = createWalker({ world, at: { x, z, heading } });
 *   walker.step(dt, { forward: 1, turn: 0, sprint: false, jump: false });
 *
 * The pace comes from the ground: uphill is slower and too steep is a wall, soft ground (snow, sand, mud) is slower, and slippery
 * ground (ice, a steep snowfield) slides out from under the feet. Water, solid things and the map's edge stop it, sliding along them.
 * A ledge deeper than a step is a fall (or, with stopAtDrop, a place it stops): it flies off with the speed it had, and lands; land hard enough and it is a crash, the
 * walker down for a moment. The reference point is the feet.
 */
import { defineConfig } from './config.js';
import { createEmitter } from './events.js';
import { makePose } from './pose.js';
import { clamp, finite } from './math.js';

export const WALKER_DEFAULTS = Object.freeze({
  gravity: 9.81,
  /** Paces, m/s: a gentle stick walks, full stick runs, sprint sprints. */
  runSpeed: 4.5,
  sprintSpeed: 7,
  /** Backwards and sideways, as a share of the pace. */
  backShare: 0.5,
  strafeShare: 0.7,
  acceleration: 8,                 // m/s^2 on good ground (scaled by its grip)
  turnRate: 2.5,                   // rad/s at full turn input
  /** Uphill: pace / (1 + uphillCost * grade); downhill: pace * (1 + downhillGain * grade), up to downhillMax. */
  uphillCost: 2.5,
  downhillGain: 0.3,
  downhillMax: 1.25,
  /** Steeper than this (rise per metre) is a wall going up. 0.9 is about 42 degrees. */
  maxSlope: 0.9,
  /** Soft ground slows the pace by up to this share at softness 1. */
  softCost: 0.6,
  /** The feet slip where the slope is steeper than grip * slideGrip, and slide with the ground's glide friction. */
  slideGrip: 2,
  /** Up a ledge higher than this is a wall; down a drop deeper than stepDown (plus what the pace runs down) is a fall. m. */
  stepUp: 0.6,
  stepDown: 0.5,
  /** Deeper drops than this (m) are stopped at, as a careful person would ('drop'), instead of walked off and fallen from. Infinity: walks off. */
  stopAtDrop: Infinity,
  jumpSpeed: 3.2,
  /** Steering in the air, as a share of the acceleration. */
  airControl: 0.15,
  /** Landing faster than this (m/s, into the ground) is a crash; the walker is down for downSeconds. */
  injuryImpact: 8,
  downSeconds: 1.5,
  /** Water deeper than this stops the walker. m. */
  wade: 0.3,
  /** One stride's length at a run, m (for the drawn stride's phase). */
  strideLength: 1.6,
});

export const WALKER_EVENTS = Object.freeze(['airborne', 'touchdown', 'crash', 'blocked']);

export function createWalker({ world, at = {}, config = {} } = {}) {
  if (typeof world?.groundAt !== 'function') throw new TypeError('createWalker: world must come from createWorld()');
  const cfg = defineConfig(WALKER_DEFAULTS, config, 'walker config'), events = createEmitter(WALKER_EVENTS, 'walker');
  const s = {
    x: 0, z: 0, heading: 0, y: 0, vx: 0, vy: 0, vz: 0, onGround: true, phase: 'stand', stride: 0, blocked: null, downFor: 0, material: 'grass',
  };
  const place = ({ x = s.x, z = s.z, heading = s.heading, y } = {}) => {
    Object.assign(s, { x: finite(x), z: finite(z), heading: finite(heading), vx: 0, vy: 0, vz: 0, onGround: true, phase: 'stand', blocked: null, downFor: 0 });
    s.y = Number.isFinite(y) ? y : world.groundAt(s.x, s.z);
    s.onGround = s.y <= world.groundAt(s.x, s.z) + 1e-6;
  };
  place(at);

  /** Why the feet cannot stand at (x, z) coming from here, or null. */
  const stop = (x, z, fromGround) => {
    if (!world.inBounds(x, z)) return 'bounds';
    const g = world.groundAt(x, z), w = world.waterAt(x, z);
    if (w !== null && w - g > cfg.wade) return 'water';
    if (world.solidAt(x, g + 1, z)) return 'solid';
    // A ledge too high to step up, or ground rising steeper than the legs can climb along the way they go.
    const rise = g - fromGround, run = Math.hypot(x - s.x, z - s.z);
    if (rise > cfg.stepUp) return 'slope';
    if (-rise > cfg.stopAtDrop) return 'drop';
    if (run > 1e-9) {
      // Looked at a little ahead of the feet (so tiny steps can neither creep up a wall nor stop short of one). Steeper than the legs
      // climb there: a slope if the ground past it is steep too, a step (a kerb, a deck) if it is walkable again beyond.
      const ux = (x - s.x) / run, uz = (z - s.z) / run, d = 0.15, near = world.groundAt(x + ux * d, z + uz * d);
      if ((near - g) / d > cfg.maxSlope) {
        const beyond = (world.groundAt(x + ux * 2 * d, z + uz * 2 * d) - near) / d;
        if (beyond > cfg.maxSlope || near - g > cfg.stepUp) return 'slope';
      }
    }
    return null;
  };
  // (blocked holds until the walker is half a metre from where it was stopped, so pressing on against a wall, or edging up to
  // the water, is one event and not one every few ticks)
  let stoppedAt = null;
  const block = reason => {
    if (reason && reason !== s.blocked) { s.blocked = reason; stoppedAt = { x: s.x, z: s.z }; events.emit('blocked', { by: reason }); }
    else if (!reason && s.blocked && Math.hypot(s.x - stoppedAt.x, s.z - stoppedAt.z) > 0.5) { s.blocked = null; stoppedAt = null; }
  };
  const land = () => {
    const impact = Math.max(0, -s.vy), g = world.groundAt(s.x, s.z), w = world.waterAt(s.x, s.z);
    s.y = w !== null && w > g ? w : g; s.vy = 0; s.onGround = true;
    if (impact > cfg.injuryImpact) {
      s.vx = s.vz = 0; s.downFor = cfg.downSeconds; s.phase = 'down';
      events.emit('crash', { kind: 'fall', impact, water: w !== null && w > g });
    } else events.emit('touchdown', { impact, water: w !== null && w > g });
  };

  const walker = {
    kind: 'walker',
    world,
    get config() { return cfg; },
    get phase() { return s.phase; },
    get airborne() { return !s.onGround; },
    /** What stopped the last move ('water', 'solid', 'slope', 'drop', 'bounds'), or null. */
    get blocked() { return s.blocked; },
    /** The drawn stride's phase, 0..1 per two steps. */
    get stride() { return s.stride; },
    get speed() { return Math.hypot(s.vx, s.vz); },
    on: events.on, once: events.once,

    /**
     * One tick. input: forward (-1 back .. +1 ahead; a gentle stick walks, full runs), turn (-1 left .. +1 right) or face (a heading to
     * turn toward), strafe (-1 left .. +1 right), sprint, jump.
     */
    step(dt, input = {}) {
      if (!(dt >= 0) || dt === Infinity) throw new RangeError(`walker.step: dt must be a finite number of seconds >= 0 (got ${dt})`);
      if (dt === 0) return walker;
      if (s.phase === 'down') { s.downFor -= dt; if (s.downFor <= 0) s.phase = 'stand'; return walker; }
      const forward = clamp(finite(input.forward), -1, 1), strafe = clamp(finite(input.strafe), -1, 1);
      if (Number.isFinite(input.face)) {
        const d = Math.atan2(Math.sin(input.face - s.heading), Math.cos(input.face - s.heading));
        s.heading += clamp(d, -cfg.turnRate * dt, cfg.turnRate * dt);
      } else s.heading += clamp(finite(input.turn), -1, 1) * cfg.turnRate * dt;
      const fx = Math.sin(s.heading), fz = Math.cos(s.heading), rx = Math.cos(s.heading), rz = -Math.sin(s.heading);
      const mat = world.materialAt(s.x, s.z); s.material = mat.name;
      const pace = input.sprint ? cfg.sprintSpeed : cfg.runSpeed;

      if (s.onGround) {
        // The ground's slope under the feet, one-sided both ways and the gentler taken (minmod), so the edge of a step or a deck
        // is not read as a slope to slide down.
        const g0 = world.groundAt(s.x, s.z), minmod = (a, b) => a * b <= 0 ? 0 : Math.abs(a) < Math.abs(b) ? a : b;
        const gx = minmod(world.groundAt(s.x + 0.5, s.z) - g0, g0 - world.groundAt(s.x - 0.5, s.z)) * 2, gz = minmod(world.groundAt(s.x, s.z + 0.5) - g0, g0 - world.groundAt(s.x, s.z - 0.5)) * 2;
        const slope = Math.hypot(gx, gz);
        // Where the legs want to go, at the pace this ground allows.
        let wx = (fx * forward * (forward < 0 ? cfg.backShare : 1) + rx * strafe * cfg.strafeShare) * pace;
        let wz = (fz * forward * (forward < 0 ? cfg.backShare : 1) + rz * strafe * cfg.strafeShare) * pace;
        const want = Math.hypot(wx, wz);
        if (want > 1e-6) {
          const grade = (gx * wx + gz * wz) / want;
          const k = (grade > 0 ? 1 / (1 + cfg.uphillCost * grade) : Math.min(cfg.downhillMax, 1 - cfg.downhillGain * grade)) * (1 - cfg.softCost * mat.softness);
          wx *= k; wz *= k;
        }
        const accel = cfg.acceleration * clamp(mat.grip / 0.55, 0.15, 1.2) * dt;
        const dvx = wx - s.vx, dvz = wz - s.vz, dv = Math.hypot(dvx, dvz), take = dv > accel ? accel / dv : 1;
        s.vx += dvx * take; s.vz += dvz * take;
        // Ground too steep for this grip slides out from under the feet, down the fall line, against the glide friction.
        if (slope > mat.grip * cfg.slideGrip) {
          const sin = slope / Math.hypot(1, slope), cos = 1 / Math.hypot(1, slope), a = Math.max(0, cfg.gravity * (sin - mat.glide * cos));
          s.vx -= gx / slope * a * dt; s.vz -= gz / slope * a * dt; s.phase = 'slide';
        }
        // The move, sliding along whatever stops it.
        const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt;
        let why = stop(nx, nz, g0);
        if (!why) { s.x = nx; s.z = nz; }
        else if (!stop(nx, s.z, g0)) { s.x = nx; s.vz = 0; }
        else if (!stop(s.x, nz, g0)) { s.z = nz; s.vx = 0; }
        else { s.vx = s.vz = 0; }
        block(why);
        const g1 = world.groundAt(s.x, s.z), moved = Math.hypot(s.vx, s.vz) * dt;
        if (g1 < g0 - (cfg.stepDown + moved * cfg.maxSlope)) { s.onGround = false; s.y = g0; s.phase = 'fall'; events.emit('airborne', { reason: 'ledge' }); }
        else {
          s.y = g1;
          const speed = Math.hypot(s.vx, s.vz);
          s.stride = (s.stride + moved / (2 * cfg.strideLength)) % 1;
          if (s.phase !== 'slide' || slope <= mat.grip * cfg.slideGrip) s.phase = speed < 0.2 ? 'stand' : speed < 2.2 ? 'walk' : speed <= cfg.runSpeed * 1.05 ? 'run' : 'sprint';
          if (input.jump) { s.vy = cfg.jumpSpeed; s.onGround = false; s.phase = 'fall'; events.emit('airborne', { reason: 'jump' }); }
        }
        return walker;
      }

      // In the air: gravity, a little steering, and the ground (or water) to land on.
      s.vy -= cfg.gravity * dt;
      const ax = (fx * forward + rx * strafe) * cfg.acceleration * cfg.airControl * dt, az = (fz * forward + rz * strafe) * cfg.acceleration * cfg.airControl * dt;
      s.vx += ax; s.vz += az;
      const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt, ny = s.y + s.vy * dt;
      if (!world.inBounds(nx, nz) || world.solidAt(nx, ny + 1, nz)) { s.vx = s.vz = 0; block(world.inBounds(nx, nz) ? 'solid' : 'bounds'); }
      else { s.x = nx; s.z = nz; }
      s.y = ny;
      const g = world.groundAt(s.x, s.z), w = world.waterAt(s.x, s.z), floor = w !== null && w > g ? w : g;
      if (s.y <= floor) land();
      return walker;
    },

    pose(out = {}) { return makePose({ x: s.x, y: s.y, z: s.z, heading: s.heading }, out); },
    velocity(out = {}) { out.x = s.vx; out.y = s.vy; out.z = s.vz; return out; },
    /** Stands the walker somewhere else (on the ground unless y says otherwise), at rest. */
    place(where) { place(where); return walker; },
    /** Plain data, to record, replay and restore (restore(state)). */
    state() { return { ...s }; },
    restore(state) { Object.assign(s, state); return walker; },
  };
  return walker;
}
