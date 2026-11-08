/**
 * Ecological PBR surfaces: aligned photographic companions, stochastic detail,
 * authored world pigments and original biome control masks.
 * Licenses, immutable source revisions and rebuild hashes live beside assets.
 */
import { TERRAIN_SAMPLING_GLSL } from './terrain-sampling.js';

const ASSETS = new URL('./assets/materials/', import.meta.url);

const WORLD_VERTEX = `
  varying vec3 vSurfacePosition;
  varying vec3 vSurfaceNormal;
`;
const WORLD_POSITION = `
  vec4 surfacePosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    surfacePosition = instanceMatrix * surfacePosition;
  #endif
  vSurfacePosition = (modelMatrix * surfacePosition).xyz;
  // StandardMaterial already applies inverse-transpose scale correction,
  // including non-uniform instance scales, before begin_vertex.
  vSurfaceNormal = inverseTransformDirection(transformedNormal, viewMatrix);
`;
const PROJECTION = `
  ${TERRAIN_SAMPLING_GLSL}
  varying vec3 vSurfacePosition;
  varying vec3 vSurfaceNormal;
  uniform float surfaceDetailDistance, surfaceAlbedoDistance, surfaceDominantAxis;
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
  float surfaceFootprintFade(float scale) {
    float footprint = max(length(surfacePositionDx), length(surfacePositionDy)) * scale;
    // Resolve substrate structure while its tile covers several pixels, then
    // retain the authored world pigment instead of magnifying the same photo.
    return 1.0 - smoothstep(0.12, 0.48, footprint);
  }
  float surfaceLuma(vec3 color) { return dot(color, vec3(0.2126, 0.7152, 0.0722)); }
  float surfaceGrain(vec3 color, float meanLuma) {
    return clamp(surfaceLuma(color) / meanLuma, 0.45, 1.65);
  }
  vec3 surfaceGrassPigment(vec3 pigment, vec3 scan, float detail) {
    // Luminance carries most of the photographic grain. A little bounded
    // chlorophyll chroma prevents dry turf becoming tan sand without replacing
    // the authored community palette or amplifying a tiny blue mean channel.
    float luminance = surfaceLuma(scan);
    vec3 chroma = clamp(scan / max(luminance, 0.04), vec3(0.65), vec3(1.40));
    return pigment * mix(1.0, surfaceGrain(scan, 0.208), detail * 0.80)
      * mix(vec3(1.0), chroma, detail * 0.14);
  }
  vec3 surfaceEarthPigment(float grain, float earthVariation) {
    float substrate = clamp(grain / 0.328, 0.55, 1.50);
    return mix(vec3(0.21, 0.15, 0.10), vec3(0.34, 0.25, 0.16),
      smoothstep(0.20, 0.80, earthVariation)) * (0.97 * mix(1.0, substrate, 0.90));
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
    return w;
  }
  vec4 surfaceTexture(sampler2D image, vec3 p, vec3 w, float scale, float seed) {
    vec4 color = vec4(0.0);
    if (w.x > 0.001) color += surfacePatchSample(image, surfacePatch(p.zy * scale, seed),
      surfacePositionDx.zy * scale, surfacePositionDy.zy * scale) * w.x;
    if (w.y > 0.001) color += surfacePatchSample(image, surfacePatch(p.xz * scale, seed),
      surfacePositionDx.xz * scale, surfacePositionDy.xz * scale) * w.y;
    if (w.z > 0.001) color += surfacePatchSample(image, surfacePatch(p.xy * scale, seed),
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
      float scale, float seed, vec3 viewNormal, vec2 strength) {
    vec3 detail = vec3(0.0);
    if (w.x > 0.001) {
      vec2 dx = surfacePositionDx.zy * scale, dy = surfacePositionDy.zy * scale;
      vec3 sampled = surfacePatchSample(image, surfacePatch(p.zy * scale, seed), dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.x;
    }
    if (w.y > 0.001) {
      vec2 dx = surfacePositionDx.xz * scale, dy = surfacePositionDy.xz * scale;
      vec3 sampled = surfacePatchSample(image, surfacePatch(p.xz * scale, seed), dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.y;
    }
    if (w.z > 0.001) {
      vec2 dx = surfacePositionDx.xy * scale, dy = surfacePositionDy.xy * scale;
      vec3 sampled = surfacePatchSample(image, surfacePatch(p.xy * scale, seed), dx, dy).xyz * 2.0 - 1.0;
      sampled.xy *= strength;
      detail += surfaceFrame(viewNormal, dx, dy) * sampled * w.z;
    }
    return normalize(detail);
  }
`;

function projectSurface(shader, detailUniforms, leanSampling = false) {
  Object.assign(shader.uniforms, detailUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + WORLD_VERTEX)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WORLD_POSITION);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + PROJECTION);
  // MeshStandardMaterial.copy resets custom defines. Cover/prop finishes call
  // this retained callback on clones, so the hardware budget must travel in
  // the callback too, not solely on the original material's defines object.
  if (leanSampling) shader.fragmentShader = '#ifndef SURFACE_LEAN\n#define SURFACE_LEAN 1\n#endif\n'
    + shader.fragmentShader;
}

function cliffSurface(material, maps, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, {
      surfaceGranitePaint: { value: maps.graniteMacro },
      surfaceStoneColor: { value: maps.rockColor },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D surfaceGranitePaint, surfaceStoneColor;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance) * surfaceFootprintFade(0.19);
      float stoneColorDetail = surfaceDetailFade(surfaceAlbedoDistance) * surfaceFootprintFade(0.19);
      vec3 stoneWeights = surfaceWeights(normalize(vSurfaceNormal));
      vec3 stonePigment = surfaceTexture(surfaceGranitePaint, vSurfacePosition, stoneWeights, 0.055, 47.0).rgb;
      // The illustrated mineral map supplies broad pigment, never relief. All
      // nearby PBR grain comes from one aligned photographic material set.
      vec3 stoneColor = mix(vec3(surfaceLuma(stonePigment)), stonePigment, 0.55);
      if (stoneColorDetail > 0.001) {
        vec3 scan = surfaceTexture(surfaceStoneColor, vSurfacePosition, stoneWeights, 0.19, 41.0).rgb;
        stoneColor *= mix(1.0, surfaceGrain(scan, 0.384), stoneColorDetail * 0.48);
      }
      diffuseColor.rgb *= stoneColor;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.94;
      if (surfaceDetail > 0.001) roughnessFactor = mix(roughnessFactor,
        clamp(surfaceTexture(roughnessMap, vSurfacePosition, stoneWeights, 0.19, 41.0).g, 0.65, 0.99), surfaceDetail);
    `).replace('#include <normal_fragment_maps>', `
      if (surfaceDetail > 0.001) normal = normalize(mix(normal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, 41.0, normal, normalScale * 0.40), surfaceDetail * 0.65));
    `);
  };
  material.customProgramCacheKey = () => 'above-stochastic-granite-props-v4';
}

function localCliffSurface(material, maps, forestUniforms, detailUniforms, leanSampling) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms, leanSampling);
    Object.assign(shader.uniforms, forestUniforms, {
      cliffMacroColor: { value: maps.graniteMacro },
      cliffStoneColor: { value: maps.rockColor },
      cliffGrassColor: { value: maps.grassColor },
      cliffGrassNormal: { value: maps.grassNormal },
      cliffWorldPaint: { value: maps.worldPaint },
      cliffFloorColor: { value: maps.floorColor },
      cliffFloorNormal: { value: maps.floorNormal },
      cliffFloorRoughness: { value: maps.floorRoughness },
      cliffPathColor: { value: maps.soilColor },
      cliffPathNormal: { value: maps.soilNormal },
      cliffPathRoughness: { value: maps.soilRoughness },
      cliffControls: { value: maps.controls },
      cliffEcology: { value: maps.ecology },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D cliffMacroColor, cliffStoneColor, cliffGrassColor, cliffGrassNormal, cliffWorldPaint;
      uniform sampler2D cliffFloorColor, cliffFloorNormal;
      uniform sampler2D cliffPathColor, cliffPathNormal;
      #ifndef SURFACE_LEAN
        uniform sampler2D cliffFloorRoughness, cliffPathRoughness;
      #endif
      uniform sampler2D cliffControls, cliffEcology, forestCoverageMap;
      uniform vec4 forestCoverageBounds;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      float stoneDetail = surfaceDetail * surfaceFootprintFade(0.19);
      float ledgeDetail = surfaceDetail * surfaceFootprintFade(0.38);
      float stoneColorDetail = surfaceDetailFade(surfaceAlbedoDistance) * surfaceFootprintFade(0.19);
      float ledgeColorDetail = surfaceDetailFade(surfaceAlbedoDistance) * surfaceFootprintFade(0.38);
      vec3 stoneNormal = normalize(vSurfaceNormal);
      vec3 stoneWeights = surfaceWeights(stoneNormal);
      vec3 stoneColor = surfaceTexture(cliffMacroColor, vSurfacePosition, stoneWeights, 1.0 / 32.0, 47.0).rgb;
      stoneColor = mix(vec3(surfaceLuma(stoneColor)), stoneColor, 0.55);
      if (stoneColorDetail > 0.001) {
        vec3 mineral = surfaceTexture(cliffStoneColor, vSurfacePosition, stoneWeights, 0.19, 41.0).rgb;
        stoneColor *= mix(1.0, surfaceGrain(mineral, 0.384), stoneColorDetail * 0.48);
      }
      vec3 stoneAlbedo = diffuseColor.rgb * stoneColor;
      float stoneGroundCover = 0.0, ledgeHumus = 0.0, ledgePath = 0.0;
      float ledgeFacing = smoothstep(0.70, 0.96, stoneNormal.y);
      vec2 groundDx = surfacePositionDx.xz, groundDy = surfacePositionDy.xz;
      SurfacePatch ledgeGrassPatch = surfacePatch(vSurfacePosition.xz * 0.38, 11.0);
      SurfacePatch ledgeFloorPatch = surfacePatch(vSurfacePosition.xz * 0.22, 23.0);
      SurfacePatch ledgePathPatch = surfacePatch(vSurfacePosition.xz * 0.24, 31.0);
      if (stoneNormal.y > 0.28) {
        vec2 groundUv = vSurfacePosition.xz / 3200.0 + 0.5;
        vec3 ledgeControls = textureGrad(cliffControls, groundUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
        vec3 ledgeEcology = textureGrad(cliffEcology, groundUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
        float lichen = smoothstep(0.28, 0.83, stoneNormal.y) * 0.10 * ledgeEcology.b;
        stoneAlbedo *= mix(vec3(1.0), vec3(0.82, 0.92, 0.65), lichen);
        if (ledgeFacing > 0.001) {
          vec3 ledgeMeadow = textureGrad(cliffWorldPaint, groundUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
          if (ledgeColorDetail > 0.001) {
            vec3 grass = surfacePatchSample(cliffGrassColor, ledgeGrassPatch, groundDx * 0.38, groundDy * 0.38).rgb;
            ledgeMeadow = surfaceGrassPigment(ledgeMeadow, grass, ledgeColorDetail);
          }
          float pocket = smoothstep(0.25, 0.66, ledgeEcology.b) * (1.0 - ledgeEcology.r * 0.58);
          vec2 coverageUv = (vSurfacePosition.xz - forestCoverageBounds.xy) / forestCoverageBounds.zw;
          vec2 coverageInside = step(vec2(0.0), coverageUv) * step(coverageUv, vec2(1.0));
          float canopy = textureGrad(forestCoverageMap, coverageUv,
            groundDx / forestCoverageBounds.zw, groundDy / forestCoverageBounds.zw).r
            * coverageInside.x * coverageInside.y;
          ledgeHumus = smoothstep(0.10, 0.70, canopy);
          ledgePath = ledgeControls.r;
          pocket = max(pocket, ledgeHumus * 0.65);
          if (ledgeHumus > 0.001) {
            vec3 humus = vec3(0.24, 0.19, 0.13) * (0.86 + ledgeEcology.b * 0.25);
            if (ledgeColorDetail > 0.001) humus *= mix(1.0,
              surfaceGrain(surfacePatchSample(cliffFloorColor, ledgeFloorPatch, groundDx * 0.22, groundDy * 0.22).rgb, 0.177), ledgeColorDetail * 0.78);
            ledgeMeadow = mix(ledgeMeadow, humus, ledgeHumus * 0.89);
          }
          if (ledgePath > 0.001) {
            float grain = 0.328;
            if (ledgeColorDetail > 0.001) grain = mix(grain,
              surfaceLuma(surfacePatchSample(cliffPathColor, ledgePathPatch, groundDx * 0.24, groundDy * 0.24).rgb), ledgeColorDetail);
            ledgeMeadow = mix(ledgeMeadow, surfaceEarthPigment(grain, ledgeEcology.b), ledgePath);
            pocket = max(pocket, ledgePath * 0.85);
          }
          stoneGroundCover = pocket * ledgeFacing;
          stoneAlbedo = mix(stoneAlbedo, ledgeMeadow, stoneGroundCover);
        }
      }
      diffuseColor.rgb = stoneAlbedo;
    `).replace('#include <roughnessmap_fragment>', `
      #ifdef SURFACE_LEAN
        float roughnessFactor = mix(0.94, 0.96, stoneGroundCover);
      #else
      float roughnessFactor = 0.94;
      if (stoneDetail > 0.001) roughnessFactor = mix(roughnessFactor,
        clamp(surfaceTexture(roughnessMap, vSurfacePosition, stoneWeights, 0.19, 41.0).g, 0.65, 0.99), stoneDetail);
      if (stoneGroundCover > 0.001) {
        float ledgeRoughness = 0.95;
        if (ledgeDetail > 0.001) {
          if (ledgeHumus > 0.001) ledgeRoughness = mix(ledgeRoughness,
            surfacePatchSample(cliffFloorRoughness, ledgeFloorPatch, groundDx * 0.22, groundDy * 0.22).g, ledgeHumus);
          if (ledgePath > 0.001) ledgeRoughness = mix(ledgeRoughness,
            surfacePatchSample(cliffPathRoughness, ledgePathPatch, groundDx * 0.24, groundDy * 0.24).g, ledgePath);
        }
        roughnessFactor = mix(roughnessFactor, clamp(ledgeRoughness, 0.65, 0.99), stoneGroundCover);
      }
      #endif
    `).replace('#include <normal_fragment_maps>', `
      vec3 stoneViewNormal = normal;
      if (stoneDetail > 0.001) stoneViewNormal = normalize(mix(normal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, 41.0, normal, normalScale * 0.45), stoneDetail * 0.65));
      if (stoneGroundCover > 0.001 && ledgeDetail > 0.001) {
        vec3 ledgeN = surfacePatchSample(cliffGrassNormal, ledgeGrassPatch, groundDx * 0.38, groundDy * 0.38).xyz * 2.0 - 1.0;
        if (ledgeHumus > 0.001) ledgeN = mix(ledgeN,
          surfacePatchSample(cliffFloorNormal, ledgeFloorPatch, groundDx * 0.22, groundDy * 0.22).xyz * 2.0 - 1.0, ledgeHumus);
        if (ledgePath > 0.001) ledgeN = mix(ledgeN,
          surfacePatchSample(cliffPathNormal, ledgePathPatch, groundDx * 0.24, groundDy * 0.24).xyz * 2.0 - 1.0, ledgePath);
        ledgeN.xy *= normalScale * 0.48;
        vec3 ledgeViewNormal = normalize(surfaceFrame(normal, groundDx, groundDy) * normalize(ledgeN));
        stoneViewNormal = normalize(mix(stoneViewNormal, ledgeViewNormal, stoneGroundCover * ledgeDetail));
      }
      normal = stoneViewNormal;
    `);
  };
  material.customProgramCacheKey = () => `above-stochastic-granite-ledges-v6-${leanSampling ? 'lean' : 'full'}`;
}

function terrainSurface(material, maps, forestUniforms, detailUniforms, leanSampling) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms, leanSampling);
    Object.assign(shader.uniforms, forestUniforms, {
      surfaceRockColor: { value: maps.rockColor },
      surfaceRockNormal: { value: maps.rockNormal },
      surfaceRockRoughness: { value: maps.rockRoughness },
      surfaceMineralMacro: { value: maps.graniteMacro },
      surfaceSoilColor: { value: maps.soilColor },
      surfaceSoilNormal: { value: maps.soilNormal },
      surfaceFloorColor: { value: maps.floorColor },
      surfaceFloorNormal: { value: maps.floorNormal },
      surfaceFloorRoughness: { value: maps.floorRoughness },
      surfaceWorldPaint: { value: maps.worldPaint },
      surfaceTalusColor: { value: maps.aerialColor },
      surfaceTalusNormal: { value: maps.aerialNormal },
      surfaceControls: { value: maps.controls },
      surfaceEcology: { value: maps.ecology },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D surfaceRockColor, surfaceRockNormal;
      uniform sampler2D surfaceSoilColor, surfaceSoilNormal, surfaceControls;
      uniform sampler2D surfaceFloorColor, surfaceFloorNormal, surfaceEcology, surfaceWorldPaint;
      #ifndef SURFACE_LEAN
        uniform sampler2D surfaceFloorRoughness, surfaceRockRoughness, surfaceMineralMacro;
        uniform sampler2D surfaceTalusColor, surfaceTalusNormal;
      #endif
      uniform sampler2D forestCanopyMap, forestCoverageMap;
      uniform vec3 forestCanopyBounds;
      uniform vec4 forestCoverageBounds;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      float meadowDetail = surfaceDetail * surfaceFootprintFade(0.38);
      float soilDetail = surfaceDetail * surfaceFootprintFade(0.24);
      float floorDetail = surfaceDetail * surfaceFootprintFade(0.22);
      float rockDetail = surfaceDetail * surfaceFootprintFade(0.19);
      float talusDetail = surfaceDetail * surfaceFootprintFade(1.0 / 24.0);
      float albedoReach = surfaceDetailFade(surfaceAlbedoDistance);
      float meadowColorDetail = albedoReach * surfaceFootprintFade(0.38);
      float soilColorDetail = albedoReach * surfaceFootprintFade(0.24);
      float floorColorDetail = albedoReach * surfaceFootprintFade(0.22);
      float rockColorDetail = albedoReach * surfaceFootprintFade(0.19);
      float talusColorDetail = albedoReach * surfaceFootprintFade(1.0 / 24.0);
      vec3 landNormal = normalize(vSurfaceNormal);
      vec3 landWeights = surfaceWeights(landNormal);
      vec2 groundDx = surfacePositionDx.xz, groundDy = surfacePositionDy.xz;
      vec2 controlUv = vSurfacePosition.xz / 3200.0 + 0.5;
      vec3 landControls = textureGrad(surfaceControls, controlUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
      vec3 landEcology = textureGrad(surfaceEcology, controlUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
      float pathCover = landControls.r;
      float moisture = landControls.g;
      float protectedField = landControls.b;
      float talusCover = landEcology.g * (1.0 - protectedField);
      float exposedRock = max(landEcology.r,
        1.0 - smoothstep(0.62, 0.82, landNormal.y)) * (1.0 - protectedField);
      vec2 coverageUv = (vSurfacePosition.xz - forestCoverageBounds.xy) / forestCoverageBounds.zw;
      float canopyCoverage = textureGrad(forestCoverageMap, coverageUv,
        groundDx / forestCoverageBounds.zw, groundDy / forestCoverageBounds.zw).r;
      vec2 coverageInside = step(vec2(0.0), coverageUv) * step(coverageUv, vec2(1.0));
      canopyCoverage *= coverageInside.x * coverageInside.y;
      float forestFloor = smoothstep(0.07, 0.68, canopyCoverage)
        * (1.0 - protectedField) * (1.0 - exposedRock) * (1.0 - pathCover);
      // Every companion reuses these exact offsets, cubic weights and original
      // gradients. Nearby scans supply grain; the unique world field supplies
      // plant communities and survives flight-distance minification.
      SurfacePatch meadowPatch = surfacePatch(vSurfacePosition.xz * 0.38, 11.0);
      SurfacePatch soilPatch = surfacePatch(vSurfacePosition.xz * 0.24, 31.0);
      SurfacePatch floorPatch = surfacePatch(vSurfacePosition.xz * 0.22, 23.0);
      #ifndef SURFACE_LEAN
        SurfacePatch talusPatch = surfacePatch(vSurfacePosition.xz / 24.0, 37.0);
      #endif
      vec3 meadow = textureGrad(surfaceWorldPaint, controlUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
      if (meadowColorDetail > 0.001) {
        vec3 grass = surfacePatchSample(map, meadowPatch, groundDx * 0.38, groundDy * 0.38).rgb;
        meadow = surfaceGrassPigment(meadow, grass, meadowColorDetail);
      }
      float mowingPhase = dot(vSurfacePosition.xz, vec2(0.92, 0.38)) * 0.58;
      vec2 mowingRate = vec2(dot(groundDx, vec2(0.92, 0.38)), dot(groundDy, vec2(0.92, 0.38))) * 0.58;
      float mowing = sin(mowingPhase) * exp(-dot(mowingRate, mowingRate));
      meadow *= 1.0 + mowing * 0.025 * protectedField;
      vec2 canopyUv = (vSurfacePosition.xz - forestCanopyBounds.xy) / forestCanopyBounds.z;
      float forestVisibility = textureGrad(forestCanopyMap, canopyUv,
        groundDx / forestCanopyBounds.z, groundDy / forestCanopyBounds.z).r;
      vec3 landColor = meadow;
      if (forestFloor > 0.001) {
        vec3 humus = vec3(0.24, 0.19, 0.13) * (0.86 + landEcology.b * 0.25);
        if (floorColorDetail > 0.001) humus *= mix(1.0,
          surfaceGrain(surfacePatchSample(surfaceFloorColor, floorPatch, groundDx * 0.22, groundDy * 0.22).rgb, 0.177), floorColorDetail * 0.78);
        landColor = mix(landColor, humus, forestFloor * 0.89);
      }
      float bareSoil = max(pathCover, talusCover);
      float talusMix = talusCover * (1.0 - pathCover * 0.5);
      if (bareSoil > 0.001) {
        float gravelLuma = 0.328;
        if (soilColorDetail > 0.001) gravelLuma = mix(gravelLuma,
          surfaceLuma(surfacePatchSample(surfaceSoilColor, soilPatch, groundDx * 0.24, groundDy * 0.24).rgb), soilColorDetail);
        vec3 gravel = surfaceEarthPigment(gravelLuma, landEcology.b);
        if (talusMix > 0.001) {
          vec3 debris = vec3(0.27, 0.25, 0.215);
          #ifdef SURFACE_LEAN
            // Reuse the retained soil pair for gravel; no unregistered detail.
            debris *= clamp(gravelLuma / 0.328, 0.70, 1.30);
          #else
            if (talusColorDetail > 0.001) debris *= mix(1.0,
              surfaceGrain(surfacePatchSample(surfaceTalusColor, talusPatch, groundDx / 24.0, groundDy / 24.0).rgb, 0.130), talusColorDetail * 0.65);
          #endif
          gravel = mix(gravel, debris, talusMix);
        }
        landColor = mix(landColor, gravel, bareSoil);
      }
      if (exposedRock > 0.001) {
        // On16-unit hardware retain the granite map's mean pigment and its
        // aligned photographic grain, reserving a slot for vertex sky light.
        vec3 pigment = vec3(0.633, 0.471, 0.324);
        #ifndef SURFACE_LEAN
          pigment = surfaceTexture(surfaceMineralMacro, vSurfacePosition, landWeights, 0.055, 47.0).rgb;
        #endif
        vec3 mineral = mix(vec3(surfaceLuma(pigment)), pigment, 0.55) * vec3(0.65, 0.68, 0.72);
        if (rockColorDetail > 0.001) mineral *= mix(1.0,
          surfaceGrain(surfaceTexture(surfaceRockColor, vSurfacePosition, landWeights, 0.19, 41.0).rgb, 0.384), rockColorDetail * 0.48);
        landColor = mix(landColor, mineral, exposedRock);
      }
      diffuseColor.rgb *= landColor;
    `).replace('#include <color_fragment>', `
      #ifdef USE_COLOR
        float authoredLight = clamp(dot(vColor, vec3(0.2126, 0.7152, 0.0722)) * 4.0, 0.78, 1.18);
        diffuseColor.rgb *= mix(1.0, authoredLight, 0.35);
      #endif
    `).replace('#include <roughnessmap_fragment>', `
      #ifdef SURFACE_LEAN
        float roughnessFactor = mix(0.95 - moisture * forestFloor * 0.035, 0.94, exposedRock);
      #else
      float landRoughness = 0.95;
      if (forestFloor > 0.001) {
        float humusRoughness = 0.92;
        if (floorDetail > 0.001) humusRoughness = mix(humusRoughness,
          surfacePatchSample(surfaceFloorRoughness, floorPatch, groundDx * 0.22, groundDy * 0.22).g, floorDetail);
        landRoughness = mix(landRoughness, humusRoughness, forestFloor);
      }
      if (bareSoil > 0.001) {
        float soilRoughness = 0.94;
        if (soilDetail > 0.001) soilRoughness = mix(soilRoughness,
          surfacePatchSample(roughnessMap, soilPatch, groundDx * 0.24, groundDy * 0.24).g, soilDetail);
        landRoughness = mix(landRoughness, mix(soilRoughness, 0.96, talusMix), bareSoil);
      }
      if (exposedRock > 0.001) {
        float mineralRoughness = 0.94;
        if (rockDetail > 0.001) mineralRoughness = mix(mineralRoughness,
          surfaceTexture(surfaceRockRoughness, vSurfacePosition, landWeights, 0.19, 41.0).g, rockDetail);
        landRoughness = mix(landRoughness, mineralRoughness, exposedRock);
      }
      float roughnessFactor = clamp(landRoughness - moisture * forestFloor * 0.035, 0.65, 0.99);
      #endif
    `).replace('#include <normal_fragment_maps>', `
      if (surfaceDetail > 0.001) {
        vec3 flatNormal = vec3(0.0, 0.0, 1.0), landDetail = flatNormal;
        if (meadowDetail > 0.001) landDetail = normalize(mix(flatNormal,
          surfacePatchSample(normalMap, meadowPatch, groundDx * 0.38, groundDy * 0.38).xyz * 2.0 - 1.0, meadowDetail));
        if (forestFloor > 0.001) {
          vec3 floorN = flatNormal;
          if (floorDetail > 0.001) floorN = normalize(mix(flatNormal,
            surfacePatchSample(surfaceFloorNormal, floorPatch, groundDx * 0.22, groundDy * 0.22).xyz * 2.0 - 1.0, floorDetail));
          landDetail = mix(landDetail, floorN, forestFloor);
        }
        if (bareSoil > 0.001) {
          vec3 soilN = flatNormal;
          if (soilDetail > 0.001) soilN = normalize(mix(flatNormal,
            surfacePatchSample(surfaceSoilNormal, soilPatch, groundDx * 0.24, groundDy * 0.24).xyz * 2.0 - 1.0, soilDetail));
          #ifndef SURFACE_LEAN
          if (talusMix > 0.001 && talusDetail > 0.001) {
            vec3 talusN = surfacePatchSample(surfaceTalusNormal, talusPatch, groundDx / 24.0, groundDy / 24.0).xyz * 2.0 - 1.0;
            talusN.xy *= 0.55;
            soilN = normalize(mix(soilN, normalize(talusN), talusMix * talusDetail));
          }
          #endif
          landDetail = mix(landDetail, soilN, bareSoil);
        }
        landDetail.xy *= normalScale * mix(0.48, 0.65, bareSoil);
        vec3 landViewNormal = normalize(surfaceFrame(normal, groundDx, groundDy) * normalize(landDetail));
        if (exposedRock > 0.001 && rockDetail > 0.001) landViewNormal = normalize(mix(landViewNormal,
          surfaceNormalTexture(surfaceRockNormal, vSurfacePosition, landWeights,
            0.19, 41.0, normal, normalScale * 0.40), exposedRock * rockDetail));
        normal = landViewNormal;
      }
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= forestVisibility;
      reflectedLight.indirectSpecular *= forestVisibility;
      reflectedLight.directDiffuse *= mix(1.0, forestVisibility, 0.68);
    `);
  };
  material.customProgramCacheKey = () => `above-stochastic-ecological-meadow-v8-${leanSampling ? 'lean' : 'full'}`;
}

function mountainSurface(material, maps, uniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, uniforms, {
      mountainWorldPaint: { value: maps.worldPaint },
      mountainStoneColor: { value: maps.rockColor },
      mountainAerialColor: { value: maps.aerialColor },
      mountainAerialNormal: { value: maps.aerialNormal },
      mountainGraniteMacro: { value: maps.graniteMacro },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D mountainWorldPaint, mountainStoneColor, mountainTerrainNormal;
      uniform sampler2D mountainAerialColor, mountainAerialNormal;
      uniform sampler2D mountainGraniteMacro;
      uniform vec4 mountainTerrainBounds;
      uniform float mountainHasTerrainNormal, mountainTreeLine, mountainSnowLine;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance * 3.0) * surfaceFootprintFade(0.10);
      vec3 mountainWorldNormal = normalize(vSurfaceNormal);
      float mountainAmbientOcclusion = 1.0;
      if (mountainHasTerrainNormal > 0.5) {
        vec2 reliefUv = (vSurfacePosition.xz - mountainTerrainBounds.xy)
          / mountainTerrainBounds.zw;
        vec4 mountainRelief = textureGrad(mountainTerrainNormal, reliefUv,
          surfacePositionDx.xz / mountainTerrainBounds.zw, surfacePositionDy.xz / mountainTerrainBounds.zw);
        mountainWorldNormal = normalize(mountainRelief.xyz * 2.0 - 1.0);
        mountainAmbientOcclusion = mountainRelief.a;
      }
      vec3 mountainWeights = surfaceWeights(mountainWorldNormal);
      float mountainCliff = 1.0 - smoothstep(0.35, 0.83, mountainWorldNormal.y);
      float mountainVegetation = smoothstep(0.72, 0.97, mountainWorldNormal.y)
        * (1.0 - smoothstep(mountainTreeLine - 200.0, mountainTreeLine + 200.0,
          vSurfacePosition.y));
      // Snow collects in sheltered shelves and shaded couloirs. The previous
      // 1700m threshold exceeded the retained DEM's 1529m summit entirely.
      float snowDrift = sin(vSurfacePosition.x * .006 + sin(vSurfacePosition.z * .008) * 1.7)
        * 45.0 + sin(vSurfacePosition.z * .018 + vSurfacePosition.x * .011) * 24.0;
      float snowShelter = clamp(-mountainWorldNormal.z * .5 + .5, 0.0, 1.0);
      float mountainSnow = smoothstep(mountainSnowLine + snowDrift - snowShelter * 130.0,
        mountainSnowLine + 260.0 + snowDrift, vSurfacePosition.y)
        * smoothstep(0.24, 0.72, mountainWorldNormal.y);
      vec2 aerialDx = surfacePositionDx.xz / 240.0, aerialDy = surfacePositionDy.xz / 240.0;
      SurfacePatch mountainAerialPatch = surfacePatch(vSurfacePosition.xz / 240.0, 37.0);
      vec3 mountainColor = vec3(0.0);
      float aerialLuma = 0.13;
      if (mountainCliff < 0.999) {
        vec3 aerial = surfacePatchSample(mountainAerialColor, mountainAerialPatch, aerialDx, aerialDy).rgb;
        aerialLuma = surfaceLuma(aerial);
        mountainColor = mix(aerial, aerialLuma * vec3(0.78, 0.88, 0.83), 0.72);
      }
      if (mountainCliff > 0.001) {
        // Continuous triplanar blending retains rounded shoulders: no X/Z
        // dominant-axis switch on high/medium. Low quality bounds this to one.
        vec3 pigment = surfaceTexture(mountainGraniteMacro, vSurfacePosition, mountainWeights, 1.0 / 384.0, 47.0).rgb;
        vec3 mineral = mix(vec3(surfaceLuma(pigment)), pigment, 0.65) * vec3(1.14, 1.03, 0.90);
        if (surfaceDetail > 0.001) mineral *= mix(1.0,
          surfaceGrain(surfaceTexture(mountainStoneColor, vSurfacePosition, mountainWeights, 0.10, 41.0).rgb, 0.384), surfaceDetail * 0.35);
        mountainColor = mix(mountainColor, mineral, mountainCliff);
      }
      if (mountainVegetation > 0.001) {
        // Mountain stands inherit quiet large-scale substrate variation. Inside
        // the valley they meet its unique community atlas; outside it they keep
        // a restrained montane palette, never an enlarged painted plant tile.
        vec3 mountainMeadow = mix(vec3(0.09, 0.12, 0.055), vec3(0.145, 0.16, 0.078),
          smoothstep(0.04, 0.26, aerialLuma));
        vec2 worldUv = vSurfacePosition.xz / 3200.0 + 0.5;
        vec2 worldEdge = min(worldUv, 1.0 - worldUv);
        float insideValley = smoothstep(0.0, 0.08, min(worldEdge.x, worldEdge.y));
        if (insideValley > 0.001) {
          vec3 valleyPigment = textureGrad(mountainWorldPaint, worldUv,
            surfacePositionDx.xz / 3200.0, surfacePositionDy.xz / 3200.0).rgb;
          mountainMeadow = mix(mountainMeadow, valleyPigment * 0.48, insideValley);
        }
        mountainColor = mix(mountainColor, mountainMeadow, mountainVegetation * 0.72);
      }
      mountainColor = mix(mountainColor, vec3(0.78, 0.83, 0.86), mountainSnow);
      diffuseColor.rgb *= mountainColor;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.96;
      if (surfaceDetail > 0.001 && mountainCliff > 0.001) roughnessFactor = mix(roughnessFactor,
        clamp(surfaceTexture(roughnessMap, vSurfacePosition, mountainWeights, 0.10, 41.0).g, 0.65, 0.99),
        surfaceDetail * mountainCliff * (1.0 - mountainSnow));
    `).replace('#include <normal_fragment_maps>', `
      vec3 mountainViewNormal = normalize(mat3(viewMatrix) * mountainWorldNormal);
      vec3 geologicalNormal = mountainViewNormal;
      if (mountainCliff < 0.999) {
        vec3 aerialNormal = surfacePatchSample(mountainAerialNormal, mountainAerialPatch, aerialDx, aerialDy).xyz * 2.0 - 1.0;
        aerialNormal.xy *= 0.24;
        geologicalNormal = normalize(surfaceFrame(mountainViewNormal, aerialDx, aerialDy) * aerialNormal);
      }
      geologicalNormal = normalize(mix(geologicalNormal, mountainViewNormal, mountainCliff));
      if (surfaceDetail > 0.001) {
        vec3 mountainDetail = surfaceNormalTexture(normalMap, vSurfacePosition,
          mountainWeights, 0.10, 41.0, mountainViewNormal, normalScale * 0.20);
        geologicalNormal = normalize(mix(geologicalNormal, mountainDetail, 0.12 * surfaceDetail));
      }
      normal = normalize(mix(geologicalNormal, mountainViewNormal, mountainSnow * 0.75));
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      // The DEM's horizon visibility darkens enclosed gullies without removing
      // direct sunlight or requiring an extra ambient-occlusion texture fetch.
      reflectedLight.indirectDiffuse *= mountainAmbientOcclusion;
      reflectedLight.indirectSpecular *= mountainAmbientOcclusion;
    `);
  };
  material.customProgramCacheKey = () => 'above-stochastic-mountain-v7';
}

/** Load locally retained, attributed PBR maps before constructing the scene. */
export async function createSurfaceMaterials(THREE, { anisotropy = 4, maxTextures = 16 } = {}) {
  // Full terrain uses19 material samplers +2 shadows +1 vertex sky probe.
  // Three's allocator budgets combined units against maxTextures, so compile
  // away six references on16-unit hardware: aerial talus2, roughness3, and the
  // broad granite pigment1. Retain aligned scan color/normals and forest shadows.
  const leanSampling = !Number.isFinite(maxTextures) || maxTextures < 22;
  const qualityAnisotropy = {
    high: Math.max(1, Math.min(8, anisotropy)),
    medium: Math.max(1, Math.min(2, anisotropy)),
    low: 1,
  };
  let quality = 'high';
  const detailDistances = { high: 300, medium: 160, low: 80 };
  const albedoDistances = { high: 900, medium: 500, low: 240 };
  const detailUniforms = {
    surfaceDetailDistance: { value: detailDistances.high },
    surfaceAlbedoDistance: { value: albedoDistances.high },
    surfaceDominantAxis: { value: 0 },
    surfaceStochastic: { value: 1 },
  };
  const loader = new THREE.TextureLoader();
  const files = {
    grassColor: ['babylon/grass.png', true],
    grassNormal: ['babylon/grassn.png', false],
    soilColor: ['babylon/rockyGround_basecolor.png', true],
    soilNormal: ['babylon/rockyGround_normal.png', false],
    soilRoughness: ['babylon/rockyGround_metalRough.png', false],
    floorColor: ['scanned/floor-color.webp', true],
    floorNormal: ['scanned/floor-normal.webp', false],
    floorRoughness: ['scanned/floor-roughness.webp', false],
    rockColor: ['scanned/rock-color.webp', true],
    rockNormal: ['scanned/rock-normal.webp', false],
    rockRoughness: ['scanned/rock-roughness.webp', false],
    woodColor: ['scanned/wood-color.webp', true],
    woodNormal: ['scanned/wood-normal.webp', false],
    woodRoughness: ['scanned/wood-roughness.webp', false],
    controls: ['terrain-control.png', false],
    ecology: ['terrain-ecology.png', false],
    worldPaint: ['terrain-paint.webp', true],
    aerialColor: ['aerial-rocks/color.webp', true],
    aerialNormal: ['aerial-rocks/normal.webp', false],
    graniteMacro: ['generated/granite-painted-color.webp', true],
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
  for (const texture of [maps.controls, maps.ecology, maps.worldPaint]) {
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.flipY = false;
  }

  const whiteCanopy = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  whiteCanopy.needsUpdate = true;
  textures.push(whiteCanopy);
  const forestUniforms = {
    forestCanopyMap: { value: whiteCanopy },
    forestCanopyBounds: { value: new THREE.Vector3(-1600, -1600, 3200) },
  };
  const emptyCoverage = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  emptyCoverage.needsUpdate = true;
  textures.push(emptyCoverage);
  forestUniforms.forestCoverageMap = { value: emptyCoverage };
  forestUniforms.forestCoverageBounds = { value: new THREE.Vector4(-1600, -1600, 3200, 3200) };
  const terrain = new THREE.MeshStandardMaterial({
    name: 'Alpine meadow, humus and mineral ground', vertexColors: true,
    map: maps.grassColor, normalMap: maps.grassNormal, normalScale: new THREE.Vector2(.65, .65),
    roughnessMap: maps.soilRoughness, roughness: 1, metalness: 0,
  });
  terrainSurface(terrain, maps, forestUniforms, detailUniforms, leanSampling);

  const rock = new THREE.MeshStandardMaterial({
    name: 'Fractured launch granite', color: 0xc9cac3,
    map: maps.graniteMacro, normalMap: maps.rockNormal, normalScale: new THREE.Vector2(.72, .72),
    roughnessMap: maps.rockRoughness, roughness: 1, metalness: 0,
  });
  localCliffSurface(rock, maps, forestUniforms, detailUniforms, leanSampling);
  const granite = rock.clone();
  granite.name = 'Photographic granite props';
  granite.color.setHex(0xc9cac3);
  cliffSurface(granite, maps, detailUniforms);

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
  mountain.color.setHex(0xe7e8e6);
  mountain.normalScale.set(.55, .55);
  mountainSurface(mountain, maps, mountainUniforms, detailUniforms);

  const metal = new THREE.MeshStandardMaterial({
    name: 'Galvanized fittings', color: 0x939a96, roughness: .49, metalness: .72,
  });
  const rope = new THREE.MeshStandardMaterial({
    name: 'Natural rope', color: 0xa69672, roughness: .98, metalness: 0,
  });
  const materials = [terrain, rock, granite, timber, timberBeam, mountain, metal, rope];
  if (leanSampling) {
    terrain.defines = { ...terrain.defines, SURFACE_LEAN: 1 };
    rock.defines = { ...rock.defines, SURFACE_LEAN: 1 };
  }
  const qualityTextures = textures.filter(texture => !texture.isDataTexture);
  const atmospheres = new WeakSet();
  return {
    terrain, rock, granite, timber, timberBeam, mountain, metal, rope,
    boulderMaps: { color: maps.rockColor, normal: maps.rockNormal, roughness: maps.rockRoughness },
    setForestShadowMap(texture, bounds) {
      if (!texture || !bounds) return;
      forestUniforms.forestCanopyMap.value = texture;
      forestUniforms.forestCanopyBounds.value.set(bounds.minX, bounds.minZ, bounds.size);
    },
    /** Linear R=canopy density, row zero at minZ (flipY=false). Not owned here. */
    setForestCoverage(texture, bounds) {
      const width = bounds?.width ?? bounds?.size;
      const depth = bounds?.depth ?? bounds?.size;
      if (!texture || ![bounds?.minX, bounds?.minZ, width, depth].every(Number.isFinite)
          || width <= 0 || depth <= 0) return false;
      forestUniforms.forestCoverageMap.value = texture;
      forestUniforms.forestCoverageBounds.value.set(bounds.minX, bounds.minZ, width, depth);
      return true;
    },
    /** Install one shared atmosphere across these surfaces, preserving their PBR patches. */
    setAtmosphere(shared) {
      if (!shared || typeof shared.installMaterial !== 'function' || atmospheres.has(shared)) return false;
      materials.forEach(material => shared.installMaterial(material));
      atmospheres.add(shared);
      return true;
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
      detailUniforms.surfaceAlbedoDistance.value = albedoDistances[level];
      detailUniforms.surfaceDominantAxis.value = level === 'low' ? 1 : 0;
      detailUniforms.surfaceStochastic.value = level === 'low' ? 0 : 1;
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
