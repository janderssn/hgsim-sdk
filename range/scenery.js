/**
 * Draws the landing range's world (world.js) with Three.js: the terrain coloured by height and slope, the bullseye on the
 * field, the rocks with the ramp's deck and its timbers, trees, close grass for a sense of speed low down, and the birds
 * that mark the thermal. Nothing here is solid: the ground the flight and the launch feel is world.js.
 */
import { hash, noise, terrainHeight, slopeAt, LAUNCH, MARK, ROCKS, rockRing, DECK_BACK, DECK_LIP, DECK_FALL, CLIFF_EDGE, ROCK_TOP, RAMP_POSTS, deckY, groundUnder } from './world.js';
import { createEnvironmentModels } from './environment-models.js';
import { createGraniteCliffGeometry } from './granite-cliffs.js';
import { createForestShadowMap } from './forest-shadows.js';
import { batchStaticMeshes } from './static-batch.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Adds scenery and returns birds, drawing quality, and camera-detail updates.
 * Quality changes affect drawing only; world.js remains the physics source.
 */
export function buildScenery(THREE, scene, { models = createEnvironmentModels(THREE), materials = {}, sunDirection } = {}) {
  addTerrain(THREE, scene, materials.terrain);
  addMark(THREE, scene);
  addLaunch(THREE, scene, materials);
  const trees = addTrees(THREE, scene, models, sunDirection);
  addAlpineProps(THREE, scene, models, materials);
  const grass = addGrass(THREE, scene);
  return {
    birds: addBirds(THREE, scene),
    forestShadowMap: trees.shadowMap,
    forestBounds: trees.shadowBounds,
    setQuality(level) {
      const grassChanged = grass.setQuality(level);
      const treesChanged = trees.setQuality(level);
      return grassChanged || treesChanged;
    },
    updateDetail(cameraPosition, camera) {
      grass.updateDetail(cameraPosition);
      trees.updateDetail(cameraPosition, camera);
    },
  };
}

const TERRAIN_SEGMENTS = 240;

/** Samples the same world and colours at each terrain drawing resolution. */
function createTerrainGeometry(THREE, segments) {
  const SIZE = 3200, g = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
  const meadow = new THREE.Color('#7e8a66'), dry = new THREE.Color('#b5a273'), rock = new THREE.Color('#8e9083'), mown = new THREE.Color('#98a779'), stripe = new THREE.Color('#88996c');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = terrainHeight(x, z); p.setY(i, y);
    const s = slopeAt(x, z, 8), field = 1 - smooth(70, 150, Math.hypot(x - MARK.x, z - MARK.z));
    c.copy(meadow).lerp(dry, smooth(40, 230, y) * .5).lerp(rock, smooth(.45, .85, s));
    c.lerp(Math.floor((x + 1600) / 22) % 2 ? mown : stripe, field);
    c.multiplyScalar(.92 + .08 * noise(x / 40, z / 40));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.computeVertexNormals();
  return g;
}

/** Full-detail terrain is retained at every quality so touchdown matches drawing. */
function addTerrain(THREE, scene, surfaceMaterial) {
  const terrain = new THREE.Mesh(
    createTerrainGeometry(THREE, TERRAIN_SEGMENTS),
    surfaceMaterial || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);
  return terrain;
}

/** The mark: bullseye rings on the field and the 60 m landing zone, with four cones at the field's corners to judge drift by. */
function addMark(THREE, scene) {
  const ring = (inner, outer, color, y = .07) => { const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), new THREE.MeshStandardMaterial({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(MARK.x, terrainHeight(MARK.x, MARK.z) + y, MARK.z); m.receiveShadow = true; scene.add(m); return m; };
  ring(0, 6, '#e23c2e', .09); ring(6, 7.2, '#f6f1e6', .085); ring(13.8, 15, '#f6f1e6'); ring(28.6, 30, '#f6f1e6'); ring(59, 60, '#f6f1e6', .06);
  for (const [x, z] of [[-70, -70], [70, -70], [-70, 70], [70, 70]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(.9, 2.4, 10), new THREE.MeshStandardMaterial({ color: '#f6f1e6', roughness: .8 })); cone.position.set(x, terrainHeight(x, z) + 1.2, z); cone.castShadow = true; scene.add(cone); }
}

/** The two rocks (their rings, with a wobble), and the ramp's deck on the first: planks, stringers and struts to the rock face. */
function addLaunch(THREE, scene, materials) {
  const rockMaterial = materials.rock || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true });
  const fractureMaterial = rockMaterial.clone();
  fractureMaterial.name = 'Recessed granite joints';
  fractureMaterial.color.multiplyScalar(.62);
  fractureMaterial.onBeforeCompile = rockMaterial.onBeforeCompile;
  fractureMaterial.customProgramCacheKey = rockMaterial.customProgramCacheKey.bind(rockMaterial);
  for (const [index, rock] of ROCKS.entries()) {
    const geometry = createGraniteCliffGeometry(THREE, rock, index);
    const cliff = new THREE.Mesh(geometry, [rockMaterial, fractureMaterial]);
    cliff.name = 'FracturedGraniteCliff';
    cliff.castShadow = cliff.receiveShadow = true;
    scene.add(cliff);
  }
  const timber = materials.timber || new THREE.MeshStandardMaterial({ color: '#776954', roughness: .85 });
  const timberBeam = materials.timberBeam || timber;
  const woodParts = [];
  for (let z = DECK_BACK; z < DECK_LIP; z += 1.5) { const plank = new THREE.Mesh(new THREE.BoxGeometry(7, .14, 1.38 * Math.hypot(1, DECK_FALL)), timber); plank.position.set(LAUNCH.x, deckY(LAUNCH.z + z + .75) - .07, LAUNCH.z + z + .75); plank.rotation.x = Math.atan(DECK_FALL); plank.castShadow = plank.receiveShadow = true; woodParts.push(plank); }
  // A timber between two points, for the stringers under the deck and the struts down to the rock face.
  const beam = (x, y0, z0, y1, z1, r) => { const a = new THREE.Vector3(x, y0, z0), b = new THREE.Vector3(x, y1, z1), d = b.clone().sub(a), t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, d.length(), 6), timberBeam); t.position.copy(a).addScaledVector(d, .5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); t.castShadow = true; woodParts.push(t); };
  // Height of the ramp rock's face at z: its front widens as it falls.
  const under = ROCKS[0], faceY = z => { let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const k = (lo + hi) / 2; if (rockRing(under, k).rz < z - under.cz) lo = k; else hi = k; } return rockRing(under, lo).y; };
  // Arms out from the deck's edges to the streamer poles beside it (the poles are the streamers' own sticks).
  for (const p of RAMP_POSTS) { const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(p.x - LAUNCH.x) - 3.4, .12, .14), timber); arm.position.set((p.x + LAUNCH.x + p.side * 3.4) / 2, p.y - .06, p.z); arm.castShadow = true; woodParts.push(arm); }
  const at = z => LAUNCH.z + z;
  for (const x of [-3.1, 3.1]) {
    beam(LAUNCH.x + x, deckY(at(DECK_BACK)) - .25, at(DECK_BACK), deckY(at(DECK_LIP)) - .25, at(DECK_LIP), .13);
    for (const z of [DECK_BACK + 1, CLIFF_EDGE + 1]) beam(LAUNCH.x + x, deckY(at(z)) - .2, at(z), ROCK_TOP - 1, at(z), .14);
    for (const [z, foot] of [[-9, -15], [-2, -10], [DECK_LIP - .6, -6]]) beam(LAUNCH.x + x, deckY(at(z)) - .25, at(z), faceY(at(foot)) - 1, at(foot) - 1, .14);
  }
  // Static world-space batches preserve each board's UVs while sharing the
  // timber/beam draws, including their shadow submissions.
  scene.add(...batchStaticMeshes(THREE, woodParts, { name: 'LaunchTimber' }));
}

/** Layered spruce silhouettes share geometry; only nearby trees use full crowns. */
function addTrees(THREE, scene, models, sunDirection) {
  const placements = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(), position = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function plant(x, y, z, size, angle, variant, shade) {
    position.set(x, y, z); rotation.setFromAxisAngle(up, angle);
    matrix.compose(position, rotation, scale.set(size, size, size));
    placements.push({ matrix: matrix.clone(), variant, shade, size, yaw: angle, x, y, z,
      sphere: new THREE.Sphere(new THREE.Vector3(x, y + size * 10.75, z), size * 14) });
  }
  // Connected forest belts follow the valley margins. Large warped density
  // fields, rather than independent circular groves, leave natural meadow bays.
  const cells = new Map(), cellSize = 7;
  function openGround(x, z) {
    if (Math.hypot(x - MARK.x, z - MARK.z) < 150) return false;
    if (Math.abs(x - LAUNCH.x) < 70 && Math.abs(z - LAUNCH.z) < 70) return false;
    if (z > LAUNCH.z - 100 && z < 260 && Math.abs(x) < 80) return false;
    if (slopeAt(x, z) > .75) return false;
    const column = Math.floor(x / cellSize), row = Math.floor(z / cellSize);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const point of cells.get(`${column + dx},${row + dz}`) || []) {
        if ((point[0] - x) ** 2 + (point[1] - z) ** 2 < 36) return false;
      }
    }
    const key = `${column},${row}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push([x, z]);
    return true;
  }
  const candidates = [], spacing = 17;
  for (let row = 0; row < 167; row++) for (let column = 0; column < 167; column++) {
    const seed = row * 167 + column;
    const x = -1411 + column * spacing + (hash(seed, 97) - .5) * 12;
    const z = -1411 + row * spacing + (hash(seed, 101) - .5) * 12;
    const warpedX = x + Math.sin(z / 330) * 85;
    const broad = noise(warpedX / 430 + 11, z / 390 - 6);
    const local = noise(x / 165 - 8, z / 180 + 3);
    const margin = smooth(100, 470, Math.abs(x)) * .16;
    const forest = broad * .68 + local * .32 + margin;
    if (forest < .46) continue;
    candidates.push({ x, z, seed, forest, order: hash(seed, 107) });
  }
  candidates.sort((a, b) => a.order - b.order);
  for (const { x, z, seed, forest } of candidates) {
    if (placements.length >= 12_500) break;
    if (!openGround(x, z)) continue;
    const maturity = smooth(.46, .75, forest);
    const size = 1.02 + hash(seed, 113) * .46 + maturity * .32;
    plant(x, terrainHeight(x, z), z, size, hash(seed, 127) * Math.PI * 2,
      seed % 3, .72 + hash(seed, 131) * .32);
  }
  // Mature boundary trees frame the ridge while preserving the run corridor.
  for (const [index, [x, z, size]] of [[-84, -586, 1.8], [-93, -571, 1.55],
    [-88, -544, 1.72], [81, -606, 1.68], [89, -580, 1.8], [94, -557, 1.48],
    [86, -524, 1.62], [-77, -638, 1.5]].entries()) {
    if (openGround(x, z)) plant(x, groundUnder(x, z), z, size, index * 1.93, index % 3, .83);
  }

  const shadows = createForestShadowMap(THREE, placements, { sunDirection });

  const buckets = models.treeVariants.map((variant, index) => {
    const capacity = placements.filter(item => item.variant === index).length;
    const near = new THREE.InstancedMesh(variant.near, variant.foliageMaterial, capacity);
    const farGeometry = variant.impostorMaterial ? variant.far.clone() : variant.far;
    if (variant.impostorMaterial) farGeometry.setAttribute('impostorView',
      new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1));
    const far = new THREE.InstancedMesh(farGeometry, variant.impostorMaterial || variant.foliageMaterial, capacity);
    const trunk = new THREE.InstancedMesh(variant.trunk, variant.trunkMaterial, capacity);
    for (const object of [near, far, trunk]) {
      object.count = 0;
      object.name = 'AlpineSpruce';
      object.userData.alpineTree = true;
      object.userData.treePart = object === trunk ? 'trunk' : object === near ? 'near' : 'far';
      object.userData.placementCount = placements.length;
      // Individual tree spheres are filtered below; a changing aggregate bound
      // would cost more than these nine shared draws.
      object.frustumCulled = false;
      object.receiveShadow = object !== far;
      object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(object);
    }
    return { near, far, trunk, impostor: !!variant.impostorMaterial };
  });
  const color = new THREE.Color(), frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
  const view = new Float64Array(16), lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  let level = 'high', changed = true, cameraReady = false;
  const ranges = { high: 80, medium: 60, low: 35 };

  function updateDetail(cameraPosition, camera) {
    if (camera) camera.updateMatrixWorld();
    // Both lens changes and camera movement change visibility. In particular,
    // a stationary viewport resize/FOV adjustment must not keep an old frustum.
    if (camera) projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const elements = camera ? projection.elements : null;
    let viewChanged = changed || lastPosition.distanceToSquared(cameraPosition) > .01 || !!camera !== cameraReady;
    if (elements) {
      for (let index = 0; index < 16; index++) if (elements[index] !== view[index]) viewChanged = true;
    }
    if (!viewChanged) return;
    lastPosition.copy(cameraPosition); cameraReady = !!camera; changed = false;
    if (elements) {
      view.set(elements);
      frustum.setFromProjectionMatrix(projection);
    }
    for (const bucket of buckets) bucket.near.count = bucket.far.count = bucket.trunk.count = 0;
    for (const item of placements) {
      if (camera && !frustum.intersectsSphere(item.sphere)) continue;
      const bucket = buckets[item.variant];
      const close = item.sphere.center.distanceTo(cameraPosition) < ranges[level];
      const crown = close ? bucket.near : bucket.far;
      if (!close && bucket.impostor) {
        const direction = Math.atan2(cameraPosition.x - item.x, cameraPosition.z - item.z);
        rotation.setFromAxisAngle(up, direction);
        position.set(item.x, item.y, item.z);
        matrix.compose(position, rotation, scale.setScalar(item.size));
        crown.setMatrixAt(crown.count, matrix);
        const view = ((Math.round((direction - item.yaw) / (Math.PI / 2)) % 4) + 4) % 4;
        crown.geometry.attributes.impostorView.setX(crown.count, view);
      } else crown.setMatrixAt(crown.count, item.matrix);
      color.setScalar(item.shade); crown.setColorAt(crown.count++, color);
      // The baked view already contains the trunk and branches; submitting the
      // high-detail woody mesh for every distant tree defeats the impostor LOD.
      if (close || !bucket.impostor) bucket.trunk.setMatrixAt(bucket.trunk.count++, item.matrix);
    }
    for (const bucket of buckets) {
      bucket.near.castShadow = level !== 'low';
      for (const object of [bucket.near, bucket.far, bucket.trunk]) {
        object.visible = object.count > 0;
        object.instanceMatrix.needsUpdate = true;
        if (object.instanceColor) object.instanceColor.needsUpdate = true;
        if (object.geometry.attributes.impostorView) object.geometry.attributes.impostorView.needsUpdate = true;
      }
    }
  }
  updateDetail(new THREE.Vector3(0, 250, LAUNCH.z));
  return {
    shadowMap: shadows.texture, shadowBounds: shadows.bounds,
    updateDetail,
    setQuality(next) {
      if (!(next in ranges) || next === level) return false;
      level = next; changed = true;
      updateDetail(lastPosition);
      return true;
    },
  };
}

/** Grounded details tell the scale of the launch and the valley. */
function addAlpineProps(THREE, scene, models, materials) {
  const place = (name, x, z, yaw = 0, size = 1, surface = groundUnder(x, z)) => {
    const source = models.props[name];
    if (!source) return;
    const prop = source.clone(true);
    prop.position.set(x, surface, z); prop.rotation.y = yaw; prop.scale.setScalar(size);
    prop.name = 'Alpine' + name;
    prop.userData.decorative = true;
    prop.traverse(object => {
      if (!object.isMesh) return;
      const name = object.material?.name || '';
      if (name === 'AlpineGranite' && materials.granite) object.material = materials.granite;
      else if (/Alpine(Wood|Endgrain)/.test(name) && materials.timber) object.material = materials.timber;
      else if (name === 'AlpineIron' && materials.metal) object.material = materials.metal;
      object.castShadow = true; object.receiveShadow = true;
    });
    scene.add(prop);
  };
  // Keep equipment behind the run and outside the control frame's full span.
  place('EquipmentCrate', -7.8, LAUNCH.z - 21, -.22);
  place('TrailSign', -9, LAUNCH.z - 29, -.45);
  place('Cairn', 8.6, LAUNCH.z - 26);
  const boulders = [[-16,-28,1.1],[14,-38,.75],[-24,-16,.9],[67,-50,1.3],[84,-20,.8]];
  boulders.forEach(([x, z, size], index) => place(index % 2 ? 'BoulderA' : 'BoulderB', x, LAUNCH.z + z, index * 1.7, size));
  // A refuge and outbuilding sit well outside the landing field and approach.
  place('Cabin', -190, 118, 1.2, 1.4);
  place('Cabin', -206, 139, 1.08, .7);
}

/** Five tapered blades give each meadow instance a grassy, rather than conical, silhouette. */
function createMeadowTuft(THREE) {
  const positions = [], indices = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.4, x = Math.cos(angle), z = Math.sin(angle);
    const height = .65 + .35 * Math.sin(blade + 1.2) ** 2;
    const first = positions.length / 3;
    positions.push(-z * .065, -.55, x * .065, z * .065, -.55, -x * .065,
      x * .31 + z * .014, height - .55, z * .31 - x * .014,
      x * .31 - z * .014, height - .55, z * .31 + x * .014);
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Grass tufts: close detail that rushes past when flying low, so speed reads near the ground. */
function addGrass(THREE, scene) {
  const tileSize = 200;
  const distances = { high: Infinity, medium: 350, low: 220 };
  const hysteresis = 25;
  const geometry = createMeadowTuft(THREE);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
  const tiles = new Map();
  let count = 0;
  for (let i = 0; i < 30000 && count < 9000; i++) {
    const x = (hash(i, 23) - .5) * 2400, z = (hash(i, 29) - .5) * 2400;
    if (Math.hypot(x - MARK.x, z - MARK.z) < 66) continue;
    const key = `${Math.floor(x / tileSize)},${Math.floor(z / tileSize)}`;
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(i);
    count++;
  }

  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const pale = new THREE.Color('#b3b25c');
  const chunks = [];
  for (const indices of tiles.values()) {
    const grass = new THREE.InstancedMesh(geometry, material, indices.length);
    indices.forEach((i, index) => {
      const x = (hash(i, 23) - .5) * 2400;
      const z = (hash(i, 29) - .5) * 2400;
      const size = .18 + hash(i, 31) * .32;
      rotation.setFromAxisAngle(up, hash(i, 37) * 6.28);
      position.set(x, terrainHeight(x, z) + .4 * size, z);
      scale.set(size, size * (.7 + hash(i, 41)), size);
      matrix.compose(position, rotation, scale);
      grass.setMatrixAt(index, matrix);
      color.set('#6f9b46').lerp(pale, hash(i, 43)).multiplyScalar(.75 + hash(i, 47) * .35);
      grass.setColorAt(index, color);
    });
    grass.instanceMatrix.needsUpdate = true;
    grass.instanceColor.needsUpdate = true;
    // Each chunk has an actual instance bound, so Three.js can discard offscreen
    // grass rather than submitting the entire world as one instanced draw.
    grass.computeBoundingBox();
    grass.computeBoundingSphere();
    grass.userData.noShadow = true;
    chunks.push(grass);
    scene.add(grass);
  }

  const lastCameraPosition = new THREE.Vector3();
  let hasCameraPosition = false;
  let level = 'high';
  function refreshVisibility() {
    const distance = distances[level];
    for (const chunk of chunks) {
      // Bounds include every tuft, so a nearby edge remains visible even when
      // the tile centre is farther away. The margin avoids boundary flicker.
      chunk.visible = distance === Infinity || !hasCameraPosition
        || chunk.boundingBox.distanceToPoint(lastCameraPosition)
          <= distance + (chunk.visible ? hysteresis : 0);
    }
  }

  return {
    updateDetail(cameraPosition) {
      lastCameraPosition.copy(cameraPosition);
      hasCameraPosition = true;
      refreshVisibility();
    },
    setQuality(nextLevel) {
      if (!Object.hasOwn(distances, nextLevel) || nextLevel === level) return false;
      level = nextLevel;
      refreshVisibility();
      return true;
    },
  };
}

/** Birds circling the thermal: the only cue for it, as in the game. */
function addBirds(THREE, scene) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.6, 0, .5), new THREE.Vector3(0, .35, 0), new THREE.Vector3(1.6, 0, .5)]), birds = [];
  for (let i = 0; i < 6; i++) { const b = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#2a3a44' })); scene.add(b); birds.push(b); }
  return birds;
}
