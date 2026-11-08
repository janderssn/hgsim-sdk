// Serves the landing range (range/) and the library (src/): node server.mjs [port]
// Environment: PORT (default 4180), HOST (default 127.0.0.1; 0.0.0.0 in the container), SAVE_FLIGHTS (default on; off when
// deployed, so the public site writes nothing). Saved flights go under work/flights (git-ignored); tools/flight-report.mjs reads them.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const flights = path.join(root, 'work', 'flights');
const watched = ['src', 'range'].map(d => path.join(root, d));
const port = Number(process.argv[2] || process.env.PORT || 4180), host = process.env.HOST || '127.0.0.1', saveFlights = process.env.SAVE_FLIGHTS !== 'off';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

/** Saves one recorded flight. Same-origin JSON only, so no other site can write here through the browser. */
function saveFlight(req, res) {
  const origin = req.headers.origin;
  if (!String(req.headers['content-type']).startsWith('application/json') || (origin && new URL(origin).host !== req.headers.host)) { res.writeHead(403).end(); return; }
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 8e6) { req.destroy(); return; } chunks.push(c); });
  req.on('end', () => {
    try {
      const flight = JSON.parse(Buffer.concat(chunks).toString());
      if (!/^[\w-]{8,80}$/.test(String(flight.id))) throw new Error('bad id');
      fs.mkdirSync(flights, { recursive: true }); fs.writeFileSync(path.join(flights, flight.id + '.json'), JSON.stringify(flight)); res.writeHead(204).end();
    } catch { res.writeHead(400).end(); }
  });
}

/** The newest change to the range's or the library's files, so an open range can pick up new code by itself. */
function newestChange() {
  let newest = 0;
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'assets') walk(p); } else newest = Math.max(newest, fs.statSync(p).mtimeMs); } };
  for (const d of watched) walk(d);
  return newest;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__flights') { if (saveFlights) saveFlight(req, res); else res.writeHead(404).end(); return; }   // (the range then keeps rounds in the browser)
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return; }
  if (req.url === '/__version') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end(String(newestChange())); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/') { res.writeHead(302, { Location: '/range/' }).end(); return; }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.normalize(path.join(root, pathname));
  const served = ['src', 'range'].some(d => file.startsWith(path.join(root, d) + path.sep));
  if (!served || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});
server.listen(port, host, () => console.log(`Landing range: http://${host}:${port}/range/${saveFlights ? '' : ' (not saving flights)'}`));
