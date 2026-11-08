# Flight corridor forest

Four individually seeded, full-crown trees authored after the
[flight corridor concept](../../../docs/concept/flight-corridor-target.png):
mature alpine pine, young alpine pine, silver fir form, and green mountain ash.
The shared needle texture suggests an alpine conifer rather than strict botanical
identification. Tree origins are at ground, coordinates are Y-up, units are metres.

Each tree has a detailed mesh and a reduced mesh built from the **same branch
skeleton and leaf placements**, plus 32 spherical impostor views: eight azimuths
at 0°, 30°, 60°, and 90° elevation. True overhead canopy views matter when flying.
Near/mid geometry counts and measured crown dimensions live in `forest.json`.

The albedo atlases contain diffuse colour and direction-independent canopy
cavity, with **no studio key light**. Companion normal atlases store tree-local
Y-up normals in linear RGB. `range/forest-models.js` supplies MeshStandardMaterial
impostors that reconstruct world-space normals from the original instance yaw.
SH/HDR/direct sunlight, shadows, cloud shadows, and aerial perspective therefore
continue to operate at every distance. The vertex shader chooses the view from
the current render camera, including an orthographic light camera. Neighbor views
use stochastic selection and explicit texture gradients to preserve cutout detail.

Keep the original tree transform on far instances. Do not rotate instances toward
the player camera. Assign the variant's `impostorDepthMaterial` and
`impostorDistanceMaterial` to the corresponding instanced mesh. The spherical
quad's centre is created in the vertex shader; use manifest bounds when culling.

## Rebuild

No npm install is required. Node 22+, curl, tar, and a Chromium with WebGL2 are
needed only for authoring:

```sh
node tools/build-forest-assets.mjs --fetch-textures --geometry --bake
node tools/build-forest-assets.mjs --verify
```

Set `CHROME_PATH` when Chromium is not in a standard location. Cloud execution
uses the existing `/workspace/.hgsim-environment/bin/benchmark-chromium` wrapper.
`--verify` renders instanced mesh/card pairs in perspective and directly overhead,
including the card's real directional-shadow pass. Review images are written to
`work/forest-perspective.jpg` and `work/forest-overhead.jpg`. `species-preview.jpg`
is a neutral, physically lit contact sheet; it is not a gameplay screenshot.

The build runs entirely against locally vendored Three r180. The game downloads
only same-origin generated assets; it has no authoring-library/npm/CDN dependency.

## Sources and licensing

Tree generation: Daniel Greenheck, [EZ-Tree](https://github.com/dgreenheck/ez-tree),
MIT, revision `dcf309bd86bd521083d9c70f01f2de45fdc7c457`. The minimal adapted
source and changes are in `tools/vendor/ez-tree/UPSTREAM.md`.

Leaf and bark texture images: Daniel Greenheck's published
[`@dgreenheck/ez-tree@1.1.0`](https://registry.npmjs.org/@dgreenheck/ez-tree/1.1.0)
MIT package, extracted unchanged from its embedded image data. The package's
license is included as `EZ-TREE-LICENSE.txt`. We attribute these particular bark
images to that MIT bundle; we do not relabel them as the newer upstream Bark00x
CC0 image sets. Both leaf image SHA256s exactly match the later pinned source
revision's Git LFS object IDs. Image checksums are in `forest.json`; the build
script checks the npm tarball SHA512 before decoding individual images by SHA256.

Pinned package integrity:
`sha512-6pvS6hD6B6h00dm0SnkgYeT4ABU5Y1Z9M44p1tXiV5C0eKrQy2sKECXshoaUv0qAOqYVL68w/PwadUxDFDiHUg==`.

Generated tree geometry, canopy cavity, atlases, and integration are hgsim work.
