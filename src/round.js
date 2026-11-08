/**
 * A round: one go of a glider from the ground or the air to the end, the whole lifecycle in one place. Standing at a launch with the
 * wing resting; the launch (glider.launch: the pickup, the balance, the run); the take-off, where the bar the pilot held on the run is
 * handed over to them; the flight; a light, fast touch that only scrapes; the touchdown, judged and scored; and anything that goes
 * wrong, carried on as the rigid-body tumble until the wreck is still. The games (the range) draw it; the tuning scenarios fly it
 * headless; both step the same code, so a round looks and flies the same wherever it is run.
 *
 *   const round = createRound({ glider, target: { x: 0, z: 0, radius: 60 } });
 *   round.standAt(site);   round.launch();          // or round.startAt({ x, y, z, heading, airspeed })
 *   round.step(dt, { roll, pitch, nose, push, go, jump });   // each tick; read round.phase, round.glider.state, round.run, ...
 *   round.on(event => ...)   // 'launch', 'liftoff', 'failed', 'scrape', 'crash', 'touchdown': for sound, dust and the card
 *
 * Everything a round holds is plain data (state()), so a game can record it every tick and draw it again later.
 */
import { createTumble, stepTumble } from './tumble.js';
import { scoreLanding } from './landing.js';
import { clamp, finite, smoothstep } from './math.js';

const PITCH_DEADZONE = 0.05;

/**
 * The bar through a take-off, as data: the pilot keeps holding what they held on the run (holdBar) until they make a new input,
 * so a key still held from the run, then let go after lift-off, is not taken as a fresh bar command. A cliff step-off (or any drop
 * off an edge in an easy launch) gets the bar in for the dive. takeoffPitch(state, input, info) returns the bar to fly and updates
 * the state.
 */
export function createTakeoffBar({ heldPitch = 0, holdBar = 0, dropped = false, cliff = false, realistic = false } = {}) {
  const inherited = clamp(finite(heldPitch), -1, 1);
  return { inherited, waiting: Math.abs(inherited) >= PITCH_DEADZONE, handed: false, holdBar: clamp(finite(holdBar), -1, 1), dropped, cliff, realistic };
}
export function takeoffPitch(bar, input, { age = 0, airspeed = 0 } = {}) {
  const value = clamp(finite(input), -1, 1), active = Math.abs(value) >= PITCH_DEADZONE;
  if (bar.waiting) {
    if (!active) bar.waiting = false;
    else if (Math.sign(value) !== Math.sign(bar.inherited)) { bar.waiting = false; bar.handed = true; }   // (a reversal is a new command)
  } else if (active) bar.handed = true;
  if (bar.dropped && (!bar.realistic || bar.cliff)) return value <= 0 && airspeed < 16 ? Math.min(value, -0.3) : value;
  if (bar.handed) return value;
  return bar.holdBar * (bar.realistic ? 1 : 1 - smoothstep(2, 7, age));
}

/**
 * options:
 * - glider (createGlider), whose world is the ground and the air.
 * - realistic: the launch is the pilot's own (balance, nose, go, jump); false flies it for them.
 * - target: the landing mark { x, z, radius } scored against, or null.
 * - ground(x, z): what the feet and a wreck stand on (default the world's terrain): a deck, a rock.
 * - solid({ x, y, z }): a solid thing the glider has flown into ('the ramp', 'the rock'), or null.
 * - landable(x, z): ground a glider may land on (default: gentler than about 23 degrees).
 * - bodyPose(state): where the glider and pilot are drawn as one body ({ x, y, z, pitch, heading, roll }), for a crash's tumble
 *   to start from (default: the reference point lowered to the bar).
 */
export function createRound({ glider, realistic = true, target = null, ground = null, solid = null, landable = null, bodyPose = null } = {}) {
  const world = glider.world, groundAt = ground ?? world.heightAt;
  const landableAt = landable ?? ((x, z) => Math.hypot(world.heightAt(x + 6, z) - world.heightAt(x - 6, z), world.heightAt(x, z + 6) - world.heightAt(x, z - 6)) / 12 < 0.42);
  const listeners = new Set(), emit = (type, detail = {}) => { for (const f of listeners) f({ type, ...detail }); };
  const r = {
    phase: 'ready', t: 0, site: null, launch: null, takeoff: null, stand: false, tumble: null, wreck: null, result: null, contact: null,
    scrapes: 0, distanceFlown: 0, maxSpeed: 0,
  };
  const reset = () => Object.assign(r, { t: 0, launch: null, takeoff: null, stand: false, tumble: null, wreck: null, result: null, contact: null, scrapes: 0, distanceFlown: 0, maxSpeed: 0 });
  const defaultPose = s => ({ x: s.x, y: s.y - (glider.config.contactHeight - 0.65), z: s.z, pitch: -s.pitch, heading: s.heading, roll: s.visualBank ?? s.bank });

  function tumbleFromFlight() {
    const s = glider.state, pose = (bodyPose ?? defaultPose)(s), horizontal = s.airspeed * Math.cos(s.pathAngle || 0);
    r.tumble = createTumble({ ...pose, ground: groundAt, wind: { x: finite(s.windX), z: finite(s.windZ) },
      velocity: [Math.sin(s.heading) * horizontal + finite(s.windX), s.verticalSpeed, Math.cos(s.heading) * horizontal + finite(s.windZ)], yawRate: finite(s.headingRate) });
    r.tumble.fromFlight = true; r.phase = 'tumble'; r.takeoff = null; emit('crash', { kind: 'flight' });
  }
  function touchdown(contact) {
    r.contact = contact;
    if (!contact.settled && scoreLanding(contact, target, glider.rules).judged === 'crash') { tumbleFromFlight(); return; }
    r.result = scoreLanding(contact, target, glider.rules);
    r.phase = r.result.judged === 'crash' ? 'crashed' : 'landed'; r.takeoff = null;
    emit('touchdown', { result: r.result, contact });
  }

  const round = {
    glider,
    /** The live round (read it freely): phase ('ready', 'launch', 'flight', 'tumble', 'landed', 'crashed'), t, launch, takeoff, ... */
    get phase() { return r.phase; },
    get t() { return r.t; },
    get site() { return r.site; },
    /** The launch run while launching: glider.launch's handle (its state: phase, roll, lift, ...; pose(); failed; airborne), else null. */
    get run() { return r.launch; },
    /** The take-off, the first seconds of a flight from a launch: { t, dropped, cliff, jumped, bar, proneAt, ownStance }, else null. */
    get takeoff() { return r.takeoff; },
    /** The pilot sitting up in flight (for drag and a slow landing). */
    get stand() { return r.stand; },
    set stand(v) { r.stand = !!v; if (r.takeoff) r.takeoff.ownStance = true; },
    get tumble() { return r.tumble; },
    get wreck() { return r.wreck; },
    get result() { return r.result; },
    get contact() { return r.contact; },
    get scrapes() { return r.scrapes; },
    get distanceFlown() { return r.distanceFlown; },
    get maxSpeed() { return r.maxSpeed; },
    /** Listens to the round's events; returns a function that stops listening. */
    on(f) { listeners.add(f); return () => listeners.delete(f); },

    /** Stands the pilot at a launch site ({ start: { x, z, heading }, ground, fall, edgeAhead }), the wing resting, ready. */
    standAt(site) {
      reset(); r.site = site; r.phase = 'ready';
      const { x, z, heading } = site.start, y = (site.ground ?? groundAt)(x, z) + glider.config.contactHeight;
      glider.reset({ x, y, z, heading });
      return round;
    },
    /** Starts in the air, from a flight state ({ x, y, z, heading, airspeed, pathAngle, ... }). */
    startAt(init) { reset(); r.site = null; glider.reset(init); r.phase = 'flight'; return round; },
    /** Picks the wing up and starts the launch (from standing ready at a site). */
    launch() {
      if (r.phase !== 'ready' || !r.site) return round;
      r.launch = glider.launch({ site: r.site, manual: realistic }); r.phase = 'launch';
      emit('launch');
      return round;
    },

    /**
     * Advances the round by dt. input: roll (-1 left .. +1 right: the weight shift in flight, the balance on a launch), pitch (the
     * bar), nose (the held nose on a realistic launch), push (run hard), go (start the run), jump, field (override: low over ground
     * to land on), stride (the drawn stride phase, for where a failed launch's wreck starts).
     */
    step(dt, input = {}) {
      if (!(dt > 0)) return round;
      r.t += dt;
      if (r.phase === 'launch') {
        const l = r.launch, s = l.state;
        l.step(dt, { nose: finite(input.nose), balance: finite(input.roll), push: finite(input.push), go: !!s.go || !!input.go, jump: !!input.jump });
        if (l.failed) {
          r.tumble = l.tumble({ stride: finite(input.stride), ground: groundAt }); r.phase = 'tumble';
          emit('failed', { reason: l.failed, launch: l });
          return round;
        }
        if (l.airborne) {
          // The flight carries on from the launch's own state: the same wing, speed, path and angle, nothing handed over.
          const dropped = l.reason !== 'flying', st = glider.state;
          glider.place({ x: st.x, y: (r.site.ground ?? groundAt)(st.x, st.z) + glider.config.contactHeight, z: st.z, heading: st.heading });
          r.takeoff = { t: 0, dropped, cliff: !!s.cliff, jumped: !!s.jumped, proneAt: null, ownStance: false,
            bar: createTakeoffBar({ heldPitch: finite(input.pitch), holdBar: dropped ? 0 : l.barHold, dropped, cliff: !!s.cliff, realistic }) };
          r.stand = false; r.phase = 'flight'; r.distanceFlown = 0; r.maxSpeed = 0;
          emit('liftoff', { launch: l, dropped });
        }
        return round;
      }
      if (r.phase === 'tumble') {
        stepTumble(r.tumble, dt);
        if (r.tumble.done) {
          r.wreck = r.tumble; r.tumble = null;
          touchdown({ settled: true, verticalSpeed: Math.max(6, r.wreck.impact), groundSpeed: r.wreck.speed0 ?? 0, slope: 0, bank: 0, heading: glider.state.heading,
            airspeed: r.wreck.speed0 ?? 0, wind: { x: finite(glider.state.windX), z: finite(glider.state.windZ) }, x: r.wreck.x, z: r.wreck.z, flare: { pressed: false } });
        }
        return round;
      }
      if (r.phase !== 'flight') return round;

      const s = glider.state, px = s.x, pz = s.z, tk = r.takeoff;
      const field = input.field ?? (s.y - world.heightAt(s.x, s.z) < 14 && landableAt(s.x, s.z));
      const pitch = tk ? takeoffPitch(tk.bar, input.pitch, { age: tk.t, airspeed: s.airspeed }) : finite(input.pitch);
      glider.step(dt, { stand: r.stand, roll: finite(input.roll), pitch, field, landable: input.landable });
      r.distanceFlown += Math.hypot(s.x - px, s.z - pz); r.maxSpeed = Math.max(r.maxSpeed, s.airspeed);
      // Solid things (a deck, a rock), but not in the first moments of the launch off them.
      const hit = solid && !(tk && tk.t < 0.25) ? solid(s) : null;
      if (hit) {
        touchdown({ verticalSpeed: 9, groundSpeed: s.airspeed, slope: 0, bank: s.bank, heading: s.heading, airspeed: s.airspeed, wind: { x: s.windX, z: s.windZ }, x: s.x, z: s.z, flare: { pressed: false }, hit });
        r.takeoff = null;
        return round;
      }
      // Just off the ground the feet may still brush it: that is the end of the run, not a landing.
      const contact = glider.contact({ tolerance: tk && tk.t < 1.2 ? 0.3 : 0 });
      if (contact) {
        if (glider.scrape(contact)) { r.scrapes++; emit('scrape', { contact }); }
        else touchdown(contact);
      }
      if (tk) {   // (the take-off's clock runs after the tick it times, as the range always had it)
        tk.t += dt;
        if (tk.t > 8 || r.phase !== 'flight') r.takeoff = null;
        // The pilot goes prone once the wing is flying (or as they pull in to dive for it).
        else if (tk.proneAt === null && (tk.cliff || s.airspeed >= 1.05 * glider.performance.stallSpeed() || finite(s.bar) < -0.25)) tk.proneAt = tk.t;
      }
      return round;
    },

    /** The round as plain data, to record and draw again: everything but the functions. */
    state() {
      const s = glider.state, l = r.launch;
      return {
        phase: r.phase, t: r.t, stand: r.stand, glider: { ...s },
        launch: l ? { ...l.state, flight: undefined, pose: l.pose(0), airborne: l.airborne, failed: l.failed, barHold: l.barHold } : null,
        takeoff: r.takeoff ? { ...r.takeoff, bar: { ...r.takeoff.bar } } : null,
        tumble: r.tumble ? { x: r.tumble.x, y: r.tumble.y, z: r.tumble.z, q: [...r.tumble.q], t: r.tumble.t, impact: r.tumble.impact, v: [...r.tumble.v] } : null,
        wreck: r.wreck ? { x: r.wreck.x, y: r.wreck.y, z: r.wreck.z, q: [...r.wreck.q], impact: r.wreck.impact } : null,
        result: r.result, scrapes: r.scrapes, distanceFlown: r.distanceFlown, maxSpeed: r.maxSpeed,
      };
    },
  };
  return round;
}
