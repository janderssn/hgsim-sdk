# Changelog

All notable changes to the hgsim SDK. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows [Semantic Versioning](https://semver.org/): while it is 0.x, a breaking change to the public API bumps the minor version.

The public API is what `hgsim` and `hgsim/three` export, as declared in `types/`.

## [0.2.0]

### Added

- Type declarations for the whole public API (`types/index.d.ts`, `types/three.d.ts`), with the config interfaces generated from the frozen defaults, and `npm run check:types`.
- `VERSION`.
- Glider presets from a 1975 Rogallo to a topless competition wing, and `defineWing`, `wingConfig`, `handlingFor` and `vgConfig` to make your own. A preset's launch comes from its build: the wing's mass, span, dihedral and carried angle of attack.
- `glider.polar()`, `glider.pitchStability()`, `glider.flareZone()`, `polarOf`, `pitchStabilityOf` and `measureFlareZone`.
- Rounds: `createRound`, the whole lifecycle of a go from standing at a launch to the end, with events. `round.on(type, listener)` listens to one event and `round.on(listener)` to all; `round.once` listens once. `ROUND_EVENTS` lists them.
- `createSimulationLoop`, fixed ticks drawn once per frame with the alpha to interpolate by (moved from the range into the SDK).
- Scenarios: `SCENARIOS`, `SITES`, `runScenario`, `startScenario`, `flyScenario`, `launchPilot` and `landingPilot`.

### Changed

- The package's exports are its two entry points, `hgsim` and `hgsim/three`. The per-module subpaths (`hgsim/launch`, ...) are gone; everything public is exported from the entry points.
- `round.standAt` takes one of `SITES` as it is, as well as a `{ start, fall, edgeAhead, ground }` site.
- `glider.step` throws a `RangeError` for a negative or non-finite time step instead of corrupting the flight.
- `createRound` throws a `TypeError` without a glider from `createGlider`, or with a hook that is not a function.
- Launches end only in physics: no crosswind rule, no stumble timer.

### Fixed

- The pilot stands up for a landing only with the ground coming up. After an easy take-off, or in a zoom climb near the ground with the bar out, the pilot used to stand bolt upright for seconds, with the upright drag and the reduced roll authority.

## [0.1.0]

- The SDK: `createWorld`, `createGlider`, pluggable flight models (`forceModel`, `classicModel`), configs (`defineConfig`), the launch, landing judgement and scoring, the tumble, wind and the flight recorder.
