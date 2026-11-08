# Changelog

All notable changes to the hgsim SDK. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows [Semantic Versioning](https://semver.org/): while it is 0.x, a breaking change to the public API bumps the minor version.

The public API is what `hgsim` and `hgsim/three` export, as declared in `types/`.

## [0.2.0]

### Added

- A shared core for vehicles ([docs/vehicles.md](docs/vehicles.md)): one contract for every vehicle (`kind`, `phase`, `airborne`, `step`, `pose`, `velocity`, events, `state`) and the shared events `airborne`, `touchdown` and `crash`.
- The world answers every vehicle: `groundAt` with platforms (decks, bridges), `slopeAt`, `normalAt`, `materialAt` with `MATERIALS` (grip and softness), `waterAt`, `solidAt` and `inBounds`. A glider lands on a platform as the walker stands on it, and clears it in flight.
- `hgsim/ground`, beside the air vehicles: `createWalker`, on foot, its pace set by the ground's slope and material, stopped by water, solids, walls and the map's edge; ledges are falls.
- `createHangGlider`, a glider and its round in one call. The round is the hang glider as a vehicle: `kind`, `airborne`, `pose()`, `velocity()`.
- `terrainSite`: a launch site read from the world, its fall and its edge (a drop, water, a solid thing, the map's edge).
- Poses: `makePose`, `lerpPose`, `createPoseTrack` and `applyPose`, to draw any vehicle between fixed ticks.
- For games, from migrating Above onto the SDK: `shoulderPivot` (drawing the launch run), a round's `target` as a function chosen at the touchdown (the nearest clearing), the walker's `stopAtDrop` (a careful walker stops at a cliff), and `SKIM_CLEARANCE`.
- Type declarations for the whole public API (`types/index.d.ts`, `types/three.d.ts`), with the config interfaces generated from the frozen defaults, and `npm run check:types`.
- `VERSION`.
- Glider presets from a 1975 Rogallo to a topless competition wing, and `defineWing`, `wingConfig`, `handlingFor` and `vgConfig` to make your own. A preset's launch comes from its build: the wing's mass, span, dihedral and carried angle of attack.
- `glider.polar()`, `glider.pitchStability()`, `glider.flareZone()`, `polarOf`, `pitchStabilityOf` and `measureFlareZone`.
- Rounds: `createRound`, the whole lifecycle of a go from standing at a launch to the end, with events. `round.on(type, listener)` listens to one event and `round.on(listener)` to all; `round.once` listens once. `ROUND_EVENTS` lists them.
- `createSimulationLoop`, fixed ticks drawn once per frame with the alpha to interpolate by (moved from the range into the SDK).
- Scenarios: `SCENARIOS`, `SITES`, `runScenario`, `startScenario`, `flyScenario`, `launchPilot` and `landingPilot`.

### Changed

- The round's `liftoff` event is `airborne`, as on every vehicle. `crash` says what happened: `{ kind: 'terrain' | 'solid' | 'water' | 'launch', impact, hit }`, and a failed launch is a crash too.
- A hang glider flying into the world's water or its solid things crashes into them; a wreck in the water settles on its surface. The wreck stops against solid things (walls, huts, pylons) instead of sliding through them, and the crash is found at the wing's nose as well as the body.
- A tumble ends when the wreck is still, or after 7 s once it is only creeping, or after 60 s; a wreck still falling, down a cliff or a wall, is no longer stopped in mid-air.
- The package's exports are its entry points, `hgsim`, `hgsim/ground` and `hgsim/three`. The per-module subpaths (`hgsim/launch`, ...) are gone; everything public is exported from the entry points.
- `round.standAt` takes one of `SITES` as it is, as well as a `{ start, fall, edgeAhead, ground }` site.
- `glider.step` throws a `RangeError` for a negative or non-finite time step instead of corrupting the flight.
- `createRound` throws a `TypeError` without a glider from `createGlider`, or with a hook that is not a function.
- Launches end only in physics: no crosswind rule, no stumble timer.

### Fixed

- The pilot stands up for a landing only with the ground coming up. After an easy take-off, or in a zoom climb near the ground with the bar out, the pilot used to stand bolt upright for seconds, with the upright drag and the reduced roll authority.

## [0.1.0]

- The SDK: `createWorld`, `createGlider`, pluggable flight models (`forceModel`, `classicModel`), configs (`defineConfig`), the launch, landing judgement and scoring, the tumble, wind and the flight recorder.
