/** Full crowns nearby, coherent lit spherical impostors over the valley. */
import { createForestField, createForestCoverageTexture } from './forest-field.js';
import { createForestShadowMap } from './forest-shadows.js';

const LEVELS = {
  high: { near: 55, mid: 125, blend: 15 },
  medium: { near: 35, mid: 85, blend: 12 },
  low: { near: 18, mid: 45, blend: 8 },
};

function lodMaterial(THREE, source, part, uniforms, atmosphere) {
  const material = source.clone();
  const previousCompile = source.onBeforeCompile;
  const previousKey = source.customProgramCacheKey.bind(source);
  material.onBeforeCompile = shader => {
    previousCompile.call(source, shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vForestLodCenter;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 forestLodOrigin = vec4(0.0, 0.0, 0.0, 1.0);
      #ifdef USE_INSTANCING
        forestLodOrigin = instanceMatrix * forestLodOrigin;
      #endif
      vForestLodCenter = (modelMatrix * forestLodOrigin).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vForestLodCenter;
      uniform vec3 forestLodCamera;
      uniform vec3 forestLodRanges;`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      float forestLodDistance = distance(forestLodCamera, vForestLodCenter);
      float forestLodFirst = smoothstep(forestLodRanges.x - forestLodRanges.z, forestLodRanges.x + forestLodRanges.z, forestLodDistance);
      float forestLodSecond = smoothstep(forestLodRanges.y - forestLodRanges.z, forestLodRanges.y + forestLodRanges.z, forestLodDistance);
      float forestLodDither = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(.06711056, .00583715))));
      ${part === 'near' ? 'if (forestLodDither < forestLodFirst) discard;' : part === 'mid'
        ? 'if (forestLodDither >= forestLodFirst || forestLodDither < forestLodSecond) discard;'
        : 'if (forestLodDither >= forestLodSecond) discard;'}
      `);
  };
  material.customProgramCacheKey = () => previousKey() + '/forest-lod-' + part;
  atmosphere?.installMaterial(material);
  return material;
}

export function createForest(THREE, scene, assets, { sunDirection, ecologyAt, groundHeight, atmosphere } = {}) {
  const field = createForestField({ variants: assets.treeVariants.length, profiles: assets.treeVariants, ecologyAt, groundHeight });
  const coverageTexture = createForestCoverageTexture(THREE, field);
  const shadows = createForestShadowMap(THREE, field.trees, { sunDirection });
  const quaternion = new THREE.Quaternion(), position = new THREE.Vector3();
  const scale = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), color = new THREE.Color();
  const uniforms = { forestLodCamera: { value: new THREE.Vector3() }, forestLodRanges: { value: new THREE.Vector3(55, 125, 15) } };
  const buckets = assets.treeVariants.map((variant, index) => {
    const capacity = field.trees.filter(tree => tree.variant === index).length;
    const make = (geometry, material, part, name) => {
      const mesh = new THREE.InstancedMesh(geometry, lodMaterial(THREE, material, part, uniforms, atmosphere), capacity);
      mesh.count = 0; mesh.name = 'Woodland' + name;
      mesh.frustumCulled = false;
      mesh.castShadow = part !== 'far'; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData = { alpineTree: true, treePart: name, placementCount: field.trees.length };
      if (part === 'far') {
        // The shadow pass selects the atlas with the light's orthographic
        // camera, using the same original yaw as the beauty pass.
        mesh.customDepthMaterial = variant.impostorDepthMaterial;
        mesh.customDistanceMaterial = variant.impostorDistanceMaterial;
      }
      scene.add(mesh);
      return mesh;
    };
    return {
      near: make(variant.near, variant.foliageMaterial, 'near', 'CrownNear'),
      trunk: make(variant.trunk, variant.trunkMaterial, 'near', 'BarkNear'),
      mid: make(variant.mid || variant.near, variant.foliageMaterial, 'mid', 'CrownMid'),
      midTrunk: make(variant.midTrunk || variant.trunk, variant.trunkMaterial, 'mid', 'BarkMid'),
      far: make(variant.far, variant.impostorMaterial || variant.foliageMaterial, 'far', 'SphericalImpostor'),
    };
  });
  for (const tree of field.trees) {
    position.set(tree.x, tree.y, tree.z); quaternion.setFromAxisAngle(up, tree.yaw); scale.setScalar(tree.size);
    tree.matrix = new THREE.Matrix4().compose(position, quaternion, scale);
    tree.sphere = new THREE.Sphere(new THREE.Vector3(tree.x, tree.y + tree.height * .5, tree.z), tree.height * .62);
  }
  for (const cell of field.cells) cell.box = new THREE.Box3(
    new THREE.Vector3(cell.minX, cell.minY, cell.minZ), new THREE.Vector3(cell.maxX, cell.maxY, cell.maxZ));
  const frustum = new THREE.Frustum(), projection = new THREE.Matrix4(), lastProjection = new Float64Array(16);
  const lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  const stats = { total: field.trees.length, near: 0, mid: 0, far: 0, testedCells: 0 };
  let level = 'high', changed = true;
  const allMeshes = buckets.flatMap(bucket => Object.values(bucket));
  function updateDetail(cameraPosition, camera) {
    uniforms.forestLodCamera.value.copy(cameraPosition);
    if (camera) {
      camera.updateMatrixWorld();
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    }
    let viewChanged = changed || lastPosition.distanceToSquared(cameraPosition) > .35 ** 2;
    if (camera) for (let i = 0; i < 16; i++) if (Math.abs(projection.elements[i] - lastProjection[i]) > .0003) viewChanged = true;
    if (!viewChanged) return;
    changed = false; lastPosition.copy(cameraPosition);
    if (camera) { lastProjection.set(projection.elements); frustum.setFromProjectionMatrix(projection); }
    const ranges = LEVELS[level];
    uniforms.forestLodRanges.value.set(ranges.near, ranges.mid, ranges.blend);
    for (const mesh of allMeshes) mesh.count = 0;
    stats.near = stats.mid = stats.far = stats.testedCells = 0;
    const append = (mesh, tree) => {
      mesh.setMatrixAt(mesh.count, tree.matrix);
      color.setScalar(tree.shade); mesh.setColorAt(mesh.count++, color);
    };
    for (const cell of field.cells) {
      const shadowCell = cell.box.distanceToPoint(cameraPosition) < ranges.mid + 35;
      if (camera && !shadowCell && !frustum.intersectsBox(cell.box)) continue;
      stats.testedCells++;
      for (const tree of cell.trees) {
        const distance = tree.sphere.center.distanceTo(cameraPosition);
        // Keep nearby offscreen crowns for incoming shadows, but avoid scanning
        // and rewriting every distant tree's matrix each frame.
        if (camera && distance > ranges.mid + 35 && !frustum.intersectsSphere(tree.sphere)) continue;
        const bucket = buckets[tree.variant];
        if (distance < ranges.near + ranges.blend + tree.height * .5) {
          append(bucket.near, tree); append(bucket.trunk, tree); stats.near++;
        }
        if (distance > ranges.near - ranges.blend - tree.height * .5 && distance < ranges.mid + ranges.blend + tree.height * .5) {
          append(bucket.mid, tree); append(bucket.midTrunk, tree); stats.mid++;
        }
        if (distance > ranges.mid - ranges.blend - tree.height * .5) { append(bucket.far, tree); stats.far++; }
      }
    }
    for (const mesh of allMeshes) {
      mesh.visible = mesh.count > 0;
      mesh.castShadow = level !== 'low' && mesh.userData.treePart !== 'SphericalImpostor';
      // Instanced buffers reserve a whole species, but only the populated
      // prefix changes. Uploading empty near/mid capacity costs megabytes.
      if (mesh.count) {
        mesh.instanceMatrix.clearUpdateRanges();
        mesh.instanceMatrix.addUpdateRange(0, mesh.count * 16);
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
          mesh.instanceColor.clearUpdateRanges();
          mesh.instanceColor.addUpdateRange(0, mesh.count * 3);
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
  }
  return { field, stats, coverageTexture, coverageAt: field.coverageAt, bounds: field.bounds,
    shadowMap: shadows.texture, shadowBounds: shadows.bounds, updateDetail,
    setQuality(next) { if (!LEVELS[next] || next === level) return false; level = next; changed = true; return true; },
    dispose() { for (const mesh of allMeshes) { scene.remove(mesh); mesh.material.dispose(); mesh.dispose(); } coverageTexture.dispose(); shadows.texture.dispose(); },
  };
}
