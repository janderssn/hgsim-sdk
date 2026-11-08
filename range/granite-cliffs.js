import { LAUNCH_GEOLOGY } from './world.js';

/** The single connected escarpment, using the physical source without offsets. */
export function createLaunchEscarpmentGeometry(THREE, source = LAUNCH_GEOLOGY) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(source.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(source.colours, 3));
  const ordered = [[], []];
  for (let face = 0; face < source.indices.length / 3; face++) {
    const group = ordered[source.materialIndices[face]];
    group.push(source.indices[face * 3], source.indices[face * 3 + 1], source.indices[face * 3 + 2]);
  }
  geometry.setIndex([...ordered[0], ...ordered[1]]);
  // Area-weighted normals preserve broad rounded shoulders. The positions
  // still use the same exact contact triangles; hard shading every triangle
  // had made the apron appear as a row of artificial pyramids.
  geometry.computeVertexNormals();
  const flat = geometry.toNonIndexed();
  flat.addGroup(0, ordered[0].length, 0);
  flat.addGroup(ordered[0].length, ordered[1].length, 1);
  flat.computeBoundingBox(); flat.computeBoundingSphere();
  flat.userData.sharedPhysicalSurface = 'launch-escarpment';
  geometry.dispose();
  return flat;
}
