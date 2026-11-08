# Alpine PBR surfaces

Fine surfaces use supplied photographic texture maps with normal and roughness
companions. Broad mountain geology combines a genuine aerial rock photograph
with explicitly synthesized granite artwork; its approximate normal is identified
below rather than presented as captured data.

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

## Rock face and timber — CC0-Textures package

The supplied **Rock26** and **Planks21** color, normal and roughness sets are
retained as optimized WebP runtime textures. Their pinned upstream revision,
source notice, source/output checksums, resizing/encoding steps and normal-map
convention are recorded in [scanned/CREDITS.md](scanned/CREDITS.md),
[scanned/SOURCE-NOTICE.md](scanned/SOURCE-NOTICE.md), and
[scanned/manifest.json](scanned/manifest.json).

The source package declares “CC0-Textures”; no modern ambientCG asset identifier
or unspecified per-material author is invented. No photogrammetry capture method
is claimed. Rebuild using `python3 tools/fetch-scanned-materials.py`.

## Aerial geological macro — Poly Haven

[Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02) by **Rob Tuytel**, licensed
**CC0**, supplies the 240 m hill/rock macro layer with its supplied OpenGL normal
and roughness companions. Source provenance, the independent PlayCanvas credit,
license notice, immutable mirror revision, and conversion/checksum metadata are
retained in [aerial-rocks/CREDITS.md](aerial-rocks/CREDITS.md) and its manifest.

## Synthesized cliff macro — original image generation

`generated/granite-macro-color.webp` is original AI-generated geological artwork
created using OpenAI image_gen on 2026-11-07. The retained source is
`docs/concept/granite-macro.png`; it is **not a photograph or geological survey**.
It depicts broad exfoliation slabs, fissures and quartz veins, and is tiled at
384 m on mountain faces and 32 m on the local launch cliffs, alongside the fine
photographic Rock26 material. Local cliffs retain only a 25% nearby scan blend so
the larger fissures remain readable.

`generated/granite-macro-normal.webp` is an **approximate height-proxy normal**
derived from grayscale artwork with ImageMagick. It is not captured PBR normal
data. Its purpose is broad light response; genuine micro normals still come from
the supplied photographic material. Rebuild with `bash tools/build-granite-macro.sh`.
Source/output hashes, scale, encoding and derivation are recorded in
[generated/manifest.json](generated/manifest.json).

## Authored biome masks

`terrain-control.png` is original control data authored for hgsim: red marks the
footpath/bare soil, green controls dry cover, and blue protects the landing field.
It is baked by `tools/build-surface-textures.py`; it does not replace photographic
albedo and does not change terrain geometry or physics. Obsolete generated colour/height swatches are not shipped; the builder produces
only this linear control map.
