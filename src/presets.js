/**
 * Glider presets: named wings with their own performance and handling, as overrides of the force model's GLIDER_DEFAULTS.
 * Fly one with createGlider({ preset: 't2c-144' }); anything in config is then applied on top, and glider.tune() still
 * changes it in flight. glider.polar() shows what it does.
 *
 * The figures are estimates for each kind of wing, built from typical published sizes and performance for its class and era,
 * then calibrated on the force model so its polar lands on them. They are not manufacturer data.
 * `specs` holds the reference figures each preset was calibrated to.
 *
 * Handling is set by the same numbers the force model always had: roll response (rollFrequency, rollAuthority, slowBank,
 * maxBank), the bar (barOutSeconds, barPressureExp, barPressureMax: how hard it is to push out at speed), the stall (stallAlpha,
 * stallBlend: how soft it is, plateLift: how much a stalled sail still lifts, stallRollFactor: roll left in a stall), pitch
 * (speedStability, pitchAuthority, loadLimit) and the speed range (alphaMin: full bar in, alphaTrim: hands off).
 */
import { DEG } from './math.js';

const preset = p => Object.freeze({ ...p, specs: Object.freeze(p.specs), config: Object.freeze(p.config) });

export const PRESETS = Object.freeze({
  'rogallo-1975': preset({
    id: 'rogallo-1975', name: 'Standard Rogallo', era: '1970s', class: 'Standard Rogallo',
    description: 'A 1970s standard Rogallo: a low-aspect cone of sail on an 80-degree nose angle. Slow, steep-gliding and heavy in roll; ' +
      'it mushes rather than stalls, and pulled in it soon runs out of speed range (the sail luffs).',
    specs: { wingArea: 17, span: 6.5, gliderMass: 18, pilotMass: 70, bestGlide: 4, minSink: 2.6, stallKmh: 28, topKmh: 50 },
    config: {
      mass: 88, wingArea: 17, span: 6.5, oswald: 0.6, liftSlope: 3.02, cd0: 0.076,
      alphaMin: 6 * DEG, alphaTrim: 12 * DEG, stallAlpha: 26 * DEG, stallBlend: 20 * DEG, plateLift: 1.6, plateDrag: 1.2,
      rollFrequency: 1.6, rollAuthority: [0.3, 1.0], slowBank: 0.35, maxBank: 45 * DEG, stallRollFactor: 0.4,
      barOutSeconds: 0.4, barPressureExp: 1.5, barPressureMax: 1.4, pitchAuthority: 0.08, loadLimit: 2.2, freeLoad: 1.3,
      speedStability: 0.5 * DEG, uprightDrag: 0.3,
    },
  }),
  'vintage-1985': preset({
    id: 'vintage-1985', name: 'Double-surface flex wing', era: '1980s', class: 'Intermediate double-surface',
    description: 'A mid-1980s double-surface flex wing: the step from the Rogallo to the modern wing. A real glide and a usable speed ' +
      'range, with a moderate roll and a predictable stall.',
    specs: { wingArea: 15.5, span: 9.8, gliderMass: 28, pilotMass: 72, bestGlide: 9.5, minSink: 1.15, stallKmh: 32, topKmh: 80 },
    config: {
      mass: 100, wingArea: 15.5, span: 9.8, oswald: 0.72, liftSlope: 4.12, cd0: 0.0388,
      alphaMin: 0.5 * DEG, alphaTrim: 8.5 * DEG, stallAlpha: 16 * DEG, stallBlend: 13 * DEG,
      rollFrequency: 2.3, maxBank: 55 * DEG, barPressureMax: 2.2,
    },
  }),
  'alpha-235': preset({
    id: 'alpha-235', name: 'Wills Wing Alpha 235', era: '2000s', class: 'Training wing',
    description: 'A large single-surface training wing in the manner of the Wills Wing Alpha 235: light wing loading, low and slow, ' +
      'quick and light in roll, and a stall so gentle it is hard to provoke. Forgiving to land; it does not go fast.',
    specs: { wingArea: 21.8, span: 9.6, gliderMass: 25, pilotMass: 85, bestGlide: 8, minSink: 1.3, stallKmh: 28, topKmh: 60 },
    config: {
      mass: 110, wingArea: 21.8, span: 9.6, oswald: 0.72, liftSlope: 3.7, cd0: 0.0375,
      alphaMin: 2 * DEG, alphaTrim: 9 * DEG, stallAlpha: 20 * DEG, stallBlend: 18 * DEG, plateLift: 1.6,
      rollFrequency: 3.1, rollAuthority: [0.45, 1.3], slowBank: 0.6, stallRollFactor: 0.65,
      barOutSeconds: 0.5, barPressureMax: 1.6, speedStability: 0.45 * DEG, loadLimit: 2.6,
    },
  }),
  intermediate: preset({
    id: 'intermediate', name: 'Intermediate kingposted wing', era: 'today', class: 'Intermediate',
    description: 'The force model\'s own defaults (GLIDER_DEFAULTS): a modern kingposted intermediate wing, and the wing the range was ' +
      'tuned on. A long dive held full bar in keeps building speed, a game-friendly choice.',
    specs: { wingArea: 15, span: 10, gliderMass: 30, pilotMass: 80, bestGlide: 12, minSink: 1, stallKmh: 35, topKmh: 90 },
    config: {},
  }),
  't2c-144': preset({
    id: 't2c-144', name: 'Wills Wing T2C 144', era: 'today', class: 'Topless competition',
    description: 'A topless competition wing in the manner of the Wills Wing T2C 144: high aspect ratio, little drag and a flat glide that ' +
      'holds up at speed. It is heavy and deliberate in roll and firm in the bar at speed, and its stall is sharper.',
    specs: { wingArea: 13.4, span: 10.15, gliderMass: 34, pilotMass: 75, bestGlide: 16.5, minSink: 0.85, stallKmh: 35, topKmh: 115 },
    config: {
      mass: 108, wingArea: 13.4, span: 10.15, oswald: 0.88, liftSlope: 4.33, cd0: 0.0195,
      alphaMin: -1.1 * DEG, alphaTrim: 7 * DEG, stallAlpha: 17 * DEG, stallBlend: 9 * DEG, plateLift: 1.1, chord: 1.5,
      rollFrequency: 2.2, rollAuthority: [0.25, 1.35], slowBank: 0.35, maxBank: 65 * DEG, stallRollFactor: 0.35,
      barOutSeconds: 0.7, barPressureExp: 2.2, barPressureMax: 2.6, loadLimit: 3.2, speedStability: 0.3 * DEG,
    },
  }),
});

/** The preset with this id; an unknown id throws, listing the known ones. */
export function getPreset(id) {
  const p = PRESETS[id];
  if (!p) throw new TypeError(`unknown glider preset "${id}" (known: ${Object.keys(PRESETS).join(', ')})`);
  return p;
}
