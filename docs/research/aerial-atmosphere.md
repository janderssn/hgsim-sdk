# A coherent WebGL2 daylight medium

`range/aerial-atmosphere.js` owns one fixed sun direction, analytic sky radiance,
height-dependent aerial extinction, 3D cumulus medium and sun optical-depth map.
It does not alter the numerical terrain or flight model. `range/atmosphere.js`
continues to own the measured geological backdrop and its geometry LOD.

```js
const aerial = createAerialAtmosphere(THREE, { sunDirection });
scene.background = null;
scene.add(aerial.sky);
surfaces.setAtmosphere(aerial.shared); // calls shared.installMaterial per material
aerial.installMaterial(forestMaterial);
// Frame: after camera updates, immediately before beauty rendering.
aerial.render(renderer, camera, elapsedSeconds);
renderFinish.render();
```

`render()` calls `update()` itself. Pass a fixed elapsed time for comparable
screenshots. `update(cameraOrPosition, elapsedSeconds)` is also available without
rendering. The medium and shadow texture remain fixed in world space; only the
common wind offset moves. No per-tree CPU updates are required.
An optional `cloudOffset: [x, z]` fixes the initial weather phase in metres. The
default `[800, 0]` opens the launch/landing corridor to direct sun while retaining
a bank shadow over the eastern woodland; it moves the visible medium and shadow
map together, independently of the camera.

`generateRadiance(THREE, width = 256, height = 128, { sunDisk = false })` returns a caller-owned,
linear Float32 RGBA equirectangular `DataTexture` for SH integration and PMREM.
Its pixels use exactly the same single-scattering approximation as the visible
sky and omit the sun disc and cloud geometry by default. Set `sunDisk: true` only
when an explicit solar key light will not supply that energy. These are scene-referred
linear radiances, not a calibrated radiometric dataset. Diffuse irradiance and
the directional light remain separate; avoid adding duplicate ambient lighting.

The Rayleigh extinction coefficients are wavelength dependent. Aerosol density
has a 1.2 km scale height and molecular density an 8 km scale height. Aerial
extinction integrates the exponential density along each camera-to-surface ray,
including rays looking up or down. Surface extinction and inscattering evaluate
at vertices and interpolate across triangles; cloud visibility and lighting stay
per fragment. This removes repeated spectral integration on overlapping foliage.
The horizon air column stays finite through
a curvature-aware slant-column approximation. Aerial scattering happens before
tone mapping and display encoding; the old uniform fog chunk is suppressed only
for materials using this hook.

The CPU-baked cloud shape is a 64³ two-channel periodic volume, with broad
fractal mass and smaller cellular erosion. A separate 128² weather field creates
connected banks and clear corridors at kilometre scales. Cloud base is 2300 m;
tops vary with coverage up to 3550 m. Clouds integrate Beer–Lambert transmittance,
short sun marches, a dual-lobe phase approximation and a diffuse multiple-light
term. A 128² optical-depth texture traces the same density toward the same sun;
all object heights project along that sun to the common map. Shadowing affects
the directional beam while retaining diffuse skylight.

| Quality | Cloud buffer limit | Maximum shape steps | Secondary sun steps |
| --- | --- | --- | --- |
| High | One third of drawing buffer; at most 640×360 | 48 | 3 |
| Medium | One quarter; at most 480×270 | 32 | 2 |
| Low | One sixth; at most 256×144 | 16 | 0; uses baked sun column |

There is one cloud pass, with early opacity termination and longer empty-space
strides. Rendering is deterministic without stochastic frame noise or temporal
history. This avoids a grainy first screenshot and reprojection ghosts, but
small cloud details remain limited by the bounded cloud buffer. Ordinary scene
depth naturally occludes the background sky. The cloud slab is above the flight
corridor; this is not a general fly-through-clouds or planet renderer. At present,
the cloud pass uses half-float colour when available and a divided-radiance RGBA8
fallback otherwise. The quality budgets bound work, and are not measured hardware
frame-rate guarantees.

The implementation is original code with no imported cloud or sky assets and no
new runtime dependencies. Engineering references were the pinned MIT-licensed
[Takram cloud package](https://github.com/takram-design-engineering/three-geospatial/blob/b012ad06d858fc035d88aacfd73f092f93c994e4/packages/clouds/README.md),
[Claude of Tanks engine cloud renderer](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/baff0f69244ee690f4f36eb7b0405616509cb0a0/src/engine/volumetricClouds.ts)
and [Spiri0's WebGL volume study](https://github.com/Spiri0/volumetric-clouds/tree/feba8e6652b66efb3ff4d208d3e1c1ed6c822c1b).
No source was copied; Claude of Tanks' reserved world, vehicle and media paths
were excluded. See the [research board](threejs-2026.md) for source and benchmark
qualifications.
