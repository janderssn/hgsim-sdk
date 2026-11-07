// Minimal dependency-free Chrome DevTools Protocol driver for local playtests.
// Requires Node 22+ (global WebSocket) and a local Chrome or Edge install.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export async function launchChrome({ port = 9333, width = 1280, height = 720, headless = true, uncapped = false } = {}) {
  const exe = CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('Chrome/Edge not found; set CHROME_PATH.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'alpine-cdp-'));
  const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', 'about:blank'];
  if (headless) args.unshift('--headless=new');
  // Uncapped: no vsync or frame-rate limit, so fps measures capacity rather than the 60 Hz cap.
  if (uncapped) args.unshift('--disable-gpu-vsync', '--disable-frame-rate-limit');
  const child = spawn(exe, args, { stdio: 'ignore', detached: false });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return { child, port, profile }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill(); throw new Error('Chrome did not open its debugging port.');
}

export async function connect({ port = 9333, match } = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find(t => t.type === 'page' && (!match || t.url.includes(match))) || list.find(t => t.type === 'page');
  if (!target) throw new Error('No page target.');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
    else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  const page = {
    send, on: fn => listeners.push(fn), close: () => ws.close(),
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) { await send('Page.navigate', { url }); },
    async viewport(width, height, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); },
    async screenshot(file, quality = 80) { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality }); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    async key(code, type = 'press', key) {
      const k = key || (code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code);
      const vk = { Space: 32, Escape: 27, Enter: 13, Tab: 9, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, ShiftLeft: 16 }[code] || (code.startsWith('Key') ? code.charCodeAt(3) : code.startsWith('Digit') ? code.charCodeAt(5) : 0);
      const base = { code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
      if (type === 'down' || type === 'press') await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: k.length === 1 ? k : undefined });
      if (type === 'up' || type === 'press') await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    async hold(code, ms) { await page.key(code, 'down'); await sleep(ms); await page.key(code, 'up'); },
    async click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); },
  };
  await send('Page.enable'); await send('Runtime.enable');
  return page;
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
