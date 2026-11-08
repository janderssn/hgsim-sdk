/** Quiet, original procedural place sounds routed through the game's unlocked ambience bus. */
export const MAX_VALLEY_VOICES = 3;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);

/** Audible shore distance includes height, so a lake is quiet from a high glider. */
export function valleySoundLocation(listener, forward, source, radius = 0) {
  if (!point(listener) || !point(source)) return { distance: Infinity, pan: 0 };
  const dx = source.x - listener.x, dz = source.z - listener.z;
  const horizontal = Math.hypot(dx, dz);
  const fx = finite(forward?.x), fz = finite(forward?.z, 1), length = Math.hypot(fx, fz) || 1;
  return { distance: Math.hypot(Math.max(0, horizontal - Math.max(0, finite(radius))), source.y - listener.y),
    pan: clamp((-fz * dx + fx * dz) / (Math.max(1, horizontal) * length), -1, 1) * .8 };
}

/** Finite breathy phrases / damped wood, never a continuously running tone generator. */
export function createValleyPhrase(context, kind, variant = 0) {
  const rate = context.sampleRate, duration = kind === 'wood' ? .85 : 1.42;
  const buffer = context.createBuffer(1, Math.ceil(duration * rate), rate), data = buffer.getChannelData(0);
  let seed = (variant + 1) * 181, phase = 0;
  const noise = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 2147483648 - 1; };
  const pulses = variant % 2 ? [[.05, .21, 1], [.43, .16, .90], [.78, .29, .74]]
    : [[.06, .17, .84], [.32, .24, 1], [.86, .22, .63]];
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    if (kind === 'wood') {
      const attack = 1 - Math.exp(-t * 650);
      data[i] = attack * (Math.sin(t * Math.PI * 2 * 440) * Math.exp(-t * 8)
        + .25 * Math.sin(t * Math.PI * 2 * 927) * Math.exp(-t * 17)
        + .08 * Math.sin(t * Math.PI * 2 * 1546) * Math.exp(-t * 26))
        + noise() * Math.exp(-t * 180) * attack * .06;
    } else {
      for (let n = 0; n < pulses.length; n++) {
        const [start, span, strength] = pulses[n], u = (t - start) / span;
        if (u <= 0 || u >= 1) continue;
        const contour = 1.16 + .18 * Math.sin(u * Math.PI) - u * .40;
        const frequency = (2200 + variant * 157 + n * 79) * contour
          * (1 + .012 * Math.sin(t * Math.PI * 2 * (18 + n * 3)));
        phase += Math.PI * 2 * frequency / rate;
        const envelope = Math.sin(Math.PI * u) ** 1.7 * strength;
        data[i] = envelope * (Math.sin(phase) * .68 + Math.sin(phase * 2) * .045 + noise() * .025);
      }
    }
    data[i] *= 1 - smooth(duration - .04, duration, t);
  }
  return buffer;
}

/**
 * Owns no AudioContext and never resumes one. start() accepts the already
 * unlocked context, its ambience destination, and existing pink/brown buffers.
 * update() accepts {position,forward,forest,forestSource?,refuge?,lake?,clearance,
 * enabled?,paused?}; lake is {x,y,z,radius}. Missing places produce no sound.
 */
export function createValleyAmbience({ random = Math.random } = {}) {
  let context = null, destination = null, graph = null, disposed = false, failures = 0;
  let nextBird = 0, nextWood = 0, lastControl = -Infinity;
  let forestLevel = 0, shoreLevel = 0;
  const voices = [], phrases = new Map(), counts = { bird: 0, wood: 0 };
  const rand = () => clamp(finite(random(), .5), 0, .999999);
  const release = node => { try { node.disconnect(); } catch { /* already detached */ } };
  function endVoice(voice) {
    if (voice.ended) return;
    voice.ended = true;
    try { voice.source.stop(); } catch { /* already ended */ }
    for (const node of voice.nodes) release(node);
    const index = voices.indexOf(voice); if (index >= 0) voices.splice(index, 1);
  }
  function stop() {
    for (const voice of [...voices]) endVoice(voice);
    if (graph) {
      for (const source of graph.sources) { try { source.stop(); } catch { /* already ended */ } }
      for (const node of graph.nodes) release(node);
    }
    graph = null; destination = null; nextBird = nextWood = 0; lastControl = -Infinity;
    forestLevel = shoreLevel = 0;
  }
  function start(ctx, output, noise) {
    if (disposed || failures >= 3 || !ctx || ctx.state !== 'running' || !output || !noise?.pink || !noise?.brown) return false;
    if (graph && context === ctx && destination === output) return true;
    stop();
    if (context !== ctx) phrases.clear();
    context = ctx; destination = output;
    const nodes = [], sources = [];
    graph = { nodes, sources };
    const keep = node => { nodes.push(node); return node; };
    try {
      const master = keep(ctx.createGain()); master.gain.value = 0; master.connect(output);
      const waterPan = keep(ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain()); waterPan.connect(master);
      function bed(buffer, type, frequency, rate, outputNode, offset) {
        const gain = keep(ctx.createGain()); gain.gain.value = 0; gain.connect(outputNode);
        const filter = keep(ctx.createBiquadFilter()); filter.type = type; filter.frequency.value = frequency; filter.Q.value = .6; filter.connect(gain);
        const source = keep(ctx.createBufferSource()); source.buffer = buffer; source.loop = true; source.playbackRate.value = rate;
        source.connect(filter); source.start(ctx.currentTime, buffer.duration * offset); sources.push(source);
        return { gain, filter };
      }
      Object.assign(graph, { master, waterPan,
        leaves: bed(noise.pink, 'bandpass', 1350, .91, master, .27),
        waterBody: bed(noise.brown, 'lowpass', 430, .89, waterPan, .63),
        waterWash: bed(noise.pink, 'bandpass', 1120, 1.07, waterPan, .51) });
      nextBird = ctx.currentTime + 4 + rand() * 8;
      nextWood = ctx.currentTime + 19 + rand() * 21;
      return true;
    } catch (error) { failures++; stop(); throw error; }
  }
  function oneShot(kind, origin, level, now) {
    if (voices.length >= MAX_VALLEY_VOICES) return;
    const variant = kind === 'bird' ? Math.floor(rand() * 4) : 0, key = `${kind}:${variant}`;
    if (!phrases.has(key)) phrases.set(key, createValleyPhrase(context, kind, variant));
    const nodes = [], keep = node => { nodes.push(node); return node; };
    try {
      const buffer = phrases.get(key), source = keep(context.createBufferSource()), gain = keep(context.createGain());
      const pan = keep(context.createStereoPanner ? context.createStereoPanner() : context.createGain());
      source.buffer = buffer; source.playbackRate.value = .94 + rand() * .12;
      gain.gain.value = 0; source.connect(gain); gain.connect(pan); pan.connect(graph.master);
      const voice = { source, gain, pan, origin: { ...origin }, level, kind,
        nodes, end: now + buffer.duration / source.playbackRate.value + .03, ended: false };
      voices.push(voice);
      source.onended = () => endVoice(voice);
      source.start(now + .005); source.stop(voice.end); counts[kind]++;
    } catch (error) { for (const node of nodes) release(node); failures++; stop(); throw error; }
  }
  function update(state = {}) {
    if (!graph) return;
    if (disposed || context.state !== 'running' || state.enabled === false || state.paused || !point(state.position)) { stop(); return; }
    const now = context.currentTime;
    for (const voice of [...voices]) if (now > voice.end + .05) endVoice(voice);
    if (now - lastControl < .05 && now >= lastControl) return;
    lastControl = now;
    const ground = 1 - smooth(35, 165, Math.max(0, finite(state.clearance, 1000)));
    const forest = clamp(finite(state.forest));
    const gust = .55 + .23 * Math.sin(now * .37) + .17 * Math.sin(now * .71 + 2.8);
    const target = (parameter, value, time = .5) => parameter?.setTargetAtTime(value, now, time);
    target(graph.master.gain, ground, .6);
    target(graph.leaves.gain.gain, forest * (.018 + gust * .016));
    target(graph.leaves.filter.frequency, 1050 + gust * 650, .8);
    const lake = valleySoundLocation(state.position, state.forward, state.lake, state.lake?.radius);
    const shore = 1 - smooth(8, 115, lake.distance);
    forestLevel = forest * ground; shoreLevel = shore * ground;
    const lap = .48 + .22 * Math.sin(now * .59) + .13 * Math.sin(now * .91 + 1.6);
    target(graph.waterBody.gain.gain, shore * (.018 + lap * .028), .8);
    target(graph.waterWash.gain.gain, shore * (.007 + lap * .018), .8);
    target(graph.waterPan.pan, lake.pan, .5);
    if (now >= nextBird) {
      if (forest > .16 && ground > .15) {
        const angle = rand() * Math.PI * 2, radius = 18 + rand() * 30;
        const origin = point(state.forestSource) ? state.forestSource : {
          x: state.position.x + Math.cos(angle) * radius,
          y: state.position.y - Math.max(0, finite(state.clearance)) + 6,
          z: state.position.z + Math.sin(angle) * radius };
        oneShot('bird', origin, .025 * (.5 + forest * .5), now);
      }
      nextBird = now + 9 + rand() * 19;
    }
    if (now >= nextWood) {
      const refuge = valleySoundLocation(state.position, state.forward, state.refuge);
      if (refuge.distance < 50 && ground > .4) oneShot('wood', state.refuge, .026, now);
      nextWood = now + 26 + rand() * 39;
    }
    for (const voice of voices) {
      const location = valleySoundLocation(state.position, state.forward, voice.origin);
      const attenuation = 1 - smooth(voice.kind === 'bird' ? 12 : 4, voice.kind === 'bird' ? 115 : 58, location.distance);
      target(voice.gain.gain, voice.level * attenuation, .045);
      target(voice.pan.pan, location.pan, .12);
    }
  }
  return { start, stop, update,
    dispose() { if (disposed) return; stop(); phrases.clear(); context = null; disposed = true; },
    stats: () => ({ active: !!graph, nodes: (graph?.nodes.length || 0) + voices.reduce((n, voice) => n + voice.nodes.length, 0),
      voices: voices.length, buffers: phrases.size, failures, forestLevel, shoreLevel, counts: { ...counts } }) };
}
