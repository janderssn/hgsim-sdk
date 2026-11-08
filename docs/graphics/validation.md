# Graphics validation — flight corridor

The current implementation has four full-crown tree variants, runtime-lit aerial
impostors, shared physical launch triangles, ecological surfaces/undergrowth and
a coherent sky/cloud medium. The screenshots show the actual game. Production-art
parity and the research's native 1080p/60 FPS target remain unverified.

## Functional and visual checks

- `npm test`: **116 passing CPU checks**. Includes pinned asset/atlas integrity,
  exact rock contacts, deterministic canopy coverage, streaming cache bounds,
  render-state recovery, source-synchronized ecology and shader composition.
- `tools/range-check.mjs --quality low --deterministic`: **9 browser checks pass**:
  Easy ramp/cliff, balanced realistic run, posture transitions and judged landing.
  The replay driver uses production 1/60 s physics and pose updates while bypassing
  GPU waits. It proves game integration, not wall-clock rendering responsiveness.
- `tools/range-visual-check.mjs`: original model and assist mode retain 19 bones
  and launch; portrait resize and shaders pass. Deliberately blocking props,
  forest, terrain and surface assets still leaves a flyable fallback.
- Fixed high at 1280×800 flight, launch, woodland and meadow canvas captures have no
  runtime or shader errors. Camera/forest/draw metadata is in
  [corridor-captures.json](corridor-captures.json).
- More than 1,500 real Three.js raycast/contact samples match the shared launch
  triangles within 0.1 mm. All quality levels retain the full 240×240 terrain grid.

The broad hillside supplies ridge airflow, while the existing separate surface
callback supplies physical clearance. This preserves flyable departures without
letting individual slab edges redefine the air. The authored deck/cliff starts,
field, force parameters and 19-bone rig are retained; new exposed rock is solid.

Logs: [CPU](tests-corridor.log), [browser](browser-corridor.log),
[optional assets and alternate modes](visual-corridor.log).

## Software rendering, not a native GPU acceptance result

Chromium 156 / SwiftShader Vulkan CPU rendering, native DPR 1. One Chrome instance
at a time, no concurrent rendering/baking jobs. Default automatic quality;
15 s warm-up and 10 s sampling. The same benchmark tool and window dimensions
were used, but adaptive internal resolutions differ as shown.

| Scene/revision | FPS | Mean / p95 frame | Internal canvas |
| --- | ---: | --- | --- |
| Main 812c886, historical reference | 9.04 | 111 / 133 ms | 720×297 |
| Initial alpine pass a00a4ad | 3.48 | 288 / 300 ms | 576×238 |
| Current flight corridor | **0.85** | **1174 / 2150 ms** | **576×238** |

All settle at low quality. The current sample contains only 9 frame intervals over
10.57 s. The richer scene is substantially slower in this software renderer;
interactive acceptance on this machine is **not met**. Reduced startup bytes
and CPU streaming work must not be presented as a demonstrated overall FPS gain.
Hardware GPU performance remains unmeasured.

Raw results: [main](benchmark-before.json), [initial alpine](benchmark-after.json),
[current corridor](benchmark-corridor.json).

## Where the work goes

The [six-camera medium route](corridor-route-medium-pre-vertex.json) recorded
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

- Props-only GLB 267,728 B versus 5,756,672 B: 95.35% smaller, byte-equivalent props.
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

Native GPU profiling, moving-image aliasing and visual review remain gates for
promoting this draft to the higher target. No deployment/environment publication
was performed.
