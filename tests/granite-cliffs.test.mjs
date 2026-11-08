import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { ROCKS, rockRing } from '../range/world.js';
import { graniteSection, createGraniteCliffGeometry } from '../range/granite-cliffs.js';

test('fractured cliff walls enclose the existing collision inset at every ledge', () => {
  for (const [seed, rock] of ROCKS.entries()) {
    for (const k of [0, .025, .1, .21, .375, .6, .86, 1]) {
      for (const ledge of [-.018, .018]) {
        const section = graniteSection(rock, k, seed, ledge);
        const ring = rockRing(rock, k);
        for (const [index, a] of section.entries()) {
          const b = section[(index + 1) % section.length];
          for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            const x = (a.x * (1 - t) + b.x * t - rock.cx) / ring.rx;
            const z = (a.z * (1 - t) + b.z * t - rock.cz) / ring.rz;
            assert.ok(Math.hypot(x, z) >= .90, 'physical 0.88 rock remains inside visible wall');
          }
        }
      }
    }
  }
});

test('granite geometry has a level launch cap, finite fracture normals, and bounded detail', () => {
  for (const [seed, rock] of ROCKS.entries()) {
    const geometry = createGraniteCliffGeometry(THREE, rock, seed);
    assert.ok(geometry.attributes.position.count / 3 < 4000);
    assert.equal(geometry.groups.length, 2, 'the entire cliff uses only two material draws');
    assert.ok(geometry.groups.some(group => group.materialIndex === 1), 'joints and underside faces have distinct shading');
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
    const positions = geometry.attributes.position;
    let cap = 0;
    for (let index = 0; index < positions.count; index++) {
      if (Math.abs(positions.getY(index) - (rock.top - .4)) < .0001) cap++;
    }
    assert.ok(cap > 200, 'the usable cliff top remains at the authored standing height');
    assert.ok(geometry.boundingBox.max.y <= rock.top + .01);
  }
});

test('seeded buttresses break rotational symmetry while preserving the top rim', () => {
  const counts = [];
  for (const [seed, rock] of ROCKS.entries()) {
    const middle = graniteSection(rock, .5, seed);
    counts.push(middle.length);
    const radii = middle.map(point => Math.hypot(point.nx, point.nz));
    assert.ok(Math.max(...radii) / Math.min(...radii) > 1.2,
      'outward fracture masses visibly vary the mid-wall silhouette');
    const top = graniteSection(rock, 0, seed, .018);
    assert.ok(Math.max(...top.map(point => Math.hypot(point.nx, point.nz))) < 1.17,
      'only the outer top rim is chipped; the central cap is not expanded');
  }
  assert.notEqual(counts[0], counts[1], 'adjacent cliffs do not share an identical rotational profile');
});
