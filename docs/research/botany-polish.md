# Botanical form and colony refinement

The accepted alpine rebuild exposed broad, angular grass strips and identical mixed
flower bouquets in close captures. This pass refines the actual opaque geometry,
using the previously [reviewed grass/botanical references](vegetation-rebuild.md).
No external models, textures or shader source are imported.

Near grass now uses twenty-one finer blades in three crowns. Six curved spans follow
upright basal growth through an arch into a hanging tip. Green root shade, occasional
brown blades, warm arching shoulders and a small side sweep vary the silhouette
and pigment. Shoulder widths preserve flowing golden volume after the initial
thinner version looked too sparse in production captures.
Eleven-metre world-space colony fields give neighbouring clumps related height and
sage/straw balance. The same mowing, terrain, rock and path masks still apply.

White flowers have cupped rounded petals and raised ochre centres; purple salvia
has bell florets, bowed stems and smaller cool sage leaves. A scalar vertex tag
marks the two flowering species. The existing cover shader favours each species
in stable world-space drifts and keeps the basal foliage, so every plant no longer
shows the exact same mixed bouquet. Species growth also scales its wind response,
preventing suppressed flowers from becoming floating fragments.

Low foliage uses three interlocking rosettes with rounded folded leaves. Its wide,
low canopy fills between the tall blades in both meadow and woodland, with coherent
colonies, lower growth on mown ground and the same footprint exclusions. The first
visual review showed that finer grass alone exposed too much soil; this basal layer
restores opaque volume at a different scale. It reuses the existing herb batch.
Fine UV-aligned midribs, side veins and restrained pigment/grain break up smooth
leaf shading. Screen derivatives soften that detail with distance; the shader
applies it only to basal foliage, preserving the white and purple flower colours.

The high/medium/low grass capacities are 3000/1200/250. A dense flat fixture uses
approximately 1.182M/492k/98k total cover triangles, compared with the previous
713k/304k/69k. Grass supplies 231 triangles per clump, low rugs 288, flowers 960
and oat stalks 140. Rug capacities are 600/260/40; density and distance bands keep
that extra opaque coverage near the camera. All three use six occupied meadow
batches; fixed buffers, bounded near/far caches, no shadow submissions and opaque
surfaces are retained.

Ground-cover tests verify deterministic placement, bounded geometry, actual physical
height, protected markings, shared material lifetime, quality transitions, stream
bounds, mowing and dry/wet differences. Visual acceptance uses the parent task's
fresh production renderer captures; CPU geometry tests do not establish appearance
or native GPU performance.
