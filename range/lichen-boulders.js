/** Rounded granite blocks and their smaller fallen siblings. Original mesh kit. */
const clamp = x => Math.max(0, Math.min(1, x));
const random = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function createWeatheredBoulderGeometry(THREE, seed = 0) {
  const source = new THREE.IcosahedronGeometry(1, 4), input = source.attributes.position;
  const positions = [], colors = [], indices = [], vertices = new Map();
  for (let i = 0; i < input.count; i++) {
    const x = input.getX(i), y = input.getY(i), z = input.getZ(i), key = [x, y, z].map(v => Math.round(v * 1e5)).join(',');
    let index = vertices.get(key);
    if (index === undefined) {
      index = positions.length / 3; vertices.set(key, index);
      const phase = seed * 1.73;
      const weather = Math.sin(x * 3.4 + phase) * Math.cos(y * 4.1 - z * 2.4)
        + .32 * Math.sin(x * 8 + y * 5 - z * 7 + phase);
      const radius = 1 + weather * .14;
      // Softly squared faces survive in silhouette, with no crystalline spikes.
      const rounded = value => Math.sign(value) * Math.abs(value) ** .74;
      const clip = (value, low, high) => Math.max(low, Math.min(high, value));
      positions.push(clip(rounded(x) * radius, -.94, .93),
        clip(rounded(y) * radius, -.95, .74 + x * .22 - z * .16) * .84 + x * .055,
        clip(rounded(z) * radius, -.96, .90));
      const shade = .92 + .08 * Math.sin(x * 8.1 + y * 5.6 + z * 7.2);
      colors.push(.86 * shade, .83 * shade, .77 * shade);
    }
    indices.push(index);
  }
  source.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Preserve fractured plane edges while averaging small weathered facets.
  const faceNormals = [], adjacent = Array.from({length: positions.length / 3}, () => []);
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (let face = 0; face < indices.length / 3; face++) {
    const ids = indices.slice(face * 3, face * 3 + 3);
    va.fromArray(positions, ids[0] * 3); vb.fromArray(positions, ids[1] * 3); vc.fromArray(positions, ids[2] * 3);
    const normal = vb.sub(va).cross(vc.sub(va)).normalize(); faceNormals.push(normal);
    ids.forEach(id => adjacent[id].push(face));
  }
  const splitPositions = [], splitColors = [], splitNormals = [], splitIndices = [], splitVertices = new Map();
  for (let face = 0; face < faceNormals.length; face++) for (const id of indices.slice(face * 3, face * 3 + 3)) {
    const normal = new THREE.Vector3();
    for (const other of adjacent[id]) if (faceNormals[face].dot(faceNormals[other]) > .82) normal.add(faceNormals[other]);
    normal.normalize();
    const key = `${id}:${normal.toArray().map(v => Math.round(v * 1000)).join(',')}`;
    let index = splitVertices.get(key);
    if (index === undefined) {
      index = splitPositions.length / 3; splitVertices.set(key, index);
      splitPositions.push(...positions.slice(id * 3, id * 3 + 3)); splitColors.push(...colors.slice(id * 3, id * 3 + 3)); splitNormals.push(...normal.toArray());
    }
    splitIndices.push(index);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(splitPositions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(splitColors, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(splitNormals, 3));
  geometry.setIndex(splitIndices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function createLichenBoulders(THREE, scene, { groundHeight, siteAt = () => ({}), sourceMaterial = null, maps = {} }) {
  const material = sourceMaterial?.clone() ?? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96 });
  material.vertexColors = true;
  material.name = 'Fractured granite with scanned mineral detail and patchy lichen';
  material.color.setHex(0xe4ded0);
  const originalCompile = sourceMaterial?.onBeforeCompile;
  const originalKey = sourceMaterial?.customProgramCacheKey?.bind(sourceMaterial);
  material.onBeforeCompile = (shader, renderer) => {
    originalCompile?.call(material, shader, renderer);
    if (maps.color && shader.uniforms.surfaceGranitePaint) shader.uniforms.surfaceGranitePaint.value = maps.color;
    shader.fragmentShader = shader.fragmentShader.replace('stoneWeights, 0.055', 'stoneWeights, 0.62')
      .replace('0.19, normal, normalScale * 0.25', '0.62, normal, normalScale * 0.90')
      .replace('surfaceDetail * 0.38', 'surfaceDetail * 0.85');
    shader.vertexShader = `varying vec3 vBoulderWorld; varying vec3 vBoulderUp;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 boulderPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        boulderPosition = instanceMatrix * boulderPosition;
        vBoulderUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
      #else
        vBoulderUp = normalize(mat3(modelMatrix) * objectNormal);
      #endif
      vBoulderWorld = (modelMatrix * boulderPosition).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = `varying vec3 vBoulderWorld; varying vec3 vBoulderUp;
      float boulderHash(vec3 p) {
        p = fract(p * .1031); p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float boulderNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(boulderHash(i), boulderHash(i + vec3(1,0,0)), f.x),
          mix(boulderHash(i + vec3(0,1,0)), boulderHash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(boulderHash(i + vec3(0,0,1)), boulderHash(i + vec3(1,0,1)), f.x),
          mix(boulderHash(i + vec3(0,1,1)), boulderHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      ${shader.fragmentShader}`;
    // Applied after the scanned albedo so lichen retains pores and fissures.
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p = vBoulderWorld;
      float colony = boulderNoise(p * 1.6) * .52 + boulderNoise(p * 6.3) * .31 + boulderNoise(p * 21.7) * .17;
      float lichen = smoothstep(.60, .68, colony);
      float moss = smoothstep(.22, .72, vBoulderUp.y) * smoothstep(.65, .75, boulderNoise(p * 3.2 + 41.0));
      float mineralLuminance = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.72, .38, .065) * (mineralLuminance + .12), lichen * .84);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.20, .28, .07) * (mineralLuminance + .24), moss * .65);
    `);
  };
  material.customProgramCacheKey = () => `${originalKey?.() || 'standard'}|fractured-scanned-lichen-v3`;
  // Blocks frame the launch preparation shelf and the outside of the ridge;
  // the actual run, cliff standing shelf, and central flight corridor are open.
  const clusters = [[-36, -624, 1.35], [-29, -628, 1.25], [-43, -625, 2.7], [-45, -614, 3.6], [-39, -607, 2.8], [-22, -605, 2.3],
    [-20, -621, 1.8], [-25, -635, 2.2], [-53, -639, 3.0], [-63, -620, 3.4],
    [-56, -596, 4.2], [-76, -607, 3.2], [-95, -615, 3.5], [-118, -631, 3.3],
    [68, -607, 3.5], [85, -612, 3.1], [111, -629, 3.4], [133, -644, 3.3]];
  const records = [];
  clusters.forEach(([x, z, size], cluster) => {
    for (let rock = 0; rock < 6; rock++) {
      const seed = cluster * 17 + rock, angle = random(seed + 7) * Math.PI * 2;
      const radius = rock ? size * (.9 + random(seed + 2) * .8) : 0;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      const site = siteAt(px, pz);
      if ((site.path || 0) > .35 || (site.occupied || 0) > .1 || px > -17 && px < 60) continue;
      const scale = rock ? size * (.17 + random(seed + 3) * .34) : size;
      records.push({ x: px, z: pz, y: groundHeight(px, pz), scale, seed });
    }
  });
  const footprintCells = new Map(), footprintCellSize = 8;
  for (const record of records) {
    const radius = record.scale * 1.08;
    for (let z = Math.floor((record.z - radius) / footprintCellSize); z <= Math.floor((record.z + radius) / footprintCellSize); z++)
      for (let x = Math.floor((record.x - radius) / footprintCellSize); x <= Math.floor((record.x + radius) / footprintCellSize); x++) {
        const key = `${x},${z}`;
        if (!footprintCells.has(key)) footprintCells.set(key, []);
        footprintCells.get(key).push(record);
      }
  }
  const group = new THREE.Group(); group.name = 'RoundedLichenBoulderClusters'; scene.add(group);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), euler = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const geometries = [];
  for (let variant = 0; variant < 4; variant++) {
    const placements = records.filter(record => record.seed % 4 === variant);
    const geometry = createWeatheredBoulderGeometry(THREE, variant); geometries.push(geometry);
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.name = `WeatheredGraniteBlocks${variant}`; mesh.castShadow = mesh.receiveShadow = true;
    placements.forEach((record, i) => {
      euler.set((random(record.seed + 24) - .5) * .32, random(record.seed + 25) * Math.PI * 2, (random(record.seed + 26) - .5) * .25);
      q.setFromEuler(euler); s.set(record.scale, record.scale * (.7 + random(record.seed + 27) * .3), record.scale * (.8 + random(record.seed + 28) * .35));
      p.set(record.x, record.y + s.y * .30, record.z);
      matrix.compose(p, q, s); mesh.setMatrixAt(i, matrix);
    });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
  }
  let disposed = false;
  return { group, records, stats: { rocks: records.length, draws: 4, triangles: records.length * geometries[0].index.count / 3 },
    coverageAt(x, z) {
      let coverage = 0;
      const candidates = footprintCells.get(`${Math.floor(x / footprintCellSize)},${Math.floor(z / footprintCellSize)}`) || [];
      for (const record of candidates) {
        const distance = Math.hypot(x - record.x, z - record.z) / record.scale;
        coverage = Math.max(coverage, clamp((1.08 - distance) / .24));
      }
      return coverage;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      group.children.forEach(mesh => mesh.dispose());
      geometries.forEach(geometry => geometry.dispose());
      material.dispose();
      footprintCells.clear();
    } };
}
