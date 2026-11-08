/**
 * Polars: what a glider's performance looks like, in numbers ready to chart or compare. Works for any model with a
 * performance object (stallSpeed, trimSpeed, sink), so for presets, tuned gliders and the classic model alike.
 *
 *   const p = glider.polar();          // or polarOf(performance(config))
 *   p.points                           // [{ airspeed, sink, glideRatio }] from the stall to the top speed, m/s
 *   p.bestGlide, p.minSink             // { airspeed, sink, glideRatio }
 *   p.speedToFly({ headwind: 5, sink: 1 })   // the airspeed for the flattest glide over the ground in that air
 */

/**
 * perf: a performance object (performance(config), glider.performance). options: step (m/s between points), maxSpeed (cap the
 * curve, m/s; default the top speed or 40 m/s, whichever is lower).
 */
export function polarOf(perf, { step = 0.25, maxSpeed = Infinity } = {}) {
  const stallSpeed = perf.stallSpeed(), trimSpeed = perf.trimSpeed(0), topSpeed = perf.trimSpeed(-1);
  const end = Math.min(topSpeed, maxSpeed, 40), points = [];
  for (let v = stallSpeed; v <= end + 1e-9; v += step) { const sink = perf.sink(v); points.push({ airspeed: v, sink, glideRatio: v / sink }); }
  if (!points.length || points.at(-1).airspeed < end - 1e-9) { const sink = perf.sink(end); points.push({ airspeed: end, sink, glideRatio: end / sink }); }
  const pick = (better) => points.reduce((a, b) => (better(b, a) ? b : a));
  const minSink = pick((a, b) => a.sink < b.sink), bestGlide = pick((a, b) => a.glideRatio > b.glideRatio);
  /**
   * Speed to fly: the airspeed giving the flattest path over the ground with this headwind (m/s, + into the face) through air
   * sinking at sink m/s (negative: rising). Returns { airspeed, glideRatio } with glideRatio over the ground (Infinity when
   * the glider climbs, null if it cannot make headway).
   */
  const speedToFly = ({ headwind = 0, sink = 0 } = {}) => {
    let best = null;
    for (const p of points) {
      const ground = p.airspeed - headwind, down = p.sink + sink;
      if (ground <= 0) continue;
      const ratio = down <= 0 ? Infinity : ground / down;
      if (!best || ratio > best.glideRatio || (ratio === Infinity && best.glideRatio === Infinity && p.airspeed < best.airspeed)) best = { airspeed: p.airspeed, glideRatio: ratio };
    }
    return best;
  };
  return { points, stallSpeed, trimSpeed, topSpeed, minSink, bestGlide, trimSink: perf.sink(trimSpeed), speedToFly };
}
