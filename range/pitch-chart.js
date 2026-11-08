/**
 * The panel's pitch stability chart: for the glider flown, how fast the wing pitches back toward its trim (deg/s, + nose up)
 * when it sits at another angle of attack, with the bar pulled in, hands off and pushed out. A curve falling through zero is a
 * stable wing: where it crosses zero is the trim for that bar, and the steeper it falls, the firmer the wing holds it. Where it
 * sags toward zero at low angles, the wing has little will to pull out of a dive (a luffing sail). The green dot is now.
 *
 *   const chart = createPitchChart(canvas);
 *   chart.draw({ stability: glider.pitchStability(), stallAlpha, now: { alpha, rate } });
 */
const DEG = 180 / Math.PI;
export function createPitchChart(canvas, { maxAlpha = 20, minRate = -80, maxRate = 80 } = {}) {
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0;
  const pad = { l: 26, r: 14, t: 16, b: 22 };
  const fit = () => {
    const ratio = window.devicePixelRatio || 1, w = canvas.clientWidth || 258, h = canvas.clientHeight || 170;
    if (w !== width || h !== height) { width = w; height = h; canvas.width = w * ratio; canvas.height = h * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
  };
  const X = deg => pad.l + (deg / maxAlpha) * (width - pad.l - pad.r), Y = rate => pad.t + ((maxRate - rate) / (maxRate - minRate)) * (height - pad.t - pad.b);
  const STYLES = { '-0.3': ['#7fd0ff', 1.4, 'in'], '0': ['#f28c28', 2.2, 'hands off'], '0.3': ['rgba(244,241,234,.75)', 1.4, 'out'] };
  return {
    draw({ stability, stallAlpha = null, now = null }) {
      fit(); ctx.clearRect(0, 0, width, height);
      ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(244,241,234,.55)'; ctx.lineWidth = 1;
      for (let a = 0; a <= maxAlpha; a += 5) { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(X(a), Y(maxRate)); ctx.lineTo(X(a), Y(minRate)); ctx.stroke(); ctx.fillText(a + '°', X(a) - (a ? 8 : 3), height - 8); }
      for (let r = minRate; r <= maxRate; r += 40) { ctx.strokeStyle = r === 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(X(0), Y(r)); ctx.lineTo(X(maxAlpha), Y(r)); ctx.stroke(); ctx.fillText(String(r), 2, Y(r) + 3); }
      ctx.fillText('nose up, °/s ↑', pad.l + 4, 10); ctx.fillText('angle of attack →', width - pad.r - 84, 10);
      if (!stability) { ctx.fillText('not available for this model', X(4), Y(10)); return; }
      if (Number.isFinite(stallAlpha)) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,90,80,.6)'; ctx.beginPath(); ctx.moveTo(X(stallAlpha * DEG), Y(maxRate)); ctx.lineTo(X(stallAlpha * DEG), Y(minRate)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,120,110,.85)'; ctx.fillText('stall', X(stallAlpha * DEG) + 3, Y(maxRate) + 10);
      }
      for (const c of stability.curves) {
        const [color, lineWidth] = STYLES[String(c.bar)] ?? ['rgba(244,241,234,.5)', 1];
        ctx.beginPath(); c.points.forEach((p, i) => { const x = X(Math.min(maxAlpha, p.alpha * DEG)), y = Y(Math.max(minRate, Math.min(maxRate, p.rate * DEG))); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
        if (c.trim) { ctx.beginPath(); ctx.arc(X(c.trim.alpha * DEG), Y(0), 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
      }
      if (now && Number.isFinite(now.alpha) && Number.isFinite(now.rate)) {
        ctx.beginPath(); ctx.arc(X(Math.max(0, Math.min(maxAlpha, now.alpha * DEG))), Y(Math.max(minRate, Math.min(maxRate, now.rate * DEG))), 4, 0, Math.PI * 2); ctx.fillStyle = '#6dff91'; ctx.fill();
      }
    },
  };
}
