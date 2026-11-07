import assert from 'node:assert/strict';
import { pullOutHeights, dropToImpact, ZONE_LOW, ZONE_HIGH } from '../src/landing-cues.js';
import { createSoaringState, stepSoaring, judgeTouchdown, tuneSoaring, getSoaringTuning, scrapeGround } from '../src/flight.js';

// The height bar is the dive warning, so its bands have to be true: acting as the marker reaches a band has to clear the ground.
const env = { terrainHeight: () => 0, thermals: [], wind: { x: 0, z: 0 } }, dt = 1 / 60;
function dive(from, band, scale = 1) {
  const s = createSoaringState({ y: from + 2.3 }); let acted = false, lowest = Infinity;
  for (let t = 0; t < 60; t += dt) {
    const feet = s.y - 2.3, sink = Math.max(0, -s.verticalSpeed);
    if (!acted && sink > 3 && feet < pullOutHeights({ speed: s.airspeed, sink })[band] * scale) acted = true;
    stepSoaring(s, { roll: 0, pitch: !acted ? -1 : band === 'push' ? 1 : 0 }, dt, env);
    lowest = Math.min(lowest, s.y - 2.3);
    if (s.y <= 2.3 || (acted && s.verticalSpeed > 0)) break;
  }
  return lowest;
}
const heights = [30, 40, 60, 80, 120, 150, 200, 300, 450, 600, 900];
for (const h of heights) for (const band of ['push', 'free']) assert.ok(dive(h, band) > 0, `acting at the ${band} band from a ${h} m dive clears the ground: ${dive(h, band)}`);
console.log('PASS acting at either band clears the ground, from every dive height');
// ... and it is a warning, not a nag: it does not ask for far more height than the pull-out uses.
for (const h of [80, 150, 300]) assert.ok(dive(h, 'push') < 25, `the red band is close to what a push-out needs: ${dive(h, 'push')} m to spare from ${h} m`);
console.log('PASS the red band stays close to the height really needed');
for (const h of [80, 150, 300]) assert.ok(dive(h, 'push', .5) <= 0, `waiting until half the red band hits the ground: ${dive(h, 'push', .5)}`);
console.log('PASS going well past the red band hits the ground');
const gentle = pullOutHeights({ speed: 13, sink: 1 }); assert.ok(gentle.push < 14, 'a normal glide needs no real margin');
// The green zone has to be true as well: from any normal approach speed, a push started inside it can land softly.
function flare(holdFrom, kmh) {
  const s = createSoaringState({ y: 20 }); s.airspeed = kmh / 3.6; let on = false;
  for (let t = 0; t < 60 && s.y > 2.3; t += dt) { if (s.y - 2.3 < holdFrom) on = true; const g = s.y < 14; stepSoaring(s, { roll: 0, pitch: on ? 1 : 0, landable: g, ground: g }, dt, env); }
  return judgeTouchdown({ verticalSpeed: -s.verticalSpeed, groundSpeed: s.groundSpeed });
}
const inZone = [0, .2, .4, .6].map(d => ZONE_LOW + d);
for (const kmh of [47, 55, 65, 80]) assert.ok(inZone.some(h => flare(h, kmh) === 'soft'), 'a soft flare in the zone at ' + kmh + ' km/h: ' + inZone.map(h => flare(h, kmh)));
assert.ok(ZONE_LOW < 3 && ZONE_HIGH > 3 && flare(ZONE_LOW - .7, 47) !== 'soft' && flare(ZONE_HIGH + .7, 47) !== 'soft', 'outside the zone is not soft');
console.log('PASS the green zone is where a flare lands softly');
// Down a hillside the flight path never meets the slope, so the bar stays quiet; where the hill runs out onto flat ground it warns.
const hill = (x, z) => z < 0 ? -.45 * z : 0, parallel = { x: 0, z: -400, vx: 0, vy: -18, vz: 40, terrainHeight: hill };
assert.equal(dropToImpact({ ...parallel, feetY: hill(0, -400) + 15, seconds: 4 }), null, 'parallel to the hill, nothing ahead');
const seen = dropToImpact({ ...parallel, z: -120, feetY: hill(0, -120) + 15 }); assert.ok(seen > 40, 'the end of the hill is seen ahead, as the full drop to it: ' + seen);
assert.equal(dropToImpact({ ...parallel, vy: 2, feetY: 200 }), null, 'climbing');
console.log('PASS the bar looks along the flight path');
// The ground cushion softens a fast arrival, never a landing: at landing speed the flight is the same with or without it.
function arrive(kmh, feet, pathDeg, pitch) {
  const s = createSoaringState({ y: feet + 2.3 }); s.airspeed = kmh / 3.6; s.pathAngle = pathDeg * Math.PI / 180; s.verticalSpeed = s.airspeed * Math.sin(s.pathAngle); s.alpha = -1.5 * Math.PI / 180; let low = feet;
  for (let t = 0; t < 8 && s.y > 2.3 && !(t > .3 && s.verticalSpeed > .2 && pitch >= 0); t += dt) { const g = s.y < 14; stepSoaring(s, { roll: 0, pitch, landable: g, ground: g }, dt, env); low = Math.min(low, s.y - 2.3); }
  return { low, hit: s.y <= 2.3, sink: -s.verticalSpeed };
}
const cushion = getSoaringTuning().groundCushion;
const withIt = [arrive(145, 12, -18, 0), arrive(130, 3, 0, -1), arrive(45, 3, -5, 1)]; tuneSoaring({ groundCushion: 0 });
const without = [arrive(145, 12, -18, 0), arrive(130, 3, 0, -1), arrive(45, 3, -5, 1)]; tuneSoaring({ groundCushion: cushion });
assert.ok(without[0].hit && !withIt[0].hit, 'a fast arrival that would have hit becomes a low pass');
assert.ok(withIt[1].hit && withIt[1].sink < without[1].sink, 'W held still hits the ground, softer');
assert.ok(Math.abs(withIt[2].sink - without[2].sink) < .01, 'a landing approach is unchanged');
console.log('PASS the cushion softens fast arrivals and leaves landings alone');
// A light, level touch at speed skips and costs speed; a hard, banked or landing-speed contact does not.
const scrapeState = () => { const s = createSoaringState({ y: 2.3 }); s.airspeed = 40; return s; };
const scraped = scrapeState(); assert.equal(scrapeGround(scraped, { verticalSpeed: 2, groundSpeed: 40, slope: 0, bank: 0 }, 0), true); assert.ok(scraped.airspeed < 40 && scraped.verticalSpeed > 0 && scraped.y > 2.3, 'skips off and loses speed');
for (const [why, c] of [['hard', { verticalSpeed: 6, groundSpeed: 40, slope: 0, bank: 0 }], ['banked', { verticalSpeed: 1, groundSpeed: 40, slope: 0, bank: .6 }], ['landing speed', { verticalSpeed: 1, groundSpeed: 12, slope: 0, bank: 0 }], ['steep ground', { verticalSpeed: 1, groundSpeed: 40, slope: .9, bank: 0 }]]) assert.equal(scrapeGround(scrapeState(), c, 0), false, why);
let skid = scrapeState(), contacts = 0; for (let i = 0; i < 2000 && skid.airspeed > 18; i++) { stepSoaring(skid, { roll: 0, pitch: 0 }, dt, env); if (skid.y <= 2.3 && scrapeGround(skid, { verticalSpeed: -skid.verticalSpeed, groundSpeed: skid.airspeed, slope: 0, bank: 0 }, 0)) contacts++; else if (skid.y <= 2.3) break; } assert.ok(contacts <= 1 || skid.airspeed < 40, 'repeated scrapes keep costing speed');
console.log('PASS a light touch at speed scrapes, anything worse does not');
console.log(JSON.stringify({ passed: 8 }));
