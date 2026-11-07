// Audio module checks with a strict mocked AudioContext (no real audio).
// The mock throws on the same misuse a browser rejects (non-finite values, zero exponential
// targets, stop before start, double start), so silent NaN leaks show up as audio errors.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.AUDIO_MODULE ? pathToFileURL(process.env.AUDIO_MODULE).href : new URL('../range/audio.js', import.meta.url).href;
const { createAudio, varioTone, sinkTone, readSoundPreference, SOUND_STORAGE_KEY, MAX_VOICES, VARIO } = await import(modulePath);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }

const finite = (v, what) => { if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError(`${what} is not finite: ${v}`); };
class MockParam {
  constructor(ctx, value) { this.ctx = ctx; this._value = value; this.events = 0; this.lastTarget = value; }
  get value() { return this._value; }
  set value(v) { finite(v, 'param value'); this._value = v; this.lastTarget = v; }
  time(t) { finite(t, 'time'); if (t < 0) throw new RangeError('negative time'); }
  setValueAtTime(v, t) { finite(v, 'value'); this.time(t); this.events++; this.lastTarget = v; return this; }
  linearRampToValueAtTime(v, t) { finite(v, 'value'); this.time(t); this.events++; this.lastTarget = v; return this; }
  exponentialRampToValueAtTime(v, t) { finite(v, 'value'); this.time(t); if (Math.abs(v) < 1.4e-45) throw new RangeError('exponential ramp to zero'); this.events++; this.lastTarget = v; return this; }
  setTargetAtTime(v, t, tc) { finite(v, 'value'); this.time(t); finite(tc, 'timeConstant'); if (tc < 0) throw new RangeError('negative time constant'); this.events++; this.lastTarget = v; return this; }
  cancelScheduledValues(t) { this.time(t); return this; }
  cancelAndHoldAtTime(t) { this.time(t); return this; }
}
class MockNode {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.dead = false; ctx.created++; ctx.kinds[kind] = (ctx.kinds[kind] || 0) + 1; }
  connect(dest) {
    if (!(dest instanceof MockNode || dest instanceof MockParam)) throw new TypeError('connect target is not a node or param');
    if (dest.ctx !== this.ctx) throw new Error('cross-context connect');
    return dest;
  }
  disconnect() { if (!this.dead) { this.dead = true; this.ctx.disconnected++; } }
}
class MockSource extends MockNode {
  constructor(ctx, kind) { super(ctx, kind); this.started = false; this.onended = null; }
  start(when = 0, offset = 0) { finite(when, 'start'); finite(offset, 'offset'); if (this.started) throw new Error('InvalidStateError: start twice'); this.started = true; }
  stop(when = 0) { finite(when, 'stop'); if (!this.started) throw new Error('InvalidStateError: stop before start'); }
}
const OSC_TYPES = ['sine', 'square', 'sawtooth', 'triangle'];
class MockContext {
  static instances = 0;
  constructor() {
    MockContext.instances++;
    this.sampleRate = 48000; this.currentTime = 0; this.state = 'running'; this.created = 0; this.disconnected = 0; this.kinds = {};
    this.destination = new MockNode(this, 'destination');
  }
  get live() { return this.created - this.disconnected; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { const n = new MockNode(this, 'gain'); n.gain = new MockParam(this, 1); return n; }
  createBiquadFilter() { const n = new MockNode(this, 'biquad'); n.type = 'lowpass'; n.frequency = new MockParam(this, 350); n.Q = new MockParam(this, 1); n.gain = new MockParam(this, 0); n.detune = new MockParam(this, 0); return n; }
  createStereoPanner() { const n = new MockNode(this, 'panner'); n.pan = new MockParam(this, 0); return n; }
  createDynamicsCompressor() { const n = new MockNode(this, 'compressor'); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new MockParam(this, 0); return n; }
  createWaveShaper() { const n = new MockNode(this, 'shaper'); n.curve = null; n.oversample = 'none'; return n; }
  createConvolver() { const n = new MockNode(this, 'convolver'); n.buffer = null; n.normalize = true; return n; }
  createOscillator() {
    const n = new MockSource(this, 'oscillator'); let type = 'sine';
    Object.defineProperty(n, 'type', { get: () => type, set: v => { if (!OSC_TYPES.includes(v)) throw new Error(`bad oscillator type ${v}`); type = v; } });
    n.frequency = new MockParam(this, 440); n.detune = new MockParam(this, 0); n.setPeriodicWave = () => {}; return n;
  }
  createPeriodicWave() { return {}; }
  createBufferSource() { const n = new MockSource(this, 'buffersource'); n.buffer = null; n.loop = false; n.playbackRate = new MockParam(this, 1); return n; }
  createBuffer(channels, length, sampleRate) {
    finite(length, 'buffer length'); if (length < 1) throw new RangeError('empty buffer');
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: i => data[i] };
  }
}

const memoryStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };
function make(extra = {}) {
  let ctx = null;
  const audio = createAudio({ storage: memoryStorage(), document: null, createContext: () => (ctx = new MockContext()), ...extra });
  return { audio, ctx: () => ctx };
}
const glide = over => ({ mode: 'gliding', paused: false, speed: 16, verticalSpeed: -1.2, lift: 0, thermalLift: 0, ridgeLift: 0, clearance: 300, skim: 0,
  stalled: false, stallWarning: false, bank: 0, walking: false, sprinting: false, biome: { alpine: 1, desert: 0, tropical: 0, archipelago: 0 }, nearSea: 0, altitude: 2200, ...over });
/** Advance mock time at 60 Hz calling update. */
function run(audio, ctx, seconds, state) { for (let i = 0; i < Math.round(seconds * 60); i++) { ctx.currentTime += 1 / 60; audio.update(typeof state === 'function' ? state(ctx.currentTime) : state, 1 / 60); } }

test('nothing is created before unlock, and unlock is idempotent', () => {
  const before = MockContext.instances;
  const { audio, ctx } = make();
  audio.update(glide({ verticalSpeed: 3 }), 1 / 60); audio.emit('crash', { severity: 1 }); audio.emit('launch');
  assert.equal(MockContext.instances, before); assert.equal(ctx(), null);
  for (let i = 0; i < 50; i++) audio.unlock();
  assert.equal(MockContext.instances, before + 1);
  assert.ok(audio.stats().persistentNodes > 20);
  assert.equal(audio.stats().errors, 0);
});

test('update survives missing, partial and garbage state fields', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx();
  const states = [undefined, null, {}, 42, 'x', { mode: 'gliding' }, { mode: 'foot', walking: true }, { mode: 'cablecar' },
    { mode: 'gliding', speed: 'fast', verticalSpeed: NaN, clearance: Infinity, bank: null, biome: null, nearSea: NaN, altitude: -Infinity },
    { mode: 'gliding', biome: { alpine: NaN, desert: 'a', tropical: -3, archipelago: 9 }, skim: 7, stalled: 1 },
    { mode: 'foot', walking: true, sprinting: true, biome: { desert: 1 } }, { mode: 'ready', paused: true }];
  for (const s of states) { for (let i = 0; i < 40; i++) { c.currentTime += 1 / 60; audio.update(s, i % 3 ? 1 / 60 : NaN); } }
  audio.update(glide(), -5); audio.update(glide(), 1e9);
  assert.equal(audio.stats().errors, 0, audio.stats().lastError);
});

test('every event plays with missing or odd data and unknown events are ignored', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx();
  for (const name of audio.events) for (const data of [undefined, null, {}, { severity: 'x', kind: 'water', speed: NaN, soft: 'no', biome: 'nowhere' }, { severity: 1, kind: 'building' }]) {
    c.currentTime += 3; audio.emit(name, data);
  }
  for (const odd of [undefined, null, 7, 'nope', '__proto__', 'constructor', 'toString']) audio.emit(odd, {});
  assert.equal(audio.stats().errors, 0, audio.stats().lastError);
  const counts = audio.stats().counts;
  for (const name of audio.events) assert.ok(counts[name] >= 1, `${name} never played`);
  assert.ok(!Object.hasOwn(counts, 'toString') && !Object.hasOwn(counts, 'constructor') && !Object.hasOwn(counts, 'nope'));
});

test('no node leak across 1000 emits; voices stay capped and clean up to baseline', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx();
  const baseline = c.live, names = audio.events;
  let maxLive = 0, maxVoices = 0;
  for (let i = 0; i < 1000; i++) {
    c.currentTime += 0.013;
    audio.emit(names[i % names.length], { severity: (i % 10) / 9, kind: ['terrain', 'water', 'building'][i % 3], speed: 14, soft: i % 2 === 0, biome: 'desert' });
    if (i % 4 === 0) audio.update(glide({ verticalSpeed: 2.5, skim: (i % 50) / 50 }), 0.05);
    const st = audio.stats(); maxVoices = Math.max(maxVoices, st.voices); maxLive = Math.max(maxLive, c.live - baseline);
    assert.equal(st.voiceNodes, c.live - baseline, 'voice node bookkeeping matches the context');
  }
  assert.ok(maxVoices <= MAX_VOICES, `voices ${maxVoices}`);
  assert.ok(maxLive < 1500, `live one-shot nodes peaked at ${maxLive}`);
  c.currentTime += 10; audio.update(glide({ paused: true }), 1 / 60);
  assert.equal(c.live, baseline, 'all one-shot nodes disconnected after they end');
  assert.equal(audio.stats().voices + audio.stats().dying, 0);
  assert.equal(audio.stats().errors, 0, audio.stats().lastError);
  console.log(`  peak live one-shot nodes ${maxLive}, peak voices ${maxVoices}, persistent ${baseline}`);
});

test('a same-instant burst of 1000 emits stays bounded (rate limit + voice stealing)', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx(); const baseline = c.live; c.currentTime = 5;
  for (let i = 0; i < 1000; i++) audio.emit(audio.events[i % audio.events.length], { severity: 1 });
  const st = audio.stats();
  assert.ok(st.voices <= MAX_VOICES && st.dying <= 8, JSON.stringify(st));
  assert.ok(c.live - baseline < 1500, `live ${c.live - baseline}`);
  c.currentTime += 0.004; for (let i = 0; i < 1000; i++) audio.emit('ui-move');
  assert.ok(audio.stats().voices <= MAX_VOICES);
  c.currentTime += 10; audio.update({ paused: true }, 0.016); assert.equal(c.live, baseline);
});

test('sound preference persists as on/off and survives broken storage', () => {
  const storage = memoryStorage();
  const a = createAudio({ storage, document: null, createContext: () => new MockContext() });
  assert.equal(a.enabled(), true, 'defaults to on');
  a.setEnabled(false); assert.equal(storage.map.get(SOUND_STORAGE_KEY), 'off'); assert.equal(a.enabled(), false);
  const b = createAudio({ storage, document: null, createContext: () => new MockContext() });
  assert.equal(b.enabled(), false, 'reads off at creation');
  b.setEnabled(true); assert.equal(storage.map.get(SOUND_STORAGE_KEY), 'on');
  assert.equal(createAudio({ storage, document: null }).enabled(), true);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const c = createAudio({ storage: broken, document: null, createContext: () => new MockContext() });
  assert.equal(c.enabled(), true); c.setEnabled(false); assert.equal(c.enabled(), false);
  assert.equal(readSoundPreference(null), true); assert.equal(readSoundPreference({ getItem: () => 'off' }), false);
  assert.equal(createAudio({ storage: null, document: null }).enabled(), true);
});

test('disabled sound mutes the master and schedules nothing', () => {
  const { audio, ctx } = make(); audio.setEnabled(false); audio.unlock(); const c = ctx(), g = audio.graph();
  assert.equal(g.master.gain.lastTarget, 0);
  const live = c.live;
  for (let i = 0; i < 50; i++) { c.currentTime += 0.1; audio.emit('crash', { severity: 1 }); audio.update(glide({ verticalSpeed: 4 }), 0.1); }
  assert.equal(c.live, live); assert.equal(audio.stats().beeps, 0);
  audio.setEnabled(true); assert.ok(g.master.gain.lastTarget > 0.5);
  audio.emit('launch'); assert.ok(c.live > live);
});

test('vario pitch and beep rate rise monotonically with climb (600-1400 Hz above +0.3 m/s)', () => {
  let prev = null;
  for (let i = -400; i <= 600; i++) {
    const c = i / 50;
    const t = varioTone(c);
    if (c < VARIO.threshold) { assert.equal(t.active, false); continue; }
    assert.equal(t.active, true);
    assert.ok(t.freq >= 600 - 1e-9 && t.freq <= 1400 + 1e-9 && t.rate > 1 && t.rate <= 8 && t.duty > 0.3 && t.duty < 0.6);
    if (prev) { assert.ok(t.freq >= prev.freq - 1e-9, `freq at ${c}`); assert.ok(t.rate >= prev.rate - 1e-9, `rate at ${c}`); assert.ok(1 / t.rate * t.duty <= 1 / prev.rate * prev.duty + 1e-9, 'beeps shorten'); }
    prev = t;
  }
  assert.ok(Math.abs(varioTone(0.3).freq - 600) < 1e-6 && Math.abs(varioTone(6).freq - 1400) < 1e-6);
  assert.ok(varioTone(2).freq > varioTone(1).freq + 50 && varioTone(4).rate > varioTone(1).rate + 1.5);
  assert.equal(varioTone(NaN).active, false);
  assert.equal(sinkTone(-1, 15).level, 0); assert.ok(sinkTone(-5, 15).level > 0.3); assert.equal(sinkTone(-5, 35).level, 0);
  assert.ok(sinkTone(-8, 12).level >= sinkTone(-5, 12).level);
});

test('vario beeps only while gliding in climb, faster in stronger lift', () => {
  const beepsFor = (state, seconds = 4) => { const { audio, ctx } = make(); audio.unlock(); run(audio, ctx(), seconds, state); assert.equal(audio.stats().errors, 0); return audio.stats().beeps; };
  const weak = beepsFor(glide({ verticalSpeed: 0.8 })), mid = beepsFor(glide({ verticalSpeed: 2.5 })), strong = beepsFor(glide({ verticalSpeed: 5.5 }));
  assert.ok(weak >= 6 && weak < mid && mid < strong, `${weak} ${mid} ${strong}`);
  assert.ok(strong >= 24 && strong <= 31, `strong ${strong}`);
  for (const s of [glide({ verticalSpeed: -1.5 }), glide({ verticalSpeed: 3, paused: true }), glide({ verticalSpeed: 3, skim: 0.9 }), { ...glide({ verticalSpeed: 3 }), mode: 'foot' }])
    assert.equal(beepsFor(s), 0, JSON.stringify(s));
  // The vario averages: a one-frame spike does not beep.
  assert.equal(beepsFor(t => glide({ verticalSpeed: Math.abs(t - 1) < 0.01 ? 6 : -1.2 }), 2), 0);
});

test('footsteps follow walking pace and stop when paused or gliding', () => {
  const steps = state => { const { audio, ctx } = make(); audio.unlock(); run(audio, ctx(), 3, state); assert.equal(audio.stats().errors, 0); return audio.stats().counts.step || 0; };
  const walk = steps({ mode: 'foot', walking: true, speed: 14, biome: { desert: 1 } }), sprint = steps({ mode: 'foot', walking: true, sprinting: true, speed: 24 });
  assert.ok(walk >= 7 && walk <= 9, `walk ${walk}`); assert.ok(sprint >= 10 && sprint <= 12, `sprint ${sprint}`);
  assert.equal(steps({ mode: 'foot', walking: true, paused: true }), 0);
  assert.equal(steps({ mode: 'foot', walking: false }), 0);
  assert.equal(steps(glide({ walking: true })), 0);
});

test('pause fades the wind/ambience bed, and resuming restores it', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx(), g = audio.graph();
  run(audio, c, 0.5, glide({ speed: 30 }));
  assert.equal(g.bed.gain.lastTarget, 1); assert.ok(g.windBody.gain.lastTarget > 0.1);
  run(audio, c, 0.2, glide({ speed: 30, paused: true }));
  assert.ok(g.bed.gain.lastTarget <= 0.06); assert.equal(g.varioLevel.gain.lastTarget, 0);
  run(audio, c, 0.2, glide({ speed: 30 })); assert.equal(g.bed.gain.lastTarget, 1);
});

test('wind brightens and grows with airspeed; on foot it is very quiet', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx(), g = audio.graph();
  const sample = s => { run(audio, c, 0.2, s); return { body: g.windBody.gain.lastTarget, hiss: g.windHiss.gain.lastTarget, f: g.windHissF.frequency.lastTarget, rumble: g.rumble.gain.lastTarget }; };
  const slow = sample(glide({ speed: 12 })), fast = sample(glide({ speed: 40 })), skim = sample(glide({ speed: 30, skim: 1 })), foot = sample({ mode: 'foot', speed: 14 });
  assert.ok(fast.body > slow.body * 2 && fast.hiss > slow.hiss * 3 && fast.f > slow.f, JSON.stringify({ slow, fast }));
  assert.ok(skim.rumble > 0.25 && slow.rumble === 0);
  assert.ok(foot.body < slow.body * 0.7 && foot.hiss < slow.hiss);
});

test('stall luff and skim swells fire once per edge and dedupe with explicit emits', () => {
  const { audio, ctx } = make(); audio.unlock(); const c = ctx();
  run(audio, c, 0.5, glide());
  run(audio, c, 0.5, glide({ stalled: true, stallWarning: true, speed: 9 }));
  audio.emit('stall');
  run(audio, c, 0.5, glide({ skim: 0.9 }));
  audio.emit('skim-start');
  run(audio, c, 1, glide({ skim: 0.4 }));
  run(audio, c, 0.5, glide({ skim: 0.1 }));
  const n = audio.stats().counts;
  assert.equal(n.stall, 1); assert.equal(n['skim-start'], 1); assert.equal(n['skim-end'], 1);
});

test('a failing AudioContext never throws into the game', () => {
  const audio = createAudio({ storage: null, document: null, createContext: () => { throw new Error('no audio device'); } });
  for (let i = 0; i < 5; i++) audio.unlock();
  audio.update(glide(), 0.016); audio.emit('crash', { severity: 1 }); audio.setEnabled(false); audio.setEnabled(true);
  assert.equal(audio.stats().state, 'none');
});

console.log(JSON.stringify({ passed }, null, 2));
