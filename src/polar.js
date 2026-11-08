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

/**
 * Pitch stability (static): for each bar position, how fast the wing pitches back toward its trim angle of attack when it
 * sits at another angle at the steady speed for that angle. Real wings are certified on the same idea, the pitching moment
 * against angle of attack measured on a test rig; this is the model's equivalent, a restoring pitch rate. Positive is nose up.
 *
 * perf needs pitchResponse and steadySpeed (the force model's performance). Returns null for models without them, else
 * { curves: [{ bar, points: [{ alpha, rate, airspeed }], trim: { alpha, airspeed } | null }], stiffness, lowAlphaRecovery }:
 * stiffness is the hands-off slope at the trim (rad/s of nose-up per rad of angle of attack: more negative is stiffer), and
 * lowAlphaRecovery the hands-off nose-up rate at fromAlpha (the steep, fast end, where a wing must still want to pitch up).
 */
export function pitchStabilityOf(perf, { bars = [-0.3, 0, 0.3], fromAlpha = 0, toAlpha = 0.35, step = 0.0025 } = {}) {
  if (!perf?.pitchResponse || !perf.steadySpeed) return null;
  const curves = bars.map(bar => {
    const points = [];
    for (let alpha = fromAlpha; alpha <= toAlpha + 1e-9; alpha += step) points.push({ alpha, rate: perf.pitchResponse(alpha, bar), airspeed: perf.steadySpeed(alpha) });
    let trim = null;
    for (let i = 1; i < points.length && !trim; i++) {
      const a = points[i - 1], b = points[i];
      if (a.rate > 0 && b.rate <= 0) { const t = a.rate / (a.rate - b.rate), alpha = a.alpha + t * (b.alpha - a.alpha); trim = { alpha, airspeed: perf.steadySpeed(alpha) }; }
    }
    return { bar, points, trim };
  });
  const handsOff = curves.find(c => c.bar === 0) ?? curves[0], h = 0.005;
  const at = handsOff.trim?.alpha;
  const stiffness = at === undefined ? null : (perf.pitchResponse(at + h, handsOff.bar) - perf.pitchResponse(at - h, handsOff.bar)) / (2 * h);
  return { curves, stiffness, lowAlphaRecovery: perf.pitchResponse(fromAlpha, handsOff.bar) };
}
