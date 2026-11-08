/**
 * The landing range's world, as plain functions and numbers (no Three.js): the terrain, where the launch, the mark and the
 * thermal are, and the solid shapes of the launch ramp and the two rocks it stands on. The flight, the launch and the crash
 * tumble all ask it where the ground is; scenery.js draws the same shapes.
 *
 * Frame: x east, y up, z north (metres). The launch faces north, down the ridge, toward the mark on the field.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** A repeatable hash of two integers, 0..1. */
export function hash(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }

/** Smooth value noise, 0..1, one cell per unit. */
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), u), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v);
}

/** The ramp launch (its run starts here and heads north), the mark on the field, and the one thermal. */
export const LAUNCH = { x: 0, z: -560, heading: 0 };
export const MARK = { x: 0, z: 0, radius: 60 };
export const THERMAL = { x: 430, z: 330, radius: 160, strength: 4.5 };

/** Terrain height: a north ridge (the launch), a flat field (the mark) and gentle meadows around. */
export function terrainHeight(x, z) {
  // The launch ridge to the north. Its foot is a long curve, like a ski jump's run-out, so a fast run down the hill can be flown out into a skim.
  const ridge = 190 * smooth(-110, -680, z) + 60 * smooth(-700, -1150, z);
  const east = 70 * smooth(620, 1200, x) + 45 * smooth(-700, -1250, x);                   // low valley sides
  const south = 35 * smooth(800, 1300, z);
  const rolling = 7 * noise(x / 210 + 3, z / 210 - 5) + 2.2 * noise(x / 64, z / 64) + 0.5 * noise(x / 18, z / 18);
  const field = 1 - smooth(85, 170, Math.hypot(x - MARK.x, z - MARK.z));                 // the field is mown flat
  const ridgeSide = 14 * noise(x / 150, z / 150) * smooth(-150, -500, z);                 // the slope has some shape
  return ridge + east + south + ridgeSide + rolling * (1 - field) - 1.4 * field;
}

/** The terrain's steepest slope at (x, z), rise over run, measured across d metres. */
export const slopeAt = (x, z, d = 6) => Math.hypot(terrainHeight(x + d, z) - terrainHeight(x - d, z), terrainHeight(x, z + d) - terrainHeight(x, z - d)) / (2 * d);
/** Whether a glider can land at (x, z): anything gentler than about 23 degrees. */
export const landableAt = (x, z) => slopeAt(x, z) < .42;

/*
 * The ramp launch: a timber deck on a rock buttress, sloping down and out over the ridge. The wing is carried WING_CARRY above
 * the feet; over the last RUN_BLEND metres of a RUN_DIST run it starts to fly, so the deck is set to put the flight's start
 * FLIGHT_Y above the ridge in level flight with the deck falling away below.
 */
export const RUN_DIST = 18, RUN_BLEND = 6, WING_CARRY = .95;
export const FLIGHT_Y = terrainHeight(LAUNCH.x, LAUNCH.z) + 60;
export const DECK_FALL = .22, DECK_TOP = FLIGHT_Y - WING_CARRY - DECK_FALL * RUN_BLEND / 2, DECK_BACK = -RUN_DIST - 4, DECK_LIP = 6;
/** Where the deck leaves the rock it starts on, and the top of that rock. */
export const CLIFF_EDGE = -RUN_DIST, ROCK_TOP = DECK_TOP + DECK_FALL * 12 - .6;
/** Half the deck's width (the planks are 7 m wide; the run's sides are counted from 3.4 m). */
export const DECK_HALF_WIDTH = 3.5;
/** The deck's surface at z (held level beyond its two ends). */
export const deckY = z => DECK_TOP - DECK_FALL * clamp(z - LAUNCH.z, DECK_BACK, DECK_LIP);
/** The deck's line carried on past the lip at its own slope: where a body that runs off the end is in the step that takes it off. */
export const deckLine = z => DECK_TOP - DECK_FALL * Math.max(z - LAUNCH.z, DECK_BACK);

/** Streamer poles beside the ramp, on arms out from the deck: at mid-run and at the lip, outside the wing's span (4.5 m each side). */
export const RAMP_POSTS = [-8, 4.6].flatMap(dz => [-1, 1].map(side => ({ x: LAUNCH.x + side * 5.6, z: LAUNCH.z + dz, side, y: deckY(LAUNCH.z + dz) - .25 })));

/** The cliff launch, on its own rock beside the ramp: stand at the edge and step off. ground: the top the pilot stands on; y, z: the start. */
export const CLIFF = (() => { const x = LAUNCH.x + 40, cz = LAUNCH.z - 22, edge = cz + 17 * (1 + (noise(7, 2.6) - .5) * .3), top = terrainHeight(x, edge) + 62; return { x, cz, edge, top, ground: top - .4, y: top - .4 + 2.3, z: edge - 1.5 }; })();

/*
 * The rocks: stacked elliptical rings, k = 0 at the top to 1 at the foot, widening as they fall. undercut pulls the north face
 * in near the top, so a wing stepping off the cliff falls clear of it.
 */
/** The rock's ring k (0 top .. 1 foot): its height below the top and its radii east-west (rx) and north-south (rz). */
export function rockRing(rock, k) {
  return { y: rock.top - .5 - 78 * k * k * .55 - 78 * k * .45, rx: 11 + 34 * k * k + 5 * k, rz: 17 + 40 * k * k + 6 * k - rock.undercut * smooth(0, .2, k) };
}
/** The rock under the ramp, and the cliff launch's rock. */
export const ROCKS = [
  { cx: LAUNCH.x, cz: LAUNCH.z + CLIFF_EDGE - 17, top: ROCK_TOP, undercut: 0 },
  { cx: CLIFF.x, cz: CLIFF.cz, top: CLIFF.top, undercut: 8 },
];
/** The top of solid rock under (x, z), or -Infinity: the rings a little inside their drawn wobble. */
export function rockTop(x, z) {
  let top = -Infinity;
  for (const r of ROCKS) {
    const inside = k => { const { rx, rz } = rockRing(r, k); return ((x - r.cx) / (rx * .88)) ** 2 + ((z - r.cz) / (rz * .88)) ** 2 <= 1; };
    if (!inside(1)) continue;
    let lo = 0, hi = 1; if (!inside(0)) { for (let i = 0; i < 14; i++) { const k = (lo + hi) / 2; if (inside(k)) hi = k; else lo = k; } } else hi = 0;
    top = Math.max(top, rockRing(r, hi).y);
  }
  return top;
}

/** Whatever is underfoot at (x, z): the terrain, a rock, or the ramp's deck. What a wreck lands on. */
export const groundUnder = (x, z) => Math.max(terrainHeight(x, z), rockTop(x, z), Math.abs(x - LAUNCH.x) < DECK_HALF_WIDTH && z > LAUNCH.z + DECK_BACK && z < LAUNCH.z + DECK_LIP ? deckY(z) : -Infinity);

/** The slope launch: open grass on the ridge west of the ramp, a steady 20 degrees down toward the field, with no edge. */
export const SLOPE = { x: LAUNCH.x - 90, z: -570, heading: 0 };

/**
 * The launch sites, so the range treats them alike: where the pilot stands (start, facing down the run), the ground underfoot
 * on the run, how steeply it falls along the run (rise over run, + downhill), how far the run has before the ground ends
 * (Infinity on a slope that carries on), and what the recorder calls a round started there. Each is a run down to the edge or
 * off it: the ramp's deck to its lip (or off its sides), the cliff top to its edge, the slope as far as the pilot runs.
 */
export const LAUNCH_SITES = {
  ramp: {
    label: 'the ramp', round: 'launch',
    start: { x: LAUNCH.x, z: LAUNCH.z - RUN_DIST, heading: LAUNCH.heading },
    ground: (x, z) => deckLine(z),
    fall: () => DECK_FALL,
    edgeAhead(x, z, heading) {
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const toLip = fz > .05 ? (LAUNCH.z + DECK_LIP - z) / fz : Infinity;
      const toSide = Math.abs(fx) < 1e-3 ? Infinity : ((fx > 0 ? LAUNCH.x + 3.4 : LAUNCH.x - 3.4) - x) / fx;
      return Math.max(0, Math.min(toLip, toSide));
    },
  },
  cliff: {
    label: 'the cliff', round: 'cliff',
    start: { x: CLIFF.x, z: CLIFF.z, heading: LAUNCH.heading },
    ground: () => CLIFF.ground,
    fall: () => 0,
    edgeAhead(x, z, heading) { const fz = Math.cos(heading); return Math.max(0, fz > .05 ? (CLIFF.edge - .5 - z) / fz : Infinity); },
  },
  slope: {
    label: 'the slope', round: 'slope',
    start: { x: SLOPE.x, z: SLOPE.z, heading: SLOPE.heading },
    ground: (x, z) => terrainHeight(x, z),
    fall: (x, z, heading) => (terrainHeight(x, z) - terrainHeight(x + Math.sin(heading) * 2, z + Math.cos(heading) * 2)) / 2,
    edgeAhead: () => Infinity,
  },
};
/** The order C steps through the sites. */
export const SITE_ORDER = ['ramp', 'cliff', 'slope'];
