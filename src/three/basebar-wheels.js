/** A matched pair of clip-on wheels on the model's base bar. */
export function attachBasebarWheels(THREE, pilot, barContacts) {
  const radius = .125, halfWidth = .04;
  const tire = new THREE.CylinderGeometry(radius, radius, halfWidth * 2, 20).rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(.064, .064, halfWidth * 2 + .006, 16).rotateZ(Math.PI / 2);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x252529, roughness: .92 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9fa0a1, roughness: .47, metalness: .65 });
  const [left, middle, right] = barContacts;
  const centers = [left, right].map(end => middle.clone().lerp(end, .8));
  const group = new THREE.Group();
  group.name = 'BasebarWheels';
  const treads = [];
  for (const center of centers) {
    const tread = new THREE.Mesh(tire, rubber), axle = new THREE.Mesh(hub, metal);
    tread.position.copy(center);
    axle.position.copy(center);
    group.add(tread, axle);
    treads.push(tread);
  }
  pilot.add(group);
  return { centers, radius, halfWidth, treads };
}
