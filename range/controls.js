/** Translate devices into simulation controls without depending on the DOM. */
const clamp = value => Math.max(-1, Math.min(1, value));
const finite = value => Number.isFinite(value) ? value : 0;
const axis = value => {
  const amount = Math.min(1, Math.abs(value) / .9);
  return Math.sign(value) * amount * (.4 + .6 * amount);
};
const trigger = value => value > .06 ? (value - .06) / .94 : 0;
const PITCH_DEADZONE = .05;

export function readFlightControls(keys, pad = {}) {
  const held = (primary, alternate) => keys.has(primary) || keys.has(alternate) ? 1 : 0;
  const keyboardPitch = held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp');
  const stickPitch = finite(pad.ly);
  return {
    roll: clamp(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft') + finite(pad.lx)),
    pitch: clamp(keyboardPitch + axis(stickPitch + trigger(finite(pad.lt)) - trigger(finite(pad.rt)))),
    nose: clamp(keyboardPitch + axis(stickPitch)),
    push: keys.has('ShiftLeft') || trigger(finite(pad.rt)) > .3 ? 1 : 0,
  };
}

const smooth = (start, end, value) => {
  const amount = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return amount * amount * (3 - 2 * amount);
};

/**
 * Keep the launch trim until a new flight input takes over. A key held while
 * running, then released after lift-off, is still the launch input: treating it
 * as a fresh bar command can drop a slow wing back onto the ramp.
 */
export function createTakeoffControls({ heldPitch = 0, holdBar = 0, dropped = false, cliff = false, realistic = false } = {}) {
  const inheritedPitch = clamp(finite(heldPitch));
  let waitingForRelease = Math.abs(inheritedPitch) >= PITCH_DEADZONE;
  let handed = false;

  return {
    get handed() { return handed; },
    pitch(input, { age = 0, airspeed = 0 } = {}) {
      const value = clamp(finite(input));
      const active = Math.abs(value) >= PITCH_DEADZONE;
      if (waitingForRelease) {
        if (!active) waitingForRelease = false;
        // A reversal is a deliberate new command, including before release.
        else if (Math.sign(value) !== Math.sign(inheritedPitch)) {
          waitingForRelease = false;
          handed = true;
        }
      } else if (active) handed = true;

      // A cliff step-off needs the same dive assistance as an Easy edge launch.
      if (dropped && (!realistic || cliff)) {
        return value <= 0 && airspeed < 16 ? Math.min(value, -.3) : value;
      }
      if (handed) return value;
      return clamp(finite(holdBar)) * (realistic ? 1 : 1 - smooth(2, 7, age));
    },
  };
}
