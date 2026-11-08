/**
 * The glider: one hang glider and its pilot in a world. It holds the flight state, the config it flies on and the model that
 * steps it, and it carries a flight through its whole life: the launch run, the flight, and the contact with the ground.
 *
 *   const world = createWorld({ terrain: (x, z) => 0, wind: { x: 0, z: -3 } });
 *   const glider = createGlider({ world, at: { y: 60 } });
 *   while (!glider.contact()) glider.step(1 / 60, { roll: 0, pitch: 0 });
 *   glider.land()          // { judged: 'soft', points, stars, notes, ... }
 *
 * A model is anything with { name, defaults, createState(init, config), step(state, input, dt, world, config, skim) }
 * (and optionally performance(config) and scrape(state, contact, ground, rules, config)): forceModel, the default, and
 * classicModel are two; your own drops in the same way.
 */
import { defineConfig, overridesOf } from './config.js';
import { forceModel } from './flight.js';
import { createWorld } from './world.js';
import { LANDING_RULES, scoreLanding, measureFlareZone } from './landing.js';
import { LAUNCH_DEFAULTS, createLaunch, stepLaunch, launchPose, windOnRun, shoulderPivot, barForSpeed } from './launch.js';
import { createTumble } from './tumble.js';
import { updateSkimPose } from './assists/skim-pose.js';
import { finite } from './math.js';
import { getPreset, vgConfig } from './presets.js';
import { polarOf, pitchStabilityOf } from './polar.js';

const MODEL_KEYS = ['name', 'defaults', 'createState', 'step'];
/** A flat site with no edge: the launch runs on the world's own terrain until the wing flies. */
const OPEN_GROUND = Object.freeze({ fall: () => 0, edgeAhead: () => Infinity });

/**
 * options:
 * - world: createWorld(...) (default: flat, calm).
 * - model: a flight model (default forceModel).
 * - preset: a glider preset (presets.js), by id such as 't2c-144' or as the object: the wing's own numbers (force model).
 * - config: overrides of the model's defaults (or of the preset), such as { mass: 100 }.
 * - at: the starting flight state, such as { x, y, z, heading, airspeed }.
 * - skim: the terrain-skimming assist: false (default), true, or { clearance: m or (state, world) => m }.
 * - rules: LANDING_RULES overrides for judging and scoring touchdowns.
 */
export function createGlider({ world = createWorld(), model = forceModel, preset = null, config = {}, at = {}, skim = false, rules = {} } = {}) {
  for (const key of MODEL_KEYS) if (!model || !(key in model)) throw new TypeError(`createGlider: the model has no "${key}"`);
  if (typeof world?.airAt !== 'function') throw new TypeError('createGlider: world must come from createWorld()');
  const name = `${model.name} config`;
  // The config is built in layers: the model's defaults, the preset, the preset's sail at the VG setting, then the tuning.
  const baseOf = (p, vg) => {
    if (!p) return model.defaults;
    if (model !== forceModel) throw new TypeError('createGlider: presets are configs of the force model');
    return defineConfig(model.defaults, { ...p.config, ...vgConfig(p, vg) }, name);
  };
  let current = preset === null ? null : typeof preset === 'string' ? getPreset(preset) : preset;
  let vgSetting = current?.vg ? current.vg.default : 0, tuning = { ...config };
  let base = baseOf(current, vgSetting), cfg = defineConfig(base, tuning, name), perf = null, flare = null;
  const landingRules = defineConfig(LANDING_RULES, rules, 'rules');
  const skimOptions = !skim ? null : { clearance: typeof skim === 'object' && typeof skim.clearance === 'function'
    ? state => skim.clearance(state, world) : typeof skim === 'object' ? skim.clearance : undefined };
  let state = model.createState({ ...at }, cfg);

  const glider = {
    world, model,
    /** The live flight state (position, attitude, speeds, flags). Read it freely; change it through reset() or place(). */
    get state() { return state; },
    /** The frozen config the glider flies on. */
    get config() { return cfg; },
    /** The preset flown (null: the model's defaults). */
    get preset() { return current; },
    /** What differs from the preset (or the model's defaults): with the preset, enough to reproduce this tuning. */
    get overrides() { return overridesOf(cfg, base); },
    get rules() { return landingRules; },
    /** Speeds, sink and glide for the current config (stallSpeed, trimSpeed, sink, glideAngle, glideRatio, ...). */
    get performance() { return perf ??= model.performance?.(cfg) ?? null; },

    /**
     * Advances the flight by dt seconds. input: roll (-1 left .. +1 right), pitch (the bar: -1 in, dive .. +1 out, flare),
     * stand (sit up for drag), field (low over landable ground). Returns the state.
     */
    step(dt, input = {}) {
      if (!(dt >= 0) || dt === Infinity) throw new RangeError(`glider.step: dt must be a finite number of seconds >= 0 (got ${dt})`);
      model.step(state, input, dt, world, cfg, skimOptions);
      if (skimOptions) updateSkimPose(state, dt, world); else state.visualBank = state.bank;
      return state;
    },
    /** Changes config values in flight (the rest stay as they are); tune() with no argument restores the preset or defaults. */
    tune(patch) {
      cfg = patch ? defineConfig(cfg, patch, name) : base; perf = null;
      tuning = patch ? { ...tuning, ...patch } : {};
      return glider;
    },
    /** Switches to another preset (by id or object; null for the model's defaults) in flight, dropping any tuning. */
    usePreset(next) {
      const p = next === null ? null : typeof next === 'string' ? getPreset(next) : next;
      current = p; vgSetting = p?.vg ? p.vg.default : 0; tuning = {};
      base = baseOf(p, vgSetting); cfg = base; perf = null;
      return glider;
    },
    /** True when the preset has a VG (variable geometry): a sail the pilot can pull tight for speed or let loose to turn. */
    get hasVG() { return !!current?.vg; },
    /** The VG setting, 0 (loose: lighter handling, slower) .. 1 (tight: flatter glide at speed, heavier in roll). */
    get vg() { return vgSetting; },
    /** Sets the VG (0 loose .. 1 tight); the tuning stays on top. Without a VG on the preset it does nothing. */
    setVG(value) {
      if (!current?.vg) return glider;
      const next = Math.max(0, Math.min(1, Number(value) || 0));
      if (next === vgSetting) return glider;
      vgSetting = next; base = baseOf(current, vgSetting); cfg = defineConfig(base, tuning, name); perf = null;
      return glider;
    },
    /** The polar for the current config (polar.js): points, stall, trim, top speed, min sink, best glide, speedToFly(). */
    polar(options) { return glider.performance ? polarOf(glider.performance, options) : null; },
    /** Static pitch stability for the current config (polar.js pitchStabilityOf), or null for a model without it. */
    pitchStability(options) { return pitchStabilityOf(glider.performance, { toAlpha: Math.max(0.35, (cfg.stallAlpha ?? 0.3) + 0.1), ...options }); },
    /**
     * Where to flare this wing, by approach speed (landing.js measureFlareZone): { zones, at(airspeed) → { low, high } | null },
     * the heights of the feet from which holding the bar out lands softly. Measured by flying it (a few hundred ms), once per
     * config; null for a model without performance.
     */
    flareZone() {
      if (!glider.performance) return null;
      if (flare?.cfg !== cfg) {
        const p = glider.performance, flat = createWorld({ wind: { x: 0, z: -2 } }), at = cfg, skimless = model;
        flare = { cfg, zone: measureFlareZone(init => createGlider({ world: flat, model: skimless, config: at, at: init, rules }), p,
          { footHeight: cfg.contactHeight ?? 2.3, barFor: v => barForSpeed(v, b => p.trimSpeed(b)) }) };
      }
      return flare.zone;
    },
    /** LAUNCH_DEFAULTS with the preset's own launch handling (presets.js): how this wing behaves on the shoulders and the run. */
    get launchConfig() { return current?.launch && Object.keys(current.launch).length ? defineConfig(LAUNCH_DEFAULTS, current.launch, 'launch config') : LAUNCH_DEFAULTS; },
    /** The real wing's published figures at the current VG (presets.js reference), for comparison, or null. */
    get reference() { const r = current?.reference; return !r ? null : current.vg ? (vgSetting < 0.5 ? r.loose : r.tight) : r; },
    /** Starts over with a fresh flight state (as createGlider's at). */
    reset(init = {}) { state = model.createState({ ...init }, cfg); return glider; },
    /** Moves the glider without changing how it flies. */
    place({ x = state.x, y = state.y, z = state.z, heading = state.heading } = {}) { Object.assign(state, { x, y, z, heading }); return glider; },
    /** The air where the glider is: lift, wind and the ground below (World.airAt). */
    air() { return world.airAt(state.x, state.y, state.z); },
    /** Height of the body reference above the ground, m. */
    height() { return state.y - world.heightAt(state.x, state.z); },

    /**
     * The touchdown, once the glider is on the ground (its body lower than contactHeight over it, less tolerance), else null:
     * { verticalSpeed (into the ground, along its normal), groundSpeed, slope, bank, heading, airspeed, wind, x, z, ground, flare }.
     * It is what judgeTouchdown and scoreLanding read.
     */
    contact({ tolerance = 0 } = {}) {
      const { x, z } = state, ground = world.heightAt(x, z);
      if (!(state.y < ground + finite(cfg.contactHeight, 2.3) - tolerance)) return null;
      const gx = (world.heightAt(x + 12, z) - world.heightAt(x - 12, z)) / 24, gz = (world.heightAt(x, z + 12) - world.heightAt(x, z - 12)) / 24;
      const slope = Math.hypot(gx, gz), horizontal = state.airspeed * Math.cos(state.pathAngle || 0);
      const vx = Math.sin(state.heading) * horizontal + state.windX, vz = Math.cos(state.heading) * horizontal + state.windZ;
      return {
        verticalSpeed: (gx * vx + gz * vz - state.verticalSpeed) / Math.sqrt(1 + slope * slope), groundSpeed: Math.hypot(vx, vz),
        slope, bank: state.bank, heading: state.heading, airspeed: state.airspeed, wind: { x: state.windX, z: state.windZ }, x, z, ground,
        flare: { pressed: !!state.flarePressed, feet: state.flareFeet, ratio: state.flareRatio, balloon: state.flareBalloon },
      };
    },
    /** Judges and scores a touchdown (contact() by default) against an optional landing mark { x, z, radius }. */
    land(target = null, contact = glider.contact()) {
      if (!contact) throw new Error('land: the glider is not on the ground (pass a contact to score one anyway)');
      return scoreLanding(contact, target, landingRules);
    },
    /** A light, fast, level contact skips off the ground instead of landing: true when it did (the flight goes on). */
    scrape(contact = glider.contact()) {
      return !!contact && !!model.scrape?.(state, contact, contact.ground ?? world.heightAt(state.x, state.z), landingRules, cfg);
    },

    /**
     * Stands the pilot where the glider is, the wing resting on its base bar, ready to launch; returns the Launch. The run steps
     * this glider's own flight state, so once launch.airborne the flight simply carries on with glider.step().
     * options: site { fall(x, z, heading), edgeAhead(x, z, heading), ground(x, z) } (default: the world's terrain, no edge),
     * manual (a realistic launch: the pilot balances, holds the nose, starts and jumps), config (LAUNCH_DEFAULTS overrides, over the
     * preset's own launch handling).
     */
    launch({ site = OPEN_GROUND, manual = false, config: launchConfig = {} } = {}) {
      const launchCfg = defineConfig(glider.launchConfig, launchConfig, 'launch config');
      const groundAt = site.ground ?? world.heightAt;
      state = model.createState({ x: state.x, y: groundAt(state.x, state.z) + cfg.contactHeight, z: state.z, heading: state.heading }, cfg);
      return createLaunchHandle({ glider, run: createLaunch(state), site, groundAt, manual, launchCfg });
    },
  };
  return glider;
}

const windNow = (world, s) => { const w = world.windAt(s.x, s.y, s.z); return { x: finite(w.x), z: finite(w.z) }; };

function createLaunchHandle({ glider, run, site, groundAt, manual, launchCfg }) {
  const { world } = glider;
  const launch = {
    /** The launch state: phase ('pickup', 'balance', 'run'), distance, groundSpeed, airspeed, lift, roll, yaw, warn, ... */
    state: run,
    manual,
    get phase() { return run.phase; },
    /** Off the ground: the flight carries on with glider.step(). reason: 'flying' or 'edge' (dropped off below flying speed). */
    get airborne() { return run.airborne; },
    get reason() { return run.reason; },
    /** How it went wrong, or null: 'wingdrop', 'turned' or 'stumbled'. See tumble(). */
    get failed() { return run.failed; },
    /** The bar to hold through the first moments of flight (what the pilot held on the run). */
    get barHold() { return run.barHold; },

    /**
     * Advances the launch by dt. controls (a manual launch): balance (-1..1, weight shift), nose (-1..1, while held), push,
     * go (start the run), jump. The wind, the rising air and the run's ground come from the world and the site; pass any of
     * headwind, crosswind, airLift, slope or edgeAhead in conditions to set them yourself. Moves the glider along its run.
     */
    step(dt, controls = {}, conditions = {}) {
      if (run.airborne || run.failed) return launch;
      const s = glider.state, { x, z, heading } = s;
      const air = world.airAt(x, s.y, z), wind = windOnRun({ x: air.windX, z: air.windZ }, heading);
      const moved = stepLaunch(run, dt, {
        headwind: wind.headwind, crosswind: wind.crosswind, airLift: air.lift,
        slope: site.fall(x, z, heading), edgeAhead: site.edgeAhead(x, z, heading), ...conditions,
        x, y: s.y, z, heading, manual, balance: controls.balance, nose: controls.nose, push: controls.push, go: controls.go, jump: controls.jump,
      }, glider.config, launchCfg);
      const side = run.sideMoved || 0;
      s.x = x + Math.sin(heading) * moved - Math.cos(heading) * side;
      s.z = z + Math.cos(heading) * moved + Math.sin(heading) * side;
      s.heading = heading + (run.turnRate || 0) * dt;
      s.y = groundAt(s.x, s.z) + glider.config.contactHeight;
      return launch;
    },
    /** Where the wing and the pilot are, for drawing: height, pitch, roll, yaw, lean, lift, carry, grip, shoulders, ... */
    pose(stride = 0) { return launchPose(run, stride, glider.config, launchCfg); },
    /**
     * A failed launch as a rigid body (tumble.js), from exactly the state it went wrong in: step it with stepTumble until done.
     * stride: the drawn stride phase (as for pose); ground: what the wreck lands on (default the site's ground).
     */
    tumble({ stride = 0, ground = groundAt } = {}) {
      const s = glider.state, pose = launchPose(run, stride, glider.config, launchCfg), heading = s.heading + pose.yaw;
      const o = shoulderPivot(pose.pitch, heading, pose.roll, pose.shoulders);
      return createTumble({ x: s.x + o[0], y: groundAt(s.x, s.z) + pose.height + o[1], z: s.z + o[2], pitch: pose.pitch, heading, roll: pose.roll,
        speed: run.groundSpeed, rollRate: run.rollV || 0, yawRate: (run.yawV || 0) + (run.turnRate || 0), ground, wind: windNow(world, s), solid: world.solidAt });
    },
  };
  return launch;
}
