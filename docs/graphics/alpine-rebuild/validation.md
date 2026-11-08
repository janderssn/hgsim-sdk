# Alpine rebuild validation

Checked 8 November 2026. These results describe the rebuilt scene in this commit.

- `npm test`: **136 passed**, zero failures. Includes original flight/launch/landing
  checks, exact launch render/contact agreement, terrace/grid accuracy, shared
  terrain-mask hashes, source-data provenance, plant streaming and bounds,
  texture ownership, instanced-buffer disposal, and actual route-board UV orientation.
- `range-check.mjs --quality low --deterministic`: all nine gameplay checks pass,
  using the production fixed-step driver. Both easy launches and realistic ramp
  launch fly, posture switching works, and touchdown is judged without page errors.
- `range-visual-check.mjs`: original/assist modes, portrait resize, missing prepared
  mips falling back to PNG, and missing forest/elevation/surface assets all pass.
  No runtime or shader errors.
- Six high-quality 1280×800 canvas captures have **zero runtime/shader errors**.
  Departure and approach use the gameplay chase camera; staging/refuge/meadow/launch are
  inspection views using the same production rendering path.

Raw evidence: [CPU checks](tests.log), [gameplay](gameplay.log),
[asset fallbacks](visual.log), [capture metadata](captures.json).

## Rendering cost

Captures report total beauty/shadow/finishing work: approximately 0.56–4.08 million
triangles and 111–179 calls across the six views. Those counts are not frame-time
measurements. On a dense flat-meadow fixture, low/medium/high cover uses roughly
69k/304k/713k triangles in five occupied batches. High cover is substantially
richer than the preceding version and costs more geometry. Low reduces density,
range and secondary plant layers; fixed instance buffers and bounded cell caches
remain in use.

This cloud environment uses Chromium SwiftShader, a CPU renderer. Native GPU
performance has not been measured; no 60 FPS or commercial-game parity claim is
made. Prior software-renderer FPS samples apply to older scene revisions and
must not be attributed to this rebuild.

## Scene and asset boundaries

The refuge's graded yard is an intentional local change to physical terrain. Its
displacement is interpolated on the actual 240-cell terrain grid; the drawn ground
continues to pass the existing one-metre agreement bounds. Protected central
approach/target/thermal heights and authored launch inputs remain exact.

The new public-domain Sierra backdrop is decorative and retains source checksums,
rebuild tooling and an explicit mask of interpolated missing elevations. It does
not supply flight contacts. The route texture and prop/rock kit are original;
existing local scanned mineral textures retain their CC0 provenance.

No environment publication or deployment was performed.
