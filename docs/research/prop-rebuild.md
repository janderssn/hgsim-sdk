# Alpine prop rebuild references

Reviewed 2026-11-08 against `docs/concept/illustrated-alpine-polish.png` and the actual staging capture. The original route board used colored triangle symbols, straps were solid boxes around each bag, storage had no construction detail, and the ground made everything stand on high legs. These visual problems require authored forms and placement, beyond another color adjustment.

## Primary sources reviewed

- [Three.js RoundedBoxGeometry](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/geometries/RoundedBoxGeometry.js), MIT. The source demonstrates physical edge rounding with correct surface coordinates. The local kit retains its own inexpensive beveled construction for timber rather than adding a React or editor dependency.
- [Three.js TubeGeometry](https://github.com/mrdoob/three.js/blob/dev/src/geometries/TubeGeometry.js), MIT. Reused through the existing vendored Three.js API for real curved rope coils, handles, and sewn seams. Catmull-Rom center lines give these parts a convincing silhouette at walking distance.
- [Drei RoundedBox](https://github.com/pmndrs/drei/blob/master/src/core/RoundedBox.tsx), MIT. Reviewed as a mature example of reusable geometry and material separation. No Drei source was copied or new React dependency introduced.
- [Three.js license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) and [Drei license](https://github.com/pmndrs/drei/blob/master/LICENSE) were fetched and read with the sources above.
- Poly Haven weathered wood candidates (`wood_planks_grey`, `wood_floor_deck`) and the license page were attempted. This environment returned proxy HTTP 403 for the API and website. No inaccessible texture was used or given invented provenance.

## Implemented assets

All newly authored geometry and map/brush imagery are original repository assets. The route-board texture is generated from a 65 × 65 sample of the same physical ground height used by gameplay, with ten-metre contour bands, trails, launch label, actual site positions, landing rings and a north arrow. One 384 × 256 RGBA texture is shared by all boards and disposed by the kit. It replaces the old triangle picture.

The bags now have curved cloth ends and folds, narrow conforming webbing, raised buckles, carrying handles, sewn seams and luggage patches. Travel trunks have a separate lid seam, corner protectors, rivets, clasps and recessed handles. A coiled rope drapes off the launch bench; bench construction has cross-bracing and visible bolts. Timber brush data includes knot rings, longitudinal cracks and stronger grain; paint wear exposes warm wood along edges. Individual roof shingles have irregular lengths and dark end thickness, shutters have angled slats and hinges, and flower boxes have leaves and blossoms instead of blocks.

The kit remains statically batched. The final four-site implementation submits 40,810 triangles across 12 draws including 55 instanced trail stones. The moved hillside refuge includes an individually coursed stone retaining foundation, accounting for most of the added geometry. Flight collision is unchanged by these prop modules. The scene-composition pass moves the refuge alongside the descent corridor; maps now draw the shared ALPINE_TRAILS data so future site changes do not leave stale route art. The geology module separately gives the staging site a shared physical/rendered shelf so its supports can stay grounded without becoming stilts.

Visual review caught a mirrored route map and an intermediate rotated mapping. The final UVs are derived from board-local x/y after the general timber mapping, and the test checks the resulting world-space batches for left-to-right text and world-up alignment at all four site rotations. The final timber uses broader weathering bands, normal relief, variable plank pigment, paint loss at the ends and ten courses of irregular overlapping slate.
