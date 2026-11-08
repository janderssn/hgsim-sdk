/**
 * Landings: the rules a touchdown is judged and scored by, and the pure helpers for an approach (the flare zone, the height a
 * pull-out needs, where the flight path meets the ground). Glider.land() and Glider.contact() use these with the glider's state;
 * they work as well on contacts you compute yourself.
 *
 *   judgeTouchdown({ verticalSpeed: 1.8, groundSpeed: 6 })            // 'soft'
 *   scoreLanding(contact, { x: 0, z: 0, radius: 60 })                   // { judged, points, stars, notes, ... }
 *   scoreLanding(contact, mark, defineConfig(LANDING_RULES, { bullseyeRadius: 3 }))
 */
import { clamp, finite } from './math.js';

export const LANDING_RULES = Object.freeze({
  // Touchdown judgement (vertical contact speed and ground speed), see judgeTouchdown. A flared touchdown is near
  // 3-5 m/s airspeed, so the ground speed is set by the wind. (The pilot's legs take a 2 m/s step-down; beyond 3.6 m/s the frame does.)
  softTouchdown: Object.freeze({ vertical: 2.2, ground: 8.6 }),
  firmTouchdown: Object.freeze({ vertical: 4.8, ground: 10.5 }),
  roughTouchdown: Object.freeze({ vertical: 2.8, ground: 19 }),
  maxTouchdownSlope: 0.45,
  maxTouchdownBank: 0.42,
  // Downwind the ground speed is the airspeed plus the wind, and few pilots can run that out. Above tailwindFree (m/s) only a
  // well flared, slow touchdown survives: airspeed under tailwindAirspeed, less tailwindSlope per m/s of extra tailwind.
  tailwindFree: 1, tailwindAirspeed: 8.5, tailwindSlope: 0.5,
  // Landing score (scoreLanding).
  landingPoints: Object.freeze({ soft: 300, firm: 150, rough: 50, crash: 0, headwind: 250, bullseye: 500, inner: 300, outer: 150, pad: 60, noStep: 300 }),
  noStepTouchdown: Object.freeze({ vertical: 2.2, ground: 3.8 }),
  bullseyeRadius: 6,
  innerRingRadius: 15,
  outerRingRadius: 30,
});

/**
 * Touchdown judgement. verticalSpeed: speed into the ground (m/s, positive down; pass the contact speed on a slope),
 * groundSpeed: horizontal speed over the ground, slope (rise per metre), bank (rad), tailwind (m/s). Returns 'soft', 'firm', 'rough' or 'crash'.
 */
export function judgeTouchdown({ verticalSpeed = 0, groundSpeed = 0, slope = 0, bank = 0, tailwind = 0 } = {}, rules = LANDING_RULES) {
  const cfg = rules;
  const vertical = Math.max(0, finite(verticalSpeed)), ground = Math.abs(finite(groundSpeed));
  if (!(finite(slope, 1) < cfg.maxTouchdownSlope) || Math.abs(finite(bank)) > cfg.maxTouchdownBank) return 'crash';
  const tail = finite(tailwind);
  if (tail > cfg.tailwindFree && (vertical >= cfg.softTouchdown.vertical || ground - tail >= cfg.tailwindAirspeed - cfg.tailwindSlope * (tail - cfg.tailwindFree))) return 'crash';
  if (vertical < cfg.softTouchdown.vertical && ground < cfg.softTouchdown.ground) return 'soft';
  if (vertical < cfg.firmTouchdown.vertical && ground < cfg.firmTouchdown.ground) return 'firm';
  if (vertical < cfg.roughTouchdown.vertical && ground < cfg.roughTouchdown.ground) return 'rough';
  return 'crash';
}

/**
 * Landing score (every term is something a real pilot plans for).
 * touchdown: { verticalSpeed, groundSpeed, slope, bank } as for judgeTouchdown, plus heading (rad), airspeed, the
 * wind {x, z} at touchdown and flare { pressed, feet, ratio, balloon } (the state's flare bookkeeping); target:
 * { x, z, radius } of the landing mark (optional) with the touchdown position { x, z }.
 * Returns { judged, points, headwind, tailwind, windSpeed, distance, ring, stars, notes, noStep }.
 */
export function scoreLanding(touchdown = {}, target = null, rules = LANDING_RULES) {
  const cfg = rules, pts = cfg.landingPoints;
  const windX = finite(touchdown.wind?.x), windZ = finite(touchdown.wind?.z), windSpeed = Math.hypot(windX, windZ);
  const heading = finite(touchdown.heading);
  // Wind is the direction the air travels toward: a headwind blows against the heading.
  const headwind = -(Math.sin(heading) * windX + Math.cos(heading) * windZ);
  const judged = judgeTouchdown({ ...touchdown, tailwind: -headwind }, rules);
  const notes = [];
  let points = pts[judged] || 0;
  if (judged === 'soft') notes.push('Soft touchdown');
  else if (judged === 'firm') notes.push('Firm touchdown');
  else if (judged === 'rough') notes.push('Rough touchdown');
  let windPoints = 0;
  if (windSpeed > 1.5 && judged !== 'crash') {
    const share = clamp(headwind / windSpeed, -1, 1);
    windPoints = Math.round(pts.headwind * clamp(share / 0.7, 0, 1));
    if (share >= 0.7) notes.push('Into wind');
    else if (share > 0.25) notes.push('Crosswind');
    else if (share < -0.33) notes.push('Downwind');
    else notes.push('Across the wind');
  }
  points += windPoints;
  // The flare: a no-stepper is the prize; a balloon, a late flare or no flare at all is named so it can be learned.
  const vertical = Math.max(0, finite(touchdown.verticalSpeed)), ground = Math.abs(finite(touchdown.groundSpeed));
  let noStep = false;
  if (judged === 'soft' && vertical < cfg.noStepTouchdown.vertical && ground < cfg.noStepTouchdown.ground) { noStep = true; points += pts.noStep; notes.push('No-stepper'); }
  const flare = touchdown.flare;
  if (flare && judged !== 'crash') {
    if (flare.balloon > 0.5) notes.push('Flared too early');
    else if (flare.pressed && finite(flare.feet, 9) < 0.45) notes.push(finite(flare.ratio, 1) > 1.5 ? 'Too fast to flare' : 'Flared late');
    else if (!flare.pressed && !noStep) notes.push('No flare');
  }
  let distance = null, ring = null;
  if (target && Number.isFinite(target.x) && Number.isFinite(target.z) && Number.isFinite(touchdown.x) && Number.isFinite(touchdown.z)) {
    distance = Math.hypot(touchdown.x - target.x, touchdown.z - target.z);
    const radius = finite(target.radius, 60);
    if (judged !== 'crash') {
      if (distance <= cfg.bullseyeRadius) { ring = 'bullseye'; points += pts.bullseye; notes.push('Bullseye'); }
      else if (distance <= cfg.innerRingRadius) { ring = 'inner'; points += pts.inner; notes.push('On the mark'); }
      else if (distance <= cfg.outerRingRadius) { ring = 'outer'; points += pts.outer; notes.push('Near the mark'); }
      else if (distance <= radius) { ring = 'pad'; points += pts.pad; }
    }
  }
  const best = pts.soft + pts.headwind + pts.bullseye + pts.noStep;
  const stars = judged === 'crash' ? 0 : points >= best * 0.85 ? 3 : points >= best * 0.5 ? 2 : 1;
  return { judged, points, headwind, tailwind: -headwind, windSpeed, distance, ring, stars, notes, noStep };
}

/* ---------- the approach ---------- */
// Where holding S gives a soft touchdown for the default wing on a hands-off final, measured on the flight model: the bar takes
// time, so the push starts this high. Any other wing, or speed: measureFlareZone (Glider.flareZone).
export const ZONE_LOW = 2.7, ZONE_HIGH = 3.3;

/**
 * Height a pull-out from this dive uses up, fitted to measured pull-outs of the flight model with a small margin (a full
 * pull-out takes about 3 s whatever the speed). push: pushing out fully at once. free: only letting go of the bar.
 */
export function pullOutHeights({ speed, sink }) {
  const s = Math.max(sink, 0), steep = clamp(s / Math.max(speed, 1), 0, 1);
  return { push: 11 + s * (1.1 + 1.6 * steep), free: 8 + s * (1 + 4 * steep) };
}

/**
 * Follows the current flight path over the terrain: the height from here down to where it meets the ground, or null if it does
 * not within the look-ahead. Flying parallel to a hillside this stays null; it is the hill running out ahead that it sees.
 */
export function dropToImpact({ x, feetY, z, vx, vy, vz, terrainHeight, seconds = 8, step = .4 }) {
  if (vy >= 0) return null;
  const below = t => feetY + vy * t <= terrainHeight(x + vx * t, z + vz * t);
  for (let t = step; t <= seconds + 1e-6; t += step) if (below(t)) {
    // Narrow down where it meets the ground, so the reading moves smoothly instead of in steps of the look-ahead.
    let a = t - step, b = t;
    for (let i = 0; i < 5; i++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
    return Math.max(0, -vy * b);
  }
  return null;
}


/**
 * Measures where a flare lands softly for a wing, at each approach speed: for each speed (a steady final from start m, 14 by default, the bar held
 * for it; hands off at the trim speed), the heights of the body reference above flat ground, less footHeight, from which holding the bar fully out gives a soft touchdown. Flown on fresh gliders from
 * makeGlider(init) (createGlider with the wing's config), in a light headwind. Returns
 * { zones: [{ airspeed, low, high } | { airspeed, low: null, high: null }], at(airspeed) }, where at() interpolates the zone for any
 * airspeed (null where no flare is soft: too slow to flare, or too fast to land). The longest run of soft heights is the zone.
 */
export function measureFlareZone(makeGlider, perf, { speeds = [1.1, 1.25, 1.4, 1.55, 1.7, 1.85], heights = { from: 0.4, to: 5, step: 0.2 }, footHeight = 2.4, start = 14, barFor } = {}) {
  const stall = perf.stallSpeed(), trim = perf.trimSpeed(0), zones = [];
  // (the trim speed itself is flown hands off: a free bar lets the pilot come upright on final, which changes the flare)
  const grid = [...speeds.map(k => k * stall).filter(v => Math.abs(v - trim) > 0.04 * trim), trim].sort((a, b) => a - b);
  for (const airspeed of grid) {
    const bar = airspeed === trim ? 0 : barFor(airspeed);
    let run = null, best = null, misses = 0;
    for (let h = heights.from; h <= heights.to + 1e-9 && misses < 3; h += heights.step) {
      const g = makeGlider({ y: footHeight + Math.max(start, h + 6), airspeed, pathAngle: perf.glideAngle(airspeed) });
      g.state.bar = bar; let on = false;
      for (let i = 0; i < 2400 && !g.contact(); i++) { if (g.height() - footHeight < h) on = true; g.step(1 / 60, { pitch: on ? 1 : bar, field: g.height() < 14 }); }
      const soft = !!g.contact() && g.land().judged === 'soft';
      misses = soft ? 0 : best || run ? misses + 1 : 0;   // (well past the soft heights: the rest are all hard)
      if (soft) run = run ? { low: run.low, high: h } : { low: h, high: h };
      if ((!soft || h + heights.step > heights.to + 1e-9) && run) { if (!best || run.high - run.low > best.high - best.low) best = run; run = null; }
    }
    zones.push({ airspeed, low: best?.low ?? null, high: best?.high ?? null });
  }
  const at = airspeed => {
    if (!(airspeed >= zones[0].airspeed * 0.97 && airspeed <= zones.at(-1).airspeed * 1.03)) return null;
    let i = zones.findIndex(z => z.airspeed >= airspeed);
    if (i <= 0) i = i === 0 ? 1 : zones.length - 1;
    const a = zones[i - 1], b = zones[i], t = clamp((airspeed - a.airspeed) / (b.airspeed - a.airspeed), 0, 1);
    if (a.low === null && b.low === null) return null;
    if (a.low === null || b.low === null) { const z = t < 0.5 ? a : b; return z.low === null ? null : { low: z.low, high: z.high }; }
    return { low: a.low + (b.low - a.low) * t, high: a.high + (b.high - a.high) * t };
  };
  return { zones, at };
}
