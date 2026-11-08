# Local cloud and atmospheric data

The advanced cloud provider uses pinned Takram WebGL2 shaders and precomputed
data, with the existing vendored Three r180. It uses no React runtime, remote
texture URLs, or replacement Three instance. Retained versions and every asset
SHA-256 are recorded in [manifest.json](manifest.json).

- `shape.bin`: 128³ R8 Perlin–Worley cloud shape, 2 MiB.
- `shape_detail.bin`: 32³ R8 detail erosion, 32 KiB.
- `local_weather.png`: 512² RGBA coverage channels for the four possible layers.
- `turbulence.png`: 128² RGBA displacement texture.
- `atmosphere/*.bin`: half-float Bruneton transmittance (256×64), irradiance
  (64×16), and combined scattering (256×128×32), all RGBA. Combined scattering
  occupies 8 MiB; separate Mie/higher-order tables are not required by this setup.
- `blue-noise-rotation.bin`: original 64×64×64 scalar jitter. Each spatial tile
  comes from an original void-and-cluster rank implementation; a golden-ratio
  sequence rotates its values through time. This is **not** the NVIDIA STBN data
  or a claim of equivalent joint spatiotemporal spectra. The upstream property
  is called `stbnTexture`, but accepts this ordinary scalar sampling texture.

The first seven files are retained from the exact npm packages listed in the
manifest. Their source is [Takram at the inspected revision](https://github.com/takram-design-engineering/three-geospatial/tree/b012ad06d858fc035d88aacfd73f092f93c994e4).
The vendored module contains Takram MIT code, postprocessing Zlib code, Three.js
example/fflate MIT code, and Eric Bruneton BSD-3-Clause atmosphere code. Complete
notices are retained in [takram-clouds.LICENSE.txt](../../vendor/takram-clouds.LICENSE.txt).
The associated volume-noise source retains Sébastien Hillaire's MIT notice.

Rebuild with Node 22+:

```sh
npm ci --prefix tools/advanced-clouds --ignore-scripts --legacy-peer-deps
node tools/build-cloud-jitter.mjs
node tools/build-advanced-clouds.mjs
node --test tests/advanced-clouds.test.mjs
```

`build-advanced-clouds.mjs --dependencies /path/to/install` supports an isolated
dependency installation. It verifies the six direct package versions, bundles
only the vanilla exports, preserves the shared Three import, copies local data,
and writes checksums. The package lock pins transitive versions and integrity.

The source package's default NVIDIA-derived STBN download is deliberately not
used. Its asset and SDK terms are separate from Takram's MIT source license.
No remote data is fetched while the game runs.

The adapter applies two explicit scene-specific shader changes after importing
this unmodified bundle: a shared scene-linear radiance scale, and an algebraically
equivalent cube-sphere projection expression that avoids float cancellation near
the local planet anchor. Cloud density and Beer shadow density use the same
projection correction. Neither change paints or substitutes a cloud image.
