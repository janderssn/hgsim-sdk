/**
 * Camera-near meadow detail. All placements are hashed in world-space cells;
 * crossing a cell streams new detail into the existing three instance buffers.
 * Nothing here participates in collisions or changes the terrain height source.
 */
const CELL = 6;
const CELL_MARGIN = CELL / Math.SQRT2;
const TARGET_CLEARANCE = 66;
const MAX_ALTITUDE = 60;
const LEVELS = {
  high: { radius: 35, grass: 5000, flowers: 150, pebbles: 150, density: 1 },
  medium: { radius: 25, grass: 2400, flowers: 80, pebbles: 80, density: .84 },
  low: { radius: 15, grass: 750, flowers: 24, pebbles: 30, density: .58 },
};

function hash(x, z, salt = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(salt | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function geometryFrom(THREE, positions, colors, indices, uvs) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Nine individually curved, twisted ribbons. Their pointed tips and open gaps
// keep the silhouette fine enough to read as grass rather than solid shrubs.
function grassGeometry(THREE) {
  const positions = [], colors = [], indices = [], uvs = [];
  const stations = [0, .36, .72, 1];
  const widths = [1, .86, .48, 0];
  for (let blade = 0; blade < 9; blade++) {
    const angle = blade * 2.3999632297 + hash(blade, 7) * .8;
    const height = .29 + hash(blade, 3) * .35;
    const width = .011 + hash(blade, 2) * .009;
    const bend = .11 + hash(blade, 4) * .21;
    const spread = .035 + hash(blade, 9) * .12;
    const twist = (hash(blade, 6) - .5) * .9;
    const gold = hash(blade, 12) > .76;
    const base = positions.length / 3;
    for (let row = 0; row < stations.length; row++) {
      const t = stations[row];
      const centerX = Math.cos(angle) * (spread + bend * t * t);
      const centerZ = Math.sin(angle) * (spread + bend * t * t);
      const sideAngle = angle + Math.PI / 2 + twist * t;
      const sides = row === 3 ? [0] : [-1, 1];
      for (const side of sides) {
        positions.push(centerX + Math.cos(sideAngle) * width * widths[row] * side,
          -.035 + height * t, centerZ + Math.sin(sideAngle) * width * widths[row] * side);
        // Slightly straw-coloured tips and dark roots also hold up without maps.
        colors.push(gold ? .30 + t * .31 : .14 + t * .21,
          gold ? .29 + t * .23 : .24 + t * .24,
          gold ? .10 + t * .15 : .075 + t * .085);
        uvs.push((side + 1) / 2, t);
      }
    }
    for (let row = 0; row < 2; row++) {
      const a = base + row * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    indices.push(base + 4, base + 5, base + 6);
  }
  return geometryFrom(THREE, positions, colors, indices, uvs);
}

function flowerGeometry(THREE) {
  const positions = [], colors = [], indices = [], uvs = [];
  function vertex(x, y, z, color) {
    const index = positions.length / 3;
    positions.push(x, y, z); colors.push(...color); uvs.push(0, 0);
    return index;
  }
  function triangle(a, b, c) { indices.push(a, b, c); }
  for (let flower = 0; flower < 3; flower++) {
    const angle = flower * 2.4;
    const x = Math.cos(angle) * .095, z = Math.sin(angle) * .095;
    const height = .27 + flower * .065;
    const stemColor = [.17, .29, .08];
    // Two crossing narrow stem ribbons, plus a small lance-shaped leaf.
    for (const a of [0, Math.PI / 2]) {
      const dx = Math.cos(a) * .003, dz = Math.sin(a) * .003;
      const v = [vertex(x - dx, -.025, z - dz, stemColor), vertex(x + dx, -.025, z + dz, stemColor),
        vertex(x + .025 - dx, height, z + .012 - dz, stemColor), vertex(x + .025 + dx, height, z + .012 + dz, stemColor)];
      triangle(v[0], v[1], v[2]); triangle(v[1], v[3], v[2]);
    }
    const leaf = [vertex(x, height * .36, z, stemColor), vertex(x + .026, height * .51, z - .018, stemColor),
      vertex(x + .075, height * .66, z - .03, [.27, .38, .13]), vertex(x + .032, height * .50, z + .006, stemColor)];
    triangle(leaf[0], leaf[1], leaf[2]); triangle(leaf[0], leaf[2], leaf[3]);
    for (let petal = 0; petal < 5; petal++) {
      const a = petal * Math.PI * 2 / 5;
      const cx = x + .025, cz = z + .012, radius = .034;
      const center = vertex(cx, height, cz, [.91, .73, .32]);
      const left = vertex(cx + Math.cos(a - .4) * radius * .65, height + .008, cz + Math.sin(a - .4) * radius * .65, [.94, .91, .76]);
      const tip = vertex(cx + Math.cos(a) * radius, height + .003, cz + Math.sin(a) * radius, [1, .97, .88]);
      const right = vertex(cx + Math.cos(a + .4) * radius * .65, height + .008, cz + Math.sin(a + .4) * radius * .65, [.94, .91, .76]);
      triangle(center, left, tip); triangle(center, tip, right);
    }
  }
  return geometryFrom(THREE, positions, colors, indices, uvs);
}

function pebbleGeometry(THREE) {
  const geometry = new THREE.IcosahedronGeometry(.14, 1);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    // Hash positions rather than vertex indices so shared corners stay welded.
    const variation = hash(Math.round(x * 10000), Math.round((y + z) * 10000));
    const scale = .88 + variation * .22;
    positions.setXYZ(index, x * scale * 1.3, y * scale * .52 + .035, z * scale);
    const shade = .35 + variation * .16;
    colors.set([shade * 1.06, shade * 1.02, shade * .91], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function coverMaterial(THREE, supplied, wind, uniforms) {
  const material = supplied?.clone() ?? new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .97, metalness: 0, side: THREE.DoubleSide,
  });
  material.vertexColors = true;
  material.transparent = false;
  material.depthWrite = true;
  const originalCompile = supplied?.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    originalCompile?.call(material, shader, renderer);
    shader.uniforms.coverTime = uniforms.time;
    shader.uniforms.coverCamera = uniforms.camera;
    shader.uniforms.coverRadius = uniforms.radius;
    shader.vertexShader = `uniform float coverTime;\nuniform vec2 coverCamera;\nuniform float coverRadius;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec2 coverOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      float coverFade = 1.0 - smoothstep(coverRadius - 5.0, coverRadius, distance(coverOrigin, coverCamera));
      float coverTip = pow(clamp(position.y / 0.65, 0.0, 1.0), 2.0);
      float coverBreeze = sin(coverTime * 1.35 + coverOrigin.x * 0.43 + coverOrigin.y * 0.31)
        + 0.35 * sin(coverTime * 2.1 + coverOrigin.x * 1.7);
      transformed.x += coverBreeze * coverTip * ${wind.toFixed(3)};
      transformed.z += coverBreeze * coverTip * ${(wind * .42).toFixed(3)};
      transformed *= coverFade;
    `);
  };
  material.customProgramCacheKey = () => `near-meadow-v1-${wind}`;
  return material;
}

/**
 * options: terrainHeight (required), groundUnder, rockTop, quality, and optional
 * materials {grass, flowers, pebbles}. Supplied materials are cloned, not owned.
 * update expects a world-space camera position and elapsed seconds.
 */
export function createGroundCover(THREE, scene, {
  terrainHeight, groundUnder = terrainHeight, rockTop, materials = {}, quality = 'high',
} = {}) {
  if (typeof terrainHeight !== 'function') throw new TypeError('Ground cover needs the world terrainHeight function');
  let level = LEVELS[quality] ? quality : 'high';
  let cellX = null, cellZ = null, active = false, disposed = false, hasCamera = false;
  let lastTime = 0;
  const lastCamera = new THREE.Vector3();
  const uniforms = { time: { value: 0 }, camera: { value: new THREE.Vector2() }, radius: { value: LEVELS[level].radius } };
  const geometries = [grassGeometry(THREE), flowerGeometry(THREE), pebbleGeometry(THREE)];
  const ownedMaterials = [coverMaterial(THREE, materials.grass, .075, uniforms),
    coverMaterial(THREE, materials.flowers, .045, uniforms), coverMaterial(THREE, materials.pebbles, 0, uniforms)];
  const names = ['NearMeadowGrass', 'NearMeadowFlowers', 'NearMeadowPebbles'];
  const capacities = [LEVELS.high.grass, LEVELS.high.flowers, LEVELS.high.pebbles];
  const meshes = geometries.map((geometry, index) => {
    const mesh = new THREE.InstancedMesh(geometry, ownedMaterials[index], capacities[index]);
    mesh.name = names[index];
    mesh.userData.groundCover = true;
    mesh.userData.capacity = capacities[index];
    mesh.userData.noShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacities[index] * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.visible = false;
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.boundingBox = new THREE.Box3(); mesh.boundingSphere = new THREE.Sphere();
    scene.add(mesh);
    return mesh;
  });
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3();
  const scale = new THREE.Vector3(), color = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const bounds = meshes.map(() => new THREE.Box3());

  function suitable(x, z) {
    if (x * x + z * z < TARGET_CLEARANCE * TARGET_CLEARANCE) return null;
    const y = terrainHeight(x, z);
    if (!Number.isFinite(y)) return null;
    const solid = groundUnder(x, z);
    if (Number.isNaN(solid) || solid > y + .5 || (rockTop && rockTop(x, z) > y + .5)) return null;
    const dx = terrainHeight(x + .75, z) - terrainHeight(x - .75, z);
    const dz = terrainHeight(x, z + .75) - terrainHeight(x, z - .75);
    if (!Number.isFinite(dx + dz) || Math.hypot(dx, dz) > .75) return null;
    return y;
  }

  function place(batch, x, y, z, seedX, seedZ, salt) {
    const mesh = meshes[batch], index = mesh.count;
    position.set(x, y, z);
    rotation.setFromAxisAngle(up, hash(seedX, seedZ, salt + 2) * Math.PI * 2);
    const size = batch === 0 ? .77 + hash(seedX, seedZ, salt + 3) * .43
      : batch === 1 ? .72 + hash(seedX, seedZ, salt + 3) * .42 : .5 + hash(seedX, seedZ, salt + 3) * 1.1;
    scale.set(size, size * (.86 + hash(seedX, seedZ, salt + 4) * .24), size);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    const shade = .83 + hash(seedX, seedZ, salt + 5) * .32;
    if (batch === 0) {
      // Most tufts stay green; irregular warmer patches catch the afternoon sun.
      const dry = hash(Math.floor(x / 5), Math.floor(z / 5), 73) > .69;
      color.setRGB(shade * (dry ? 1.15 : .87), shade * (dry ? .95 : 1.04), shade * (dry ? .71 : .84));
    } else if (batch === 1) {
      const lilac = hash(seedX, seedZ, salt + 6) > .77;
      color.setRGB(lilac ? .72 : shade, lilac ? .51 : shade, lilac ? .92 : shade * .94);
    } else color.setRGB(shade, shade, shade);
    mesh.setColorAt(index, color);
    bounds[batch].expandByPoint(position);
    mesh.count++;
  }

  function rebuild(cx, cz) {
    const settings = LEVELS[level], radius = settings.radius + CELL_MARGIN;
    const centerX = (cx + .5) * CELL, centerZ = (cz + .5) * CELL;
    const extent = Math.ceil(radius / CELL);
    const cells = [];
    for (let oz = -extent; oz <= extent; oz++) for (let ox = -extent; ox <= extent; ox++) {
      // Near cells first ensure a full foreground even if the fixed budget fills.
      cells.push({ x: cx + ox, z: cz + oz, distance: ox * ox + oz * oz });
    }
    cells.sort((a, b) => a.distance - b.distance || a.z - b.z || a.x - b.x);
    meshes.forEach((mesh, index) => { mesh.count = 0; bounds[index].makeEmpty(); });
    for (const cell of cells) {
      for (let candidate = 0; candidate < 42 && meshes[0].count < settings.grass; candidate++) {
        if (hash(cell.x, cell.z, candidate * 7 + 100) > settings.density) continue;
        const x = (cell.x + (candidate % 7 + .12 + hash(cell.x, cell.z, candidate * 7 + 101) * .76) / 7) * CELL;
        const z = (cell.z + (Math.floor(candidate / 7) + .12 + hash(cell.x, cell.z, candidate * 7 + 102) * .76) / 6) * CELL;
        if ((x - centerX) ** 2 + (z - centerZ) ** 2 > radius * radius) continue;
        const y = suitable(x, z);
        if (y !== null) place(0, x, y, z, cell.x, cell.z, candidate * 11 + 800);
      }
      for (let batch = 1; batch <= 2; batch++) {
        const limit = batch === 1 ? settings.flowers : settings.pebbles;
        if (meshes[batch].count >= limit || hash(cell.x, cell.z, 401 + batch) > (batch === 1 ? .78 : .73)) continue;
        const x = (cell.x + hash(cell.x, cell.z, 410 + batch)) * CELL;
        const z = (cell.z + hash(cell.x, cell.z, 420 + batch)) * CELL;
        if ((x - centerX) ** 2 + (z - centerZ) ** 2 > radius * radius) continue;
        const y = suitable(x, z);
        if (y !== null) place(batch, x, y, z, cell.x, cell.z, 500 + batch * 50);
      }
    }
    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index];
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.boundingBox.copy(bounds[index]);
      if (mesh.count) {
        // Includes blade curvature, GPU wind, and the largest allowed tuft scale.
        mesh.boundingBox.expandByScalar(1);
        mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);
      } else mesh.boundingSphere.set(new THREE.Vector3(), 0);
    }
    cellX = cx; cellZ = cz;
  }

  function update(cameraPosition, time = 0) {
    if (disposed) return;
    lastCamera.copy(cameraPosition); lastTime = time; hasCamera = true;
    uniforms.time.value = Number.isFinite(time) ? time : 0;
    uniforms.camera.value.set(cameraPosition.x, cameraPosition.z);
    const ground = terrainHeight(cameraPosition.x, cameraPosition.z);
    if (!Number.isFinite(ground + cameraPosition.x + cameraPosition.y + cameraPosition.z) || cameraPosition.y - ground > MAX_ALTITUDE) {
      active = false;
      for (const mesh of meshes) mesh.visible = false;
      return;
    }
    const cx = Math.floor(cameraPosition.x / CELL), cz = Math.floor(cameraPosition.z / CELL);
    if (cx !== cellX || cz !== cellZ) rebuild(cx, cz);
    else if (!active) for (const mesh of meshes) mesh.visible = mesh.count > 0;
    active = true;
  }

  return {
    update,
    setQuality(nextLevel) {
      if (disposed || !LEVELS[nextLevel] || nextLevel === level) return;
      level = nextLevel; cellX = cellZ = null;
      uniforms.radius.value = LEVELS[level].radius;
      if (hasCamera) update(lastCamera, lastTime);
    },
    get stats() {
      return { quality: level, radius: LEVELS[level].radius, active, cellX, cellZ,
        tufts: meshes[0].count, flowers: meshes[1].count, pebbles: meshes[2].count };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of meshes) scene.remove(mesh);
      for (const geometry of geometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
    },
  };
}
