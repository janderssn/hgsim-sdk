/**
 * Opt-in WebGL2 elapsed-time queries for local graphics measurements. Results
 * arrive asynchronously: never gl.finish(), readPixels(), or wait on a query.
 * A disjoint GPU clock invalidates every outstanding sample, not just one.
 */
export function createGPUProfiler(renderer, { maxPending = 8 } = {}) {
  const gl = renderer.getContext();
  const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const capacity = Math.max(1, Math.min(64, Math.floor(maxPending) || 8));
  const pending = [];
  let active = null, disposed = false, dropped = 0, invalidated = 0;

  function releaseQueries() {
    if (active) {
      if (!gl.isContextLost?.()) gl.endQuery(extension.TIME_ELAPSED_EXT);
      gl.deleteQuery(active.query);
      active = null;
    }
    for (const sample of pending) gl.deleteQuery(sample.query);
    invalidated += pending.length;
    pending.length = 0;
  }

  return {
    get available() { return !!extension && !disposed; },
    get reason() { return !extension ? 'EXT_disjoint_timer_query_webgl2 unavailable' : disposed ? 'disposed' : null; },
    get stats() { return { pending: pending.length, active: !!active, dropped, invalidated }; },
    begin(label = 'frame') {
      if (!extension || disposed || gl.isContextLost?.()) return false;
      if (active || pending.length >= capacity) { dropped++; return false; }
      const query = gl.createQuery();
      if (!query) { dropped++; return false; }
      active = { query, label };
      gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
      return true;
    },
    end() {
      if (!active || disposed) return false;
      gl.endQuery(extension.TIME_ELAPSED_EXT);
      pending.push(active);
      active = null;
      return true;
    },
    poll() {
      if (!extension || disposed) return [];
      if (gl.isContextLost?.() || gl.getParameter(extension.GPU_DISJOINT_EXT)) {
        releaseQueries();
        return [];
      }
      const complete = [];
      // Availability can be polled without stalling. Only fetch a result after
      // the driver says it is ready; later samples stay in submission order.
      while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
        const sample = pending.shift();
        const nanoseconds = gl.getQueryParameter(sample.query, gl.QUERY_RESULT);
        gl.deleteQuery(sample.query);
        if (Number.isFinite(nanoseconds) && nanoseconds >= 0) {
          complete.push({ label: sample.label, milliseconds: nanoseconds / 1e6 });
        }
      }
      return complete;
    },
    dispose() {
      if (disposed) return;
      if (extension) releaseQueries();
      disposed = true;
    },
  };
}
