# Graphics validation

- `npm test`: 87 passing CPU checks.
- `npm run check:range`: all 9 browser checks pass, including both Easy launches,
  Realistic launch, upright/prone transitions and a judged overhead landing.
- Original flight model and assist mode load the new assets, retain the 19-bone
  rig and launch successfully.
- Portrait resize compiles without shader errors. Intentionally blocking the
  model pack, or the HDR/elevation/photographic maps, still permits launch.
- Flight, launch and meadow canvas captures use fixed high detail at 1280×800.
  The latter two use inspection cameras through the production rendering path.

## Software rendering measurement

Chromium 156, SwiftShader software rendering, native DPR 1; one browser at a time,
15 seconds warm-up and 10 seconds sampling, default automatic quality. Blender
and other rendering jobs were stopped. The reference is main `812c886`; the
candidate is `codex/alpine-visual-upgrade`.

| Scene | FPS | Mean / p95 frame | Internal canvas | Draws / triangles |
| --- | ---: | --- | --- | --- |
| Previous range | 9.04 | 111 / 133 ms | 720×297 | 79 / 157,936 |
| Alpine upgrade | 3.48 | 288 / 300 ms | 576×238 | 83 / 207,538 |

Both settle at low quality; the new fallback uses a smaller framebuffer. These
are automatic-device compatibility measurements at different resolutions. The
richer scene is slower in this CPU renderer. Hardware GPU performance remains
unverified, and this branch makes no claim of a frame-rate improvement over main.
Raw results are retained in `benchmark-before.json` and `benchmark-after.json`.

Instanced tree impostors, static timber batches, SH diffuse lighting and distant
surface-detail fading bound the added work. Quality adapts resolution, shadow
size, texture anisotropy and detail/effect budgets while keeping the physical
terrain's full grid. Further GPU profiling is needed before closing the overall
quality/performance target.
