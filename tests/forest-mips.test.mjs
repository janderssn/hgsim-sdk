import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeForestMipChain } from '../range/forest-textures.js';

const base = new URL('../range/assets/forest/', import.meta.url);
const report = JSON.parse(fs.readFileSync(new URL('mip-diagnostics.json', base)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function chain(file) {
  const raw=gunzipSync(fs.readFileSync(new URL(file,base)));
  return decodeForestMipChain(Uint8Array.from(raw).buffer);
}

test('forest mip chains retain input provenance, independent views and transparent surface RGB', () => {
  assert.equal(report.storedLevels,9);
  for(const variant of Object.values(report.variants)) {
    for(const [source,checksum] of Object.entries(variant.sourceImages)) assert.equal(sha(fs.readFileSync(new URL(source,base))),checksum,'source PNG changes require rebuilding the mip chain');
    for(const kind of ['albedo','normal']) {
      const artifact=variant[kind];
      assert.equal(sha(fs.readFileSync(new URL(artifact.file,base))),artifact.sha256);
      const decoded=chain(artifact.file);
      assert.equal(decoded.mipmaps.length,9);
      assert.deepEqual([decoded.mipmaps[8].width,decoded.mipmaps[8].height],[8,4]);
      for(const mip of decoded.mipmaps) {
        for(let i=0;i<mip.data.length;i+=4) if(mip.data[i+3]===0) {
          assert.ok(mip.data[i]||mip.data[i+1]||mip.data[i+2],`${kind}: transparent texel RGB must carry surface padding`);
        }
      }
    }
  }
});

test('flight-distance mip normals remain unit surface data with unchanged cutout coverage', () => {
  for(const variant of Object.values(report.variants)) {
    const normals=chain(variant.normal.file);
    for(let level=1;level<=5;level++) {
      const {data}=normals.mipmaps[level];let visible=0;
      for(let i=0;i<data.length;i+=4) if(data[i+3]>96) {
        const length=Math.hypot(data[i]/127.5-1,data[i+1]/127.5-1,data[i+2]/127.5-1);
        assert.ok(Math.abs(length-1)<.012,'filtered normals are normalized after alpha-weighted averaging');visible++;
      }
      assert.ok(visible>30);
      const d=variant.diagnostics[level];
      assert.equal(d.coverageAfter,d.coverageBefore,'RGB correction must preserve visibility alpha');
      assert.ok(d.normalAlignmentAfter>.999);
      assert.ok(d.albedoLumaFractionAfter>.999);
    }
    assert.ok(variant.diagnostics[4].normalAlignmentBefore<.9,'fixture exercises a real minified-normal regression');
  }
});
