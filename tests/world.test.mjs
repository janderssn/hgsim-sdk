// The landing range's world: the ground a launch, a flight and a wreck feel is where the scenery is drawn.
import assert from 'node:assert/strict';
import { terrainHeight, LAUNCH, CLIFF, ROCKS, rockTop, rockRing, groundUnder, deckY, deckLine, DECK_LIP, DECK_BACK, DECK_FALL, landableAt, MARK } from '../range/world.js';

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
console.log('world checks passed');
