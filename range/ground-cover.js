/**
 * Camera-near meadow detail. All placements are hashed in world-space cells;
 * crossing a cell streams new detail into fixed meadow/woodland instance buffers.
 * Nothing here participates in collisions or changes the terrain height source.
 */
import { createGrassFanGeometry, createFernGeometry, createLitterGeometry, createDeadwoodGeometry } from './undergrowth-geometry.js';
import { createMeadowHerbGeometry, createSeedGrassGeometry } from './meadow-plants.js';
import { sampleGroundStyle, GROUND_PALETTE } from './surface-style.js';

const CELL = 6;
const CELL_MARGIN = CELL / Math.SQRT2;
const TARGET_CLEARANCE = 66;
const MAX_ALTITUDE = 60;
const MAX_CACHED_CELLS = 384;
const FAR_CELL = 12, FAR_MARGIN = FAR_CELL / Math.SQRT2, MAX_FAR_CACHED_CELLS = 256;
const FAR_LEVELS = { high: { radius: 75, inner: 20, capacity: 900 },
  medium: { radius: 50, inner: 20, capacity: 450 }, low: { radius: 25, inner: 12, capacity: 140 } };
const unit = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const LEVELS = {
  high: { radius: 35, grass: 760, flowers: 180, pebbles: 120, ferns: 80, shrubs: 180, litter: 240, deadwood: 24, seeds: 120, density: 1 },
  medium: { radius: 25, grass: 360, flowers: 80, pebbles: 60, ferns: 40, shrubs: 90, litter: 120, deadwood: 12, seeds: 60, density: .84 },
  low: { radius: 15, grass: 100, flowers: 16, pebbles: 24, ferns: 0, shrubs: 0, litter: 32, deadwood: 0, seeds: 8, density: .58 },
};
const KINDS = ['grass', 'flowers', 'pebbles', 'ferns', 'shrubs', 'litter', 'deadwood', 'seeds'];
// Layer-specific distance bands keep dense low herbs close without a hard budget
// boundary. The same radius is used by placement and the smooth GPU growth fade.
const RANGE_SCALE = [1, .7, 1, .72, .52, .7, 1, 1];
const CANDIDATES = [6, 5, 1, 2, 8, 8, 1, 2];

function hash(x, z, salt = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(salt | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
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

function coverMaterial(THREE, supplied, wind, uniforms, rangeScale = 1, nearBlend = null) {
  const material = supplied?.clone() ?? new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .97, metalness: 0, side: THREE.DoubleSide,
  });
  material.vertexColors = true;
  material.transparent = false;
  material.depthWrite = true;
  const originalCompile = supplied?.onBeforeCompile;
  const originalCacheKey = supplied?.customProgramCacheKey?.bind(supplied);
  material.onBeforeCompile = (shader, renderer) => {
    originalCompile?.call(material, shader, renderer);
    shader.uniforms.coverTime = uniforms.time;
    shader.uniforms.coverCamera = uniforms.camera;
    shader.uniforms.coverRadius = uniforms.radius;
    if (nearBlend) { shader.uniforms.coverInnerStart = nearBlend.start; shader.uniforms.coverInnerEnd = nearBlend.end; }
    shader.vertexShader = `uniform float coverTime;\nuniform vec2 coverCamera;\nuniform float coverRadius;\n${nearBlend ? 'uniform float coverInnerStart;\nuniform float coverInnerEnd;\n' : ''}${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec2 coverOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      float coverDrawRadius = coverRadius * ${rangeScale.toFixed(3)};
      float coverFadeWidth = min(10.0, coverDrawRadius * 0.28);
      float coverFade = 1.0 - smoothstep(coverDrawRadius - coverFadeWidth, coverDrawRadius, distance(coverOrigin, coverCamera));
      ${nearBlend ? 'coverFade *= smoothstep(coverInnerStart, coverInnerEnd, distance(coverOrigin, coverCamera));' : ''}
      float coverTip = pow(clamp(position.y / 0.65, 0.0, 1.0), 2.0);
      // A broad travelling gust is shared by all cells. Convert the prevailing
      // world wind to each instance's frame, so rotated plants still lean together.
      float coverGust = 0.65 + 0.35 * sin(coverTime * 0.7 - coverOrigin.x * 0.035 - coverOrigin.y * 0.028);
      float coverBreeze = coverGust * sin(coverTime * 1.6 - coverOrigin.x * 0.13 - coverOrigin.y * 0.09)
        + 0.18 * sin(coverTime * 3.4 + coverOrigin.x * 1.7 + coverOrigin.y * 0.8);
      vec3 coverWindAxis = vec3(0.92, 0.0, 0.38);
      vec3 coverLocalWind = normalize(vec3(dot(instanceMatrix[0].xyz, coverWindAxis), 0.0,
        dot(instanceMatrix[2].xyz, coverWindAxis)));
      transformed += coverLocalWind * coverBreeze * coverTip * ${wind.toFixed(3)};
      transformed *= coverFade;
    `);
    if (wind && shader.fragmentShader) shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>', `
      #include <lights_physical_pars_fragment>
      // Thin leaves transmit a little incident sunlight. This runs inside the
      // ordinary direct-light loop, after its real shadow attenuation, and never
      // adds an unshadowed emissive term in the woodland shade.
      void RE_Direct_Cover(const in IncidentLight light, const in vec3 geometryPosition,
        const in vec3 geometryNormal, const in vec3 geometryViewDir,
        const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material,
        inout ReflectedLight reflectedLight) {
        RE_Direct_Physical(light, geometryPosition, geometryNormal, geometryViewDir,
          geometryClearcoatNormal, material, reflectedLight);
        float nDotL = dot(geometryNormal, light.direction);
        float wrapped = max(0.0, (nDotL + 0.45) / 1.45) - max(0.0, nDotL);
        float transmission = pow(max(0.0, dot(geometryViewDir, -light.direction)), 3.0);
        reflectedLight.directDiffuse += light.color * material.diffuseColor * RECIPROCAL_PI
          * (wrapped * 0.42 + transmission * 0.22);
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_Cover
    `);
  };
  material.customProgramCacheKey = () => `${originalCacheKey?.() || 'standard'}|painted-meadow-v3-${wind}-${rangeScale}-${!!nearBlend}`;
  return material;
}

/**
 * options: terrainHeight (required), groundUnder, rockTop, quality, and optional
 * materials may supply grass/flowers/pebbles/ferns/shrubs/litter/deadwood/seeds finishes.
 * Supplied materials are cloned; their shared textures remain caller-owned.
 * Optional forestCoverage(x,z) returns actual canopy density in [0,1].
 * ecologyAt(x,z) shares the terrain's [0,1] rock/talus/moisture/path masks.
 * World/biome callbacks describe static placements, cached only near the camera.
 * update expects a world-space camera position and elapsed seconds.
 */
export function createGroundCover(THREE, scene, {
  terrainHeight, groundUnder = terrainHeight, rockTop, materials = {}, quality = 'high',
  forestCoverage = () => 0, ecologyAt = () => ({}),
} = {}) {
  if (typeof terrainHeight !== 'function') throw new TypeError('Ground cover needs the world terrainHeight function');
  let level = LEVELS[quality] ? quality : 'high';
  let cellX = null, cellZ = null, active = false, disposed = false, hasCamera = false;
  let lastTime = 0;
  const lastCamera = new THREE.Vector3();
  const uniforms = { time: { value: 0 }, camera: { value: new THREE.Vector2() }, radius: { value: LEVELS[level].radius } };
  const geometries = [createGrassFanGeometry(THREE), createMeadowHerbGeometry(THREE), pebbleGeometry(THREE),
    createFernGeometry(THREE), createMeadowHerbGeometry(THREE, { flowers: false }),
    createLitterGeometry(THREE), createDeadwoodGeometry(THREE), createSeedGrassGeometry(THREE)];
  const winds = [.085, .035, 0, .035, .025, 0, 0, .10];
  const ownedMaterials = KINDS.map((kind, index) => coverMaterial(THREE, materials[kind], winds[index], uniforms, RANGE_SCALE[index]));
  const names = ['NearMeadowGrass', 'NearMeadowFlowers', 'NearMeadowPebbles', 'NearWoodlandFerns',
    'NearWoodlandShrubs', 'NearWoodlandLitter', 'NearWoodlandDeadwood', 'NearMeadowSeedGrass'];
  const capacities = KINDS.map(kind => LEVELS.high[kind]);
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
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), yaw = new THREE.Quaternion(), position = new THREE.Vector3();
  const scale = new THREE.Vector3(), color = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const goldenPigment = new THREE.Color().setRGB(...GROUND_PALETTE.straw);
  const bounds = meshes.map(() => new THREE.Box3());
  const cellCache = new Map();
  let cellBuilds = 0;
  const farCache = new Map();
  let farCellX = null, farCellZ = null, farCellBuilds = 0;
  const farUniforms = { time: uniforms.time, camera: uniforms.camera, radius: { value: FAR_LEVELS[level].radius } };
  const farBlend = { start: { value: FAR_LEVELS[level].inner }, end: { value: LEVELS[level].radius } };
  const farGeometry = createGrassFanGeometry(THREE, { bladesPerCrown: 2 });
  const farMaterial = coverMaterial(THREE, materials.grass, .075, farUniforms, 1, farBlend);
  geometries.push(farGeometry); ownedMaterials.push(farMaterial);
  const farMesh = new THREE.InstancedMesh(farGeometry, farMaterial, FAR_LEVELS.high.capacity);
  farMesh.name = 'MidMeadowFans';
  Object.assign(farMesh.userData, { groundCover: true, capacity: FAR_LEVELS.high.capacity, noShadow: true });
  farMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FAR_LEVELS.high.capacity * 3), 3);
  farMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  farMesh.count = 0; farMesh.visible = false; farMesh.receiveShadow = true;
  farMesh.boundingBox = new THREE.Box3(); farMesh.boundingSphere = new THREE.Sphere();
  scene.add(farMesh);
  const allMeshes = [...meshes, farMesh];

  function suitable(x, z) {
    if (x * x + z * z < TARGET_CLEARANCE * TARGET_CLEARANCE) return null;
    const y = terrainHeight(x, z);
    if (!Number.isFinite(y)) return null;
    const solid = groundUnder(x, z);
    if (Number.isNaN(solid) || solid > y + .5 || (rockTop && rockTop(x, z) > y + .5)) return null;
    const dx = terrainHeight(x + .75, z) - terrainHeight(x - .75, z);
    const dz = terrainHeight(x, z + .75) - terrainHeight(x, z - .75);
    if (!Number.isFinite(dx + dz) || Math.hypot(dx, dz) > .75) return null;
    const ecology = ecologyAt(x, z) || {};
    const site = { y, dx, dz, canopy: unit(forestCoverage(x, z)), rock: unit(ecology.rock),
      talus: unit(ecology.talus), moisture: unit(ecology.moisture), path: unit(ecology.path) };
    if (site.path > .55 || site.rock > .75) return null;
    site.style = sampleGroundStyle(x, z, site);
    return site;
  }

  function placement(batch, x, site, z, seedX, seedZ, salt, density = 0) {
    position.set(x, site.y, z);
    rotation.setFromAxisAngle(up, hash(seedX, seedZ, salt + 2) * Math.PI * 2);
    if (batch !== 0 && batch !== 6 && batch !== 7) {
      yaw.copy(rotation);
      normal.set(-site.dx, 1.5, -site.dz).normalize();
      rotation.setFromUnitVectors(up, normal).multiply(yaw);
    }
    const size = batch === 0 ? .86 + hash(seedX, seedZ, salt + 3) * .38
      : batch === 1 ? 1.05 + hash(seedX, seedZ, salt + 3) * .55
        : batch === 2 ? .5 + hash(seedX, seedZ, salt + 3) * 1.1
          : batch === 4 ? 1.45 + hash(seedX, seedZ, salt + 3) * .7 : .8 + hash(seedX, seedZ, salt + 3) * .66;
    const height = batch === 0 ? (1 - site.style.mown * .74) * (.86 + site.style.dryness * .32)
      : batch === 7 ? 1 - site.style.mown * .72 : 1;
    const spread = batch === 0 ? .9 + site.style.patch * .38 : batch === 1 ? 1.25 : batch === 4 ? 1.15 : 1;
    scale.set(size * spread, size * height * (.86 + hash(seedX, seedZ, salt + 4) * .24), size * spread);
    matrix.compose(position, rotation, scale);
    const shade = .83 + hash(seedX, seedZ, salt + 5) * .32;
    if (batch === 0) {
      // Botanical colour follows the very same warped pigment fields as the soil.
      color.setRGB(...site.style.color).lerp(goldenPigment, unit((site.style.dryness - .32) * 1.2));
      color.multiplyScalar(shade);
    } else if (batch === 1) {
      color.setRGB(shade * .97, shade, shade * .94);
    } else if (batch === 3 || batch === 4) color.setRGB(shade * .9, shade, shade * .98);
    else if (batch === 7) color.setRGB(shade, shade * .98, shade * .90);
    else color.setRGB(shade, shade, shade);
    return { x, y: site.y, z, density, matrix: matrix.toArray(new Float32Array(16)),
      color: new Float32Array([color.r, color.g, color.b]) };
  }

  function worldCell(cx, cz) {
    const key = `${cx},${cz}`;
    if (cellCache.has(key)) return cellCache.get(key);
    const groups = KINDS.map(() => []);
    for (let candidate = 0; candidate < CANDIDATES[0]; candidate++) {
      const x = (cx + (candidate % 3 + .08 + hash(cx, cz, candidate * 7 + 101) * .84) / 3) * CELL;
      const z = (cz + (Math.floor(candidate / 3) + .08 + hash(cx, cz, candidate * 7 + 102) * .84) / 2) * CELL;
      const site = suitable(x, z);
      if (site && hash(cx, cz, candidate * 7 + 103) <
        (.72 + site.style.patch * .48) * (1 - (site.style.wear || 0) * .6)
          * (1 - site.canopy * .68) * (1 - site.talus * .83) * (1 - site.path * .9)) {
        groups[0].push(placement(0, x, site, z, cx, cz, candidate * 11 + 800, hash(cx, cz, candidate * 7 + 100)));
      }
    }
    for (let batch = 1; batch < groups.length; batch++) {
      const candidates = CANDIDATES[batch];
      for (let candidate = 0; candidate < candidates; candidate++) {
        const salt = candidate * 111;
        const x = (cx + hash(cx, cz, 410 + batch + salt)) * CELL;
        const z = (cz + hash(cx, cz, 420 + batch + salt)) * CELL;
        const site = suitable(x, z);
        if (!site) continue;
        // Forest floor, meadow and disturbed stony edges grow different forms.
        const probability = batch === 1 ? .52 * (1 - site.canopy * .9) * (1 - site.talus) * (1 - site.style.mown * .5)
          : batch === 2 ? .64 + site.talus * .35
            : batch === 3 ? (site.canopy * .75 + site.moisture * .12) * (1 - site.talus)
              : batch === 4 ? (site.canopy * .85 + site.moisture * .12) * (1 - site.talus * .7)
                : batch === 5 ? site.canopy * .95
                  : batch === 6 ? site.canopy * .18
                    : (1 - site.canopy * .85) * (.13 + site.style.dryness * .46) * (1 - site.style.mown * .92);
        if (hash(cx, cz, 401 + batch + salt) <= probability) {
          groups[batch].push(placement(batch, x, site, z, cx, cz, 500 + batch * 50 + salt));
        }
      }
    }
    const cell = { x: cx, z: cz, groups };
    cellCache.set(key, cell); cellBuilds++;
    return cell;
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
      if (cell.distance * CELL * CELL > (radius + CELL_MARGIN) ** 2) continue;
      const records = worldCell(cell.x, cell.z).groups;
      for (let batch = 0; batch < meshes.length; batch++) {
        const mesh = meshes[batch], limit = settings[KINDS[batch]];
        const layerRadius = settings.radius * RANGE_SCALE[batch] + CELL_MARGIN;
        for (const record of records[batch]) {
          if (mesh.count >= limit) break;
          if (record.density > settings.density || (record.x - centerX) ** 2 + (record.z - centerZ) ** 2 > layerRadius * layerRadius) continue;
          mesh.instanceMatrix.array.set(record.matrix, mesh.count * 16);
          mesh.instanceColor.array.set(record.color, mesh.count * 3);
          position.set(record.x, record.y, record.z);
          bounds[batch].expandByPoint(position);
          mesh.count++;
        }
      }
    }
    // Keep a small apron for backtracking, and never grow memory along a flight.
    for (const [key, cell] of cellCache) if (Math.abs(cell.x - cx) > extent + 1 || Math.abs(cell.z - cz) > extent + 1) cellCache.delete(key);
    while (cellCache.size > MAX_CACHED_CELLS) cellCache.delete(cellCache.keys().next().value);
    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index];
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.boundingBox.copy(bounds[index]);
      if (mesh.count) {
        // Includes blade curvature, GPU wind, and the largest allowed tuft scale.
        mesh.boundingBox.expandByScalar(1.8);
        mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);
      } else mesh.boundingSphere.set(new THREE.Vector3(), 0);
    }
    cellX = cx; cellZ = cz;
  }

  function distantCell(cx, cz) {
    const key = `${cx},${cz}`;
    if (farCache.has(key)) return farCache.get(key);
    const records = [];
    for (let candidate = 0; candidate < 6; candidate++) {
      const x = (cx + (candidate % 3 + .08 + hash(cx, cz, 1800 + candidate * 7) * .84) / 3) * FAR_CELL;
      const z = (cz + (Math.floor(candidate / 3) + .08 + hash(cx, cz, 1801 + candidate * 7) * .84) / 2) * FAR_CELL;
      const site = suitable(x, z);
      if (!site) continue;
      const chance = (.72 + site.style.patch * .48) * (1 - (site.style.wear || 0) * .6)
        * (1 - site.canopy * .82) * (1 - site.talus * .83) * (1 - site.path * .9);
      if (hash(cx, cz, 1802 + candidate * 7) > chance) continue;
      const record = placement(0, x, site, z, cx, cz, 1900 + candidate * 11, hash(cx, cz, 1803 + candidate * 7));
      // Low, grouped six-leaf fans give the distant meadow volume at 66 triangles.
      for (const component of [4, 5, 6]) record.matrix[component] *= .68;
      records.push(record);
    }
    const cell = { x: cx, z: cz, records };
    farCache.set(key, cell); farCellBuilds++; return cell;
  }

  function rebuildDistant(cx, cz) {
    const settings = FAR_LEVELS[level], radius = settings.radius + FAR_MARGIN;
    const centerX = (cx + .5) * FAR_CELL, centerZ = (cz + .5) * FAR_CELL;
    const extent = Math.ceil(radius / FAR_CELL), cells = [];
    for (let dz = -extent; dz <= extent; dz++) for (let dx = -extent; dx <= extent; dx++) {
      if ((dx * dx + dz * dz) * FAR_CELL * FAR_CELL > (radius + FAR_MARGIN) ** 2) continue;
      cells.push({ x: cx + dx, z: cz + dz, distance: dx * dx + dz * dz });
    }
    cells.sort((a, b) => a.distance - b.distance || a.z - b.z || a.x - b.x);
    farMesh.count = 0; farMesh.boundingBox.makeEmpty();
    for (const cell of cells) for (const record of distantCell(cell.x, cell.z).records) {
      if (farMesh.count >= settings.capacity) break;
      const distance = Math.hypot(record.x - centerX, record.z - centerZ);
      if (distance > radius || distance < settings.inner - FAR_MARGIN || record.density > LEVELS[level].density) continue;
      farMesh.instanceMatrix.array.set(record.matrix, farMesh.count * 16);
      farMesh.instanceColor.array.set(record.color, farMesh.count * 3);
      position.set(record.x, record.y, record.z); farMesh.boundingBox.expandByPoint(position); farMesh.count++;
    }
    for (const [key, cell] of farCache) if (Math.abs(cell.x - cx) > extent + 1 || Math.abs(cell.z - cz) > extent + 1) farCache.delete(key);
    while (farCache.size > MAX_FAR_CACHED_CELLS) farCache.delete(farCache.keys().next().value);
    farMesh.visible = farMesh.count > 0;
    farMesh.instanceMatrix.needsUpdate = farMesh.instanceColor.needsUpdate = true;
    if (farMesh.count) {
      farMesh.boundingBox.expandByScalar(1.8); farMesh.boundingBox.getBoundingSphere(farMesh.boundingSphere);
    } else farMesh.boundingSphere.set(new THREE.Vector3(), 0);
    farCellX = cx; farCellZ = cz;
  }

  function update(cameraPosition, time = 0) {
    if (disposed) return;
    lastCamera.copy(cameraPosition); lastTime = time; hasCamera = true;
    uniforms.time.value = Number.isFinite(time) ? time : 0;
    uniforms.camera.value.set(cameraPosition.x, cameraPosition.z);
    const ground = terrainHeight(cameraPosition.x, cameraPosition.z);
    if (!Number.isFinite(ground + cameraPosition.x + cameraPosition.y + cameraPosition.z) || cameraPosition.y - ground > MAX_ALTITUDE) {
      active = false;
      for (const mesh of allMeshes) mesh.visible = false;
      return;
    }
    const cx = Math.floor(cameraPosition.x / CELL), cz = Math.floor(cameraPosition.z / CELL);
    if (cx !== cellX || cz !== cellZ) rebuild(cx, cz);
    else if (!active) for (const mesh of allMeshes) mesh.visible = mesh.count > 0;
    const fcx = Math.floor(cameraPosition.x / FAR_CELL), fcz = Math.floor(cameraPosition.z / FAR_CELL);
    if (fcx !== farCellX || fcz !== farCellZ) rebuildDistant(fcx, fcz);
    active = true;
  }

  return {
    materials: ownedMaterials,
    update,
    setQuality(nextLevel) {
      if (disposed || !LEVELS[nextLevel] || nextLevel === level) return;
      level = nextLevel; cellX = cellZ = farCellX = farCellZ = null;
      uniforms.radius.value = LEVELS[level].radius;
      farUniforms.radius.value = FAR_LEVELS[level].radius;
      farBlend.start.value = FAR_LEVELS[level].inner; farBlend.end.value = LEVELS[level].radius;
      if (hasCamera) update(lastCamera, lastTime);
    },
    get stats() {
      return { quality: level, radius: LEVELS[level].radius, active, cellX, cellZ,
        tufts: meshes[0].count, flowers: meshes[1].count, pebbles: meshes[2].count,
        ferns: meshes[3].count, shrubs: meshes[4].count, litter: meshes[5].count, deadwood: meshes[6].count,
        seeds: meshes[7].count, distantFans: farMesh.count, distantRadius: FAR_LEVELS[level].radius,
        draws: allMeshes.filter(mesh => mesh.visible).length,
        triangles: allMeshes.reduce((sum, mesh) => sum + mesh.count * (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0),
        cachedCells: cellCache.size, cellBuilds, farCachedCells: farCache.size, farCellBuilds };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cellCache.clear(); farCache.clear();
      for (const mesh of allMeshes) scene.remove(mesh);
      for (const geometry of geometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
    },
  };
}
