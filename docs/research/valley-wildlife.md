# A little life in the valley

The existing alpine concept was inspected before modelling. Its inhabited meadow,
woodland and open flying space suggest quiet natural movement, not bright ambient
particles. `valley-wildlife.js` replaces the old thermal-marker V lines with
original modeled silhouettes and adds small local movement around the refuge and
tarn. No downloaded wildlife assets or new texture licenses are involved.

Six broad-winged raptors circle the real thermal at different radii and heights.
Cambered, tapered wings have separated outer primaries; bodies, pale breasts,
heads, beaks and tails remain readable at closer flight distance. They mostly
soar, with short bouts of wingbeats. Their paths retain the thermal cue instead
of wandering into unrelated decorative flocks.

Up to three smaller fork-tailed swallows skim a bounded area near the lake. Up to
four butterflies inhabit each of two small colonies: the refuge's tended western
flowerbed and a dry bank pocket beside the jetty. Their total wingspan is about
7–10 cm. Rounded fore/hind wings, muted ochre markings and a dark body use opaque
geometry with ordinary lighting; there are no glowing sprites or additive trails.

All wildlife uses three fixed instanced batches and **4,382 triangles at the
maximum population**. Wing flex happens in the vertex shader, with matching
normal rotation. The CPU reuses its transforms and existing instance arrays;
there are no per-frame vector or geometry allocations. World-space distance
fades shrink tiny silhouettes before whole distant batches stop submitting.
The birds and insects receive the shared atmosphere/material treatment. Their
decorative motion does not add collisions or alter the thermal forces.

Medium retains four thermal birds, two swallows and four butterflies spread
between both colonies. Low retains three thermal birds and removes the local
wildlife. Geometry/material/instance resources are owned by the returned kit and
released once by its idempotent `dispose()`.

Tests cover actual model/instance budgets, finite geometry, natural insect scale,
bounded thermal and ground-relative flight paths, deterministic timing, fixed
buffers, culling, quality reductions, shader composition and resource disposal.
Actual in-game appearance is reviewed in the parent task's browser captures.
