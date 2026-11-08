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
// Where holding S gives a soft touchdown, measured on the flight model: the bar takes time, so the push starts this high.
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

