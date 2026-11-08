# Blender-authored lakeside kit

Original boathouse and rowboat modelled in Blender 4.3.2 from the project's
[focused concept](../../../docs/concept/lakeside-boathouse.png). The preview is
a Cycles asset-review render, not an in-game screenshot.

- `lakeside.blend` is the editable source scene, including materials, UVs, actual
  bevelled/planked geometry and the review camera/light. Its boat is moved beside
  the house for inspection. Mesh batches retain disconnected board/trim islands
  that can be selected and edited in Blender.
- `lakeside.glb` is the production Y-up, metre-scale library. Both named roots
  have zero location: `LakesideBoathouse` faces local -Z, with the floor datum at
  Y=0; `LakesideRowboat` has its waterline at Y=0. The positive-Z stern painter
  attachment is approximately `[0, .42, 1.82]`.
- The house has a real framed shell with recessed window openings, separate
  planks, door braces/hardware, slate layers, rafters, stone footings, porch,
  flowerbox, hanging mountain/lake sign and firewood stack. The open clinker hull
  has curved overlapping strakes, ribs, gunwales, thwarts, oars, oarlocks and rope.
- Runtime geometry is merged by material and root: **39,420 triangles, 17 mesh
  batches**. Mesh/material attributes are retained by the glTF loader.

Rebuild from the repository root:

```sh
blender --background --factory-startup --python tools/build-lakeside-assets.py -- --render
node --test tests/lakeside-models.test.mjs
```

`--render` adds a 48-sample CPU Cycles review image. The model/texture builder
uses fixed seeds. Checksums, local bounds, triangle counts, source texture hashes
and transformations are recorded in `manifest.json`.

## Texture provenance

The wood and stone materials reuse the retained **Planks21** and **Rock26**
colour, normal and roughness maps. Their immutable upstream source, source hashes,
normal-map convention and license qualification are in
[the scanned texture manifest](../materials/scanned/manifest.json) and
[credits/source notice](../materials/scanned/CREDITS.md).

The upstream README declares the package **CC0-Textures**, but provides no
standalone per-material license or verified author mapping. This qualification
is preserved; these assets are not represented as a new scan or as independently
verified ambientCG material IDs.

For this kit, source maps are resized to 512×512 PNG. Albedo derivatives retain
the photographed luminance/grain and apply explicitly recorded timber, red paint,
teal paint, hull, slate and granite pigments. Normal vectors are renormalized
after resizing; the source OpenGL convention is retained. Roughness companions
are retained. These are authored PBR derivatives, not unmodified source colours.
The geometry, iron, rope, plant forms and sign motif are original project work.

The .blend packs the PBR PNGs; the GLB embeds its textures. Runtime loading makes
no requests to an external texture or model service. The optional adapter returns
`null` on missing/invalid assets so the physical lake and dock remain available.
It releases only its imported geometry, materials and textures; a supplied sky
environment remains caller-owned.
