/** Small numeric helpers shared by the modules. Not part of the public API. */
export const DEG = Math.PI / 180;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
/**
 * The seconds a vehicle's step advances: dt itself, or 0 for a negative one (a frame clock that ran backwards, as a timestamp taken in
 * an input handler can be later than the next frame's own: nothing to step). A non-finite dt (NaN, Infinity) is a mistake and throws a
 * RangeError naming the owner, before it can reach the state.
 */
export function tickSeconds(dt, owner) {
  if (typeof dt !== 'number' || !Number.isFinite(dt)) throw new RangeError(`${owner}: dt must be a finite number of seconds (got ${dt})`);
  return dt > 0 ? dt : 0;
}
/** Wraps an angle to -pi..pi. */
export const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));
