// The glider presets side by side: node tools/polars.mjs (npm run polars). Speeds in km/h, sink in m/s.
import { PRESETS, createGlider } from '../src/index.js';

const kmh = v => (v * 3.6).toFixed(0).padStart(4);
console.log('preset             stall  trim   top  min sink @    best L/D @     sink@60  L/D into 5 m/s');
const rows = Object.values(PRESETS).flatMap(p => p.vg ? [[p, 0, `${p.id} VG off`], [p, 1, `${p.id} VG on`]] : [[p, 0, p.id]]);
for (const [p, vg, label] of rows) {
  const g = createGlider({ preset: p }).setVG(vg), polar = g.polar(), into = polar.speedToFly({ headwind: 5 });
  const at60 = polar.topSpeed * 3.6 >= 60 ? g.performance.sink(60 / 3.6).toFixed(2) : '  - ';
  console.log(`${label.padEnd(19)}${kmh(polar.stallSpeed)}  ${kmh(polar.trimSpeed)}  ${kmh(polar.topSpeed)}  ${polar.minSink.sink.toFixed(2)} ${kmh(polar.minSink.airspeed)}` +
    `    ${polar.bestGlide.glideRatio.toFixed(1).padStart(4)} ${kmh(polar.bestGlide.airspeed)}     ${at60}    ${into.glideRatio.toFixed(1)} at ${kmh(into.airspeed).trim()}`);
}
