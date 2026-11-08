/** Original bone-following flight equipment, authored in the standing Pilot frame. */
export function addPilotEquipment(THREE, scene) {
  const pilot = scene.getObjectByName('Pilot');
  const names = ['Chest', 'Head', 'Pelvis', 'Foot_L', 'Foot_R'];
  if (!pilot || names.some(name => !pilot.getObjectByName(name))) return { geometries: [], materials: [] };
  scene.updateMatrixWorld(true);
  const cloth = new THREE.MeshStandardMaterial({ name: 'Pilot / equipment canvas', vertexColors: true, color: 0xffffff, roughness: .92 });
  const metal = new THREE.MeshStandardMaterial({ name: 'Pilot / equipment hardware', vertexColors: true, color: 0xffffff, roughness: .48, metalness: .42 });
  const batches = new Map(), color = new THREE.Color();
  function part(boneName, geometry, centre, scale, pigment, material = cloth, rotation = null) {
    const bone = pilot.getObjectByName(boneName), key = boneName + ':' + material.id;
    if (!batches.has(key)) batches.set(key, { bone, material, positions: [], normals: [], colors: [], uvs: [] });
    const batch = batches.get(key), matrix = new THREE.Matrix4().makeScale(...scale);
    if (rotation) matrix.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));
    matrix.setPosition(...centre);
    matrix.premultiply(new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(pilot.matrixWorld));
    geometry.applyMatrix4(matrix);
    const draw = geometry.index ? geometry.toNonIndexed() : geometry;
    const positions = draw.attributes.position, normals = draw.attributes.normal, uv = draw.attributes.uv;
    color.set(pigment);
    for (let i = 0; i < positions.count; i++) {
      batch.positions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
      batch.normals.push(normals.getX(i), normals.getY(i), normals.getZ(i));
      batch.colors.push(color.r, color.g, color.b);
      batch.uvs.push(uv?.getX(i) || 0, uv?.getY(i) || 0);
    }
    if (draw !== geometry) draw.dispose(); geometry.dispose();
  }
  const box = (bone, p, size, pigment, material = cloth, rotation) => part(bone, new THREE.BoxGeometry(1, 1, 1), p, size, pigment, material, rotation);
  const round = (bone, p, size, pigment, material = cloth) => part(bone, new THREE.SphereGeometry(1, 12, 8), p, size, pigment, material);
  function seam(bone, points, radius, pigment, material = cloth) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    part(bone, new THREE.TubeGeometry(curve, 12, radius, 4, false), [0, 0, 0], [1, 1, 1], pigment, material);
  }
  // A compact padded backplate and two reserve-equipment pockets read at chase
  // distance. They follow the chest bone, including launch swing and weight shift.
  round('Chest', [0, .34, -.145], [.17, .205, .095], '#615d39');
  for (const side of [-1, 1]) {
    round('Chest', [side * .138, .33, -.18], [.055, .16, .065], '#4b5137');
    seam('Chest', [[side * .11, .53, -.14], [side * .13, .43, -.23], [side * .13, .24, -.23], [side * .12, .17, -.13]], .021, '#33392d');
    box('Chest', [side * .13, .29, -.25], [.055, .072, .018], '#b3a58b', metal);
    box('Chest', [side * .13, .29, -.262], [.027, .042, .009], '#292e29');
    seam('Chest', [[side * .085, .50, -.218], [side * .085, .38, -.24], [side * .085, .21, -.215]], .004, '#c6b483');
  }
  seam('Chest', [[0, .50, -.24], [0, .34, -.255], [0, .19, -.225]], .006, '#292e29');
  box('Chest', [0, .45, -.255], [.042, .035, .014], '#c09b63', metal);
  // Small stitched identity patch, with a geometric mountain crest.
  box('Chest', [0, .35, -.25], [.115, .070, .008], '#d4bf8d');
  box('Chest', [-.019, .351, -.257], [.032, .032, .006], '#4b5e4e', cloth, [0, 0, -.65]);
  box('Chest', [.022, .345, -.257], [.025, .024, .006], '#4b5e4e', cloth, [0, 0, .65]);
  // Rear helmet ventilation slots and a broad safety stripe break the blank cap.
  for (const side of [-1, 1]) {
    for (const y of [.755, .79]) box('Head', [side * .048, y, -.115], [.048, .014, .013], '#283731');
    seam('Head', [[side * .095, .73, -.045], [side * .075, .675, .025], [side * .035, .658, .10]], .007, '#373b32');
  }
  seam('Head', [[0, .70, -.115], [0, .78, -.132], [0, .87, -.08]], .011, '#ae4d2a');
  // Heel panels and actual tread faces remain inside the authored foot envelope.
  for (const [tag, side] of [['L', -1], ['R', 1]]) {
    box('Foot_' + tag, [side * .105, -.948, .045], [.12, .055, .20], '#33392f');
    for (let row = 0; row < 5; row++) box('Foot_' + tag,
      [side * .105, -.979, -.033 + row * .038], [.116, .013, .018], '#817352');
  }
  const geometries = [];
  for (const [key, batch] of batches) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, batch.material); mesh.name = 'FlightEquipment-' + key.split(':')[0];
    mesh.castShadow = mesh.receiveShadow = true; batch.bone.add(mesh);
  }
  return { geometries, materials: [cloth, metal] };
}
