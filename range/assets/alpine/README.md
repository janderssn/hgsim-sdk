# Original alpine models

The library contains three detailed spruce species variants, two granite boulders,
a cairn, trail sign, equipment crate, and alpine refuge. All models and tree
textures are original and generated from the repository's Blender source.

## Rebuild

```sh
blender --background --python-exit-code 1 --python tools/build-alpine-assets.py
```

Blender 4.3 or later with Cycles CPU renders the tree atlas without a desktop/GPU.
The builder writes a preview to `/tmp/alpine-spruce-preview.png`, then bakes four
azimuths for each species into a 2048×2304 transparent atlas. It creates bark colour
and normal maps and embeds WebP versions of all textures into `environment.glb`.
Authoring PNGs are ignored because they are packaged inside the GLB. After a full
bake, `-- --reuse-atlas` skips rendering for a geometry/material export iteration.

## Rendering contract

Each close tree has 15,158 individual needle faces and 3,498 woody branch/trunk
triangles. Runtime limits these meshes to 80/60/35 m according to rendering quality.
Distant trees use camera-facing two-triangle cards, selecting the closest of four
baked views per instance. The cards use alpha testing and depth writes, so forest
layers do not need transparent sorting. Near branches are never submitted for a
distant tree. Geometry/materials are shared across nine instanced draws.

Named roots, Y-up metre coordinates, needle colours and UV maps are consumed by
`environment-models.js`. Normalized RGBA8 vertex colours reduce asset size while
positions and normals retain full precision. Existing flight physics and the
hang-glider rig are not part of this library.
