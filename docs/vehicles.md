# Vehicles: the shared core

hgsim began as a hang glider. Games built on it (Above, the range) also walk, ride cable cars and will add paragliders, skis,
snowmobiles, motorbikes and cars. This is how those fit one SDK without each re-inventing the world, the clock and the drawing.

## Layers

1. **World** (`createWorld`): everything every vehicle asks of the place. Where the ground is (`groundAt`, including decks and
   ramps above the terrain), its slope and normal, what it is made of (`materialAt`, with `MATERIALS` giving grip, rolling
   resistance and ski glide), water (`waterAt`), solid things (`solidAt`: buildings, trees, pylons), the edge of the map
   (`inBounds`), and the air (wind, thermals, ridge lift). A game supplies plain functions; the SDK never owns the map.
2. **Clock** (`createSimulationLoop`) and **poses** (`lerpPose`, `createPoseTrack`, `applyPose`): fixed ticks, drawn between them.
3. **Vehicles**: each one a state machine stepped at the fixed tick, with the same small surface (below). The hang glider (a round)
   and the walker are the first; the rest follow the same contract.
4. **Presentation** (`hgsim/three`): optional, per vehicle.

## The vehicle contract

```js
vehicle.kind            // 'hang-glider', 'walker', ...
vehicle.phase           // the vehicle's own phases ('launch', 'flight', ...; 'walk', 'fall', ...)
vehicle.airborne        // true while nothing holds it up but the air
vehicle.step(dt, input) // one fixed tick; input is the vehicle's own controls
vehicle.pose(out?)      // { x, y, z, heading, pitch, roll, q }: where to draw it
vehicle.velocity(out?)  // { x, y, z } m/s, world frame
vehicle.on(type, f)     // events; on(f) hears all; once(...) hears one
vehicle.state()         // plain data, to record, replay and restore
```

Shared events, with the same meaning everywhere: `airborne` (it left the ground), `touchdown` (it came back to it, gently enough:
`{ impact, ... }`), `crash` (`{ kind, impact, hit? }`: what went wrong, how hard, and what it hit). A vehicle adds its own
(`launch`, `failed` and `scrape` for the hang glider; `blocked` for the walker).

A game holds one active vehicle and swaps it: the walker carries the pilot to a launch, a hang-glider round takes over at
`standAt(terrainSite(world, here))`, and a touchdown hands back to a walker where the round ended.

## Poses

The quaternion `q` ([x, y, z, w], three.js order) is the orientation; `heading` (clockwise from +z), `pitch` (+ nose up) and `roll`
(+ right side down) are there to read. `applyPose(pose, object3d)` sets a three.js object (or anything with `position.set` and
`quaternion.set`), so no game handles the signs itself. The position is the vehicle's own reference point: the feet for a walker,
the hang point for a hang glider.

## Physics per family

- **Air** (hang glider, paraglider): the force model, the launch run, landing judgement and the tumble. A paraglider adds its own
  flight model (a pendulum under a canopy) and an inflation phase before the run.
- **Ground** (skis, snowmobile, motorbike, car): a shared ground-contact model on the world's height field and materials, in plain
  JavaScript: gravity along the slope, grip and rolling resistance from the material, jumps as ballistic flight, and the tumble for a
  crash. A full rigid-body engine is only worth its weight for vehicles that collide with each other.
- **On foot** (walker): a character on the ground, with the material and the slope setting its pace, ledges it falls from and water,
  solids and cliffs that stop it.
