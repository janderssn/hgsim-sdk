/**
 * Events, the same way on every vehicle: on(type, listener) hears one kind, on(listener) hears all of them, once(...) hears the next
 * one only; each returns a function that stops listening. An unknown type is a TypeError, so a misspelt event never fails silently.
 * Listeners may stop listening (or add others) while an event is being delivered.
 */
export function createEmitter(types, owner = 'events') {
  const known = Object.freeze([...types]), listeners = new Set();
  const listen = (type, f, once) => {
    if (typeof type === 'function') [type, f] = [null, type];
    if (typeof f !== 'function') throw new TypeError(`${owner}.on: expected a listener function`);
    if (type !== null && !known.includes(type)) throw new TypeError(`${owner}.on: unknown event "${type}" (known: ${known.join(', ')})`);
    const l = { type, f, once };
    listeners.add(l);
    return () => { listeners.delete(l); };
  };
  return {
    types: known,
    on: (type, f) => listen(type, f, false),
    once: (type, f) => listen(type, f, true),
    /** Delivers { type, ...detail } to the listeners; returns the event. */
    emit(type, detail = {}) {
      if (!known.includes(type)) throw new TypeError(`${owner}.emit: unknown event "${type}" (known: ${known.join(', ')})`);
      const event = { ...detail, type };
      for (const l of [...listeners]) {
        if (!listeners.has(l) || (l.type !== null && l.type !== type)) continue;
        if (l.once) listeners.delete(l);
        l.f(event);
      }
      return event;
    },
  };
}
