/**
 * The panel's polar chart: sink against airspeed for the glider flown (live, so tuning moves it), the other presets faintly
 * behind it, the best-glide tangent from the origin, and a dot where the glider is flying now. Canvas 2D, no dependencies.
 *
 *   const chart = createPolarChart(canvas);
 *   chart.draw({ polar: glider.polar(), others: [{ id, polar }], now: { airspeed, sink } });
 */
const KMH = 3.6;
export function createPolarChart(canvas, { maxKmh = 120, maxSink = 5 } = {}) {
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(canvas), ink = css.getPropertyValue('--ink') || '#f4f1ea', accent = css.getPropertyValue('--accent') || '#f28c28';
  let width = 0, height = 0;
  const pad = { l: 22, r: 14, t: 16, b: 22 };
  const fit = () => {
    const ratio = window.devicePixelRatio || 1, w = canvas.clientWidth || 258, h = canvas.clientHeight || 170;
    if (w !== width || h !== height) { width = w; height = h; canvas.width = w * ratio; canvas.height = h * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
  };
  const X = kmh => pad.l + (kmh / maxKmh) * (width - pad.l - pad.r), Y = sink => pad.t + (sink / maxSink) * (height - pad.t - pad.b);
  const curve = (points, style, lineWidth) => {
    ctx.beginPath(); let started = false;
    for (const p of points) { const kmh = p.airspeed * KMH; if (kmh > maxKmh || p.sink > maxSink) { if (started) break; continue; } started ? ctx.lineTo(X(kmh), Y(p.sink)) : ctx.moveTo(X(kmh), Y(p.sink)); started = true; }
    ctx.strokeStyle = style; ctx.lineWidth = lineWidth; ctx.stroke();
  };
  return {
    draw({ polar, others = [], now = null }) {
      fit(); ctx.clearRect(0, 0, width, height);
      ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(244,241,234,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (let k = 0; k <= maxKmh; k += 20) { ctx.beginPath(); ctx.moveTo(X(k), Y(0)); ctx.lineTo(X(k), Y(maxSink)); ctx.stroke(); ctx.fillText(String(k), X(k) - (k ? 8 : 3), height - 8); }
      for (let s = 0; s <= maxSink; s++) { ctx.beginPath(); ctx.moveTo(X(0), Y(s)); ctx.lineTo(X(maxKmh), Y(s)); ctx.stroke(); ctx.fillText(String(s), 6, Y(s) + 3); }
      ctx.fillText('sink, m/s ↓', pad.l + 4, 10); ctx.fillText('airspeed, km/h', width - pad.r - 68, Y(maxSink) - 4);
      for (const o of others) curve(o.polar.points, 'rgba(244,241,234,.22)', 1);
      if (!polar) return;
      // The best glide: the tangent from the origin touches the polar there.
      const best = polar.bestGlide, slope = best.sink / (best.airspeed * KMH);
      ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(maxKmh), Y(slope * maxKmh)); ctx.strokeStyle = 'rgba(244,241,234,.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      curve(polar.points, accent.trim() || '#f28c28', 2.2);
      const dot = (kmh, sink, r, fill) => { if (kmh > maxKmh || sink > maxSink || sink < 0) return; ctx.beginPath(); ctx.arc(X(kmh), Y(sink), r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
      dot(best.airspeed * KMH, best.sink, 3, ink.trim() || '#fff'); dot(polar.minSink.airspeed * KMH, polar.minSink.sink, 3, '#7fd0ff');
      if (now && Number.isFinite(now.airspeed) && Number.isFinite(now.sink)) dot(now.airspeed * KMH, Math.max(0, now.sink), 4, '#6dff91');
    },
  };
}
