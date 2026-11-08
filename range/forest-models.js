/**
 * Full-crown forest library. Meshes and impostors share physically lit albedo;
 * cards choose their view on the GPU, including the directional-shadow camera.
 */
import { GLTFLoader } from './vendor/GLTFLoader.js';

export async function loadForestAssets(THREE, renderer = null) {
  const base = new URL('./assets/forest/', import.meta.url);
  const response = await fetch(new URL('forest.json', base));
  if (!response.ok) throw new Error(`Forest manifest: HTTP ${response.status}`);
  const manifest = await response.json();
  const loader = new GLTFLoader();
  const [library, ...atlases] = await Promise.all([
    loader.loadAsync(new URL(manifest.geometry, base).href),
    ...manifest.variants.map(async variant => {
      const textures = new THREE.TextureLoader();
      const [albedo, normals] = await Promise.all([
        textures.loadAsync(new URL(variant.impostor.albedo, base).href),
        textures.loadAsync(new URL(variant.impostor.normals, base).href),
      ]);
      albedo.colorSpace = THREE.SRGBColorSpace;
      normals.colorSpace = THREE.NoColorSpace;
      for (const texture of [albedo, normals]) {
        texture.flipY = true;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
      }
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
    return {
      ...description,
      near: geometry('LeavesNear'), trunk: geometry('BarkNear'),
      mid: geometry('LeavesMid'), midTrunk: geometry('BarkMid'), far,
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
    varying vec4 vForestFrames;
    varying vec2 vForestBlend;
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
    float forestA0 = floor(forestAz), forestA1 = mod(forestA0 + 1.0, ${azimuths.toFixed(1)});
    float forestE0 = floor(forestEl), forestE1 = min(forestE0 + 1.0, ${(elevations.length - 1).toFixed(1)});
    vForestFrames = vec4(forestA0 + forestE0 * ${azimuths.toFixed(1)}, forestA1 + forestE0 * ${azimuths.toFixed(1)}, forestA0 + forestE1 * ${azimuths.toFixed(1)}, forestA1 + forestE1 * ${azimuths.toFixed(1)});
    vForestBlend = fract(vec2(forestAz, forestEl));
    vForestBasisX = forestX; vForestBasisY = forestY; vForestBasisZ = forestZ;
  `;
  const fragmentDeclarations = vertexDeclarations + `
    uniform sampler2D forestNormals;
    vec2 forestAtlasUv;
    vec2 forestUvDx;
    vec2 forestUvDy;
    // Stochastic neighboring-view selection preserves a sharp cutout instead of
    // blending displaced silhouettes into translucent double branches.
    float forestNoise(vec2 pixel) { return fract(52.9829189 * fract(dot(pixel, vec2(.06711056, .00583715)))); }
  `;
  const sampleAlbedo = `
    float forestNoiseA = forestNoise(floor(gl_FragCoord.xy));
    float forestNoiseE = forestNoise(floor(gl_FragCoord.yx) + vec2(19.0, 71.0));
    float forestFrame = mix(mix(vForestFrames.x, vForestFrames.y, step(forestNoiseA, vForestBlend.x)), mix(vForestFrames.z, vForestFrames.w, step(forestNoiseA, vForestBlend.x)), step(forestNoiseE, vForestBlend.y));
    vec2 forestCell = vec2(mod(forestFrame, ${azimuths.toFixed(1)}), floor(forestFrame / ${azimuths.toFixed(1)}));
    vec2 forestCellUv = clamp(vMapUv, vec2(${(2/cellSize).toFixed(8)}), vec2(${(1-2/cellSize).toFixed(8)}));
    forestAtlasUv = (forestCell + forestCellUv) / vec2(${azimuths.toFixed(1)}, ${elevations.length.toFixed(1)});
    // Derivatives must ignore stochastic cell selection. Implicit derivatives
    // would span unrelated tiles and collapse every cutout into coarse mips.
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
    target.customProgramCacheKey = () => `forest-spherical-lit-v2-${description.id}-${center.join(',')}-${azimuths}-${elevations.length}-${lit}`;
  };
  patch(material, true); patch(depthMaterial, false); patch(distanceMaterial, false);
  return { material, depthMaterial, distanceMaterial };
}
