// Rendering adapts independently of the flight clock. Keep the full scene on
// fast devices and reduce framebuffer/shadow work when frames stay expensive.
const LEVELS = [
  { name: 'high', pixelRatio: 1.5, shadowSize: 2048, pixels: 4_000_000 },
  { name: 'medium', pixelRatio: 1, shadowSize: 1024, pixels: 2_000_000 },
  { name: 'low', pixelRatio: .75, shadowSize: 512, pixels: 1_000_000 },
];

const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Owns resolution and directional-shadow quality independently of physics.
 * sample() accepts the real frame interval in seconds. Pass false
 * for inactive pages, and reset() after a pause so hidden-tab timing is ignored.
 * onChange(level) runs once initially and after quality changes, allowing scene
 * geometry to follow the same budget without rebuilding it on every frame.
 */
export function createRenderQuality({ renderer, sun, width, height, pixelRatio = 1, onChange }) {
  let viewportWidth = positive(width, 1), viewportHeight = positive(height, 1);
  let deviceRatio = positive(pixelRatio, 1), levelIndex = 0;
  let appliedWidth, appliedHeight, appliedRatio;
  let elapsed = 0, changedAt = -Infinity, windowTime = 0, windowFrames = 0;
  let slowWindows = 0, fastWindows = 0;

  function apply() {
    const quality = LEVELS[levelIndex];
    const maxSize = positive(renderer.capabilities?.maxTextureSize, 8192);
    const ratio = Math.min(deviceRatio, quality.pixelRatio,
      Math.sqrt(quality.pixels / viewportWidth / viewportHeight),
      maxSize / viewportWidth, maxSize / viewportHeight);

    if (ratio !== appliedRatio) {
      renderer.setPixelRatio(ratio);
      appliedRatio = ratio;
    }
    if (viewportWidth !== appliedWidth || viewportHeight !== appliedHeight) {
      renderer.setSize(viewportWidth, viewportHeight);
      appliedWidth = viewportWidth;
      appliedHeight = viewportHeight;
    }

    const shadow = sun.shadow;
    const shadowSize = Math.min(quality.shadowSize, maxSize);
    if (shadow.mapSize.x !== shadowSize || shadow.mapSize.y !== shadowSize) {
      // Three.js recreates targets on the next render. Release both the depth
      // target and an optional VSM pass rather than retaining old GPU memory.
      shadow.map?.dispose();
      shadow.mapPass?.dispose();
      shadow.map = shadow.mapPass = null;
      shadow.mapSize.set(shadowSize, shadowSize);
      shadow.needsUpdate = true;
      renderer.shadowMap.needsUpdate = true;
    }
  }

  function reset() {
    windowTime = windowFrames = slowWindows = fastWindows = 0;
    changedAt = elapsed;
  }

  function sample(frameSeconds, active = true) {
    if (!active) { reset(); return false; }
    if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return false;
    // Measure elapsed time, including GPU queue stalls. One long interval closes
    // only one observation window; it cannot masquerade as several slow ones.
    elapsed += frameSeconds;
    windowTime += frameSeconds;
    windowFrames++;
    if (windowTime < 1) return false;

    const average = windowTime / windowFrames;
    windowTime = windowFrames = 0;
    let next = levelIndex;
    if (average > 1 / 45) {
      fastWindows = 0;
      slowWindows++;
      if (slowWindows >= 2 && elapsed - changedAt >= 1.5) next = Math.min(levelIndex + 1, LEVELS.length - 1);
    } else if (average < 1 / 55) {
      slowWindows = 0;
      fastWindows++;
      // Restore detail conservatively: several healthy windows and a longer
      // cooldown prevent expensive settings from oscillating every second.
      if (fastWindows >= 3 && elapsed - changedAt >= 8) next = Math.max(0, levelIndex - 1);
    } else slowWindows = fastWindows = 0;

    if (next === levelIndex) return false;
    levelIndex = next;
    changedAt = elapsed;
    slowWindows = fastWindows = 0;
    apply();
    onChange?.(LEVELS[levelIndex].name);
    return true;
  }

  apply();
  onChange?.(LEVELS[levelIndex].name);
  return {
    sample,
    reset,
    resize(width, height, pixelRatio = deviceRatio) {
      viewportWidth = positive(width, 1);
      viewportHeight = positive(height, 1);
      deviceRatio = positive(pixelRatio, 1);
      apply();
      reset();
    },
    get level() { return LEVELS[levelIndex].name; },
    get pixelRatio() { return appliedRatio; },
  };
}
