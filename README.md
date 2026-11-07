# hgsim

The hang-glider simulation from **Above**, and the landing range used to tune it.

<p>
  <img src="docs/range-balance.jpg" width="49%" alt="Balancing the wing on the ramp before a realistic launch, the timber deck running out over the ridge">
  <img src="docs/range-cliff.jpg" width="49%" alt="A cliff launch: the glider just off the edge, the pilot prone and diving for airspeed">
</p>

Balancing the wing on the ramp before a Realistic launch, and a cliff launch just off the edge. Fly it at **https://hgsim.fly.dev**.

- **`src/`** is the library: plain ES modules with no dependencies. It covers the flight model, the launch run, the crash tumble, landing cues, the pilot's body, terrain following, wind and a flight recorder.
- **`range/`** is the landing range: a small Three.js world with a ramp and a cliff to launch from, a field with a bullseye, and a thermal. It is for flying the library by hand, with live tuning and every round recorded.

The units are metres, seconds and radians throughout.

## Quick start

```bash
npm start          # the landing range at http://127.0.0.1:4180/range/
npm test           # unit tests (Node 20+)
npm run check:range  # flies the range end to end in a headless Chrome or Edge
```

No install step is needed. Three.js is vendored under `range/vendor/`, and nothing else is used.

## The library

```js
import { createSoaringState, stepSoaring } from 'hgsim';

const glider = createSoaringState({ x: 0, y: 60, z: 0, heading: 0 });
const environment = { terrainHeight: (x, z) => 0, wind: { x: 0, z: -3 }, thermals: [] };
stepSoaring(glider, { roll: 0, pitch: 0 }, 1 / 60, environment);   // call each frame, or in a loop offline
```

`examples/glide.mjs` and `examples/launch.mjs` run as they are:

```text
$ node examples/glide.mjs
stall 35 km/h; glided 553 m in 55.3 s, 48 km/h airspeed, sinking 0.69 m/s at the ground
landing hands off: firm Firm touchdown; Into wind; No flare

$ node examples/launch.mjs
0.00 s  pickup
1.50 s  balance
2.10 s  run
4.40 s  off the ground (flying) after 7.5 m at 9.9 m/s airspeed
```

### Modules

| Module | What it does |
|---|---|
| `flight.js` | Models the wing as forces: lift, drag, ground effect, stall, flare and push-out bar pressure. It also models the air it flies in: wind, thermals and ridge lift. It judges and scores a touchdown, and `tuneSoaring` changes its numbers live. |
| `flight-classic.js` | The older, simpler flight model, kept for side-by-side comparison. In the range, use `?model=original`. |
| `launch.js` | Covers picking the wing up, balancing it on the shoulders, the run and the lift-off. It runs on the flight model's own lift and drag, and steps the flight state the flight then keeps. That makes the run and the flight one physics. In Easy mode it runs itself. In Realistic mode (`manual`) the pilot balances with A/D, holds the nose with W/S, and starts and jumps with Space. |
| `tumble.js` | Turns a launch or landing gone wrong into a rigid body. It has gravity, a flat-plate sail and ground contact with friction, and runs until the wreck comes to rest. |
| `landing-cues.js` | Works out when to round out and flare, and draws the cues for it. |
| `pilot-rig.js` | Poses the pilot's body on the skinned glider model, from prone to upright. It covers standing inside the control frame with the uprights on the shoulders, the run, and the swing into the harness after a launch. It also covers weight shift, push-out, and moving one hand at a time between bar and uprights. It takes `THREE` as an argument. |
| `terrain-skimming.js`, `skim-pose.js` | The optional assist that keeps a low glider off the ground. The range flies without it unless you add `?assist=on`. |
| `wind.js` | Live wind: a mean speed and direction with a meander and gusts. |
| `flight-recorder.js` | Records each round as samples and marked moments. `tools/flight-report.mjs` reads them back. |

`src/index.js` re-exports the public API. You can also import the files directly, for example `hgsim/launch`.

### Conventions

- **Frame:** x is east, y is up and z is north.
- **Heading:** a heading `h` flies along `(sin h, cos h)`. A model drawn with `rotation.set(pitch, heading, roll, 'YXZ')` faces the way it flies.
- **Wind:** the wind vector `{x, z}` is where the air is going, in m/s. `directionFromBearing` and `bearingFromDirection` convert to and from compass bearings ("from 190°").
- **Controls:**
  - `roll` is −1 for left and +1 for right.
  - `pitch` is the bar: −1 pulls in (dive) and +1 pushes out (slow and flare).
  - On a launch, `balance` +1 shifts right, which lowers the right wing, the same as in flight.

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

The side panel sets the wind and the main feel numbers live. Tab hides it.

### Controls

| Key | On the ground | In the air |
|---|---|---|
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
| `range/main.js` | Composes the range and owns its launch, flight, landing and crash transitions. |
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

- **`npm test`:** the unit tests in `tests/`. They cover the flight model, the launch (both modes, the nose and the cliff), landing cues, terrain skimming, the recorder, audio, the range's world, fixed-step timing, takeoff controls, interpolation, rendering quality and HUD updates.
- **`npm run check:range`:** starts its own server and flies the range in a headless browser. It runs an Easy ramp launch, an Easy cliff launch, a Realistic launch flown by a simple scripted pilot, sitting up and lying prone in flight, and a landing from overhead. It also checks for page errors. Browser tools require Node 22+ and Chrome/Chromium or Edge; set `CHROME_PATH` if the browser is not discovered automatically.

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

This was extracted from Above at commit `fbea2b6`, on branch `claude/flight-physics-landing-a61a59`. Its behaviour is unchanged.
