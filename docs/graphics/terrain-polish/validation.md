# Ground material validation

Reviewed 8 November 2026 on `codex/alpine-visual-upgrade`.

The four JPEGs are actual 1280×800, high-quality production-renderer captures
with afternoon lighting. They have not been painted over or image-generated.
Departure uses the gameplay chase camera; ground, terrain and lakeside are
inspection cameras using production geometry, culling, materials and finishing.
Cloud history is warmed for 32 cloud-only frames after each camera cut.

`before-ground.jpg` and `before-terrain.jpg` were captured from the clean
`487a432` checkpoint. Both camera positions match their final counterparts
exactly; resolution, quality and lighting also match. The before images preserve
the earlier illustrated tile and broad pigment field.

## Results

- `npm test`: **165 passed**, zero failures or skips. [Log](tests.log).
- Four final gallery views: zero runtime/shader errors.
  [Current metadata](captures.json), [before metadata](before-captures.json).
- High, medium and low at 960×600 and 390×780, for both sampler variants:
  **12 render states passed**, zero errors or warnings.
- The constrained check makes the renderer see 16 texture units before startup;
  the actual SwiftShader context exposes 32. Reflection of the linked programs
  verifies **15 fragment samplers + one vertex sky probe** for lean terrain and
  cliffs, including cloned cliff materials. This is a forced-budget check,
  not a test on native 16-unit hardware. [Lean report](lean-sampler-checks.json).
- Full terrain links with **21 fragment samplers + one vertex probe**; full
  cliffs use **18 + one**. The conservative 22-unit threshold accounts for
  Three r180 checking total allocations against its fragment-capacity value.
  [Full report](full-sampler-checks.json).
- The final aerial-sward bake was repeated deterministically. Source, provenance,
  builder and output hashes match the retained manifest. Measured gain is
  1.000001 mean, 0.054557 standard deviation, bounded to 0.873234–1.142594.
  Paths/occupied areas and mineral masks suppress the layer; target contrast is
  bounded to 5%. It adds no runtime sampler or separate source-image download.

The earlier [living-valley validation](../living-valley/validation.md) retains
the nine production gameplay checks and nine alternate-mode/missing-asset
checks from `487a432`. This material pass changes neither flight physics nor
terrain/contact geometry; current CPU coverage and render checks are above.

## Stepped camera inspection

The [retained camera sequence](ground-motion.mp4) contains 24 actual 960×600,
high-quality production renders, with simulation time frozen and the camera
stepped 0.25 m sideways and 0.4 m forward per frame. Each render includes the
normal material, streaming, cloud and finishing path. There are zero runtime
errors or warnings. The start, middle and end frames were inspected: the ground
keeps its material identity without an obvious tile boundary or blend seam.
[Per-frame metadata](motion-sequence.json) records all positions and draw counts.

The MP4 plays those sampled frames at 8 fps for review; that is an encoding
choice, **not measured game performance**. It is a short ground traverse, not a
continuous native-GPU flight or a comprehensive test of temporal shimmer and
all distance transitions. Recreate the sequence with the command below; encode
only its requested 24 frames when reusing an output directory:

```sh
ffmpeg -framerate 8 -i work/ground-motion/frame-%04d.png -frames:v 24 \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart work/ground-motion.mp4
```

## Rendering cost

These captures use **ANGLE SwiftShader**, a CPU software renderer. Counts include
the beauty, shadow, finishing and optional reflection work in that draw; they
are not native GPU timings or frame-rate claims.

| View | Draw calls | Submitted triangles |
| --- | ---: | ---: |
| Ground | 225 | 7,544,614 |
| Terrain | 147 | 1,725,812 |
| Lakeside | 191 | 6,230,935 |
| Departure | 301 | 1,293,975 |

Stochastic sampling costs up to three texture fetches per active channel and
projection. Detail uses explicit gradients, bounded anisotropy, and distance/
footprint fades; low quality uses one sample and dominant rock projection.
Those choices limit work but do not establish a native-GPU speedup.

The three 2048² world atlases total **7,826,040 bytes (7.463 MiB)** on disk.
Their estimated RGBA8 residency with mip chains is **64 MiB**, compared with
16 MiB for three 1024² atlases. The offline aerial input is 210,946 bytes and is
not loaded by the renderer. Other materials and render targets are additional;
actual device allocation and native GPU timing remain unmeasured.

## Reproduce

```sh
node server.mjs 4281
npm test
CHROME_PATH=/path/to/chromium node tools/range-capture.mjs \
  --url http://127.0.0.1:4281 --view terrain,ground,lakeside,departure \
  --quality high --out work/terrain-gallery
CHROME_PATH=/path/to/chromium node tools/range-surface-check.mjs \
  --url http://127.0.0.1:4281 --cap 16 --out work/lean-surface-checks.json
CHROME_PATH=/path/to/chromium node tools/range-surface-check.mjs \
  --url http://127.0.0.1:4281 --cap 32 --out work/full-surface-checks.json
CHROME_PATH=/path/to/chromium node tools/range-ground-motion.mjs \
  --url http://127.0.0.1:4281 --out work/ground-motion --frames 24
```

The shaders reduce conspicuous repetition; finite source images are not unique
everywhere. Low quality deliberately permits more source repetition. The
surface detail changes material response, not physical height or silhouettes.
Continuous native-GPU motion and broad device profiling remain separate from
the retained software-renderer checks.
