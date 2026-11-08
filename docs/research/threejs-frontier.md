# The strongest Three.js references for this scene

Source inspection refreshed **8 November 2026**. This narrows the earlier
[twenty-project research board](threejs-2026.md) to four references that solve
different parts of this game's problem. It is a reasoned shortlist, not an
objective worldwide ranking. Remote applications were not benchmarked here.

**Use Takram as the atmosphere/cloud engineering target and Bruno Simon as the
cohesive-world art-direction target.** Nanite Forest establishes a useful aerial
vegetation and measured-work target. Current official Three.js examples establish
the supported WebGPU/TSL integration path, but their cloud appearance alone is
not a reason to replace our volumetric renderer.

| Reference | Why it belongs | What to transfer to hgsim | Integration boundary |
| --- | --- | --- | --- |
| [Takram Three Geospatial](https://takram-design-engineering.github.io/three-geospatial/) | The most complete inspected Three.js atmosphere/cloud system: precomputed scattering, aerial perspective, cloud optical depth, shadows and temporal reconstruction. | Shared solar/sky state; distinct large-scale coverage and eroded 3D density; coherent cloud and surface lighting; deliberate reconstruction. | Its cloud package is GLSL/WebGL2 at the inspected commit. It is not a single shader to paste over our sky. Atmosphere, composer, coordinate frame and precomputed resources must be integrated. |
| [Bruno Simon — Folio 2025](https://bruno-simon.com/) | A polished playable world in which weather, light, fog, vegetation, sound and authored places share a visual language. | A small number of authored environmental conditions, controlled transitions, intentional shadow/fog palettes and detail budgets. | Three r187, WebGPURenderer and TSL. Its compact stylized vehicle world is a composition reference, not an open-flight performance promise. |
| [Nanite Forest](https://victorzakharov.github.io/threejs-nanites/) | Dense coherent canopy from the ground to high aerial views, with LOD, lit impostors, temporal reconstruction and unusually explicit profiling. | Judge forest mass at flight height; match geometry/impostor lighting; use altitude-dependent work and measured LOD thresholds. | WebGPU/r186 is its principal path; the WebGL2 fallback omits major systems. Its clouds are cheap layered sheets, not the cloud-quality target. |
| [Official Three.js WebGPU examples](https://threejs.org/examples/?q=webgpu) | Maintained implementations of node materials, volumetric lighting and temporal reprojection with explicit depth/velocity inputs. | Use their contracts if migrating: motion vectors, camera jitter, history reset, linear render targets and a single output transform. | Current node-based APIs cannot simply be inserted into hgsim's r180 WebGLRenderer/GLSL material hooks. |

## Takram: the primary atmosphere target

Pinned revision: [`b012ad06d858fc035d88aacfd73f092f93c994e4`](https://github.com/takram-design-engineering/three-geospatial/tree/b012ad06d858fc035d88aacfd73f092f93c994e4),
27 May 2026. Inspected [cloud documentation](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/README.md),
[cloud dependencies](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/package.json)
and [atmosphere documentation](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/atmosphere/README.md).
The code is [MIT](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/LICENSE);
map imagery and other content have separate rights.

The atmosphere implements Bruneton's precomputed scattering. Its distinction
between post-process illumination and conventional Three.js light sources matters:
our already-lit `MeshStandardMaterial` output must not be treated as unlit albedo
and illuminated again. For hgsim, the conventional light-source path and aerial
perspective are the relevant integration model.

The cloud package's checked README explicitly says its GLSL implementation does
not support WebGPU yet. The atmosphere has a separate WebGPU document; this does
not imply cloud WebGPU parity. React examples are convenience bindings, not a
requirement to rewrite the game in React.

The useful target is its complete treatment of light, medium and reconstruction.
Adding high-frequency noise to our present ellipsoids would improve surface
texture but would not supply coherent solar energy, multiple scattering, stable
low-resolution reconstruction or proper geometry/volume compositing.

## Bruno Simon: the strongest composition and condition reference

Pinned revision: [`70764a94756cc4de564e493c8ba46c4b5fe03ed1`](https://github.com/brunosimon/folio-2025/tree/70764a94756cc4de564e493c8ba46c4b5fe03ed1),
4 November 2026. Inspected [Rendering.js](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Rendering.js),
[Weather.js](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Weather.js),
[Ligthing.js](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Ligthing.js),
[Fog.js](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Fog.js)
and [package.json](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/package.json).
The unusual `Ligthing.js` spelling is the actual source filename.

The renderer uses `WebGPURenderer`, a node render pipeline and quality-specific
bloom/DOF choices. Weather exposes temperature, humidity, clouds, wind, rain and
snow as related properties rather than disconnected switches. Day-cycle values
feed lighting and fog; weather overrides have controlled transitions. Its fog is
deliberately artistic, including a screen-space color gradient, rather than a
general physical atmosphere solver.

Its creator preview was inspected as an attributed reference. Large simple shapes,
consistent warm/cool relationships, dense foliage masses and carefully placed
emissive accents make the whole image work. None of those depends on photorealistic
asset counts. For our alpine concept, implement a restrained warm afternoon state,
a clearer high-sun state and a cooler diffuse state with matched cloud/terrain
lighting before adding a continuous day/night cycle.

The repository's [license.md](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/license.md)
is MIT; package metadata says ISC. Retain the actual license and check separately
credited music and assets before copying content. No content is copied here.

## Nanite Forest: strong aerial vegetation, deliberately inexpensive clouds

Pinned revision: [`cde2f4d4bb3414553b9e39fd317186c97b3154ad`](https://github.com/VictorZakharov/threejs-nanites/tree/cde2f4d4bb3414553b9e39fd317186c97b3154ad),
7 November 2026. Inspected [README and profiling tables](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/README.md),
[package.json](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/package.json)
and [clouds.ts](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/src/clouds.ts).
Creator-published ground and canopy captures were inspected; they are references,
not our own benchmark captures.

The stated million trees and 1.5 million bushes are logical populations, not
full-detail meshes submitted each frame. The author reports a 7.04 ms canopy-view
GPU median on an RTX 4070 Ti at 1920×1080 High over 40 frames, with temporal AA,
shadows and clouds. This is a measured reference from that project, not a result
for hgsim. Its profiling also shows that occlusion culling can cost more than it
saves from above, so it is disabled above 150 m.

Its cloud source expressly uses three stacked 2D FBM sheets with transparent
`MeshBasicNodeMaterial`. They follow the camera while world-space noise stays
anchored, with separate top/underside color and curved-planet placement. They have
no ray marching. The reported very low cloud cost must not be quoted as evidence
that equally cheap detailed volumetric clouds are available.

The [code is MIT](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/LICENSE).
Stanford's Lucy asset is separately noncommercial, and tree textures retain their
own credits. Its best contribution here is the combination of coherent canopy,
lit impostors and explicit altitude-dependent budgets.

## Official Three.js: useful contracts, not automatic visual quality

Pinned development revision: [`9c4515e66f479864e39b72f29e10260821576b4a`](https://github.com/mrdoob/three.js/tree/9c4515e66f479864e39b72f29e10260821576b4a),
8 November 2026. This is a development snapshot, not a claim that every feature
is present in hgsim's vendored release. Code is [MIT](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/LICENSE).

- [SkyMesh](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/jsm/objects/SkyMesh.js)
  provides a Preetham-style analytical sky and evolving noise projected onto a
  cloud plane. Beer/powder-style shading, sun occlusion and a silver-edge term
  improve that plane's appearance. It is a plausible inexpensive sky fallback,
  not a three-dimensional cumulus solution for flying through clouds.
- [TRAA example](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/webgpu_postprocessing_traa.html)
  and [TRAANode](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/jsm/tsl/display/TRAANode.js)
  use scene depth and velocity, camera jitter, history buffers and invalidation.
  Our wind-deformed foliage and moving glider need valid motion/history handling;
  merely blending old cloud frames would smear banking motion and silhouettes.
- [Volumetric lighting with TRAA](https://github.com/mrdoob/three.js/blob/9c4515e66f479864e39b72f29e10260821576b4a/examples/webgpu_volume_lighting_traa.html)
  pairs low-step volume integration with temporal dithering and reprojection.
  It is a bounded smoke/lighting technique demonstration, not a complete outdoor
  cloud/weather system or evidence of its frame rate in our scene.

## Recommended order for this game

1. Fix the present shared-lighting contract: solar strength and transmittance,
   sky radiance, cloud lighting, surface key and indirect illumination must agree.
2. Improve cloud structure and integration together: broad authored coverage,
   continuous 3D billows, filtered erosion and optical depth. Compare front-lit,
   side-lit and backlit views, not only one flattering sun direction.
3. Preserve a readable warm alpine art direction. Use deliberate environmental
   states and consistent ground/sky relationships, borrowing Bruno's coordination
   rather than copying a different visual style.
4. Add temporal reconstruction only with wind-aware reprojection, history
   rejection and motion captures. Profile cloud GPU work separately from foliage.
5. Treat a WebGPU/TSL migration as an independently tested renderer project. It
   enables modern official components but does not itself improve our assets,
   lighting choices or frame time.

This shortlist intentionally excludes path-traced stills, photographed splats and
unverified gallery entries as direct proof of moving-game quality. Those may be
useful appearance references, but the winning combination for this task is a
complete atmosphere system, disciplined environmental art direction, stable
moving imagery and measured rendering budgets.
