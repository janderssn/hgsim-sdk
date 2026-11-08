/**
 * Static soft canopy/contact shadows from the real planted tree positions.
 * This is a drawing-only visibility map; it never changes the numerical world.
 */
export function createForestShadowMap(THREE, trees, {
  resolution = 1024, minX = -1600, minZ = -1600, size = 3200,
  sunDirection = { x: .59047, y: .68207, z: .43144 },
} = {}) {
  const shade = new Float32Array(resolution * resolution);
  const pixelsPerMetre = resolution / size;
  const sunHeight = Math.max(.25, sunDirection.y);
  const directionLength = Math.hypot(sunDirection.x, sunDirection.z) || 1;
  const alongX = -sunDirection.x / directionLength;
  const alongZ = -sunDirection.z / directionLength;

  function stamp(x, z, longRadius, crossRadius, strength) {
    const centreX = (x - minX) * pixelsPerMetre;
    const centreZ = (z - minZ) * pixelsPerMetre;
    const radius = Math.ceil(Math.max(longRadius, crossRadius) * pixelsPerMetre * 2.8);
    const left = Math.max(0, Math.floor(centreX) - radius), right = Math.min(resolution - 1, Math.ceil(centreX) + radius);
    const bottom = Math.max(0, Math.floor(centreZ) - radius), top = Math.min(resolution - 1, Math.ceil(centreZ) + radius);
    for (let row = bottom; row <= top; row++) for (let column = left; column <= right; column++) {
      const dx = (column + .5 - centreX) / pixelsPerMetre;
      const dz = (row + .5 - centreZ) / pixelsPerMetre;
      const along = (dx * alongX + dz * alongZ) / longRadius;
      const across = (-dx * alongZ + dz * alongX) / crossRadius;
      const amount = strength * Math.exp(-.5 * (along * along + across * across));
      const index = row * resolution + column;
      shade[index] = Math.min(.57, shade[index] + amount);
    }
  }
  for (const tree of trees) {
    const scale = tree.size || 1;
    // A broad soft crown shadow follows the actual sun azimuth. A tighter
    // contact lobe anchors the trunk even under diffuse/cloudy illumination.
    const crownHeight = tree.height ? tree.height * .62 : scale * 9.5;
    const shadowLength = Math.min(35, crownHeight * directionLength / sunHeight);
    stamp(tree.x + alongX * shadowLength * .63, tree.z + alongZ * shadowLength * .63,
      (tree.crownRadius ? tree.crownRadius * .9 : 4 + scale * 3.3) + shadowLength * .14,
      tree.crownRadius ? Math.max(2, tree.crownRadius * .65) : 2.4 + scale * 2, .19);
    stamp(tree.x, tree.z, 1.6 + scale * .5, 1.6 + scale * .5, .2);
  }
  const data = new Uint8Array(resolution * resolution * 4);
  for (let index = 0; index < shade.length; index++) {
    const visibility = Math.round((1 - shade[index]) * 255);
    data[index * 4] = data[index * 4 + 1] = data[index * 4 + 2] = visibility;
    data[index * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat);
  texture.name = 'Baked forest canopy and contact visibility';
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;
  return { texture, bounds: { minX, minZ, size } };
}
