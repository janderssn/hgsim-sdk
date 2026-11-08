/**
 * Glider presets: named wings with their own performance and handling, as overrides of the force model's GLIDER_DEFAULTS.
 * Fly one with createGlider({ preset: 't2c-144' }); anything in config is then applied on top, and glider.tune() still
 * changes it in flight. glider.polar() shows what it does.
 *
 * Each preset's `reference` is the data it was fitted to (tools/fit-presets.mjs): its total mass, its stall, trim and top speeds,
 * reference polar points [km/h, sink m/s], the sources, and a note on how far to trust them (with a VG: one for each end).
 * The geometry and speeds are mostly manufacturer figures. Sink rates are manufacturer estimates, period claims, or estimates of
 * ours where nothing is published; no independently measured polar was found for any of these wings.
 *
 * A preset with a VG (variable geometry: a rope that tightens the sail) has vg: { loose, tight, default }, the values that change
 * between a loose sail (lighter in roll, slower, more twist and drag) and a tight one (flatter glide at speed, heavier in roll,
 * a sharper stall). glider.setVG(0..1) moves between them in flight.
 *
 * Handling is set by the same numbers the force model always had: roll response (rollFrequency, rollAuthority, slowBank,
 * maxBank), the bar (barOutSeconds, barPressureExp, barPressureMax: how hard it is to push out at speed), the stall (stallAlpha,
 * stallBlend: how soft it is, plateLift: how much a stalled sail still lifts, stallRollFactor: roll left in a stall), pitch
 * (pitchTau: how quickly the wing returns to its trim, speedStability, luffAlpha and luffLoss: a sail that luffs at low angles
 * of attack, pitchAuthority, loadLimit) and the speed range (alphaMin: full bar in, alphaTrim: hands off).
 */
import { DEG } from './math.js';

const preset = p => Object.freeze({ ...p, reference: p.reference ? Object.freeze(p.reference) : null, config: Object.freeze(p.config),
  vg: p.vg ? Object.freeze({ default: p.vg.default ?? 0, loose: Object.freeze(p.vg.loose), tight: Object.freeze(p.vg.tight) }) : null });

/**
 * A preset's sail at a VG setting (0 loose .. 1 tight): its vg.loose and vg.tight values, blended (numbers and arrays of
 * numbers). Empty for a preset without a VG.
 */
export function vgConfig(p, setting = p?.vg?.default ?? 0) {
  if (!p?.vg) return {};
  const t = Math.max(0, Math.min(1, setting)), out = {}, mix = (a, b) => a + (b - a) * t;
  for (const key of Object.keys(p.vg.loose)) {
    const a = p.vg.loose[key], b = p.vg.tight[key];
    out[key] = Array.isArray(a) ? a.map((v, i) => mix(v, b[i])) : mix(a, b);
  }
  return out;
}

export const PRESETS = Object.freeze({
  'rogallo-1975': preset({
    id: 'rogallo-1975', name: 'Standard Rogallo', era: '1970s', class: 'Standard Rogallo',
    description: 'A 1970s standard Rogallo: a low-aspect cone of sail on an 80-degree nose angle. Slow, steep-gliding and heavy in roll; ' +
      'it mushes rather than stalls, and pulled in it soon runs out of speed range (the sail luffs).',
    reference: {
      mass: 95, stallKmh: 23, trimKmh: 30, topKmh: 48, points: [[26, 2.2], [29, 2.05], [33, 2.25], [38, 2.7], [43, 3.4], [48, 4.3]],
      sources: ['US patent 3995799 (1976): a commercial Rogallo of 19.3 m², 7.3 m span: L/D 4, stall 23 km/h, sink 2.3 m/s',
        'US patent 4116406 (1978): standard Rogallo wings glide about 4 to 1'],
      note: 'Period claims for the glide, stall and sink; the shape of the polar between them is an estimate. No measured polar of the era is published.',
    },
    config: {
      mass: 95, wingArea: 19.3, span: 7.3, liftSlope: 3.16, cd0: 0.1041, oswald: 0.788, twistDrag: 0.0614, twistLift: 1.2,
      alphaMin: 6 * DEG, alphaTrim: 19.9 * DEG, stallAlpha: 36 * DEG, alphaMax: 52 * DEG, stallBlend: 20 * DEG, plateLift: 1.6, plateDrag: 1.2,
      rollFrequency: 1.6, rollAuthority: [0.3, 1.0], slowBank: 0.35, maxBank: 45 * DEG, stallRollFactor: 0.4,
      barOutSeconds: 0.4, barPressureExp: 1.5, barPressureMax: 1.4, pitchAuthority: 0.08, loadLimit: 2.2, freeLoad: 1.3,
      speedStability: 0.5 * DEG, uprightDrag: 0.3, pitchTau: 0.32, luffAlpha: 14 * DEG, luffLoss: 0.85,
    },
  }),
  'vintage-1985': preset({
    id: 'vintage-1985', name: 'Double-surface flex wing', era: '1980s', class: 'Intermediate double-surface',
    description: 'A mid-1980s double-surface flex wing: the step from the Rogallo to the modern wing. A real glide and a usable speed ' +
      'range, with a moderate roll and a predictable stall.',
    reference: {
      mass: 115, stallKmh: 27, trimKmh: 35, topKmh: 75, points: [[34, 1.02], [40, 1.03], [45, 1.15], [50, 1.4], [55, 1.75], [60, 2.15], [65, 2.65]],
      sources: ['Wills Wing HP II (1986) archive: 15.1 m², AR 7.2; HP AT speed limits',
        'Wills Wing estimated polars (willswing.com/polar-data-for-wills-wing-hang-gliders) for the Eagle and Ultra Sport, bracketing it',
        'UP Comet (1980): L/D 8.5, min sink 0.9 m/s; Airwave Kiss/Magic: min 26 km/h, max 80-83 km/h (all-aero.com)'],
      note: 'No sink or glide figures were published for the era (Wills Wing: "not available in company records"): an estimate between its neighbours.',
    },
    config: {
      mass: 115, wingArea: 15.1, span: 10.4, liftSlope: 4.26, cd0: 0.0373, oswald: 0.8146, twistDrag: 0.026, twistLift: 1.2,
      alphaMin: 1.2 * DEG, alphaTrim: 16.3 * DEG, stallAlpha: 29.5 * DEG, alphaMax: 45.5 * DEG, stallBlend: 13 * DEG,
      rollFrequency: 2.3, maxBank: 55 * DEG, barPressureMax: 2.2, pitchTau: 0.26, luffAlpha: 9 * DEG, luffLoss: 0.3,
    },
  }),
  'alpha-235': preset({
    id: 'alpha-235', name: 'Wills Wing Alpha 235', era: '2000s', class: 'Training wing',
    description: 'A large single-surface training wing in the manner of the Wills Wing Alpha 235: light wing loading, low and slow, ' +
      'quick and light in roll, and a stall so gentle it is hard to provoke. Forgiving to land; it does not go fast.',
    reference: {
      mass: 115, stallKmh: 23, trimKmh: 32, topKmh: 58, points: [[28, 1.12], [31, 1.1], [35, 1.2], [40, 1.45], [45, 1.8], [50, 2.35], [55, 3.0]],
      sources: ['willswing.com/alpha: 21.8 m², 10.0 m span, AR 4.6, 23.6 kg, hook-in 68-127 kg, minimum-sink speed 27 km/h',
        'Alpha owner\'s manual (2020): sustained top speed 53-61 km/h, glide much degraded above 40 km/h',
        'Wills Wing estimated Falcon polar, degraded for the lower aspect ratio and single-surface sail'],
      note: 'Geometry and speeds are Wills Wing figures; Wills Wing publishes no sink or glide for the Alpha, so the polar is an estimate.',
    },
    config: {
      mass: 115, wingArea: 21.8, span: 10.0, liftSlope: 3.8, cd0: 0.0527, oswald: 0.9789, twistDrag: 0.0268, twistLift: 1.2,
      alphaMin: 2.5 * DEG, alphaTrim: 15 * DEG, stallAlpha: 31.8 * DEG, alphaMax: 47.8 * DEG, stallBlend: 18 * DEG, plateLift: 1.6,
      rollFrequency: 3.1, rollAuthority: [0.45, 1.3], slowBank: 0.6, stallRollFactor: 0.65,
      barOutSeconds: 0.5, barPressureMax: 1.6, speedStability: 0.45 * DEG, loadLimit: 2.6, pitchTau: 0.24,
    },
  }),
  intermediate: preset({
    id: 'intermediate', name: 'Intermediate kingposted wing', era: 'today', class: 'Intermediate',
    description: 'The force model\'s own defaults (GLIDER_DEFAULTS): a modern kingposted intermediate wing, and the wing the range was ' +
      'tuned on. It is a game wing rather than a fitted one: it trims faster than real wings (47 km/h against their 32-36), so a ' +
      'final has speed in hand without asking for it, and a long dive held full bar in keeps building speed.',
    reference: null,
    config: {},
  }),
  'sport-2': preset({
    id: 'sport-2', name: 'Wills Wing Sport 2 155', era: 'today', class: 'Kingposted performance (VG)',
    description: 'A kingposted performance wing in the manner of the Wills Wing Sport 2 155, a step up from an intermediate: a good ' +
      'glide with the VG pulled on, still light and friendly with it off. Easy to launch and land, and it thermals well loose.',
    reference: {
      tight: {
        mass: 115, stallKmh: 28, trimKmh: 36, topKmh: 80,
        points: [[35, 0.93], [39, 0.91], [44, 0.96], [47, 1.02], [50, 1.15], [53, 1.32], [55, 1.42], [58, 1.66], [60, 1.79], [63, 2.09], [64, 2.26], [68, 2.63], [69, 2.83]],
      },
      loose: {
        mass: 115, stallKmh: 28, trimKmh: 32, topKmh: 66,
        points: [[35, 0.96], [39, 0.94], [44, 1.0], [47, 1.09], [50, 1.26], [53, 1.49], [55, 1.62], [58, 1.94], [60, 2.11], [63, 2.47], [64, 2.67]],
      },
      sources: ['Wills Wing estimated Sport 2 polar (willswing.com/polar-data-for-wills-wing-hang-gliders), digitized; Brauniger points 0.94 m/s at 35 and 2.26 at 64 km/h',
        'willswing.com/hang-gliders/sport-2: 14.4 m², 9.6 m span, AR 6.4, 26.8 kg, hook-in 68-113 kg, minimum-sink speed 30 km/h, VNE 85 km/h',
        'Sport 2 owner\'s manual: maximum steady speed 76-85 km/h with full VG'],
      note: 'Wills Wing calls its polars estimates, for a pilot of 130% of the minimum hook-in weight. The VG-off polar is an estimate from the VG-on one.',
    },
    config: {
      mass: 115, wingArea: 14.4, span: 9.6, liftSlope: 4.16, stallAlpha: 29.4 * DEG, alphaMax: 45.4 * DEG, twistLift: 1.2,
      barOutSeconds: 0.6, barPressureMax: 2.2, pitchTau: 0.2,
    },
    vg: {
      default: 0,
      loose: { cd0: 0.0257, oswald: 0.9158, twistDrag: 0.0554, alphaMin: 2.8 * DEG, alphaTrim: 21.8 * DEG, rollFrequency: 3.0, slowBank: 0.5, stallBlend: 14 * DEG },
      tight: { cd0: 0.0242, oswald: 0.9377, twistDrag: 0.0382, alphaMin: 1 * DEG, alphaTrim: 16.6 * DEG, rollFrequency: 2.4, slowBank: 0.42, stallBlend: 12 * DEG },
    },
  }),
  't2c-144': preset({
    id: 't2c-144', name: 'Wills Wing T2C 144', era: 'today', class: 'Topless competition (VG)',
    description: 'A topless competition wing in the manner of the Wills Wing T2C 144: high aspect ratio, little drag and a flat glide that ' +
      'holds up at speed with the VG on. VG off it is lighter and easier in roll for launching, thermalling and landing; VG on it is ' +
      'heavy and deliberate in roll, firm in the bar at speed, and its stall is sharper.',
    reference: {
      tight: {
        mass: 125, stallKmh: 30, trimKmh: 44, topKmh: 105,
        points: [[40, 0.9], [42, 0.86], [48, 0.89], [51, 0.96], [55, 1.07], [59, 1.24], [64, 1.41], [68, 1.71], [72, 1.96], [76, 2.37], [80, 2.5], [84, 3.05]],
      },
      loose: {
        mass: 125, stallKmh: 30, trimKmh: 34, topKmh: 82,
        points: [[42, 0.89], [48, 0.93], [51, 1.02], [55, 1.15], [59, 1.36], [64, 1.59], [68, 1.96], [72, 2.28], [76, 2.79], [81, 3.17]],
      },
      sources: ['willswing.com/hang-gliders/t2c: 13.4 m², 9.9 m span, AR 7.3, hook-in 73-107 kg, minimum-sink speed 34 km/h, VNE 85 km/h; DHV datasheet K_01-0471-13: 33.4 kg weighed',
        'T2 owner\'s manual: trim about 34 km/h with the VG off, 40-47 km/h at 3/4 VG; maximum steady speed 85-120 km/h with full VG',
        'Wills Wing estimated Talon polar (the T2\'s predecessor), with the 6% speed shift for a competition harness',
        'Moyes Litespeed RS specifications (archived): 0.9 m/s at 40 km/h, 2.5 m/s at 80 km/h'],
      note: 'Wills Wing has published no glide figures since about 1990: the polar is its Talon estimate and the Moyes Litespeed\'s points. The VG-off polar is an estimate.',
    },
    config: {
      mass: 125, wingArea: 13.4, span: 9.9, liftSlope: 4.28,
      stallAlpha: 29.1 * DEG, alphaMax: 45.1 * DEG, twistLift: 1.2, plateLift: 1.1, chord: 1.5,
      rollAuthority: [0.25, 1.35], maxBank: 65 * DEG, stallRollFactor: 0.35,
      barOutSeconds: 0.7, barPressureExp: 2.2, barPressureMax: 2.6, loadLimit: 3.2, speedStability: 0.3 * DEG, pitchTau: 0.17,
    },
    vg: {
      default: 0,
      loose: { cd0: 0.0218, oswald: 0.888, twistDrag: 0.0285, alphaMin: 1.3 * DEG, alphaTrim: 22 * DEG, rollFrequency: 2.8, slowBank: 0.45, stallBlend: 11 * DEG },
      tight: { cd0: 0.0224, oswald: 0.939, twistDrag: 0.0168, alphaMin: -0.4 * DEG, alphaTrim: 11.9 * DEG, rollFrequency: 2.2, slowBank: 0.35, stallBlend: 9 * DEG },
    },
  }),
});

/** The preset with this id; an unknown id throws, listing the known ones. */
export function getPreset(id) {
  const p = PRESETS[id];
  if (!p) throw new TypeError(`unknown glider preset "${id}" (known: ${Object.keys(PRESETS).join(', ')})`);
  return p;
}
