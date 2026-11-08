/**
 * Photographic PBR surfaces: source images, licenses, immutable revisions and
 * rebuild checksums live beside the assets. Only the biome/path masks are
 * authored procedurally; colour and normal detail come from the supplied maps.
 */
const ASSETS = new URL('./assets/materials/', import.meta.url);

const WORLD_VERTEX = `
  varying vec3 vSurfacePosition;
  varying vec3 vSurfaceNormal;
`;
const WORLD_POSITION = `
  vec4 surfacePosition = vec4(transformed, 1.0);
  vec3 surfaceNormal = normal;
  #ifdef USE_INSTANCING
    surfacePosition = instanceMatrix * surfacePosition;
    surfaceNormal = mat3(instanceMatrix) * surfaceNormal;
  #endif
  vSurfacePosition = (modelMatrix * surfacePosition).xyz;
  vSurfaceNormal = normalize(mat3(modelMatrix) * surfaceNormal);
`;
const PROJECTION = `
  varying vec3 vSurfacePosition;
  varying vec3 vSurfaceNormal;
  uniform float surfaceDetailDistance, surfaceDominantAxis;
  vec3 surfacePositionDx, surfacePositionDy, surfaceViewDx, surfaceViewDy;
  void surfaceDerivatives() {
    // Evaluate derivatives before divergent distance, slope or axis branches.
    surfacePositionDx = dFdx(vSurfacePosition);
    surfacePositionDy = dFdy(vSurfacePosition);
    surfaceViewDx = dFdx(-vViewPosition);
    surfaceViewDy = dFdy(-vViewPosition);
  }
  float surfaceDetailFade(float range) {
    return 1.0 - smoothstep(range * 0.70, range, length(vViewPosition));
  }
  vec3 surfaceWeights(vec3 n) {
    vec3 w = abs(n);
    if (surfaceDominantAxis > 0.5) {
      if (w.x > max(w.y, w.z)) return vec3(1.0, 0.0, 0.0);
      if (w.y > w.z) return vec3(0.0, 1.0, 0.0);
      return vec3(0.0, 0.0, 1.0);
    }
    w = pow(w, vec3(5.0));
    w /= max(w.x + w.y + w.z, 0.0001);
    w *= step(vec3(0.01), w);
    return w / max(w.x + w.y + w.z, 0.0001);
  }
  vec4 surfaceTexture(sampler2D image, vec3 p, vec3 w, float scale) {
    vec4 color = vec4(0.0);
    if (w.x >= 0.01) color += textureGrad(image, p.zy * scale,
      surfacePositionDx.zy * scale, surfacePositionDy.zy * scale) * w.x;
    if (w.y >= 0.01) color += textureGrad(image, p.xz * scale,
      surfacePositionDx.xz * scale, surfacePositionDy.xz * scale) * w.y;
    if (w.z >= 0.01) color += textureGrad(image, p.xy * scale,
      surfacePositionDx.xy * scale, surfacePositionDy.xy * scale) * w.z;
    return color;
  }
  mat3 surfaceFrame(vec3 n, vec2 st0, vec2 st1) {
    vec3 q1perp = cross(surfaceViewDy, n), q0perp = cross(n, surfaceViewDx);
    vec3 tangent = q1perp * st0.x + q0perp * st1.x;
    vec3 bitangent = q1perp * st0.y + q0perp * st1.y;
    float lengthSquared = max(dot(tangent, tangent), dot(bitangent, bitangent));
    float factor = lengthSquared > 0.0 ? inversesqrt(lengthSquared) : 0.0;
    return mat3(tangent * factor, bitangent * factor, n);
  }
  vec3 surfaceNormalTexture(sampler2D image, vec3 p, vec3 w,
      float scale, vec3 viewNormal, vec2 strength) {
    vec3 detail = vec3(0.0);
    if (w.x >= 0.01) {
      vec2 dx = surfacePositionDx.zy * scale, dy = surfacePositionDy.zy * scale;
      vec3 sampled = textureGrad(image, p.zy * scale, dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.x;
    }
    if (w.y >= 0.01) {
      vec2 dx = surfacePositionDx.xz * scale, dy = surfacePositionDy.xz * scale;
      vec3 sampled = textureGrad(image, p.xz * scale, dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.y;
    }
    if (w.z >= 0.01) {
      vec2 dx = surfacePositionDx.xy * scale, dy = surfacePositionDy.xy * scale;
      vec3 sampled = textureGrad(image, p.xy * scale, dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.z;
    }
    return normalize(detail);
  }
`;

function projectSurface(shader, detailUniforms) {
  Object.assign(shader.uniforms, detailUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + WORLD_VERTEX)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WORLD_POSITION);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + PROJECTION);
}

function cliffSurface(material, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 stoneWeights = surfaceWeights(normalize(vSurfaceNormal));
      diffuseColor *= surfaceTexture(map, vSurfacePosition, stoneWeights, 0.19);
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.88;
      if (surfaceDetail > 0.001) roughnessFactor = mix(roughnessFactor,
        clamp(surfaceTexture(roughnessMap, vSurfacePosition, stoneWeights, 0.19).g,
          0.60, 0.98), surfaceDetail);
    `).replace('#include <normal_fragment_maps>', `
      if (surfaceDetail > 0.001) normal = normalize(mix(normal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, normal, normalScale), surfaceDetail));
    `);
  };
  material.customProgramCacheKey = () => 'above-photographic-cliff-v2';
}

function localCliffSurface(material, maps, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, {
      cliffMacroColor: { value: maps.graniteMacro },
      cliffMacroNormal: { value: maps.graniteMacroNormal },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D cliffMacroColor, cliffMacroNormal;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 stoneNormal = normalize(vSurfaceNormal);
      vec3 stoneWeights = surfaceWeights(stoneNormal);
      vec3 stoneAxis = abs(stoneNormal);
      bool stoneTop = stoneAxis.y > max(stoneAxis.x, stoneAxis.z);
      bool stoneSideX = stoneAxis.x > stoneAxis.z;
      // One stable world projection gives the large exfoliation slabs a useful
      // physical scale without paying for three macro samples per fragment.
      vec2 stoneMacroUv = (stoneTop ? vSurfacePosition.xz :
        (stoneSideX ? vSurfacePosition.zy : vSurfacePosition.xy)) / 32.0;
      vec2 stoneMacroDx = (stoneTop ? surfacePositionDx.xz :
        (stoneSideX ? surfacePositionDx.zy : surfacePositionDx.xy)) / 32.0;
      vec2 stoneMacroDy = (stoneTop ? surfacePositionDy.xz :
        (stoneSideX ? surfacePositionDy.zy : surfacePositionDy.xy)) / 32.0;
      vec3 stoneColor = textureGrad(cliffMacroColor, stoneMacroUv, stoneMacroDx, stoneMacroDy).rgb;
      if (surfaceDetail > 0.001) stoneColor = mix(stoneColor,
        surfaceTexture(map, vSurfacePosition, stoneWeights, 0.19).rgb, surfaceDetail * 0.25);
      diffuseColor.rgb *= stoneColor;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.91;
      if (surfaceDetail > 0.001) roughnessFactor = mix(roughnessFactor,
        clamp(surfaceTexture(roughnessMap, vSurfacePosition, stoneWeights, 0.19).g,
          0.60, 0.98), surfaceDetail * 0.25);
    `).replace('#include <normal_fragment_maps>', `
      // This broad normal is an approximate height proxy from the synthesized
      // macro artwork. The attached Rock26 scan supplies nearby mineral grain.
      vec3 stoneMacroDetail = textureGrad(cliffMacroNormal, stoneMacroUv,
        stoneMacroDx, stoneMacroDy).xyz * 2.0 - 1.0;
      stoneMacroDetail.xy *= 0.85;
      vec3 stoneViewNormal = normalize(surfaceFrame(normal,
        stoneMacroDx, stoneMacroDy) * stoneMacroDetail);
      if (surfaceDetail > 0.001) stoneViewNormal = normalize(mix(stoneViewNormal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, normal, normalScale), surfaceDetail * 0.25));
      normal = stoneViewNormal;
    `);
  };
  material.customProgramCacheKey = () => 'above-local-granite-macro-v1';
}

function terrainSurface(material, maps, forestUniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, forestUniforms, {
      surfaceRockColor: { value: maps.rockColor },
      surfaceRockNormal: { value: maps.rockNormal },
      surfaceRockRoughness: { value: maps.rockRoughness },
      surfaceSoilColor: { value: maps.soilColor },
      surfaceSoilNormal: { value: maps.soilNormal },
      surfaceControls: { value: maps.controls },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D surfaceRockColor, surfaceRockNormal, surfaceRockRoughness;
      uniform sampler2D surfaceSoilColor, surfaceSoilNormal, surfaceControls;
      uniform sampler2D forestCanopyMap;
      uniform vec3 forestCanopyBounds;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 landNormal = normalize(vSurfaceNormal);
      vec3 landWeights = surfaceWeights(landNormal);
      vec3 landControls = texture2D(surfaceControls,
        vec2(vSurfacePosition.x, -vSurfacePosition.z) / 3200.0 + 0.5).rgb;
      float bareSoil = max(landControls.r,
        smoothstep(0.80, 0.98, landControls.g) * 0.18 * (1.0 - landControls.b));
      float exposedRock = 1.0 - smoothstep(0.58, 0.91, landNormal.y);
      vec2 meadowUv = vSurfacePosition.xz * 0.38;
      vec2 soilUv = vSurfacePosition.xz * 0.24;
      vec3 fieldPhoto = texture2D(map, meadowUv).rgb;
      vec3 meadow = fieldPhoto;
      // Baked 50–200 m cover variation survives mipmapping: moist, darker
      // meadow hollows alternate with dry gold shoulders. The photograph still
      // supplies all close surface detail; the landing field stays readable.
      float coverBlend = smoothstep(0.16, 0.82, landControls.g);
      float meadowLuma = dot(meadow, vec3(0.2126, 0.7152, 0.0722));
      vec3 moistMeadow = meadow * vec3(0.43, 0.66, 0.46);
      vec3 dryMeadow = meadowLuma * vec3(1.32, 1.06, 0.60);
      meadow = mix(moistMeadow, dryMeadow, coverBlend);
      float fieldLuma = dot(fieldPhoto, vec3(0.2126, 0.7152, 0.0722));
      vec3 mownField = mix(fieldPhoto, fieldLuma * vec3(0.95, 1.05, 0.90), 0.70) * 0.78;
      meadow = mix(meadow, mownField, landControls.b * 0.90);
      vec2 canopyUv = (vSurfacePosition.xz - forestCanopyBounds.xy) / forestCanopyBounds.z;
      float forestVisibility = texture2D(forestCanopyMap, canopyUv).r;
      vec3 landColor = meadow;
      if (bareSoil > 0.001) landColor = mix(meadow, textureGrad(surfaceSoilColor,
        soilUv, surfacePositionDx.xz * 0.24, surfacePositionDy.xz * 0.24).rgb, bareSoil);
      if (exposedRock > 0.001) landColor = mix(landColor,
        surfaceTexture(surfaceRockColor, vSurfacePosition, landWeights, 0.19).rgb,
        exposedRock);
      diffuseColor.rgb *= landColor;
    `).replace('#include <color_fragment>', `
      #ifdef USE_COLOR
        // Preserve the authored mowing/slope brightness, without multiplying
        // a second saturated green paint over the photographic grass.
        float authoredLight = clamp(dot(vColor, vec3(0.2126, 0.7152, 0.0722)) * 4.0,
          0.78, 1.18);
        diffuseColor.rgb *= mix(1.0, authoredLight, 0.35);
      #endif
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = mix(0.94, 0.88, exposedRock);
      if (surfaceDetail > 0.001) {
        float landRoughness = 0.94;
        if (bareSoil > 0.001) landRoughness = mix(landRoughness,
          textureGrad(roughnessMap, soilUv,
            surfacePositionDx.xz * 0.24, surfacePositionDy.xz * 0.24).g, bareSoil);
        if (exposedRock > 0.001) landRoughness = mix(landRoughness,
          surfaceTexture(surfaceRockRoughness, vSurfacePosition, landWeights, 0.19).g,
          exposedRock);
        roughnessFactor = mix(roughnessFactor, clamp(landRoughness, 0.65, 0.99), surfaceDetail);
      }
    `).replace('#include <normal_fragment_maps>', `
      if (surfaceDetail > 0.001) {
        vec2 meadowDx = surfacePositionDx.xz * 0.38, meadowDy = surfacePositionDy.xz * 0.38;
        vec3 landDetail = textureGrad(normalMap, meadowUv, meadowDx, meadowDy).xyz * 2.0 - 1.0;
        if (bareSoil > 0.001) landDetail = mix(landDetail,
          textureGrad(surfaceSoilNormal, soilUv, surfacePositionDx.xz * 0.24,
            surfacePositionDy.xz * 0.24).xyz * 2.0 - 1.0, bareSoil);
        landDetail.xy *= normalScale;
        vec3 landViewNormal = normalize(surfaceFrame(normal, meadowDx, meadowDy) * normalize(landDetail));
        if (exposedRock > 0.001) landViewNormal = normalize(mix(landViewNormal,
          surfaceNormalTexture(surfaceRockNormal, vSurfacePosition, landWeights,
            0.19, normal, normalScale), exposedRock));
        normal = normalize(mix(normal, landViewNormal, surfaceDetail));
      }
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= forestVisibility;
      reflectedLight.indirectSpecular *= forestVisibility;
      reflectedLight.directDiffuse *= mix(1.0, forestVisibility, 0.68);
    `);
  };
  material.customProgramCacheKey = () => 'above-photographic-meadow-v3';
}

function mountainSurface(material, maps, uniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, uniforms, {
      mountainMeadowColor: { value: maps.grassColor },
      mountainMeadowNormal: { value: maps.grassNormal },
      mountainAerialColor: { value: maps.aerialColor },
      mountainAerialNormal: { value: maps.aerialNormal },
      mountainAerialRoughness: { value: maps.aerialRoughness },
      mountainGraniteMacro: { value: maps.graniteMacro },
      mountainGraniteNormal: { value: maps.graniteMacroNormal },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D mountainMeadowColor, mountainMeadowNormal, mountainTerrainNormal;
      uniform sampler2D mountainAerialColor, mountainAerialNormal, mountainAerialRoughness;
      uniform sampler2D mountainGraniteMacro, mountainGraniteNormal;
      uniform vec4 mountainTerrainBounds;
      uniform float mountainHasTerrainNormal, mountainTreeLine, mountainSnowLine;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance * 3.0);
      vec3 mountainWorldNormal = normalize(vSurfaceNormal);
      float mountainAmbientOcclusion = 1.0;
      if (mountainHasTerrainNormal > 0.5) {
        vec2 reliefUv = (vSurfacePosition.xz - mountainTerrainBounds.xy)
          / mountainTerrainBounds.zw;
        vec4 mountainRelief = texture2D(mountainTerrainNormal, reliefUv);
        mountainWorldNormal = normalize(mountainRelief.xyz * 2.0 - 1.0);
        mountainAmbientOcclusion = mountainRelief.a;
      }
      vec3 mountainWeights = surfaceWeights(mountainWorldNormal);
      float mountainCliff = 1.0 - smoothstep(0.35, 0.83, mountainWorldNormal.y);
      float mountainVegetation = smoothstep(0.72, 0.97, mountainWorldNormal.y)
        * (1.0 - smoothstep(mountainTreeLine - 200.0, mountainTreeLine + 200.0,
          vSurfacePosition.y));
      float mountainSnow = smoothstep(mountainSnowLine, mountainSnowLine + 300.0,
          vSurfacePosition.y) * smoothstep(0.35, 0.82, mountainWorldNormal.y);
      vec2 aerialUv = vSurfacePosition.xz / 240.0;
      vec2 aerialDx = surfacePositionDx.xz / 240.0, aerialDy = surfacePositionDy.xz / 240.0;
      bool graniteXAxis = abs(mountainWorldNormal.x) > abs(mountainWorldNormal.z);
      vec2 graniteMacroUv = (graniteXAxis ? vSurfacePosition.zy : vSurfacePosition.xy) / 384.0;
      vec2 graniteDx = (graniteXAxis ? surfacePositionDx.zy : surfacePositionDx.xy) / 384.0;
      vec2 graniteDy = (graniteXAxis ? surfacePositionDy.zy : surfacePositionDy.xy) / 384.0;
      vec3 mountainColor = vec3(0.0);
      if (mountainCliff < 0.999) mountainColor = textureGrad(mountainAerialColor,
        aerialUv, aerialDx, aerialDy).rgb;
      if (mountainCliff > 0.001) mountainColor = mix(mountainColor,
        textureGrad(mountainGraniteMacro, graniteMacroUv, graniteDx, graniteDy).rgb, mountainCliff);
      // Meter-scale scans disappear into their average mip in the distance.
      // Preserve the broad geological photographs and DEM relief instead.
      if (surfaceDetail > 0.001) {
        vec3 mountainFineRock = surfaceTexture(map, vSurfacePosition, mountainWeights, 0.10).rgb;
        float mineralGrain = dot(mountainFineRock, vec3(0.2126, 0.7152, 0.0722));
        mountainColor *= mix(1.0, 0.82 + mineralGrain * 0.54, surfaceDetail);
      }
      if (mountainVegetation > 0.001) {
        vec3 mountainMeadow = textureGrad(mountainMeadowColor, vSurfacePosition.xz * 0.012,
          surfacePositionDx.xz * 0.012, surfacePositionDy.xz * 0.012).rgb;
        // Mountain stands are dark, subdued canopy rather than bright field turf.
        mountainMeadow *= vec3(0.19, 0.31, 0.20);
        mountainColor = mix(mountainColor, mountainMeadow, mountainVegetation * 0.72);
      }
      mountainColor = mix(mountainColor, vec3(0.78, 0.83, 0.86), mountainSnow);
      diffuseColor.rgb *= mountainColor;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.88;
      if (mountainCliff < 0.999) roughnessFactor = mix(textureGrad(mountainAerialRoughness,
        aerialUv, aerialDx, aerialDy).r, 0.88, mountainCliff);
      if (surfaceDetail > 0.001 && mountainCliff > 0.001) roughnessFactor = mix(roughnessFactor,
        surfaceTexture(roughnessMap, vSurfacePosition, mountainWeights, 0.10).g,
        mountainCliff * surfaceDetail);
      roughnessFactor = mix(clamp(roughnessFactor, 0.72, 0.99), 0.96,
        max(mountainVegetation, mountainSnow));
    `).replace('#include <normal_fragment_maps>', `
      vec3 mountainViewNormal = normalize(mat3(viewMatrix) * mountainWorldNormal);
      vec3 geologicalNormal = mountainViewNormal;
      if (mountainCliff < 0.999) {
        vec3 aerialNormal = textureGrad(mountainAerialNormal, aerialUv, aerialDx, aerialDy).xyz * 2.0 - 1.0;
        aerialNormal.xy *= 0.80;
        geologicalNormal = normalize(surfaceFrame(mountainViewNormal, aerialDx, aerialDy) * aerialNormal);
      }
      if (mountainCliff > 0.001) {
        vec3 graniteNormal = textureGrad(mountainGraniteNormal, graniteMacroUv, graniteDx, graniteDy).xyz * 2.0 - 1.0;
        graniteNormal.xy *= 0.85;
        vec3 graniteViewNormal = normalize(surfaceFrame(mountainViewNormal, graniteDx, graniteDy) * graniteNormal);
        geologicalNormal = normalize(mix(geologicalNormal, graniteViewNormal, mountainCliff));
      }
      if (surfaceDetail > 0.001) {
        vec3 mountainDetail = surfaceNormalTexture(normalMap, vSurfacePosition,
          mountainWeights, 0.10, mountainViewNormal, normalScale * 0.55);
        geologicalNormal = normalize(mix(geologicalNormal, mountainDetail, 0.28 * surfaceDetail));
      }
      normal = normalize(mix(geologicalNormal, mountainViewNormal, mountainSnow * 0.75));
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      // The DEM's horizon visibility darkens enclosed gullies without removing
      // direct sunlight or requiring an extra ambient-occlusion texture fetch.
      reflectedLight.indirectDiffuse *= mountainAmbientOcclusion;
      reflectedLight.indirectSpecular *= mountainAmbientOcclusion;
    `);
  };
  material.customProgramCacheKey = () => 'above-photographic-mountain-v3';
}

/** Load locally retained, attributed PBR maps before constructing the scene. */
export async function createSurfaceMaterials(THREE, { anisotropy = 4 } = {}) {
  const qualityAnisotropy = {
    high: Math.max(1, Math.min(8, anisotropy)),
    medium: Math.max(1, Math.min(2, anisotropy)),
    low: 1,
  };
  let quality = 'high';
  const detailDistances = { high: 300, medium: 160, low: 80 };
  const detailUniforms = {
    surfaceDetailDistance: { value: detailDistances.high },
    surfaceDominantAxis: { value: 0 },
  };
  const loader = new THREE.TextureLoader();
  const files = {
    grassColor: ['babylon/grass.png', true],
    grassNormal: ['babylon/grassn.png', false],
    soilColor: ['babylon/rockyGround_basecolor.png', true],
    soilNormal: ['babylon/rockyGround_normal.png', false],
    soilRoughness: ['babylon/rockyGround_metalRough.png', false],
    rockColor: ['scanned/rock-color.webp', true],
    rockNormal: ['scanned/rock-normal.webp', false],
    rockRoughness: ['scanned/rock-roughness.webp', false],
    woodColor: ['scanned/wood-color.webp', true],
    woodNormal: ['scanned/wood-normal.webp', false],
    woodRoughness: ['scanned/wood-roughness.webp', false],
    controls: ['terrain-control.png', false],
    aerialColor: ['aerial-rocks/color.webp', true],
    aerialNormal: ['aerial-rocks/normal.webp', false],
    aerialRoughness: ['aerial-rocks/roughness.webp', false],
    graniteMacro: ['generated/granite-macro-color.webp', true],
    graniteMacroNormal: ['generated/granite-macro-normal.webp', false],
  };
  const textures = [];
  const maps = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([name, [file, color]]) => {
    const texture = await loader.loadAsync(new URL(file, ASSETS).href);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = qualityAnisotropy.high;
    textures.push(texture);
    return [name, texture];
  })));
  maps.controls.wrapS = maps.controls.wrapT = THREE.ClampToEdgeWrapping;

  const whiteCanopy = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  whiteCanopy.needsUpdate = true;
  textures.push(whiteCanopy);
  const forestUniforms = {
    forestCanopyMap: { value: whiteCanopy },
    forestCanopyBounds: { value: new THREE.Vector3(-1600, -1600, 3200) },
  };
  const terrain = new THREE.MeshStandardMaterial({
    name: 'Photographic alpine meadow', vertexColors: true,
    map: maps.grassColor, normalMap: maps.grassNormal, normalScale: new THREE.Vector2(.65, .65),
    roughnessMap: maps.soilRoughness, roughness: 1, metalness: 0,
  });
  terrainSurface(terrain, maps, forestUniforms, detailUniforms);

  const rock = new THREE.MeshStandardMaterial({
    name: 'Fractured launch granite', color: 0xadb0ac,
    map: maps.rockColor, normalMap: maps.rockNormal, normalScale: new THREE.Vector2(.72, .72),
    roughnessMap: maps.rockRoughness, roughness: 1, metalness: 0,
  });
  localCliffSurface(rock, maps, detailUniforms);
  const granite = rock.clone();
  granite.name = 'Photographic granite props';
  granite.color.setHex(0xe7e8e6);
  cliffSurface(granite, detailUniforms);

  const timber = new THREE.MeshStandardMaterial({
    name: 'Photographic weathered timber', color: 0xb8b2a5,
    map: maps.woodColor, normalMap: maps.woodNormal,
    normalScale: new THREE.Vector2(.75, .75),
    roughnessMap: maps.woodRoughness, roughness: 1, metalness: 0,
  });
  for (const texture of [maps.woodColor, maps.woodNormal, maps.woodRoughness]) texture.repeat.set(3.5, .75);
  const timberBeam = timber.clone();
  timberBeam.name = 'Photographic structural timber';
  for (const property of ['map', 'normalMap', 'roughnessMap']) {
    timberBeam[property] = timber[property].clone();
    timberBeam[property].rotation = Math.PI / 2;
    timberBeam[property].center.set(.5, .5);
    timberBeam[property].repeat.set(.5, 2.5);
    textures.push(timberBeam[property]);
  }

  const flatRelief = new THREE.DataTexture(new Uint8Array([128, 255, 128, 255]), 1, 1);
  flatRelief.needsUpdate = true;
  textures.push(flatRelief);
  const mountainUniforms = {
    mountainTerrainNormal: { value: flatRelief },
    mountainTerrainBounds: { value: new THREE.Vector4(-8000, -8000, 16000, 16000) },
    mountainHasTerrainNormal: { value: 0 },
    mountainTreeLine: { value: 1450 },
    mountainSnowLine: { value: 2250 },
  };
  const mountain = granite.clone();
  mountain.name = 'Photographic alpine massif';
  mountain.normalScale.set(.55, .55);
  mountainSurface(mountain, maps, mountainUniforms, detailUniforms);

  const metal = new THREE.MeshStandardMaterial({
    name: 'Galvanized fittings', color: 0x939a96, roughness: .49, metalness: .72,
  });
  const rope = new THREE.MeshStandardMaterial({
    name: 'Natural rope', color: 0xa69672, roughness: .98, metalness: 0,
  });
  const materials = [terrain, rock, granite, timber, timberBeam, mountain, metal, rope];
  const qualityTextures = textures.filter(texture => !texture.isDataTexture);
  return {
    terrain, rock, granite, timber, timberBeam, mountain, metal, rope,
    setForestShadowMap(texture, bounds) {
      if (!texture || !bounds) return;
      forestUniforms.forestCanopyMap.value = texture;
      forestUniforms.forestCanopyBounds.value.set(bounds.minX, bounds.minZ, bounds.size);
    },
    setMountainTerrain(normalTexture, bounds) {
      if (!normalTexture || !bounds) return;
      mountainUniforms.mountainTerrainNormal.value = normalTexture;
      mountainUniforms.mountainTerrainBounds.value.set(bounds.minX, bounds.minZ, bounds.width, bounds.depth);
      mountainUniforms.mountainHasTerrainNormal.value = 1;
      if (Number.isFinite(bounds.treeLine)) mountainUniforms.mountainTreeLine.value = bounds.treeLine;
      if (Number.isFinite(bounds.snowLine)) mountainUniforms.mountainSnowLine.value = bounds.snowLine;
    },
    // Preserve every photographic map while reducing costly grazing-angle
    // sampling on slower renderers. Upload sampler changes only on transitions.
    setQuality(level) {
      if (!Object.hasOwn(qualityAnisotropy, level) || level === quality) return;
      quality = level;
      detailUniforms.surfaceDetailDistance.value = detailDistances[level];
      detailUniforms.surfaceDominantAxis.value = level === 'low' ? 1 : 0;
      const target = qualityAnisotropy[level];
      for (const texture of qualityTextures) {
        if (texture.anisotropy === target) continue;
        texture.anisotropy = target;
        texture.needsUpdate = true;
      }
    },
    dispose() {
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
