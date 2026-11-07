const LINEAR_FIELDS = ['x', 'y', 'z', 'pitch', 'bank', 'visualBank'];

/** Interpolates drawing values without changing either simulation snapshot. */
export function interpolateMotion(previous, current, alpha, out = {}) {
  const blend = Math.max(0, Math.min(1, alpha));
  for (const key of LINEAR_FIELDS) {
    out[key] = previous[key] + (current[key] - previous[key]) * blend;
  }
  const turn = current.heading - previous.heading;
  const shortestTurn = Math.atan2(Math.sin(turn), Math.cos(turn));
  out.heading = previous.heading + shortestTurn * blend;
  return out;
}
