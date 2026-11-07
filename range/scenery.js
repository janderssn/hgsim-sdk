/**
 * Draws the landing range's world (world.js) with Three.js: the terrain coloured by height and slope, the bullseye on the
 * field, the rocks with the ramp's deck and its timbers, trees, close grass for a sense of speed low down, and the birds
 * that mark the thermal. Nothing here is solid: the ground the flight and the launch feel is world.js.
 */
import { hash, noise, terrainHeight, slopeAt, LAUNCH, MARK, ROCKS, rockRing, DECK_BACK, DECK_LIP, DECK_FALL, CLIFF_EDGE, ROCK_TOP, RAMP_POSTS, deckY } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Adds scenery and returns birds, drawing quality, and camera-detail updates.
 * Quality changes affect drawing only; world.js remains the physics source.
 */
export function buildScenery(THREE, scene) {
  const terrain = addTerrain(THREE, scene);
  addMark(THREE, scene);
  addLaunch(THREE, scene);
  addTrees(THREE, scene);
  const grass = addGrass(THREE, scene);
  return {
    birds: addBirds(THREE, scene),
    setQuality(level) {
      const terrainChanged = terrain.setQuality(level);
      const grassChanged = grass.setQuality(level);
      return terrainChanged || grassChanged;
    },
    updateDetail: grass.updateDetail,
  };
}

const TERRAIN_SEGMENTS = { high: 240, medium: 160, low: 96 };

/** Samples the same world and colours at each terrain drawing resolution. */
function createTerrainGeometry(THREE, segments) {
  const SIZE = 3200, g = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
  const meadow = new THREE.Color('#6f9b46'), dry = new THREE.Color('#9aa65a'), rock = new THREE.Color('#8d8a80'), mown = new THREE.Color('#7fb155'), stripe = new THREE.Color('#74a64c');
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

/** One terrain mesh/material with lazily cached alternative drawing geometries. */
function addTerrain(THREE, scene) {
  const geometries = new Map([
    ['high', createTerrainGeometry(THREE, TERRAIN_SEGMENTS.high)],
  ]);
  const terrain = new THREE.Mesh(
    geometries.get('high'),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);
  return {
    setQuality(level) {
      if (!Object.hasOwn(TERRAIN_SEGMENTS, level)) return false;
      if (!geometries.has(level)) {
        geometries.set(level, createTerrainGeometry(THREE, TERRAIN_SEGMENTS[level]));
      }
      const geometry = geometries.get(level);
      if (terrain.geometry === geometry) return false;
      // The scene has a static lifetime. Retain these three geometries so a
      // quality recovery never rebuilds buffers or disposes an active geometry.
      terrain.geometry = geometry;
      return true;
    },
  };
}

/** The mark: bullseye rings on the field and the 60 m landing zone, with four cones at the field's corners to judge drift by. */
function addMark(THREE, scene) {
  const ring = (inner, outer, color, y = .07) => { const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), new THREE.MeshStandardMaterial({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(MARK.x, terrainHeight(MARK.x, MARK.z) + y, MARK.z); m.receiveShadow = true; scene.add(m); return m; };
  ring(0, 6, '#e23c2e', .09); ring(6, 7.2, '#f6f1e6', .085); ring(13.8, 15, '#f6f1e6'); ring(28.6, 30, '#f6f1e6'); ring(59, 60, '#f6f1e6', .06);
  for (const [x, z] of [[-70, -70], [70, -70], [-70, 70], [70, 70]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(.9, 2.4, 10), new THREE.MeshStandardMaterial({ color: '#f6f1e6', roughness: .8 })); cone.position.set(x, terrainHeight(x, z) + 1.2, z); cone.castShadow = true; scene.add(cone); }
}

/** The two rocks (their rings, with a wobble), and the ramp's deck on the first: planks, stringers and struts to the rock face. */
function addLaunch(THREE, scene) {
  const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true });
  for (const r of ROCKS) {
    const rings = 16, sides = 36, verts = [], faces = [], colors = [], grey = new THREE.Color('#8d8a80'), moss = new THREE.Color('#71794f'), cap = new THREE.Color('#7c9a4b'), c = new THREE.Color();
    for (let i = 0; i <= rings; i++) {
      const k = i / rings, { y, rx, rz } = rockRing(r, k);
      for (let s = 0; s < sides; s++) {
        const a = s / sides * Math.PI * 2, n = noise(Math.cos(a) * 2.6 + i * .35 + 7, Math.sin(a) * 2.6 - i * .3), wob = 1 + (n - .5) * (.3 + .4 * Math.min(1, k * 3));
        verts.push(r.cx + Math.cos(a) * rx * wob, y + (noise(a * 3, i * 1.3) - .5) * 3 * Math.min(1, k * 4), r.cz + Math.sin(a) * rz * wob);
        c.copy(grey).lerp(moss, smooth(.5, 1, k) * .9).lerp(cap, 1 - smooth(0, .12, k)).multiplyScalar(.74 + .42 * noise(a * 5 + 3, i * 1.4)); colors.push(c.r, c.g, c.b);
        const b = (s + 1) % sides; if (i < rings) faces.push(i * sides + s, i * sides + b, (i + 1) * sides + s, i * sides + b, (i + 1) * sides + b, (i + 1) * sides + s);
      }
    }
    const lid = verts.length / 3; verts.push(r.cx, r.top - .4, r.cz); colors.push(cap.r, cap.g, cap.b); for (let s = 0; s < sides; s++) faces.push(lid, (s + 1) % sides, s);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(faces); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockMaterial); m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  const timber = new THREE.MeshStandardMaterial({ color: '#776954', roughness: .85 });
  for (let z = DECK_BACK; z < DECK_LIP; z += 1.5) { const plank = new THREE.Mesh(new THREE.BoxGeometry(7, .14, 1.38 * Math.hypot(1, DECK_FALL)), timber); plank.position.set(LAUNCH.x, deckY(LAUNCH.z + z + .75) - .07, LAUNCH.z + z + .75); plank.rotation.x = Math.atan(DECK_FALL); plank.castShadow = plank.receiveShadow = true; scene.add(plank); }
  // A timber between two points, for the stringers under the deck and the struts down to the rock face.
  const beam = (x, y0, z0, y1, z1, r) => { const a = new THREE.Vector3(x, y0, z0), b = new THREE.Vector3(x, y1, z1), d = b.clone().sub(a), t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, d.length(), 6), timber); t.position.copy(a).addScaledVector(d, .5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); t.castShadow = true; scene.add(t); };
  // Height of the ramp rock's face at z: its front widens as it falls.
  const under = ROCKS[0], faceY = z => { let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const k = (lo + hi) / 2; if (rockRing(under, k).rz < z - under.cz) lo = k; else hi = k; } return rockRing(under, lo).y; };
  // Arms out from the deck's edges to the streamer poles beside it (the poles are the streamers' own sticks).
  for (const p of RAMP_POSTS) { const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(p.x - LAUNCH.x) - 3.4, .12, .14), timber); arm.position.set((p.x + LAUNCH.x + p.side * 3.4) / 2, p.y - .06, p.z); arm.castShadow = true; scene.add(arm); }
  const at = z => LAUNCH.z + z;
  for (const x of [-3.1, 3.1]) {
    beam(LAUNCH.x + x, deckY(at(DECK_BACK)) - .25, at(DECK_BACK), deckY(at(DECK_LIP)) - .25, at(DECK_LIP), .13);
    for (const z of [DECK_BACK + 1, CLIFF_EDGE + 1]) beam(LAUNCH.x + x, deckY(at(z)) - .2, at(z), ROCK_TOP - 1, at(z), .14);
    for (const [z, foot] of [[-9, -15], [-2, -10], [DECK_LIP - .6, -6]]) beam(LAUNCH.x + x, deckY(at(z)) - .25, at(z), faceY(at(foot)) - 1, at(foot) - 1, .14);
  }
}

/** Trees: instanced trunks and crowns, away from the field and the launch and off the steepest ground. */
function addTrees(THREE, scene) {
  const n = 700, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .34, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#5a4332', roughness: .95 }), n);
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 8.5, 7), new THREE.MeshStandardMaterial({ color: '#2f5f33', roughness: .92 }), n);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0); let k = 0;
  for (let i = 0; i < 6000 && k < n; i++) {
    const x = (hash(i, 7) - .5) * 2800, z = (hash(i, 11) - .5) * 2800;
    if (Math.hypot(x - MARK.x, z - MARK.z) < 150 || (Math.abs(x - LAUNCH.x) < 70 && Math.abs(z - LAUNCH.z) < 60)) continue;
    if (slopeAt(x, z) > .75 || hash(i, 13) > .35 + .5 * noise(x / 300, z / 300)) continue;
    const s = .8 + hash(i, 17) * .7, y = terrainHeight(x, z);
    Q.setFromAxisAngle(Y, hash(i, 19) * 6.28); V.set(x, y + 1.5 * s, z); M.compose(V, Q, S.set(s, s, s)); trunk.setMatrixAt(k, M);
    V.set(x, y + 3 * s + 4.2 * s, z); M.compose(V, Q, S.set(s, s, s)); crown.setMatrixAt(k, M); k++;
  }
  trunk.count = crown.count = k; trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true; scene.add(trunk, crown);
}

/** Grass tufts: close detail that rushes past when flying low, so speed reads near the ground. */
function addGrass(THREE, scene) {
  const tileSize = 200;
  const distances = { high: Infinity, medium: 350, low: 220 };
  const hysteresis = 25;
  const geometry = new THREE.ConeGeometry(.55, 1.1, 5);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
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
      const size = .6 + hash(i, 31) * 1.3;
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
