// Flies the tuning scenarios (src/scenarios.js) on several wings and prints one table per scenario: the outcome and its numbers.
//   node tools/scenarios.mjs [launch|flight|landing|<scenario id> ...] [--wings alpha-235,t2c-144] [--vg 0|1|both] [--json]
//   npm run scenarios -- landing --wings ladder
// Wings: preset ids, or "ladder" (Alpha, Falcon, Sport 2, U2, T2C), "eras" (the Rogallo to today) or "all" (the default: the ladder).
import { SCENARIOS, PRESETS, runScenario } from '../src/index.js';

const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const json = args.includes('--json'); if (json) args.splice(args.indexOf('--json'), 1);
const GROUPS = { ladder: ['alpha-235', 'falcon-170', 'sport-2', 'u2-160', 't2c-144'], eras: ['rogallo-1975', 'cable-1979', 'vintage-1985', 'performance-1992', 'sport-2', 't2c-144'], all: Object.keys(PRESETS) };
const wings = (flag('--wings') ?? 'ladder').split(',').flatMap(w => GROUPS[w] ?? [w]);
const vgArg = flag('--vg') ?? '0', vgs = vgArg === 'both' ? [0, 1] : [Number(vgArg)];
const picked = args.length ? SCENARIOS.filter(s => args.includes(s.kind) || args.includes(s.id)) : SCENARIOS;
if (!picked.length) { console.error(`no scenario matches ${args.join(' ')}; kinds: launch, flight, landing; ids: ${SCENARIOS.map(s => s.id).join(', ')}`); process.exit(1); }

const out = [];
for (const sc of picked) {
  const rows = [];
  for (const id of wings) for (const vg of PRESETS[id]?.vg ? vgs : [0]) {
    const r = runScenario(sc, { preset: id, vg }), label = `${id}${PRESETS[id].vg ? (vg ? ' VG on' : ' VG off') : ''}`;
    rows.push({ wing: label, outcome: r.outcome, ...Object.fromEntries(Object.entries(r.metrics).filter(([, v]) => !Array.isArray(v))) });
    out.push({ scenario: sc.id, wing: label, outcome: r.outcome, metrics: r.metrics });
  }
  if (json) continue;
  console.log(`\n${sc.kind.toUpperCase()} ${sc.id}: ${sc.name}. ${sc.look}`);
  const cols = Object.keys(rows[0]).filter(k => rows.some(r => r[k] !== null && r[k] !== undefined));
  const cell = v => v === null || v === undefined ? '-' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);
  const width = cols.map(c => Math.max(c.length, ...rows.map(r => cell(r[c]).length)));
  console.log(cols.map((c, i) => c.padEnd(width[i])).join('  '));
  for (const r of rows) console.log(cols.map((c, i) => cell(r[c]).padEnd(width[i])).join('  '));
}
if (json) console.log(JSON.stringify(out, null, 1));
