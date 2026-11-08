/**
 * Above audio. Pure WebAudio synthesis: no audio files, no ScriptProcessor.
 * Contract (REDESIGN.md): createAudio() -> {unlock, setEnabled, enabled, update(state, dt), emit(event, data)}.
 *
 *   wind / ambience / cable hum -> bed (pause duck) ---------+
 *   vario beeps + sink drone -------------------------------- +
 *   one-shot voices (sfx, ui) ------------------------------- +-> master -> compressor -> trim -> soft clip -> out
 *   reverb return (chimes, birds, gulls) -------------------- +
 *
 * Nothing is created before unlock() (autoplay policy). Continuous layers are built once and
 * only their gains/filters move (setTargetAtTime). One-shots are short-lived voices that are
 * stopped and disconnected once they end, with a hard cap on concurrent voices.
 */

import { createValleyAmbience } from './valley-ambience.js';

export const SOUND_STORAGE_KEY = 'alpine-frontier-sound';
export const MAX_VOICES = 20;
const MAX_DYING = 8;
const MASTER_LEVEL = 0.8;
const LOOKAHEAD = 0.12;
const PARAM_INTERVAL = 1 / 30;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
/** Smoothstep from a to b (a may be greater than b for a falling ramp). */
const ramp = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const EMPTY = Object.freeze({});

/** Classic hang-gliding vario: pitch and beep rate rise with climb above the threshold. */
export const VARIO = Object.freeze({ threshold: 0.3, full: 6, minFreq: 600, maxFreq: 1400, minRate: 1.6, maxRate: 7.2, sinkStart: -3, sinkFull: -7 });

export function varioTone(climb) {
  const c = num(climb);
  if (c < VARIO.threshold) return { active: false, freq: VARIO.minFreq, rate: 0, duty: 0 };
  const t = clamp((c - VARIO.threshold) / (VARIO.full - VARIO.threshold), 0, 1);
  return {
    active: true,
    freq: VARIO.minFreq + (VARIO.maxFreq - VARIO.minFreq) * Math.pow(t, 0.8),
    rate: VARIO.minRate + (VARIO.maxRate - VARIO.minRate) * Math.pow(t, 0.9),
    duty: 0.52 - 0.14 * t,
  };
}

/** Quiet low drone in real sink (not in intentional fast dives). level 0..1. */
export function sinkTone(climb, speed = 0) {
  const c = num(climb);
  return { level: ramp(VARIO.sinkStart, VARIO.sinkFull, c) * (1 - ramp(19, 27, num(speed))), freq: 235 - 70 * ramp(VARIO.sinkStart, -9, c) };
}

export function readSoundPreference(storage) {
  try { return storage?.getItem?.(SOUND_STORAGE_KEY) !== 'off'; } catch { return true; }
}
export function writeSoundPreference(storage, on) {
  try { storage?.setItem?.(SOUND_STORAGE_KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
}

function defaultStorage(host) { try { return host.localStorage || null; } catch { return null; } }

function blankState() {
  return { mode: 'ready', paused: false, speed: 0, verticalSpeed: 0, lift: 0, thermalLift: 0, ridgeLift: 0, clearance: 1000, skim: 0,
    stalled: false, stallWarning: false, pullUp: false, bank: 0, walking: false, sprinting: false,
    biome: { alpine: 1, desert: 0, tropical: 0, archipelago: 0 }, nearSea: 0, altitude: 1500, environment: null };
}

/** Copies a possibly partial game state into `out` with safe numbers. Biome, sea and altitude persist when missing. */
function readState(src, out) {
  const s = src && typeof src === 'object' ? src : EMPTY;
  out.mode = typeof s.mode === 'string' ? s.mode : 'ready';
  out.paused = !!s.paused;
  out.speed = clamp(num(s.speed), 0, 150);
  out.verticalSpeed = clamp(num(s.verticalSpeed), -90, 90);
  out.lift = clamp(num(s.lift), -30, 30);
  out.thermalLift = clamp(num(s.thermalLift), -30, 30);
  out.ridgeLift = clamp(num(s.ridgeLift), -30, 30);
  out.clearance = clamp(num(s.clearance, 1000), -100, 1e5);
  out.skim = clamp(num(s.skim), 0, 1);
  out.stalled = !!s.stalled;
  out.stallWarning = !!s.stallWarning || out.stalled;
  out.pullUp = !!s.pullUp;
  out.bank = clamp(num(s.bank), -Math.PI, Math.PI);
  out.walking = !!s.walking;
  out.sprinting = !!s.sprinting;
  out.environment = s.environment && typeof s.environment === 'object' ? s.environment : null;
  const b = s.biome;
  if (b && typeof b === 'object') {
    const a = clamp(num(b.alpine), 0, 1), d = clamp(num(b.desert), 0, 1), t = clamp(num(b.tropical), 0, 1), r = clamp(num(b.archipelago), 0, 1);
    const k = a + d + t + r > 1 ? 1 / (a + d + t + r) : 1;
    out.biome.alpine = a * k; out.biome.desert = d * k; out.biome.tropical = t * k; out.biome.archipelago = r * k;
  }
  if ('nearSea' in s) out.nearSea = clamp(num(s.nearSea), 0, 1);
  if (typeof s.altitude === 'number' && Number.isFinite(s.altitude)) out.altitude = s.altitude;
  return out;
}

/** Slow, smooth pseudo-random gust value in 0..1. */
function gustAt(t, seed) {
  const a = Math.sin(t * 0.31 + seed) * 0.5 + Math.sin(t * 0.77 + seed * 1.7) * 0.3 + Math.sin(t * 1.93 + seed * 2.3) * 0.2;
  return clamp(0.5 + a * 0.5, 0, 1);
}

function softClipCurve(n = 2049) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < 0.6 ? a : 0.6 + 0.38 * Math.tanh((a - 0.6) / 0.38));
  }
  return curve;
}

/* ---------------- envelope helpers (operate on an AudioParam) ---------------- */

/** Linear attack, optional hold, exponential release to silence. Returns the end time. */
function swell(param, t, peak, attack, hold, release) {
  param.setValueAtTime(0, t);
  if (!(peak > 1e-5)) return t;
  param.linearRampToValueAtTime(peak, t + attack);
  if (hold > 0) param.setValueAtTime(peak, t + attack + hold);
  const end = t + attack + Math.max(0, hold) + release;
  param.exponentialRampToValueAtTime(peak * 1e-3, end);
  param.linearRampToValueAtTime(0, end + 0.012);
  return end + 0.012;
}
const perc = (param, t, peak, attack, decay) => swell(param, t, peak, attack, 0, decay);
/** Short linear grain that returns to zero; returns its end time. Grains on one param must not overlap. */
function grain(param, t, peak, attack, decay) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(Math.max(0, peak), t + attack);
  param.linearRampToValueAtTime(0, t + attack + decay);
  return t + attack + decay;
}

const SURFACE_OF = { alpine: 'gravel', desert: 'sand', tropical: 'grass', archipelago: 'rock' };
const REGION_ROOT = { alpine: 146.83, desert: 123.47, tropical: 164.81, archipelago: 138.59 };

/**
 * createAudio(options?) — options are for tests/tools only:
 *   AudioContext (constructor), createContext() (factory), storage (localStorage-like), random(), document.
 */
export function createAudio(options = {}) {
  const host = typeof window !== 'undefined' ? window : globalThis;
  const storage = 'storage' in options ? options.storage : defaultStorage(host);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const valley = createValleyAmbience({ random }), valleyState = {};
  const doc = 'document' in options ? options.document : (typeof document !== 'undefined' ? document : null);
  const makeContext = typeof options.createContext === 'function' ? options.createContext : () => {
    const Ctor = options.AudioContext || host.AudioContext || host.webkitAudioContext;
    return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null;
  };

  let on = readSoundPreference(storage);
  let ctx = null, g = null, failures = 0, errors = 0, lastError = null, hidden = !!doc?.hidden, suspendTimer = null;
  const voices = [], dying = [], lastPlayed = new Map(), counts = Object.create(null), targets = new WeakMap(), S = blankState();
  let persistentCount = 0, voiceNodes = 0, beepCount = 0;
  let lastParamAt = -1, lastParamMode = '', lastParamPaused = false, prevMode = '', varioClimb = 0, varioOn = true;
  let nextBeep = 0, beepEnd = 0, beepActive = false, stepNext = 0, stepSide = 1, prevStalled = false, skimOn = false;
  let nextBird = 0, nextGull = 0, nextInsect = 0, wavePhase = 0.5, wavePeriod = 8, waveSize = 0.8;
  let cicSwell = 0.6, cicTarget = 0.8, cicNext = 0, duckLevel = 1, duckUntil = 0;

  function noteError(err) {
    errors++; lastError = err;
    if (errors === 1 && typeof console !== 'undefined') console.warn('[audio]', err);
  }

  /* ---------------- context + persistent graph ---------------- */

  function noiseBuffer(color, seconds) {
    const rate = ctx.sampleRate, n = Math.max(256, Math.floor(rate * seconds)), fade = Math.floor(Math.min(rate * 0.05, n / 4));
    const raw = new Float32Array(n + fade);
    let b0 = 0, b1 = 0, b2 = 0, br = 0, mean = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = random() * 2 - 1;
      if (color === 'white') raw[i] = w;
      else if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; raw[i] = b0 + b1 + b2 + w * 0.1848; }
      else { br = (br + 0.02 * w) / 1.02; raw[i] = br; }
      mean += raw[i];
    }
    mean /= raw.length;
    const buffer = ctx.createBuffer(1, n, rate), data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = raw[i] - mean;
    // Equal-power crossfade of the tail into the head so the loop has no seam click.
    for (let i = 0; i < fade; i++) { const a = i / fade; data[i] = (raw[i] - mean) * Math.sqrt(a) + (raw[n + i] - mean) * Math.sqrt(1 - a); }
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[i] * data[i];
    const k = 0.25 / Math.sqrt(sum / n || 1);
    for (let i = 0; i < n; i++) data[i] = clamp(data[i] * k, -1, 1);
    return buffer;
  }

  function impulse(seconds) {
    const rate = ctx.sampleRate, n = Math.floor(rate * seconds), pre = Math.floor(rate * 0.012), buffer = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = buffer.getChannelData(c); let lp = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / rate, a = 0.85 - 0.7 * Math.min(1, t / seconds);
        lp += a * ((random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-6.9 * t / seconds);
      }
    }
    return buffer;
  }

  function build() {
    const c = ctx, now = c.currentTime, nodes = [];
    const keep = n => { nodes.push(n); return n; };
    const G = (value, dest) => { const n = keep(c.createGain()); n.gain.value = value; if (dest) n.connect(dest); return n; };
    const F = (type, freq, q, dest) => { const n = keep(c.createBiquadFilter()); n.type = type; n.frequency.value = freq; n.Q.value = q; if (dest) n.connect(dest); return n; };
    const O = (type, freq, dest) => { const n = keep(c.createOscillator()); n.type = type; n.frequency.value = freq; if (dest) n.connect(dest); n.start(now); return n; };
    const P = dest => { const n = keep(c.createStereoPanner ? c.createStereoPanner() : c.createGain()); if (dest) n.connect(dest); return n; };
    const noise = { brown: noiseBuffer('brown', 3.3), pink: noiseBuffer('pink', 2.9), white: noiseBuffer('white', 2.1) };
    const L = (buf, rate, offset) => { const n = keep(c.createBufferSource()); n.buffer = buf; n.loop = true; n.playbackRate.value = rate; n.start(now, offset * buf.duration); return n; };

    // Output chain: master -> gentle compressor -> trim -> soft clipper -> destination.
    const master = G(0);
    const comp = keep(c.createDynamicsCompressor());
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.2;
    const trim = G(0.9);
    const clip = keep(c.createWaveShaper()); clip.curve = softClipCurve(); clip.oversample = '2x';
    master.connect(comp); comp.connect(trim); trim.connect(clip); clip.connect(c.destination);

    const bed = G(1, master), windBus = G(1, bed), ambBus = G(1, bed);
    const varioBus = G(0.09, master), sfxBus = G(0.9, master), uiBus = G(0.75, master);
    const revIn = G(1), conv = keep(c.createConvolver()); conv.normalize = true;
    const revOut = G(0.32, master); revIn.connect(conv); conv.connect(revOut);
    // The impulse response and its FFT setup cost ~20-30 ms of main thread: keep them off the unlock
    // (launch) frame. Until then the reverb send is silent.
    const loadReverb = () => { try { if (ctx === c && !conv.buffer) conv.buffer = impulse(1.4); } catch (err) { noteError(err); } };
    if (typeof host.requestIdleCallback === 'function') host.requestIdleCallback(loadReverb, { timeout: 1500 });
    else if (typeof setTimeout === 'function') setTimeout(loadReverb, 200);
    else loadReverb();

    const brownA = L(noise.brown, 1, 0), brownB = L(noise.brown, 0.97, 0.43), pinkA = L(noise.pink, 1, 0.1);
    const pinkB = L(noise.pink, 1.03, 0.61), pinkC = L(noise.pink, 0.94, 0.33), whiteA = L(noise.white, 1, 0.2);

    // Wind: body (low roar), hiss (bright air, panned with bank), rumble (skim / dive / ground rush).
    const windBody = G(0, windBus), windBodyF = F('lowpass', 300, 0.5, windBody); brownA.connect(windBodyF);
    const windPan = P(windBus), windHiss = G(0, windPan), windHissF = F('bandpass', 1000, 0.6, windHiss); pinkA.connect(windHissF);
    const rumble = G(0, windBus), rumbleF = F('lowpass', 150, 0.8, rumble); brownB.connect(rumbleF);

    // Vario: one oscillator with a soft harmonic recipe, gated by a scheduled envelope.
    const varioLevel = G(0, varioBus), beepEnv = G(0, varioLevel);
    const varioOsc = keep(c.createOscillator());
    if (c.createPeriodicWave) varioOsc.setPeriodicWave(c.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, 0.22, 0.07]), { disableNormalization: false }));
    else varioOsc.type = 'sine';
    varioOsc.frequency.value = VARIO.minFreq; varioOsc.connect(beepEnv); varioOsc.start(now);
    const sinkGain = G(0, varioBus), sinkAM = G(0.7, sinkGain), sinkF = F('lowpass', 600, 0.5, sinkAM), sinkOsc = O('triangle', 220, sinkF);
    const sinkLfo = O('sine', 0.8), sinkDepth = G(0.3, sinkAM.gain); sinkLfo.connect(sinkDepth);

    // Ambience beds.
    const alpine = G(0, ambBus), alpineF = F('bandpass', 1700, 0.8, alpine); pinkB.connect(alpineF);
    const desert = G(0, ambBus), desertLP = F('lowpass', 9000, 0.5, desert), desertF = F('highpass', 3800, 0.6, desertLP); whiteA.connect(desertF);
    const cicada = G(0, ambBus), cicAM = G(0.5, cicada), cicF = F('bandpass', 5200, 4, cicAM); whiteA.connect(cicF);
    const cicOsc = O('triangle', 136, G(0.5, cicAM.gain));
    const cicada2 = G(0, ambBus), cicAM2 = G(0.5, cicada2), cicF2 = F('bandpass', 6400, 5, cicAM2); whiteA.connect(cicF2);
    const cicOsc2 = O('triangle', 171, G(0.5, cicAM2.gain));
    const surfLow = G(0, ambBus), surfLowF = F('lowpass', 520, 0.5, surfLow); brownB.connect(surfLowF);
    const surfWash = G(0, ambBus), surfWashF = F('bandpass', 1800, 0.6, surfWash); pinkC.connect(surfWashF);

    // Cable car: motor hum and wheel rumble.
    const hum = G(0, bed), humF = F('lowpass', 320, 0.7, hum);
    const humOsc1 = O('sawtooth', 48, humF), humOsc2 = O('triangle', 96.5, humF);
    const cableRumble = G(0, bed), cableF = F('bandpass', 110, 1, cableRumble); brownB.connect(cableF);

    persistentCount = nodes.length;
    g = { nodes, noise, master, bed, windBus, ambBus, varioBus, sfxBus, uiBus, revIn, conv,
      windBody, windBodyF, windPan, windHiss, windHissF, rumble,
      varioLevel, beepEnv, varioOsc, sinkGain, sinkOsc, alpine, alpineF, desert, cicada, cicada2,
      surfLow, surfWash, surfWashF, hum, cableRumble, cicOsc, cicOsc2, humOsc1, humOsc2 };
  }

  function resumeQuietly() {
    try { const p = ctx.resume?.(); p?.catch?.(() => {}); } catch { /* not resumable yet */ }
  }

  function applyMaster(tc) {
    if (!ctx || !g) return;
    const audible = on && !hidden;
    if (!audible) valley.stop();
    try { g.master.gain.setTargetAtTime(audible ? MASTER_LEVEL : 0, ctx.currentTime, tc); } catch (err) { noteError(err); }
    if (suspendTimer) { clearTimeout(suspendTimer); suspendTimer = null; }
    if (audible) { if (ctx.state !== 'running' && ctx.state !== 'closed') resumeQuietly(); }
    else if (typeof setTimeout === 'function') {
      // Fade out, then suspend so a muted or hidden game costs no audio CPU.
      suspendTimer = setTimeout(() => {
        suspendTimer = null;
        if (ctx && !(on && !hidden) && ctx.state === 'running') { try { ctx.suspend?.()?.catch?.(() => {}); } catch { /* ignore */ } }
      }, 450);
    }
  }

  /**
   * Recorded sounds, decoded once the context exists: the crash (a heavy body fall and thud, a bike frame crashing, a tube
   * snapping and bones breaking; see assets/sfx/CREDITS.md). Until one has loaded, or where fetching is not possible (tests,
   * file://), its recipe falls back to a synthesized one.
   */
  const SAMPLE_FILES = { crash: 'assets/sfx/crash.mp3' };
  const samples = {};
  function loadSamples() {
    const base = options.sampleBase ?? (typeof import.meta !== 'undefined' && import.meta.url ? new URL('./', import.meta.url).href : null);
    if (!base || typeof fetch !== 'function' || typeof ctx.decodeAudioData !== 'function') return;
    for (const [name, file] of Object.entries(SAMPLE_FILES)) {
      if (samples[name]) continue;
      fetch(new URL(file, base)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file + ' ' + r.status))))
        .then(data => ctx.decodeAudioData(data)).then(buffer => { samples[name] = buffer; }).catch(noteError);
    }
  }
  /** Plays a decoded recording as part of a voice: gain, playback rate (a little pitch and speed variation), an optional low-pass. */
  function sample(v, buffer, t, { gain = 1, rate = 1, lowpass = 0 } = {}) {
    const e = vg(v, gain, v.out), dest = lowpass ? vf(v, 'lowpass', lowpass, 0.7, e) : e;
    const s = add(v, ctx.createBufferSource()); s.buffer = buffer; s.playbackRate.value = rate; s.connect(dest);
    s.start(t); v.sources.push(s); v.end = Math.max(v.end, t + buffer.duration / rate + 0.05);
  }

  function unlock() {
    if (ctx && ctx.state === 'closed') { valley.stop(); ctx = null; g = null; }
    if (!ctx) {
      if (failures >= 3) return;
      try {
        ctx = makeContext();
        if (!ctx) { failures = 3; return; }
        build();
        lastParamAt = -1;
        loadSamples();
      } catch (err) {
        failures++; noteError(err);
        try { ctx?.close?.(); } catch { /* ignore */ }
        ctx = null; g = null; return;
      }
    }
    applyMaster(0.06);
  }

  if (doc?.addEventListener) {
    doc.addEventListener('visibilitychange', () => { hidden = !!doc.hidden; if (ctx) applyMaster(hidden ? 0.03 : 0.12); });
  }

  /** Smoothly moves a param toward value, skipping redundant automation events. */
  function setp(param, value, now, tc) {
    if (!param || !Number.isFinite(value)) return;
    const prev = targets.get(param);
    if (prev !== undefined && Math.abs(value - prev) <= 1e-5 + Math.abs(prev) * 0.004) return;
    targets.set(param, value);
    param.setTargetAtTime(value, now, tc);
  }

  /* ---------------- one-shot voices ---------------- */

  function kill(v) {
    for (const s of v.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of v.nodes) { try { n.disconnect(); } catch { /* already disconnected */ } }
    voiceNodes -= v.nodes.length; v.nodes.length = 0; v.sources.length = 0;
  }
  function retire(v, now) {
    try { v.out.gain.setTargetAtTime(0, now, 0.008); } catch { /* ignore */ }
    for (const s of v.sources) { try { s.stop(now + 0.06); } catch { /* ignore */ } }
    v.end = now + 0.06;
    dying.push(v);
    while (dying.length > MAX_DYING) kill(dying.shift());
  }
  function sweep(now) {
    for (const list of [voices, dying]) {
      let w = 0;
      for (let i = 0; i < list.length; i++) { const v = list[i]; if (v.end + 0.08 < now || now + 1 < v.start) kill(v); else list[w++] = v; }
      list.length = w;
    }
  }
  function voice(key, bus, maxSame) {
    const now = ctx.currentTime;
    sweep(now);
    let same = 0, oldest = -1;
    for (let i = 0; i < voices.length; i++) if (voices[i].key === key) { if (oldest < 0) oldest = i; same++; }
    if (same >= maxSame) retire(voices.splice(oldest, 1)[0], now);
    else if (voices.length >= MAX_VOICES) retire(voices.shift(), now);
    const out = ctx.createGain();
    out.connect(bus);
    const v = { key, out, nodes: [out], sources: [], start: now, end: now + 0.05 };
    voiceNodes++;
    voices.push(v);
    counts[key] = (counts[key] || 0) + 1;
    return v;
  }
  const add = (v, n) => { v.nodes.push(n); voiceNodes++; return n; };
  const vg = (v, value, dest) => { const n = add(v, ctx.createGain()); n.gain.value = value; if (dest) n.connect(dest); return n; };
  const vf = (v, type, freq, q, dest) => { const n = add(v, ctx.createBiquadFilter()); n.type = type; n.frequency.value = freq; n.Q.value = q; if (dest) n.connect(dest); return n; };
  const vp = (v, pan, dest) => {
    if (!ctx.createStereoPanner) return vg(v, 1, dest);
    const n = add(v, ctx.createStereoPanner()); n.pan.value = clamp(pan, -1, 1); if (dest) n.connect(dest); return n;
  };
  function vo(v, type, freq, t, dur, dest) {
    const o = add(v, ctx.createOscillator()); o.type = type; o.frequency.value = freq;
    o.start(t); o.stop(t + dur); v.sources.push(o); v.end = Math.max(v.end, t + dur);
    if (dest) o.connect(dest);
    return o;
  }
  function vn(v, color, t, dur, dest, rate = 1) {
    const s = add(v, ctx.createBufferSource()), buf = g.noise[color];
    s.buffer = buf; s.loop = true; s.playbackRate.value = rate;
    s.start(t, random() * buf.duration * 0.95); s.stop(t + dur); v.sources.push(s); v.end = Math.max(v.end, t + dur);
    if (dest) s.connect(dest);
    return s;
  }
  const send = (v, node, amount) => node.connect(vg(v, amount, g.revIn));

  /* ---------------- sound recipes ---------------- */

  /** Noise through one filter with a percussive envelope. */
  function noiseHit(v, color, type, freq, q, t, peak, attack, decay, dest = v.out) {
    const e = vg(v, 0, dest), f = vf(v, type, freq, q, e);
    vn(v, color, t, attack + decay + 0.04, f);
    perc(e.gain, t, peak, attack, decay);
    return f;
  }
  /** Pitched body thump: a sine dropping in pitch. */
  function thump(v, t, peak, f0, f1, dur, dest = v.out) {
    const e = vg(v, 0, dest), o = vo(v, 'sine', f0, t, dur + 0.05, e);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    perc(e.gain, t, peak, 0.004, dur);
  }
  /** Struck metal: inharmonic partials with faster-decaying overtones. */
  function tink(v, t, f, peak, decay, ratios = [1, 2.76, 5.4], dest = v.out) {
    const weights = [1, 0.55, 0.3, 0.18];
    for (let i = 0; i < ratios.length; i++) {
      const d = decay / (1 + 0.9 * i), e = vg(v, 0, dest);
      vo(v, 'sine', f * ratios[i], t, d + 0.05, e);
      perc(e.gain, t, peak * weights[i], 0.0015, d);
    }
  }
  /** Warm soft bell: harmonic partials plus a slightly detuned twin for gentle beating. */
  function bell(v, t, f, peak, decay, dest) {
    const parts = [[1, 1, 1], [1.0025, 0.4, 1], [2, 0.22, 0.45], [3.01, 0.07, 0.25]];
    for (const [r, a, k] of parts) {
      const e = vg(v, 0, dest);
      vo(v, 'sine', f * r, t, decay * k + 0.05, e);
      perc(e.gain, t, peak * a, 0.006, decay * k);
    }
  }
  function blip(v, t, f, peak, decay, type = 'sine', tri = 0, dest = v.out) {
    const e = vg(v, 0, dest);
    vo(v, type, f, t, decay + 0.03, e);
    if (tri > 0) vo(v, 'triangle', f, t, decay + 0.03, vg(v, tri, e));
    perc(e.gain, t, peak, 0.003, decay);
  }
  function chirp(v, t, f0, f1, dur, peak, dest = v.out) {
    const e = vg(v, 0, dest), o = vo(v, 'sine', f0, t, dur + 0.03, e);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    perc(e.gain, t, peak, 0.004, dur);
  }
  /** Sequential noise grains through one filter (gravel crunch, rustle, crackle). */
  function grains(v, color, type, freq, q, t, peaks, dest = v.out, attack = 0.003, decay = 0.022, gap = 0.01) {
    const e = vg(v, 0, dest), f = vf(v, type, freq, q, e);
    let tt = t;
    for (const p of peaks) tt = grain(e.gain, tt, p, attack * (0.7 + 0.6 * random()), decay * (0.7 + 0.6 * random())) + gap * (0.5 + random());
    vn(v, color, t, tt - t + 0.03, f);
    return tt;
  }
  /** Torn fabric / tape: noise chopped by a square-wave ratchet, then band-limited so the chops are not harsh. */
  function rip(v, t, dur, peak, f0, f1, am0, am1, dest = v.out) {
    const e = vg(v, 0, dest), f = vf(v, 'bandpass', f0, 1.3, e), am = vg(v, 0.5, f), hp = vf(v, 'highpass', 900, 0.7, am);
    vn(v, 'white', t, dur + 0.05, hp);
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lfo = vo(v, 'square', am0, t, dur + 0.05, vg(v, 0.48, am.gain));
    lfo.frequency.setValueAtTime(am0, t); lfo.frequency.exponentialRampToValueAtTime(am1, t + dur);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(peak, t + 0.02);
    e.gain.linearRampToValueAtTime(peak * 0.8, t + dur - 0.05); e.gain.linearRampToValueAtTime(0, t + dur);
  }
  function zip(v, t, dur, peak, r0, r1, dest = v.out) {
    const e = vg(v, 0, dest), f = vf(v, 'bandpass', 3300, 2.2, e), am = vg(v, 0.5, f);
    vn(v, 'white', t, dur + 0.05, am);
    const lfo = vo(v, 'square', r0, t, dur + 0.05, vg(v, 0.5, am.gain));
    lfo.frequency.setValueAtTime(r0, t); lfo.frequency.exponentialRampToValueAtTime(r1, t + dur);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(peak, t + 0.03);
    e.gain.setValueAtTime(peak, t + dur - 0.05); e.gain.linearRampToValueAtTime(0, t + dur);
  }
  function rustle(v, t, freq, peaks, dest = v.out) {
    return grains(v, 'pink', 'bandpass', freq, 0.9, t, peaks.map(p => p * 3), dest, 0.012, 0.045, 0.02);
  }
  function sweepNoise(v, color, t, f0, f1, f2, q, peak, attack, hold, release, dest = v.out) {
    const e = vg(v, 0, dest), f = vf(v, 'bandpass', f0, q, e);
    const end = swell(e.gain, t, peak, attack, hold, release);
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + attack + hold * 0.5);
    f.frequency.exponentialRampToValueAtTime(f2, end);
    vn(v, color, t, end - t + 0.03, f);
  }
  function creak(v, t, dur, peak) {
    const e = vg(v, 0, v.out), f1 = vf(v, 'bandpass', 950, 6, e), f2 = vf(v, 'bandpass', 1900, 8, vg(v, 0.4, e));
    const o = vo(v, 'sawtooth', 24, t, dur + 0.05, f1); o.connect(f2);
    o.frequency.setValueAtTime(23, t); o.frequency.linearRampToValueAtTime(33, t + dur * 0.45); o.frequency.linearRampToValueAtTime(21, t + dur);
    swell(e.gain, t, peak, 0.07, dur * 0.4, dur * 0.45);
  }
  function step(v, t, surface, k, dest) {
    const p = 0.92 + 0.16 * random();
    switch (surface) {
      case 'sand': noiseHit(v, 'pink', 'lowpass', 1250 * p, 0.6, t, 0.09 * k, 0.014, 0.09, dest); thump(v, t, 0.05 * k, 85, 60, 0.05, dest); break;
      case 'grass': noiseHit(v, 'pink', 'bandpass', 2100 * p, 0.6, t, 0.1 * k, 0.016, 0.08, dest); thump(v, t, 0.045 * k, 90, 62, 0.05, dest); break;
      case 'rock': grains(v, 'white', 'bandpass', 1500 * p, 1.2, t, [0.12 * k, 0.06 * k], dest, 0.002, 0.02, 0.008); thump(v, t, 0.08 * k, 110, 70, 0.05, dest); break;
      case 'snow': grains(v, 'white', 'bandpass', 1700 * p, 0.7, t, [0.06 * k, 0.075 * k, 0.05 * k, 0.03 * k], dest, 0.004, 0.02, 0.006); thump(v, t, 0.04 * k, 80, 58, 0.05, dest); break;
      default: grains(v, 'white', 'bandpass', 3000 * p, 0.9, t, [0.1 * k, 0.07 * k, 0.045 * k], dest, 0.002, 0.022, 0.008); thump(v, t, 0.07 * k, 90, 60, 0.045, dest);
    }
  }
  function pickSurface() {
    const b = S.biome, total = b.alpine + b.desert + b.tropical + b.archipelago;
    let r = random() * (total || 1);
    for (const key of ['alpine', 'desert', 'tropical', 'archipelago']) {
      r -= b[key];
      if (r <= 0) return key === 'alpine' && S.altitude > 2700 ? 'snow' : SURFACE_OF[key];
    }
    return 'gravel';
  }
  function duck(level, seconds) {
    const now = ctx.currentTime;
    duckLevel = now < duckUntil ? Math.min(duckLevel, level) : level;
    duckUntil = Math.max(duckUntil, now + seconds);
    lastParamAt = -1;
  }
  function splash(v, t, sev) {
    noiseHit(v, 'white', 'lowpass', 2600, 0.7, t, 0.22 + 0.4 * sev, 0.002, 0.09);
    sweepNoise(v, 'pink', t, 1700, 1100, 380, 0.8, 0.24 + 0.42 * sev, 0.03, 0.06, 1.1);
    thump(v, t, 0.2 + 0.18 * sev, 115, 48, 0.3);
    const bubbles = 4 + Math.round(5 * sev);
    for (let i = 0; i < bubbles; i++) { const f = 260 + random() * 450; chirp(v, t + 0.15 + random() * 0.8, f, f * 2.4, 0.05, 0.03 + random() * 0.025); }
    for (let i = 0; i < 6; i++) { const f = 1400 + random() * 2200; chirp(v, t + 0.35 + random() * 1.2, f, f * 1.3, 0.03, 0.02); }
  }

  /** Event table: bus, minimum gap between repeats (s), max concurrent of this kind, recipe. */
  const SFX = {
    launch: { bus: 'sfxBus', gap: 0.5, max: 1, fn(v, t) {
      sweepNoise(v, 'pink', t, 350, 2300, 700, 1.1, 0.34, 0.32, 0.05, 1.0);
      const e = vg(v, 0, v.out), f = vf(v, 'lowpass', 320, 0.7, e); vn(v, 'brown', t, 1.2, f); swell(e.gain, t, 0.32, 0.22, 0, 0.9);
      noiseHit(v, 'white', 'bandpass', 1500, 1.4, t + 0.06, 0.24, 0.002, 0.06);
      noiseHit(v, 'white', 'bandpass', 1200, 1.4, t + 0.15, 0.14, 0.002, 0.07);
    } },
    touchdown: { bus: 'sfxBus', gap: 0.4, max: 1, fn(v, t, d) {
      const speed = num(d.speed, 12), soft = d.soft === undefined ? speed < 16 : !!d.soft, sp = clamp(speed / 18, 0.3, 1.25), firm = soft ? 0 : 1;
      const surface = pickSurface();
      thump(v, t, 0.17 + 0.08 * sp + 0.2 * firm, 78, 42, 0.2 + 0.08 * firm);
      noiseHit(v, 'brown', 'lowpass', 260, 0.7, t, 0.11 + 0.17 * firm, 0.004, 0.16);
      const scrapeF = surface === 'sand' ? 1300 : surface === 'grass' ? 1900 : 2600;
      const se = vg(v, 0, v.out), sf = vf(v, surface === 'sand' ? 'lowpass' : 'bandpass', scrapeF, 0.8, se), dur = 0.22 + 0.3 * sp + 0.2 * firm;
      vn(v, surface === 'sand' || surface === 'grass' ? 'pink' : 'white', t + 0.035, dur + 0.05, sf);
      swell(se.gain, t + 0.035, 0.07 + 0.05 * sp + 0.06 * firm, 0.03, dur * 0.3, dur * 0.7);
      if (firm) { noiseHit(v, 'white', 'bandpass', 2300, 3.5, t + 0.01, 0.12, 0.002, 0.04); tink(v, t + 0.02, 1150, 0.04, 0.22); }
      else { step(v, t + 0.34, surface, 0.8, v.out); step(v, t + 0.6, surface, 0.6, v.out); }
    } },
    crash: { bus: 'sfxBus', gap: 0.3, max: 2, fn(v, t, d) {
      const sev = clamp(num(d.severity, 0.6), 0, 1);
      duck(0.25, 1.1);
      if (d.kind === 'water') { splash(v, t, sev); return; }
      if (samples.crash) {
        // The recorded crash (body and thud, frame, a tube snapping, bones breaking): a lighter one quieter and duller, and
        // each a little different in pitch and speed so repeats do not sound the same.
        sample(v, samples.crash, t, { gain: 0.55 + 0.45 * sev, rate: 0.94 + 0.12 * random(), lowpass: sev < 0.7 ? 2500 + 14000 * sev : 0 });
      } else {
        // Until the recording has loaded: a plain heavy thud and a burst of dirt.
        thump(v, t, 0.34 + 0.4 * sev, 72, 27, 0.6);
        noiseHit(v, 'brown', 'lowpass', 260, 0.7, t, 0.2 + 0.26 * sev, 0.003, 0.34);
      }
      if (d.kind === 'building') { noiseHit(v, 'pink', 'bandpass', 320, 3, t + 0.005, 0.3, 0.003, 0.12); noiseHit(v, 'pink', 'bandpass', 280, 3, t + 0.11, 0.18, 0.003, 0.14); }
    } },
    discover: { bus: 'sfxBus', gap: 0.6, max: 1, fn(v, t) {
      duck(0.7, 1.6);
      const lp = vf(v, 'lowpass', 3600, 0.5, v.out); send(v, lp, 0.42);
      [440, 659.25, 987.77].forEach((f, i) => bell(v, t + i * 0.14, f, 0.1 - i * 0.009, 1.9 + i * 0.3, lp));
      sweepNoise(v, 'pink', t, 2200, 2800, 2400, 0.6, 0.03, 0.5, 0.2, 1.4, lp);
    } },
    take: { bus: 'sfxBus', gap: 0.06, max: 2, fn(v, t) {
      const p = vp(v, 0.15, v.out);
      rustle(v, t, 2600, [0.18, 0.14, 0.1], p);
      thump(v, t + 0.17, 0.14, 150, 95, 0.07, p);
    } },
    store: { bus: 'sfxBus', gap: 0.06, max: 2, fn(v, t) {
      const p = vp(v, -0.15, v.out);
      rustle(v, t, 1700, [0.11, 0.08], p);
      thump(v, t + 0.15, 0.12, 115, 70, 0.09, p);
      noiseHit(v, 'brown', 'lowpass', 500, 0.7, t + 0.15, 0.1, 0.003, 0.08, p);
    } },
    fit: { bus: 'sfxBus', gap: 0.15, max: 2, fn(v, t) {
      tink(v, t, 1650, 0.08, 0.32, [1, 2.32, 4.25]);
      tink(v, t + 0.085, 2150, 0.04, 0.2, [1, 2.32, 4.25]);
      noiseHit(v, 'white', 'bandpass', 4200, 3, t + 0.24, 0.5, 0.001, 0.01);
      for (let i = 0; i < 4; i++) noiseHit(v, 'white', 'bandpass', 3600, 3, t + 0.31 + i * 0.045, 0.3 - i * 0.035, 0.001, 0.008);
      noiseHit(v, 'white', 'bandpass', 3000, 3, t + 0.52, 0.45, 0.001, 0.012);
      thump(v, t + 0.52, 0.06, 220, 160, 0.04);
    } },
    patch: { bus: 'sfxBus', gap: 0.3, max: 1, fn(v, t) {
      rip(v, t, 0.38, 0.9, 2300, 3400, 70, 150);
      noiseHit(v, 'brown', 'lowpass', 700, 0.7, t + 0.39, 0.1, 0.002, 0.05);
      rip(v, t + 0.52, 0.3, 0.75, 2400, 3500, 80, 160);
      noiseHit(v, 'brown', 'lowpass', 700, 0.7, t + 0.83, 0.09, 0.002, 0.05);
      creak(v, t + 1.0, 0.42, 0.8);
    } },
    deny: { bus: 'sfxBus', gap: 0.12, max: 2, fn(v, t) {
      thump(v, t, 0.09, 150, 95, 0.13);
      noiseHit(v, 'brown', 'lowpass', 420, 0.7, t, 0.05, 0.003, 0.06);
      thump(v, t + 0.1, 0.045, 120, 80, 0.12);
    } },
    select: { bus: 'uiBus', gap: 0.035, max: 3, fn(v, t) { blip(v, t, 2350, 0.05, 0.02, 'triangle'); blip(v, t, 1175, 0.03, 0.03); } },
    'ui-move': { bus: 'uiBus', gap: 0.03, max: 3, fn(v, t) { blip(v, t, 1800 * (0.985 + 0.03 * random()), 0.045, 0.018); } },
    'ui-confirm': { bus: 'uiBus', gap: 0.06, max: 2, fn(v, t) { blip(v, t, 784, 0.06, 0.1, 'sine', 0.3); blip(v, t + 0.065, 1174.7, 0.06, 0.14, 'sine', 0.3); } },
    'ui-back': { bus: 'uiBus', gap: 0.06, max: 2, fn(v, t) { blip(v, t, 880, 0.05, 0.08, 'sine', 0.3); blip(v, t + 0.06, 659.25, 0.05, 0.12, 'sine', 0.3); } },
    pack: { bus: 'sfxBus', gap: 0.3, max: 1, fn(v, t) {
      rustle(v, t, 2000, [0.1, 0.08, 0.09, 0.06]);
      zip(v, t + 0.32, 0.45, 0.6, 45, 130);
      thump(v, t + 0.85, 0.09, 120, 80, 0.08);
    } },
    unpack: { bus: 'sfxBus', gap: 0.3, max: 1, fn(v, t) {
      zip(v, t, 0.4, 0.7, 130, 50);
      rustle(v, t + 0.4, 1900, [0.13, 0.1, 0.11]);
      sweepNoise(v, 'pink', t + 0.72, 500, 750, 450, 0.7, 0.35, 0.12, 0.02, 0.3);
    } },
    'cable-start': { bus: 'sfxBus', gap: 0.4, max: 1, fn(v, t) {
      thump(v, t, 0.18, 64, 40, 0.26);
      noiseHit(v, 'brown', 'lowpass', 360, 0.7, t, 0.13, 0.004, 0.18);
      tink(v, t + 0.02, 310, 0.065, 0.6);
      tink(v, t + 0.19, 415, 0.035, 0.45);
      const e = vg(v, 0, v.out), f = vf(v, 'lowpass', 260, 0.7, e), o = vo(v, 'sawtooth', 30, t + 0.1, 1.25, f);
      o.frequency.setValueAtTime(30, t + 0.1); o.frequency.exponentialRampToValueAtTime(48, t + 0.9);
      swell(e.gain, t + 0.1, 0.06, 0.5, 0.1, 0.5);
    } },
    'cable-end': { bus: 'sfxBus', gap: 0.4, max: 1, fn(v, t) {
      thump(v, t, 0.17, 60, 38, 0.24);
      noiseHit(v, 'brown', 'lowpass', 360, 0.7, t, 0.12, 0.004, 0.16);
      tink(v, t + 0.05, 290, 0.065, 0.55);
      noiseHit(v, 'white', 'highpass', 2600, 0.7, t + 0.02, 0.06, 0.02, 0.5);
    } },
    region: { bus: 'sfxBus', gap: 2, max: 1, fn(v, t, d) {
      duck(0.75, 2.2);
      const root = REGION_ROOT[d.biome] || REGION_ROOT.alpine;
      const lp = vf(v, 'lowpass', 700, 0.6, v.out), e = vg(v, 0, lp); send(v, lp, 0.5);
      const end = swell(e.gain, t, 0.08, 1.1, 0.4, 2.4);
      for (const [r, a] of [[1, 1], [1.4983, 0.6], [2, 0.3]]) for (const det of [-0.0018, 0.0018]) vo(v, 'sine', root * r * (1 + det), t, end - t + 0.05, vg(v, a * 0.5, e));
    } },
    tip: { bus: 'uiBus', gap: 0.5, max: 1, fn(v, t) { const lp = vf(v, 'lowpass', 4000, 0.5, v.out); send(v, lp, 0.35); bell(v, t, 1318.5, 0.05, 0.7, lp); } },
    'thermal-enter': { bus: 'sfxBus', gap: 2.5, max: 1, fn(v, t) { chirp(v, t, 950, 1350, 0.045, 0.05); chirp(v, t + 0.075, 1050, 1500, 0.045, 0.05); } },
    'skim-start': { bus: 'sfxBus', gap: 0.8, max: 1, fn(v, t) {
      sweepNoise(v, 'pink', t, 500, 2600, 1400, 0.9, 0.2, 0.28, 0.1, 0.9);
      const e = vg(v, 0, v.out), f = vf(v, 'lowpass', 200, 0.8, e); vn(v, 'brown', t, 1.3, f); swell(e.gain, t, 0.2, 0.25, 0.1, 0.8);
    } },
    'skim-end': { bus: 'sfxBus', gap: 0.8, max: 1, fn(v, t) { sweepNoise(v, 'pink', t, 2400, 1500, 700, 0.9, 0.1, 0.06, 0.02, 0.6); } },
    // Terrain warning: a bright double beep, repeated while the warning lasts.
    'pull-up': { bus: 'sfxBus', gap: 0.85, max: 1, fn(v, t) { blip(v, t, 1480, 0.11, 0.075, 'triangle'); blip(v, t + 0.14, 1480, 0.11, 0.075, 'triangle'); } },
    // The stall is heard in the wind itself (it drops and goes hollow, see params); the event stays for anything that listens.
    stall: { bus: 'sfxBus', gap: 1.2, max: 1, fn() {} },
  };

  function play(name, data) {
    const def = Object.prototype.hasOwnProperty.call(SFX, name) ? SFX[name] : null;
    if (!def) return false;
    const now = ctx.currentTime, last = lastPlayed.get(name);
    if (last !== undefined && now >= last && now - last < def.gap) return false;
    lastPlayed.set(name, now);
    const v = voice(name, g[def.bus], def.max);
    def.fn(v, now + 0.005, data && typeof data === 'object' ? data : EMPTY);
    return true;
  }

  /* ---------------- ambient one-shots ---------------- */

  function birdCall(t, k) {
    const v = voice('bird', g.ambBus, 2), p = vp(v, (random() * 2 - 1) * 0.75, v.out), lp = vf(v, 'lowpass', 5200, 0.5, p);
    send(v, lp, 0.45);
    let tt = t;
    if (random() < 0.5) { // pipit-like thin "tsee" series
      const n = 2 + Math.floor(random() * 3), f = 3600 + random() * 900;
      for (let i = 0; i < n; i++) {
        const e = vg(v, 0, lp), o = vo(v, 'sine', f, tt, 0.1, e);
        o.frequency.setValueAtTime(f * 1.12, tt); o.frequency.exponentialRampToValueAtTime(f * 0.9, tt + 0.07);
        perc(e.gain, tt, 0.035 * k, 0.008, 0.07);
        tt += 0.12 + random() * 0.05;
      }
    } else { // chough-like "chee-ow"
      const n = 1 + Math.floor(random() * 2), f = 2300 + random() * 500;
      for (let i = 0; i < n; i++) {
        const e = vg(v, 0, lp), o = vo(v, 'triangle', f, tt, 0.3, e);
        o.frequency.setValueAtTime(f, tt); o.frequency.linearRampToValueAtTime(f * 1.3, tt + 0.03); o.frequency.exponentialRampToValueAtTime(f * 0.72, tt + 0.22);
        swell(e.gain, tt, 0.038 * k, 0.015, 0.05, 0.2);
        tt += 0.38 + random() * 0.2;
      }
    }
  }
  function gullCall(t, k) {
    const v = voice('gull', g.ambBus, 2), p = vp(v, (random() * 2 - 1) * 0.7, v.out), lp = vf(v, 'lowpass', 3400, 0.6, p);
    send(v, lp, 0.5);
    const calls = 2 + Math.floor(random() * 3), base = 0.9 + random() * 0.25;
    let tt = t;
    for (let i = 0; i < calls; i++) {
      const dur = 0.32 + random() * 0.12, f = 1000 * base * (1 - i * 0.04);
      const e = vg(v, 0, lp), bp = vf(v, 'bandpass', 1500 * base, 1.6, e), o = vo(v, 'sawtooth', f, tt, dur + 0.05, bp);
      o.frequency.setValueAtTime(f * 0.85, tt); o.frequency.linearRampToValueAtTime(f * 1.45, tt + 0.05);
      o.frequency.linearRampToValueAtTime(f * 1.2, tt + dur * 0.45); o.frequency.exponentialRampToValueAtTime(f * 0.78, tt + dur);
      vo(v, 'sine', 30 + random() * 8, tt, dur + 0.05, vg(v, f * 0.03, o.frequency));
      swell(e.gain, tt, 0.035 * k, 0.03, dur * 0.35, dur * 0.6);
      tt += dur + 0.12 + random() * 0.22;
    }
  }
  function insectClicks(t, k) {
    const v = voice('insect', g.ambBus, 2), p = vp(v, (random() * 2 - 1) * 0.8, v.out), e = vg(v, 0, p), bp = vf(v, 'bandpass', 4800 + random() * 1800, 6, e);
    const n = 8 + Math.floor(random() * 16), period = 0.018 + random() * 0.012;
    let tt = t;
    for (let i = 0; i < n; i++) { grain(e.gain, tt, 0.18 * k * (0.6 + 0.4 * Math.sin(Math.PI * i / n)), 0.001, 0.004); tt += period; }
    vn(v, 'white', t, tt - t + 0.03, bp);
  }
  function footstep(t, sprint) {
    const v = voice('step', g.sfxBus, 3);
    stepSide = -stepSide;
    step(v, t, pickSurface(), sprint ? 1 : 0.8, vp(v, 0.1 * stepSide, v.out));
  }

  /* ---------------- per-frame logic ---------------- */

  function edges(s) {
    if (s.paused) return;
    const gliding = s.mode === 'gliding';
    if (gliding && s.stalled && !prevStalled) play('stall', EMPTY);
    if (gliding && s.pullUp) play('pull-up', EMPTY);
    prevStalled = gliding && s.stalled;
    if (gliding && !skimOn && s.skim > 0.55) { skimOn = true; play('skim-start', EMPTY); }
    else if (gliding && skimOn && s.skim < 0.25) { skimOn = false; play('skim-end', EMPTY); }
    else if (!gliding) skimOn = false;
  }

  function vario(s, now) {
    const tone = varioTone(varioClimb);
    if (s.mode !== 'gliding' || s.paused || s.skim >= 0.5 || !tone.active) { beepActive = false; return; }
    if (!beepActive) { nextBeep = Math.max(now + 0.015, beepEnd + 0.02); beepActive = true; }
    if (nextBeep < now - 0.25) nextBeep = now + 0.01;
    const env = g.beepEnv.gain, freq = g.varioOsc.frequency;
    while (nextBeep < now + LOOKAHEAD) {
      const t0 = Math.max(nextBeep, now + 0.004), period = 1 / tone.rate, len = clamp(period * tone.duty, 0.045, 0.34);
      env.setValueAtTime(0, t0); env.linearRampToValueAtTime(1, t0 + 0.006);
      env.setValueAtTime(1, t0 + len - 0.012); env.linearRampToValueAtTime(0, t0 + len);
      freq.setValueAtTime(tone.freq, t0); freq.linearRampToValueAtTime(tone.freq * 1.035, t0 + len);
      beepEnd = t0 + len; nextBeep = t0 + period; beepCount++;
    }
  }

  function footsteps(s, now) {
    if (s.mode !== 'foot' || s.paused || !s.walking) { stepNext = 0; return; }
    const interval = s.sprinting ? 0.27 : 0.37;
    if (stepNext === 0 || stepNext < now - 0.2) stepNext = now + 0.01;
    if (stepNext <= now + 0.03) { footstep(Math.max(stepNext, now + 0.002), s.sprinting); stepNext += interval * (0.95 + 0.1 * random()); }
  }

  function ambientCalls(s, now) {
    if (s.paused) return;
    if (!nextBird) { nextBird = now + 4 + random() * 8; nextGull = now + 5 + random() * 8; nextInsect = now + 3 + random() * 8; }
    const b = s.biome, calm = s.mode === 'gliding' ? 1 - ramp(12, 24, s.speed) : 1, ground = ramp(300, 30, s.clearance);
    if (now >= nextBird) {
      const k = b.alpine * calm * ground;
      if (!s.environment && b.alpine > 0.25 && k > 0.2) birdCall(now + 0.01, 0.6 + 0.4 * k);
      nextBird = now + 6 + random() * 14;
    }
    if (now >= nextGull) {
      const k = Math.max(b.archipelago, s.nearSea * 0.8) * calm * ramp(900, 150, s.altitude);
      if (k > 0.2) gullCall(now + 0.01, 0.6 + 0.4 * k);
      nextGull = now + 7 + random() * 15;
    }
    if (now >= nextInsect) {
      const k = b.desert * calm * ground;
      if (b.desert > 0.3 && k > 0.25) insectClicks(now + 0.01, 0.6 + 0.4 * k);
      nextInsect = now + 4 + random() * 10;
    }
  }

  function params(s, now, dtp) {
    const gliding = s.mode === 'gliding', cable = s.mode === 'cablecar';
    const gust = gustAt(now, 0), gust2 = gustAt(now, 17.3), gust3 = gustAt(now, 41.9);
    setp(g.bed.gain, s.paused ? 0.05 : 1, now, s.paused ? 0.18 : 0.35);
    if (now >= duckUntil) duckLevel = 1;
    const ducked = now < duckUntil ? duckLevel : 1;
    setp(g.windBus.gain, ducked, now, ducked < 1 ? 0.04 : 0.5);

    // Wind by airspeed, with gusts, extra roar while skimming, diving or rushing the ground.
    const n = clamp((s.speed - 9) / 35, 0, 1), skimAmt = gliding ? ramp(0.3, 0.85, s.skim) : 0;
    const dive = gliding ? ramp(-5, -14, s.verticalSpeed) * ramp(22, 34, s.speed) : 0;
    const rush = gliding ? ramp(45, 6, s.clearance) * ramp(20, 34, s.speed) : 0;
    let body, bodyF, hiss, hissF, rumble = 0;
    if (gliding) {
      body = (0.075 + 0.3 * Math.pow(n, 1.4) + 0.08 * skimAmt) * (1 + (gust - 0.5) * 0.36 * (1 - 0.6 * n));
      bodyF = (300 + 1500 * Math.pow(n, 1.2)) * (0.9 + 0.2 * gust);
      hiss = (0.012 + 0.15 * n * n + 0.07 * skimAmt + 0.04 * dive) * (1 + (gust2 - 0.5) * 0.4);
      hissF = 1000 + 3200 * n + 600 * skimAmt;
      rumble = 0.28 * skimAmt + 0.22 * dive + 0.16 * rush;
    } else if (cable) { body = 0.04 * (0.8 + 0.4 * gust); bodyF = 420; hiss = 0.012; hissF = 1400; }
    else { body = 0.032 * (0.6 + 0.8 * gust); bodyF = 300 + 160 * gust; hiss = 0.004 * (0.5 + gust2); hissF = 1200; }
    // Near and in the stall the airflow breaks away from the sail: the wind drops and goes hollow, its roar falling away and the
    // air narrowing to a low, resonant band that wavers with the gusts. No flapping.
    const stallAmt = gliding ? Math.max(s.stalled ? 1 : 0, s.stallWarning ? 0.55 : 0, 0.35 * ramp(12.5, 9.8, s.speed)) : 0;
    let hissQ = 0.6;
    if (stallAmt > 0) {
      body *= 1 - 0.55 * stallAmt; bodyF *= 1 - 0.45 * stallAmt;
      hiss = hiss * (1 - stallAmt) + stallAmt * (0.05 + 0.03 * gust2);
      hissF = hissF * (1 - stallAmt) + stallAmt * (430 + 140 * gust); hissQ = 0.6 + 5 * stallAmt;
    }
    setp(g.windBody.gain, body, now, 0.22); setp(g.windBodyF.frequency, bodyF, now, 0.3);
    setp(g.windHiss.gain, hiss, now, 0.22); setp(g.windHissF.frequency, hissF, now, 0.3); setp(g.windHissF.Q, hissQ, now, 0.3);
    setp(g.rumble.gain, rumble, now, 0.15);
    if (g.windPan.pan) setp(g.windPan.pan, gliding ? clamp(s.bank * 0.35, -0.4, 0.4) : 0, now, 0.3);

    // Vario level and sink drone.
    const varioOk = gliding && !s.paused && varioOn, mute = 1 - ramp(0.15, 0.55, s.skim), sink = sinkTone(varioClimb, s.speed);
    setp(g.varioLevel.gain, varioOk ? mute : 0, now, 0.03);
    setp(g.sinkGain.gain, varioOk ? sink.level * mute * 0.9 : 0, now, 0.15);
    setp(g.sinkOsc.frequency, sink.freq, now, 0.2);

    // Ambience beds by biome, ducked while gliding fast; ground life fades with height.
    const b = s.biome, ground = ramp(260, 25, s.clearance);
    const ambDuck = gliding ? 1 - 0.82 * ramp(12, 30, s.speed) : cable ? 0.7 : 1;
    setp(g.ambBus.gain, ambDuck * ducked, now, ducked < 1 ? 0.05 : 0.6);
    setp(g.alpine.gain, s.environment ? 0 : b.alpine * 0.05 * (0.55 + 0.9 * gust3), now, 0.5);
    setp(g.alpineF.frequency, 1500 + 900 * gust3, now, 0.6);
    setp(g.desert.gain, b.desert * 0.05 * (0.5 + gust2), now, 0.5);
    if (now >= cicNext) { cicTarget = 0.25 + 0.75 * random(); cicNext = now + 3 + random() * 6; }
    cicSwell += (cicTarget - cicSwell) * (1 - Math.exp(-dtp / 1.6));
    const cic = b.tropical * ground * cicSwell;
    setp(g.cicada.gain, cic * 0.12, now, 0.4);
    setp(g.cicada2.gain, cic * 0.08 * (0.4 + 0.6 * gust), now, 0.5);
    const surf = clamp(Math.max(s.nearSea, 0.3 * (b.tropical + b.archipelago)), 0, 1) * ramp(650, 70, s.altitude);
    wavePhase += dtp / wavePeriod;
    if (wavePhase >= 1) { wavePhase -= Math.floor(wavePhase); wavePeriod = 6 + random() * 5; waveSize = 0.6 + random() * 0.4; }
    const crest = wavePhase < 0.14 ? ramp(0, 0.14, wavePhase) : Math.exp(-(wavePhase - 0.14) * 3.4);
    const wp = wavePhase - 0.05, wash = wp < 0 ? 0 : wp < 0.16 ? ramp(0, 0.16, wp) : Math.exp(-(wp - 0.16) * 2.6);
    setp(g.surfLow.gain, surf * (0.3 + 0.7 * crest * waveSize) * 0.2, now, 0.12);
    setp(g.surfWash.gain, surf * (0.08 + 0.92 * wash * waveSize) * 0.09, now, 0.1);
    setp(g.surfWashF.frequency, 1300 + 1500 * wash, now, 0.15);

    // Cable car hum and wheel rumble.
    setp(g.hum.gain, cable ? 0.028 * (0.85 + 0.3 * gust) : 0, now, 0.4);
    setp(g.cableRumble.gain, cable ? 0.06 : 0, now, 0.4);
  }

  function update(state, dt) {
    if (!ctx || !g) return;
    try {
      const now = ctx.currentTime;
      sweep(now);
      if (!on) return;
      const s = readState(state, S), step = clamp(num(dt), 0, 0.25);
      // Place sounds reuse this unlocked context and the same muted/ducked bus.
      // The legacy nonspatial alpine calls remain available without a descriptor.
      if (s.environment && !hidden && !s.paused && ctx.state === 'running') {
        if (valley.start(ctx, g.ambBus, g.noise)) {
          for (const key of ['position', 'forward', 'forest', 'forestSource', 'refuge', 'lake']) valleyState[key] = s.environment[key];
          valleyState.clearance = s.clearance;
          valley.update(valleyState);
        }
      } else valley.stop();
      if (s.mode !== prevMode) { if (s.mode === 'gliding') varioClimb = s.verticalSpeed; prevMode = s.mode; }
      varioClimb += (s.verticalSpeed - varioClimb) * (1 - Math.exp(-step / 0.35));
      edges(s);
      vario(s, now);
      footsteps(s, now);
      ambientCalls(s, now);
      if (lastParamAt < 0 || now < lastParamAt || now - lastParamAt >= PARAM_INTERVAL || s.paused !== lastParamPaused || s.mode !== lastParamMode) {
        params(s, now, lastParamAt < 0 || now < lastParamAt ? 0 : clamp(now - lastParamAt, 0, 0.5));
        lastParamAt = now; lastParamPaused = s.paused; lastParamMode = s.mode;
      }
    } catch (err) { noteError(err); }
  }

  function emit(event, data) {
    if (!ctx || !g || !on) return;
    try { play(String(event), data); } catch (err) { noteError(err); }
  }

  function setEnabled(value) {
    on = !!value;
    writeSoundPreference(storage, on);
    if (ctx) { lastParamAt = -1; applyMaster(on ? 0.08 : 0.05); }
  }

  /** Diagnostics for tests and playtest tooling. */
  function stats() {
    return { state: ctx ? ctx.state : 'none', enabled: on, voices: voices.length, dying: dying.length, persistentNodes: persistentCount,
      voiceNodes, beeps: beepCount, counts: { ...counts }, valley: valley.stats(), errors, lastError: lastError ? String(lastError) : null };
  }

  /** Vario beeps and sink tone on/off (Options); wind and effects are unaffected. */
  function setVario(value) { varioOn = value !== false; }
  return { unlock, setEnabled, setVario, enabled: () => on, update, emit, stats, graph: () => g, events: Object.keys(SFX) };
}
