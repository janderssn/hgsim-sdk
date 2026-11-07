const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, blend) => from + (to - from) * blend;
const smooth = (min, max, value) => {
  const blend = clamp((value - min) / (max - min), 0, 1);
  return blend * blend * (3 - 2 * blend);
};

function spring3(value, velocity, target, omega, dt) {
  for (const axis of ['x', 'y', 'z']) {
    const error = value[axis] - target[axis];
    const combined = velocity[axis] + omega * error;
    const decay = Math.exp(-omega * dt);
    value[axis] = target[axis] + (error + combined * dt) * decay;
    velocity[axis] = (velocity[axis] - omega * combined * dt) * decay;
  }
}

/**
 * Presentation-only chase camera with private smoothing state.
 *
 * snapshot.position is the physical position when snapping and the interpolated
 * position when drawing. modelPosition is the drawn glider's position. time is
 * supplied by the caller in seconds; this module does not read a global clock.
 */
export function createChaseCamera(THREE, camera, { terrainHeight }) {
  const chaseOffset = new THREE.Vector3();
  const chaseOffsetVelocity = new THREE.Vector3();
  const chaseAim = new THREE.Vector3();
  const chaseAimVelocity = new THREE.Vector3();
  const desiredOffset = new THREE.Vector3();
  const desiredAim = new THREE.Vector3();
  const cameraUp = new THREE.Vector3(0, 1, 0);
  const target = new THREE.Vector3();
  const sideCamera = new THREE.Vector3();
  const launchCamera = new THREE.Vector3();
  let chaseLive = false;
  let launchCameraLive = false;

  function update(snapshot, dt, { snap = false } = {}) {
    const {
      position,
      modelPosition,
      mode,
      heading,
      bank,
      speed,
      pathAngle,
      runUp,
      takeoff,
      impact,
      time,
    } = snapshot;
    const flying = mode === 'gliding';
    const path = flying ? pathAngle || 0 : 0;
    const viewPath = clamp(path, -.75, .5) * .85;
    const horizontal = Math.cos(viewPath);
    const forwardX = Math.sin(heading) * horizontal;
    const forwardY = Math.sin(viewPath);
    const forwardZ = Math.cos(heading) * horizontal;
    const sideX = -Math.cos(heading);
    const sideZ = Math.sin(heading);

    // Near the ground, come down and in so height reads against the horizon.
    const lowView = flying
      ? 1 - smooth(4, 22, position.y - terrainHeight(position.x, position.z))
      : 0;
    const back = flying ? (10.5 + speed * .05) * (1 - .15 * lowView) : 11;
    const rise = flying ? 3.9 - 2.2 * lowView : 3.4;
    const ahead = 55;
    desiredOffset.set(
      -forwardX * back - sideX * bank * 6,
      -forwardY * back + rise,
      -forwardZ * back - sideZ * bank * 6,
    );
    const floor = Math.max(
      terrainHeight(position.x + desiredOffset.x, position.z + desiredOffset.z) + 4,
      terrainHeight(position.x + desiredOffset.x * .5, position.z + desiredOffset.z * .5) + 3,
    ) - position.y;
    if (desiredOffset.y < floor) desiredOffset.y = floor;
    desiredAim.set(
      forwardX * ahead + sideX * bank * 14,
      forwardY * ahead - 6,
      forwardZ * ahead + sideZ * bank * 14,
    );

    if (snap || !chaseLive) {
      chaseOffset.copy(desiredOffset);
      chaseAim.copy(desiredAim);
      chaseOffsetVelocity.set(0, 0, 0);
      chaseAimVelocity.set(0, 0, 0);
      chaseLive = true;
    } else {
      spring3(chaseOffset, chaseOffsetVelocity, desiredOffset, 3.2, dt);
      spring3(chaseAim, chaseAimVelocity, desiredAim, 4.5, dt);
    }
    camera.position.set(
      position.x + chaseOffset.x,
      Math.max(
        position.y + chaseOffset.y,
        terrainHeight(position.x + chaseOffset.x, position.z + chaseOffset.z) + 1.5,
      ),
      position.z + chaseOffset.z,
    );
    target.set(position.x + chaseAim.x, position.y + chaseAim.y, position.z + chaseAim.z);

    // Watch launches from the side, then blend back into the chase view.
    const launchView = mode === 'ready' || runUp
      ? 1
      : takeoff ? 1 - smooth(1.4, 2.8, takeoff.t) : 0;
    if (launchView > 0) {
      // On a snap, the drawn model's position can still belong to the old frame.
      const fresh = !snap && launchCameraLive;
      sideCamera.set(
        position.x - 9,
        (fresh ? modelPosition.y : position.y - 2.1) + 1.1,
        position.z + 4.5,
      );
      if (!fresh) {
        launchCamera.copy(sideCamera);
        launchCameraLive = true;
      } else {
        launchCamera.lerp(sideCamera, 1 - Math.exp(-dt * 4));
      }
      camera.position.lerp(launchCamera, launchView);
      target.lerp(
        sideCamera.set(modelPosition.x, modelPosition.y - .3, modelPosition.z + .8),
        launchView,
      );
    } else {
      launchCameraLive = false;
    }

    cameraUp.set(sideX * bank * .12, 1, sideZ * bank * .12);
    camera.up.lerp(cameraUp, 1 - Math.exp(-dt * 5)).normalize();
    camera.lookAt(target);
    camera.fov = lerp(
      camera.fov,
      flying ? 58 + speed * .22 : 50,
      snap ? 1 : 1 - Math.exp(-dt * 2),
    );
    camera.updateProjectionMatrix();

    if (impact > .005) {
      const strength = impact * impact;
      camera.position.y -= strength * .9;
      camera.rotateX(
        (Math.sin(time * 37) + Math.sin(time * 23)) * strength * .014 + strength * .05,
      );
      camera.rotateZ(Math.sin(time * 31) * strength * .012);
    }
    if (flying) {
      const lowAltitude = position.y - terrainHeight(position.x, position.z) < 30;
      const buzz = clamp((speed - 26) / 18, 0, 1) * .05 * (1 + (lowAltitude ? 1.5 : 0));
      if (buzz > .001) {
        camera.rotateX((Math.sin(time * 47) + Math.sin(time * 29)) * buzz * .01);
        camera.rotateY((Math.sin(time * 41) + Math.sin(time * 23)) * buzz * .01);
      }
    }
  }

  return { update };
}
