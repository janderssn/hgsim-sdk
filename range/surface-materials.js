/**
 * Ecological PBR surfaces: photographic companions, explicitly synthesized
 * botanical/geological colour macros, and original biome control masks.
 * Licenses, immutable source revisions and rebuild hashes live beside assets.
 */
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
  vec3 surfaceEarthPigment(float grain, float earthVariation) {
    return mix(vec3(0.21, 0.15, 0.10), vec3(0.34, 0.25, 0.16),
      smoothstep(0.20, 0.80, earthVariation)) * (0.60 + grain * 1.12);
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

function cliffSurface(material, maps, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    shader.uniforms.surfaceGranitePaint = { value: maps.graniteMacro };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D surfaceGranitePaint;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 stoneWeights = surfaceWeights(normalize(vSurfaceNormal));
      vec3 stonePigment = surfaceTexture(surfaceGranitePaint, vSurfacePosition, stoneWeights, 0.055).rgb;
      float mineralLuma = dot(stonePigment, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb *= mix(vec3(mineralLuma), stonePigment, 0.55);
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.94;
    `).replace('#include <normal_fragment_maps>', `
      if (surfaceDetail > 0.001) normal = normalize(mix(normal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, normal, normalScale * 0.25), surfaceDetail * 0.38));
    `);
  };
  material.customProgramCacheKey = () => 'above-painted-granite-props-v3';
}

function localCliffSurface(material, maps, forestUniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, forestUniforms, {
      cliffMacroColor: { value: maps.graniteMacro },
      cliffMeadowColor: { value: maps.meadowMacro },
      cliffWorldPaint: { value: maps.worldPaint },
      cliffFloorColor: { value: maps.floorColor },
      cliffPathColor: { value: maps.soilColor },
      cliffControls: { value: maps.controls },
      cliffEcology: { value: maps.ecology },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D cliffMacroColor, cliffMeadowColor, cliffFloorColor, cliffPathColor, cliffWorldPaint;
      uniform sampler2D cliffControls, cliffEcology, forestCoverageMap;
      uniform vec4 forestCoverageBounds;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 stoneNormal = normalize(vSurfaceNormal);
      vec3 stoneWeights = surfaceWeights(stoneNormal);
      // Continuous world projection avoids visible texture switches at rounded
      // shoulders. Texture gradients retain stable filtering at flight distance.
      vec3 stoneColor = surfaceTexture(cliffMacroColor, vSurfacePosition, stoneWeights, 1.0 / 32.0).rgb;
      // Slow intersecting mineral bands break texture repetition without a
      // second set of three projections on every distant cliff fragment.
      float broadMineral = sin(dot(vSurfacePosition, vec3(.011, .023, .007))) * .06
        + sin(dot(vSurfacePosition, vec3(-.017, .009, .019))) * .04;
      stoneColor *= .98 + broadMineral;
      float mineralLuma = dot(stoneColor, vec3(0.2126, 0.7152, 0.0722));
      stoneColor = mix(vec3(mineralLuma), stoneColor, 0.55);
      vec3 stoneAlbedo = diffuseColor.rgb * stoneColor;
      float stoneGroundCover = 0.0;
      float ledgeFacing = smoothstep(0.70, 0.96, stoneNormal.y);
      if (stoneNormal.y > 0.28) {
        vec2 groundUv = vSurfacePosition.xz / 3200.0 + 0.5;
        vec3 ledgeControls = textureGrad(cliffControls, groundUv,
          surfacePositionDx.xz / 3200.0, surfacePositionDy.xz / 3200.0).rgb;
        vec3 ledgeEcology = textureGrad(cliffEcology, groundUv,
          surfacePositionDx.xz / 3200.0, surfacePositionDy.xz / 3200.0).rgb;
        // A slight mineral/lichen stain follows weathered rims, while soil
        // accumulates only on upward ledges. No flat terrace-wide colour cap.
        float lichen = smoothstep(0.28, 0.83, stoneNormal.y) * 0.10 * ledgeEcology.b;
        stoneAlbedo *= mix(vec3(1.0), vec3(0.82, 0.92, 0.65), lichen);
        if (ledgeFacing > 0.001) {
          vec2 groundDx = surfacePositionDx.xz, groundDy = surfacePositionDy.xz;
          vec2 botanicalUv = vSurfacePosition.xz / 6.0;
          vec3 brush = textureGrad(cliffMeadowColor, botanicalUv, groundDx / 6.0, groundDy / 6.0).rgb;
          vec3 ledgeMeadow = textureGrad(cliffWorldPaint, groundUv, groundDx / 3200.0, groundDy / 3200.0).rgb;
          ledgeMeadow *= mix(vec3(1.0), clamp(brush / vec3(0.379, 0.232, 0.056), vec3(0.35), vec3(1.80)), 0.80);
          float botanicalLuma = dot(ledgeMeadow, vec3(0.2126, 0.7152, 0.0722));
          float pocket = smoothstep(0.25, 0.66,
            ledgeEcology.b * 0.62 + min(botanicalLuma * 3.0, 1.0) * 0.38);
          pocket *= 1.0 - ledgeEcology.r * 0.58;
          vec2 coverageUv = (vSurfacePosition.xz - forestCoverageBounds.xy) / forestCoverageBounds.zw;
          vec2 coverageInside = step(vec2(0.0), coverageUv) * step(coverageUv, vec2(1.0));
          float canopy = textureGrad(forestCoverageMap, coverageUv,
            groundDx / forestCoverageBounds.zw, groundDy / forestCoverageBounds.zw).r
            * coverageInside.x * coverageInside.y;
          float humusCover = smoothstep(0.10, 0.70, canopy);
          pocket = max(pocket, humusCover * 0.65);
          if (humusCover > 0.001) {
            vec3 humus = textureGrad(cliffFloorColor, vSurfacePosition.xz * 0.22,
              groundDx * 0.22, groundDy * 0.22).rgb;
            float humusLuma = dot(humus, vec3(0.2126, 0.7152, 0.0722));
            vec3 paintedHumus = vec3(0.24, 0.19, 0.13) * (0.76 + humusLuma * 1.5);
            ledgeMeadow = mix(ledgeMeadow, paintedHumus, humusCover * 0.86);
          }
          if (ledgeControls.r > 0.001) {
            vec3 wornPath = textureGrad(cliffPathColor, vSurfacePosition.xz * 0.24,
              groundDx * 0.24, groundDy * 0.24).rgb;
            wornPath = surfaceEarthPigment(dot(wornPath, vec3(0.2126, 0.7152, 0.0722)), ledgeEcology.b);
            ledgeMeadow = mix(ledgeMeadow, wornPath, ledgeControls.r);
            pocket = max(pocket, ledgeControls.r * 0.85);
          }
          stoneGroundCover = pocket * ledgeFacing;
          stoneAlbedo = mix(stoneAlbedo, ledgeMeadow, stoneGroundCover);
        }
      }
      diffuseColor.rgb = stoneAlbedo;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = mix(0.91, 0.97, stoneGroundCover);
    `).replace('#include <normal_fragment_maps>', `
      // Exfoliation planes and joints come from the common collision/drawing
      // geometry. A height proxy from colour made those planes look swollen;
      // only the supplied scan contributes restrained nearby mineral grain.
      if (surfaceDetail > 0.001) normal = normalize(mix(normal,
        surfaceNormalTexture(normalMap, vSurfacePosition, stoneWeights,
          0.19, normal, normalScale * 0.45), surfaceDetail * 0.45 * (1.0 - stoneGroundCover * 0.65)));
    `);
  };
  material.customProgramCacheKey = () => 'above-painted-granite-ledges-v5';
}

function terrainSurface(material, maps, forestUniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, forestUniforms, {
      surfaceRockColor: { value: maps.graniteMacro },
      surfaceRockNormal: { value: maps.rockNormal },
      surfaceRockRoughness: { value: maps.rockRoughness },
      surfaceSoilColor: { value: maps.soilColor },
      surfaceSoilNormal: { value: maps.soilNormal },
      surfaceFloorColor: { value: maps.floorColor },
      surfaceFloorNormal: { value: maps.floorNormal },
      surfaceFloorRoughness: { value: maps.floorRoughness },
      surfaceMeadowMacro: { value: maps.meadowMacro },
      surfaceWorldPaint: { value: maps.worldPaint },
      surfaceTalusColor: { value: maps.aerialColor },
      surfaceControls: { value: maps.controls },
      surfaceEcology: { value: maps.ecology },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D surfaceRockColor, surfaceRockNormal, surfaceRockRoughness;
      uniform sampler2D surfaceSoilColor, surfaceSoilNormal, surfaceControls;
      uniform sampler2D surfaceFloorColor, surfaceFloorNormal, surfaceFloorRoughness;
      uniform sampler2D surfaceMeadowMacro, surfaceTalusColor, surfaceEcology, surfaceWorldPaint;
      uniform sampler2D forestCanopyMap, forestCoverageMap;
      uniform vec3 forestCanopyBounds;
      uniform vec4 forestCoverageBounds;
    `).replace('#include <map_fragment>', `
      surfaceDerivatives();
      float surfaceDetail = surfaceDetailFade(surfaceDetailDistance);
      vec3 landNormal = normalize(vSurfaceNormal);
      vec3 landWeights = surfaceWeights(landNormal);
      vec2 controlUv = vSurfacePosition.xz / 3200.0 + 0.5;
      vec4 landControls = texture2D(surfaceControls, controlUv);
      vec4 landEcology = texture2D(surfaceEcology, controlUv);
      float pathCover = landControls.r;
      float moisture = landControls.g;
      float protectedField = landControls.b;
      float talusCover = landEcology.g * (1.0 - protectedField);
      float exposedRock = max(landEcology.r,
        1.0 - smoothstep(0.62, 0.82, landNormal.y)) * (1.0 - protectedField);
      vec2 coverageUv = (vSurfacePosition.xz - forestCoverageBounds.xy) / forestCoverageBounds.zw;
      // A density field from the actual canopy footprint drives humus and
      // understory. It is independent from the directional tree-shadow map.
      float canopyCoverage = texture2D(forestCoverageMap, coverageUv).r;
      vec2 coverageInside = step(vec2(0.0), coverageUv) * step(coverageUv, vec2(1.0));
      canopyCoverage *= coverageInside.x * coverageInside.y;
      float forestFloor = smoothstep(0.07, 0.68, canopyCoverage)
        * (1.0 - protectedField) * (1.0 - exposedRock) * (1.0 - pathCover);
      vec2 meadowUv = vSurfacePosition.xz * 0.38;
      vec2 soilUv = vSurfacePosition.xz * 0.24;
      vec2 floorUv = vSurfacePosition.xz * 0.22;
      // Warp the single botanical tile with fields already in registers. Include
      // that warp in explicit gradients so the stronger brushwork stays stable
      // under minification rather than revealing a repeat grid.
      vec2 brushWarp = vec2(landEcology.b, moisture) * vec2(1.7, 1.3);
      vec2 macroUv = vSurfacePosition.xz / 6.0 + brushWarp;
      vec2 macroDx = surfacePositionDx.xz / 6.0 + dFdx(brushWarp);
      vec2 macroDy = surfacePositionDy.xz / 6.0 + dFdy(brushWarp);
      // One authored world field gives the meadow coherent 20–150 m pigment
      // patches. A single hand-painted botanical sample supplies brush detail;
      // this replaces two repeated-photo phases and a fine colour fetch.
      vec3 meadow = texture2D(surfaceWorldPaint, controlUv).rgb;
      vec3 brush = textureGrad(surfaceMeadowMacro, macroUv, macroDx, macroDy).rgb;
      vec3 brushPigment = clamp(brush / vec3(0.379, 0.232, 0.056), vec3(0.35), vec3(1.80));
      meadow *= mix(vec3(1.0), brushPigment, 0.80 * (1.0 - protectedField * 0.30));
      float brushLuma = dot(brush, vec3(0.2126, 0.7152, 0.0722));
      float botanicalEarth = (1.0 - smoothstep(0.13, 0.23, brushLuma))
        * 0.42 * (1.0 - protectedField * 0.65);
      meadow = mix(meadow, surfaceEarthPigment(brushLuma, landEcology.b), botanicalEarth);
      float mowingPhase = dot(vSurfacePosition.xz, vec2(0.92, 0.38)) * 0.58;
      vec2 mowingRate = vec2(dot(surfacePositionDx.xz, vec2(0.92, 0.38)),
        dot(surfacePositionDy.xz, vec2(0.92, 0.38))) * 0.58;
      float mowing = sin(mowingPhase) * exp(-dot(mowingRate, mowingRate));
      meadow *= 1.0 + mowing * 0.035 * protectedField;
      vec2 canopyUv = (vSurfacePosition.xz - forestCanopyBounds.xy) / forestCanopyBounds.z;
      float forestVisibility = texture2D(forestCanopyMap, canopyUv).r;
      vec3 landColor = meadow;
      if (forestFloor > 0.001) {
        vec3 humus = textureGrad(surfaceFloorColor, floorUv,
          surfacePositionDx.xz * 0.22, surfacePositionDy.xz * 0.22).rgb;
        float humusLuma = dot(humus, vec3(0.2126, 0.7152, 0.0722));
        vec3 paintedHumus = vec3(0.24, 0.19, 0.13) * (0.76 + humusLuma * 1.5);
        paintedHumus *= 0.86 + landEcology.b * 0.25;
        landColor = mix(landColor, paintedHumus, forestFloor * 0.89);
      }
      float bareSoil = max(pathCover, talusCover);
      if (bareSoil > 0.001) {
        vec3 gravel = textureGrad(surfaceSoilColor, soilUv,
          surfacePositionDx.xz * 0.24, surfacePositionDy.xz * 0.24).rgb;
        float gravelLuma = dot(gravel, vec3(0.2126, 0.7152, 0.0722));
        gravel = mix(surfaceEarthPigment(gravelLuma, landEcology.b),
          gravelLuma * vec3(0.90, 0.91, 0.88), talusCover);
        if (talusCover > 0.01) {
          vec3 debris = textureGrad(surfaceTalusColor, vSurfacePosition.xz / 24.0,
            surfacePositionDx.xz / 24.0, surfacePositionDy.xz / 24.0).rgb;
          float debrisLuma = dot(debris, vec3(0.2126, 0.7152, 0.0722));
          gravel = mix(gravel, debrisLuma * vec3(1.06, 1.00, 0.89), talusCover * 0.22);
        }
        landColor = mix(landColor, gravel, bareSoil);
      }
      if (exposedRock > 0.001) {
        vec3 rockPigment = surfaceTexture(surfaceRockColor, vSurfacePosition, landWeights, 0.055).rgb;
        float rockLuma = dot(rockPigment, vec3(0.2126, 0.7152, 0.0722));
        landColor = mix(landColor, mix(vec3(rockLuma), rockPigment, 0.55)
          * vec3(0.65, 0.68, 0.72), exposedRock);
      }
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
      float roughnessFactor = mix(mix(0.94, 0.88, moisture * forestFloor), 0.90, exposedRock);
      if (surfaceDetail > 0.001) {
        float landRoughness = 0.94;
        if (forestFloor > 0.001) landRoughness = mix(landRoughness,
          textureGrad(surfaceFloorRoughness, floorUv,
            surfacePositionDx.xz * 0.22, surfacePositionDy.xz * 0.22).g, forestFloor);
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
        if (forestFloor > 0.001) landDetail = mix(landDetail,
          textureGrad(surfaceFloorNormal, floorUv, surfacePositionDx.xz * 0.22,
            surfacePositionDy.xz * 0.22).xyz * 2.0 - 1.0, forestFloor);
        if (bareSoil > 0.001) landDetail = mix(landDetail,
          textureGrad(surfaceSoilNormal, soilUv, surfacePositionDx.xz * 0.24,
            surfacePositionDy.xz * 0.24).xyz * 2.0 - 1.0, bareSoil);
        landDetail.xy *= normalScale * mix(0.32, 0.68, bareSoil);
        vec3 landViewNormal = normalize(surfaceFrame(normal, meadowDx, meadowDy) * normalize(landDetail));
        if (exposedRock > 0.001) landViewNormal = normalize(mix(landViewNormal,
          surfaceNormalTexture(surfaceRockNormal, vSurfacePosition, landWeights,
            0.19, normal, normalScale * 0.25), exposedRock));
        normal = normalize(mix(normal, landViewNormal, surfaceDetail));
      }
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= forestVisibility;
      reflectedLight.indirectSpecular *= forestVisibility;
      reflectedLight.directDiffuse *= mix(1.0, forestVisibility, 0.68);
    `);
  };
  material.customProgramCacheKey = () => 'above-painted-ecological-meadow-v7';
}

function mountainSurface(material, maps, uniforms, detailUniforms) {
  material.onBeforeCompile = shader => {
    projectSurface(shader, detailUniforms);
    Object.assign(shader.uniforms, uniforms, {
      mountainMeadowColor: { value: maps.meadowMacro },
      mountainAerialColor: { value: maps.aerialColor },
      mountainAerialNormal: { value: maps.aerialNormal },
      mountainGraniteMacro: { value: maps.graniteMacro },
    });
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D mountainMeadowColor, mountainTerrainNormal;
      uniform sampler2D mountainAerialColor, mountainAerialNormal;
      uniform sampler2D mountainGraniteMacro;
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
      // Snow collects in sheltered shelves and shaded couloirs. The previous
      // 1700m threshold exceeded the retained DEM's 1529m summit entirely.
      float snowDrift = sin(vSurfacePosition.x * .006 + sin(vSurfacePosition.z * .008) * 1.7)
        * 45.0 + sin(vSurfacePosition.z * .018 + vSurfacePosition.x * .011) * 24.0;
      float snowShelter = clamp(-mountainWorldNormal.z * .5 + .5, 0.0, 1.0);
      float mountainSnow = smoothstep(mountainSnowLine + snowDrift - snowShelter * 130.0,
        mountainSnowLine + 260.0 + snowDrift, vSurfacePosition.y)
        * smoothstep(0.24, 0.72, mountainWorldNormal.y);
      vec2 aerialUv = vSurfacePosition.xz / 240.0;
      vec2 aerialDx = surfacePositionDx.xz / 240.0, aerialDy = surfacePositionDy.xz / 240.0;
      bool graniteXAxis = abs(mountainWorldNormal.x) > abs(mountainWorldNormal.z);
      vec2 graniteMacroUv = (graniteXAxis ? vSurfacePosition.zy : vSurfacePosition.xy) / 384.0;
      vec2 graniteDx = (graniteXAxis ? surfacePositionDx.zy : surfacePositionDx.xy) / 384.0;
      vec2 graniteDy = (graniteXAxis ? surfacePositionDy.zy : surfacePositionDy.xy) / 384.0;
      vec3 mountainColor = vec3(0.0);
      if (mountainCliff < 0.999) {
        vec3 aerial = textureGrad(mountainAerialColor, aerialUv, aerialDx, aerialDy).rgb;
        float aerialLuma = dot(aerial, vec3(0.2126, 0.7152, 0.0722));
        mountainColor = mix(aerial, aerialLuma * vec3(0.78, 0.88, 0.83), 0.72);
      }
      if (mountainCliff > 0.001) {
        vec3 pigment = textureGrad(mountainGraniteMacro, graniteMacroUv, graniteDx, graniteDy).rgb;
        float mineralLuma = dot(pigment, vec3(0.2126, 0.7152, 0.0722));
        vec3 mineral = mix(vec3(mineralLuma), pigment, 0.65) * vec3(1.14, 1.03, .90);
        mountainColor = mix(mountainColor, mineral, mountainCliff);
      }
      if (mountainVegetation > 0.001) {
        vec3 mountainMeadow = textureGrad(mountainMeadowColor, vSurfacePosition.xz * 0.012,
          surfacePositionDx.xz * 0.012, surfacePositionDy.xz * 0.012).rgb;
        // Mountain stands are dark, subdued canopy rather than bright field turf.
        mountainMeadow *= vec3(0.28, 0.44, 0.40);
        mountainColor = mix(mountainColor, mountainMeadow, mountainVegetation * 0.72);
      }
      mountainColor = mix(mountainColor, vec3(0.78, 0.83, 0.86), mountainSnow);
      diffuseColor.rgb *= mountainColor;
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = 0.96;
    `).replace('#include <normal_fragment_maps>', `
      vec3 mountainViewNormal = normalize(mat3(viewMatrix) * mountainWorldNormal);
      vec3 geologicalNormal = mountainViewNormal;
      if (mountainCliff < 0.999) {
        vec3 aerialNormal = textureGrad(mountainAerialNormal, aerialUv, aerialDx, aerialDy).xyz * 2.0 - 1.0;
        aerialNormal.xy *= 0.24;
        geologicalNormal = normalize(surfaceFrame(mountainViewNormal, aerialDx, aerialDy) * aerialNormal);
      }
      geologicalNormal = normalize(mix(geologicalNormal, mountainViewNormal, mountainCliff));
      if (surfaceDetail > 0.001) {
        vec3 mountainDetail = surfaceNormalTexture(normalMap, vSurfacePosition,
          mountainWeights, 0.10, mountainViewNormal, normalScale * 0.20);
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
  material.customProgramCacheKey = () => 'above-painted-mountain-v6';
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
    meadowMacro: ['generated/botanical-painted-color.webp', true],
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
    map: maps.meadowMacro, normalMap: maps.grassNormal, normalScale: new THREE.Vector2(.65, .65),
    roughnessMap: maps.soilRoughness, roughness: 1, metalness: 0,
  });
  terrainSurface(terrain, maps, forestUniforms, detailUniforms);

  const rock = new THREE.MeshStandardMaterial({
    name: 'Fractured launch granite', color: 0xc9cac3,
    map: maps.graniteMacro, normalMap: maps.rockNormal, normalScale: new THREE.Vector2(.72, .72),
    roughnessMap: maps.rockRoughness, roughness: 1, metalness: 0,
  });
  localCliffSurface(rock, maps, forestUniforms, detailUniforms);
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
