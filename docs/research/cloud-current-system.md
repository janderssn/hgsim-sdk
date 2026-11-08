# Baseline cloud and atmosphere audit

Inspected at `df1a34e06020856ebcf953bfdbf9c242dd70ef99` on 8 November 2026.
This records the baseline before the advanced cloud integration, not the current
default renderer. Source links are pinned to that revision. It is a source audit
and a set of recommended experiments, not a GPU benchmark.

## What the baseline game renders

The active sky is `createAerialAtmosphere`, created in
[`main.js:77`](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/main.js#L77). The older painted sky in `atmosphere.js`
is disabled with `sky: false`; that module supplies the mountain terrain. There
is no reason to tune its old `cloudTexture()` to improve current screenshots.

The active pipeline has several useful foundations:

- A deterministic, world-anchored 3D medium supplies both visible clouds and
  the ground shadow bake. Camera motion does not move the field; one wind offset
  moves both ([cloud-field.js:128](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/cloud-field.js#L128),
  [aerial-atmosphere.js:387](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L387)).
- The analytic clear sky supplies both the visible background and the diffuse
  SH probe/specular PMREM. The sun disk is excluded from IBL, avoiding an
  additional unshadowed solar contribution
  ([lighting.js:140](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/lighting.js#L140)).
- Cloud radiance and transmittance are integrated in linear light before
  ordinary geometry occludes the background. A shared HDR finish applies the
  final tone map and grade ([main.js:612](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/main.js#L612),
  [render-finish.js:192](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/render-finish.js#L192)).
- Material hooks preserve earlier patches and apply aerial extinction per
  vertex, saving repeated atmospheric calculations on overlapping foliage
  fragments ([aerial-atmosphere.js:347](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L347)).

## Limits that explain the remaining appearance

| Area | Evidence | Consequence |
| --- | --- | --- |
| Density shape | Eleven fixed banks; each is the maximum union of ellipsoids with a narrow radial falloff. No internal turbulence or erosion, and the entire field translates rigidly. [cloud-field.js:31](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/cloud-field.js#L31) | Good rounded silhouettes, but smooth sculpted masses rather than turbulent cumulus. More ellipsoids alone eventually repeats the same smooth look. |
| Spatial detail | A 256×32×256 volume covers 12.8 km horizontally and 1.1 km vertically: 50 m × 34.4 m × 50 m voxels. Trilinear filtering, no mip chain. [cloud-field.js:34](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/cloud-field.js#L34), [aerial-atmosphere.js:178](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L178) | Small shoulders have few samples across them. Fine wisps cannot come from this volume alone; increasing the whole grid is an expensive way to add them. |
| Cloud lighting | Three forward light samples at cumulative distances 150, 520 and 1,110 m in high quality; two in medium, a total-column approximation in low. Normal-facing/rim terms and a height-based ambient palette supply much of the modelling. [aerial-atmosphere.js:245](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L245) | This is an art-directed volume-lighting approximation. Thin edge occluders and long low-sun paths are undersampled. Gradient-normal lighting contributes to the solid/rounded appearance. |
| Primary sampling | Fixed midpoint sampling and a 1.35× empty stride; no occupancy hierarchy, jitter, temporal history or reprojection. [aerial-atmosphere.js:264](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L264) | Primary steps grow as the view approaches the horizon. Small features can be skipped; plain spatial filtering softens the result. Still screenshots cannot establish stability during flight. |
| Reconstruction | The low-resolution cloud texture is linearly sampled directly into the sky. No depth/normal-aware reconstruction or temporal confidence. [aerial-atmosphere.js:318](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L318) | The bounded pass remains soft. Adding more density noise without improving sampling can increase shimmer rather than useful detail. |
| Cloud/land integration | Clouds are a background-only sky texture. The pass has no scene depth and rejects downward rays. [aerial-atmosphere.js:260](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L260) | Current low-altitude flight can use ordinary opaque geometry to hide sky clouds. Flying through clouds, looking down on them, or placing a cloud in front of a mountain would require depth-aware volume compositing. |
| Atmospheric shafts | Aerial inscatter uses the analytic sky and path transmittance, without cloud visibility samples along the camera-to-surface path. [aerial-atmosphere.js:122](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L122) | Ground cloud shadows exist; volumetric sun shafts through cloud gaps do not. Bloom cannot substitute for this effect. |
| Cloud-aware ambient light | SH/PMREM are generated from the clear sky once. Visible cloud coverage never enters that bake. Cloud ambient uses only the zenith sky plus authored base/top colors. [lighting.js:141](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/lighting.js#L141), [aerial-atmosphere.js:275](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L275) | Broken-cloud conditions remain plausible as an approximation. Dense overcast would need different diffuse lighting and environment reflections, not only weaker direct sunlight. |

The 32 km cloud-ray cap also creates a concrete horizon limit. At a 250 m camera
height, a ray below **3.67° elevation** never reaches the 2,300 m cloud base
within that distance. This occurs before the explicit `direction.y < .008`
cutoff. At 30°, 10° and 5° view elevation, the high-quality 48-step interval is
approximately **46 m, 132 m and 263 m** respectively, before empty strides and
distance clipping. These values follow directly from the layer thickness and
shader arithmetic; they are not measured rendering times.

## What lighting studies can and cannot change safely

Fresh-start studies can change `ALPINE_ART.sunDirection`, `sunColor`, `sunIntensity`,
`exposure` and `skyStyle`. A reload then builds the clear sky, SH/PMREM, cloud
shadow map and static forest shadows using the selected direction. Keeping the
camera, materials, grade and simulation time fixed makes directional-lighting
comparisons useful.

That does **not** yet form a physically coherent weather control:

1. `sunIntensity` drives only the Three.js directional light
   ([main.js:97](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/main.js#L97)). It does not scale sky or cloud solar
   radiance. Reducing it to imitate overcast leaves the sky/cloud light source
   unchanged.
2. The analytic sky attenuates the sun with `solarTransmittance`, but the cloud
   sunlight term uses the authored solar color directly. The terrain's
   directional light does too
   ([aerial-atmosphere.js:41](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L41),
   [aerial-atmosphere.js:290](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/aerial-atmosphere.js#L290)). Direction
   and palette are shared; energy and atmospheric reference height are not yet
   one calibrated contract. Strong manually warmed RGB plus low-sun attenuation
   may also warm the sky more than the surfaces.
3. The hemisphere fill remains hardcoded at intensity `.14`
   ([main.js:69](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/main.js#L69)); it does not follow a weather preset.
4. Rayleigh/Mie coefficients, scale heights, cloud extinction, bank coverage and
   altitude are constants. `skyStyle` selects two authored palettes; exposure
   and grading cannot create a genuinely different aerosol/cloud distribution.
5. Below **4.59°** solar elevation, cloud-shadow projection clamps `sun.y` at
   `.08`. Forest shadows clamp it at `.25` (**14.48°**) and cap shadow length at
   35 m ([cloud-field.js:135](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/cloud-field.js#L135),
   [forest-shadows.js:11](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/range/forest-shadows.js#L11)). The latter is
   already relevant to a low golden-hour study.
6. Twilight is unsupported: solar transmittance clamps the solar elevation,
   higher-order/ground fill stays positive, and there is no planetary night-side
   shadow, ozone treatment or night illumination. A blue-hour screenshot made
   only by grading would be an art study, not a validated atmospheric model.

Live editing only the sun direction/color is unsafe for comparisons: the cloud
shadow bake, clear-sky SH/PMREM and forest shadow map would remain from the old
condition. Reload for the present study; a future weather controller must update
all derived data together.

## Cost and verification boundaries

The density/normal volume is **8 MiB**, retained both as CPU texture data and a GPU
upload; the cloud shadow map is 16 KiB at 128². The half-float cloud target is at
most roughly 1.76 MiB. Its configured texture size does not include driver overhead.

| Preset | Maximum cloud target | Primary ray-step ceiling | Light steps per occupied sample |
| --- | --- | ---: | ---: |
| High | 640×360 | 11,059,200 | 3 |
| Medium | 480×270 | 4,147,200 | 2 |
| Low | 256×144 | 589,824 | 0; a 2D shadow lookup instead |

Each tested occupied point also reads its gradient normal. Empty rays, the
opacity early exit, smaller viewports and enlarged empty strides reduce actual
work. These bounds say nothing about GPU milliseconds. The existing five-frame
[SwiftShader sample](../graphics/alpine-polish/benchmark.json) measured the whole
game, including vegetation and finishing; it cannot identify clouds as the
bottleneck or predict native GPU performance.

Existing tests verify CPU density periodicity, a sparse shadow-bake comparison
against numerical integration, height-aware shadow coordinates, shader-hook
composition, resource disposal and target-size limits
([aerial-atmosphere.test.mjs:104](https://github.com/janderssn/hgsim/blob/df1a34e06020856ebcf953bfdbf9c242dd70ef99/tests/aerial-atmosphere.test.mjs#L104)).
They do not compare GPU self-shadowing to a reference, measure temporal stability,
or cover twilight/inside-cloud rendering. Those are meaningful next validations.

## Ranked experiments

1. **Unify lighting state before adding weather presets.** Define one linear
   solar-radiance/intensity convention, reference altitude and atmosphere state;
   derive the directional beam, sky/cloud illumination, SH/PMREM and shadows
   from it. Keep grading separate. Compare fixed-camera clear high sun, late
   afternoon and backlit cumulus first; label low-sun shadow approximations.
2. **Add restrained erosion around the existing 3D bank envelope.** Preserve the
   successful bank silhouettes and connected bases, but use a small tiled
   detail volume and height/type-dependent remapping to disturb shoulders and
   density. Compare flat density, density plus erosion, and lighting-only changes
   separately. Do not return to a vertically extruded 2D coverage mask.
3. **Measure the cloud pass independently.** Use supported GPU timer queries on
   a native device; separate cloud, scene and finishing costs at fixed resolution
   and quality. Render clouds disabled/enabled without changing the camera or
   adaptive-quality state. Investigate shape/light sample costs before raising
   the fixed budgets or importing a larger renderer.
4. **Improve self-shadowing and reconstruction as a pair.** Test a short cone
   sampling pattern or coarse light cache, then stable sample jitter with temporal
   reprojection and neighborhood rejection. Evaluate moving-camera silhouettes,
   disocclusion and cloud/terrain edges, not only still-image sharpness. A simpler
   non-temporal refinement is preferable if motion vectors/history are too costly.
5. **Add cloud-aware ambient lighting for overcast.** Coarse directional cloud
   transmittance can modify the sky radiance used for the light probe. Update it
   slowly with weather, independently from per-frame volume detail. Ensure the
   same condition changes cloud coverage, beam visibility, diffuse fill and
   aerial contrast.
6. **Treat cloud flight and shafts as distinct later features.** Both require
   scene-depth-aware integration; neither follows automatically from more cloud
   noise or stronger bloom. Extend the ray intersection and compositing contract
   before lowering the cloud deck into the playable corridor.
