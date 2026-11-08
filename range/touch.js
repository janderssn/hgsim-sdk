// Touch controls for phones and touchscreens: a thumb stick on the left that works like the controller's left stick (steer
// and weight shift across, the bar or the nose up and down: down pushes out), and buttons on the right that send the same
// key events the keyboard does, so there is one input path. They appear when the screen is touched and fade away after a
// while without a touch, or at once when a key is pressed, so a laptop with a touchscreen shows nothing until it is touched.

const STICK_RADIUS = 56, DEAD = .08;
const capture = (el, id) => { try { el.setPointerCapture(id); } catch {} };   // (a pointer the browser no longer knows cannot be captured)

// What the big button does now (the Space key), from the HUD's snapshot.
function actionLabel({ mode, pilotStand, launchPhase, realLaunch, launchSite }) {
  if (mode === 'gliding') return pilotStand ? 'Prone' : 'Sit up';
  if (launchPhase === 'run') return 'Jump';
  if (launchPhase && realLaunch) return launchSite === 'cliff' ? 'Step out' : 'Run';
  if (launchPhase) return '…';
  return 'Launch';
}

export function createTouchControls({ root = document.body, idleSeconds = 8 } = {}) {
  const state = { lx: 0, ly: 0, visible: false };
  const el = document.createElement('div');
  el.className = 'touch';
  el.innerHTML = `
    <div class="touch-zone" data-stick><div class="touch-base"><div class="touch-knob"></div></div></div>
    <div class="touch-buttons">
      <button class="touch-action" data-key="Space">Launch</button>
      <div class="touch-row">
        <button data-key="KeyN" data-when="flying">Mark</button>
        <button data-key="KeyC" data-when="ground">Next site</button>
        <button data-key="KeyR">To launch</button>
        <button data-key="Digit1">Over field</button>
      </div>
    </div>`;
  root.appendChild(el);
  const zone = el.querySelector('[data-stick]'), base = el.querySelector('.touch-base'), knob = el.querySelector('.touch-knob'), action = el.querySelector('.touch-action');

  let hideTimer = 0, stickId = null, origin = null;
  const send = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code, bubbles: true, cancelable: true }));
  function show() {
    clearTimeout(hideTimer);
    if (!state.visible) { state.visible = true; document.body.classList.add('touching'); }
    hideTimer = setTimeout(() => { if (stickId === null) hide(); else show(); }, idleSeconds * 1000);
  }
  function hide() {
    clearTimeout(hideTimer); state.visible = false; document.body.classList.remove('touching'); release();
  }
  function release() {
    stickId = null; origin = null; state.lx = state.ly = 0; knob.style.transform = ''; base.style.left = base.style.top = '';
  }

  // Any touch on the page brings them up; a key or the mouse puts them away.
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') show(); else if (e.isTrusted && state.visible) hide(); }, { capture: true, passive: true });
  addEventListener('keydown', e => { if (e.isTrusted && state.visible) hide(); }, { capture: true, passive: true });

  // The stick: it centres where the thumb comes down in the left zone and follows it out to its radius.
  zone.addEventListener('pointerdown', e => {
    if (stickId !== null) return;
    stickId = e.pointerId; capture(zone, e.pointerId);
    const r = zone.getBoundingClientRect(); origin = { x: e.clientX, y: e.clientY };
    base.style.left = e.clientX - r.left + 'px'; base.style.top = e.clientY - r.top + 'px';
    move(e);
  });
  const move = e => {
    if (e.pointerId !== stickId) return;
    let dx = (e.clientX - origin.x) / STICK_RADIUS, dy = (e.clientY - origin.y) / STICK_RADIUS;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * STICK_RADIUS}px, ${dy * STICK_RADIUS}px)`;
    state.lx = Math.abs(dx) < DEAD ? 0 : dx; state.ly = Math.abs(dy) < DEAD ? 0 : dy;
    show();
  };
  zone.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel']) zone.addEventListener(type, e => { if (e.pointerId === stickId) release(); });

  // The buttons press their key while held, as a key would be.
  for (const b of el.querySelectorAll('[data-key]')) {
    const code = b.dataset.key;
    b.addEventListener('pointerdown', e => { e.preventDefault(); capture(b, e.pointerId); b.classList.add('down'); send('keydown', code); });
    for (const type of ['pointerup', 'pointercancel']) b.addEventListener(type, () => { if (b.classList.contains('down')) { b.classList.remove('down'); send('keyup', code); } });
  }

  let last = '';
  /** Labels the big button for what Space does now and shows the buttons that apply (snapshot: the HUD's). */
  function update(snapshot) {
    const flying = snapshot.mode === 'gliding', key = actionLabel(snapshot) + flying;
    if (key === last) return; last = key;
    action.textContent = actionLabel(snapshot);
    for (const b of el.querySelectorAll('[data-when]')) b.hidden = b.dataset.when === 'flying' ? !flying : flying;
  }

  return { state, update, show, hide };
}
