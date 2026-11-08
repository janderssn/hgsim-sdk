// Fits each glider preset's aerodynamics to its reference data (src/presets.js `reference`): the drag numbers (cd0, oswald,
// twistDrag, twistLift) to the reference polar points, and the angles of attack to the stall, trim and top speeds.
// Prints the fitted values to paste into the preset, and how well they fit.
//   node tools/fit-presets.mjs [preset-id]
import { PRESETS, GLIDER_DEFAULTS, defineConfig, performance } from '../src/index.js';

const DEG = Math.PI / 180, kmh = v => v / 3.6;

/** Angle of attack at which this config carries its weight at airspeed v (linear lift range). */
const alphaAt = (cfg, v) => cfg.zeroLiftAlpha + (2 * cfg.mass * cfg.gravity / (cfg.airDensity * cfg.wingArea * v * v)) / cfg.liftSlope;

/** The angles for the reference speeds: stall, hands-off trim and full bar in (the top speed). */
function angles(cfg, ref) {
  return { stallAlpha: alphaAt(cfg, kmh(ref.stallKmh)), alphaTrim: alphaAt(cfg, kmh(ref.trimKmh)), alphaMin: alphaAt(cfg, kmh(ref.topKmh)) };
}

function errorOf(base, ref, x) {
  const [cd0, oswald, twistDrag, twistLift] = x;
  if (cd0 < 0.005 || oswald < 0.4 || oswald > 0.98 || twistDrag < 0 || twistLift < 0.1 || twistLift > 1.2) return 1e9;
  const cfg = { ...base, cd0, oswald, twistDrag, twistLift };
  const perf = performance(cfg);
  let e = 0;
  for (const [speed, sink] of ref.points) { const d = (perf.sink(kmh(speed)) - sink) / sink; e += d * d; }
  return e / ref.points.length;
}

/** Nelder-Mead over the four drag numbers. */
function fit(base, ref) {
  let simplex = [[0.03, 0.8, 0.5, 0.5]];
  for (let i = 0; i < 4; i++) { const p = [...simplex[0]]; p[i] *= 1.3; simplex.push(p); }
  let scored = simplex.map(x => ({ x, e: errorOf(base, ref, x) }));
  for (let it = 0; it < 4000; it++) {
    scored.sort((a, b) => a.e - b.e);
    const n = 4, centroid = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += scored[i].x[j] / n;
    const worst = scored[n], at = t => centroid.map((c, j) => c + t * (worst.x[j] - c)), score = x => ({ x, e: errorOf(base, ref, x) });
    const r = score(at(-1));
    if (r.e < scored[0].e) { const ex = score(at(-2)); scored[n] = ex.e < r.e ? ex : r; }
    else if (r.e < scored[n - 1].e) scored[n] = r;
    else { const c = score(at(0.5)); if (c.e < worst.e) scored[n] = c; else scored = scored.map((s, i) => (i ? score(s.x.map((v, j) => scored[0].x[j] + 0.5 * (v - scored[0].x[j]))) : s)); }
  }
  scored.sort((a, b) => a.e - b.e);
  return scored[0];
}

const only = process.argv[2];
for (const preset of Object.values(PRESETS)) {
  if (only && preset.id !== only) continue;
  const sails = preset.vg ? [['loose', preset.vg.loose, preset.reference?.loose], ['tight', preset.vg.tight, preset.reference?.tight]] : [['', {}, preset.reference]];
  for (const [label, vgValues, ref] of sails) {
    if (!ref) continue;
    let base = defineConfig(GLIDER_DEFAULTS, { ...preset.config, ...vgValues });
    base = { ...base, ...angles(base, ref) };
    const best = fit(base, ref), [cd0, oswald, twistDrag, twistLift] = best.x;
    const cfg = { ...base, cd0, oswald, twistDrag, twistLift }, perf = performance(cfg);
    const r = n => +n.toFixed(4), d = a => `${r(a / DEG)} * DEG`;
    console.log(`\n${preset.id} ${label}  rms error ${(Math.sqrt(best.e) * 100).toFixed(1)}%`);
    console.log(`  cd0: ${r(cd0)}, oswald: ${r(oswald)}, twistDrag: ${r(twistDrag)}, twistLift: ${r(twistLift)},`);
    console.log(`  stallAlpha: ${d(base.stallAlpha)}, alphaTrim: ${d(base.alphaTrim)}, alphaMin: ${d(base.alphaMin)},`);
    console.log('  ' + ref.points.map(([v, s]) => `${v}: ${s.toFixed(2)}→${perf.sink(kmh(v)).toFixed(2)}`).join('  '));
  }
}
