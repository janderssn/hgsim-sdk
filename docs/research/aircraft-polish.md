# Aircraft presentation polish

The concept shows a readable warm jacket, darker flight equipment, stitched orange
cloth and real harness construction. The previous rear chase view compressed a
single teal silhouette into what looked like an upright stick.

The pose was measured before changing it. In the actual GLB and production rig,
prone head-to-foot displacement is about 1.45m along the wing and 0.30m vertically.
That is a prone body; changing bone angles to disguise the camera foreshortening
would damage the established bar attachments and launch animation.

## Implemented

- Original rest-space jacket/olive-pod pigmentation, cloth fold modulation,
  jacket hem and pod seam, attached to the skinned body.
- A compact padded harness backplate, two pockets, shoulder webbing, buckles,
  zipper and sewn crest, attached to the existing chest bone.
- Helmet ventilation, rear safety stripe and chin straps; separate boot heel
  surfaces and tread rows. Equipment remains inside the original foot envelope.
- Pale outer sail flashes, subtle panel tension, existing stitched albedo and
  restrained thin-cloth transmission inside the ordinary shadowed direct-light loop.

The equipment is original procedural geometry in `range/pilot-detail.js`. It adds
five material/bone batches and fewer than 5,000 triangles. No source model, skin
weights, attachment metadata, bone names or flight parameters are changed. No new
external assets or runtime dependencies are introduced.

The work uses the existing vendored Three.js `MeshStandardMaterial`, indexed
geometry, bone matrices and the physical light-loop contract. Those sources retain
their existing MIT license. The shader is an original extension; direct-light
transmission is a small visual approximation rather than calibrated cloth optics.

## Correctness fix and validation

`addSailFlutter` previously cloned the material and replaced `onBeforeCompile`,
which discarded preceding material hooks. It now calls the original cloth/lighting
hook and includes its program key before installing flutter. The atmospheric
installer already detects a generated aerial program and avoids duplicate injection.

Five focused tests pass. They load the actual GLB, confirm all 19 bones have exactly
the same matrices as the unmodified rig through prone/upright/running/weight-shift
poses, verify bone attachment and geometry budgets, exercise quality reuse, and
check cloth, lighting and flutter shader-hook composition. Parent performs browser
shader compilation and actual screenshot review.
