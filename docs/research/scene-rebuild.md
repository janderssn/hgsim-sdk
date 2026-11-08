# Alpine scene rebuild

The visual reference is `docs/concept/illustrated-alpine-polish.png`, generated before
modelling. It guides foreground composition, warm plant groups, weathered construction,
orange sail, cool distant ridges and snow. It is concept artwork, not a game capture.

## Research applied

- [SimonDev Quick Grass](https://github.com/simondevyoutube/Quick_Grass): instanced near/far blades, upward-biased normals and wrapped lighting. See [vegetation source/license review](vegetation-rebuild.md).
- [Three.js terrain example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_geometry_terrain_raycast.html): geometry/height correspondence and terrain surface construction. Inspected source; no code copied.
- [Takram atmosphere](https://github.com/takram-design-engineering/three-geospatial/tree/main/packages/atmosphere): a consistent sky/light/aerial model. See [lighting source/license review](lighting-rebuild.md).
- [Three.js geometry and instancing references](geology-rebuild.md): shared contact mesh, smooth rock normals and bounded instanced boulder kit.
- [Three.js/Drei construction references](prop-rebuild.md): crafted timber and geometry construction. The kit and route texture are original; source licenses do not imply a license to unrelated sample art.
- [USGS/Jaanga elevation asset](../../range/assets/terrain/SIERRA.md): retained public-domain Sierra Nevada data supplies a sharper mountain skyline. The attempted Teton tile did not exist. Interpolated voids are explicitly marked.

## Scene decisions

The former back apron was a few enormous shaded triangles. It now has a worn
preparation shelf, smoothly connected rock relief and local boulder clusters.
Boulder footprints also mask the streamed plants, so cover does not grow through them.

The refuge is on the right hillside at (-76,-360), visible on descent. A level physical yard with a smooth surrounding bank provides
usable ground; its actual height samples support a stone retaining foundation, and shared trail data drive
both access paint and the route-board texture. The target stays open.

The botanical texture repeats at six metres rather than eighteen: its depicted
plant forms now have a scale closer to the geometry. Snow previously started
above the highest summit, so none appeared; it now gathers on sheltered high shelves.

Captures use the production renderer and assets. `departure` uses the actual
chase camera; the close views use explicit inspection cameras. Native GPU frame
rate has not been measured. Higher cover density increases geometric work; it
is not a performance claim.
