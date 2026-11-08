# Mineral surfaces and rock lighting

The launch boulders use softer rounded outlines and three oblique fracture planes
per family instead of aligned box clipping. Scanned mineral contrast and normal
strength are reduced so dark fissures no longer dominate the whole rock. Lichen
and moss still follow world-space colonies and upward surfaces.

Screenshot review and an independent code review found that the crease-normal
builder retained the same scratch vector for every face. Every boulder therefore
had a single lighting direction. Each face now retains its own normal; the regression
check requires varied directions and both upward and downward faces. The moss
shader also reuses Three.js's scale-corrected normal for nonuniform instances.

Local cliffs blend their texture projections continuously. This uses one to three
macro samples depending on the normal and quality, versus one dominant projection
previously. Slow world-space mineral bands break repetition without another set
of texture fetches. Soil grain is clearer near the camera, terrain pigments have
less abrupt dry/green transitions, and exposed distant granite has a restrained
warm mineral tint before ordinary sunlight and atmospheric scattering.

All changes use existing local scanned maps and retain their source attribution.
The physical surface, shared contact triangles, rock placements and botanical
exclusions are unchanged. Surface ownership and rock geometry checks pass;
actual in-game captures verify shader compilation and the visible result.
