// The landing range's world: the ground a launch, a flight and a wreck feel is where the scenery is drawn.
import assert from 'node:assert/strict';
import { terrainHeight, LAUNCH, CLIFF, SLOPE, ROCKS, rockTop, rockRing, groundUnder, deckY, deckLine, DECK_LIP, DECK_BACK, DECK_FALL, RUN_DIST, LAUNCH_SITES, SITE_ORDER, landableAt, MARK } from '../range/world.js';

// The deck slopes down toward the lip and stands well above the ridge; past its ends it is held level, its line carries on.
const back = LAUNCH.z + DECK_BACK + 1, lip = LAUNCH.z + DECK_LIP - .1;
assert.ok(deckY(back) > deckY(lip), 'the deck falls toward the lip');
assert.ok(Math.abs((deckY(back) - deckY(lip)) / (lip - back) - DECK_FALL) < 1e-9, 'at DECK_FALL');
assert.ok(deckY(lip) - terrainHeight(LAUNCH.x, lip) > 30, 'well above the ridge');
assert.equal(deckY(lip + 20), deckY(LAUNCH.z + DECK_LIP), 'the deck ends at the lip');
assert.ok(deckLine(lip + 20) < deckY(lip + 20), 'its line carries on down');

// Underfoot: the deck on the deck, nothing of it beside it or beyond the lip; the rocks are solid, their rings narrowing upward.
assert.equal(groundUnder(LAUNCH.x, lip), deckY(lip));
assert.ok(groundUnder(LAUNCH.x + 6, lip) < deckY(lip) - 2, 'beside the deck is a drop');
assert.ok(rockTop(CLIFF.x, CLIFF.cz) > terrainHeight(CLIFF.x, CLIFF.cz) + 40, 'the cliff rock stands high');
assert.ok(Math.abs(rockTop(CLIFF.x, CLIFF.cz) - (CLIFF.top - .5)) < 1e-9, 'its top is flat at the top ring');
assert.equal(rockTop(CLIFF.x + 300, CLIFF.cz), -Infinity, 'no rock far off');
for (const r of ROCKS) assert.ok(rockRing(r, 0).rx < rockRing(r, 1).rx && rockRing(r, 0).y > rockRing(r, 1).y, 'rings widen as they fall');
assert.ok(CLIFF.ground > terrainHeight(CLIFF.x, CLIFF.z) && CLIFF.y === CLIFF.ground + 2.3, 'the cliff launch stands on its rock');

// The field is landable, the ridge face is not everywhere.
assert.ok(landableAt(MARK.x, MARK.z), 'the mark is landable');

// The launch sites, one description each. The ramp: the deck at its own fall, the lip ahead and its sides; the cliff: a level
// top with its edge just ahead; the slope: open hillside at a steady 20 degrees with no edge, clear of the rocks and the deck.
assert.deepEqual(SITE_ORDER, ['ramp', 'cliff', 'slope']);
const { ramp, cliff, slope } = LAUNCH_SITES;
assert.equal(ramp.start.z, LAUNCH.z - RUN_DIST);
assert.equal(ramp.ground(ramp.start.x, ramp.start.z), deckY(ramp.start.z));
assert.equal(ramp.fall(), DECK_FALL);
assert.ok(Math.abs(ramp.edgeAhead(ramp.start.x, ramp.start.z, 0) - (DECK_LIP + RUN_DIST)) < 1e-9, 'the lip is the run ahead');
assert.ok(ramp.edgeAhead(ramp.start.x, ramp.start.z, Math.PI / 2) < 4, 'turned sideways, the deck\'s side is close');
assert.equal(cliff.ground(cliff.start.x, cliff.start.z), CLIFF.ground);
assert.equal(cliff.start.z, CLIFF.z);
assert.ok(cliff.edgeAhead(cliff.start.x, cliff.start.z, 0) < 2, 'the cliff edge is a step away');
assert.equal(slope.start.x, SLOPE.x);
assert.equal(slope.ground(slope.start.x, slope.start.z), terrainHeight(slope.start.x, slope.start.z));
assert.equal(slope.edgeAhead(slope.start.x, slope.start.z, 0), Infinity);
for (let s = 0; s <= 40; s += 5) {
  const deg = Math.atan(slope.fall(slope.start.x, slope.start.z + s, 0)) * 180 / Math.PI;
  assert.ok(deg > 18 && deg < 22.5, `the slope runs at about 20 degrees (${deg.toFixed(1)} at ${s} m)`);
  assert.equal(rockTop(slope.start.x, slope.start.z + s), -Infinity, 'no rock on the slope\'s run');
  assert.equal(groundUnder(slope.start.x, slope.start.z + s), terrainHeight(slope.start.x, slope.start.z + s), 'nothing but grass underfoot');
}
for (const s of Object.values(LAUNCH_SITES)) assert.ok(s.label && s.round && typeof s.ground === 'function');
console.log('world checks passed');
