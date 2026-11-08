# Illustrated alpine surfaces

The current ground combines retained photographic grass, soil, humus and mineral
maps with an original world-space pigment atlas. Associated colour, normal and
roughness maps share stochastic sample offsets and blend weights. Broad granite
colour still uses original illustrated artwork; supplied scan detail and actual
terrain/model geometry supply relief. No illustration-derived normal is presented
as captured PBR data.

## Original painted artwork and world pigment

`generated/botanical-painted-color.webp` and
`generated/granite-painted-color.webp` are original OpenAI image_gen artwork
created on 2026-11-08 after `docs/concept/illustrated-alpine-polish.png`.
The unmodified generated originals are retained as
`docs/concept/botanical-painted-source.png` and
`docs/concept/granite-painted-source.png`. These are deliberately painted-style
albedo illustrations, **not photographs, scanned material or directional light**.
The botanical image is retained as historical artwork and is no longer sampled
by runtime ground materials. Granite chroma is restrained so the actual sun and
grade supply most warmth.
No generated normal or displacement is used. Dimensions, encoding and all hashes
are retained in [generated/illustrated-manifest.json](generated/illustrated-manifest.json).

`terrain-paint.webp` combines original pigment data from
`range/surface-style.js:sampleGroundStyle` with the filtered aerial-grass luminance
structure credited below. The same pure sampler supplies grass
instance pigment, dryness, patch density and mowing. Broken 6–30 metre
olive/ochre/straw plant communities replace the earlier broad blurred stains;
worn site pads and paths
follow the pure `alpine-sites.js:sampleAlpineSiteGround` layout. Outer yards
retain irregular grass islands; only occupied cores and paths receive strong
wear. It stores sRGB albedo without directional
lighting and uses the same world bounds/origin as the linear ecological controls.
All three atlases are 2048² (1.5625 metres per texel over the 3200-metre domain).
Rebuild with `python3 tools/build-surface-textures.py`.

## Meadow and rocky soil — Babylon.js Assets

- Source: [BabylonJS/Assets](https://github.com/BabylonJS/Assets), commit
  `3798844710bb7e76199ee38b175176c0fe4e9e62`.
- Copyright: Babylon.js contributors.
- License: **Creative Commons Attribution 4.0 International**. The upstream
  [license](babylon/LICENSE) and [asset-license README](babylon/README.md) are retained.
- Files: `grass.png`, `grassn.png`, `rockyGround_basecolor.png`,
  `rockyGround_normal.png`, `rockyGround_metalRough.png` under `babylon/`.
- These files are copied without image edits. The grass colour/normal pair now
  supplies fine turf structure without repeating painted flowers or large leaves.
  Source URLs, dimensions and SHA-256
  checksums are recorded in [babylon-source.json](babylon-source.json).
- The rocky-soil material uses the original metallic/roughness map's green
  roughness channel. These dielectric surfaces do not use its metallic channel.

## Rock face, timber and forest humus — CC0-Textures package

The supplied **Rock26**, **Planks21** and **Ground36** color, normal and roughness sets are
retained as optimized WebP runtime textures. Their pinned upstream revision,
source notice, source/output checksums, resizing/encoding steps and normal-map
convention are recorded in [scanned/CREDITS.md](scanned/CREDITS.md),
[scanned/SOURCE-NOTICE.md](scanned/SOURCE-NOTICE.md), and
[scanned/manifest.json](scanned/manifest.json).

Ground36 supplies the photographed soil/needle floor beneath the actual tree
canopy footprint, including its supplied normal and roughness companions.

The source package declares “CC0-Textures”; no modern ambientCG asset identifier
or unspecified per-material author is invented. No photogrammetry capture method
is claimed. Rebuild using `python3 tools/fetch-scanned-materials.py`.

## Baked aerial meadow structure — Poly Haven

[Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock) by **Rob Tuytel**,
licensed **CC0**, contributes intermediate-scale vegetation structure to the
unique `terrain-paint.webp` atlas. The builder decodes the source albedo to linear
luminance, filters it for the atlas footprint and combines translated patches.
Bounded, recentered contrast modulates the authored meadow pigment; paths,
occupied footprints and exposed mineral areas suppress it. The mown target uses
less contrast. It supplies no terrain height, normal or directional-light data.

Only the original color JPEG is retained in
[aerial-grass/](aerial-grass/CREDITS.md). It is an offline authoring input, with
no new runtime texture sampler or separate browser download. Exact immutable
source URLs, source SHA-256, original asset credits, CC0 terms and the secondary
nominal-size metadata are retained in that folder. The atlas manifest records
the actual artistic sampling span, filtering and measured contrast statistics.

## Aerial geological macro — Poly Haven

[Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02) by **Rob Tuytel**, licensed
**CC0**, supplies the hill/rock colour and OpenGL normal layers. Its roughness
companion is retained as source data. Source provenance, the independent PlayCanvas credit,
license notice, immutable mirror revision, and conversion/checksum metadata are
retained in [aerial-rocks/CREDITS.md](aerial-rocks/CREDITS.md) and its manifest.

## Earlier synthesized cliff macro — retained source artwork

`generated/granite-macro-color.webp` is original AI-generated geological artwork
created using OpenAI image_gen on 2026-11-07. The retained source is
`docs/concept/granite-macro.png`; it is **not a photograph or geological survey**.
It depicts broad exfoliation slabs, fissures and quartz veins, and is tiled at
384 m on mountain faces and 32 m on the local launch cliffs in the earlier
photographic direction. Current materials use the illustrated granite above.

`generated/granite-macro-normal.webp` is an **approximate height-proxy normal**
derived from grayscale artwork with ImageMagick. It is not captured PBR normal
data. It is retained as historical source and is no longer loaded by runtime
materials. Launch and mountain planes use geometry/DEM normals with restrained
supplied photographic detail.
Rebuild with `bash tools/build-granite-macro.sh`.
Source/output hashes, scale, encoding and derivation are recorded in
[generated/manifest.json](generated/manifest.json).

## Authored biome masks

`terrain-control.png` and `terrain-ecology.png` are original linear control data
authored for hgsim. They combine the canonical `world.js:sampleTerrainEcology`
rock/talus/moisture/path query with the shared botanical patch field. The
world-pigment atlas supplies the smaller plant-community shapes. They preserve
the landing meadow, join the valley and launch
approach paths, and connect cliff material to its actual rock/debris footprint.
They are not colour maps, geological survey data, or collision geometry.
Rebuild using `python3 tools/build-surface-textures.py`; channel contracts, world
bounds, source/output checksums and seed are in [terrain-controls.json](terrain-controls.json).
Runtime textures use opaque RGB8, linear colour space and `flipY=false` (row zero
at minZ). No data is packed into alpha, avoiding transparent-image premultiplication.

## Earlier synthesized botanical macro — retained source artwork

`generated/meadow-macro-color.webp` is original AI-generated botanical albedo
artwork made with OpenAI image_gen on 2026-11-08, after the flight-corridor concept.
Its retained original is `docs/concept/meadow-surface-source.png`. It supplies
interwoven olive/sage/straw grass and herb clusters at 14 metres per repeat,
between the photographed fine grass and the broad ecological mask scales in
the earlier photographic direction. It is no longer loaded by runtime ground
materials. The historical version used two offset phases blended with the
23-metre control field to reduce visible repeats.
This is **not a photograph or captured PBR scan**; no captured normal, roughness
or displacement is claimed. Nearby normals come from supplied photographic maps.
See [generated/meadow-manifest.json](generated/meadow-manifest.json) for source,
output hashes, original dimensions and encoding.

## Stochastic sampling code

The triangular offset-only helper in `range/terrain-sampling.js` adapts
[ZyFou's MIT-licensed Procedural Terrains source](https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/src/engine/terrain/surface/SurfaceArrayGLSL.js).
Its full copyright and permission notice is retained in that file. This imports
a sampling technique, not that project's assets. High/medium blend three samples;
low uses a single filtered sample. Material masks remain fixed in world space.
