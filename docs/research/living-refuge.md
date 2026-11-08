# A refuge that looks occupied

The existing illustrated-alpine concept guides the materials and scale: weathered
timber, terracotta, sage herbs, cream linen and restrained warm accents. This small
kit adds evidence of everyday use without introducing decorative people or another
building footprint.

- A wood stove sends a small, slowly drifting plume from the existing chimney cap.
  Twenty-four overlapping camera-facing wisps use a soft, procedural density mask,
  grow and disperse over a fixed lifetime, and follow the same supplied world wind.
- Three pieces of drying linen hang from a sagging side-yard clothesline. Top
  vertices remain pinned to the rope; only the free hem and body respond to wind.
  Folded geometry, contrasting hems, clothespins and derivative-filtered weave make
  the movement belong to a constructed object.
- Two raised planters hold herbs and flowers. Pots and a watering can show that
  these are tended plants. Their footprints are provided separately for the shared
  botanical mask.
- Enamel mugs, a pot and scored bread sit on the actual existing picnic tabletop.

All geometry and shader code is original. No external texture, model, runtime
dependency or network access is added. Static objects, foliage and linen are merged
by material, plus one fixed smoke draw. Quality reduces smoke count to 18/12 at
medium/low; distance culling bounds the whole small site. Update changes only
existing uniforms and visibility, with no per-frame particle spawning or geometry
allocation. Resources are explicitly owned and disposed once.

The cabin floor, picnic tabletop and chimney origin are recomputed from the same
local coordinates and actual ground-height source as the established prop kit.
Nothing enters the physical collision world. Focused tests verify those anchors,
flight clearances, fixed geometry under animation, pinned cloth weights, quality
limits and resource lifetime. In-game screenshots remain the visual acceptance
check.
