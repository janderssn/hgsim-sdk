import assert from 'node:assert/strict';
import { createFlightRecorder, FLIGHT_FIELDS, SAMPLE_PERIOD } from '../src/flight-recorder.js';

const memoryStorage = (limit = Infinity) => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem(k, v) { if (v.length > limit) throw new Error('full'); m.set(k, v); }, removeItem: k => m.delete(k) }; };
const results = []; const test = (name, fn) => { fn(); results.push(name); console.log('PASS', name); };
const fly = (r, seconds, fps = 60) => { for (let i = 0; i <= seconds * fps; i++) r.sample(i / fps, { x: i, y: 100, kmh: 50, stalled: 0 }); };

test('samples at 20 Hz whatever the frame rate, in the declared field order', () => {
  for (const fps of [30, 60, 144]) { const r = createFlightRecorder(); r.begin(); fly(r, 10, fps); const f = r.end({ outcome: 'soft' });
    assert.ok(Math.abs(f.samples.length - 10 / SAMPLE_PERIOD) < 12, fps + ' fps gave ' + f.samples.length); assert.equal(f.samples[0].length, FLIGHT_FIELDS.length); assert.equal(f.duration, 10); assert.equal(f.outcome, 'soft'); }
});
test('marks land at the current flight time, and a mark just after the round joins that round', () => {
  let clock = 1000; const sent = []; const r = createFlightRecorder({ send: f => sent.push(f.marks.length), now: () => clock });
  r.begin(); fly(r, 5); assert.equal(r.mark(), 'flight'); r.end({ outcome: 'firm' }); clock += 2000;
  assert.equal(r.mark(), 'late'); assert.deepEqual(sent, [1, 2]); clock += 60000; assert.equal(r.mark(), null);
});
test('a round thrown away at once is dropped, but a marked one is kept', () => {
  const sent = []; const r = createFlightRecorder({ send: f => sent.push(f.id) });
  r.begin(); fly(r, 1); r.end({ outcome: 'abandoned' }); assert.equal(sent.length, 0);
  r.begin(); fly(r, 1); r.mark(); r.end({ outcome: 'abandoned' }); assert.equal(sent.length, 1);
});
test('beginning a new round closes the one in progress as abandoned', () => {
  const out = []; const r = createFlightRecorder({ send: f => out.push(f.outcome) }); r.begin(); fly(r, 5); r.begin(); assert.deepEqual(out, ['abandoned']); assert.ok(r.active);
});
test('storage keeps the latest rounds, survives filling up, and a failing send cannot disturb the flight', () => {
  const s = memoryStorage(); const r = createFlightRecorder({ storage: s, send: () => { throw new Error('offline'); } });
  for (let i = 0; i < 12; i++) { r.begin({ n: i }); fly(r, 4); r.end({ outcome: 'soft' }); }
  const list = r.list(); assert.equal(list.length, 8); assert.equal(list.at(-1).n, 11);
  const tight = createFlightRecorder({ storage: memoryStorage(40000) });
  for (let i = 0; i < 6; i++) { tight.begin({ n: i }); fly(tight, 8); tight.end({ outcome: 'soft' }); }
  assert.ok(tight.list().length >= 1 && tight.list().at(-1).n === 5, 'the newest round survives');
  const bad = createFlightRecorder({ storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} } }); bad.begin(); fly(bad, 4); assert.ok(bad.end({ outcome: 'soft' }));
});
test('non-numeric values are stored as zero, not as broken data', () => { const r = createFlightRecorder(); r.begin(); r.sample(0, { x: NaN, y: undefined }); const f = (fly(r, 4), r.end({ outcome: 'soft' })); assert.ok(f.samples[0].every(Number.isFinite)); });
console.log(JSON.stringify({ passed: results.length }));
