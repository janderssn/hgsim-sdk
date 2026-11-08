# Photographic rock, timber and forest-floor PBR maps

The **Planks21**, **Rock26** and **Ground36** color, normal and roughness maps come from
[RubenCUR's ArmorPaint / Blender CC0-Textures package](https://github.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/tree/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b),
pinned to commit `1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b`.

The source README identifies the package as **“ArmorPaint Materials CC0-Textures”**.
Its notice wording is retained in [SOURCE-NOTICE.md](SOURCE-NOTICE.md), with
trailing whitespace normalized. The
source does not include a separate LICENSE file, per-material author metadata,
or a verified mapping to current ambientCG asset identifiers; none is invented
here. The photographic color maps and their supplied normal/roughness companions
are used together. No photogrammetry capture method is claimed.

## Runtime conversion

- Color: original 2048 × 2048 resolution, WebP quality 90.
- Normal: Lanczos resize to 1024 × 1024, lossless RGB WebP.
- Roughness: Lanczos resize to 1024 × 1024, grayscale replicated to RGB, WebP quality 92.
- No color repainting or generated replacement detail is applied.

The source package includes Blender materials and legacy `_nrm` files but does
not label their normal convention. They are used as OpenGL tangent-space normals,
without flipping the green channel. This rendering convention is recorded in
`manifest.json` rather than represented as verified upstream metadata.

Rebuild with `python3 tools/fetch-scanned-materials.py`. Downloads retain TLS
verification and must match the pinned Git blob hashes and SHA-256 checksums.
The manifest records every source URL, source/output checksum, size, dimensions,
and transformation. Use `--offline` to rebuild from the verified source cache.
