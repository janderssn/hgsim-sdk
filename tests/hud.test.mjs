import assert from 'node:assert/strict';
import test from 'node:test';
import { createHud } from '../range/hud.js';

function fakeDocument() {
  const nodes = new Map();
  let writes = 0, lookups = 0;
  const root = {
    getElementById(id) {
      assert.notEqual(id, 'warn', 'the removed warning popup must never be requested');
      lookups++;
      if (!nodes.has(id)) {
        const node = { classList: { toggle(name, enabled) { writes++; node[name] = enabled; } } };
        for (const property of ['textContent', 'innerHTML', 'className']) {
          let value;
          Object.defineProperty(node, property, { get: () => value, set(next) { writes++; value = next; } });
        }
        nodes.set(id, node);
      }
      return nodes.get(id);
    },
  };
  return { root, nodes, writes: () => writes, lookups: () => lookups };
}

const flight = {
  mode: 'gliding', speed: 10, verticalSpeed: -.8, agl: 30, distance: 62,
  alpha: Math.PI / 18, stalled: false, stallWarning: false, pullUp: false,
  padActive: false, pilotStand: false, launchPhase: null, realLaunch: false, launchSite: 'ramp',
  wind: { speed: 5, from: 0, meanSpeed: 5, meanFrom: 180 },
};

test('a steady flight performs no repeated DOM lookups or unchanged DOM writes', () => {
  const dom = fakeDocument(), hud = createHud(dom.root);
  hud.update(flight);
  const firstWrites = dom.writes(), firstLookups = dom.lookups();
  for (let i = 0; i < 120; i++) hud.update({ ...flight });
  assert.equal(dom.writes(), firstWrites);
  assert.equal(dom.lookups(), firstLookups);
  assert.equal(dom.nodes.get('speed').textContent, '36');
  assert.equal(dom.nodes.get('vario').textContent, '-0.8');
  assert.equal(dom.nodes.get('agl').textContent, '28');
  assert.equal(dom.nodes.get('alpha').textContent, '10°');
  assert.equal(dom.nodes.get('windNow').innerHTML, '5.0 m/s from the S <small>(mean 5.0 m/s from 180°)</small>');

  // Differences below the displayed precision should also avoid mutations.
  hud.update({ ...flight, speed: 10.01, distance: 62.01, wind: { ...flight.wind, speed: 5.01 } });
  assert.equal(dom.writes(), firstWrites);
});

test('stall information stays in the instrument without restoring removed popups', () => {
  const dom = fakeDocument(), hud = createHud(dom.root);
  hud.update({ ...flight, stalled: true });
  assert.equal(dom.nodes.get('alpha').textContent, '10° stall');
  assert.equal(dom.nodes.has('warn'), false);
  hud.update({ ...flight, verticalSpeed: 2 });
  assert.equal(dom.nodes.get('varioBox').className, 'vario up');
});

test('control hints follow flight posture, gamepad, and realistic launch phases', () => {
  const dom = fakeDocument(), hud = createHud(dom.root), hints = () => dom.nodes.get('hints').innerHTML;
  hud.update(flight);
  assert.match(hints(), /sit up \(slow down\)/);
  hud.update({ ...flight, pilotStand: true });
  assert.match(hints(), /go prone/);
  hud.update({ ...flight, padActive: true });
  assert.match(hints(), /<b>RT<\/b>dive/);
  hud.update({ ...flight, mode: 'ready', realLaunch: true, launchPhase: 'balance' });
  assert.match(hints(), /start the run/);
  hud.update({ ...flight, mode: 'ready', realLaunch: true, launchPhase: 'run' });
  assert.match(hints(), /jump off as it lifts/);
  hud.update({ ...flight, mode: 'ready', launchSite: 'cliff' });
  assert.match(hints(), /pick up and step off the cliff/);
  assert.equal(dom.nodes.get('alpha').textContent, '—');
});
