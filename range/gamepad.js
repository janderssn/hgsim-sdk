// Xbox-style (standard mapping) controller support.
// Buttons are turned into the same key events the keyboard sends, so menus, the mountain view, the gear
// screen and the world keep a single input path. Sticks and triggers are also exposed as analog values
// for flying and walking. Which key a button sends depends on what is on screen (the context).

export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'];
const ARROWS = { [PAD.UP]: 'ArrowUp', [PAD.DOWN]: 'ArrowDown', [PAD.LEFT]: 'ArrowLeft', [PAD.RIGHT]: 'ArrowRight' };

// Button index -> key code, per context. Arrows on the d-pad are added for the screen contexts.
export const BUTTON_MAP = {
  title: { [PAD.A]: 'Space', [PAD.MENU]: 'Space' },
  modal: { [PAD.A]: 'Space', [PAD.B]: 'Escape', [PAD.Y]: 'KeyI', [PAD.MENU]: 'Escape' },
  world: {
    [PAD.A]: 'Space', [PAD.B]: 'KeyN', [PAD.X]: 'KeyE', [PAD.Y]: 'KeyI', [PAD.LB]: 'KeyG', [PAD.RB]: 'KeyF',
    [PAD.VIEW]: 'KeyM', [PAD.MENU]: 'Escape', [PAD.LS]: 'ShiftLeft', [PAD.RS]: 'LookReset',
    [PAD.UP]: 'KeyR', [PAD.DOWN]: 'KeyH', [PAD.RIGHT]: 'KeyT', [PAD.LEFT]: 'KeyC',
  },
  map: {
    [PAD.A]: 'Enter', [PAD.B]: 'Escape', [PAD.X]: 'KeyF', [PAD.Y]: 'KeyT', [PAD.LB]: 'ShiftTab', [PAD.RB]: 'Tab',
    [PAD.LT]: 'KeyX', [PAD.RT]: 'KeyZ', [PAD.VIEW]: 'KeyM', [PAD.MENU]: 'Escape', [PAD.RS]: 'KeyC', ...ARROWS,
  },
  menu: { [PAD.A]: 'Enter', [PAD.B]: 'Escape', [PAD.Y]: 'KeyI', [PAD.MENU]: 'Escape', [PAD.VIEW]: 'KeyM', ...ARROWS },
  gear: {
    [PAD.A]: 'Enter', [PAD.B]: 'Escape', [PAD.X]: 'KeyX', [PAD.Y]: 'KeyF', [PAD.LB]: 'KeyQ', [PAD.RB]: 'KeyE',
    [PAD.LT]: 'KeyS', [PAD.RT]: 'KeyT', [PAD.RS]: 'KeyV', [PAD.MENU]: 'Escape', ...ARROWS,
  },
};
// Keys that are analog on the pad in the world (no button sends them).
const WORLD_ANALOG = { KeyW: 'RT', KeyS: 'LT', KeyA: 'LS', KeyD: 'LS', ArrowUp: 'LS', ArrowDown: 'LS', ArrowLeft: 'LS', ArrowRight: 'LS' };
const MAP_ANALOG = { KeyW: 'LS', KeyA: 'LS', KeyS: 'LS', KeyD: 'LS', KeyQ: 'RS', KeyE: 'RS', Wheel: 'LT / RT' };

/** The pad button that does what `code` does on the keyboard in `context`, e.g. padGlyph('KeyE','world') -> 'X'. */
export function padGlyph(code, context = 'world') {
  const map = BUTTON_MAP[context] || BUTTON_MAP.world;
  for (const [index, mapped] of Object.entries(map)) if (mapped === code) return NAMES[index];
  if (context === 'world') return WORLD_ANALOG[code] || null;
  if (context === 'map') return MAP_ANALOG[code] || null;
  return null;
}

const DEAD = .2;
function deadzone(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

export function createGamepad({ context, onActive, onConnect, target = window } = {}) {
  const state = { connected: false, active: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, id: '' };
  const pressed = new Map();        // button index -> code sent on press
  const stickHeld = new Map();      // synthetic key -> true while a stick holds it
  const repeat = new Map();         // code -> next repeat time (ms)
  let lastContext = '';

  function send(type, code) {
    const shift = code === 'ShiftTab';
    const real = shift ? 'Tab' : code;
    target.dispatchEvent(new KeyboardEvent(type, { code: real, key: real.startsWith('Key') ? real.slice(3).toLowerCase() : real === 'Space' ? ' ' : real, shiftKey: shift, bubbles: true, cancelable: true }));
  }
  function releaseAll() {
    for (const code of pressed.values()) if (code) send('keyup', code);
    for (const code of stickHeld.keys()) send('keyup', code);
    pressed.clear(); stickHeld.clear(); repeat.clear();
  }
  function hold(code, on) {
    if (on && !stickHeld.has(code)) { stickHeld.set(code, true); send('keydown', code); }
    else if (!on && stickHeld.has(code)) { stickHeld.delete(code); send('keyup', code); }
  }
  // Stick or d-pad direction that steps through a list: press once, then repeat while held.
  function stepper(code, on, now) {
    if (!on) { repeat.delete(code); return; }
    const next = repeat.get(code);
    if (next === undefined) { send('keydown', code); send('keyup', code); repeat.set(code, now + 380); }
    else if (now >= next) { send('keydown', code); send('keyup', code); repeat.set(code, now + 130); }
  }

  function poll() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const gp = pads.find(p => p.connected && p.mapping === 'standard') || pads.find(p => p.connected);
    if (!gp) { if (state.connected) { releaseAll(); state.connected = false; } state.lx = state.ly = state.rx = state.ry = state.lt = state.rt = 0; return state; }
    // Announce from polling: the browser may only reveal a pad on its first button press, or may already
    // know it before this module loads, so `gamepadconnected` alone can be missed.
    if (!state.connected) { state.connected = true; onConnect?.(gp); }
    state.id = gp.id;
    const ctx = context();
    // A screen change releases held keys, but buttons still down stay "pressed" (sending nothing) until let go,
    // so the press that closed a menu can't fire again in the screen underneath and reopen it.
    if (ctx !== lastContext) {
      const held = [...pressed.keys()];
      releaseAll();
      for (const i of held) pressed.set(i, null);
      lastContext = ctx;
    }
    [state.lx, state.ly] = deadzone(gp.axes[0] || 0, gp.axes[1] || 0);
    [state.rx, state.ry] = deadzone(gp.axes[2] || 0, gp.axes[3] || 0);
    const value = i => { const b = gp.buttons[i]; return b ? (typeof b === 'object' ? b.value : b) : 0; };
    const down = i => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > .5); };
    state.lt = value(PAD.LT); state.rt = value(PAD.RT);

    let used = Math.abs(state.lx) + Math.abs(state.ly) + Math.abs(state.rx) + Math.abs(state.ry) > .05 || state.lt > .1 || state.rt > .1;
    const map = BUTTON_MAP[ctx] || BUTTON_MAP.world, now = performance.now();
    for (let i = 0; i < gp.buttons.length && i < 16; i++) {
      const isDown = down(i), was = pressed.has(i);
      if (isDown) used = true;
      const code = map[i];
      const stepped = ctx !== 'world' && ctx !== 'title' && ARROWS[i];
      if (stepped) { stepper(code, isDown, now); continue; }
      if (isDown && !was) { pressed.set(i, code || null); if (code) send('keydown', code); }
      else if (!isDown && was) { const sent = pressed.get(i); pressed.delete(i); if (sent) send('keyup', sent); }
    }
    // Sticks in screen contexts.
    if (ctx === 'map') {
      hold('KeyW', state.ly < -.45); hold('KeyS', state.ly > .45); hold('KeyA', state.lx < -.45); hold('KeyD', state.lx > .45);
      hold('KeyQ', state.rx < -.45); hold('KeyE', state.rx > .45);
    } else if (ctx === 'menu' || ctx === 'gear') {
      stepper('ArrowUp', state.ly < -.6, now); stepper('ArrowDown', state.ly > .6, now);
      stepper('ArrowLeft', state.lx < -.6, now); stepper('ArrowRight', state.lx > .6, now);
    }
    if (used && !state.active) { state.active = true; onActive?.(true); }
    return state;
  }

  addEventListener('gamepaddisconnected', () => { releaseAll(); state.connected = false; });
  // Keyboard or mouse use hands the glyphs back to the keyboard.
  const back = e => { if (e.isTrusted && state.active) { state.active = false; onActive?.(false); } };
  addEventListener('keydown', back, { capture: true, passive: true });
  addEventListener('pointerdown', back, { capture: true, passive: true });
  return { poll, state, releaseAll };
}
