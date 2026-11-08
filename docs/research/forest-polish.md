# Forest stand and crown polish

This pass addresses the repeated upright tree dots visible in the preceding
`docs/graphics/alpine-rebuild/departure.jpg`. The concept uses recognizable dark
conifer masses, warmer broadleaf groups and a range of foreground tree ages.

## Changed construction

The existing integrity-pinned MIT EZ-Tree generator and textures remain the
source; no new texture license or external runtime request is introduced. Its
exact author package, revision and checksums remain in `range/assets/forest`.

Pine and fir sources now have broader, lower bough skirts, fewer woody branches,
smaller needle shoots and more shoots per branch. This preserves dense branch
surfaces with fewer giant cutout cards. Ash uses smaller leaf clusters. All four
near/mid meshes and every albedo/normal view were rebuilt together, followed by
the tile-isolated, alpha-preserving linear mip chains. The original per-variant
22k near-triangle bound and 32% mid-LOD bound still hold.

Planting uses irregularly warped strata rather than lightly jittered rows.
Broad stands include sinuous openings and clustered regeneration pockets.
Species and age now belong primarily to those spatial cohorts: golden broadleaf
masses have recognizable outlines, and new growth is shorter than mature stands.
Rare mixed neighbours remain. A second review of the game captures revealed
too many exposed tall pine trunks near the clearing, so those edges favour
fuller fir and lower young trees. Small seeded regeneration groups fill the
space beneath mature boughs, using the same physical clearance checks and
existing geometry. The default field contains about 56k trees including 4.5k
understorey trees, down from about 63k, with substantially wider age variation.
No additional draw batches or per-frame texture loads are required.

Actual placed crowns continue to rasterize the shared coverage field and drive
the canopy shadow map. Forest clearance, sorted cell culling, stable instance
transforms and original atlas view selection remain in place.

## Verification

The source geometry/atlas/mip provenance and bounds tests pass. A statistical
field test verifies that nearby crowns share species and age more strongly than
widely separated trees; this would fail for independent per-tree scatter. The
clearance tests also check that regeneration remains a bounded lower layer
beside real parent crowns and follows the same terrain/flight exclusions. The
GPU verification tool checks rendered atlas normals and cutout coverage. Parent
captures compare the current crowns in the actual game before visual acceptance.
