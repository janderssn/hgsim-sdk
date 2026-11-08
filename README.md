# hgsim

The hang-glider simulation from **Above**, and the landing range used to tune it.

<p>
  <img src="docs/range-balance.jpg" width="49%" alt="Balancing the wing on the ramp before a realistic launch, the timber deck running out over the ridge">
  <img src="docs/range-cliff.jpg" width="49%" alt="A cliff launch: the glider just off the edge, the pilot prone and diving for airspeed">
</p>

Balancing the wing on the ramp before a Realistic launch, and a cliff launch just off the edge. Fly it at **https://hgsim.fly.dev**.

- **`src/`** is the SDK: plain ES modules with no dependencies. Its small core is a world, a glider and a pluggable flight model. Around the core are the launch run, landing judgement, the crash tumble, wind, a flight recorder and, in `hgsim/three`, the pilot's body and landing cues for Three.js.
- **`range/`** is the landing range: a small Three.js world with a ramp, a cliff and an open grass slope to launch from (C cycles them, R returns to the current one; on a touchscreen a thumb stick and buttons appear when it is touched), a field with a bullseye, and a thermal. It is for flying the SDK by hand, with live tuning and every round recorded.

The units are metres, seconds and radians throughout.

## Quick start

```bash
npm start          # the landing range at http://127.0.0.1:4180/range/
npm test           # unit tests (Node 20+)
npm run check:range  # flies the range end to end in a headless Chrome or Edge
```

No install step is needed. Three.js is vendored under `range/vendor/`, and nothing else is used.

## The SDK

hgsim is a small core with three parts: a **world**, a **glider** in it, and the **flight model** that steps the glider.

```js
import { createWorld, createGlider } from 'hgsim';

const world = createWorld({ terrain: (x, z) => 0, wind: { x: 0, z: -3 } });
const glider = createGlider({ world, at: { x: 0, y: 60, z: 0, heading: 0 } });

while (!glider.contact()) glider.step(1 / 60, { roll: 0, pitch: 0 });   // each frame, or in a loop offline
glider.land({ x: 0, z: 500, radius: 60 });   // { judged: 'firm', points, stars, notes: ['Firm touchdown', 'Into wind', ...] }
```

`examples/glide.mjs`, `examples/launch.mjs` and `examples/extend.mjs` run as they are:

```text
$ node examples/glide.mjs
stall 35 km/h; glided 553 m in 55.3 s, 48 km/h airspeed, sinking 0.69 m/s at the ground
landing hands off: firm Firm touchdown; Into wind; No flare

$ node examples/launch.mjs
0.00 s  pickup
1.50 s  balance
2.10 s  run
4.60 s  off the ground (flying) after 7.5 m at 10.0 m/s airspeed
5 s later: 52 km/h, 48 m out, 193 m over the ground
```

### The world

```js
const world = createWorld({
  terrain: (x, z) => height,          // the ground, m (default: flat at 0)
  surface: (x, z) => height,          // optional: tops of trees or buildings, for the glider's clearance
  wind: { x, z },                     // where the air goes, m/s: a vector, a live object (createWind()), or (x, y, z) => ({ x, z })
  thermals: [{ x, z, radius, strength }],
  lift: [(x, y, z, air) => metresPerSecond],   // your own rising or sinking air, added to the thermals and ridge lift
  air: { thermalCeiling: 1500 },      // AIR_DEFAULTS overrides
});
world.airAt(x, y, z);   // { lift, thermalLift, ridgeLift, extraLift, windX, windZ, groundHeight, aboveGround }
world.heightAt(x, z); world.surfaceAt(x, z); world.windAt(x, y, z);
```

Ridge lift comes from the terrain and the wind on its own, so a world needs nothing more than a height function.

### The glider

```js
const glider = createGlider({
  world,
  model: forceModel,                  // the default; classicModel or your own
  config: { mass: 100 },              // overrides of the model's defaults (GLIDER_DEFAULTS)
  at: { x, y, z, heading, airspeed }, // the starting flight state
  skim: false,                        // the terrain-skimming assist: true, or { clearance: m or bankedClearance }
  rules: {},                          // LANDING_RULES overrides for judging and scoring touchdowns
});
```

| Member | What it does |
|---|---|
| `step(dt, input)` | Flies `dt` seconds. `input`: `roll` −1 (left) … +1 (right), `pitch` (the bar) −1 (pulled in: dive) … +1 (pushed out: slow and flare), `stand` (sit up for drag), `field` (low over ground that can be landed on). |
| `state` | The live flight state: `x y z heading bank pitch airspeed pathAngle alpha bar verticalSpeed groundSpeed loadFactor lift stalled upright ...`. |
| `contact()` | `null` in the air. On the ground it returns the touchdown: `verticalSpeed` into the ground, `groundSpeed`, `slope`, `bank`, `wind`, `flare` and more. |
| `land(target)` | Judges and scores the touchdown, `contact()` by default, against a mark `{ x, z, radius }`. |
| `scrape(contact)` | A fast, light, level touch skips off the ground: `true` when it did, and the flight goes on. |
| `launch({ site, manual })` | Stands the pilot at the glider's position and returns a `Launch` (below). |
| `config`, `tune(patch)`, `overrides` | The frozen config, a change of some of its values in flight (`tune()` restores the defaults), and what differs from the defaults. |
| `performance` | The polar for the current config: `stallSpeed(bank)`, `trimSpeed(bar)`, `sink(v)`, `glideAngle(v)`, `glideRatio(v)`. |
| `reset(at)`, `place({ x, y, z, heading })` | A fresh flight state, or a move that leaves the flying as it is. |
| `air()`, `height()` | The air at the glider, and its height over the ground. |

Configs belong to the glider: two gliders with different numbers fly side by side, and nothing is global. `defineConfig(defaults, patch)` makes one on its own. It rejects unknown keys and values of the wrong kind with an error that names the key, so a typo cannot pass silently.

### The launch

```js
const launch = glider.launch({ site, manual: false });   // site: { fall(x, z, heading), edgeAhead(x, z, heading), ground?(x, z) }
while (!launch.airborne && !launch.failed) launch.step(1 / 60, controls);
// airborne: launch.reason is 'flying' or 'edge'. Carry on with glider.step(dt, { pitch: launch.barHold, ... }).
// failed: 'crosswind', 'wingdrop', 'turned' or 'stumbled'. launch.tumble() is the wreck as a rigid body (stepTumble until done).
```

The run steps the glider's own flight state through the flight model's own lift and drag, so the run and the flight are one physics: nothing changes at lift-off. The wind and rising air come from the world, and the ground of the run comes from the site. An Easy launch (the default) runs itself. In a Realistic one (`manual: true`), `controls` carries `balance` (A/D), `nose` (W/S), `go` and `jump` (Space). `launch.pose(stride)` says where to draw the wing and the pilot.

### Glider presets and polars

Presets are named wings for the force model, each with its own performance and handling. Each one is fitted to reference data: geometry, mass, speeds and polar points, with their sources, kept in `src/presets.js`. `npm run fit` (`tools/fit-presets.mjs`) refits them.

| Preset | Wing | Stall · trim · top (km/h) | Min sink | Best glide | Handling |
|---|---|---|---|---|---|
| `rogallo-1975` | 1970s standard Rogallo | 23 · 30 · 48 | 2.12 m/s | 4.1 | slow and heavy in roll; mushes; luffing dive at low angles |
| `alpha-235` | Wills Wing Alpha 235 trainer | 23 · 32 · 58 | 1.11 m/s | 8.1 | light, quick roll, very gentle stall |
| `vintage-1985` | mid-1980s double-surface wing | 27 · 35 · 75 | 1.01 m/s | 10.8 | moderate |
| `intermediate` | the force model's defaults (a game wing) | 35 · 47 · 170 | 0.99 m/s | 12.3 | the wing the range was tuned on |
| `sport-2` | Wills Wing Sport 2 155, VG off / on | 28 · 32 / 36 · 66 / 80 | 0.94 / 0.91 m/s | 12.2 / 12.8 | friendly loose, firmer tight |
| `t2c-144` | Wills Wing T2C 144, VG off / on | 30 · 34 / 44 · 82 / 105 | 0.90 / 0.87 m/s | 14.1 / 14.7 | heavy roll (more so tight), firm bar, sharper stall |

How far to trust the reference data: no independently measured polar is published for any of these wings.

- **Sport 2 (VG on):** Wills Wing's own estimated polar.
- **T2C:** Wills Wing has published no glide figures since about 1990. Its reference is the estimated polar of its predecessor, the Talon, checked against Moyes's published points for the comparable Litespeed RS.
- **Alpha 235 and the 1985 wing:** estimates built from their neighbours' curves.
- **Rogallo:** period claims from 1970s patents.
- **VG-off polars:** estimates derived from the VG-on ones.
- **Geometry, weights and speed limits:** manufacturer figures and DHV data.

Wills Wing's polars assume a pilot of 130% of the minimum hook-in weight; the presets fly at the reference's total mass.

The fitted wings trim only 10–20% above the stall, as real wings do. Fly the final with some speed in hand (the bar a little in) and flare from 1–2 m. The `intermediate` game wing trims faster and flares from about 3 m.

```js
const glider = createGlider({ world, preset: 't2c-144', config: { mass: 115 } });   // a preset, then your own changes on top
glider.polar();          // { points: [{ airspeed, sink, glideRatio }], stallSpeed, trimSpeed, topSpeed, minSink, bestGlide, speedToFly() }
glider.polar().speedToFly({ headwind: 5, sink: 1 });   // the airspeed for the flattest glide over the ground in that air
glider.usePreset('alpha-235');   // switch wings in flight; glider.tune() changes it further, glider.tune() alone restores it
glider.setVG(1);         // a wing with a VG (glider.hasVG): 0 loose (lighter roll, slower) .. 1 tight (flatter glide, heavier roll)
glider.pitchStability(); // { curves: [{ bar, points: [{ alpha, rate }], trim }], stiffness, lowAlphaRecovery }
glider.reference;        // the data the preset was fitted to (at the current VG), with its sources
```

**The polar** is sink rate against airspeed in steady, straight flight. The highest point of the curve is the minimum sink, the speed to circle in lift. The point where a line from the origin just touches the curve is the best glide, the speed for distance in still air. Against a headwind or through sinking air, the speed to fly moves faster.

**Pitch stability** is how strongly a wing returns to its trimmed angle of attack after something pitches it away. Certification bodies such as the HGMA and DHV measure it as the pitching moment against angle of attack on a test vehicle. A stable wing pitches nose down above its trim angle and nose up below it, and it still pitches nose up at very low angles, deep in a dive, so it recovers on its own. hgsim's chart is the model's equivalent: the rate (°/s, positive is nose up) at which the wing pitches back toward trim at each angle of attack, at the steady speed for that angle. There is one curve each for the bar pulled in, hands off and pushed out. Each curve crosses zero at that bar's trim. The steeper it falls through zero, the firmer the wing holds its trim. A curve that sags toward zero at low angles is a wing with little will to pull out of a dive. The 1970s Rogallo does this through `luffLoss`, its luffing sail, which is what made the luffing dive dangerous. Modern wings have luff lines and reflex instead.

`npm run polars` prints the presets side by side, VG off and on. In the range, the panel's Glider section picks a preset (also `?glider=t2c-144`) and sets the VG (key **V**). Its polar and pitch stability charts redraw as you tune or pull the VG. The polar shows the reference data as rings over the model's curve and the other wings faintly behind, and both charts mark where the wing is flying now.

### Flight models

A model is a plain object: `{ name, defaults, createState(init, config), step(state, input, dt, world, config, skim) }`. Two more members are optional: `performance(config)` and `scrape(...)`. Two models come with hgsim:

- **`forceModel`**, the default: the wing as forces, with lift, drag, ground effect, stall, flare and push-out bar pressure.
- **`classicModel`**: the older, simpler energy model, kept for side-by-side comparison. In the range, use `?model=original`.

Any other object with the same shape drops in. `examples/extend.mjs` flies a point mass in ten lines.

### Modules

`src/index.js` is the public API. Each module can also be imported on its own (`hgsim/launch`, `hgsim/landing`, ...), down to the low-level functions such as `stepFlight`, `stepLaunch` and `liftCoefficient`, which take their config as an argument.

| Module | What it does |
|---|---|
| `world.js` | The world: terrain, wind, thermals, ridge lift and extra lift sources. |
| `glider.js` | The glider handle and its launch. |
| `flight.js` | The force model: `GLIDER_DEFAULTS`, the aerodynamics, `stepFlight`, `performance`, `scrapeGround`. |
| `models/classic.js` | The classic model. |
| `launch.js` | The launch kernel: picking the wing up, balancing it, the run and the lift-off (`LAUNCH_DEFAULTS`). |
| `landing.js` | `LANDING_RULES`, `judgeTouchdown` and `scoreLanding`, and approach helpers: the flare zone, `pullOutHeights`, `dropToImpact`. |
| `tumble.js` | A launch or landing gone wrong as a rigid body. It has gravity, a flat-plate sail and ground contact with friction, and runs until the wreck comes to rest. |
| `wind.js` | Live wind: a mean speed and direction with a meander and gusts, and conversions to and from compass bearings. |
| `recorder.js` | Records each round as samples and marked moments. `tools/flight-report.mjs` reads them back. |
| `config.js` | `defineConfig` and `overridesOf`. |
| `presets.js`, `polar.js` | The glider presets with their reference data, and the polar and pitch stability of any glider (`polarOf`, `pitchStabilityOf`). |
| `assists/` | The optional terrain-skimming assist, which keeps a low glider off the ground, and its drawn bank. |
| `three/` (`hgsim/three`) | Three.js presentation: `createPilotRig` poses the pilot on the skinned glider model, and `createLandingCues` draws the shadow, height gauge and FLARE prompt. Each takes `THREE` as an argument. |

### Conventions

- **Units:** metres, seconds and radians throughout.
- **Frame:** x is east, y is up and z is north.
- **Heading:** a heading `h` flies along `(sin h, cos h)`. A model drawn with `rotation.set(pitch, heading, roll, 'YXZ')` faces the way it flies.
- **Wind:** the wind vector `{x, z}` is where the air is going, in m/s. `directionFromBearing` and `bearingFromDirection` convert to and from compass bearings ("from 190°").
- **Controls:**
  - `roll` is −1 for left and +1 for right.
  - `pitch` is the bar: −1 pulls in (dive) and +1 pushes out (slow and flare).
  - On a launch, `balance` +1 shifts right, which lowers the right wing, the same as in flight.

### Migrating from 0.1

| 0.1 | Now |
|---|---|
| `createSoaringState(init)`, `stepSoaring(state, input, dt, environment)` | `createGlider({ world, at })`, then `glider.step(dt, input)`. Or the low-level `createFlightState(init, config)` and `stepFlight(state, input, dt, world, config, skim)`. |
| `environment = { terrainHeight, wind, thermals, thermalCeiling, terrainSkimming, skimClearance, skimHeight }` | `createWorld({ terrain, wind, thermals, air: { thermalCeiling }, surface })`, plus `createGlider({ skim: { clearance } })`. |
| `input.ground` | `input.field` |
| `tuneSoaring(patch)`, `getSoaringTuning()` (global) | `glider.tune(patch)` and `glider.config`, per glider. |
| `SOARING_DEFAULTS` | `GLIDER_DEFAULTS`. The air's numbers are now `AIR_DEFAULTS` and the touchdown and scoring numbers `LANDING_RULES`. |
| `sampleSoaringAir(x, y, z, env)` | `world.airAt(x, y, z)` |
| `judgeTouchdown(c)`, `scoreLanding(t, target)` | The same, with an optional `rules` argument; or `glider.land(target)`. |
| `createLaunch()`, `stepLaunch(s, dt, conditions)`, `windOnRun(...)` | `glider.launch({ site, manual })` and `launch.step(dt, controls)`. The kernel takes `(s, dt, conditions, gliderConfig, launchConfig)`. |
| `runProfile(air, stall, distance, slope)` | `runProfile(air, distance, slope)` |
| `getSkimClearance`, `hgsim/flight-classic`, `hgsim/landing-cues`, `hgsim/pilot-rig`, `hgsim/flight-recorder` | `bankedClearance`, `classicModel`, `hgsim/three`, `hgsim/three`, `hgsim/recorder` |

## The landing range

Open `http://127.0.0.1:4180/range/` after `npm start`.

### URL options

| Option | Effect |
|---|---|
| `wind` | Wind speed in m/s. The default is 5. |
| `from` | Bearing the wind comes from, in degrees. The default, 180, blows straight up the launch. 225 gives a 45° crosswind for practice. |
| `launch=real` | Realistic launches. |
| `model=original` | The older flight model. |
| `assist=on` | Terrain skimming. |
| `glider` | A glider preset, such as `t2c-144` or `rogallo-1975`. The default is `intermediate`. |

The side panel sets the wind and the main feel numbers live. Tab hides it.

### Controls

| Key | On the ground | In the air |
|---|---|---|
| V | Pull the VG on, or let it off (wings with a VG). | Same. |
| Space | Launch. In Realistic mode, a second press starts the run and a third jumps. | Sit up for drag and a slow landing, or lie prone again. |
| W / S | Hold the nose down or up (Realistic). | Pull in to dive, or push out to slow down. Hold S low to flare. |
| A / D | Balance the wing (Realistic). | Weight shift, to turn. |

On a gamepad:
- The left stick steers and moves the bar.
- RT dives and LT pushes out.
- A launches.

### Recorded flights

Every round is saved to `work/flights/`, which git ignores. To list them, or to see the latest in detail:

```bash
npm run flights
npm run flights -- latest
```

The open range reloads itself when `src/` or `range/` changes. It waits until you are standing at the launch.

### Code layout

| File | What it holds |
|---|---|
| `range/main.js` | Composes the range on one `createWorld` and one `createGlider`, and owns its launch, flight, landing and crash transitions. |
| `range/simulation-loop.js`, `motion.js` | Fixed simulation ticks and interpolated drawing snapshots. |
| `range/controls.js` | Keyboard/gamepad normalization and continuous bar control through lift-off. |
| `range/camera.js`, `hud.js` | Chase-camera smoothing and change-only HUD updates. |
| `range/rendering.js` | Adaptive resolution, shadow detail and grass distance for the current device. |
| `range/world.js` | Where the ground is: the terrain, the deck and the rocks. These are pure functions, and the physics asks them. |
| `range/scenery.js` | Draws that same world. |
| `range/audio.js`, `gamepad.js`, `wind-indicators.js`, `speed-streaks.js` | Presentation. |

`window.rangeDemo` exposes the range's state and hooks for scripted checks, as `tools/range-check.mjs` does.

### Simulation and rendering

The simulation advances at 60 fixed ticks per second. Rendering interpolates between
physical snapshots, so display refresh rate does not change launch timing or control
response. A tick advances one lifecycle phase; lift-off does not also run a second
flight step. Catch-up is bounded to 250 ms, and hidden tabs pause and discard their
backlog when resumed. Crash bodies start from the current physical pose, even when
several simulation ticks run between rendered frames.

Controls held during the run retain their launch trim through lift-off and release.
A fresh input or reversal then takes over the airborne bar. This prevents a held S
key from accidentally releasing the launch trim on the next frame.

Rendering starts at full detail. After sustained slow frames it reduces resolution, shadow detail and how far grass is drawn, and it restores detail cautiously after a healthy interval. The terrain mesh always stays at full detail. A coarser mesh would draw the ground metres above or below where the glider touches it on the slopes. Grass is grouped into tiles so that off-screen tiles are skipped. The world and the flight physics never change with quality. Camera state is separate from the simulation, and the HUD updates only the values that changed.

## Tests and checks

- **`npm test`:** the unit tests in `tests/`. `golden.test.mjs` flies fixed scripts (flights, skimming, both models, every kind of launch, the tumble, the wind and landing scores) and requires the numbers recorded in `tests/golden/golden.json`, so a change to the physics cannot slip in unnoticed. After an intended change of the physics, re-record them with `npm run golden:record`. `sdk.test.mjs` covers the SDK's surface. The other tests cover the flight model, the launch (both modes, the run length against the wind, the nose, a wing off level and the cliff), landing cues, terrain skimming, the recorder, audio, the range's world, fixed-step timing, takeoff controls, interpolation, rendering quality and HUD updates.
- **`npm run check:range`:** starts its own server and flies the range in a headless browser. It runs an Easy ramp launch, an Easy cliff launch, an Easy slope launch in calm air, a Realistic launch flown by a simple scripted pilot, sitting up and lying prone in flight, and a landing from overhead. It also checks for page errors. Browser tools require Node 22+ and Chrome/Chromium or Edge; set `CHROME_PATH` if the browser is not discovered automatically.

To measure rendering, start `npm start` and run:

```bash
npm run benchmark:range
npm run benchmark:range -- --url http://127.0.0.1:4180 --warmup 8 --seconds 10
```

The benchmark reports frame rate, mean and 95th-percentile frame time, drawing
resolution, geometry counts and adaptive quality. Compare revisions sequentially
with the same browser, viewport, warmup and hardware. It uses the normal display
frame limit, so fast machines may reach the refresh-rate ceiling.

## Deploy

Every push to `main` runs the tests and, if they pass, deploys the range to Fly.io at **https://hgsim.fly.dev**. It uses `.github/workflows/deploy.yml` with `Dockerfile` and `fly.toml`. The workflow needs one repository secret, `FLY_API_TOKEN`, a Fly.io organisation token. The first run creates the `hgsim` app. The deployed server saves no flights, so rounds stay in the browser and can be downloaded from the panel.

## Sound credits

The range's sounds are synthesized, except the crash. It is mixed from seven recordings on Freesound. One of them, "stick_crack" by jiaying330, is used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The rest are CC0. The full list is in [`range/assets/sfx/CREDITS.md`](range/assets/sfx/CREDITS.md).

## Origin

This was extracted from Above at commit `fbea2b6`, on branch `claude/flight-physics-landing-a61a59`. The SDK refactor kept the physics exactly as it was; the golden tests hold it there.
