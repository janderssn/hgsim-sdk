# Refuge and launch-kit polish

This pass was reviewed against the existing illustrated alpine concept and the
`alpine-rebuild` in-game captures. The work addresses flat yellow windows,
checkerboard roof colour, flat cloth and missing construction detail.

- Window glass is recessed behind thick timber surrounds, projecting sills,
  rain caps and independent mullions. Each pane retains its own UV rectangle.
  Opaque glazing uses a dark room/curtain treatment and view-dependent blue sky
  reflection, avoiding transparent-batch sorting. This is an authored glass
  approximation, not traced interior or reflection geometry.
- Roofs use a closer slate palette and restrained per-tile variation, with dark
  fascia, projecting rafter tails and a layered underside. Moss is sparse.
- Doors have recessed panels, straps and separate handles. A wall lantern and
  modest stacked-firewood cluster add visible use without filling the yard.
  Logs have separate cut ends, actual split geometry, bark furrows and filtered
  growth rings.
- The awning has nine curved cross-sections with gravity sag and small irregular
  fabric deformation; existing wind motion still uses the production clock.
- The kit retains four shared materials and twelve static/instance draws.
  Geometry and instance-buffer ownership are verified by disposal checks.

All geometry, textures and shaders added here are original, built with the
existing vendored Three.js. No external model, texture or runtime dependency
was added. Existing reference and license research remains in
[prop-rebuild.md](prop-rebuild.md). The parent agent performs final WebGL and
in-game capture review alongside the other scene changes.
