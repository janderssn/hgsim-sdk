# Billow lighting and layered aerial perspective

This refinement responds to the actual `alpine-rebuild` captures: clouds had broad
rounded rectangular envelopes, weak face lighting and pink/grey flattened colour;
distant mountain faces were compressed into almost the same cyan value.

## Cloud structure

The cloud medium is now a true three-dimensional union of unequal ellipsoidal
billows. Each of the eleven persistent banks comprises two low broad puffs and
seven rising puffs with different heights, widths and depths. Five smaller
connected shoulders on each rising puff sharpen the scalloped outline and break up
the smooth balloon appearance. A narrow, smooth density falloff joins them. This removes the vertically extruded weather mask, which still
produced cuboidal columns when its horizontal footprint was made more irregular.

The field is baked once into a 256×32×256 RGBA texture, covering the 12.8 km periodic
world and the 2.3–3.4 km cloud layer. The anisotropic grid resolves horizontal shape
at 50 m and vertical shape at about 34 m. Density occupies R; its outward gradient
normal occupies GBA. Gradients account for those unequal voxel dimensions. The sun
optical-depth map integrates the same trilinearly sampled medium, preserving wind,
world-space cloud shadows and cloud/self-shadow agreement.

Exposed convex faces and silhouettes receive light from the same sun direction as
the scene. The renderer retains optical-depth self-shadowing and uses normals for
broad warm faces and narrow sun-facing rims. This is an art-directed approximation
to cloud multiple scattering, not a radiometrically validated cloud solver.

The volume occupies 8 MiB. In the occupied ray samples, two 3D texture lookups fetch
density and normal; self-shadow samples require one density lookup. The former
weather-plus-shape density needed two lookups before lighting. There are no analytic
billow loops in the shader, additional draw calls, ray steps, per-frame CPU bakes or
runtime dependencies. Cloud rendering remains capped at 640×360/48 steps in high
quality, with the existing cheaper medium/low paths. A local Node measurement on
this runner took 102 ms to bake the volume and 57 ms for the 128×128 sun-column
map. The obsolete weather texture, uniform and CPU bake are removed. These are
startup measurements, not GPU frame-time claims.

## Atmosphere

The earlier distance compression multiplier was 5.5, which erased useful snowy
ridge modelling. It is now 3.4 with a less cyan inscatter tint. The same smooth
700–3000 m transition preserves nearby gameplay contrast and separates increasingly
distant layers. CPU and GPU use the same path integral; continuity and reciprocal
path checks remain in place.

## References and checks

The existing [source-checked atmosphere research](lighting-rebuild.md) remains the
reference: Three.js Sky for scene/sky light coherence and Takram for consistent
atmospheric/cloud integration. No third-party shader or artwork is copied here.
All 14 atmosphere/finishing checks pass, including periodicity at occupied points
and agreement between density integration and the baked shadow map. The final
[departure](../graphics/alpine-polish/departure.jpg),
[meadow](../graphics/alpine-polish/meadow.jpg),
[refuge](../graphics/alpine-polish/refuge.jpg),
[staging](../graphics/alpine-polish/staging.jpg) and
[aircraft](../graphics/alpine-polish/aircraft.jpg) browser captures were visually
reviewed. They show connected, scalloped masses, warm exposed faces, slate bases
and clear blue gaps. No planar volume clipping or blocking silhouette aliasing
was visible. The cloud pass remains intentionally soft at its bounded resolution.
