# Cloud shaders: inspected implementations and integration decision

Checked 8 November 2026 against the actual Three r180/WebGL2 renderer. This review
inspected source, package contracts and licenses; project screenshots and author
benchmarks are not measurements of this game.

## Strongest fit: Takram three-clouds

[@takram/three-clouds](https://github.com/takram-design-engineering/three-geospatial/tree/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds)
is the strongest production-oriented **WebGL2** implementation examined. At this
revision it is GLSL, not WebGPU: the cloud package's own README explicitly lists
WebGPU as planned. This corrects the overly broad compatibility statement in the
older lighting-rebuild note. Other packages in the monorepo have WebGPU code;
that does not establish WebGPU support for this cloud renderer.

The pinned package is 0.7.6, with atmosphere 0.19.1 and geospatial 0.9.1. Its
declared Three peer range starts at r170, so this game's r180 satisfies it.
The selected postprocessing 6.38.3 supports Three >=r157 and <r184. React and R3F
are optional. Both Node construction and an actual WebGL browser capture using
the game's existing Three module succeeded in the isolated integration study.

The useful parts are specific:

- [Density construction](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/src/shaders/clouds.glsl)
  separates coverage, height profiles, Perlin–Worley body and smaller erosion.
  Bottom turbulence and height-dependent erosion make a cloud's lower wisps
  different from its rounded top. Those functions also supply shadow rendering.
- [Lighting and ray integration](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/src/shaders/clouds.frag)
  combine Beer attenuation, a dual-lobe phase function, an approximate series of
  scattering orders, sky irradiance, ground bounce and a powder response. This
  offers a stronger volume model than lighting a smooth density-gradient normal.
- [Beer shadow map](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/src/shaders/shadow.frag)
  stores front depth, mean extinction and bounded total optical depth in sun
  cascades. Secondary light rays refine local detail; every occupied camera
  sample need not march all the way to the cloud boundary.
- [Temporal resolve](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/src/shaders/cloudsResolve.frag)
  uses reprojected depth/velocity, variance clipping and a 4×4 Bayer update pattern
  when temporal upscaling is enabled. It also supports ordinary temporal AA.
  Ghosting/disocclusion and mean-cloud-depth atmosphere errors are explicitly
  documented limitations, particularly through sparse overlapping clouds.
- [Quality presets](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/src/qualityPresets.ts)
  reduce detail erosion, secondary rays, shadow precision and light shafts.
  Its default high bound is 500 camera iterations, so importing the library
  does not by itself make a 48-step custom pass cheaper.

The source's published device FPS table is useful context for the importance of
temporal upscaling. It uses another scene, software revision and hardware, so none
of those numbers are claimed for this game.

## Integration chosen

The game retains its current renderer, contact AO and single final tone map.
`CloudsEffect` can run directly through `initialize`, `setSize`, `setDepthTexture`
and `update`; a React tree or full EffectComposer migration is unnecessary.
The returned `atmosphereOverlay.map` contains premultiplied RGB and **opacity**,
whereas the old local cloud buffer used transmittance. The background composite is
`sky * (1 - cloud.a) + cloud.rgb`, in scene-linear light.

The provider uses a far-depth sample for its background rays, then ordinary scene
geometry occludes that background. This fits a flight corridor below the cloud
layer. It is not sufficient for flying into clouds or correct foreground cloud
overlap: that would require actual scene depth and compositing after geometry.

A local frame maps metre coordinates onto the atmosphere's 6,360 km sphere.
Altitude correction is disabled because the scene is intentionally local and
spherical; this avoids an accidental WGS84 ellipsoid height offset. The same
Bruneton LUTs drive the sky, cloud lighting, GPU-generated environment radiance
and direct-sun colour. Their shared radiance scale is applied before tone mapping.
The material shadow hook reads the actual Takram BSM; leaving the old ellipsoid
cloud shadow field active would create two disagreeing skies.

`range/advanced-clouds.js` is the adapter; [local provenance and rebuild commands](../../range/assets/clouds/README.md)
cover the bundle, tables, cloud textures and original jitter. The module shares
the game's existing Three instance, rather than bundling a second copy. Browser
studies check actual shader compilation and history convergence before accepting
the provider in the complete scene.

## Browser study and adapter corrections

The isolated study used the actual vendored r180 module, local assets, a 960×600
viewport and 32 cloud-only warmup frames. The final shader run produced no browser
errors and a finite, nonzero sky-radiance readback. Ordinary temporal AA at a
bounded 640×400 primary resolution gave cleaner cloud contours than the original
240×150 primary pass reconstructed into 960×600 with 4×4 temporal upscaling.
The selected bounds are 640×400 high, 480×300 medium and 320×200 low, with
240/160/100 camera iterations and two 256/128/64 shadow cascades respectively.
These are explicit quality/cost limits, not a frame-rate guarantee.

A visible rectangular cloud-shape artifact was traced to numerical cancellation
in the upstream cube-sphere weather projection near the local +Y face center.
Increasing render resolution did not cure it. The adapter replaces
`A - sqrt(A*A - 6*x*x)` with its algebraically equivalent rationalized form
`6*x*x / (A + sqrt(A*A - 6*x*x))`, folding the signed square root into `x`.
The same correction is applied to camera-density and shadow-density shaders;
rounded silhouettes returned in the next actual browser capture. This is a local
numerical adaptation of the pinned source, not a change to its weather model.

The shared sky remains raw scene-linear in offscreen targets. Its direct-sun
colour already includes the same radiance scale as the clouds and sky probe, so
multiplying it by the former sun intensity would overlight the scene. A planar
reflection helper renders this same clear-sky model with the reflected camera's
orientation and a nonnegative virtual observer altitude; it does not reproject
the main camera's temporal cloud texture into the reflection.

Asset initialization waits for all sibling requests before releasing resources
on failure. Tests cover this late-completion case, exact-once GPU-owner disposal,
local asset checksums and bounded quality settings. The final isolated high
capture took roughly 1.8 seconds per synchronized software-rendered frame when a
pixel readback forced completion. That is evidence of SwiftShader cost, not a
native-GPU measurement or a claim that this quality runs interactively there.

## Integrated foreground lighting check

The first complete-scene capture had readable clouds but an almost black valley.
A frozen-camera diagnostic disabled only cloud shadow visibility; terrain,
foliage and timber immediately became readable. Actual GPU samples of the BSM at
four foreground points were only 0.000003–0.000028 direct-beam visibility with the
initial weather offset. The adapter now authors a clear opening over the playable
valley with weather offset `(0.34, 0.17)`, which measured 0.988–1.0 at those same
points. Density, visible clouds and ground shadows still share that one field.
Cloud shadows are retained and continue across the surrounding landscape.

The measured upward clear-sky irradiance was `[0.186, 0.275, 0.530]`, compared with
`[0.701, 0.994, 1.260]` from the previous analytic model. Its orientation and
normalization were correct; contact AO was not the cause of the darkness. The
illustrated art direction now applies a documented **3× diffuse skylight gain**
to the light probe so shaded timber and foliage remain readable. This is an
artistic approximation of fill/cloud bounce, not full cloud-to-ground multiple
scattering. Visible sky, solar energy, specular environment and final exposure
retain their shared original radiance scale.

## Other implementations considered

| Source | Useful evidence | Decision for this game |
| --- | --- | --- |
| [Official Three Sky.js, 9c4515e](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/jsm/objects/Sky.js) | MIT. Current dev source has evolving 2D fBm clouds, independent coverage/density, Beer/powder-inspired shading and sky-derived illumination. Its cloud coordinate is a projected direction, with no world-space 3D medium or shared ground shadows. | Credible inexpensive fallback/reference, not the best volume solution. It is newer dev source, not already included in this game's r180. |
| [Official Three volume-cloud example, same revision](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/webgl_volume_cloud.html) | MIT. Small 3D texture example with ray/AABB intersection, jitter and early opacity termination. Lighting is a density-difference illustration rather than a full atmospheric light transport stack. | Useful learning baseline, weaker than the existing world-space system for production. |
| [FarazzShaikh three-volumetric-clouds, 954793ae](https://github.com/FarazzShaikh/three-volumetric-clouds/tree/954793aebc9420ef3d95c853f458b8b63102c4e9) | Explicitly experimental, archived, no license found in the inspected tree/API. Inspired by Guerrilla's Nubis: envelopes, Perlin–Worley erosion and adaptive sampling. Source has incomplete resize and renderer restoration paths. | Inspect ideas only; not a sound dependency or source to copy into this game. |
| [Drei Cloud, bf6f4add](https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/src/core/Cloud.tsx) | MIT source. Sorted instanced camera-facing planes with alpha texture and optional Lambert material; per-frame transform/opacity updates. | Useful for stylized local wisps, but volume self-shadowing, view consistency and alpha overdraw limit it as the principal sky. |

## Remaining work to judge on actual hardware

Temporal convergence must be checked during banking, camera cuts, resizing and
quality changes, not only in a static still. Cloud layers should retain large
connected masses and blue gaps; excessive small-scale erosion both fragments the
composition and wastes empty ray steps. A convincing golden hour also needs
sun-height-dependent colour, brighter forward-scattering rims and cooler ambient
bases to agree with terrain and foliage lighting. A warmer final grade cannot
substitute for those relationships.

Native GPU profiling remains required. The isolated prototype's JavaScript submit
times are not GPU frame times, and the complete game adds terrain, vegetation,
shadows and finishing work. The cloud environment's SwiftShader samples cannot
establish commercial-game performance parity.
