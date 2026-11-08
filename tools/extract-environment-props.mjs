#!/usr/bin/env node
/** Deterministically subset the original static Blender library without re-exporting geometry. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROP_NAMES = ['BoulderA', 'BoulderB', 'Cairn', 'TrailSign', 'EquipmentCrate', 'Cabin'];
const align4 = value => (value + 3) & ~3;
const sorted = values => [...values].sort((a, b) => a - b);
const clone = value => structuredClone(value);

export function parseGLB(bytes) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2
    || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Expected a complete glTF 2 GLB');
  let document, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + length > bytes.length) throw new Error('Truncated GLB chunk');
    if (type === 0x4e4f534a) document = JSON.parse(bytes.subarray(start, start + length).toString('utf8'));
    else if (type === 0x004e4942) binary = bytes.subarray(start, start + length);
    offset = start + length;
  }
  if (!document || !binary || document.buffers?.length !== 1 || document.buffers[0].uri) {
    throw new Error('Expected one embedded binary buffer');
  }
  return { document, binary };
}

function textureInfos(object, visit) {
  if (!object || typeof object !== 'object') return;
  for (const [key, value] of Object.entries(object)) {
    if (key.endsWith('Texture') && value && typeof value.index === 'number') visit(value);
    else if (value && typeof value === 'object') textureInfos(value, visit);
  }
}

function remapping(indices) {
  const order = sorted(indices);
  return { order, index: new Map(order.map((old, next) => [old, next])) };
}

export function extractEnvironmentProps(bytes, { props = PROP_NAMES } = {}) {
  const { document: source, binary } = parseGLB(bytes);
  if (source.animations?.length || source.extensions) throw new Error('Subsetter supports static scene libraries without document extensions');
  const selected = new Set(), keep = new Set(), parents = new Map();
  source.nodes.forEach((node, index) => { for (const child of node.children || []) parents.set(child, index); });
  function descendants(index) {
    if (selected.has(index)) return;
    selected.add(index); keep.add(index);
    for (const child of source.nodes[index].children || []) descendants(child);
  }
  for (const name of props) {
    const index = source.nodes.findIndex(node => node.name === name);
    if (index < 0) throw new Error(`Missing required prop ${name}`);
    descendants(index);
    for (let parent = parents.get(index); parent !== undefined; parent = parents.get(parent)) keep.add(parent);
  }
  const nodes = remapping(keep), meshesUsed = new Set();
  for (const index of selected) {
    const node = source.nodes[index];
    if (node.skin !== undefined) throw new Error('Selected props must not be skinned');
    if (node.mesh !== undefined) meshesUsed.add(node.mesh);
  }
  const meshes = remapping(meshesUsed), materialsUsed = new Set(), accessorsUsed = new Set();
  for (const index of meshes.order) for (const primitive of source.meshes[index].primitives) {
    if (primitive.extensions) throw new Error('Compressed or extended primitives need an explicit extraction adapter');
    if (primitive.material !== undefined) materialsUsed.add(primitive.material);
    if (primitive.indices !== undefined) accessorsUsed.add(primitive.indices);
    for (const accessor of Object.values(primitive.attributes || {})) accessorsUsed.add(accessor);
    for (const target of primitive.targets || []) for (const accessor of Object.values(target)) accessorsUsed.add(accessor);
  }
  const materials = remapping(materialsUsed), texturesUsed = new Set();
  for (const index of materials.order) textureInfos(source.materials[index], info => texturesUsed.add(info.index));
  const textures = remapping(texturesUsed), imagesUsed = new Set(), samplersUsed = new Set();
  for (const index of textures.order) {
    const texture = source.textures[index];
    if (texture.source !== undefined) imagesUsed.add(texture.source);
    if (texture.sampler !== undefined) samplersUsed.add(texture.sampler);
    for (const extension of Object.values(texture.extensions || {})) if (extension.source !== undefined) imagesUsed.add(extension.source);
  }
  const accessors = remapping(accessorsUsed), images = remapping(imagesUsed), samplers = remapping(samplersUsed);
  const viewsUsed = new Set();
  for (const index of accessors.order) {
    const accessor = source.accessors[index];
    if (accessor.bufferView !== undefined) viewsUsed.add(accessor.bufferView);
    if (accessor.sparse) { viewsUsed.add(accessor.sparse.indices.bufferView); viewsUsed.add(accessor.sparse.values.bufferView); }
  }
  for (const index of images.order) {
    const image = source.images[index];
    if (image.bufferView === undefined || image.uri) throw new Error('Retained images must be embedded');
    viewsUsed.add(image.bufferView);
  }
  const views = remapping(viewsUsed), chunks = [];
  let binaryLength = 0;
  const bufferViews = views.order.map(index => {
    const view = clone(source.bufferViews[index]);
    if ((view.buffer || 0) !== 0 || view.extensions) throw new Error('Only ordinary embedded bufferViews are supported');
    const start = view.byteOffset || 0;
    if (start + view.byteLength > binary.length) throw new Error('bufferView exceeds the source binary');
    const offset = align4(binaryLength);
    chunks.push({ offset, data: binary.subarray(start, start + view.byteLength) });
    view.buffer = 0; view.byteOffset = offset;
    binaryLength = offset + view.byteLength;
    return view;
  });
  const output = {
    asset: { ...clone(source.asset), extras: { ...clone(source.asset.extras || {}),
      source: 'environment.glb', sourceSha256: createHash('sha256').update(bytes).digest('hex'),
      extractor: 'tools/extract-environment-props.mjs', props: [...props] } },
    scene: source.scene || 0,
    scenes: source.scenes.map(scene => ({ ...clone(scene), nodes: (scene.nodes || []).filter(index => keep.has(index)).map(index => nodes.index.get(index)) })),
    nodes: nodes.order.map(index => {
      const node = clone(source.nodes[index]);
      if (node.children) node.children = node.children.filter(child => keep.has(child)).map(child => nodes.index.get(child));
      if (!selected.has(index)) { delete node.mesh; delete node.camera; delete node.skin; }
      else if (node.mesh !== undefined) node.mesh = meshes.index.get(node.mesh);
      return node;
    }),
    materials: materials.order.map(index => {
      const material = clone(source.materials[index]);
      textureInfos(material, info => { info.index = textures.index.get(info.index); });
      return material;
    }),
    meshes: meshes.order.map(index => {
      const mesh = clone(source.meshes[index]);
      for (const primitive of mesh.primitives) {
        if (primitive.material !== undefined) primitive.material = materials.index.get(primitive.material);
        if (primitive.indices !== undefined) primitive.indices = accessors.index.get(primitive.indices);
        for (const key of Object.keys(primitive.attributes || {})) primitive.attributes[key] = accessors.index.get(primitive.attributes[key]);
        for (const target of primitive.targets || []) for (const key of Object.keys(target)) target[key] = accessors.index.get(target[key]);
      }
      return mesh;
    }),
    accessors: accessors.order.map(index => {
      const accessor = clone(source.accessors[index]);
      if (accessor.bufferView !== undefined) accessor.bufferView = views.index.get(accessor.bufferView);
      if (accessor.sparse) {
        accessor.sparse.indices.bufferView = views.index.get(accessor.sparse.indices.bufferView);
        accessor.sparse.values.bufferView = views.index.get(accessor.sparse.values.bufferView);
      }
      return accessor;
    }),
    bufferViews,
    buffers: [{ byteLength: align4(binaryLength) }],
  };
  if (textures.order.length) output.textures = textures.order.map(index => {
    const texture = clone(source.textures[index]);
    if (texture.source !== undefined) texture.source = images.index.get(texture.source);
    if (texture.sampler !== undefined) texture.sampler = samplers.index.get(texture.sampler);
    for (const extension of Object.values(texture.extensions || {})) if (extension.source !== undefined) extension.source = images.index.get(extension.source);
    return texture;
  });
  if (images.order.length) output.images = images.order.map(index => ({ ...clone(source.images[index]), bufferView: views.index.get(source.images[index].bufferView) }));
  if (samplers.order.length) output.samplers = samplers.order.map(index => clone(source.samplers[index]));
  const extensions = new Set();
  function usedExtensions(object) {
    if (!object || typeof object !== 'object') return;
    for (const [key, value] of Object.entries(object)) {
      if (key === 'extensions') for (const name of Object.keys(value)) extensions.add(name);
      usedExtensions(value);
    }
  }
  usedExtensions(output);
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    const retained = source[key]?.filter(name => extensions.has(name));
    if (retained?.length) output[key] = retained;
  }
  const json = Buffer.from(JSON.stringify(output)), jsonLength = align4(json.length);
  const binaryOutput = Buffer.alloc(align4(binaryLength));
  for (const { offset, data } of chunks) data.copy(binaryOutput, offset);
  const result = Buffer.alloc(12 + 8 + jsonLength + 8 + binaryOutput.length, 0x20);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonLength, 12); result.writeUInt32LE(0x4e4f534a, 16); json.copy(result, 20);
  const binaryHeader = 20 + jsonLength;
  result.writeUInt32LE(binaryOutput.length, binaryHeader); result.writeUInt32LE(0x004e4942, binaryHeader + 4);
  binaryOutput.copy(result, binaryHeader + 8);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2), inputArg = args.indexOf('--input'), outputArg = args.indexOf('--output');
  const input = inputArg < 0 ? path.join(root, 'range/assets/alpine/environment.glb') : path.resolve(args[inputArg + 1]);
  const output = outputArg < 0 ? path.join(root, 'range/assets/alpine/props.glb') : path.resolve(args[outputArg + 1]);
  const source = fs.readFileSync(input), props = extractEnvironmentProps(source);
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, props);
  console.log(`${path.relative(root, output)}: ${props.length.toLocaleString()} bytes (${(100 * props.length / source.length).toFixed(1)}% of source)`);
}
