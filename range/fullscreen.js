// Full screen for the range: the F key, a button among the touch controls and one in the panel. Browsers that cannot put a
// page full screen (an iPhone's Safari) get it from the home screen instead: the page is a web app that opens without the
// browser's bars (see manifest.webmanifest), and there the buttons are not shown.

const element = document.documentElement;
const request = element.requestFullscreen || element.webkitRequestFullscreen;
const exit = document.exitFullscreen || document.webkitExitFullscreen;
const current = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export function createFullscreen(buttons = []) {
  const supported = !!request && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true);
  function label() { for (const b of buttons) { b.hidden = !supported; b.textContent = current() ? 'Exit full screen' : 'Full screen'; } }
  // (only from a click, a tap's end or a key: the browser allows it only as the answer to the player's own gesture)
  function toggle() {
    if (!supported) return;
    const done = current() ? exit.call(document) : request.call(element, { navigationUI: 'hide' });
    Promise.resolve(done).catch(() => {});
  }
  for (const b of buttons) b.addEventListener('click', toggle);
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(type, label);
  label();
  return { supported, toggle, get active() { return !!current(); } };
}
