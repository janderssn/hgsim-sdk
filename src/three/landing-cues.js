/**
 * Landing cues, so height and the moment to flare can be judged: a soft shadow directly under the glider that tightens
 * as the ground comes up, a height gauge in the last 12 m with the flare zone marked, and a FLARE prompt with a sound
 * when an approach enters the zone. In a dive the same gauge is the warning to back off: it appears early, and a band rising
 * from the ground shows the height a pull-out needs (red: pushing out now only just clears; amber: letting go is no longer
 * enough). Presentation only: it never touches the flight.
 *
 *   const cues = createLandingCues(THREE, scene, { onFlareCue() { audio.emit('tip'); } });
 *   cues.update({ flying, x, z, ground, feet, speedRatio, bar, sink, landable, speed, dropToImpact }, dt);
 *
 * (dropToImpact and pullOutHeights, the pure parts, are in hgsim's landing.js.)
 */
import { ZONE_LOW, ZONE_HIGH, pullOutHeights } from '../landing.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DIVE_SINK = 3;   // m/s that counts as a dive
const GAUGE_TOP = 170, GAUGE_NEAR = 12, NEAR_SHARE = .6;
export function createLandingCues(THREE, scene, { onFlareCue } = {}) {
  // Shadow: a radial gradient disc, drawn straight below whatever the sun is doing.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d'), grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.85)'); grad.addColorStop(.55, 'rgba(0,0,0,.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, fog: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 3; shadow.visible = false; shadow.userData.noShadow = true; scene.add(shadow);

  const style = document.createElement('style');
  style.textContent = `.lc-wrap{position:fixed;left:50%;top:50%;transform:translate(150px,-130px);width:62px;height:260px;pointer-events:none;opacity:0;transition:opacity .08s;z-index:30;font:800 15px "Segoe UI",system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.lc-wrap.on{opacity:1}.lc-track{position:absolute;left:0;top:0;width:8px;height:100%;background:rgba(0,0,0,.35);border-radius:4px}
.lc-zone{position:absolute;left:0;width:8px;background:#46d36a;border-radius:2px}.lc-free,.lc-push{position:absolute;left:0;bottom:0;width:8px;border-radius:0 0 4px 4px;opacity:0}.lc-free{background:#ffb02e}.lc-push{background:#ff3b30}.lc-wrap.dive .lc-free,.lc-wrap.dive .lc-push{opacity:1}.lc-wrap.amber .lc-mark{background:#ffb02e}.lc-wrap.amber .lc-num{color:#ffb02e}.lc-wrap.red .lc-mark{background:#ff3b30}.lc-wrap.red .lc-num{color:#ff3b30}.lc-mark{position:absolute;left:-4px;width:16px;height:3px;background:#fff;border-radius:2px;box-shadow:0 0 4px rgba(0,0,0,.6)}
.lc-num{position:absolute;left:18px;transform:translateY(-50%);white-space:nowrap}
.lc-flare{position:fixed;left:50%;top:27%;transform:translateX(-50%);font:900 34px "Segoe UI",system-ui,sans-serif;letter-spacing:.14em;color:#6dff91;text-shadow:0 2px 10px rgba(0,0,0,.65);opacity:0;pointer-events:none;z-index:30;transition:opacity .08s}
.lc-flare.on{opacity:1}`;
  document.head.appendChild(style);
  const wrap = document.createElement('div'); wrap.className = 'lc-wrap';
  // The last 12 m take most of the bar, so the flare zone stays readable; the rest compresses the height up to 170 m.
  const y = h => { const c = clamp(h, 0, GAUGE_TOP); return (1 - (c <= GAUGE_NEAR ? c / GAUGE_NEAR * NEAR_SHARE : NEAR_SHARE + (c - GAUGE_NEAR) / (GAUGE_TOP - GAUGE_NEAR) * (1 - NEAR_SHARE))) * 100; };
  wrap.innerHTML = `<div class="lc-track"><div class="lc-free"></div><div class="lc-push"></div><div class="lc-zone" style="top:${y(ZONE_HIGH)}%;height:${y(ZONE_LOW) - y(ZONE_HIGH)}%"></div><div class="lc-mark"></div></div><div class="lc-num"></div>`;
  const mark = wrap.querySelector('.lc-mark'), num = wrap.querySelector('.lc-num'), freeBand = wrap.querySelector('.lc-free'), pushBand = wrap.querySelector('.lc-push');
  const prompt = document.createElement('div'); prompt.className = 'lc-flare'; prompt.textContent = 'FLARE';
  document.body.append(wrap, prompt);
  let armed = true;

  return {
    update({ flying, x, z, ground, feet, speedRatio, bar, sink, landable, speed = 0, dropToImpact: drop = null }) {
      const low = flying && feet < 40;
      shadow.visible = low;
      if (low) {
        const t = clamp(feet / 40, 0, 1), size = 4.5 + 22 * t;
        shadow.position.set(x, ground + .18, z); shadow.scale.set(size, size, 1);
        material.opacity = (1 - t) * (1 - t) * .6;
      }
      // A dive is fast and heading for the ground. The gauge reads how far down that is along the flight path, so a run down a
      // hillside is quiet and the warning comes as the hill runs out ahead, not when the ground is already there.
      const need = pullOutHeights({ speed, sink }), height = drop === null ? feet : drop, diving = flying && drop !== null && sink > DIVE_SINK && speedRatio > 1.6 && height < Math.min(GAUGE_TOP, need.free * 1.5 + 10);
      const showApproach = flying && (landable || sink > DIVE_SINK) && feet < GAUGE_NEAR;
      const showGauge = showApproach || diving;
      wrap.classList.toggle('on', showGauge); wrap.classList.toggle('dive', diving);
      let level = '';
      if (showGauge) { const p = y(height); mark.style.top = p + '%'; num.style.top = p + '%'; num.textContent = Math.max(0, height).toFixed(height < 20 ? 1 : 0) + ' m'; }
      if (diving) { pushBand.style.height = 100 - y(need.push) + '%'; freeBand.style.height = 100 - y(need.free) + '%'; level = height < need.push ? 'red' : height < need.free ? 'amber' : ''; }
      wrap.classList.toggle('amber', level === 'amber'); wrap.classList.toggle('red', level === 'red');
      // The cue: at approach speed, coming down, in the zone, and not already pushing out.
      const inZone = showGauge && feet < ZONE_HIGH && feet > ZONE_LOW - .6 && speedRatio < 1.9 && sink > .15;
      const on = inZone && bar < .35;
      prompt.classList.toggle('on', on);
      if (on && armed) { armed = false; onFlareCue?.(); }
      if (!flying || feet > ZONE_HIGH + 1.5) armed = true;
    },
    dispose() { scene.remove(shadow); texture.dispose(); material.dispose(); wrap.remove(); prompt.remove(); style.remove(); },
  };
}
