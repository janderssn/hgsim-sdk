import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceWheelRoll, canRollOnWheels, classicModel, createGlider, forceModel, scoreLanding, sweepFlightContact,
} from 'hgsim';

const point = (part, y, z) => ({ x: 0, y, z, clearance: y, part });
const contact = { x: 0, z: 0, ground: 0, airframeY: .7, heading: 0,
  verticalSpeed: 1.2, groundSpeed: 8, slope: 0, bank: 0, airspeed: 14, wind: { x: 0, z: -4 } };

test('posed sweeps find the first contact and prefer gear when a foot reaches ground at the same instant', () => {
  const start = [point('feet', .03, 0), point('wheel', .02, 1)];
  const end = [point('feet', -.01, .2), point('wheel', -.03, 1.2)];
  const first = sweepFlightContact(start, end, () => 0, 1 / 60);
  assert.equal(first.part, 'wheel');
  assert.ok(Math.abs(first.fraction - .4) < .002);
  const tie = sweepFlightContact([point('feet', .1, 0), point('bar', .1, 1)],
    [point('feet', -.1, 0), point('bar', -.1, 1)], () => 0, 1 / 60);
  assert.equal(tie.part, 'bar');
  assert.equal(sweepFlightContact(end, start, () => 0, 1 / 60), null);
});

test('only feet score and a completed gentle wheel rollout reaches rest', () => {
  const wheel = { ...contact, part: 'wheel', forwardSpeed: 8, sideSpeed: 0 };
  assert.ok(canRollOnWheels(wheel));
  assert.equal(canRollOnWheels({ ...wheel, verticalSpeed: 4 }), false);
  assert.equal(scoreLanding(wheel).judged, 'crash');
  assert.ok(scoreLanding({ ...contact, part: 'feet' }).points > 0);
  assert.equal(scoreLanding({ ...contact, part: 'bar' }).points, 0);
  const result = scoreLanding({ ...wheel, rolledOut: true }, { x: 0, z: 0 });
  assert.equal(result.judged, 'wheel-rollout');
  assert.equal(result.points, 0);
  assert.equal(result.stars, 0);
  let speed = 8, distance = 0;
  for (let i = 0; i < 300 && speed > 0; i++) {
    const step = advanceWheelRoll(speed, 0, 1 / 60);
    assert.ok(step.speed < speed);
    speed = step.speed;
    distance += step.distance;
  }
  assert.equal(speed, 0);
  assert.ok(Math.abs(distance - 8 * 8 / 4.5) < 1e-9);
});

for (const model of [forceModel, classicModel]) {
  test(`${model.name} accepts posed clearance and recovers from a tire scrape at the resolved height`, () => {
    const glider = createGlider({ model, at: { y: 4, airspeed: 14 } });
    const baseline = createGlider({ model, at: { y: 4, airspeed: 14 } });
    glider.step(1 / 60, { contactClearance: .4, field: true, pitch: .7 });
    baseline.step(1 / 60, { field: true, pitch: .7 });
    assert.notDeepEqual(glider.state, baseline.state);
    assert.equal(glider.scrape({ ...contact, part: 'bar' }), false);
    assert.equal(glider.scrape({ ...contact, part: 'wheel', verticalSpeed: 6 }), false);
    assert.equal(glider.scrape({ ...contact, part: 'wheel' }), true);
    assert.equal(glider.state.y, .72);
    assert.ok(glider.state.airspeed < 14);
    assert.ok(glider.state.verticalSpeed > 0);
  });
  test(`${model.name} supplies a finite launch origin when the host provides a site`, () => {
    const glider = createGlider({ model, at: { x: 2, z: 3 } });
    const site = { ground: () => 100, fall: () => 0, edgeAhead: () => 15 };
    const launch = glider.launch({ site });
    launch.step(1 / 60);
    assert.equal(glider.state.y, 102.3);
    assert.ok(Number.isFinite(launch.state.lift));
    assert.ok(Number.isFinite(launch.pose().height));
  });
}
