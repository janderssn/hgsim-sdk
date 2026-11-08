/**
 * A fixed-step loop: the simulation advances in equal ticks whatever the frame rate, and the drawing happens once per frame with
 * how far it is into the next tick (alpha, 0..1) to interpolate by. The well-known "fix your timestep" pattern (Glenn Fiedler),
 * as cannon-es's world.fixedStep and Rapier's integration parameters do it: the same inputs fly the same flight at 30 Hz or 144 Hz.
 * The clock is passed to frame(), so the same loop runs without a browser. A long pause drops its excess time (maxFrameSeconds)
 * instead of building a backlog.
 *
 *   const loop = createSimulationLoop({ step: dt => round.step(dt, input()), render: (dt, alpha) => draw(alpha) });
 *   requestAnimationFrame(function tick(now) { loop.frame(now); requestAnimationFrame(tick); });
 */
export function createSimulationLoop({ step, render = () => {}, stepSeconds = 1 / 60, maxFrameSeconds = 0.25 }) {
  if (typeof step !== 'function' || typeof render !== 'function') {
    throw new TypeError('Simulation step and render must be functions.');
  }
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0 ||
      !Number.isFinite(maxFrameSeconds) || maxFrameSeconds < stepSeconds) {
    throw new RangeError('Frame budget must contain at least one positive simulation step.');
  }

  // Timestamp subtraction can leave a complete tick a few ulps below its boundary.
  const epsilon = stepSeconds * 1e-9;
  const maxSteps = Math.ceil(maxFrameSeconds / stepSeconds - 1e-9);
  let previous = null;
  let accumulator = 0;

  function frame(timestampMilliseconds) {
    let delta = 0;
    if (Number.isFinite(timestampMilliseconds) && (previous === null || timestampMilliseconds >= previous)) {
      if (previous !== null) delta = Math.min((timestampMilliseconds - previous) / 1000, maxFrameSeconds);
      previous = timestampMilliseconds;
    }

    accumulator += delta;
    let steps = 0;
    while (accumulator + epsilon >= stepSeconds && steps < maxSteps) {
      step(stepSeconds);
      accumulator = Math.max(0, accumulator - stepSeconds);
      steps++;
    }

    const alpha = accumulator / stepSeconds;
    render(delta, alpha);
    return { delta, alpha, steps };
  }

  function reset(timestampMilliseconds) {
    previous = Number.isFinite(timestampMilliseconds) ? timestampMilliseconds : null;
    accumulator = 0;
  }

  return { frame, reset };
}
