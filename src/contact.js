import { clamp, finite, lerp } from './math.js';

export function applyGroundBounce(state, airspeed, sink, y) {
  const up = Math.max(.3, sink * .3);
  state.airspeed = airspeed;
  state.pathAngle = Math.asin(clamp(up / airspeed, 0, .3));
  state.verticalSpeed = up;
  state.y = y + .02;
  return true;
}

/** Internal wheel response shared by the two built-in flight models. */
export function tryWheelScrape(state, contact, y, stall, rules, maxSink = 4.5) {
  const sink = Math.max(0, finite(contact.verticalSpeed));
  const airspeed = state.airspeed - (.25 + sink * .55);
  if (contact.part !== 'wheel' || !(sink < maxSink) || !(airspeed >= stall)
    || !(finite(contact.slope, 1) < rules.maxTouchdownSlope) || Math.abs(finite(contact.bank)) > rules.maxTouchdownBank) return false;
  return applyGroundBounce(state, airspeed, sink, finite(contact.airframeY, y));
}

/** A gentle, forward tire contact can settle onto the wheels. */
export function canRollOnWheels({ part, verticalSpeed, groundSpeed, slope, bank, forwardSpeed, sideSpeed }) {
  return part === 'wheel' && verticalSpeed <= 2 && groundSpeed <= 13
    && slope <= .20 && Math.abs(bank) <= .15 && forwardSpeed >= 0 && Math.abs(sideSpeed) <= 2;
}

/** Rolling resistance on grass plus the component of gravity along the track. */
export function advanceWheelRoll(speed, grade, dt) {
  const braking = Math.max(.6, 2.25 + 9.81 * grade);
  const movingTime = Math.min(dt, speed / braking);
  const nextSpeed = Math.max(0, speed - braking * dt);
  return { speed: nextSpeed, distance: (speed + nextSpeed) * movingTime * .5 };
}

/** Find the first foot, bar or wheel sample to reach the surface during a physics tick. */
export function sweepFlightContact(before, after, groundHeight, dt) {
  let hit = null;
  for (let index = 0; index < after.length; index++) {
    const end = after[index], start = before[index];
    const gapAt = t => lerp(start.y, end.y, t)
      - groundHeight(lerp(start.x, end.x, t), lerp(start.z, end.z, t));
    let low = 0, lowGap = start.clearance;
    for (const high of [.5, 1]) {
      const highGap = high === 1 ? end.clearance : gapAt(high);
      // A launch or bounce can start on the surface and be moving away.
      if (highGap > 0 || lowGap <= 0 && highGap >= lowGap) {
        low = high;
        lowGap = highGap;
        continue;
      }
      let a = low, b = high;
      if (lowGap <= 0) b = low;
      else for (let i = 0; i < 8; i++) {
        const middle = (a + b) / 2;
        if (gapAt(middle) > 0) a = middle;
        else b = middle;
      }
      if (!hit || b < hit.fraction || b === hit.fraction && hit.part === 'feet' && end.part !== 'feet') {
        const x = lerp(start.x, end.x, b), z = lerp(start.z, end.z, b);
        hit = { x, y: groundHeight(x, z), z, part: end.part, fraction: b, end,
          closingSpeed: (lowGap - highGap) / ((high - low) * dt) };
      }
      break;
    }
  }
  return hit;
}
