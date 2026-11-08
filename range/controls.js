import { createTakeoffBar, takeoffPitch } from '../src/round.js';
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
 * Keep the launch trim until a new flight input takes over (the round's own take-off bar, src/round.js): a key held while running,
 * then released after lift-off, is still the launch input, not a fresh bar command that could drop a slow wing back onto the ramp.
 */
export function createTakeoffControls(options = {}) {
  const bar = createTakeoffBar(options);
  return { get handed() { return bar.handed; }, pitch: (input, info) => takeoffPitch(bar, input, info) };
}
