# Illustrated alpine surfaces

The current colour treatment combines original illustrated botanical/granite
artwork with an original world-space pigment atlas. Supplied photographic
normal/roughness companions provide restrained nearby surface response. Terrain
and model geometry supply the main forms; no illustration-derived normal is
presented as captured PBR data.

## Current painted artwork — original image generation

`generated/botanical-painted-color.webp` and
`generated/granite-painted-color.webp` are original OpenAI image_gen artwork
created on 2026-11-08 after `docs/concept/illustrated-alpine-polish.png`.
The unmodified generated originals are retained as
`docs/concept/botanical-painted-source.png` and
`docs/concept/granite-painted-source.png`. These are deliberately hand-painted
albedo illustrations, **not photographs, scanned material or directional light**.
Botanical pigment is mean-normalized before modulating the shared world palette;
granite chroma is restrained so the actual sun and grade supply most warmth.
No generated normal or displacement is used. Dimensions, encoding and all hashes
are retained in [generated/illustrated-manifest.json](generated/illustrated-manifest.json).

`terrain-paint.webp` is original pigment data baked from
`range/surface-style.js:sampleGroundStyle`. The same pure sampler supplies grass
instance pigment, dryness, patch density and mowing. Domain-warped 20–150 metre
sage/olive/ochre/straw patches replace a uniform lawn; worn site pads and paths
follow the pure `alpine-sites.js:sampleAlpineSiteGround` layout. Outer yards
retain irregular grass islands; only occupied cores and paths receive strong
wear. It stores sRGB albedo without directional
lighting and uses the same world bounds/origin as the linear ecological controls.
Rebuild with `python3 tools/build-surface-textures.py`.

## Meadow and rocky soil — Babylon.js Assets

- Source: [BabylonJS/Assets](https://github.com/BabylonJS/Assets), commit
  `3798844710bb7e76199ee38b175176c0fe4e9e62`.
- Copyright: Babylon.js contributors.
- License: **Creative Commons Attribution 4.0 International**. The upstream
  [license](babylon/LICENSE) and [asset-license README](babylon/README.md) are retained.
- Files: `grass.png`, `grassn.png`, `rockyGround_basecolor.png`,
  `rockyGround_normal.png`, `rockyGround_metalRough.png` under `babylon/`.
- These files are copied without image edits. Source URLs, dimensions and SHA-256
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

## Aerial geological macro — Poly Haven

[Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02) by **Rob Tuytel**, licensed
**CC0**, supplies the 240 m hill/rock macro layer with its supplied OpenGL normal
and roughness companions. Source provenance, the independent PlayCanvas credit,
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
botanical tile supplies smaller painted clusters. They preserve
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
the earlier photographic direction. Current materials use the painted source above.
Two offset phases blended with the 23-metre control field reduce visible repeats.
This is **not a photograph or captured PBR scan**; no captured normal, roughness
or displacement is claimed. Nearby normals come from supplied photographic maps.
See [generated/meadow-manifest.json](generated/meadow-manifest.json) for source,
output hashes, original dimensions and encoding.
