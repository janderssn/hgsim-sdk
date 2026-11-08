/**
 * Glider presets: named wings with their own speeds, handling and launch, as overrides of the force model's GLIDER_DEFAULTS and the
 * launch's LAUNCH_DEFAULTS. Fly one with createGlider({ preset: 't2c-144' }); anything in config is applied on top, and glider.tune()
 * still changes it in flight. glider.polar() shows what it does. defineWing makes your own.
 *
 * Feel first. The force model's defaults (the 'intermediate' preset) are the wing the game was tuned on, and every other wing is that
 * wing scaled to its own speeds: the same angles of attack, so the same bar, pitch and flare, at its own stall, trim and top speed and
 * with its own glide (wingConfig). Its handling in the air comes from a difficulty and four traits, each from forgiving to
 * demanding: roll, stall, pitch and flare (handlingFor). Old sails can also luff when dived (the 1970s killer). How it launches
 * comes from its build, physical numbers rather than a trait: the wing's own mass and span, its dihedral, and the angle of attack its
 * sail meets the air at with the keel carried level (wing), with its stall, its pitch and its speeds. The ladder of modern
 * wings, easiest to launch and land first: Alpha, Falcon, Sport 2, U2, T2C. The eras run from the 1975 standard Rogallo to today.
 * The speeds are ballpark figures for each kind of wing, not fits to a polar.
 *
 * A preset with a VG (variable geometry: a rope that tightens the sail) has vg: { loose, tight, default }, the values that change
 * between a loose sail (lighter in roll, slower, a softer stall) and a tight one (flatter glide at speed, heavier in roll, a sharper
 * stall). glider.setVG(0..1) moves between them in flight.
 *
 * `reference`, where there is one, is the real wing's published figures, for comparison on the polar chart; the presets do not fit it.
 */
import { DEG } from './math.js';
import { GLIDER_DEFAULTS, liftCoefficient } from './flight.js';

const lerp = (a, b, t) => a + (b - a) * t;
const kmh = v => v / 3.6;

/** The character traits a wing is described by, each 0 (forgiving) .. 1 (demanding). See handlingFor. */
export const TRAITS = Object.freeze(['roll', 'stall', 'pitch', 'flare']);

/**
 * Handling in the air for a character, as overrides of the force model's GLIDER_DEFAULTS: { config }.
 * character: a difficulty (0 a trainer .. 1 a topless competition wing, up to 1.2 for a wing harder still), or an object with
 * difficulty and any of TRAITS (each 0..1.2; a trait left out takes the difficulty):
 *   roll    light and quick even when slow (0) .. heavy, and barely rolling near the stall (1)
 *   stall   a soft mush straight ahead (0) .. a sharp break that drops a tip (1)
 *   pitch   calm and stable (0) .. quick and sensitive in pitch (1)
 *   flare   forgives an early or late flare (0) .. must be on time (1)
 * Each value is a straight blend between the two ends.
 */
export function handlingFor(character = 0.5) {
  const c = typeof character === 'number' ? { difficulty: character } : character, d0 = c.difficulty ?? 0.5;
  const trait = name => Math.max(0, Math.min(1.2, c[name] ?? d0)), blend = name => (easy, hard) => lerp(easy, hard, trait(name));
  const roll = blend('roll'), stall = blend('stall'), pitch = blend('pitch'), flare = blend('flare');
  return {
    config: {
      rollFrequency: roll(3.3, 2.6), rollAuthority: [Math.max(0.15, roll(0.45, 0.22)), roll(1.3, 1.35)], slowBank: roll(0.6, 0.35),
      stallBlend: Math.max(5, stall(18, 8)) * DEG, plateLift: stall(1.6, 1.05), stallRollFactor: Math.max(0.2, stall(0.7, 0.3)),
      rollDamping: 6, airRoughness: 0.25,   // (the physics of a tip drop: whether one happens is the stall's shape, stallBlend and plateLift)
      pitchTau: Math.max(0.12, pitch(0.26, 0.16)), speedStability: Math.max(0.15, pitch(0.45, 0.28)) * DEG, loadLimit: pitch(2.6, 3.2),
      dynamicLift: flare(1.7, 1.15), barOutSeconds: flare(0.5, 0.7), barPressureMax: flare(1.6, 2.6),
    },
  };
}

/**
 * A wing from its ballpark numbers: mass (pilot, harness and wing, kg), stall, trim and top speed (km/h, the top with the bar fully
 * in), best glide, aspect ratio and oswald efficiency. Returns force-model config: the default wing's angles of attack, with the
 * wing loading that puts the stall where asked (wingArea is the effective area), the trim and full-bar angles at the asked speeds,
 * and the parasite drag that gives the asked glide.
 */
export function wingConfig({ mass, stall, trim, top, glide, aspectRatio = 6.7, oswald = GLIDER_DEFAULTS.oswald }) {
  for (const [key, v] of Object.entries({ mass, stall, trim, top, glide })) if (!(v > 0)) throw new TypeError(`wingConfig: ${key} must be a positive number`);
  if (!(stall < trim && trim < top)) throw new TypeError('wingConfig: the speeds must rise: stall < trim < top');
  const base = { ...GLIDER_DEFAULTS, mass }, clMax = liftCoefficient(base.stallAlpha, base);
  const wingArea = 2 * mass * base.gravity / (base.airDensity * clMax * kmh(stall) ** 2);
  const alphaFor = speed => base.zeroLiftAlpha + clMax * (stall / speed) ** 2 / base.liftSlope;
  const k = 1 / (Math.PI * oswald * aspectRatio);
  return { mass, wingArea: +wingArea.toFixed(3), span: +Math.sqrt(aspectRatio * wingArea).toFixed(3), oswald,
    alphaTrim: alphaFor(trim), alphaMin: alphaFor(top), cd0: +(1 / (4 * k * glide * glide)).toFixed(5) };
}

/**
 * Defines a preset (frozen):
 *   id, name, era, class, description   what it is
 *   mass, stall, trim, top, glide, aspectRatio, oswald   its performance (wingConfig: kg, km/h, glide ratio)
 *   difficulty, character   its handling in the air (handlingFor): one number, and any traits that differ from it ({ roll, stall, ... })
 *   wing   its build, for the launch: { mass (kg, the wing alone), span (m), dihedral (degrees, negative for anhedral), carryAlpha
 *          (degrees: the angle of attack its sail meets the air at with the keel carried level on the run) }
 *   luff   an old sail that luffs when dived: { from (degrees of angle of attack below which it luffs), loss (0..1 of the nose-up
 *          recovery lost), tuck (degrees the luffed sail's nose-down moment moves the wing's trim angle down) }
 *   handling, launch   any force-model and LAUNCH_DEFAULTS values, over all of the above
 *   vg   a VG: { default (0 loose .. 1 tight), loose, tight }, each side with its own trim, top, glide, difficulty and traits
 *   reference   the real wing's published figures (for comparison), or null
 */
export function defineWing({ id, name, era, class: kind, description, difficulty = 0.5, character = {}, wing = {}, luff = null, handling = {}, launch = {}, vg = null, reference = null, ...performance }) {
  const luffing = luff ? { luffAlpha: (luff.from ?? 4) * DEG, luffLoss: luff.loss ?? 0.5, luffTuck: (luff.tuck ?? 0) * DEG } : {};
  const build = Object.fromEntries(Object.entries({ wingMass: wing.mass, wingSpan: wing.span, dihedral: wing.dihedral !== undefined ? wing.dihedral * DEG : undefined,
    carryAlpha: wing.carryAlpha !== undefined ? wing.carryAlpha * DEG : undefined }).filter(([, v]) => v !== undefined));
  const make = (side = {}) => {
    const { trim, top, glide, ...traits } = side, h = handlingFor({ difficulty, ...character, ...traits });
    return { config: { ...wingConfig({ ...performance, ...(trim && { trim }), ...(top && { top }), ...(glide && { glide }) }), ...h.config, ...luffing, ...build } };
  };
  let config, sails = null;
  if (vg) {
    const loose = make(vg.loose), tight = make(vg.tight);
    const varies = Object.keys(loose.config).filter(key => !(key in handling) && JSON.stringify(loose.config[key]) !== JSON.stringify(tight.config[key]));
    const only = (o, keep) => Object.fromEntries(Object.entries(o).filter(([key]) => varies.includes(key) === keep));
    config = { ...only(loose.config, false), ...handling };
    sails = { default: vg.default ?? 0, loose: Object.freeze(only(loose.config, true)), tight: Object.freeze(only(tight.config, true)) };
  } else {
    config = { ...make().config, ...handling };
  }
  return Object.freeze({ id, name, era, class: kind, description, difficulty, character: Object.freeze({ ...character }),
    targets: Object.freeze({ ...performance, vg: vg ? { loose: { ...vg.loose }, tight: { ...vg.tight } } : null }), luff: luff ? Object.freeze({ ...luff }) : null,
    reference: reference ? Object.freeze(reference) : null, config: Object.freeze(config), launch: Object.freeze({ ...launch }),
    vg: sails ? Object.freeze(sails) : null });
}

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
  'rogallo-1975': defineWing({
    id: 'rogallo-1975', wing: { mass: 18, span: 7.3, dihedral: 4, carryAlpha: 15 }, name: 'Standard Rogallo', era: '1970s', class: 'Standard Rogallo',
    description: 'A 1970s standard Rogallo: a cone of sail on an 80-degree nose angle, and a bad wing by any measure. It sinks like a ' +
      'brick at 4 to 1, rolls slowly and reluctantly, and wallows near the stall. Dive it and the sail luffs: the nose keeps tucking ' +
      'under by itself, hands off it never comes back, and even a full push-out takes seconds and a lot of height to recover.',
    mass: 95, stall: 24, trim: 30, top: 55, glide: 4.2, aspectRatio: 2.8, oswald: 0.7, difficulty: 0.6,
    character: { roll: 1.2, stall: 0.4, pitch: 0.2, flare: 0.8 },
    luff: { from: 2, loss: 0.6, tuck: 2.5 },
    handling: { rollFrequency: 1.5, maxBank: 45 * DEG, plateDrag: 1.3, pitchTau: 0.34, pitchDamping: 0.3, uprightDrag: 0.3, barPressureMax: 1.4, loadLimit: 2.2 },
    reference: {
      mass: 95, stallKmh: 23, trimKmh: 30, topKmh: 48, points: [[26, 2.2], [29, 2.05], [33, 2.25], [38, 2.7], [43, 3.4], [48, 4.3]],
      sources: ['US patent 3995799 (1976): a commercial Rogallo of 19.3 m², 7.3 m span: L/D 4, stall 23 km/h, sink 2.3 m/s',
        'US patent 4116406 (1978): standard Rogallo wings glide about 4 to 1'],
      note: 'Period claims for the glide, stall and sink; the shape of the polar between them is an estimate.',
    },
  }),
  'cable-1979': defineWing({
    id: 'cable-1979', wing: { mass: 22, span: 9.5, dihedral: 2, carryAlpha: 13.5 }, name: 'High-aspect cable-braced wing', era: 'late 1970s', class: 'Second-generation flex wing',
    description: 'A late-1970s high-aspect, cable-braced wing, in the manner of the Seagull Seahawk or the Electra Flyer Cirrus: twice ' +
      'the Rogallo\'s glide, but a sail with little reflex. It still luffs when dived hard, it is heavy in roll and its stall can bite.',
    mass: 100, stall: 26, trim: 34, top: 72, glide: 7, aspectRatio: 5, difficulty: 0.6,
    character: { roll: 0.9, stall: 0.7, pitch: 0.5, flare: 0.6 },
    luff: { from: 1, loss: 0.45, tuck: 1.2 },
  }),
  'vintage-1985': defineWing({
    id: 'vintage-1985', wing: { mass: 27, span: 10.4, dihedral: 1, carryAlpha: 12.5 }, name: 'Double-surface flex wing', era: 'mid 1980s', class: 'Intermediate double-surface',
    description: 'A mid-1980s double-surface flex wing: the step from the Rogallo to the modern wing. A real glide and a usable speed ' +
      'range, a moderate roll and a predictable stall.',
    mass: 110, stall: 27, trim: 36, top: 90, glide: 10, aspectRatio: 7, difficulty: 0.5,
    character: { roll: 0.7, stall: 0.45 },
    handling: { maxBank: 55 * DEG },
    reference: {
      mass: 115, stallKmh: 27, trimKmh: 35, topKmh: 75, points: [[34, 1.02], [40, 1.03], [45, 1.15], [50, 1.4], [55, 1.75], [60, 2.15], [65, 2.65]],
      sources: ['Wills Wing HP II (1986) archive: 15.1 m², AR 7.2', 'Wills Wing estimated polars for the Eagle and Ultra Sport, bracketing it'],
      note: 'No sink or glide figures were published for the era: an estimate between its neighbours.',
    },
  }),
  'performance-1992': defineWing({
    id: 'performance-1992', wing: { mass: 30, span: 10.2, dihedral: 0, carryAlpha: 11.5 }, name: 'Early-1990s performance wing', era: 'early 1990s', class: 'Kingposted performance (VG)',
    description: 'An early-1990s kingposted performance wing with a VG, in the manner of the Wills Wing HPAT or the Moyes XS: a real ' +
      'glide at speed and a wide speed range, firmer in roll than today\'s wings and less forgiving to land than a Sport 2.',
    mass: 112, stall: 29, aspectRatio: 7.1, difficulty: 0.6,
    vg: { default: 0, loose: { trim: 38, top: 100, glide: 11, difficulty: 0.55 }, tight: { trim: 42, top: 115, glide: 12, difficulty: 0.7 } },
  }),
  'alpha-235': defineWing({
    id: 'alpha-235', wing: { mass: 23.6, span: 10.0, dihedral: 3, carryAlpha: 14 }, name: 'Wills Wing Alpha 235', era: 'today', class: 'Training wing',
    description: 'A big single-surface training wing: low and slow, light and quick in roll, and a stall so gentle it only mushes. The ' +
      'easiest wing there is to launch and land: it sits still on the shoulders, lifts off at a jog and forgives a flare that is early or late.',
    mass: 105, stall: 23, trim: 31, top: 65, glide: 7.5, aspectRatio: 4.6, difficulty: 0,
    reference: {
      mass: 115, stallKmh: 23, trimKmh: 32, topKmh: 58, points: [[28, 1.12], [31, 1.1], [35, 1.2], [40, 1.45], [45, 1.8], [50, 2.35], [55, 3.0]],
      sources: ['willswing.com/alpha: 21.8 m², 10.0 m span, AR 4.6, hook-in 68-127 kg', 'Alpha owner\'s manual (2020): sustained top speed 53-61 km/h'],
      note: 'Wills Wing publishes no sink or glide for the Alpha: an estimate.',
    },
  }),
  'falcon-170': defineWing({
    id: 'falcon-170', wing: { mass: 26, span: 10.3, dihedral: 2, carryAlpha: 13.5 }, name: 'Wills Wing Falcon 170', era: 'today', class: 'Beginner to novice',
    description: 'The wing most pilots learn to soar on: light and docile, slow to land, a soft stall with no surprises and a forgiving ' +
      'flare. A little more glide and speed than a trainer, and a little more to do on launch.',
    mass: 110, stall: 25, trim: 33, top: 75, glide: 9, aspectRatio: 5.6, difficulty: 0.2,
  }),
  intermediate: Object.freeze({
    id: 'intermediate', name: 'Intermediate kingposted wing', era: 'today', class: 'Intermediate (game wing)', difficulty: 0.4,
    description: 'The force model\'s own defaults (GLIDER_DEFAULTS): the wing the range was tuned on, and the feel every other wing is ' +
      'scaled from. A game wing: it trims fast (47 km/h), so a final has speed in hand, and a dive held full bar in keeps building speed.',
    character: Object.freeze({}), targets: null, luff: null, reference: null, config: Object.freeze({}), launch: Object.freeze({}), vg: null,
  }),
  'sport-2': defineWing({
    id: 'sport-2', wing: { mass: 26.8, span: 9.6, dihedral: 0.5, carryAlpha: 12.5 }, name: 'Wills Wing Sport 2 155', era: 'today', class: 'Kingposted performance (VG)',
    description: 'A kingposted performance wing, the step up from a Falcon: a good glide with the VG on, still friendly with it off. ' +
      'Easy to launch and land, though it wants more speed and a better-timed flare than a Falcon.',
    mass: 112, stall: 28, aspectRatio: 6.4, difficulty: 0.45,
    vg: { default: 0, loose: { trim: 37, top: 95, glide: 11, difficulty: 0.4 }, tight: { trim: 41, top: 115, glide: 12.5, difficulty: 0.55 } },
    reference: {
      tight: { mass: 115, stallKmh: 28, trimKmh: 36, topKmh: 80, points: [[35, 0.93], [39, 0.91], [44, 0.96], [47, 1.02], [50, 1.15], [53, 1.32], [55, 1.42], [58, 1.66], [60, 1.79], [63, 2.09], [64, 2.26], [68, 2.63], [69, 2.83]] },
      loose: { mass: 115, stallKmh: 28, trimKmh: 32, topKmh: 66, points: [[35, 0.96], [39, 0.94], [44, 1.0], [47, 1.09], [50, 1.26], [53, 1.49], [55, 1.62], [58, 1.94], [60, 2.11], [63, 2.47], [64, 2.67]] },
      sources: ['Wills Wing estimated Sport 2 polar (willswing.com/polar-data-for-wills-wing-hang-gliders)', 'willswing.com/hang-gliders/sport-2: 14.4 m², 9.6 m span, AR 6.4, VNE 85 km/h'],
      note: 'Wills Wing calls its polars estimates. The VG-off polar is an estimate from the VG-on one.',
    },
  }),
  'u2-160': defineWing({
    id: 'u2-160', wing: { mass: 30, span: 10.2, dihedral: -1, carryAlpha: 11.5 }, name: 'Wills Wing U2 160', era: 'today', class: 'Kingposted high performance (VG)',
    description: 'A high-performance kingposted wing: a strong glide and a wide speed range, but heavier in roll when slow, a stall that ' +
      'can drop a tip, and a launch and flare that need flying properly. Between the Sport 2 and the topless T2C.',
    mass: 115, stall: 29, aspectRatio: 6.9, difficulty: 0.7,
    vg: { default: 0, loose: { trim: 38, top: 105, glide: 12, difficulty: 0.65 }, tight: { trim: 43, top: 130, glide: 13.5, difficulty: 0.8 } },
  }),
  't2c-144': defineWing({
    id: 't2c-144', wing: { mass: 33.4, span: 9.9, dihedral: -2, carryAlpha: 10.5 }, name: 'Wills Wing T2C 144', era: 'today', class: 'Topless competition (VG)',
    description: 'A topless competition wing: a flat glide and a dive to 150 km/h with the VG on. The hardest of them to launch and land: ' +
      'heavy on the shoulders and quick to go over, a nose that rises if it is let, a sharp stall that drops a tip, and a flare ' +
      'that has to be on time. VG on it is heavy and deliberate in roll.',
    mass: 120, stall: 30, aspectRatio: 7.3, difficulty: 1,
    vg: { default: 0, loose: { trim: 40, top: 125, glide: 13, difficulty: 0.9 }, tight: { trim: 46, top: 150, glide: 15, difficulty: 1.1 } },
    handling: { maxBank: 65 * DEG, chord: 1.5 },
    reference: {
      tight: { mass: 125, stallKmh: 30, trimKmh: 44, topKmh: 105, points: [[40, 0.9], [42, 0.86], [48, 0.89], [51, 0.96], [55, 1.07], [59, 1.24], [64, 1.41], [68, 1.71], [72, 1.96], [76, 2.37], [80, 2.5], [84, 3.05]] },
      loose: { mass: 125, stallKmh: 30, trimKmh: 34, topKmh: 82, points: [[42, 0.89], [48, 0.93], [51, 1.02], [55, 1.15], [59, 1.36], [64, 1.59], [68, 1.96], [72, 2.28], [76, 2.79], [81, 3.17]] },
      sources: ['willswing.com/hang-gliders/t2c: 13.4 m², 9.9 m span, AR 7.3, VNE 85 km/h', 'Wills Wing estimated Talon polar; Moyes Litespeed RS specifications'],
      note: 'An estimate: Wills Wing has published no glide figures since about 1990.',
    },
  }),
});

/** The preset with this id; an unknown id throws, listing the known ones. */
export function getPreset(id) {
  const p = PRESETS[id];
  if (!p) throw new TypeError(`unknown glider preset "${id}" (known: ${Object.keys(PRESETS).join(', ')})`);
  return p;
}
