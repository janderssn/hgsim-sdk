# Graphics validation — Golden Range (previous pass)

See [current alpine rebuild validation](alpine-rebuild/validation.md) for the latest scene.

The current art pass is an illustrated alpine direction with an authored colour
grade, painted terrain, curved botanical cover, varied canopy and four composed
story sites. The [six final in-game views](golden-captures.json) are 1280×800 at
fixed high quality, with no runtime/GLSL errors and all four prepared mip chains
active through level 8. [Screenshots and art direction](../art-direction.md).
Native 1080p/60 and commercial production-art parity remain unverified.

## Functional and visual checks

- `npm test`: **128 passing CPU checks**. Includes pinned asset/atlas integrity,
  exact rock contacts, deterministic canopy coverage, near/mid cover cache bounds,
  render-state recovery, source-synchronized ecology, colour-grade order, mip
  colour/normal integrity and shader composition.
- `tools/range-check.mjs --quality low --deterministic`: **9 browser checks pass**:
  Easy ramp/cliff, balanced realistic run, posture transitions and judged landing.
  The replay driver uses production 1/60 s physics and pose updates while bypassing
  GPU waits. It proves game integration, not wall-clock rendering responsiveness.
- `tools/range-visual-check.mjs`: original model and assist mode retain 19 bones
  and launch; portrait resize and shaders pass. Blocking prepared mip chains uses
  source PNGs and still launches;
  blocking the forest/terrain/surface assets leaves a flyable local-prop fallback.
- Fixed high at 1280×800 flight, launch, woodland, meadow, refuge and staging captures have no
  runtime or shader errors. Camera/forest/draw metadata is in
  [golden-captures.json](golden-captures.json).
- More than 1,500 real Three.js raycast/contact samples match the shared launch
  triangles within 0.1 mm. All quality levels retain the full 240×240 terrain grid.

The broad hillside supplies ridge airflow, while the existing separate surface
callback supplies physical clearance. This preserves flyable departures without
letting individual slab edges redefine the air. The authored deck/cliff starts,
field, force parameters and 19-bone rig are retained; new exposed rock is solid.

Logs: [CPU](tests-golden.log), [browser](browser-golden.log),
[optional assets and alternate modes](visual-golden.log).

## Software rendering, not a native GPU acceptance result

Chromium 156 / SwiftShader Vulkan CPU rendering, native DPR 1. One Chrome instance
at a time, no concurrent rendering/baking jobs. Default automatic quality;
15 s warm-up and 10 s sampling. The same benchmark tool and window dimensions
were used, but adaptive internal resolutions differ as shown.

| Scene/revision | FPS | Mean / p95 frame | Internal canvas |
| --- | ---: | --- | --- |
| Main 812c886, historical reference | 9.04 | 111 / 133 ms | 720×297 |
| Initial alpine pass a00a4ad | 3.48 | 288 / 300 ms | 576×238 |
| Pre-style corridor 4a18eca | 0.85 | 1174 / 2150 ms | 576×238 |
| Golden Range illustrated pass | **1.14** | **881 / 2117 ms** | **576×238** |

All settle at low quality. The current sample contains only 12 frame intervals
over 10.57 s. The richer scene is substantially slower in this software renderer;
interactive acceptance on this machine is **not met**. Reduced startup bytes
and CPU streaming work must not be presented as a demonstrated overall FPS gain.
Hardware GPU performance remains unmeasured.

Raw results: [main](benchmark-before.json), [initial alpine](benchmark-after.json),
[pre-style corridor](benchmark-corridor.json), [Golden Range](benchmark-golden-range.json).

## Where the work goes

Historical pre-style measurements: the [six-camera medium route](corridor-route-medium-pre-vertex.json) recorded
36 GPU elapsed queries at 960×600, including moving inspection cameras, the cloud
prepass, beauty/shadows and AO/output. It compiled without errors. It was captured
**before** the final vertex-scattering optimization. Software GPU elapsed time
averaged 3781 ms; p95 was 10176 ms. RAF intervals mostly describe asynchronous
submission/queueing and must not be converted into a native FPS claim.

A subsequent static component diagnostic isolated cloud and scene work, then
compared per-fragment scattering with interpolated vertex scattering:

| Medium 960×600 view | Scene pass before | Scene pass after |
| --- | ---: | ---: |
| Flight | 2485 ms | 2272 ms |
| Woodland | 7635 ms | 7066 ms |

These are means of only three software GPU queries each (roughly 8% improvement),
not an independent native benchmark. Cloud queries were about 1–10 ms here; the
scene pass dominates. [All component samples](corridor-pass-costs.json) are
retained. Surface spectral transmission/scattering now interpolates from vertices;
the sun/cloud shadow and normal lighting still evaluate at the surface. The final
high-detail flight capture was reviewed again after this optimization.

Other concrete work reductions:

- The legacy prop GLB was reduced to 267,728 B versus 5,756,672 B; the new locally
  authored story kit now removes that library from startup entirely.
- The former 21 MB HDR and obsolete spruce atlas are absent from startup requests.
- Forest instance uploads cover populated prefixes rather than entire species
  capacities. GPU billboarding avoids per-tree camera rotations.
- Ground-cover streaming rebuilds the entering rim of 6 m cells. A bounded 384-cell
  cache reuses unchanged placements (15 new cells on a typical crossing, rather
  than rebuilding the 169-cell disc in the previous implementation).
- High/medium/low cloud and AO work have explicit pixel/sample caps. Physical
  terrain and simulation frequency never reduce with quality.

Reproduce with a local server and Chrome/Chromium:

```sh
node tools/range-check.mjs --quality low --deterministic
node tools/range-visual-check.mjs
node tools/range-route.mjs --quality medium --frames 24 --out work/route
node tools/range-pass-costs.mjs --view woodland --samples 12
node tools/range-benchmark.mjs --warmup 15 --seconds 10
```

Prepared mip diagnostics (`range/assets/forest/mip-diagnostics.json`) measured
pine mip4 normal alignment 0.586→1.0 and eliminated the ~32% wrong-facing normals.
Filtered albedo brightness is retained through alpha-weighted linear filtering;
coverage stays unchanged. One view per card removes per-pixel selection speckle.
This is texture correctness, not a claim of temporal reconstruction.

The grade is shared by all HDR quality levels. Low now has a beauty/composite
path without AO/glow; this also avoids repeating display tone mapping on every
overlapping scene fragment. No new geometry pass is used for grading or depth.

Native GPU profiling, moving-image aliasing and visual review remain gates for
promoting this draft to the higher target. No deployment/environment publication
was performed.
