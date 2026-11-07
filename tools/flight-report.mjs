// Reads back recorded flights from the landing range (saved under work/flights by the local server, or a downloaded file).
// Usage: node tools/flight-report.mjs              list saved flights, newest last
//        node tools/flight-report.mjs latest       one flight: summary, timeline, and a close-up around each mark
//        node tools/flight-report.mjs <n|id|path>  the same for flight number n in the list, an id, or a file
//        add --full for a 5 Hz timeline
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'work', 'flights');
const args = process.argv.slice(2), full = args.includes('--full'), which = args.find(a => !a.startsWith('--'));
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const brief = f => `${f.savedAt?.slice(11, 19) || ''} ${String(f.start || '').padEnd(8)} ${String(f.model || '').padEnd(8)} ${f.assist === undefined ? '' : f.assist ? 'assist ' : 'manual '}${String(f.duration ?? 0).padStart(6)} s  ${String(f.outcome || '').padEnd(9)} marks ${f.marks?.length || 0}`;

if (!which) {
  if (!files.length) console.log('No flights saved yet in ' + dir);
  files.forEach((file, i) => console.log(String(i + 1).padStart(3), brief(read(path.join(dir, file)))));
  process.exit(0);
}
const pick = which === 'latest' ? files.at(-1) : /^\d+$/.test(which) ? files[+which - 1] : files.find(f => f.startsWith(which));
const file = pick ? path.join(dir, pick) : which;
if (!fs.existsSync(file)) { console.error('No such flight: ' + which); process.exit(1); }
const loaded = read(file), flights = Array.isArray(loaded) ? loaded : [loaded];

const DEG = 180 / Math.PI;
for (const f of flights) {
  const col = Object.fromEntries(f.fields.map((k, i) => [k, i])), get = (s, k) => s[col[k]], S = f.samples;
  console.log(`\n=== ${f.id}\n${brief(f)}  wind ${JSON.stringify(f.wind || {})}`);
  if (f.result) console.log('result', JSON.stringify(f.result));
  if (!S.length) continue;
  const stat = (k, fn) => S.reduce((a, s) => fn(a, get(s, k)), get(S[0], k));
  const stalledSeconds = S.filter(s => get(s, 'stalled')).length / 20;
  console.log(`top ${Math.round(stat('kmh', Math.max))} km/h, slowest ${Math.round(stat('kmh', Math.min))} km/h, steepest ${(stat('path', Math.min) * DEG).toFixed(0)} deg, steepest climb ${(stat('path', Math.max) * DEG).toFixed(0)} deg, max bank ${(S.reduce((a, s) => Math.max(a, Math.abs(get(s, 'bank'))), 0) * DEG).toFixed(0)} deg, peak load ${stat('load', Math.max).toFixed(1)} g, stalled ${stalledSeconds.toFixed(1)} s`);
  const row = s => `${get(s, 't').toFixed(2).padStart(7)}s ${String(Math.round(get(s, 'kmh'))).padStart(4)} km/h  vs ${get(s, 'vs').toFixed(1).padStart(6)}  agl ${get(s, 'clear').toFixed(1).padStart(7)}  bank ${(get(s, 'bank') * DEG).toFixed(0).padStart(4)}  path ${(get(s, 'path') * DEG).toFixed(0).padStart(4)}  a ${(get(s, 'alpha') * DEG).toFixed(0).padStart(3)}  bar ${get(s, 'bar').toFixed(2).padStart(5)}  in ${get(s, 'inRoll').toFixed(1).padStart(4)}/${get(s, 'inPitch').toFixed(1).padStart(4)}${get(s, 'stalled') ? ' STALL' : ''}`;
  const step = full ? 4 : 20;
  console.log('\ntimeline'); S.forEach((s, i) => { if (i % step === 0 || i === S.length - 1) console.log(row(s)); });
  (f.marks || []).forEach((m, i) => {
    console.log(`\nMARK ${i + 1} at ${m} s`);
    const at = Math.min(m, f.duration ?? m); // A mark after the landing shows the end of the flight.
    S.filter(s => get(s, 't') >= at - 3 && get(s, 't') <= at + 1).filter((_, k) => k % 3 === 0).forEach(s => console.log(row(s)));
  });
}
