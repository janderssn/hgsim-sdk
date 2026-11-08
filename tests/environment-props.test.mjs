import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { extractEnvironmentProps, parseGLB, PROP_NAMES } from '../tools/extract-environment-props.mjs';

const originalBytes = fs.readFileSync(new URL('../range/assets/alpine/environment.glb', import.meta.url));
const compactBytes = fs.readFileSync(new URL('../range/assets/alpine/props.glb', import.meta.url));
const original = parseGLB(originalBytes), compact = parseGLB(compactBytes);
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const bytesPerComponent = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

function accessorBytes(asset, index) {
  const accessor = asset.document.accessors[index], view = asset.document.bufferViews[accessor.bufferView];
  const size = components[accessor.type] * bytesPerComponent[accessor.componentType];
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0), stride = view.byteStride || size;
  return Buffer.concat(Array.from({ length: accessor.count }, (_, row) => asset.binary.subarray(offset + row * stride, offset + row * stride + size)));
}

function worldMatrix(document, index) {
  const node = document.nodes[index], local = new THREE.Matrix4();
  if (node.matrix) local.fromArray(node.matrix);
  else local.compose(new THREE.Vector3(...(node.translation || [0, 0, 0])),
    new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(node.scale || [1, 1, 1])));
  const parent = document.nodes.findIndex(candidate => candidate.children?.includes(index));
  return parent < 0 ? local : worldMatrix(document, parent).multiply(local);
}

function propBounds(asset, name) {
  const box = new THREE.Box3(), point = new THREE.Vector3();
  function visit(index) {
    const node = asset.document.nodes[index];
    if (node.mesh !== undefined) for (const primitive of asset.document.meshes[node.mesh].primitives) {
      const accessor = asset.document.accessors[primitive.attributes.POSITION];
      assert.equal(accessor.componentType, 5126);
      const bytes = accessorBytes(asset, primitive.attributes.POSITION), matrix = worldMatrix(asset.document, index);
      for (let vertex = 0; vertex < accessor.count; vertex++) {
        point.set(bytes.readFloatLE(vertex * 12), bytes.readFloatLE(vertex * 12 + 4), bytes.readFloatLE(vertex * 12 + 8));
        box.expandByPoint(point.applyMatrix4(matrix));
      }
    }
    for (const child of node.children || []) visit(child);
  }
  visit(asset.document.nodes.findIndex(node => node.name === name));
  return [...box.min.toArray(), ...box.max.toArray()];
}

function encodeGLB(document, binary) {
  const json = Buffer.from(JSON.stringify(document)), length = (json.length + 3) & ~3;
  const output = Buffer.alloc(28 + length + binary.length, 0x20);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  output.writeUInt32LE(binary.length, 20 + length); output.writeUInt32LE(0x004e4942, 24 + length);
  binary.copy(output, 28 + length); return output;
}

test('props library deterministically strips obsolete tree geometry and embedded tree images', () => {
  assert.deepEqual(extractEnvironmentProps(originalBytes), compactBytes, 'committed artifact matches its extractor');
  assert.deepEqual(extractEnvironmentProps(originalBytes), compactBytes, 'repeated extraction is byte-for-byte deterministic');
  assert.ok(compactBytes.length < originalBytes.length * .1, 'startup library is less than one tenth of the original');
  assert.ok(compactBytes.length < 300_000);
  assert.equal(compact.document.nodes.length, 12);
  assert.equal(compact.document.meshes.length, 6);
  for (const name of PROP_NAMES) assert.ok(compact.document.nodes.some(node => node.name === name));
  for (const key of ['images', 'textures', 'samplers', 'extensionsUsed', 'extensionsRequired']) assert.equal(compact.document[key], undefined);
  assert.equal(/spruce|atlas|image\/webp/i.test(JSON.stringify(compact.document)), false);
  assert.equal(compact.document.asset.extras.sourceSha256, createHash('sha256').update(originalBytes).digest('hex'));
  for (const view of compact.document.bufferViews) {
    assert.equal(view.buffer, 0); assert.equal(view.byteOffset % 4, 0);
    assert.ok(view.byteOffset + view.byteLength <= compact.document.buffers[0].byteLength);
  }
});

test('every original prop retains exact transforms, accessor data, materials and world bounds', () => {
  for (const node of compact.document.nodes) {
    const source = original.document.nodes.find(candidate => candidate.name === node.name);
    const strip = value => { const result = structuredClone(value); delete result.mesh; delete result.children; return result; };
    assert.deepEqual(strip(node), strip(source), node.name);
    assert.deepEqual(worldMatrix(compact.document, compact.document.nodes.indexOf(node)).elements,
      worldMatrix(original.document, original.document.nodes.indexOf(source)).elements);
  }
  for (const mesh of compact.document.meshes) {
    const source = original.document.meshes.find(candidate => candidate.name === mesh.name);
    assert.equal(mesh.primitives.length, source.primitives.length, mesh.name);
    mesh.primitives.forEach((primitive, index) => {
      const before = source.primitives[index];
      assert.equal(primitive.mode, before.mode);
      assert.deepEqual(Object.keys(primitive.attributes), Object.keys(before.attributes));
      for (const semantic of Object.keys(primitive.attributes)) {
        assert.deepEqual(accessorBytes(compact, primitive.attributes[semantic]), accessorBytes(original, before.attributes[semantic]), `${mesh.name} ${semantic}`);
        const metadata = (asset, accessor) => { const value = structuredClone(asset.document.accessors[accessor]); delete value.bufferView; return value; };
        assert.deepEqual(metadata(compact, primitive.attributes[semantic]), metadata(original, before.attributes[semantic]));
      }
      assert.deepEqual(accessorBytes(compact, primitive.indices), accessorBytes(original, before.indices), `${mesh.name} indices`);
      assert.deepEqual(compact.document.materials[primitive.material], original.document.materials[before.material]);
    });
  }
  for (const name of PROP_NAMES) assert.deepEqual(propBounds(compact, name), propBounds(original, name), name);
});

test('subset retains ancestor transforms while pruning unrelated sibling geometry', () => {
  const source = structuredClone(original.document), root = source.nodes.findIndex(node => node.name === 'BoulderA');
  const ancestor = source.nodes.length;
  source.nodes.push({ name: 'TransformedParent', translation: [18, 27, -6], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    scale: [2, 3, 4], children: [root, 0], mesh: 0 });
  source.scenes[0].nodes = [ancestor];
  const bytes = encodeGLB(source, original.binary), result = parseGLB(extractEnvironmentProps(bytes, { props: ['BoulderA'] }));
  const parent = result.document.nodes.find(node => node.name === 'TransformedParent');
  assert.equal(parent.mesh, undefined, 'ancestor mesh is unrelated to the selected prop');
  assert.equal(parent.children.length, 1, 'unrelated spruce sibling is removed');
  assert.deepEqual(propBounds(result, 'BoulderA'), propBounds({ document: source, binary: original.binary }, 'BoulderA'));
  assert.equal(result.document.meshes.length, 1);
});
