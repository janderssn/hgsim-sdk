# Aerial Grass Rock — offline meadow structure

**Aerial Grass Rock**, by **Rob Tuytel**, from [Poly Haven](https://polyhaven.com/a/aerial_grass_rock), is licensed **CC0 1.0 Universal**. The [legal text](LICENSE.txt), [official Poly Haven license-page source](polyhaven-license.json), and [pinned PlayCanvas asset credits](source-credits.txt) are retained here. The asset may be redistributed and adapted under CC0; credit is retained for provenance.

`color.jpg` is the **unchanged 1024 × 1024 diffuse JPEG**, 210,946 bytes, retrieved from:

```text
https://raw.githubusercontent.com/playcanvas/engine/4b305e9b9c2cac2397b65f3ef3915a84a7c7508e/examples/assets/textures/terrain/aerial_grass_rock_diff_1k.jpg
SHA-256: 47f2a34c9358698033055dee646cc1a699ba2d1645934c8eb3605488c0d93b11
```

The source depicts irregular moss/grass cover, weathered rock and gravel. It was inspected as an aerial material with coherent patches rather than a close photograph of grass blades. hgsim retains only its color map for **offline luminance structure baked into the unique terrain pigment atlas**. Decode sRGB before deriving linear luminance. Palette, moisture response, path coverage and landing-field contrast remain authored by hgsim. There is no additional runtime aerial-grass sampler, normal map, height map or claim of physical displacement.

The intended 24–32 m sampling span is an **artistic rendering scale**, not an independently verified capture footprint. A [third-party retained Poly Haven API response](source-metadata.json) reports `15M x 15M` and dimensions `[15000, 15000]`; its exact source is recorded in the manifest. The live Poly Haven API was unavailable during this retrieval, so that reported scale is preserved as secondary evidence rather than asserted as a verified physical measurement.

The [manifest](manifest.json) records the immutable source revisions, source URLs, byte counts and SHA-256 hashes for the image and retained notices. The original normal map was inspected during research but is not included or used for this treatment. The derived atlas's actual composition and hashes belong in `../terrain-controls.json`, beside the builder's other outputs.
