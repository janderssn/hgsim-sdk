# Willow Tarn: a destination in the valley

The existing alpine concept places a lake beyond the meadow and combines crafted
timber with irregular shores. A terrain survey found a closed western basin rather
than requiring a floating water plane or a new hill-shaped reservoir.

The water level is 2.15 metres in world coordinates. Its connected surface covers
about 55,039 square metres, with a maximum depth of 1.04 metres. This is a shallow
natural tarn, not a deep glacial lake. The mesh is clipped against the same 240-cell
Float32 terrain triangles that the game draws. Flooding follows connected wet
triangle edges; disconnected depressions and the landing field remain dry. A shared
exclusion function reserves the water and a narrow bank for forest and ground cover.

Depth-dependent bed/teal absorption and derivative-filtered animated ripple normals
give the water changing highlights. The first real capture revealed that the sky
environment alone left the surface looking like a bright swimming pool. The
revised water therefore adds an explicitly bounded planar scene reflection with
angle-dependent Fresnel blending. Fine ripples use three warped directions and
much smaller slopes, avoiding the former regular fabric-like waves.

One mirrored geometry pass is capped at 512×320 high / 320×200 medium and disabled
at low. It updates at roughly 7/4 Hz when the camera moves, at a slower cadence
when stationary, and immediately on large camera changes. It reuses the existing
scene LOD and shadow maps, excludes near ground cover and the water itself, and
uses an oblique near plane to remove underwater terrain. The reflected sky uses
the same clear-sky LUT shader when the advanced provider is active; dynamic
volumetric clouds are not reflected because their temporal history belongs to the
main camera. There is no screen-space refraction, underwater gameplay or caustic
light projection onto external geometry. These are deliberate limits rather
than claims of a complete water transport simulation.

A boarded jetty, short rail, bench, mooring rope, irregular stones and moving reeds
form a place to pause. A short boardwalk connects the separately Blender-authored
boathouse. The separate rowboat model mounts at an animated waterline anchor. Shore
animation uses shared shader uniforms and one bounded boat transform, with no
geometry rebuilding or per-frame particle allocation.

## Source and integration

- Inspected the official [Three.js r180 Water](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js)
  for its normal distortion, Fresnel and reflected-sky construction. The planar
  camera/oblique-clipping math is adapted from Three.js r180 Water/Reflector; its
  MIT notice remains in `range/vendor/THREE-LICENSE.txt` and is cited in source.
  No external normal texture is used.
- All shore geometry and ripple/absorption code in `range/alpine-waterscape.js` are
  original. The renderer receives the caller-owned HDR/PMREM environment.
- Root integrates `alpineLakeExclusionAt` before forest generation and in cover
  ecology, then constructs `createAlpineWaterscape` and calls `update` with the
  camera position, elapsed seconds and wind. Before the main beauty draw, call
  `renderReflection(renderer,camera,{seconds,renderSky})`; `renderSky` draws into
  the caller's current target and must not update the main cloud temporal history.
  The method restores target, viewport/scissor, clear state, tone mapping, XR,
  cached-shadow update state, shared atmospheric camera and hidden visibility,
  including when a render throws. `boatAnchor` accepts the Blender boat
  at local waterline zero. The suggested shore camera is (-374,7,137), aimed at
  (-350,2,215).

Tests check connected shoreline/contact agreement, target/thermal exclusions,
upward water normals, fixed geometry through quality/animation, resource ownership
and disposal, reflection clip-space geometry, quality caps, scheduling and render
state restoration. Appearance and shader execution still require an actual scene capture.
