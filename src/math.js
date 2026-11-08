/** Small numeric helpers shared by the modules. Not part of the public API. */
export const DEG = Math.PI / 180;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Wraps an angle to -pi..pi. */
export const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));
