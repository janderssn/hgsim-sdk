# Atmospheric lighting study

Source inspection: 8 November 2026. This is a research and experiment guide for
the current alpine scene, not a claim that its renderer is physically calibrated.
No third-party code or assets were copied into the game during this study.

The implementation comparisons below describe the pre-integration baseline.
The resulting [cloud integration](cloud-shader-options.md) and
[living valley](../living-valley.md) now share Takram sky/sun radiance, retain an
explicit artistic diffuse fill, and expose three daylight conditions. The
condition table remains a guide; overcast and twilight have not been implemented.

## Recommended direction

Use **broken cumulus in clear late-afternoon air, with a camera-side sun around
18–28 degrees above the horizon**, as the main art direction. It preserves the
concept's golden foliage, readable timber and rock, cool open shadows and distant
blue mountain layers. Reserve low backlight for an alternate mood: it creates
beautiful sail transmission and cloud rims, but hides the cabin and pilot-facing
surfaces. A large orange colour grade cannot recover those unlit forms.

The next architectural gain is a shared lighting state that controls surface sun,
sky radiance, cloud illumination and diffuse environment energy together. The
current system shares direction and tint, but its energy and weather responses
are only partly connected.

## What different conditions require

| Condition | Sun and atmosphere | Cloud and ambient behaviour | What it does to this scene |
| --- | --- | --- | --- |
| Clear high sun | Roughly 50–70° elevation; shorter optical path and comparatively neutral direct light. Aerosol loading is a separate choice, not a synonym for time of day. | Small bright cumulus or clear sky; blue diffuse sky lights the shadows. | Clear material colours and compact shadows; weaker long-form relief and less golden atmosphere. A useful neutral reference. |
| Warm late afternoon | Roughly 18–30°; a longer path attenuates blue sunlight more strongly. Keep moderate aerosol density so distant ridges retain shape. | Separated cumulus banks, lit warm on exposed faces; cool diffuse fill under the clouds. | Best balance of readable props, glider colour, vegetation texture and layered terrain. Recommended main setting. |
| Low golden sun | Roughly 8–15°; long paths, warm direct light and a stronger near-sun glow. Distant terrain contrast depends on aerosol density and view direction. | Long cloud/terrain shadows; cloud face colour and shadow direction must follow the same sun. | Strong grass and rock relief. Too low an angle can obscure the landing target and exceed the useful reach of the current local shadow map. |
| Backlit broken cumulus | The sun is close to the viewing direction. Forward scattering and optically thin cloud boundaries become important. | Bright rims surround darker cloud masses; the shadowed foreground still needs diffuse sky illumination. | Excellent orange sail transmission and silhouettes, but cabin detail and pilot readability decrease. This is an intentional composition tradeoff. |
| Overcast | A thick cloud layer suppresses the direct solar beam. The remaining light is broad and diffuse; it can still be bright. | Clouds replace much of the blue sky as the illumination source. Diffuse irradiance, reflection probes and direct visibility must all change. | Softer ground contrast and muted separation; useful for a quieter alpine mood. Simply lowering the directional light beneath the existing blue sky is not overcast. |
| Twilight | Sun below the horizon; planet occlusion, long atmospheric paths, multiple scattering and absorption become important. | Low clouds can become dark while higher clouds remain sunlit. The ground loses direct sunlight before the sky becomes dark. | A different scene-lighting regime, not a blue filter. The current renderer does not model this correctly. |

These angle bands are useful study choices, not definitions of a particular
geographic time or calibrated illuminance measurements.

## What the current implementation can and cannot demonstrate

The local shader integrates exponential molecular and aerosol density along the
camera-to-surface segment. Its finite horizon column, separate direct and diffuse
lighting, scene-linear HDR output and shared cloud-shadow medium are useful
foundations. The diffuse SH probe and specular PMREM are generated from the same
clear-sky radiance function as the visible background, with the solar disc omitted
to avoid duplicating the directional light.

Important limits found in the actual source:

- `ALPINE_ART.sunIntensity` reaches the surface `DirectionalLight`, but the sky
  uses separate fixed radiance multipliers and the cloud sun term has no shared
  solar-intensity multiplier. Changing the direct-light intensity does not change
  the energy of the visible sky or sunlit clouds.
- `solarTransmittance()` attenuates the sky and disc, while the surface sun uses
  the manually authored `sunColor`. The cloud direct term also uses that tint
  without the same height-dependent solar transmittance. This permits a pleasing
  look at the authored afternoon angle, but is not a consistent solar transport
  model across different elevations.
- `createSkyLighting()` integrates clear sky only. It does not see cloud
  obscuration or cloud-scattered light. Moving a dense bank above the scene thus
  darkens the direct beam while preserving the clear blue-sky probe.
- Cloud shadow visibility retains 18% of the direct beam at maximum sampled
  occlusion. This is an art choice for broken cumulus; it cannot represent an
  optically thick overcast layer that removes almost all direct sun.
- Aerosol coefficient, scale heights, cloud elevation and extinction are source
  constants. `depthStrength: 3.4` is a distance-dependent artistic compression of
  terrain contrast, rather than a physical aerosol-density setting.
- `solarTransmittance()` clamps the solar vertical component to at least `.025`;
  cloud-shadow projection clamps it to `.08`. The sky has fixed diffuse/ground
  floors. There is no proper below-horizon solar extinction or ozone term, so
  twilight should not be presented as physically reproduced by this code.
- Sun changes need the cloud optical-depth map, forest shadow field, diffuse SH
  and PMREM to agree. Editing only a sun uniform during playback leaves those
  precomputed products stale. Reconstructing the scene for each static study is
  a valid way to avoid that mismatch.

See [art parameters](../../range/art-direction.js),
[atmospheric shader](../../range/aerial-atmosphere.js),
[sky lighting integration](../../range/lighting.js) and
[scene assembly](../../range/main.js).

## Controlled studies with the existing controls

These are **art-directed starting values**, not measured solar spectra or Kelvin
conversions. Colours are linear RGB. Use the same camera, fixed elapsed time,
cloud offset, exposure `.97`, grade and `illustrated-alpine` palette throughout
the first comparison. Keeping those fixed makes the light-direction differences
easier to assess. Rebuild the scene/probes/shadow maps for each case.

| Study | Normalized sun direction | Sun RGB | Surface intensity | Purpose |
| --- | --- | --- | ---: | --- |
| Current warm reference | Normalize `[.70, .48, -.55]` | `[1, .79, .54]` | 3.8 | Retain the accepted approximately 28° afternoon reference. |
| High sun | `[.3932, .8660, -.3089]` | `[1, .97, .91]` | 3.8 | Test shorter, neutral shadows and clear material readability at 60°. |
| Golden side/front light | `[.7691, .2079, -.6043]` | `[1, .68, .40]` | 3.0 | Test low 12° relief and warmer light without changing the grade. |
| Golden backlight | `[.30, .2079, .9309]` (normalize) | `[1, .68, .40]` | 3.0 | Test the near-sun cloud response and translucent sail against the same low-sun palette. |

Intensity is explicitly a surface-light control in these existing-code studies;
it does not solve the energy mismatch described above. A second experiment should
hold colour/intensity fixed and vary only elevation, separating geometric shadow
effects from palette choices. True overcast and twilight belong in the next
renderer experiment rather than being mislabeled variants of these controls.

## Source-checked references

**Eric Bruneton — Precomputed Atmospheric Scattering**, commit
`34f14e745cff948f4ca3157d1b62a445ffa7286f`.
[README](https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/34f14e745cff948f4ca3157d1b62a445ffa7286f/README.md),
[annotated equations and GLSL](https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/34f14e745cff948f4ca3157d1b62a445ffa7286f/atmosphere/functions.glsl),
[BSD-3-Clause license](https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/34f14e745cff948f4ca3157d1b62a445ffa7286f/LICENSE).
The inspected implementation includes spectral extinction from molecular,
aerosol and absorption profiles; finite solar-disc visibility at the horizon;
higher-order scattering; ground-reflected irradiance; sky-to-point radiance; and
separate sun/sky irradiance queries. These are the relevant building blocks for
coherent sunset, terrain haze and surface lighting. Its precomputation and planet
coordinates are a larger integration than a replacement sky dome.

**Sébastien Hillaire — A Scalable and Production Ready Sky and Atmosphere
Rendering Technique**, companion repository commit
`183ead5bdacc701b3b626347a680a2f3cd3d4fbd`.
[README and paper context](https://github.com/sebh/UnrealEngineSkyAtmosphere/blob/183ead5bdacc701b3b626347a680a2f3cd3d4fbd/README.md),
[LUT integration shader](https://github.com/sebh/UnrealEngineSkyAtmosphere/blob/183ead5bdacc701b3b626347a680a2f3cd3d4fbd/Resources/RenderSkyRayMarching.hlsl),
[shared medium and lookup code](https://github.com/sebh/UnrealEngineSkyAtmosphere/blob/183ead5bdacc701b3b626347a680a2f3cd3d4fbd/Resources/RenderSkyCommon.hlsl).
The code exposes transmittance, multiple-scattering, sky-view and camera-volume
lookups, with solar/planet occlusion and absorption. It is a useful architecture
reference for changing time of day and aerial perspective without putting long
integrals into every terrain fragment. This is a Windows/DX11 HLSL research
implementation, not a Three.js package. The inspected shader headers say
“Copyright Epic Games, Inc. All Rights Reserved”; the README permits viewing and
discusses the release, but the inspected repository has no conventional root
license. Use the published technique as a reference; do not assume its source is
MIT-licensed or directly copyable.

**Three.js Sky**, commit `9c4515e66f479864e39b72f29e10260821576b4a`.
[Sky.js](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/jsm/objects/Sky.js),
[MIT license](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/LICENSE).
The inspected revision exposes turbidity, Rayleigh and Mie controls, solar
position, plus cloud coverage/density controls. Its clouds are projected procedural
noise rather than a traversable 3D medium. It is useful for a cheap sky-only
baseline and for separating coverage from density, but it does not supply the
current game's shared volumetric density and world-space cloud shadows.

**Takram Three Geospatial**, commit
`b012ad06d858fc035d88aacfd73f092f93c994e4`.
[WebGL atmosphere documentation](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/atmosphere/README.md),
[atmosphere parameters](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/atmosphere/src/AtmosphereParameters.ts),
[solar transmittance query](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/atmosphere/src/getSunLightColor.ts),
[separate WebGPU documentation](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/atmosphere/WEBGPU.md).
Its WebGL light-source mode supports built-in Three.js materials/shadows using
`SunDirectionalLight` and `SkyLightProbe`; its alternative post-process lighting
expects unlit albedo and supports Lambertian shading. Enabling both on an already
lit buffer duplicates lighting. The WebGL documentation describes a fixed ECEF
frame and no volumetric light shafts. The separate WebGPU path is explicitly a
work in progress, uses a different architecture, and requires Three >= r182;
the game currently vendors r180. The WebGL README's old “WebGPU not supported”
line must not be generalized to the separately documented WebGPU implementation.
The project is MIT except where indicated; its Bruneton-derived GLSL retains
BSD-3-Clause notices. Both must be respected if code is adopted.

## Implementation priority after the study

1. Introduce one `LightingState` with solar direction, spectral/linear solar
   energy, molecular/aerosol parameters, cloud optical state and an explicit art
   palette. Separate physical extinction from the illustrated distance grade.
2. Make direct surface light, cloud light and sky use consistent solar
   transmittance. Keep the solar disc out of diffuse/environment energy when the
   directional light supplies it.
3. Make cloud cover change diffuse irradiance and reflections, not just the
   directional shadow. Define overcast as a weather/illumination state.
4. Rebuild or amortize all dependent probes/shadow products when weather or sun
   changes. Add below-horizon visibility and absorption before offering twilight.
5. Evaluate a Bruneton/Takram WebGL prototype against the current renderer using
   identical framing, exposure and material albedos. Compare moving-camera and
   moving-sun stability, not only attractive stills. Profile on a native GPU;
   the existing SwiftShader sample cannot choose the production architecture.
