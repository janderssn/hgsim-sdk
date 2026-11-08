/** Merge small static opaque meshes into one world-space draw per material. */
export function batchStaticMeshes(THREE, meshes, { name = 'StaticBatch' } = {}) {
  const groups = new Map();
  // Validate everything first: an unsupported input must not leave a partially
  // built batch or consume any of the caller's geometry/material ownership.
  for (const mesh of meshes) {
    const geometry = mesh?.geometry, material = mesh?.material;
    if (!mesh?.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh || !geometry?.isBufferGeometry
      || geometry.isInstancedBufferGeometry || !material?.isMaterial || material.transparent
      || Array.isArray(material) || Object.keys(geometry.morphAttributes).length) {
      throw new TypeError('Static batching requires ordinary opaque meshes with one material and no morph targets');
    }
    const position = geometry.getAttribute('position');
    const drawCount = geometry.index?.count ?? position?.count ?? 0;
    if (!position || position.itemSize !== 3 || drawCount % 3
      || geometry.drawRange.start !== 0
      || (geometry.drawRange.count !== Infinity && geometry.drawRange.count !== drawCount)) {
      throw new TypeError('Static batching requires a complete triangle geometry');
    }
    const attributes = Object.keys(geometry.attributes).sort();
    for (const key of attributes) {
      const attribute = geometry.getAttribute(key);
      if (attribute.count !== position.count || attribute.isInterleavedBufferAttribute
        || attribute.isInstancedBufferAttribute || attribute.isFloat16BufferAttribute) {
        throw new TypeError('Static batching requires ordinary compatible vertex attributes');
      }
    }
    const layout = JSON.stringify(attributes.map(key => {
      const attribute = geometry.getAttribute(key);
      return [key, attribute.itemSize, attribute.normalized, attribute.array.constructor.name, attribute.gpuType];
    }));
    if (!groups.has(material)) groups.set(material, { meshes: [], attributes, layout });
    const group = groups.get(material);
    if (layout !== group.layout) throw new TypeError('Static meshes sharing a material must have compatible vertex attributes');
    group.meshes.push(mesh);
  }

  const output = [];
  for (const [material, group] of groups) {
    const baked = [];
    try {
      let vertexCount = 0, indexCount = 0;
      for (const mesh of group.meshes) {
        mesh.updateWorldMatrix(true, false);
        const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        const count = geometry.getAttribute('position').count;
        if (!geometry.index) geometry.setIndex(Array.from({ length: count }, (_, index) => index));
        // A source Mesh normally handles mirrored winding in its renderer state.
        // The merged world-space mesh has an identity transform, so bake it too.
        if (mesh.matrixWorld.determinant() < 0) {
          const index = geometry.index;
          for (let triangle = 0; triangle < index.count; triangle += 3) {
            const second = index.getX(triangle + 1);
            index.setX(triangle + 1, index.getX(triangle + 2));
            index.setX(triangle + 2, second);
          }
          const tangent = geometry.getAttribute('tangent');
          if (tangent) for (let vertex = 0; vertex < tangent.count; vertex++) tangent.setW(vertex, -tangent.getW(vertex));
        }
        baked.push(geometry);
        vertexCount += count; indexCount += geometry.index.count;
      }

      const merged = new THREE.BufferGeometry();
      for (const key of group.attributes) {
        const first = baked[0].getAttribute(key);
        const array = new first.array.constructor(vertexCount * first.itemSize);
        let offset = 0;
        for (const geometry of baked) {
          const source = geometry.getAttribute(key).array;
          array.set(source, offset); offset += source.length;
        }
        const attribute = new THREE.BufferAttribute(array, first.itemSize, first.normalized);
        attribute.gpuType = first.gpuType;
        merged.setAttribute(key, attribute);
      }
      const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
      let offset = 0, vertexOffset = 0;
      for (const geometry of baked) {
        for (let index = 0; index < geometry.index.count; index++) indices[offset++] = geometry.index.getX(index) + vertexOffset;
        vertexOffset += geometry.getAttribute('position').count;
      }
      merged.setIndex(new THREE.BufferAttribute(indices, 1));
      merged.computeBoundingBox(); merged.computeBoundingSphere();
      const batch = new THREE.Mesh(merged, material);
      batch.name = groups.size === 1 ? name : `${name}:${output.length + 1}`;
      batch.castShadow = group.meshes.some(mesh => mesh.castShadow);
      batch.receiveShadow = group.meshes.some(mesh => mesh.receiveShadow);
      batch.userData.staticBatch = { sourceCount: group.meshes.length };
      output.push(batch);
    } finally {
      for (const geometry of baked) geometry.dispose();
    }
  }
  return output;
}
