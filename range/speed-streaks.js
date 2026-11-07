/**
 * Wind streaks: thin lines of air rushing past the camera, so speed reads in the view. Invisible at thermalling speed,
 * they fade in from about 90 km/h and lengthen with airspeed. Presentation only.
 *
 *   const streaks = createSpeedStreaks(THREE, scene);
 *   streaks.update(cameraPosition, { x, y, z } /* unit flight direction *\/, speed, dt);   // speed 0 hides them
 */
const COUNT = 90, RADIUS = 34;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSpeedStreaks(THREE, scene) {
  const positions = new Float32Array(COUNT * 6), offsets = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) for (let k = 0; k < 3; k++) offsets[i * 3 + k] = (Math.random() * 2 - 1) * RADIUS;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'Wind streaks'; lines.frustumCulled = false; lines.renderOrder = 5; lines.visible = false; lines.userData.noShadow = true;
  scene.add(lines);
  return {
    update(camera, direction, speed, dt) {
      const strength = clamp((speed - 25) / 22, 0, 1);
      material.opacity += (strength * strength * 0.5 - material.opacity) * (1 - Math.exp(-dt * 4));
      lines.visible = material.opacity > 0.01;
      if (!lines.visible) return;
      const length = 1 + speed * 0.09, travel = speed * dt;
      for (let i = 0; i < COUNT; i++) {
        const o = i * 3, p = i * 6;
        // Each streak drifts backward past the camera and wraps around inside a box that travels with it.
        for (let k = 0; k < 3; k++) {
          const d = k === 0 ? direction.x : k === 1 ? direction.y : direction.z;
          let v = offsets[o + k] - d * travel;
          if (v > RADIUS) v -= 2 * RADIUS; else if (v < -RADIUS) v += 2 * RADIUS;
          offsets[o + k] = v;
          const c = k === 0 ? camera.x : k === 1 ? camera.y : camera.z;
          positions[p + k] = c + v; positions[p + 3 + k] = c + v - d * length;
        }
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() { scene.remove(lines); geometry.dispose(); material.dispose(); },
  };
}
