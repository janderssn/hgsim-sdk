/**
 * Configs: every tunable number in hgsim lives in a frozen defaults object (GLIDER_DEFAULTS, AIR_DEFAULTS, LAUNCH_DEFAULTS,
 * LANDING_RULES, ...). A config is those defaults with some values changed, made with defineConfig. Configs are plain frozen
 * objects, passed explicitly to whatever uses them: there is no global tuning, so two gliders can fly side by side with
 * different numbers.
 *
 *   const heavy = defineConfig(GLIDER_DEFAULTS, { mass: 130 });
 *   overridesOf(heavy, GLIDER_DEFAULTS)   // { mass: 130 }
 */

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const sameShape = (value, base) => Array.isArray(base) ? Array.isArray(value) && value.length === base.length && value.every(Number.isFinite)
  : isPlainObject(base) ? isPlainObject(value) && Object.keys(value).every(k => k in base && sameShape(value[k], base[k]))
  : typeof base === 'number' ? Number.isFinite(value) : typeof value === typeof base;
const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const copy = v => Array.isArray(v) ? [...v] : isPlainObject(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)])) : v;

/**
 * The defaults with a patch applied, frozen. Unknown keys and values of the wrong kind throw a TypeError naming the key, so a
 * typo never fails silently. Nested objects (such as softTouchdown) may be patched in part.
 */
export function defineConfig(defaults, patch = {}, name = 'config') {
  if (patch === null || patch === undefined) return defaults;
  if (!isPlainObject(patch)) throw new TypeError(`${name}: expected an object of overrides`);
  const out = copy(defaults);
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in defaults)) throw new TypeError(`${name}: unknown key "${key}"`);
    const base = defaults[key];
    const merged = isPlainObject(base) && isPlainObject(value) ? { ...base, ...value } : value;
    if (!sameShape(merged, base)) throw new TypeError(`${name}.${key}: expected ${Array.isArray(base) ? `an array of ${base.length} numbers` : isPlainObject(base) ? `an object like ${JSON.stringify(base)}` : `a ${typeof base === 'number' ? 'finite number' : typeof base}`}`);
    out[key] = copy(merged);
  }
  return freeze(out);
}

/** The keys of config whose values differ from defaults, with their values: what to save or share to reproduce a tuning. */
export function overridesOf(config, defaults) {
  const out = {};
  for (const key of Object.keys(defaults)) if (JSON.stringify(config[key]) !== JSON.stringify(defaults[key])) out[key] = copy(config[key]);
  return out;
}
