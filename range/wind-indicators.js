/**
 * Wind indicators: a windsock on a pole and a streamer (ribbon) on a stick. Both read a live wind object
 * ({ x, z } in m/s, the direction the air travels toward, see wind.js) and show it the way the real things do:
 * a windsock stands out straight from about 7.5 m/s (15 knots) and droops as the wind drops, hanging limp when calm;
 * a light streamer already flies level at 3 m/s and flutters. Both point downwind. The sock and ribbon are rebuilt as
 * short chains every frame (a few dozen vertices), so the droop, the swing and the flutter follow the actual wind.
 *
 *   const sock = createWindsock(THREE); scene.add(sock.group); sock.group.position.set(x, groundY, z);
 *   sock.update(wind, time);   // each frame
 *   const indicators = createWindIndicators(THREE); indicators.add(sock); indicators.update(wind, time);
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function bands(THREE, count, a, b) { const out = []; for (let i = 0; i < count; i++) out.push(new THREE.Color(i % 2 ? b : a)); return out; }

/**
 * A chain of rings (sock) or a flat ribbon (streamer) hung from an anchor, drooping with low wind.
 * fullSpeed: wind at which it flies straight; sway/flutter scale the motion.
 */
function createCloth(THREE, { length, radius, tipRadius, segments, sides, colors, fullSpeed, flutter, ribbon = false, weight = 1 }) {
  const rings = segments + 1, per = ribbon ? 2 : sides + 1, count = rings * per;
  const positions = new Float32Array(count * 3), colorAttr = new Float32Array(count * 3), index = [];
  for (let k = 0; k < rings; k++) for (let j = 0; j < per; j++) {
    const c = colors[Math.min(k, colors.length - 1)], o = (k * per + j) * 3;
    colorAttr[o] = c.r; colorAttr[o + 1] = c.g; colorAttr[o + 2] = c.b;
  }
  for (let k = 0; k < segments; k++) for (let j = 0; j < per - 1; j++) { const a = k * per + j, c = a + per; index.push(a, c, a + 1, a + 1, c, c + 1); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  geometry.setIndex(index);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.frustumCulled = false;
  const segLen = length / segments, forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Vector3();
  let phase = Math.random() * 7;
  function update(speed, yaw, time) {
    // How straight it flies, and the extra droop a heavier sock has in light air.
    const fill = smooth(0, fullSpeed, speed);
    const droopMax = Math.PI / 2 * (1 - fill) * weight;
    const flutterAmount = flutter * (0.25 + fill) * clamp(speed / fullSpeed, 0, 1.6);
    // Downwind in world space, lazily swinging in light air, trembling in strong wind.
    const swing = (1 - fill) * 0.18 * Math.sin(time * 0.9 + phase) + fill * 0.05 * Math.sin(time * 6.3 + phase);
    const dirYaw = yaw + swing;
    p.set(0, 0, 0);
    for (let k = 0; k < rings; k++) {
      const u = k / segments;
      if (k > 0) {
        // Segment k hangs down by its own weight the further out it is, and lifts with the wind.
        const theta = -droopMax * Math.pow(u, 0.85) - 0.12 * (1 - fill);
        const wobble = flutterAmount * u * (0.12 * Math.sin(time * 9.1 + k * 1.4 + phase) + 0.06 * Math.sin(time * 14.3 + k * 2.1));
        const lateral = flutterAmount * u * 0.1 * Math.sin(time * 7.4 + k * 1.1 + phase);
        forward.set(Math.sin(dirYaw + lateral) * Math.cos(theta + wobble), Math.sin(theta + wobble), Math.cos(dirYaw + lateral) * Math.cos(theta + wobble));
        p.addScaledVector(forward, segLen);
      } else forward.set(Math.sin(dirYaw), 0, Math.cos(dirYaw));
      const r = radius + (tipRadius - radius) * u;
      right.set(Math.cos(dirYaw), 0, -Math.sin(dirYaw));
      up.crossVectors(right, forward).normalize();
      for (let j = 0; j < per; j++) {
        const o = (k * per + j) * 3;
        if (ribbon) { q.copy(p).addScaledVector(right, (j ? 1 : -1) * r); }
        else { const a = j / sides * Math.PI * 2; q.copy(p).addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r); }
        positions[o] = q.x; positions[o + 1] = q.y; positions[o + 2] = q.z;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  return { mesh, update, dispose() { geometry.dispose(); material.dispose(); } };
}

/** A striped windsock on a pole. The group's origin is the base of the pole. */
export function createWindsock(THREE, { pole = 6.5, length = 2.9, radius = .42, scale = 1, colors = ['#d8432f', '#f2efe6'] } = {}) {
  const group = new THREE.Group(); group.name = 'Windsock';
  const metal = new THREE.MeshStandardMaterial({ color: '#b8bfba', roughness: .5, metalness: .5 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06 * scale, .09 * scale, pole * scale, 8), metal); mast.position.y = pole * scale * .5; mast.castShadow = true; group.add(mast);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius * scale, .025 * scale, 6, 18), metal); hoop.castShadow = true; group.add(hoop);
  const cloth = createCloth(THREE, { length: length * scale, radius: radius * scale, tipRadius: radius * .55 * scale, segments: 6, sides: 10,
    colors: bands(THREE, 7, colors[0], colors[1]), fullSpeed: 7.5, flutter: 1, weight: 1 });
  cloth.mesh.position.y = pole * scale; group.add(cloth.mesh);
  return {
    group, kind: 'windsock',
    update(wind, time = 0) {
      const speed = Math.hypot(wind?.x || 0, wind?.z || 0), yaw = speed > 0.01 ? Math.atan2(wind.x, wind.z) : 0;
      // The hoop faces the wind (its axis along the sock).
      hoop.position.y = pole * scale; hoop.rotation.set(0, yaw, 0, 'YXZ');
      cloth.update(speed, yaw, time);
    },
    dispose() { cloth.dispose(); metal.dispose(); mast.geometry.dispose(); hoop.geometry.dispose(); },
  };
}

/** A light ribbon on a stick: launches and landing fields have a few of these. */
export function createStreamer(THREE, { pole = 2.6, length = 2.4, width = .11, scale = 1, color = '#f07f2c' } = {}) {
  const group = new THREE.Group(); group.name = 'Streamer';
  const wood = new THREE.MeshStandardMaterial({ color: '#6a5640', roughness: .9 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.025 * scale, .035 * scale, pole * scale, 6), wood); stick.position.y = pole * scale * .5; stick.castShadow = true; group.add(stick);
  const cloth = createCloth(THREE, { length: length * scale, radius: width * .5 * scale, tipRadius: width * .35 * scale, segments: 8, sides: 2,
    colors: [new THREE.Color(color)], fullSpeed: 3, flutter: 2.2, ribbon: true, weight: .9 });
  cloth.mesh.material.side = THREE.DoubleSide; cloth.mesh.position.y = pole * scale; group.add(cloth.mesh);
  return {
    group, kind: 'streamer',
    update(wind, time = 0) {
      const speed = Math.hypot(wind?.x || 0, wind?.z || 0), yaw = speed > 0.01 ? Math.atan2(wind.x, wind.z) : 0;
      cloth.update(speed, yaw, time);
    },
    dispose() { cloth.dispose(); wood.dispose(); stick.geometry.dispose(); },
  };
}

/** Keeps a list of indicators and updates those near the camera (the far ones are too small to read anyway). */
export function createWindIndicators(THREE, { range = 1400 } = {}) {
  const items = [];
  return {
    items,
    add(indicator, x, y, z) { if (Number.isFinite(x)) indicator.group.position.set(x, y, z); items.push(indicator); return indicator; },
    update(wind, time, cameraPosition) {
      for (const item of items) {
        if (cameraPosition) { const p = item.group.position, dx = p.x - cameraPosition.x, dz = p.z - cameraPosition.z; if (dx * dx + dz * dz > range * range) { item.group.visible = false; continue; } }
        item.group.visible = true; item.update(wind, time);
      }
    },
    dispose() { for (const item of items) item.dispose?.(); items.length = 0; },
  };
}
