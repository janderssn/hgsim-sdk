/** Locally authored Blender boathouse/rowboat library; no runtime asset service. */
const ASSET_URL = new URL('./assets/lakeside/lakeside.glb', import.meta.url);

/** Separate adapter keeps the importer testable without browser image decoding. */
export function prepareLakesideModels(THREE, group, { anisotropy = 4, atmosphere = null, environment = null } = {}) {
  const house = group.getObjectByName('LakesideBoathouse');
  const boat = group.getObjectByName('LakesideRowboat');
  const geometries = new Set(), materials = new Set(), textures = new Set();
  let triangles = 0, draws = 0;
  group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
    geometries.add(object.geometry); draws++;
    triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent(); house?.removeFromParent(); boat?.removeFromParent();
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    textures.forEach(value => value.dispose());
  };
  if (!house || !boat) {
    dispose();
    throw new Error('Lakeside library requires LakesideBoathouse and LakesideRowboat roots.');
  }
  group.updateMatrixWorld(true);
  const bounds = {};
  for (const [name, object] of [['house', house], ['boat', boat]]) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty() || [...box.min.toArray(), ...box.max.toArray()].some(value => !Number.isFinite(value))) {
      dispose(); throw new Error(`Lakeside ${name} has invalid bounds.`);
    }
    bounds[name] = { min: box.min.toArray(), max: box.max.toArray() };
  }
  for (const texture of textures) texture.anisotropy = Number.isFinite(anisotropy) ? Math.max(1, Math.min(8, anisotropy)) : 1;
  for (const material of materials) {
    // Caller-owned sky PMREM is applied after collecting owned GLB textures.
    if (environment && material.metalness >= .2) { material.envMap = environment; material.envMapIntensity = .6; }
    atmosphere?.installMaterial(material);
  }
  group.name = 'BlenderLakesideAssets';
  return { source: 'blender-lakeside', group, house, boat,
    stats: { triangles, draws, materials: materials.size, textures: textures.size }, bounds, dispose };
}

/** Missing optional scenery leaves the lake geometry and dock available. */
export async function loadLakesideModels(THREE, { url = ASSET_URL.href, load = null, onError = null, ...options } = {}) {
  try {
    if (!load) {
      const { GLTFLoader } = await import('./vendor/GLTFLoader.js');
      const loader = new GLTFLoader(); load = value => loader.loadAsync(value);
    }
    const asset = await load(String(url));
    return prepareLakesideModels(THREE, asset.scene, options);
  } catch (error) {
    onError?.(error);
    return null;
  }
}
