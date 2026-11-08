# Photographic daylight

## Four-kilopixel photographic sky

`sunflowers_puresky_4k.hdr` is **Sunflowers (Pure Sky)** from Poly Haven / HDRI
Haven, released under CC0 1.0 / public domain. Its genuine 4096 × 2048 RGBE
panorama supplies both the detailed cloud sky and its lighting. The runtime
averages its linear floating-point radiance down to 1k before baking the PMREM
and integrating the diffuse spherical-harmonic light probe. The diffuse light,
reflections and directional key agree with the visible 4k sky. Rough terrain
receives the probe's diffuse illumination without sampling the reflection map.

- Original asset: <https://polyhaven.com/a/sunflowers_puresky>
- Downloaded mirror: <https://raw.githubusercontent.com/theRealUnd3rdog/Godot_Noshot_Controller/main/assets/hdris/sunflowers_puresky_4k.hdr>
- Original file: 21,248,671 bytes, unchanged.
- Verified Git blob: `786367967e8445fa9f7c492dd0b64c795009c7a3`
- SHA-256: `d5bd90316896c6f9619f19752590f1ccac7b7190032aea28b808ccdbbc3b590e`

- Asset license: <https://polyhaven.com/license>
- CC0 terms: <https://creativecommons.org/publicdomain/zero/1.0/>
- Authoritative license-page source: <https://github.com/Poly-Haven/polyhaven.com/blob/master/public/locales/en/license.json>

The HDR loader is the official Three.js **r180** `HDRLoader.js`, with its import
adapted to the local vendored Three.js module. Three.js is MIT licensed; its
license is retained at `range/vendor/THREE-LICENSE.txt`.

- Loader source: <https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/HDRLoader.js>
