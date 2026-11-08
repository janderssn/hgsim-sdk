# Quiet spatial valley ambience

The world should have audible places rather than a uniform soundtrack. The new
`range/valley-ambience.js` supplies three restrained layers through the existing
audio engine: leaf rustle near woodland, very sparse bird phrases around those
woods, and light shoreline wash only near an explicitly provided lake. A nearby
refuge occasionally has a damped wooden chime/knock. It is not a musical loop.

All sound is original procedural synthesis. The continuous beds reuse the existing
pink/brown noise buffers, filtered at different rates and gently modulated over
time. Bird phrases are short buffered pitch curves with breath noise and irregular
spacing, not continuously running shrill oscillators. The refuge accent uses
short, inharmonic damped resonances. This is a deliberately quiet approximation of
natural ambience, not field recordings or a species-identification model.

## Integration

`createAudio().update` accepts an optional descriptor:

```js
environment: {
  position: { x, y, z },
  forward: { x, z },
  forest: 0.0,                    // actual nearby canopy coverage, 0..1
  forestSource: { x, y, z },      // optional nearby woodland anchor
  refuge: { x, y, z },           // actual refuge ground position
  lake: { x, y, z, radius },     // actual lake; null means no water sound
}
```

Clearance comes from the enclosing audio state. Sources fade with height; water
distance is measured from the shore, including vertical separation. Stereo pan
follows the listener's forward direction and each source's world position. Bird
origins remain fixed for the duration of a phrase. When no woodland anchor is
provided, short calls originate within the listener's nearby wooded patch.

Providing this descriptor replaces the existing nonspatial alpine noise/bird
scheduler; it does not layer a second copy over those sounds. Other biomes retain
their existing ambience. Airflow, landing effects, vario and user controls remain
in the original audio engine.

## Lifecycle and budget

The module exports `start`, `stop`, `update` and `dispose`. It creates no
AudioContext, never calls `resume`, and cannot start until the existing
user-unlocked context is running. It connects to the existing ambience bus,
so pause ducking, flight-speed ducking, master mute, compression and output trim
remain shared. Mute, hidden-page state, pause and context suspension release its
sources and nodes; reactivation does not replay missed calls.

The graph has eleven persistent nodes and at most three simultaneous short
voices, each with three nodes. Four bird phrase buffers and one wooden accent
are cached lazily (under 1.3 MiB at 48 kHz). Control changes are limited to 20 Hz;
events use the audio clock and never catch up in bursts after a delayed frame.
Construction failures clean up partial graphs and stop retrying after three
failures. No timers, downloads, ScriptProcessor or AudioWorklet are introduced.

## Checks and limits

The nineteen audio checks include existing flight/event behavior plus spatial
shore attenuation, missing-lake silence, one shared context, mute/pause/visibility
cleanup, bounded nodes and phrase buffers, no automatic context resume, finite
sample values and quiet phrase endpoints. Tests use a strict WebAudio mock and
validate lifecycle and signal bounds, not subjective speaker/headphone quality.
The gain levels are intentionally restrained so this layer supports exploration
without masking flight cues.
