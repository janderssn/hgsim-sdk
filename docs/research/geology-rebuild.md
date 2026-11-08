# Launch geology and rock research

Reviewed on 2026-11-08 for the illustrated alpine concept in `docs/concept/illustrated-alpine-polish.png`.

## Primary code references inspected

- [Three.js procedural terrain example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_geometry_terrain.html): sampled coherent multiscale height displacement on an indexed plane. Its smooth, scale-separated height approach informed the ridge apron; its geometry is not imported because this game's rendered and physical ground must share exact vertices.
- [Three.js normal-map example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_normalmap.html): shows the material response of geometric normals plus normal detail, useful for diagnosing the former hard-faced triangle shading. Broad rock shape now comes from welded normals and silhouette rather than relying on a normal map to disguise coarse triangles.
- [Three.js dynamic instancing example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_instancing_dynamic.html): one geometry/material per instance batch and composed transforms. Four rock variants each use a single `InstancedMesh`; placements are static so their matrices do not upload per frame.
- [Three.js license](https://github.com/mrdoob/three.js/blob/dev/LICENSE): MIT. The existing vendored Three.js remains the only external runtime dependency of these new modules.

The three example HTML sources and MIT license were retrieved from `raw.githubusercontent.com` and inspected. The source links track upstream development and are references, not pinned dependencies. The implementation itself is original, using the repository's vendored Three.js geometry and rendering APIs.

## Asset search and choice

Poly Haven's models API (`https://api.polyhaven.com/assets?t=models`) and the public Three.js example host were attempted. This environment's network proxy returned `403 Forbidden` for those hosts; GitHub raw source was accessible. No unreachable model is represented as downloaded or integrated, and no external rock license is presumed.

The new rock kit is authored locally in `range/lichen-boulders.js`. Four rounded granite variants start from Three.js `IcosahedronGeometry`, weld shared vertices, deform coherent broad shapes, and compute normals that preserve sharp fractures while averaging weathered facets. The final material reuses the repository's existing CC0 Rock26 scanned albedo, normal and roughness textures through the granite material's triplanar projection. Albedo is restored to startup because the close hero rocks now need it. The precise source package, pinned commit, conversion and limitations are recorded in [scanned asset credits](../../range/assets/materials/scanned/CREDITS.md). Irregular multiscale value noise adds small ochre lichen colonies and sheltered moss while preserving the scanned mineral surface. No external service download is required at runtime. Texture ownership remains with the shared surface library; each rock kit owns and disposes only its cloned material and geometries.

## Implemented design

The reference relies on rounded individual blocks framing a usable launch preparation area. The former back apron had only nine depth rows, linear crest peaks and a separate face normal on every triangle. This combination produced giant pyramids under the props.

The apron now has more depth samples, eased crest changes, coherent small relief, and a broad physically level staging centre at 250.5 metres. The walking shelf and rock collision still consume exactly the same Float32 triangles as drawing. Area-weighted vertex normals remove triangular lighting seams without changing contact positions. Decorative boulder groups sit beyond the staging furniture and outside the launch routes; they add four opaque instance draws. They do not introduce new physical collision objects.

Validation checks include exact raycast/contact agreement on the connected escarpment, launch edge/support clearances, finite welded boulder geometry, fixed draw/triangle bounds, placement outside furniture/trail masks and a low-slope preparation shelf. Final visual comparison is performed by the main agent using production game rendering.
