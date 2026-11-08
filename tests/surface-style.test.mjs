import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sampleGroundStyle, GROUND_PALETTE } from '../range/surface-style.js';

test('world pigment is deterministic, bounded and follows wet soil and mowing', () => {
  for (let x = -1500; x <= 1500; x += 91) for (let z = -1500; z <= 1500; z += 137) {
    const style = sampleGroundStyle(x, z, { moisture: .4, canopy: .2, path: .1 });
    assert.deepEqual(style, sampleGroundStyle(x, z, { moisture: .4, canopy: .2, path: .1 }));
    for (const value of [style.dryness, style.mown, style.patch, style.variation, style.wear, ...style.color]) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
    const wet = sampleGroundStyle(x, z, { moisture: .9, canopy: .6 });
    const dry = sampleGroundStyle(x, z, { moisture: .1 });
    assert.ok(wet.dryness <= dry.dryness, 'moist woodland never becomes drier than the same open soil');
  }
  assert.equal(sampleGroundStyle(0, 0).mown, 1);
  assert.equal(sampleGroundStyle(400, 0).mown, 0);
  const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
  const meadow = sampleGroundStyle(420, -230), path = sampleGroundStyle(420, -230, { path: 1 });
  assert.ok(distance(path.color, GROUND_PALETTE.umber) < distance(meadow.color, GROUND_PALETTE.umber));
});

test('meadow communities follow moisture and keep bare soil out of wet and mown grass', () => {
  let dryWear = 0, wetWear = 0, dryWarmth = 0, wetWarmth = 0;
  for (let x = 220; x <= 700; x += 13) for (let z = -300; z <= 300; z += 17) {
    const dry = sampleGroundStyle(x, z, { moisture: .1 });
    const wet = sampleGroundStyle(x, z, { moisture: .9 });
    dryWear += dry.wear; wetWear += wet.wear;
    dryWarmth += dry.color[0] / dry.color[1];
    wetWarmth += wet.color[0] / wet.color[1];
  }
  assert.ok(dryWear > 1, 'dry meadow retains occasional exposed soil pockets');
  assert.ok(wetWear < dryWear * .1, 'soil pigment follows dry exposure, not arbitrary brown stains');
  assert.ok(dryWarmth > wetWarmth * 1.1, 'senescent grass is warmer than the green moist community');

  const luma = ({ color: c }) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  const values = [[], []];
  for (let x = -70; x <= 70; x += 7) for (let z = -40; z <= 40; z += 8) {
    const mown = sampleGroundStyle(x, z, { moisture: .4 });
    const meadow = sampleGroundStyle(x + 600, z, { moisture: .4 });
    assert.ok(mown.wear <= .046, 'the protected target keeps its living cover');
    values[0].push(luma(mown)); values[1].push(luma(meadow));
  }
  const variance = xs => {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    return xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / xs.length;
  };
  assert.ok(variance(values[0]) < variance(values[1]) * .1,
    'the mown landing field remains calmer and readable beside the natural meadow');
});

test('baked aerial sward has attributable source bytes and restrained visible contrast', async () => {
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('range/assets/materials/terrain-controls.json', root)));
  const sward = manifest.paint_atlas.aerial_sward;
  assert.ok(sward, 'the unique world atlas retains the middle-distance sward layer');
  const hash = data => createHash('sha256').update(data).digest('hex');
  assert.equal(hash(await readFile(new URL(sward.source, root))), sward.sha256,
    'a source scan change requires rebaking the world atlas');
  const provenanceBytes = await readFile(new URL(sward.provenance, root));
  assert.equal(hash(provenanceBytes), sward.provenance_sha256);
  const provenance = JSON.parse(provenanceBytes);
  assert.equal(provenance.license, 'CC0-1.0');
  assert.equal(provenance.color.sha256, sward.sha256);
  assert.ok(sward.gain_range[0] >= .85 && sward.gain_range[1] <= 1.15,
    'scan luminance cannot overwhelm the authored vegetation reflectance');
  assert.ok(Math.abs(sward.mean_gain - 1) < .005, 'scan detail does not shift global exposure');
  assert.ok(sward.gain_standard_deviation > .025, 'the filtered middle layer retains visible structure');
  assert.equal(sward.maximum_contrast.protected_target, .05);
});
