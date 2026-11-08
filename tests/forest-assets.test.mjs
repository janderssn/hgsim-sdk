import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const base = new URL('../range/assets/forest/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('forest.json', base)));
const bytes = fs.readFileSync(new URL(manifest.geometry, base));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binary = bytes.subarray(28 + jsonLength);
function accessor(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  const types = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array };
  const Type = types[a.componentType];
  const start = view.byteOffset + (a.byteOffset ?? 0);
  // Copy to a naturally aligned ArrayBuffer; Buffer offsets need not align.
  const b = binary.subarray(start, start + view.byteLength);
  return new Type(Uint8Array.from(b).buffer);
}
function readPNG(name) {
  const source = fs.readFileSync(new URL(name, base));
  assert.equal(source.subarray(1,4).toString(), 'PNG');
  const idat = []; let width, height;
  for (let offset = 8; offset < source.length;) {
    const length = source.readUInt32BE(offset), tag = source.toString('ascii',offset+4,offset+8);
    const data = source.subarray(offset+8,offset+8+length);
    if (tag === 'IHDR') { width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],6); }
    if (tag === 'IDAT') idat.push(data);
    offset += length + 12;
  }
  const scan = inflateSync(Buffer.concat(idat)), stride = width*4, rgba = new Uint8Array(width*height*4);
  const paeth = (a,b,c) => { const p=a+b-c, da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c; };
  let offset = 0;
  for(let y=0;y<height;y++) {
    const filter=scan[offset++];
    for(let x=0;x<stride;x++) {
      const i=y*stride+x,a=x>=4?rgba[i-4]:0,b=y?rgba[i-stride]:0,c=y&&x>=4?rgba[i-stride-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      assert.ok(filter<=4);
      rgba[i]=(scan[offset++]+predictor)&255;
    }
  }
  return {width,height,rgba};
}

test('forest mesh library contains complete, bounded near/mid crowns with valid topology', () => {
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(manifest.variants.length,4);
  for(const variant of manifest.variants) {
    let nearTotal=0,midTotal=0;
    for(const [level,label] of [['near','Near'],['mid','Mid']]) {
      for(const [part,key] of [['Leaves','leaves'],['Bark','bark']]) {
        const mesh=gltf.meshes.find(mesh=>mesh.name===`${variant.id}_${part}${label}`);
        assert.ok(mesh,`${variant.id} ${part}${label}`);
        const primitive=mesh.primitives[0],positions=accessor(primitive.attributes.POSITION),indices=accessor(primitive.indices),normals=accessor(primitive.attributes.NORMAL);
        assert.equal(indices.length/3,variant.triangles[level][key]);
        for(const index of indices) assert.ok(index<positions.length/3);
        if(part==='Leaves') {
          const uv=accessor(primitive.attributes.TEXCOORD_0);
          assert.equal(uv[1],0,'top of shoot samples top of glTF image');
          assert.equal(uv[3],1,'attached stem samples bottom of glTF image');
        }
        for(const coordinate of positions) assert.ok(Number.isFinite(coordinate));
        for(let i=0;i<normals.length;i+=3) assert.ok(Math.abs(Math.hypot(normals[i],normals[i+1],normals[i+2])-1)<.01);
        if(level==='near')nearTotal+=indices.length/3;else midTotal+=indices.length/3;
      }
    }
    assert.ok(nearTotal<22000);
    assert.ok(midTotal<nearTotal*.32,'mid LOD saves actual geometry');
    assert.ok(variant.radius>2&&variant.radius<12);
    assert.deepEqual(variant.impostor.elevations,[0,30,60,90]);
  }
});

test('all forest author images retain their pinned package checksums', () => {
  for(const [name,{sha256}] of Object.entries(manifest.textures)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(new URL('textures/'+name,base))).digest('hex'),sha256,name);
  }
});

test('every azimuth/elevation atlas tile has cutout coverage and linear unit normals', () => {
  for(const variant of manifest.variants) {
    const albedo=readPNG(variant.impostor.albedo),normals=readPNG(variant.impostor.normals),cell=variant.impostor.cellSize;
    assert.equal(albedo.width,cell*8);assert.equal(albedo.height,cell*4);
    assert.equal(normals.width,albedo.width);assert.equal(normals.height,albedo.height);
    for(let row=0;row<4;row++)for(let column=0;column<8;column++) {
      let coverage=0,checked=0,badNormals=0; const normalLengths=[];
      for(let y=0;y<cell;y++)for(let x=0;x<cell;x++) {
        const i=((row*cell+y)*albedo.width+column*cell+x)*4;
        if(albedo.rgba[i+3]>180)coverage++;
        if(normals.rgba[i+3]>250) {
          const n=normals.rgba;const length=Math.hypot(n[i]/127.5-1,n[i+1]/127.5-1,n[i+2]/127.5-1);
          // MSAA averages neighboring surface vectors at fully covered pixels;
          // runtime renormalizes them. Gamma-encoded/clipped vectors exceed 1.
          if(length>1.035||length<.2)badNormals++;
          normalLengths.push(length);
          checked++;
        }
      }
      assert.ok(coverage>cell*cell*.013&&coverage<cell*cell*.45,`${variant.id} tile ${row},${column}: ${coverage} pixels`);
      assert.ok(checked>500);
      assert.ok(badNormals/checked<.04,`${variant.id} tile normals must remain linear tree-local data`);
      normalLengths.sort((a,b)=>a-b);
      assert.ok(Math.abs(normalLengths[Math.floor(normalLengths.length/2)]-1)<.025,'unmixed normals retain unit length');
    }
  }
});
