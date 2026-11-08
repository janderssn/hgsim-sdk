# Living valley validation

Reviewed 8 November 2026 on branch `codex/alpine-visual-upgrade`.
The six JPEGs are actual Chromium renders, 1280×800 at high quality. They are not
painted over or image-generated. Concepts and the Blender Cycles preview are
separate authoring references.

Departure and both light comparisons use the production chase camera. Shore and
refuge views use inspection cameras with the production geometry, material,
streaming and finishing path. Cloud history is warmed for 32 cloud-only frames
after each camera cut. Shore views were recaptured after the final five-tree
opening around the boathouse; other views preserve the preceding art-review
capture. [Raw metadata](captures.json) retains each scene's exact counts.

## Results

- `npm test`: **160 passed**, zero failures.
- Production-step gameplay browser suite: **9 passed**, zero page errors.
  Easy ramp, cliff and realistic ramp launches reach flight; pilot pose toggles
  and the overhead flight reaches a judged outcome. A hands-off crash is a
  completed adjudication in that last test, not a successful-landing claim.
- Alternate-mode/fallback suite: **9 passed**, zero runtime/shader errors.
  Original flight model, skim assist, portrait resize, missing prepared forest
  mips, missing forest/elevation/materials, failed cloud LUT, failed cloud shape,
  and missing lakeside GLB all retain a rendered, launchable scene. Both cloud
  failure cases actually ran; no float-target capability skip occurred.
- Six high-quality gallery views: zero runtime/shader errors.
- Low→medium→high cloud bounds: 320×200 / 480×300 / 640×400. Portrait 390×700
  produces a 224×400 cloud target. Water reflections disable on low and use
  320×200 / 512×320 on medium/high.
- Audio starts without a context. A trusted key unlocks it; mute releases the
  valley layer's nodes and resume restores eleven persistent nodes. No audio
  errors. This checks lifecycle, not subjective listening quality.

[Gameplay log](gameplay.log), [fallback log](fallbacks.log) and
[quality/audio observations](quality-audio-checks.json) retain the evidence.

## Rendering cost and limits

The renderer is **ANGLE SwiftShader**, a CPU software renderer. These are work
counts, not native GPU timings or frame-rate guarantees. Render counts include
the beauty, shadow, finishing and optional reflection work for that draw.

| View | Draw calls | Submitted triangles |
| --- | ---: | ---: |
| Boathouse | 201 | 5,771,396 |
| Lakeside | 191 | 6,069,351 |
| Refuge | 244 | 5,711,917 |
| Departure and each daylight comparison | 301 | 1,293,995 |

Dense nearby vegetation dominates close geometry. Cloud ray marching adds
fragment work that these triangle counts cannot describe. The isolated high
cloud study took about 1.8 seconds per synchronized SwiftShader frame; it is not
a performance result for a native GPU or the complete scene.

The planar reflection is bounded and updates below the main frame rate. It
reflects geometry and the clear sky, but omits volumetric clouds. Clouds assume
the flight remains below the cloud layer. Surface aerial perspective remains an
analytic approximation informed by the sky probe. The 3× diffuse probe gain is
explicit artistic fill, not complete cloud/terrain multiple scattering. Water
adds no swimming or buoyancy simulation. Native GPU profiling, moving-camera
temporal quality and audible sound review remain necessary.

## Reproduce

```sh
node server.mjs 4281
npm test
CHROME_PATH=/path/to/chromium node tools/range-check.mjs \
  --url http://127.0.0.1:4281 --quality low --deterministic
CHROME_PATH=/path/to/chromium node tools/range-visual-check.mjs \
  --url http://127.0.0.1:4281
CHROME_PATH=/path/to/chromium node tools/range-capture.mjs \
  --url http://127.0.0.1:4281 --view boathouse,lakeside,refuge,departure \
  --quality high --out work/living-valley
CHROME_PATH=/path/to/chromium node tools/range-capture.mjs \
  --url http://127.0.0.1:4281 --view departure --light late-sun \
  --quality high --out work/late-sun.jpg
```
