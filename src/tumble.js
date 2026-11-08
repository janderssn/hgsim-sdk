/**
 * A launch gone wrong, carried on by physics: the glider and its pilot as one rigid body, from the state the launch was in when it
 * went wrong (its speed down the run, its roll and yaw and their rates). Gravity pulls it down, the wind presses on the sail as a
 * flat plate (so a sail tipped into the wind is lifted and turned), and the wing tips, nose, keel, base bar and the pilot hit the
 * ground with friction: a tip that digs in pins and slews the wing round, a sail taken by the wind lifts and slams. It runs until
 * the wreck comes to rest. Nothing about how it ends is chosen: only the hardest impact is recorded, for the crash's severity.
 *
 * Frame: the model's own (x right, y up, z forward), origin at the wing's reference point, as drawn by the games.
 */

// Where things are on the glider, from the model: span 9.1 m, nose 2.5 m ahead, base bar .6 m and the pilot's feet 1 m below.
const POINTS = [[0, .95, 2.45], [-4.5, .9, -.9], [4.5, .9, -.9], [0, .95, -1.05], [-.7, -.6, .95], [.7, -.6, .95], [0, -1, .85], [0, .75, 1.15], [0, 2.1, .6]];
const CG = [0, .27, .8], CP = [0, .95, .5];
const MASS = 110, INERTIA = [55, 185, 175];            // about the model's x (pitch), y (yaw) and z (roll) axes through the centre of mass
const AREA = 15, RHO = 1.1, CN = 1.8, CD = .15;        // the sail as a flat plate
const SPIN_DAMP = [150, 220, 260];                      // the air's resistance to the sail turning, per axis (N m s)
const K = 30000, C = 2500, MU = .7;                     // ground contact per point: stiffness, damping, friction
const G = 9.81, STEP = 1 / 240;
const SOLID_PROBE = .05, SOLID_REACH = 4;               // how finely, and how far, a point inside a solid looks for the way out (m)
const SOLID_PRESS = .15;                                 // the most depth a wall's spring pushes back on (m)
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(a[0], a[1], a[2]);
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const rot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)); return [p[0], p[1], p[2]]; };
const axis = (x, y, z, a) => [x * Math.sin(a / 2), y * Math.sin(a / 2), z * Math.sin(a / 2), Math.cos(a / 2)];

/** The orientation the games draw with rotation.set(pitch, heading, roll, 'YXZ'), as a quaternion [x, y, z, w]. */
export function quaternionOf(pitch, heading, roll) { return qmul(qmul(axis(0, 1, 0, heading), axis(1, 0, 0, pitch)), axis(0, 0, 1, roll)); }

/**
 * x, y, z: the model's origin in the world; pitch, heading, roll: its attitude (as drawn); speed: m/s along heading, vy up;
 * rollRate, yawRate: rad/s (roll about the model's forward axis, + right wing up; yaw + nose right); ground(x, z): the height of
 * whatever is underfoot (terrain, a deck, a rock); wind {x, z}: the air's velocity; solid(x, y, z): what solid thing is at a point
 * (World.solidAt), or null, for the walls a wreck must stop against.
 */
export function createTumble({ x, y, z, pitch = 0, heading = 0, roll = 0, speed = 0, vy = 0, velocity = null, rollRate = 0, yawRate = 0, ground, wind = { x: 0, z: 0 }, solid = null }) {
  const q = quaternionOf(pitch, heading, roll), c = add([x, y, z], rot(q, CG));
  const v = velocity ? [...velocity] : [Math.sin(heading) * speed, vy, Math.cos(heading) * speed];   // (velocity: a flight's own, wind drift and sink included)
  // Roll is about the model's forward axis, yaw about the world's vertical.
  const w = add(scale(rot(q, [0, 0, 1]), -rollRate), [0, -yawRate, 0]);
  return { t: 0, c, v, q, w, ground, wind, solid, escape: POINTS.map(() => null), hit: null, impact: 0, still: 0, done: false, speed0: speed, ...originOf(c, q) };
}

function originOf(c, q) { return { x: c[0] - rot(q, CG)[0], y: c[1] - rot(q, CG)[1], z: c[2] - rot(q, CG)[2] }; }

export function stepTumble(s, dt) {
  if (s.done) return s;
  for (let left = Math.min(dt, .05); left > 1e-6; left -= STEP) {
    const h = Math.min(STEP, left);
    let F = [0, -MASS * G, 0], T = [0, 0, 0];
    const at = (r, f) => { F = add(F, f); T = add(T, cross(r, f)); };
    // The air on the sail: a flat plate, pressed along its normal by the air crossing it, and dragged along with it.
    const rp = rot(s.q, sub(CP, CG)), n = rot(s.q, [0, 1, 0]), vp = add(s.v, cross(s.w, rp)), va = sub([s.wind.x, 0, s.wind.z], vp), sp = len(va);
    at(rp, add(scale(n, .5 * RHO * AREA * CN * sp * dot(va, n)), scale(va, .5 * RHO * AREA * CD * sp)));
    // The ground under each point.
    for (const p of POINTS) {
      const r = rot(s.q, sub(p, CG)), wp = add(s.c, r), g = s.ground(wp[0], wp[2]), pen = g - wp[1];
      if (pen <= 0) continue;
      const vel = add(s.v, cross(s.w, r)), N = Math.max(0, K * pen - C * vel[1]);
      if (-vel[1] > s.impact) s.impact = -vel[1];
      const tx = vel[0], tz = vel[2], ts = Math.max(Math.hypot(tx, tz), .15);
      at(r, [-MU * N * tx / ts, N, -MU * N * tz / ts]);
    }
    // Solid things (a building, a hut, a pylon): the world only says whether a point is inside one, so the wall's normal is the
    // shortest way out (looked for along the six axes and back along the way the point came in) and the depth is how far that is.
    // The wall then pushes back as the ground does: a spring on the depth, damping, and friction along it.
    if (s.solid) POINTS.forEach((p, i) => {
      const r = rot(s.q, sub(p, CG)), wp = add(s.c, r), hit = s.solid(wp[0], wp[1], wp[2]);
      if (!hit) { s.escape[i] = null; return; }
      const vel = add(s.v, cross(s.w, r)), sp = len(vel);
      if (!s.escape[i]) { s.escape[i] = sp > .05 ? scale(vel, -1 / sp) : [0, 1, 0]; s.hit ??= hit; }
      let d = null, pen = SOLID_REACH;
      for (const dir of [s.escape[i], ...AXES]) for (let k = SOLID_PROBE; k < pen; k += SOLID_PROBE)
        if (!s.solid(wp[0] + dir[0] * k, wp[1] + dir[1] * k, wp[2] + dir[2] * k)) { d = dir; pen = k; break; }
      if (!d) d = s.escape[i];
      // (the spring is capped at SOLID_PRESS of depth: a point that starts deep inside, as a nose already through a wall when the
      // crash is found, is pushed out gently instead of being fired out with energy it never had)
      const into = dot(vel, d), N = Math.max(0, K * Math.min(pen, SOLID_PRESS) - C * into);
      if (-into > s.impact) s.impact = -into;
      const vt = sub(vel, scale(d, into)), ts = Math.max(len(vt), .15);
      at(r, add(scale(d, N), scale(vt, -MU * N / ts)));
    });
    // Turning: the body's inertia (in its own axes) against the torques, and the air resisting the spin.
    const wl = rot(qconj(s.q), s.w), Tl = sub(rot(qconj(s.q), T), [SPIN_DAMP[0] * wl[0], SPIN_DAMP[1] * wl[1], SPIN_DAMP[2] * wl[2]]);
    const dwl = [Tl[0] / INERTIA[0], Tl[1] / INERTIA[1], Tl[2] / INERTIA[2]];
    s.w = add(s.w, scale(rot(s.q, dwl), h));
    s.v = add(s.v, scale(F, h / MASS)); s.c = add(s.c, scale(s.v, h));
    const dq = qmul([s.w[0], s.w[1], s.w[2], 0], s.q); s.q = s.q.map((x, i) => x + .5 * dq[i] * h); const m = Math.hypot(...s.q); s.q = s.q.map(x => x / m);
  }
  s.t += dt;
  // At rest once it has stopped moving and turning for a moment; or after long enough, once it is only creeping (never while it
  // is still falling, as down a cliff or a wall); or after a minute whatever it is doing.
  s.still = len(s.v) < .35 && len(s.w) < .4 ? s.still + dt : 0;
  if ((s.t > .8 && s.still > .5) || (s.t > 7 && len(s.v) < 3) || s.t > 60) s.done = true;
  Object.assign(s, originOf(s.c, s.q));
  return s;
}
