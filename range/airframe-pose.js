import { shoulderPivot } from '../src/launch.js';

const clamp = value => Math.max(0, Math.min(1, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const smooth = (from, to, value) => {
  const amount = clamp((value - from) / (to - from));
  return amount * amount * (3 - 2 * amount);
};

/**
 * Convert the simulation reference into the model's origin and attitude.
 * Both drawing and crash handover use this transform; physics must never read
 * an interpolated mesh transform left over from the previous rendered frame.
 */
export function getAirframePose({ position, heading, pitch, bank, visualBank = bank,
  ground, takeoff = null, lowest = -.65, hasRig = true, mode = 'gliding', settle = 0 }) {
  const flying = mode === 'gliding';
  const grounded = mode === 'landed' || mode === 'crashed';
  const time = takeoff?.t ?? 9;
  const eased = smooth(0, 1, settle);
  const contactLowest = takeoff ? lerp(takeoff.lowest0, lowest, smooth(2, 8, time)) : lowest;
  const near = surface => smooth(0, 1, 1 - (position.y - surface - 2.3) / 10);
  const closeness = takeoff
    ? lerp(near(takeoff.ground), near(ground), smooth(2, 8, time))
    : near(ground);

  const pose = {
    x: position.x,
    y: position.y - (flying || grounded ? (hasRig ? 2.3 + contactLowest : 1.65) * closeness : 0),
    z: position.z,
    pitch: grounded ? lerp(-pitch, -.2, eased)
      : takeoff ? lerp(takeoff.pitch0, -pitch, smooth(0, takeoff.dropped ? .6 : 1, time)) : -pitch,
    heading: heading + (takeoff ? (takeoff.yaw0 ?? 0) * (1 - smooth(0, 1.2, time)) : 0),
    roll: grounded ? bank * (1 - eased)
      : takeoff ? lerp(takeoff.roll0, visualBank, smooth(0, 1, time)) : flying ? visualBank : bank,
  };
  const shoulders = takeoff ? (takeoff.shoulders0 ?? 0) * (1 - smooth(0, .5, time)) : 0;
  if (shoulders) {
    const offset = shoulderPivot(pose.pitch, pose.heading, pose.roll, shoulders);
    pose.x += offset[0];
    pose.y += offset[1];
    pose.z += offset[2];
  }
  return pose;
}
