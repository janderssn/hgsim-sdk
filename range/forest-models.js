import { loadForestMipTexture } from './forest-textures.js';
/**
 * Full-crown forest library. Meshes and impostors share physically lit albedo;
 * cards choose their view on the GPU, including the directional-shadow camera.
 */

export async function loadForestAssets(THREE, renderer = null) {
  const { GLTFLoader } = await import('./vendor/GLTFLoader.js');
  const base = new URL('./assets/forest/', import.meta.url);
  const response = await fetch(new URL('forest.json', base));
  if (!response.ok) throw new Error(`Forest manifest: HTTP ${response.status}`);
  const manifest = await response.json();
  const loader = new GLTFLoader();
  const [library, ...atlases] = await Promise.all([
    loader.loadAsync(new URL(manifest.geometry, base).href),
    ...manifest.variants.map(async variant => {
      const texture = async (filename, colorSpace) => {
        try { return await loadForestMipTexture(THREE, new URL(filename.replace('.png', '-mips.bin.gz'), base).href, colorSpace); }
        catch (error) {
          console.warn('Forest mip chain unavailable; using source atlas.', error.message);
          const fallback = await new THREE.TextureLoader().loadAsync(new URL(filename, base).href);
          fallback.colorSpace = colorSpace; fallback.flipY = true;
          fallback.minFilter = THREE.LinearMipmapLinearFilter; fallback.magFilter = THREE.LinearFilter;
          return fallback;
        }
      };
      const [albedo, normals] = await Promise.all([
        texture(variant.impostor.albedo, THREE.SRGBColorSpace),
        texture(variant.impostor.normals, THREE.NoColorSpace),
      ]);
      for (const texture of [albedo, normals]) texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
      return { albedo, normals };
    }),
  ]);
  library.scene.updateMatrixWorld(true);
  const treeVariants = manifest.variants.map((description, index) => {
    const get = suffix => {
      const mesh = library.scene.getObjectByName(`${description.id}_${suffix}`);
      if (!mesh?.isMesh) throw new Error(`Forest asset missing ${description.id}_${suffix}`);
      return mesh;
    };
    const leaves = get('LeavesNear'), bark = get('BarkNear');
    const foliageMaterial = leaves.material;
    foliageMaterial.alphaToCoverage = true;
    foliageMaterial.forceSinglePass = true;
    foliageMaterial.name = description.id + 'Foliage';
    // Rounded canopy normals are deliberately consistent on both leaf faces.
    const previousCompile = foliageMaterial.onBeforeCompile;
    foliageMaterial.onBeforeCompile = shader => {
      previousCompile.call(foliageMaterial, shader);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    };
    foliageMaterial.customProgramCacheKey = () => 'forest-rounded-canopy-v1';
    for (const material of [foliageMaterial, bark.material]) {
      for (const key of ['map', 'normalMap', 'roughnessMap']) {
        if (material[key]) material[key].anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 1);
      }
    }
    const geometry = suffix => get(suffix).geometry.clone().applyMatrix4(get(suffix).matrixWorld);
    // Centered quad: its world position is generated from the original instance
    // transform in the vertex shader. Never rotate instance matrices to camera.
    const far = new THREE.PlaneGeometry(description.impostor.diameter, description.impostor.diameter);
    const impostor = createForestImpostor(THREE, atlases[index], description);
    const near = geometry('LeavesNear'), trunk = geometry('BarkNear');
    const mid = geometry('LeavesMid'), midTrunk = geometry('BarkMid');
    const cullBox = new THREE.Box3();
    for (const meshGeometry of [near, trunk, mid, midTrunk]) {
      if (!meshGeometry.boundingBox) meshGeometry.computeBoundingBox();
      cullBox.union(meshGeometry.boundingBox);
    }
    return {
      ...description,
      atlasMipLevels: Math.min(atlases[index].albedo.userData.forestMipMaxLevel || 0, atlases[index].normals.userData.forestMipMaxLevel || 0),
      near, trunk, mid, midTrunk, far,
      cullBounds: { min: cullBox.min.toArray(), max: cullBox.max.toArray() },
      foliageMaterial, trunkMaterial: bark.material,
      impostorMaterial: impostor.material,
      impostorDepthMaterial: impostor.depthMaterial,
      impostorDistanceMaterial: impostor.distanceMaterial,
      gpuBillboard: true,
    };
  });
  return { source: 'forest', treeVariants, manifest };
}

/**
 * No instance view attributes or CPU rotations are required: instanceMatrix
 * retains the tree's original yaw/scale, which is also the normal-map basis.
 * Set mesh.customDepthMaterial/customDistanceMaterial to the matching pair.
 */
export function createForestImpostor(THREE, textures, description) {
  const { albedo, normals } = textures;
  const { center, azimuths, elevations, cellSize } = description.impostor;
  const material = new THREE.MeshStandardMaterial({
    name: description.id + 'LitImpostor', map: albedo, color: 0xffffff,
    roughness: 1, metalness: 0, alphaTest: .38,
    side: THREE.DoubleSide, depthWrite: true, transparent: false,
  });
  material.alphaToCoverage = true;
  material.forceSinglePass = true;
  const depthMaterial = new THREE.MeshDepthMaterial({
    map: albedo, alphaTest: .38, depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide,
  });
  const distanceMaterial = new THREE.MeshDistanceMaterial({ map: albedo, alphaTest: .38, side: THREE.DoubleSide });
  const vertexDeclarations = `
    varying float vForestFrame;
    varying vec3 vForestBasisX;
    varying vec3 vForestBasisY;
    varying vec3 vForestBasisZ;
  `;
  const billboard = `
    #include <begin_vertex>
    mat4 forestMatrix = modelMatrix;
    #ifdef USE_INSTANCING
      forestMatrix = forestMatrix * instanceMatrix;
    #endif
    vec3 forestX = normalize(forestMatrix[0].xyz);
    vec3 forestY = normalize(forestMatrix[1].xyz);
    vec3 forestZ = normalize(forestMatrix[2].xyz);
    vec3 forestCenter = (forestMatrix * vec4(${center[0]}, ${center[1]}, ${center[2]}, 1.0)).xyz;
    vec3 forestToCamera = isOrthographic
      ? vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
      : normalize(cameraPosition - forestCenter);
    vec3 forestLocalView = vec3(dot(forestToCamera, forestX), dot(forestToCamera, forestY), dot(forestToCamera, forestZ));
    float forestAzimuth = atan(forestLocalView.x, forestLocalView.z);
    vec3 forestRight = forestX * cos(forestAzimuth) - forestZ * sin(forestAzimuth);
    vec3 forestUp = normalize(cross(forestToCamera, forestRight));
    vec3 forestOffset = forestRight * position.x + forestUp * position.y;
    transformed = vec3(${center[0]}, ${center[1]}, ${center[2]}) + vec3(dot(forestOffset, forestX), dot(forestOffset, forestY), dot(forestOffset, forestZ));
    float forestAz = mod(forestAzimuth / 6.28318530718 * ${azimuths.toFixed(1)} + ${azimuths.toFixed(1)}, ${azimuths.toFixed(1)});
    float forestEl = asin(clamp(forestLocalView.y, 0.0, 1.0)) / 1.57079632679 * ${(elevations.length - 1).toFixed(1)};
    // One view for the whole tree preserves coherent branches at 18–100px.
    // Fragment-wise stochastic frame changes turned distant crowns into lace.
    vForestFrame = mod(floor(forestAz + .5), ${azimuths.toFixed(1)}) + floor(forestEl + .5) * ${azimuths.toFixed(1)};
    vForestBasisX = forestX; vForestBasisY = forestY; vForestBasisZ = forestZ;
  `;
  const fragmentDeclarations = vertexDeclarations + `
    uniform sampler2D forestNormals;
    vec2 forestAtlasUv;
    vec2 forestUvDx;
    vec2 forestUvDy;
  `;
  const sampleAlbedo = `
    float forestFrame = floor(vForestFrame + 0.5);
    vec2 forestCell = vec2(mod(forestFrame, ${azimuths.toFixed(1)}), floor(forestFrame / ${azimuths.toFixed(1)}));
    vec2 forestCellUv = clamp(vMapUv, vec2(${(2/cellSize).toFixed(8)}), vec2(${(1-2/cellSize).toFixed(8)}));
    forestAtlasUv = (forestCell + forestCellUv) / vec2(${azimuths.toFixed(1)}, ${elevations.length.toFixed(1)});
    // Cell-local gradients keep filtering inside the selected view.
    forestUvDx = dFdx(vMapUv) / vec2(${azimuths.toFixed(1)}, ${elevations.length.toFixed(1)});
    forestUvDy = dFdy(vMapUv) / vec2(${azimuths.toFixed(1)}, ${elevations.length.toFixed(1)});
    diffuseColor *= textureGrad(map, forestAtlasUv, forestUvDx, forestUvDy);
  `;
  const patch = (target, lit) => {
    target.onBeforeCompile = shader => {
      shader.uniforms.forestNormals = { value: normals };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + vertexDeclarations)
        .replace('#include <begin_vertex>', billboard);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + fragmentDeclarations)
        .replace('#include <map_fragment>', sampleAlbedo);
      if (lit) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        vec3 forestNormal = normalize(textureGrad(forestNormals, forestAtlasUv, forestUvDx, forestUvDy).xyz * 2.0 - 1.0);
        vec3 forestWorldNormal = normalize(vForestBasisX * forestNormal.x + vForestBasisY * forestNormal.y + vForestBasisZ * forestNormal.z);
        normal = normalize(mat3(viewMatrix) * forestWorldNormal);
      `);
    };
    target.customProgramCacheKey = () => `forest-spherical-lit-v3-${description.id}-${center.join(',')}-${azimuths}-${elevations.length}-${lit}`;
  };
  patch(material, true); patch(depthMaterial, false); patch(distanceMaterial, false);
  return { material, depthMaterial, distanceMaterial };
}


const paletteMaterials = new WeakSet();
/** A shared pigment treatment for real needles and their diffuse impostors. */
export function installForestCanopyPalette(material) {
  if (paletteMaterials.has(material)) return material;
  paletteMaterials.add(material);
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = shader => {
    previousCompile.call(material, shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 forestCrownTint;\nvarying vec3 vForestCrownTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvForestCrownTint = forestCrownTint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vForestCrownTint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float forestLeafLuma = dot(diffuseColor.rgb, vec3(.25, .62, .13));
        // Green chroma distinguishes foliage from brown shoots and pale bark
        // in the baked card. The same test keeps near/far pigment consistent.
        float forestGreen = (diffuseColor.g - max(diffuseColor.r * .96, diffuseColor.b * 1.04)) / max(forestLeafLuma, .015);
        float forestLeafMask = smoothstep(.045, .22, forestGreen);
        vec3 forestPigment = forestLeafLuma * 1.22 * vForestCrownTint;
        diffuseColor.rgb = mix(diffuseColor.rgb, forestPigment, forestLeafMask * .78);
      `);
  };
  material.customProgramCacheKey = () => previousKey() + '/grove-pigment-v1';
  return material;
}
