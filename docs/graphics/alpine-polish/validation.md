# Alpine polish validation

Checked 8 November 2026 on `codex/alpine-visual-upgrade`.

- `npm test`: **139 passed**, zero failures. Includes flight/launch/landing,
  exact terrain contacts, source texture hashes, forest provenance and canopy
  coverage, streamed plant bounds, resource ownership, directional rock normals,
  shader-hook composition and unchanged pilot bone matrices across poses.
- `range-check.mjs --quality low --deterministic`: all nine gameplay checks pass
  through the production fixed-step driver, including easy and realistic launches,
  posture switching and touchdown judging. No page errors.
- Seven high-quality 1280×800 captures have **zero runtime/shader errors**.
  Departure and approach use the production chase camera; staging, refuge,
  meadow, aircraft and launch are inspection views of the same production scene.
  The aircraft detail intentionally crops the wingtips to show the pilot equipment.
- `range-visual-check.mjs`: original/assist modes, portrait resize, missing prepared
  mips falling back to PNG, and missing forest/elevation/surface assets all pass.
  No runtime or shader errors.

Raw evidence: [CPU tests](tests.log), [gameplay](gameplay.log),
[asset fallbacks](visual.log), [capture metadata](captures.json). The preceding
[accepted rebuild](../alpine-rebuild/validation.md) is retained for comparison.

## Render work

These counts include beauty, shadows and finishing, and are not frame times.

| Capture | Triangles | Draw calls |
| --- | ---: | ---: |
| Staging | 1,826,229 | 172 |
| Refuge | 3,906,012 | 134 |
| Meadow | 3,092,456 | 110 |
| Departure | 763,595 | 189 |
| Approach | 3,798,253 | 208 |
| Aircraft | 901,174 | 164 |
| Launch | 501,314 | 129 |

The dense flat-meadow fixture uses about 98k/492k/1.182M triangles at
low/medium/high, versus 69k/304k/713k in the preceding rebuild. The added low
leaf layer fills a formerly unused meadow batch; the fixture now uses six draws.
Buffers and cell caches remain bounded; altitude disables nearby detail.

The forest has 55,940 trees including 4,503 understorey saplings, down from about
63k. Cohorts reuse the four rebuilt mesh/atlas variants and add no batch type.
Cabin/story props retain twelve batches; pilot equipment adds five and fewer than
5,000 triangles. The cloud medium uses an 8 MiB volume, replacing the old 512 KiB
shape plus weather texture. It removes one lookup per density sample and retains
the 640×360 / 48-step high-quality cloud ceiling. Startup bake timing and the
approximate lighting model are detailed in [lighting notes](../../research/lighting-polish.md).

This environment uses Chromium SwiftShader, a CPU renderer. Native GPU frame time
has not been measured. Richer nearby vegetation increases geometry; neither these
counts nor the software measurements establish 60 FPS or a tenfold speedup.

The [automatic-quality software sample](benchmark.json), after an eight-second
warmup, produced only five frames in 11.17 seconds: 0.45 FPS, at the low preset
and a 576×238 drawing buffer. This is very slow software rendering. The sample is
too small for useful percentile conclusions and has no matching previous-revision
measurement; it establishes neither a speedup nor a native-device regression.

## Scope

The simulation, target clearances and physical terrain remain unchanged in this
pass. Bone-following equipment is validated against all 19 original rig matrices.
Local assets retain their licenses, provenance and reproducible builders; no
runtime network service is introduced. No environment publication or deployment
was performed.
