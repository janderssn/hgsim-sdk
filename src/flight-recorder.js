/**
 * Flight recorder: keeps each round's inputs and flight data at 20 Hz, plus the moments the pilot marks, so a play test
 * can be read back afterwards with tools/flight-report.mjs. Costs almost nothing and never touches the flight.
 *
 *   const recorder = createFlightRecorder({ storage: localStorage, send: flight => fetch(...) });
 *   recorder.begin({ start, model, wind });  recorder.sample(t, { x, y, ... });  recorder.mark();  recorder.end({ outcome });
 *
 * Rounds are kept in storage (the latest MAX_ROUNDS, fewer if storage fills up) and handed to send() when they end. A mark
 * made just after a round ended, such as right after a bad landing, is added to that round.
 */
export const FLIGHT_FIELDS = ['t', 'x', 'y', 'z', 'clear', 'kmh', 'vs', 'heading', 'bank', 'pitch', 'path', 'alpha', 'load', 'bar', 'inRoll', 'inPitch', 'upright', 'stalled', 'windX', 'windZ'];
const DECIMALS = { t: 2, x: 1, y: 2, z: 1, clear: 2, kmh: 1, vs: 2, heading: 3, bank: 3, pitch: 3, path: 3, alpha: 3, load: 2, bar: 2, inRoll: 2, inPitch: 2, upright: 2, stalled: 0, windX: 1, windZ: 1 };
export const SAMPLE_PERIOD = 1 / 20;
const STORAGE_KEY = 'above-flights', MAX_ROUNDS = 8, MIN_SECONDS = 3, LATE_MARK_SECONDS = 15;
const makeId = () => new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 6);

export function createFlightRecorder({ storage = null, send = null, now = () => Date.now() } = {}) {
  let current = null, last = null, lastEnded = 0, nextSample = 0, lastT = 0;
  const load = () => { try { return JSON.parse(storage?.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  function persist(flight) {
    if (!storage) return;
    let list = load().filter(f => f.id !== flight.id); list.push(flight); list = list.slice(-MAX_ROUNDS);
    // Storage can fill up or be blocked: drop the oldest rounds, and never let it disturb the flight.
    while (list.length) { try { storage.setItem(STORAGE_KEY, JSON.stringify(list)); return; } catch { list.shift(); } }
  }
  const deliver = flight => { persist(flight); try { Promise.resolve(send?.(flight)).catch(() => {}); } catch {} };
  const api = {
    get active() { return !!current; },
    begin(info = {}) {
      api.end({ outcome: 'abandoned' });
      current = { id: makeId(), version: 1, savedAt: new Date(now()).toISOString(), ...info, fields: FLIGHT_FIELDS, samples: [], marks: [], outcome: null };
      nextSample = 0; lastT = 0;
    },
    /** t: seconds since the round began. Thinned to SAMPLE_PERIOD whatever the frame rate. */
    sample(t, values) {
      if (!current) return; lastT = t;
      if (t < nextSample) return; nextSample = Math.max(nextSample + SAMPLE_PERIOD, t); // Keeps the average rate at low frame rates, without a burst after a stall.
      current.samples.push(FLIGHT_FIELDS.map(k => { const v = k === 't' ? t : values[k]; return Number.isFinite(+v) ? +(+v).toFixed(DECIMALS[k]) : 0; }));
    },
    /** Returns where the mark went: 'flight', 'late' (the round that just ended) or null. */
    mark() {
      if (current) { current.marks.push(+lastT.toFixed(2)); return 'flight'; }
      if (last && now() - lastEnded < LATE_MARK_SECONDS * 1000) { last.marks.push(+(last.duration + (now() - lastEnded) / 1000).toFixed(2)); deliver(last); return 'late'; }
      return null;
    },
    end(summary = {}) {
      if (!current) return null;
      const flight = current; current = null;
      flight.duration = +lastT.toFixed(2); Object.assign(flight, summary);
      // A round thrown away straight after starting is noise, unless the pilot marked something in it.
      if (flight.duration < MIN_SECONDS && !flight.marks.length && flight.outcome === 'abandoned') return null;
      last = flight; lastEnded = now(); deliver(flight);
      return flight;
    },
    list: load,
    clear() { try { storage?.removeItem(STORAGE_KEY); } catch {} last = null; },
  };
  return api;
}
