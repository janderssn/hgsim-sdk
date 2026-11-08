/**
 * Poses: where to draw a vehicle. { x, y, z } is the vehicle's reference point (the feet of a walker, the hang point of a hang
 * glider); q is its orientation as a quaternion [x, y, z, w], in three.js order and in the world frame (+y up, +z north);
 * heading (rad, clockwise from +z seen from above), pitch (+ nose up) and roll (+ right side down) are the same orientation to read.
 *
 *   applyPose(vehicle.pose(), mesh)                     // sets mesh.position and mesh.quaternion
 *   const track = createPoseTrack();                    // drawing between fixed ticks:
 *   loop = createSimulationLoop({ step: dt => { track.push(vehicle.pose()); vehicle.step(dt, input()); },
 *                                 render: (_, alpha) => applyPose(track.at(alpha, vehicle.pose()), mesh) });
 */
import { finite } from './math.js';

const half = a => [Math.sin(a / 2), Math.cos(a / 2)];
/** The quaternion for a heading, a pitch (+ nose up) and a roll (+ right side down). */
export function quaternionFrom(heading = 0, pitch = 0, roll = 0, out = [0, 0, 0, 1]) {
  // R = Ry(heading) Rx(-pitch) Rz(roll): three.js's 'YXZ' Euler order, its +x rotation being nose down.
  const [sy, cy] = half(heading), [sx, cx] = half(-pitch), [sz, cz] = half(roll);
  out[0] = cy * sx * cz + sy * cx * sz;
  out[1] = sy * cx * cz - cy * sx * sz;
  out[2] = cy * cx * sz - sy * sx * cz;
  out[3] = cy * cx * cz + sy * sx * sz;
  return out;
}
/** Heading, pitch and roll of a quaternion (the inverse of quaternionFrom). */
export function anglesOf(q, out = {}) {
  const [x, y, z, w] = q;
  const m13 = 2 * (x * z + w * y), m23 = 2 * (y * z - w * x), m33 = 1 - 2 * (x * x + y * y), m21 = 2 * (x * y + w * z), m22 = 1 - 2 * (x * x + z * z);
  const tilt = Math.asin(-Math.max(-1, Math.min(1, m23)));
  out.pitch = -tilt;
  if (Math.abs(m23) < 0.9999999) { out.heading = Math.atan2(m13, m33); out.roll = Math.atan2(m21, m22); }
  else { out.heading = Math.atan2(-2 * (x * z - w * y), 1 - 2 * (y * y + z * z)); out.roll = 0; }
  return out;
}

/** A pose from a position and angles (q filled in). */
export function makePose({ x = 0, y = 0, z = 0, heading = 0, pitch = 0, roll = 0 } = {}, out = {}) {
  out.x = x; out.y = y; out.z = z; out.heading = heading; out.pitch = pitch; out.roll = roll;
  out.q = quaternionFrom(heading, pitch, roll, out.q ?? [0, 0, 0, 1]);
  return out;
}
/** A pose from a position and a quaternion (the angles filled in). */
export function poseFromQuaternion({ x = 0, y = 0, z = 0 }, q, out = {}) {
  out.x = x; out.y = y; out.z = z; out.q = [q[0], q[1], q[2], q[3]];
  return Object.assign(out, anglesOf(out.q));
}

/** The pose t (0..1) of the way from a to b: positions straight, orientations along the shortest arc (slerp). */
export function lerpPose(a, b, t, out = {}) {
  const u = Math.max(0, Math.min(1, finite(t)));
  out.x = a.x + (b.x - a.x) * u; out.y = a.y + (b.y - a.y) * u; out.z = a.z + (b.z - a.z) * u;
  const qa = a.q, qb = b.q;
  let dot = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3], sign = 1;
  if (dot < 0) { dot = -dot; sign = -1; }
  let ka = 1 - u, kb = u;
  if (dot < 0.9995) { const th = Math.acos(dot), s = Math.sin(th); ka = Math.sin((1 - u) * th) / s; kb = Math.sin(u * th) / s; }
  const q = out.q ?? [0, 0, 0, 1];
  for (let i = 0; i < 4; i++) q[i] = ka * qa[i] + kb * sign * qb[i];
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  for (let i = 0; i < 4; i++) q[i] /= n;
  out.q = q;
  return Object.assign(out, anglesOf(q));
}

/**
 * The last two ticks' poses, to draw between: push(pose) before each tick (it keeps a copy), at(alpha, current) after the ticks of a
 * frame, with the loop's alpha and the pose now. Starts (and after clear()) with nothing before, so the first frame draws the current one.
 */
export function createPoseTrack() {
  let before = null;
  const copy = p => ({ x: p.x, y: p.y, z: p.z, heading: p.heading, pitch: p.pitch, roll: p.roll, q: [...p.q] });
  return {
    push(pose) { before = copy(pose); },
    at(alpha, current, out = {}) { return before ? lerpPose(before, current, alpha, out) : Object.assign(out, copy(current)); },
    clear() { before = null; },
  };
}

/** Puts a three.js object (anything with position.set and quaternion.set) at a pose. Returns the object. */
export function applyPose(pose, object) {
  object.position.set(pose.x, pose.y, pose.z);
  object.quaternion.set(pose.q[0], pose.q[1], pose.q[2], pose.q[3]);
  return object;
}
