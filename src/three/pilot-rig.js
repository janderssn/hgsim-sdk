/**
 * Poses the skinned pilot of hang-glider.glb and exposes its foot and control-bar contact points.
 *
 * The bar is fixed to the wing and the pilot hangs from it, so the body is what moves: pulling in swings it forward until
 * the bar is under the chest, pushing out swings it back to straight arms, and a weight shift swings it sideways about the
 * hang point, with the legs and the pod trailing behind. Hands stay on the bar, or on the uprights when standing and flaring.
 * On the ground the feet are planted by moving the body under the wing, so the wing itself rides level through a run.
 *
 * Space: the Pilot node's frame, which is the wing's (+Z forward, +Y up, game Left at -X). Bones are authored standing.
 */
const LEFT = -1, RIGHT = 1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };
const ORDER = ['Pelvis', 'Spine', 'Chest', 'Neck', 'Head', 'PodTail', 'UpperArm_L', 'ForeArm_L', 'Hand_L', 'UpperArm_R', 'ForeArm_R', 'Hand_R', 'Thigh_L', 'Shin_L', 'Foot_L', 'Thigh_R', 'Shin_R', 'Foot_R', 'Strap'];
const CARRY_DROP = .46;       // hands below the shoulders when carrying the wing
const STRAP_REACH = 1.349;   // hang point to pelvis along the strap
const BONE_TIPS = { Foot_L: [-.105, -.955, .18], Foot_R: [.105, -.955, .18] };   // standing positions of the toes

/** A damped spring: it overshoots a little, so a weight shift has weight. */
function spring(omega, damping) {
  const s = { x: 0, v: 0, step(target, dt) { const steps = Math.max(1, Math.ceil(dt / .008)), h = dt / steps; for (let i = 0; i < steps; i++) { s.v += (omega * omega * (target - s.x) - 2 * damping * omega * s.v) * h; s.x += s.v * h; } return s.x; }, set(x) { s.x = x; s.v = 0; } };
  return s;
}

export function createPilotRig(THREE, pilot) {
  const bones = {}; for (const name of ORDER) { bones[name] = pilot.getObjectByName(name); if (!bones[name]) return null; }
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), Q = () => new THREE.Quaternion();
  const data = pilot.userData || {}, hang = V().fromArray(data.hangPoint || [0, 1, .8]);
  const barL = V().fromArray(data.bar?.[0] || [-.642, -.586, 1.001]), barR = V().fromArray(data.bar?.[1] || [.642, -.586, 1.001]);
  const upL = (data.uprightLeft || [[-.04, .895, .753], [-.663, -.564, .997]]).map(p => V().fromArray(p)), upR = (data.uprightRight || [[.04, .895, .753], [.663, -.564, .997]]).map(p => V().fromArray(p));
  pilot.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = false; });

  // Rest pose in the Pilot frame.
  pilot.updateMatrixWorld(true);
  const toPilot = new THREE.Matrix4().copy(pilot.matrixWorld).invert(), m = new THREE.Matrix4(), tmpS = V();
  const restP = {}, restQ = {}, parent = {};
  for (const name of ORDER) { m.multiplyMatrices(toPilot, bones[name].matrixWorld); restP[name] = V(); restQ[name] = Q(); m.decompose(restP[name], restQ[name], tmpS); parent[name] = ORDER.includes(bones[name].parent?.name) ? bones[name].parent.name : null; }
  const rootParent = {}; for (const name of ORDER) if (!parent[name]) { const up = bones[name].parent; m.multiplyMatrices(toPilot, up.matrixWorld); const q = Q(), p = V(); m.decompose(p, q, tmpS); rootParent[name] = { inverse: new THREE.Matrix4().copy(m).invert(), q }; }
  const length = (a, b) => restP[a].distanceTo(restP[b]);
  const arm = { upper: length('UpperArm_L', 'ForeArm_L'), fore: length('ForeArm_L', 'Hand_L') };
  const worldQ = {}, worldP = {}, delta = {}; for (const name of ORDER) { worldQ[name] = Q(); worldP[name] = V(); delta[name] = Q(); }
  const q1 = Q(), q2 = Q(), v1 = V(), v2 = V(), v3 = V(), X = V(1, 0, 0), Y = V(0, 1, 0), ZA = V(0, 0, 1);
  const axisScale = name => { const local = Y.clone().applyQuaternion(q1.copy(restQ[name]).invert()); return [Math.abs(local.x), Math.abs(local.y), Math.abs(local.z)]; };
  const strapAxis = axisScale('Strap'), podAxis = (() => { const d = restP.PodTail.clone().sub(restP.Pelvis); void d; const local = V(0, -1, 0).applyQuaternion(q1.copy(restQ.PodTail).invert()); return [Math.abs(local.x), Math.abs(local.y), Math.abs(local.z)]; })();

  /** Sets a bone from its rotation away from rest; children inherit position from where their parent ends up. */
  function place(name, rotation, position = null, scale = 1, axis = null) {
    delta[name].copy(rotation); worldQ[name].multiplyQuaternions(rotation, restQ[name]);
    const up = parent[name], bone = bones[name];
    if (up) {
      worldP[name].copy(restP[name]).sub(restP[up]).applyQuaternion(delta[up]).add(worldP[up]);
      bone.quaternion.copy(q1.copy(worldQ[up]).invert().multiply(worldQ[name]));
    } else {
      worldP[name].copy(position); const r = rootParent[name];
      bone.position.copy(position).applyMatrix4(r.inverse);
      bone.quaternion.copy(q1.copy(r.q).invert().multiply(worldQ[name]));
    }
    if (axis) bone.scale.set(1 + (scale - 1) * axis[0], 1 + (scale - 1) * axis[1], 1 + (scale - 1) * axis[2]);
  }
  /** Rotation that turns the given rotated bone direction to `to`, on top of `base`, so a roll of the body is kept. */
  function aim(out, base, restFrom, restTo, to) {
    v1.copy(restTo).sub(restFrom).applyQuaternion(base).normalize(); q2.setFromUnitVectors(v1, v2.copy(to).normalize());
    return out.multiplyQuaternions(q2, base);
  }
  // standQ: standing under a wing that rolls and yaws on the shoulders, the body keeps itself upright and facing down the run
  // (the wing turns about it; the arms reach the uprights wherever they are).
  const standQ = Q(), standE = new THREE.Euler();
  // Carrying the wing the pilot stands inside the control frame with the uprights resting on the shoulders: the body stands
  // where its shoulders meet the uprights, and keeps itself upright about that contact.
  const CONTACT = V(0, .56, .81), pivot = V();
  const STAND_LEAN = .1;   // standing, the upper body leans this far forward of the vertical (radians)
  const uprightZ = y => upL[0].z + (upL[0].y - y) / (upL[0].y - upL[1].y) * (upL[1].z - upL[0].z);
  const pitched = (out, roll, pitch) => { out.setFromAxisAngle(X, pitch); return out.premultiply(q2.setFromAxisAngle(ZA, roll)).premultiply(standQ); };

  const swing = spring(6.5, .42), trail = spring(4.2, .5), bar = spring(7, .7), upright = spring(4.6, .9), run = spring(9, 1), crash = spring(6, .8);
  // After a launch (input.swing) the body is a pendulum on the strap: it swings up into the harness and a little past before it
  // settles, and the legs hang from the hips, lag behind it and tuck up into the pod after it.
  const hangSwing = spring(6.2, .34), legSwing = spring(5.4, .42), legSwing2 = spring(4.7, .4);   // (each leg on its own, a beat apart)
  let swingOn = 0;
  // The hands change grip one at a time: the left follows the body at once, the right does the same a second later. hold: a
  // short history of where the hands are wanted (0 on the bar, 1 on the uprights), so the second hand replays the first.
  const HAND_GAP = .95, hold = [], handAt = { [LEFT]: 0, [RIGHT]: 0 }, handMoving = { [LEFT]: 0, [RIGHT]: 0 }, handGo = { [LEFT]: spring(9, .85), [RIGHT]: spring(9, .85) };
  const heldAgo = ago => { const t = time - ago; for (let i = hold.length - 1; i >= 0; i--) if (hold[i][0] <= t) return hold[i][1]; return hold.length ? hold[0][1] : 0; };
  const stage = (t, a, b) => ease((t - a) / (b - a));
  const easeOver = t => t < 0 ? t : ease(t);   // (eased, but a swing past prone carries on past it)
  let phase = 0, time = 0, lowest = -.65, strideLift = 0, runSpeed = 0, gripHold = 0, planted = 0;
  const body = Q(), spine = Q(), chest = Q(), neck = Q(), head = Q(), shoulder = V(), elbow = V(), hand = V(), upper = Q(), fore = Q(), pose = Q(), pelvis = V();
  const footTip = { L: V(), R: V() }, heel = { L: V(), R: V() }, feetPoint = V();
  const barContacts = [barL, barL.clone().lerp(barR, .5), barR];
  const footContacts = [footTip.L, heel.L, footTip.R, heel.R];

  function legs(tag, side, u, r, c, p, rollAngle, step, tuck = 0) {
    // Hip and knee angles: h swings the thigh forward, k bends the knee back.
    const prone = { h: .06 + (side === LEFT ? .015 : -.015), k: .14 + .03 * Math.sin(time * .9 + side) };
    const stand = { h: 0, k: .035 };   // (straight legs, from the world's vertical: see legBase)
    const stride = (.55 + .45 * clamp(runSpeed / 6, 0, 1)) * (1 + .45 * strideLift), runPose = { h: .32 + .62 * stride * Math.sin(step), k: .42 + .72 * stride * Math.max(0, Math.sin(step + 2.2)) };
    const crashed = { h: .9 + side * .25, k: 1.5 - side * .4 };
    let h = lerp(prone.h, lerp(stand.h, runPose.h, r), u), k = lerp(prone.k, lerp(stand.k, runPose.k, r), u);
    h = lerp(h, crashed.h, c); k = lerp(k, crashed.k, c); k += tuck;
    const thighAngle = p - h, shinAngle = thighAngle + k;
    place('Thigh_' + tag, pitched(pose, rollAngle, thighAngle));
    place('Shin_' + tag, pitched(pose, rollAngle, shinAngle));
    // Toes point along the leg in flight; on the ground the foot stays near level through the stride.
    const footFlight = shinAngle + 1.0, footGround = lerp(.06, shinAngle * .55 + .12 * Math.sin(step), r);
    place('Foot_' + tag, pitched(pose, rollAngle, lerp(footFlight, footGround, ease(u * 1.3)) - tuck * .5));
    const tip = BONE_TIPS['Foot_' + tag];
    footTip[tag].set(tip[0], tip[1], tip[2]).sub(restP['Foot_' + tag]).applyQuaternion(delta['Foot_' + tag]).add(worldP['Foot_' + tag]);
  }
  function arms(tag, side, u, c, push) {
    const up = side === LEFT ? upL : upR, uName = 'UpperArm_' + tag, fName = 'ForeArm_' + tag, hName = 'Hand_' + tag;
    place(uName, chest); shoulder.copy(worldP[uName]);
    // On the bar, a fist's width in from the middle of each half, with the wrist just above and behind it.
    const onBar = v1.copy(barL).lerp(barR, side === LEFT ? .2 : .8); onBar.y += .075; onBar.z -= .025;
    // On the upright, a little inside the tube: arms down and out along the uprights to carry the wing, mid-upright lifting it off the
    // ground, shoulder height pushing out in the flare.
    const wantY = clamp(lerp(lerp(shoulder.y + .02, shoulder.y + lerp(-CARRY_DROP, .02, push), u), lerp(up[1].y, up[0].y, .5), gripHold), up[1].y + .1, up[0].y - .12), t = (up[0].y - wantY) / (up[0].y - up[1].y);
    const onUpright = v2.copy(up[0]).lerp(up[1], t); onUpright.x -= side * .035; onUpright.z -= .03;
    // One hand at a time between the bar and the uprights, each lifting a little off the tube as it goes.
    const held = handAt[side];
    hand.copy(onBar).lerp(onUpright, held);
    hand.y += .08 * Math.sin(Math.PI * clamp(held, 0, 1)) * handMoving[side]; hand.z -= .04 * Math.sin(Math.PI * clamp(held, 0, 1)) * handMoving[side];
    if (c > 0) { v3.set(side * .1, -.42, .22).applyQuaternion(body).add(shoulder); hand.lerp(v3, c); }
    const reach = v3.copy(hand).sub(shoulder), dist = clamp(reach.length(), .1, (arm.upper + arm.fore) * .992); reach.normalize();
    const a = (arm.upper * arm.upper - arm.fore * arm.fore + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, arm.upper * arm.upper - a * a));
    // Elbows out and a little down, with the arms nearly straight when carrying the wing.
    const pole = v1.set(side, lerp(.1, -.4, u), -.35); pole.addScaledVector(reach, -pole.dot(reach)).normalize();
    elbow.copy(shoulder).addScaledVector(reach, a).addScaledVector(pole, h);
    aim(upper, chest, restP[uName], restP[fName], v2.copy(elbow).sub(shoulder)); place(uName, upper);
    hand.copy(shoulder).addScaledVector(reach, dist);
    aim(fore, upper, restP[fName], restP[hName], v2.copy(hand).sub(elbow)); place(fName, fore);
    place(hName, fore);
  }

  /**
   * input: bar -1..1 (+ pulled in, the opposite of the flight state's bar), shift -1..1, upright 0..1, run 0..1, speed m/s,
   * crashed 0..1, look (head yaw), quick (a fast change of stance), lift 0..1 (the straps carrying the weight on a run: longer, lighter
   * strides), carry 0..1 (the wing riding on the shoulders, so the body does not bob under it), lean (forward lean of the standing body,
   * radians, in this frame), grip 0..1 (hands mid-upright, as when lifting the resting wing, instead of down for the run), plant 0..1 with ground (its height in the Pilot frame) and tilt (its slope along +Z).
   * swing 0..1: after a launch, the body swings up into the harness on the strap and the legs follow it, instead of one stiff change.
 * level: the pitch (radians, in this frame) that is the world's vertical, so legs standing still stand straight up.
 * handGap: seconds between the first hand and the second changing grip (default about one).
 * shoulders 0..1: the uprights resting on the shoulders (the body stands inside the control frame, the wing turning about them).
 * snap: go straight to the pose, with no swing, for cuts.
   */
  function update(dt, input = {}, snap = false) {
    time += dt;
    const targetBar = clamp(input.bar || 0, -1, 1), targetShift = clamp(input.shift || 0, -1, 1), targetUp = clamp(input.upright || 0, 0, 1), targetRun = clamp(input.run || 0, 0, 1), targetCrash = clamp(input.crashed || 0, 0, 1);
    if (snap) { bar.set(targetBar); swing.set(targetShift); trail.set(targetShift); upright.set(targetUp); run.set(targetRun); crash.set(targetCrash); }
    // The hands: the first goes for its new grip at once, the second a second later; each takes about a third of a second.
    if (snap) hold.length = 0;
    const gap = clamp(input.handGap ?? HAND_GAP, 0, 2);
    hold.push([time, targetUp]); while (hold.length > 2 && hold[1][0] < time - HAND_GAP - .5) hold.shift();
    for (const [side, ago] of [[LEFT, 0], [RIGHT, gap]]) {
      const go = handGo[side]; if (snap) go.set(targetUp); const was = handAt[side];
      handAt[side] = clamp(go.step(heldAgo(ago), dt), 0, 1); handMoving[side] = snap ? 0 : lerp(handMoving[side], clamp(Math.abs(handAt[side] - was) / Math.max(dt, 1e-3) / 1.5, 0, 1), 1 - Math.exp(-dt / .06));
    }
    // Sitting up, the hands go first (a hand on the bar cannot reach it from upright): the body stays down until the second hand
    // is on its way to its upright, then sits up in one motion.
    const bodyUp = targetUp > upright.x + .01 ? Math.min(targetUp, upright.x + (targetUp - upright.x) * ease((Math.min(handAt[LEFT], handAt[RIGHT]) - .25) / .55)) : targetUp;
    const b = bar.step(targetBar, dt), sh = swing.step(targetShift, dt), tr = trail.step(targetShift, dt), uFast = clamp(upright.step(bodyUp, input.quick ? dt * 2.2 : dt), 0, 1), r = clamp(run.step(targetRun, input.quick ? dt * 2.2 : dt), 0, 1), c = clamp(crash.step(targetCrash, dt), 0, 1);
    // The swing after a launch: the body on its pendulum (it may swing a little past prone), the legs lagging the body.
    swingOn = snap ? clamp(input.swing || 0, 0, 1) : lerp(swingOn, clamp(input.swing || 0, 0, 1), 1 - Math.exp(-dt / .25));
    if (snap || swingOn < .01) { hangSwing.set(uFast); legSwing.set(uFast); legSwing2.set(uFast); }
    const hung = clamp(hangSwing.step(bodyUp, dt), -.2, 1), hanging = clamp(legSwing.step(Math.max(hung, 0), dt), -.1, 1), hanging2 = clamp(legSwing2.step(Math.max(hung, 0), dt), -.1, 1);
    // The spine is not a plank: it bends against the swing (the hips lead, the chest and head follow) and whips back as it settles.
    const whip = swingOn * clamp(hangSwing.v * .09, -.35, .35);
    const u = lerp(uFast, Math.max(hung, 0), swingOn), eu = lerp(ease(uFast), easeOver(hung), swingOn), uLeg = lerp(uFast, hanging, swingOn);
    // Knees bend as the legs come up from hanging to the pod, the heels up behind, then straighten into it.
    const uLeg2 = lerp(uFast, hanging2, swingOn), knees = x => swingOn * 1.35 * Math.sin(Math.PI * clamp(x, 0, 1)) * clamp(1 - r * 1.5, 0, 1) * (1 - c);
    const tuck = knees(uLeg), tuck2 = knees(uLeg2);
    const speed = runSpeed = Math.max(0, input.speed || 0), carried = clamp(input.carry || 0, 0, 1), leanF = (input.lean || 0) * eu, tilt = input.tilt || 0;
    strideLift = clamp(input.lift || 0, 0, 1); gripHold = clamp(input.grip || 0, 0, 1);
    standQ.setFromEuler(standE.set(0, clamp(input.standYaw || 0, -.9, .9) * eu * (1 - c), clamp(input.standRoll || 0, -.6, .6) * eu * (1 - c), 'ZYX'));
    phase += dt * Math.PI * 2 * (1.5 + Math.min(speed, 12) * .13) * (1 - .4 * strideLift) * Math.max(r, .001);

    const push = Math.max(0, -b);
    const onShoulders = clamp(input.shoulders ?? 0, 0, 1) * eu * (1 - c);
    const solve = (lift, ahead = 0) => {
    // Body: where the pelvis hangs, how it lies, and the swing about the hang point. The strap holds it on an arc under the hang point.
    const bob = r * Math.abs(Math.sin(phase)) * .045 * (1 - carried);
    const flyZ = .44 + (b > 0 ? b * .3 : b * .22), flyY = hang.y - Math.sqrt(STRAP_REACH * STRAP_REACH - (hang.z - flyZ) * (hang.z - flyZ));
    pelvis.set(0, lerp(flyY, .02 + bob - r * .07, eu) + lift, lerp(flyZ, lerp(.58, .34, push), eu));
    // Standing, the body leans forward from the hips (into the straps, or over a resting wing): the legs stay under it.
    let p = lerp(1.43 + (b > 0 ? b * .12 : b * .08), lerp(STAND_LEAN + Math.max(0, -b) * -.08, .24, r), eu) + leanF; pelvis.z += leanF * .3 + ahead;
    if (c > 0) { p = lerp(p, 1.05, c); pelvis.y = lerp(pelvis.y, -.32, c); pelvis.z = lerp(pelvis.z, .55, c); }
    // In flight a shift swings the body about the hang point; standing, the feet stay put and the upper body leans into it.
    const roll = -sh * .27 * (1 - eu) * (1 - c), lean = -sh * .2 * eu * (1 - c);
    if (roll) { v1.copy(pelvis).sub(hang).applyAxisAngle(ZA, roll); pelvis.copy(hang).add(v1); }
    pivot.copy(hang).lerp(CONTACT, onShoulders); v1.copy(pelvis).sub(pivot).applyQuaternion(standQ); pelvis.copy(pivot).add(v1);
    pitched(body, roll, p); pitched(spine, roll * 1.05 + lean * .5, p - .05 * (1 - eu) + whip * .6); pitched(chest, roll * 1.1 + lean, p - lerp(.15, -.02 + r * .08, eu) + whip);
    place('Pelvis', body, pelvis); place('Spine', spine); place('Chest', chest);

    // Head: level eyes ahead, turning into the turn.
    const headPitch = lerp(.46, .03 + r * .1, eu) + c * .4, yaw = clamp((input.look || 0) + sh * .42, -.9, .9) * (1 - c);
    head.setFromAxisAngle(Y, yaw).multiply(pose.setFromAxisAngle(X, headPitch)).premultiply(q2.setFromAxisAngle(ZA, roll * .45 + lean * .3)).premultiply(standQ);
    neck.copy(chest).slerp(head, .5); place('Neck', neck); place('Head', head);

    arms('L', LEFT, u, c, push); arms('R', RIGHT, u, c, push);

    // Legs and pod trail the swing; the pod folds back and shortens as the legs come out of it.
    const legRoll = roll + (sh - tr) * .3 * (1 - eu), sway = Math.sin(time * 1.3) * .012 * (1 - eu);
    // The legs hang from the hips on their own swing: where the body would be at their own stage, not where it is.
    const legAt = x => lerp(p, lerp(1.43 + (b > 0 ? b * .12 : b * .08), lerp(-.1 + Math.max(0, -b) * -.08, .24, r), easeOver(x)) + leanF, swingOn);
    const pLeg = legAt(uLeg), pLeg2 = legAt(uLeg2), eLeg = lerp(eu, ease((uLeg + uLeg2) / 2), swingOn);
    const level = input.level ?? null, legBase = x => level == null ? x : lerp(x, level, ease(u) * (1 - r) * (1 - c));
    legs('L', LEFT, lerp(u, Math.max(uLeg, 0), swingOn), r, c, legBase(pLeg - leanF), legRoll + sway, phase, tuck); legs('R', RIGHT, lerp(u, Math.max(uLeg2, 0), swingOn), r, c, legBase(pLeg2 - leanF), legRoll + sway, phase + Math.PI, tuck2);
    place('PodTail', pitched(pose, legRoll * 1.2, pLeg - leanF + lerp(.03 + Math.sin(time * 1.1) * .012, .58 + r * .22 + Math.sin(phase * 2) * .05 * r, eLeg)), null, lerp(1, .74, eLeg), podAxis);

    // Main strap, from the carabiner on the back to the hang point.
    v1.set(0, .14, -.13).applyQuaternion(chest).add(worldP.Chest); v2.copy(hang); v2.y -= .03;
    v3.copy(v2).sub(v1); const strapLength = v3.length(); pose.setFromUnitVectors(Y, v3.normalize());
    place('Strap', pose, v1, strapLength, strapAxis);

    // The point the feet stand on: each foot's lowest point (toe or heel) against the ground, which slopes tilt along +Z, with the
    // weight passing between the feet over the last 12 cm of their difference in clearance, so a stride never moves the body in a step.
    const clearance = p => p.y - tilt * p.z;
    for (const side of ['L', 'R']) { heel[side].copy(worldP['Foot_' + side]); heel[side].y -= .09; }
    const lowL = clearance(heel.L) < clearance(footTip.L) ? heel.L : footTip.L;
    const lowR = clearance(heel.R) < clearance(footTip.R) ? heel.R : footTip.R;
    feetPoint.lerpVectors(lowL, lowR, clamp(.5 + (clearance(lowL) - clearance(lowR)) / .24, 0, 1));
    };
    solve(0);
    // Into the frame: forward until the shoulders are under the uprights (the tubes on top of them, a little ahead of the joints).
    let ahead = 0;
    if (onShoulders > 0) { const sy = (worldP.UpperArm_L.y + worldP.UpperArm_R.y) / 2, sz = (worldP.UpperArm_L.z + worldP.UpperArm_R.z) / 2; ahead = clamp(uprightZ(sy + .06) - .03 - sz, -.1, .45) * onShoulders; if (ahead) solve(0, ahead); }
    // Plant the feet: the body rises or sinks under the wing, down as far as the strap lets it. The body never moves in a step: a
    // fast change in where the feet meet the ground (the first running stride, a stride at speed) is taken up over 50 ms.
    const plant = clamp(input.plant || 0, 0, 1);
    const want = plant > 0 ? clamp((input.ground || 0) + tilt * feetPoint.z - feetPoint.y, Math.min(0, -.3 - pelvis.y), .8) * plant : 0;
    planted = snap ? want : lerp(planted, want, 1 - Math.exp(-dt / .05));
    if (planted) solve(planted, ahead);
    // Smoothed, so the stride does not shake whatever is drawn from it.
    const low = Math.min(feetPoint.y, barL.y - .03);
    lowest = snap ? low : lerp(lowest, low, 1 - Math.exp(-dt * 6));
    return lowest;
  }

  update(0, {}, true);
  return { update, feetPoint, footContacts, barContacts, get lowest() { return lowest; }, get step() { return phase; }, get upright() { return upright.x; }, get hands() { return [handAt[LEFT], handAt[RIGHT], hold.length]; } };
}

/** Cloth life: a ripple running back along the sail, growing with the speed and near the stall. */
export function addSailFlutter(wing) {
  const uniforms = { uFlutterTime: { value: 0 }, uFlutterAmp: { value: 0 } };
  wing.traverse(o => {
    if (!o.isMesh || !o.userData?.isSail) return;
    const previous = o.material;
    const originalCompile = previous.onBeforeCompile, originalKey = previous.customProgramCacheKey.call(previous);
    const material = previous.clone(); o.material = material;
    material.onBeforeCompile = (shader, renderer) => {
      originalCompile.call(material, shader, renderer);
      shader.uniforms.uFlutterTime = uniforms.uFlutterTime; shader.uniforms.uFlutterAmp = uniforms.uFlutterAmp;
      shader.vertexShader = 'uniform float uFlutterTime; uniform float uFlutterAmp;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float flutterFront = 2.42 - .63 * abs(position.x);
        float flutterAft = clamp((flutterFront - position.z) / (flutterFront + 1.05), 0., 1.);
        flutterAft = flutterAft * flutterAft * flutterAft;
        transformed.y += uFlutterAmp * flutterAft * (sin(uFlutterTime * 17. + position.z * 7. + position.x * 2.3) + .6 * sin(uFlutterTime * 29. + position.x * 5.1 - position.z * 4.));`);
    };
    material.customProgramCacheKey = () => originalKey + '|sail-flutter-v2';
  });
  return { update(dt, { speed = 0, stall = 0 } = {}) { uniforms.uFlutterTime.value += dt; const fast = clamp((speed - 12) / 28, 0, 1); uniforms.uFlutterAmp.value = .003 + .012 * fast * fast + .035 * clamp(stall, 0, 1); } };
}
