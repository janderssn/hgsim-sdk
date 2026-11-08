# Terrain materials: removing repetition without losing the landscape

Source review: 8 November 2026. This is implementation research for hgsim's Three.js r180 WebGL2 renderer, not a GPU benchmark or a claim that every technique below has shipped in the game. The current material work is in `range/surface-materials.js`.

The best immediate fit is **three offset-only texture samples blended on a triangular lattice**, with the same patches for color, normal and roughness. Use it selectively on close meadow, soil and forest floor; preserve the authored world-scale terrain paint for the aerial view. This removes the repeated source motif while keeping directional rock strata and the existing normal-map frames intact. More texture resolution, broad tint noise or UV warping alone does not remove a recognizable repeating tile.

## Primary sources inspected

All source links below are immutable commits. “Compatible” means the technique can be implemented within the current renderer; it does not mean the whole project is a drop-in dependency.

| Source and exact pin | What its code actually does | Relevance and license |
| --- | --- | --- |
| **[Procedural Terrains](https://github.com/ZyFou/ProceduralTerrains/tree/8349b2c8c8637f355bfe17e01c76807d41994407)** — `8349b2c8c8637f355bfe17e01c76807d41994407` | The texture-array path uses three offset-only patches per projection, cubic normalized triangular weights, explicit gradients, shared PBR transforms, and a footprint-driven detail/macro transition. | Most direct implementation reference: GLSL/WebGL2, project Three 0.185.1. [MIT, copyright 2026 ZyFou](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/LICENSE). Preserve the notice for adapted source. Its [material guide](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/docs/surface-materials.md) describes its separately attributed CC0 texture pack; code licensing does not establish rights for every external asset. |
| **[Bruno Simon's Folio 2025](https://github.com/brunosimon/folio-2025/tree/70764a94756cc4de564e493c8ba46c4b5fe03ed1)** — `70764a94756cc4de564e493c8ba46c4b5fe03ed1` | Authored terrain data selects a tight grass/dirt/water palette. A repeating slab texture is mixed using a terrain channel and lower-frequency noise. | Best art-direction reference here, **not** evidence of stochastic ground PBR. Three `^0.187.0`, WebGPU/TSL: transfer composition and mask design, not renderer code. [license.md is MIT](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/license.md); package metadata says ISC, so retain the source license and separately check third-party assets/music. |
| **[Nanite Forest](https://github.com/VictorZakharov/threejs-nanites/tree/cde2f4d4bb3414553b9e39fd317186c97b3154ad)** — `cde2f4d4bb3414553b9e39fd317186c97b3154ad` | Procedural 5 m forest-floor tiles, species-linked leaf litter, centimeter-scale relief, world-space moss and a separate simplified far-ground shader. | Strong ecological placement and distance-budget reference. Three `^0.186.1`, main WebGPU/TSL path; translate the principles. [MIT code](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/LICENSE). Separately bundled assets have their own terms; the Stanford Lucy model is not a permissive game-asset recommendation. |
| **[Three.js r180](https://github.com/mrdoob/three.js/tree/0af9729d0c143a86a1d725d6e2c3ad83301f3f34)** — `0af9729d0c143a86a1d725d6e2c3ad83301f3f34` | GLSL ES 3 shader compilation and derivative-based tangent-frame construction for normal maps. | Exact renderer-version reference for the integration contract. [MIT](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/LICENSE). No renderer upgrade is required to use `textureGrad`. |
| **[Unity Labs' procedural stochastic texturing](https://github.com/UnityLabs/procedural-stochastic-texturing/tree/a77263f336611c3b7acf021d5942207ee7223602)** — `a77263f336611c3b7acf021d5942207ee7223602` | Original research implementation: Gaussianized textures, three translated samples, variance correction, inverse-histogram lookup and mip-aware prefiltering. | The quality reference for preserving contrast during stochastic blending; HLSL/Unity, not a Three.js package. No repository-wide license file was found at this pin; the preprocessing source contains an LGPL-2.1-or-later eigensolver notice. Treat as research, not permissively licensed code to copy wholesale. |

## The most useful implementation: offset-only triangular blending

Inspect [`SurfaceArrayGLSL.js`](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/src/engine/terrain/surface/SurfaceArrayGLSL.js), specifically `pbrPatch`, `pbrPlane` and `pbrAsset`.

1. Project a stable world position into texture coordinates. Skew those coordinates onto a triangular grid and identify the containing triangle's three vertices.
2. Calculate the barycentric weights. The reference cubes them and renormalizes, reducing the washed-out look of an equal three-image blend.
3. Hash each lattice vertex into an offset. Sample the original unwrapped UV plus that offset using `textureGrad` and the original UV derivatives. The hash is constant for that patch; differentiating the hash or `fract()` boundary would produce incorrect mip selection.
4. Use exactly those offsets and weights for every associated material channel. The reference packs color/height in one texture and normal XY/roughness/AO in another.
5. Normalize the blended normal and retain the terrain's geometric normal as the base frame.

The continuity comes from adjacent triangles sharing their lattice vertices and the disappearing patch having zero weight at the edge. A single randomly transformed texture inside each square does not provide that continuity.

The reference intentionally uses translation rather than rotation. This keeps geological lines oriented and avoids changing normal-map axes. Its legacy atlas code in [`terrainSurfaceTextureGLSL.js`](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/src/engine/terrain/surface/terrainSurfaceTextureGLSL.js) is a different path: `surfRandomizedUV` flips/rotates individual cells, and color, normal and property sampling use different salts. It is **not** the path to use as the model for a continuous, registered PBR blend.

The texture-array implementation is not required for hgsim. A small GLSL patch-description helper can return the same three UVs and weights for ordinary `sampler2D` maps. This fits the existing texture loader, material hooks and shared derivative calculations. Compute the patch description once per projection and reuse it across channels.

## Alternatives and their actual tradeoffs

| Approach | Benefit | Cost or failure mode | Fit here |
| --- | --- | --- | --- |
| Single tile plus large tint/noise | Cheap large-scale color variation | The source's repeated stones, flowers or streaks remain visible; strong tint turns surfaces muddy | Keep as the broad composition layer, not the anti-tiling solution |
| Smooth UV warping | Breaks straight regularity with one source fetch | Large features still repeat, stretched features look artificial, and derivatives must include the warp | Small supplementary distortion only |
| Three translated patches on a triangular lattice | Continuous boundaries, no square grid, fixed three-sample budget, normal axes stay consistent | Plain blending softens contrast; too-sharp weights reveal polygon-shaped patches | Best near-ground starting point |
| Rotated stochastic patches | Breaks orientation repetition more strongly | Requires transformed gradients and normal frames; inappropriate for directional rock strata | Optional later for isotropic soil, only if translation is insufficient |
| Texture bombing with independently placed motifs | Controls isolated leaves, stones or stains individually | A neighborhood search, overlap/priority handling and consistent height/normal composition add cost; simple implementations repeat their cell structure | Better for sparse local ground details than the whole flight landscape |
| Histogram-preserving stochastic texturing | Preserves the source distribution rather than averaging it toward gray | Offline transforms, additional texture/LUT storage and shader fetches; unsuitable source imagery can still expose patch structure | A later asset-pipeline upgrade if ordinary blending visibly loses material identity |
| Whole-world unique baked color | Excellent far composition, no repeated world-scale pattern | Finite texel density cannot supply close detail; must remain registered to terrain ecology and paths | Already valuable in hgsim; combine with close detail |

“Hex tiling” often refers to the visual patch pattern produced by a triangular-lattice blend. It does not imply six texture samples or a particular licensed implementation. Name the actual three-sample algorithm and source when describing this change.

The Unity Labs [`SampleProceduralTexture2DNode.cs`](https://github.com/UnityLabs/procedural-stochastic-texturing/blob/a77263f336611c3b7acf021d5942207ee7223602/Editor/ProceduralTexture2D/SampleProceduralTexture2DNode.cs) confirms three `SampleGrad` source fetches, variance correction by the squared blend weights, then inverse-transform lookups per channel. Its [`ProceduralTexture2DEditor.cs`](https://github.com/UnityLabs/procedural-stochastic-texturing/blob/a77263f336611c3b7acf021d5942207ee7223602/Editor/ProceduralTexture2D/ProceduralTexture2DEditor.cs) performs Gaussianization, color-space decorrelation and LUT prefiltering. Multiplying an ordinary albedo blend by the same variance factor is **not** that full method and can clip colors. The [authors' README](https://github.com/UnityLabs/procedural-stochastic-texturing/blob/a77263f336611c3b7acf021d5942207ee7223602/README.md) links their original paper and technical chapter, and warns that excessive blend sharpness reveals a hexagonal pattern.

## Sampling and normal-map correctness

Three r180's [`WebGLProgram.js`](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/src/renderers/webgl/WebGLProgram.js) emits GLSL ES 3 for built-in materials. Its [`normalmap_pars_fragment`](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl.js) derives a tangent frame from position and UV derivatives. hgsim already has an equivalent frame helper and evaluates shared world/view derivatives before its surface branches; preserve that contract.

- Derivatives must be evaluated before divergent material, axis or distance branches. Use explicit gradients inside those branches; an early fade does not make implicit derivatives valid.
- For translated patches, the source UV derivatives remain unchanged. For a rotated/reflected UV transform `q = R * uv + offset`, both derivative vectors become `R * derivative`.
- A rotated normal-map sample must be expressed in the rotated UV frame. Either build its tangent frame using those transformed derivatives, or transform its XY slope back into the original frame before blending. Do not do both. Reflections require consistent orientation too.
- Decode normal maps as linear data; only color maps use sRGB decoding. Blend color in linear space, normalize vector results, and keep roughness/height/control maps outside color transforms.
- All channels of one physical material must share its patch identity. Unrelated color and normal offsets make a painted stone highlight a different location from the stone's color.
- Use mipmaps and bounded anisotropy for grazing ground views. Sharpening and negative mip bias cannot replace correct filtering and often turn flight movement into shimmer.

[`SurfaceMapPreparation.js`](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/src/engine/terrain/surface/SurfaceMapPreparation.js) is also useful asset-pipeline evidence: it averages albedo mips in linear space, renormalizes normal mip vectors, converts DirectX normal conventions on import, and stores supplied height explicitly. hgsim should preserve map conventions when creating any newly packed derivative assets.

## Blend terrain meaning, then texture detail

The landscape should read as grass around the refuge, worn soil on paths, humus under trees, reeds and damp margins by water, and exposed rock where slope and geology support it. Those are stable world-space material masks, not random per-tile material choices.

Bruno's [`Terrain.js`](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Terrain.js) uses a terrain data texture, a deliberately small color gradient and a grass color. [`World/Floor.js`](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/World/Floor.js) then layers slab texture through terrain coverage and broader noise. Its quality lesson is control over where materials appear and how their colors relate, rather than increasing shader complexity everywhere.

Nanite Forest's [`floor-maps.ts`](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/src/ground/floor-maps.ts) produces 1024-pixel, 5 m tiles containing soil, twigs and pebbles at centimeter scales. [`floor.ts`](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/src/ground/floor.ts) uses local litter coverage and species-dependent leaf layers, with moss formed from world-space noise. These functions do not implement the triangular stochastic method above. Their useful lesson is that nearby surface detail should correspond to nearby vegetation and should disappear coherently at distance.

For hgsim, keep broad pigment and ecology independent of the microtexture transform. An offset that hides a repeating grass tuft must not move a path, forest boundary or wet shoreline. Avoid reintroducing repetitive large-scale forms by simply stretching the same botanical source over a bigger area.

The subsequent image review identified missing mid-distance surface structure after the fine grass texture minified. The selected source is **Aerial Grass Rock by Rob Tuytel, Poly Haven CC0**, visually inspected and retained unchanged as [`aerial-grass/color.jpg`](../../range/assets/materials/aerial-grass/color.jpg): 1024², 210,946 bytes, from PlayCanvas commit `4b305e9b9c2cac2397b65f3ef3915a84a7c7508e`. Its irregular grass/moss and rocky interstices supply offline normalized-luminance structure for the unique pigment atlas, preserving hgsim's palette and ecological masks without adding a runtime sampler. The intended 24–32 m span is an artistic rendering scale; the actual capture footprint was not independently verified. A retained third-party API snapshot reports 15 m, clearly marked as secondary evidence. Exact URLs, SHA-256, the original credits and official Poly Haven CC0 notice are in the [asset provenance](../../range/assets/materials/aerial-grass/CREDITS.md) and [manifest](../../range/assets/materials/aerial-grass/manifest.json). No normal or height map is imported for this treatment.

Height-aware material blending can let grass protrude through soil or pebbles emerge from dirt. Procedural Terrains exposes `pbrHeightMix` and packs real supplied height into color alpha; missing height becomes a constant 0.5. That is honest fallback behavior. hgsim's material loader at the time of this review supplies normal/roughness/color maps, not an explicit terrain height channel. Add height blending only with a documented source or clearly labeled authored approximation. Roughness is not height, and bright albedo is not generally a raised surface. Keep the authored coverage mask as the main control and use height only to shape its transition, so imported height ranges cannot consume an entire neighboring biome.

## Near/far quality and the sampling budget

Count samples across projections, channels and materials before choosing a quality tier. These are logical texture instructions, **not measured GPU time**, and do not count filtering taps, masks, lighting or shadows:

| Sampling arrangement | Per material, per pixel |
| --- | ---: |
| Planar, three separate maps, one sample each | 3 |
| Planar, three separate maps, three stochastic samples each | 9 |
| Three-axis triplanar, three separate maps, one sample each | 9 |
| Three-axis triplanar, three separate maps, three stochastic samples each | 27 |
| Reference's three-axis triplanar, two packed maps, three stochastic samples each | 18 |

Blending two fully sampled materials doubles those counts. Sampling both detail and macro scales simultaneously can double them again in the transition band. Branches that skip negligible material/axis weights can reduce actual work, but texture-count arithmetic alone cannot predict device performance.

The reference's `pbrAsset` transitions when a detail tile's screen-space footprint grows from 0.28 to 0.70 texture-coordinate units per pixel, then samples a fixed 8× larger world scale. It samples both scales only inside the transition. This is a useful stable-footprint idea, not an instruction to copy those thresholds or enlarged source features into hgsim. Choose the terrain's visible detail bands against the actual asset scale and camera views.

Nanite Forest's `applyFarFloor` is an equally useful warning: the source explicitly removes litter, relief and moss computation from the far shader instead of calculating them and multiplying by zero. Its reported timing improvement belongs to its author's device and scene; it is not a measurement for hgsim. [`relief.ts`](https://github.com/VictorZakharov/threejs-nanites/blob/cde2f4d4bb3414553b9e39fd317186c97b3154ad/src/ground/relief.ts) also restricts parallax to a near fade. Whole-landscape parallax would spend substantial work on detail that flight views cannot resolve and would not alter the terrain collision surface or silhouettes.

Recommended application order:

1. Share deterministic triangular patch data across the meadow, path and forest-floor material samples. Keep gentle ground planar; reserve triplanar evaluation for exposed rock and steep faces.
2. Preserve the unique terrain paint and stable ecology masks. Add restrained variation across several world scales, guided by drainage, slope, canopy and wear rather than uniform high-contrast noise.
3. Fade micro-normal strength with projected detail footprint and distance. Keep distant terrain normals, broad color and atmospheric depth; skip sampling microdetail after its contribution reaches zero.
4. Grade texture source colors and contrast together with the existing vegetation, buildings and light. Match physical feature sizes between path gravel, ground stones, grass clumps and modeled props.
5. Add packed channels or histogram-preserving asset preprocessing only if the resulting images and profiling justify their added pipeline complexity. Preserve attribution and map conventions in the derivative manifest.

## What should be checked in the running scene

This research did not run new browser captures or native-GPU profiling. The implementation needs comparison at the same camera position, time, exposure and quality setting, including slow camera movement:

- Refuge and boathouse footpaths: no repeatable bright stones, square seams or disconnected normal highlights.
- Lakeside grazing view: stable anisotropic detail, correctly placed damp margins, no texture swimming or shimmer.
- A moderate flight height: no triangular/hexagonal contrast cells, repeating botanical islands or sudden detail-scale switch.
- Departure and high valley views: large ecological composition survives, distant ground remains calm, and close-detail fetches actually stop.
- Slope transitions and each quality tier: no abrupt material identity change, registration loss, or unsafe derivative branch.

Static shader checks establish syntax and contracts; screenshots establish composition; motion establishes filtering and temporal stability. A software-rendered capture can show appearance, but it cannot establish native GPU frame cost.
