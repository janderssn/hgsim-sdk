import { batchStaticMeshes } from './static-batch.js';

/**
 * Original, modest launch hardware and trail furniture. Everything is decorative,
 * outside the run/wing envelope, and grounded by the caller's canonical world.
 */
export function createCorridorDetails(THREE, scene, {
  terrainHeight, groundUnder = terrainHeight, launch = { x: 0, z: -560 },
  deckBack = -22, deckLip = 6, deckY = z => groundUnder(launch.x, z), ecologyAt, materials = {},
} = {}) {
  if (typeof terrainHeight !== 'function' || typeof groundUnder !== 'function') {
    throw new TypeError('Corridor detail needs canonical world height callbacks');
  }
  const ownedMaterials = [];
  function material(supplied, parameters) {
    if (supplied) return supplied;
    const result = new THREE.MeshStandardMaterial(parameters); ownedMaterials.push(result); return result;
  }
  const timber = material(materials.timberBeam || materials.timber, { color: '#655e4d', roughness: .95 });
  const iron = material(materials.metal, { color: '#6a6d66', metalness: .68, roughness: .67 });
  const endgrain = new THREE.MeshStandardMaterial({ color: '#8a8064', roughness: .97 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#d7c8a5', roughness: .89 });
  const orange = new THREE.MeshStandardMaterial({ color: '#b35e27', roughness: .88 });
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: '#938369', roughness: .98 });
  ownedMaterials.push(endgrain, ivory, orange, ropeMaterial);
  const parts = [], trailParts = [], sourceGeometries = new Set();
  const up = new THREE.Vector3(0, 1, 0);
  let disposed = false;
  function trailCentre(z, fallback) {
    if (!ecologyAt) return fallback;
    let weightedX = 0, weight = 0;
    for (let offset = -36; offset <= 12; offset++) {
      const x = launch.x + offset, path = ecologyAt(x, z)?.path;
      if (Number.isFinite(path) && path > 0) { weightedX += x * path; weight += path; }
    }
    return weight > .01 ? weightedX / weight : fallback;
  }
  function mesh(geometry, finish, position, rotation, collection = parts) {
    sourceGeometries.add(geometry);
    const result = new THREE.Mesh(geometry, finish);
    result.position.set(...position);
    if (rotation) result.rotation.set(...rotation);
    result.castShadow = result.receiveShadow = true;
    collection.push(result); return result;
  }
  function between(a, b, radiusA, radiusB, finish, sides = 7, collection = parts) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const result = mesh(new THREE.CylinderGeometry(radiusB, radiusA, delta.length(), sides), finish,
      start.clone().addScaledVector(delta, .5).toArray(), null, collection);
    result.quaternion.setFromUnitVectors(up, delta.normalize()); return result;
  }
  function plate(width, depth, thickness) {
    const w = width / 2, d = depth / 2, chamfer = Math.min(width, depth) * .16;
    const shape = new THREE.Shape();
    shape.moveTo(-w + chamfer, -d); shape.lineTo(w - chamfer, -d); shape.lineTo(w, -d + chamfer);
    shape.lineTo(w, d - chamfer); shape.lineTo(w - chamfer, d); shape.lineTo(-w + chamfer, d);
    shape.lineTo(-w, d - chamfer); shape.lineTo(-w, -d + chamfer); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true,
      bevelSegments: 1, steps: 1, bevelSize: .005, bevelThickness: .004, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2); return geometry;
  }
  const anchorGeometry = plate(.38, .27, .018);
  const washerGeometry = new THREE.CylinderGeometry(.034, .034, .009, 12);
  const boltGeometry = new THREE.CylinderGeometry(.021, .021, .026, 6);
  const eyeGeometry = new THREE.TorusGeometry(.065, .012, 6, 16);
  let anchorCount = 0;
  for (const side of [-1, 1]) for (const offset of [deckBack + 1.1, -8, deckLip - 1.2]) {
    const x = launch.x + side * 3.17, z = launch.z + offset, y = deckY(z) + .018;
    if (!Number.isFinite(y)) continue;
    const deckPitch = Math.atan(-(deckY(z + .2) - deckY(z - .2)) / .4);
    mesh(anchorGeometry, iron, [x, y, z], [deckPitch, 0, 0]);
    for (const dx of [-.12, .12]) for (const dz of [-.075, .075]) {
      const localY = deckY(z + dz) + .018;
      mesh(washerGeometry, iron, [x + dx, localY + .025, z + dz], [deckPitch, 0, 0]);
      mesh(boltGeometry, iron, [x + dx, localY + .04, z + dz], [deckPitch, 0, 0]);
    }
    mesh(eyeGeometry, iron, [x, y + .07, z], [0, Math.PI / 2, 0]);
    anchorCount++;
  }

  // A small cleft post reads as established trail furniture, without map labels.
  const markerSites = [[-12.8, -34, -.16], [-24.5, -53, .23], [12.5, -35, .1]];
  let markerCount = 0, stepCount = 0, deadwoodCount = 0;
  for (const [dx, dz, yaw] of markerSites) {
    const z = launch.z + dz;
    const x = trailCentre(z, launch.x + dx - Math.sign(dx) * 4) + Math.sign(dx) * 4;
    const y = groundUnder(x, z);
    if (!Number.isFinite(y)) continue;
    const geometry = new THREE.CylinderGeometry(.075, .105, 1.06, 5, 3);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      const h = positions.getY(index);
      positions.setY(index, h + (h > .5 ? positions.getX(index) * .55 : 0));
    }
    geometry.computeVertexNormals();
    mesh(geometry, timber, [x, y + .43, z], [.025, yaw, -.035], trailParts);
    mesh(plate(.13, .13, .009), ivory, [x, y + .79, z + .08], [Math.PI / 2, 0, yaw], trailParts);
    mesh(plate(.11, .042, .01), orange, [x, y + .79, z + .092], [Math.PI / 2, 0, yaw], trailParts);
    markerCount++;
  }
  // Embedded transverse log steps and their wooden stakes follow the footpath.
  for (const [dx, dz, yaw] of [[-15.5, -39, -.18], [-20, -45, -.3], [-27, -59, -.2]]) {
    const z = launch.z + dz, x = trailCentre(z, launch.x + dx), y = groundUnder(x, z);
    if (!Number.isFinite(y)) continue;
    const direction = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const a = new THREE.Vector3(x, y + .025, z).addScaledVector(direction, -.72);
    const b = new THREE.Vector3(x, y + .045, z).addScaledVector(direction, .72);
    between(a.toArray(), b.toArray(), .12, .105, timber, 9, trailParts);
    for (const sign of [-1, 1]) {
      const foot = new THREE.Vector3(x, y, z).addScaledVector(direction, sign * .61);
      between([foot.x, y - .11, foot.z + .14], [foot.x + .025, y + .17, foot.z + .13], .027, .021, timber, 5, trailParts);
    }
    stepCount++;
  }
  // A few fallen pieces cluster at the trail margin, rather than in the flight lane.
  for (const [dx, dz, angle, length] of [[-31, -48, .8, 2.3], [25, -47, -.65, 2.6], [-45, -66, .3, 3.1]]) {
    const x = launch.x + dx, z = launch.z + dz, y = terrainHeight(x, z), ground = groundUnder(x, z);
    if (!Number.isFinite(y) || ground > y + .5) continue;
    const a = [x, y + .15, z], b = [x + Math.cos(angle) * length, 0, z + Math.sin(angle) * length];
    b[1] = terrainHeight(b[0], b[2]) + .14;
    if (!Number.isFinite(b[1]) || groundUnder(b[0], b[2]) > b[1] + .35) continue;
    between(a, b, .19, .105, timber, 11, trailParts);
    const branch = [x + Math.cos(angle) * length * .42, y + .22, z + Math.sin(angle) * length * .42];
    between(branch, [branch[0] - .34, branch[1] + .2, branch[2] + .44], .065, .016, timber, 7, trailParts);
    // A warm irregular broken end, flush with the tapering trunk.
    const cap = mesh(new THREE.CircleGeometry(.103, 11), endgrain, b, null, trailParts);
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());
    deadwoodCount++;
  }
  // The spare rope is stowed behind the run, alongside the equipment.
  const ropeX = launch.x - 9.8, ropeZ = launch.z - 29, ropeY = groundUnder(ropeX, ropeZ);
  if (Number.isFinite(ropeY)) {
    const points = [];
    for (let index = 0; index <= 150; index++) {
      const t = index / 150, angle = t * Math.PI * 8, radius = .18 + t * .27;
      points.push(new THREE.Vector3(ropeX + Math.cos(angle) * radius, ropeY + .025 + t * .012, ropeZ + Math.sin(angle) * radius * .72));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 150, .012, 5, false), ropeMaterial, [0, 0, 0], null, trailParts);
  }
  const permanent = batchStaticMeshes(THREE, parts, { name: 'LaunchAnchorHardware' });
  const trail = batchStaticMeshes(THREE, trailParts, { name: 'LaunchTrailDetails' });
  const batches = [...permanent, ...trail];
  for (const geometry of sourceGeometries) geometry.dispose();
  for (const batch of batches) {
    batch.userData.corridorDetail = true;
    batch.userData.decorative = true;
    scene.add(batch);
  }
  return {
    materials: [...new Set(batches.map(batch => batch.material))],
    get stats() { return { draws: batches.filter(batch => batch.visible).length, anchors: anchorCount, markers: markerCount,
      steps: stepCount, deadwood: deadwoodCount, triangles: batches.reduce((sum, batch) => sum + batch.geometry.index.count / 3, 0) }; },
    setQuality(level) {
      // Tiny hardware retains scale at every level; distant trail clutter can go.
      for (const batch of trail) batch.visible = level !== 'low';
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const batch of batches) { scene.remove(batch); batch.geometry.dispose(); }
      for (const finish of ownedMaterials) finish.dispose();
    },
  };
}
