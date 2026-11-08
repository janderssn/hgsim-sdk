/**
 * The landing range's world, as plain functions and numbers (no Three.js): the terrain, where the launch, the mark and the
 * thermal are, and the solid launch ramp and granite escarpment. The flight, the launch and the crash
 * tumble all ask it where the ground is; scenery.js draws the same shapes.
 *
 * Frame: x east, y up, z north (metres). The launch faces north, down the ridge, toward the mark on the field.
 */

import { createLaunchGeology } from './launch-geology.js';
import { ALPINE_SITES } from './alpine-sites.js';

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

/** Peripheral valley relief leaves the central flight corridor and thermal alone. */
function peripheralRelief(x, z) {
  if (Math.abs(x) <= 400 && z <= 650) return 0;
  const thermalDistance = Math.hypot(x - THERMAL.x, z - THERMAL.z);
  if (thermalDistance <= 250) return 0;

  const east = x >= 0;
  const side = east ? x : -x;
  // Long, asymmetric shoulders enclose the valley without raising its runway.
  // Their gently wandering toes and crest saddles avoid a radial bowl shape.
  const toe = east
    ? 460 + 55 * Math.sin(z / 430) + 30 * noise(z / 360 + 3, 2)
    : 470 + 70 * Math.sin(z / 510 + 1.2);
  const crest = 1410 + 40 * Math.sin(z / 630 + (east ? .4 : 1.5));
  const wall = smooth(toe, crest, side);
  const ridgeHeight = (east ? 330 : 270)
    * (.80 + .20 * noise(z / 340 + (east ? 8 : -3), east ? 4 : 11));

  // Oblique drainage cuts and smaller tributaries articulate the shoulder at
  // 200–400 m scale. Their amplitudes keep the shared 13.3 m mesh accurate.
  const along = z + (side - 800) * (east ? .32 : -.24);
  const gully = (.5 + .5 * Math.sin(along * Math.PI * 2 / 360)) ** 2;
  const tributary = .5 + .5 * Math.sin((z - side * .21) * Math.PI * 2 / 230 + .7);
  const shoulder = 4 * wall * (1 - wall);
  const sideRelief = wall * ridgeHeight - shoulder * (26 * gully + 7 * tributary);

  const south = 120 * smooth(680, 1550, z)
    * (.83 + .17 * noise(x / 430 - 4, z / 560 + 9));
  const thermalMask = smooth(250, 430, thermalDistance);
  return Math.max(0, sideRelief + south) * thermalMask;
}

/** The original launch/field profile remains a stable reference for authored structures. */
export function establishedTerrainHeight(x, z) {
  // The launch ridge to the north. Its foot is a long curve, like a ski jump's run-out, so a fast run down the hill can be flown out into a skim.
  const ridge = 190 * smooth(-110, -680, z) + 60 * smooth(-700, -1150, z);
  const east = 70 * smooth(620, 1200, x) + 45 * smooth(-700, -1250, x);                   // low valley sides
  const south = 35 * smooth(800, 1300, z);
  const rolling = 7 * noise(x / 210 + 3, z / 210 - 5) + 2.2 * noise(x / 64, z / 64) + 0.5 * noise(x / 18, z / 18);
  const field = 1 - smooth(85, 170, Math.hypot(x - MARK.x, z - MARK.z));                 // the field is mown flat
  const ridgeSide = 14 * noise(x / 150, z / 150) * smooth(-150, -500, z);                 // the slope has some shape
  return ridge + east + south + ridgeSide + rolling * (1 - field) - 1.4 * field;
}

const REFUGE_SITE = ALPINE_SITES.find(site => site.id === 'landing-refuge');
const REFUGE_HEIGHT = establishedTerrainHeight(REFUGE_SITE.x, REFUGE_SITE.z);

const LAUNCH_MASSIF_ROOF = establishedTerrainHeight(LAUNCH.x, LAUNCH.z) + 50;

/** Join the launch ledges to their parent ridge using the same physical ground. */
function launchMassif(x, z, established) {
  if (z <= -1000 || z >= -505 || x < -200 || x > 220) return 0;
  const centre = 8 + 14 * Math.sin((z + 760) / 220) + 6 * noise(z / 130 + 3, 2);
  const width = x < centre ? 170 + 12 * Math.sin(z / 180 + .8) : 183 + 9 * noise(z / 170, 9);
  const shoulder = 1 - smooth(.2, 1, Math.abs(x - centre) / width);
  // The fill stops behind the jointed face. The detailed escarpment supplies
  // its steep, exact contact surface; a smooth terrain mound must not bury it.
  const front = smooth(-560, -680, z);
  const rear = smooth(-1000, -800, z);
  const roof = LAUNCH_MASSIF_ROOF - 3 * noise(z / 180 + 6, x / 130 + 8);
  return Math.max(0, roof - established) * shoulder * front * rear;
}

// Terrace displacement is sampled on the same 240-cell grid as scenery. This
// keeps the new curved banks in agreement with the triangles under the glider.
const TERRACE_STEP = 3200 / 240;
const terraceSamples = new Map();
function terraceSample(ix, iz) {
  const key = `${ix},${iz}`;
  if (terraceSamples.has(key)) return terraceSamples.get(key);
  const x = -1600 + ix * TERRACE_STEP, z = -1600 + iz * TERRACE_STEP;
  const radius = Math.hypot((x - REFUGE_SITE.x) / 48, (z - REFUGE_SITE.z) / 45);
  const established = establishedTerrainHeight(x, z);
  const natural = established + peripheralRelief(x, z) + launchMassif(x, z, established);
  const weight = 1 - smooth(.62, 1, radius);
  const delta = (REFUGE_HEIGHT - natural) * weight;
  terraceSamples.set(key, delta);
  return delta;
}
function terraceDisplacement(x, z) {
  if (Math.abs(x - REFUGE_SITE.x) > 70 || Math.abs(z - REFUGE_SITE.z) > 72) return 0;
  const gx = (x + 1600) / TERRACE_STEP, gz = (z + 1600) / TERRACE_STEP;
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const a = terraceSample(ix, iz), b = terraceSample(ix, iz + 1);
  const c = terraceSample(ix + 1, iz + 1), d = terraceSample(ix + 1, iz);
  return fx + fz <= 1 ? a + fx * (d - a) + fz * (b - a)
    : c + (1 - fx) * (b - c) + (1 - fz) * (d - c);
}

/** Shared valley, launch massif and usable refuge terrace. */
export function terrainHeight(x, z) {
  const established = establishedTerrainHeight(x, z);
  return established + peripheralRelief(x, z) + launchMassif(x, z, established)
    + terraceDisplacement(x, z);
}

/** The terrain's steepest slope at (x, z), rise over run, measured across d metres. */
export const slopeAt = (x, z, d = 6) => Math.hypot(terrainHeight(x + d, z) - terrainHeight(x - d, z), terrainHeight(x, z + d) - terrainHeight(x, z - d)) / (2 * d);
/** Whether the actual natural surface is gentler than about 23 degrees. */
export const landableAt = (x, z) => {
  const surface = rockSurfaceAt(x, z);
  return (surface && surface.height > terrainHeight(x, z) ? surface.slope : slopeAt(x, z)) < .42;
};

/*
 * The ramp launch: a timber deck on a rock buttress, sloping down and out over the ridge. The wing is carried WING_CARRY above
 * the feet; over the last RUN_BLEND metres of a RUN_DIST run it starts to fly, so the deck is set to put the flight's start
 * FLIGHT_Y above the ridge in level flight with the deck falling away below.
 */
export const RUN_DIST = 18, RUN_BLEND = 6, WING_CARRY = .95;
export const FLIGHT_Y = establishedTerrainHeight(LAUNCH.x, LAUNCH.z) + 60;
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

/** The cliff launch, on the next shelf along the escarpment: stand at the edge and step off. */
export const CLIFF = (() => { const x = LAUNCH.x + 40, cz = LAUNCH.z - 22, edge = cz + 17 * (1 + (noise(7, 2.6) - .5) * .3), top = establishedTerrainHeight(x, edge) + 62; return { x, cz, edge, top, ground: top - .4, y: top - .4 + 2.3, z: edge - 1.5 }; })();

/** Exact shared drawing/contact source for the connected launch escarpment. */
export const LAUNCH_GEOLOGY = createLaunchGeology({ terrainHeight, noise, rampTop: ROCK_TOP - .5, deckHeight: deckY, cliff: CLIFF });
/** The drawn rock face and its contact normal, or null outside the escarpment. */
export const rockSurfaceAt = (x, z) => LAUNCH_GEOLOGY.sample(x, z);
/** Solid rock under x/z, or -Infinity. This samples the actual drawn triangles. */
export const rockTop = (x, z) => LAUNCH_GEOLOGY.heightAt(x, z);
/** Natural ground, including cliff shelves and talus, for flight clearance. */
export const physicalGroundHeight = (x, z) => Math.max(terrainHeight(x, z), rockTop(x, z));

/** Shared smooth ecology masks for surface shading and deterministic vegetation. */
export function sampleTerrainEcology(x, z) {
  const ground = terrainHeight(x, z), slope = slopeAt(x, z, 8);
  const surface = rockSurfaceAt(x, z);
  let rock = smooth(.46, 1.02, slope) * .72;
  let talus = smooth(.30, .62, slope) * (1 - smooth(.75, 1.1, slope)) * .20;
  if (surface && surface.height > ground + .04) {
    const { edge, depth } = LAUNCH_GEOLOGY.crestAt(x);
    const frontDistance = z - edge;
    const exposure = smooth(.04, .65, surface.height - ground);
    const rear = smooth(-78, -12, frontDistance);
    const slab = Math.max(smooth(.35, .8, surface.slope), rear * .72);
    rock = Math.max(rock, exposure * slab);
    const toe = smooth(depth * .20, depth * .38, frontDistance)
      * (1 - smooth(depth * .72, depth * 1.15, frontDistance));
    talus = Math.max(talus, toe * (1 - smooth(1, 2.8, surface.slope)) * exposure);
  }
  if (x > LAUNCH_GEOLOGY.bounds.minX - 12 && x < LAUNCH_GEOLOGY.bounds.maxX + 12) {
    const { edge, depth, end } = LAUNCH_GEOLOGY.crestAt(x);
    const distance = z - edge;
    const apron = smooth(depth * .27, depth * .65, distance)
      * (1 - smooth(depth * 1.05, depth * 1.55, distance));
    talus = Math.max(talus, apron * end * (.60 + .35 * noise(x / 11 + 5, z / 12 + 4)));
  }
  const pathCentre = -8 + 5 * Math.sin((z + 650) / 77);
  const access = smooth(-850, -795, z) * (1 - smooth(-594, -580, z));
  const path = (1 - smooth(1.3, 3.5, Math.abs(x - pathCentre))) * access;
  const moisture = (.22 + noise(x / 100 + 9, z / 110 - 5) * .65)
    * (1 - smooth(.25, .9, Math.max(slope, surface && surface.height > ground ? surface.slope : 0)))
    * (1 - rock * .8) * (1 - path * .7);
  return { rock: clamp(rock, 0, 1), talus: clamp(talus, 0, 1), moisture: clamp(moisture, 0, 1), path: clamp(path, 0, 1) };
}

/** Whatever is underfoot at (x, z): the terrain, a rock, or the ramp's deck. What a wreck lands on. */
export const groundUnder = (x, z) => Math.max(physicalGroundHeight(x, z), Math.abs(x - LAUNCH.x) < DECK_HALF_WIDTH && z > LAUNCH.z + DECK_BACK && z < LAUNCH.z + DECK_LIP ? deckY(z) : -Infinity);
