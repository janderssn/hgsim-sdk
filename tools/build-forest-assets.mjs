/**
 * Deterministic full-crown forest authoring, without browser/runtime packages.
 * node tools/build-forest-assets.mjs --fetch-textures --geometry --bake
 * --fetch-textures downloads one integrity-pinned author package, then extracts
 * the exact embedded MIT textures by SHA256. --bake needs local Chromium/WebGL2.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import os from 'node:os';
import * as THREE from '../range/vendor/three.module.js';
import { Tree } from './vendor/ez-tree/tree.js';
import TreeOptions from './vendor/ez-tree/options.js';
import { TreePreset } from './vendor/ez-tree/presets/index.js';
import { launchChrome, connect, sleep } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'range/assets/forest');
const PIN = 'dcf309bd86bd521083d9c70f01f2de45fdc7c457';
const PACKAGE_INTEGRITY = '6pvS6hD6B6h00dm0SnkgYeT4ABU5Y1Z9M44p1tXiV5C0eKrQy2sKECXshoaUv0qAOqYVL68w/PwadUxDFDiHUg==';
// Packaged 1.1.0 leaves exactly match pinned source-revision LFS checksums.
const TEXTURES = {
  'pine-leaf.png': '88be36a2387554ac4b7c7d1549eae454a37ad896e8e33a7d6ae5956bd169ab08',
  'ash-leaf.png': '5ec987db3829a839856c32c79b18a33a78f209e911cad55c65abfb77f30e2d29',
  'pine-bark-color.jpg': '01389d2297e901a583d3d3f824c829689fce8afcffcb0eaabcb666688a781e70',
  'pine-bark-normal.jpg': 'f60be6b239e2a8aeb63dfb78d62a88c6ee05b241d78b69c197ff429eefb080d3',
  'pine-bark-roughness.jpg': '85b9fa99b700bbb629c90cee5deeebec78fef7cd40443aa361f5edb090fd3341',
  'birch-bark-color.jpg': 'aba7bb86f3d85abffe564c04990c8cfe3d341eea51739e7d48210cc3f550dc2a',
  'birch-bark-normal.jpg': '83376d62dca7b7f02880146f40d42d185314627a394058f440c3292aba48241e',
  'birch-bark-roughness.jpg': 'ea0d121fff979fee3c8417fca89dedac2c5c1f52aa09426ef3666467a35f0a3e',
};
const SPECIES = [
  { id: 'PineMature', name: 'Mature alpine pine', family: 'pine', age: 'mature', preset: 'pine_large', seed: 31337, height: 25, leaf: 'pine', bark: 'pine', tint: '#b3c2b4', edits: { children: 72, count: 27, width: .79, start: .38, leafSize: 2.6, angle: 100 } },
  { id: 'PineYoung', name: 'Young alpine pine', family: 'pine', age: 'young', preset: 'pine_small', seed: 8911, height: 14, leaf: 'pine', bark: 'pine', tint: '#c9cfb4', edits: { children: 51, count: 22, width: .72, start: .17, leafSize: 2.55, angle: 103 } },
  { id: 'FirMature', name: 'Mature silver fir', family: 'fir', age: 'mature', preset: 'pine_medium', seed: 24517, height: 27, leaf: 'pine', bark: 'pine', tint: '#a4b9b3', edits: { children: 95, count: 27, width: .57, start: .13, leafSize: 2.9, angle: 88 } },
  { id: 'AshMature', name: 'Green mountain ash', family: 'ash', age: 'mature', preset: 'ash_medium', seed: 9001, height: 20, leaf: 'ash', bark: 'birch', tint: '#c4d0b3' },
];
const MID_DETAIL = { sectionStride: 3, segmentFactor: .6, leafStride: 2, leafScale: 1.28, billboard: 'single' };

async function fetchTextures() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'hgsim-forest-source-'));
  try {
    const tarball = path.join(temp, 'source.tgz');
    const download = spawnSync('curl', ['-fsSL', '--max-time', '120', 'https://registry.npmjs.org/@dgreenheck/ez-tree/-/ez-tree-1.1.0.tgz', '-o', tarball], { encoding: 'utf8' });
    if (download.status !== 0) throw new Error(download.stderr || 'Author package download failed');
    const archive = await fs.readFile(tarball);
    if (createHash('sha512').update(archive).digest('base64') !== PACKAGE_INTEGRITY) throw new Error('Author package integrity mismatch');
    const extract = spawnSync('tar', ['-xzf', tarball, '-C', temp], { encoding: 'utf8' });
    if (extract.status !== 0) throw new Error(extract.stderr);
    const source = await fs.readFile(path.join(temp, 'package/build/ez-tree.es.js'), 'utf8');
    const images = new Map();
    for (const match of source.matchAll(/"data:image\/[^;]+;base64,([^"]+)"/g)) {
      const bytes = Buffer.from(match[1], 'base64'); images.set(createHash('sha256').update(bytes).digest('hex'), bytes);
    }
    await fs.mkdir(path.join(OUT, 'textures'), { recursive: true });
    for (const [name, sha] of Object.entries(TEXTURES)) {
      const image = images.get(sha);
      if (!image) throw new Error(`Pinned texture not present: ${name}`);
      await fs.writeFile(path.join(OUT, 'textures', name), image);
    }
    await fs.copyFile(path.join(temp, 'package/LICENSE'), path.join(OUT, 'EZ-TREE-LICENSE.txt'));
    console.log(`Extracted ${Object.keys(TEXTURES).length} verified author textures.`);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

function authorOptions(species) {
  const options = new TreeOptions();
  options.copy(structuredClone(TreePreset[species.preset]));
  options.seed = species.seed;
  options.leaves.roundedNormals = true;
  if (species.edits) {
    const e = species.edits;
    options.branch.children[0] = e.children;
    options.branch.length[1] *= e.width;
    options.branch.start[1] = e.start;
    options.branch.angle[1] = e.angle;
    options.branch.sections[1] = 8;
    options.branch.segments[1] = 4;
    options.branch.gnarliness[0] = .023;
    options.branch.gnarliness[1] = .06;
    options.leaves.count = e.count;
    options.leaves.size = e.leafSize;
    options.leaves.sizeVariance = .29;
    options.leaves.start = .12;
    options.leaves.angle = species.family === 'fir' ? 71 : 50;
  }
  if (species.family === 'ash') {
    options.leaves.size = 4.4; options.leaves.sizeVariance = .48;
    options.branch.segments[0] = 9; options.branch.segments[1] = 5;
  }
  return options;
}

function addCanopyOcclusion(geometry, bounds, species) {
  const p = geometry.attributes.position, colors = new Float32Array(p.count * 3);
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  for (let i = 0; i < p.count; i++) {
    const x = (p.getX(i) - center.x) / Math.max(1, size.x * .5), z = (p.getZ(i) - center.z) / Math.max(1, size.z * .5);
    const edge = Math.min(1, Math.hypot(x, z));
    const crownHeight = (p.getY(i) - bounds.min.y) / size.y;
    // Direction-independent cavity, not baked sunlight. Outer shoots stay open.
    const cavity = .72 + .21 * Math.sqrt(edge) + .07 * crownHeight;
    const variation = .97 + .03 * Math.sin(p.getX(i) * 7.23 + p.getY(i) * 3.7 + species.seed);
    colors.set([cavity * variation, cavity * variation, cavity * variation], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function createGLB(entries, materials) {
  const chunks = [], json = { asset: { version: '2.0', generator: 'hgsim forest authoring; EZ-Tree ' + PIN }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials, buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [], images: [], textures: [], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] };
  let offset = 0;
  const textureFiles = [];
  for (const mat of materials) {
    for (const reference of [mat.pbrMetallicRoughness.baseColorTexture, mat.normalTexture, mat.pbrMetallicRoughness.metallicRoughnessTexture]) {
      if (!reference?.uri) continue;
      let index = textureFiles.indexOf(reference.uri);
      if (index < 0) { index = textureFiles.length; textureFiles.push(reference.uri); json.images.push({ uri: reference.uri }); json.textures.push({ sampler: 0, source: index }); }
      reference.index = index; delete reference.uri;
    }
  }
  const accessor = (array, itemSize, isPosition = false) => {
    const padding = (4 - offset % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const bufferView = json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    const data = { bufferView, componentType: array instanceof Float32Array ? 5126 : array instanceof Uint32Array ? 5125 : 5123, count: array.length / itemSize, type: ['','SCALAR','VEC2','VEC3','VEC4'][itemSize] };
    if (isPosition) {
      data.min = Array.from({ length: itemSize }, () => Infinity); data.max = Array.from({ length: itemSize }, () => -Infinity);
      for (let i = 0; i < array.length; i++) { const axis = i % itemSize; data.min[axis] = Math.min(data.min[axis], array[i]); data.max[axis] = Math.max(data.max[axis], array[i]); }
    }
    return json.accessors.push(data) - 1;
  };
  for (const { name, geometry, material } of entries) {
    const attributes = {};
    for (const [source, target] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0'],['color','COLOR_0']]) {
      const attribute = geometry.attributes[source];
      if (attribute) {
        let values = attribute.array;
        // EZ-Tree/Three texture coordinates assume Texture.flipY=true. glTF
        // images use top-left UV origin and GLTFLoader sets flipY=false.
        if (source === 'uv') { values = values.slice(); for (let i = 1; i < values.length; i += 2) values[i] = 1 - values[i]; }
        attributes[target] = accessor(values, attribute.itemSize, source === 'position');
      }
    }
    const mesh = json.meshes.push({ name, primitives: [{ attributes, indices: accessor(geometry.index.array, 1), material }] }) - 1;
    const node = json.nodes.push({ name, mesh }) - 1; json.scenes[0].nodes.push(node);
  }
  json.buffers[0].byteLength = offset;
  let binary = Buffer.concat(chunks); if (binary.length % 4) binary = Buffer.concat([binary, Buffer.alloc(4 - binary.length % 4)]);
  let metadata = Buffer.from(JSON.stringify(json)); if (metadata.length % 4) metadata = Buffer.concat([metadata, Buffer.alloc(4 - metadata.length % 4, 32)]);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + metadata.length + binary.length, 8); header.writeUInt32LE(metadata.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8); binaryHeader.writeUInt32LE(binary.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, metadata, binaryHeader, binary]);
}

async function buildGeometry() {
  const entries = [], materials = [], variants = [];
  for (const species of SPECIES) {
    const options = authorOptions(species), tree = new Tree(options);
    const near = tree.createGeometry();
    const rawBounds = new THREE.Box3().setFromBufferAttribute(near.leaves.attributes.position);
    rawBounds.union(new THREE.Box3().setFromBufferAttribute(near.branches.attributes.position));
    const scale = species.height / rawBounds.max.y;
    const mid = tree.createGeometry(MID_DETAIL);
    for (const level of [near, mid]) for (const geometry of Object.values(level)) geometry.scale(scale, scale, scale);
    const bounds = new THREE.Box3().setFromBufferAttribute(near.leaves.attributes.position);
    bounds.union(new THREE.Box3().setFromBufferAttribute(near.branches.attributes.position));
    for (const level of [near, mid]) addCanopyOcclusion(level.leaves, bounds, species);
    const leafTint = new THREE.Color(species.tint);
    const foliageMaterial = materials.push({ name: species.id + 'Leaves', doubleSided: true, alphaMode: 'MASK', alphaCutoff: .35, pbrMetallicRoughness: { baseColorFactor: [leafTint.r, leafTint.g, leafTint.b, 1], baseColorTexture: { uri: `textures/${species.leaf}-leaf.png` }, roughnessFactor: 1, metallicFactor: 0 } }) - 1;
    const barkMaterial = materials.push({ name: species.id + 'Bark', normalTexture: { uri: `textures/${species.bark}-bark-normal.jpg`, scale: .75 }, pbrMetallicRoughness: { baseColorFactor: [1,1,1,1], baseColorTexture: { uri: `textures/${species.bark}-bark-color.jpg` }, metallicRoughnessTexture: { uri: `textures/${species.bark}-bark-roughness.jpg` }, roughnessFactor: 1, metallicFactor: 0 } }) - 1;
    for (const [label, level] of [['Near', near], ['Mid', mid]]) {
      entries.push({ name: species.id + '_Leaves' + label, geometry: level.leaves, material: foliageMaterial });
      entries.push({ name: species.id + '_Bark' + label, geometry: level.branches, material: barkMaterial });
    }
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    // Slight margin around every view prevents mip/neighbor-tile contamination.
    const diameter = Math.ceil(sphere.radius * 2 * 1.08 * 1000) / 1000;
    const triangles = level => ({ leaves: level.leaves.index.count / 3, bark: level.branches.index.count / 3 });
    const variant = { id: species.id, name: species.name, family: species.family, age: species.age, seed: species.seed, height: species.height, radius: Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z)), bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, triangles: { near: triangles(near), mid: triangles(mid) }, impostor: { albedo: species.id + '-albedo.png', normals: species.id + '-normal.png', center: sphere.center.toArray(), diameter, azimuths: 8, elevations: [0,30,60,90], cellSize: 256 } };
    variants.push(variant);
    console.log(`${species.id}: near ${near.leaves.index.count/3 + near.branches.index.count/3}, mid ${mid.leaves.index.count/3 + mid.branches.index.count/3} triangles`);
  }
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'forest.glb'), createGLB(entries, materials));
  const manifest = { version: 1, geometry: 'forest.glb', authoring: { source: 'https://github.com/dgreenheck/ez-tree', revision: PIN, nearDetail: {}, midDetail: MID_DETAIL, barkNormal: 'OpenGL tangent space', impostorNormal: 'tree-local Y-up; linear RGB', albedo: 'sRGB diffuse × direction-independent canopy cavity; no studio light' }, textures: Object.fromEntries(Object.entries(TEXTURES).map(([name, sha256]) => [name, { sha256 }])), variants };
  await fs.writeFile(path.join(OUT, 'forest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function bakeAtlases() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><body style="margin:0;background:#111"><script type="importmap">{"imports":{"three":"/range/vendor/three.module.js"}}</script><script type="module" src="/tools/forest-bake.js"></script></body></html>'); return; }
      const filename = path.resolve(ROOT, '.' + decodeURIComponent(pathname));
      if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
      const bytes = await fs.readFile(filename);
      response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' })[path.extname(filename)] ?? 'application/octet-stream');
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  try {
    const port = 9600 + Math.floor(Math.random() * 200);
    browser = await launchChrome({ port, width: 1280, height: 900 });
    page = await connect({ port });
    const errors = [];
    page.on(event => {
      if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description ?? event.params.exceptionDetails.text);
      if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') errors.push(event.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    let ready = false;
    for (let i = 0; i < 240; i++) { if (await page.eval('!!window.forestBaker')) { ready = true; break; } if (errors.length) throw new Error(errors.join('\n')); await sleep(250); }
    if (!ready) throw new Error('Forest authoring browser did not initialize');
    const manifest = JSON.parse(await fs.readFile(path.join(OUT, 'forest.json')));
    if (flags.has('--bake') || flags.has('--bake-normals')) for (let variant = 0; variant < manifest.variants.length; variant++) {
      for (const pass of flags.has('--bake-normals') ? ['normal'] : ['albedo', 'normal']) {
        const url = await page.eval(`forestBaker.bake(${variant}, ${JSON.stringify(pass)})`);
        const filename = `${manifest.variants[variant].id}-${pass}.png`;
        await fs.writeFile(path.join(OUT, filename), Buffer.from(url.split(',')[1], 'base64'));
        console.log('Baked ' + filename);
      }
    }
    if (flags.has('--bake')) {
      const contactSheet = await page.eval('forestBaker.preview()');
      await fs.writeFile(path.join(OUT, 'species-preview.jpg'), Buffer.from(contactSheet.split(',')[1], 'base64'));
    }
    if (flags.has('--verify')) {
      const result = await page.eval('forestBaker.verify()');
      await fs.mkdir(path.join(ROOT, 'work'), { recursive: true });
      for (const view of ['perspective', 'overhead']) await fs.writeFile(path.join(ROOT, 'work/forest-' + view + '.jpg'), Buffer.from(result[view].split(',')[1], 'base64'));
      console.log('Impostor render check: ' + JSON.stringify({ programs: result.programs, draws: result.draws }));
    }
    if (errors.length) throw new Error(errors.join('\n'));
  } finally { page?.close(); await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}

const flags = new Set(process.argv.slice(2));
if (!flags.size) console.log('Use --fetch-textures, --geometry, --bake (can be combined).');
if (flags.has('--fetch-textures')) await fetchTextures();
if (flags.has('--geometry')) await buildGeometry();
if (flags.has('--bake') || flags.has('--bake-normals') || flags.has('--verify')) await bakeAtlases();
