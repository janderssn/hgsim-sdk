/**
 * Live wind for Above. The wind vector (x, z) is the direction the air travels toward, in m/s, the convention of
 * flight.js (sampleSoaringAir adds it to ground motion; ridge lift reads it against the slope).
 * A real day's wind is never a constant: the mean meanders in strength (about ±25%) and direction (about ±18°)
 * over a couple of minutes, with lighter gusts on top. Windsocks, streamers and the landing score read the same
 * object, so what the sock shows is what the wing feels.
 * With drift (0..1, the main game uses 1) the day's wind also shifts: over tens of minutes the mean swings up to about
 * ±70° from where it started and its strength by about ±30%, so a launch that faced into the morning wind can go cross
 * or tail later and the pilot picks launches by the wind. It starts exactly at the mean set, and set() moves that.
 *
 *   const wind = createWind({ speed: 5.5, direction: Math.atan2(5, 1.4) });   // or { x, z }
 *   wind.update(dt);  wind.x, wind.z, wind.speed, wind.direction (toward), wind.from (compass heading it blows from)
 *   wind.set({ speed, direction })   changes the mean; variability 0 freezes the mean (the range's sliders).
 */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createWind({ x, z, speed, direction, variability = 1, gusts = 1, drift = 0, seed = 0 } = {}) {
  let meanSpeed = Number.isFinite(speed) ? speed : Math.hypot(x ?? 5, z ?? 1.4);
  let meanDirection = Number.isFinite(direction) ? direction : Math.atan2(x ?? 5, z ?? 1.4);
  let time = seed * 37.1, day = 0;
  const wind = {
    x: 0, z: 0, speed: meanSpeed, direction: meanDirection, variability, gusts, drift,
    /** The day's mean now, after its slow shift (the gusts and short meander ride on this). */
    dayDirection: meanDirection, daySpeed: meanSpeed,
    /** Compass heading the wind blows FROM (radians, heading convention), for text like "wind from the north-west". */
    get from() { return Math.atan2(-Math.sin(wind.direction), -Math.cos(wind.direction)); },
    get meanSpeed() { return meanSpeed; },
    get meanDirection() { return meanDirection; },
    set(patch = {}) {
      if (Number.isFinite(patch.speed)) meanSpeed = Math.max(0, patch.speed);
      if (Number.isFinite(patch.direction)) meanDirection = patch.direction;
      if (Number.isFinite(patch.x) && Number.isFinite(patch.z)) { meanSpeed = Math.hypot(patch.x, patch.z); meanDirection = Math.atan2(patch.x, patch.z); }
      if (Number.isFinite(patch.variability)) wind.variability = patch.variability;
      if (Number.isFinite(patch.gusts)) wind.gusts = patch.gusts;
      if (Number.isFinite(patch.drift)) wind.drift = patch.drift;
      if (Number.isFinite(patch.dayTime)) day = Math.max(0, patch.dayTime);
      wind.update(0);
      return wind;
    },
    /** Seconds of the day's shift so far. */
    get dayTime() { return day; },
    update(dt = 0) {
      const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
      time += step; day += step;
      const v = clamp(wind.variability, 0, 2), g = clamp(wind.gusts, 0, 2), d = clamp(wind.drift, 0, 1.5);
      // The day's shift: periods of 25-70 minutes, starting from zero, so the first minutes fly the wind as set.
      const veer = d * 1.15 * (Math.sin(day * TAU / 2700) * .6 + Math.sin(day * TAU / 4100) * .4);
      const swell = d * .3 * (Math.sin(day * TAU / 3300) * .6 + Math.sin(day * TAU / 1500) * .4);
      wind.dayDirection = meanDirection + veer; wind.daySpeed = meanSpeed * (1 + swell);
      // Slow meander of the mean (periods of about 1.5–2.5 minutes), then short gusts (5–12 s) on top.
      const meander = Math.sin(time * TAU / 97 + 1.3) * 0.6 + Math.sin(time * TAU / 149 + 4.1) * 0.4;
      const wander = Math.sin(time * TAU / 131 + 2.2) * 0.65 + Math.sin(time * TAU / 53 + 0.7) * 0.35;
      const gust = Math.sin(time * TAU / 7.3) * Math.sin(time * TAU / 11.9 + 1) * 0.7 + Math.sin(time * TAU / 4.7 + 2.6) * 0.3;
      wind.speed = Math.max(0, wind.daySpeed * (1 + 0.25 * v * meander + 0.1 * g * gust * (0.5 + 0.5 * v)));
      wind.direction = wind.dayDirection + 0.32 * v * wander + 0.05 * g * gust;
      wind.x = Math.sin(wind.direction) * wind.speed;
      wind.z = Math.cos(wind.direction) * wind.speed;
      return wind;
    },
  };
  wind.update(0);
  return wind;
}

/** Compass label for a heading-convention angle (direction = (sin a, cos a)), matching the game's map: N is -z, E is +x. */
export function compassName(angle) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[((Math.round((Math.PI - angle) / (TAU / 8)) % 8) + 8) % 8];
}
/** Heading-convention angle the wind travels toward, from the compass bearing (degrees) it blows from (0 = N, 90 = E). */
export function directionFromBearing(bearingDegrees) { return -bearingDegrees * Math.PI / 180; }
/** Compass bearing (degrees, 0 = N, 90 = E) a wind with this "toward" angle blows from. */
export function bearingFromDirection(direction) { return ((-direction * 180 / Math.PI) % 360 + 360) % 360; }

/** Human wind text, e.g. "5 m/s from the SW". */
export function describeWind(wind) {
  const speed = Math.round(wind.speed);
  return speed < 1 ? 'calm' : `${speed} m/s from the ${compassName(wind.from)}`;
}
