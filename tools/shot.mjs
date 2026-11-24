// node tools/shot.mjs [URL] [OUT]   the gallery's top as a 1200 x 750 picture (gallery/title.jpg by default): the README's
// title image, the page's social preview and the hub's poster. Needs Chromium (CHROME=...) and ImageMagick, and the repo
// served (python3 -m http.server 8000).
import { spawn, execFileSync } from 'node:child_process';
import { rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.argv[2] || 'http://localhost:8000/gallery/', OUT = process.argv[3] || 'gallery/title.jpg';
const PORT = await new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PROFILE = mkdtempSync(join(tmpdir(), 'po-shot-'));
const chrome = spawn(process.env.CHROME || 'chromium', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
// 1200 x 750 at twice the pixels, then halved, so the small type stays sharp
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 750, deviceScaleFactor: 2, mobile: false });
await send('Page.enable'); await send('Page.navigate', { url: URL_ }); await sleep(3500);
const { data } = await send('Page.captureScreenshot', { format: 'png' });
const tmp = join(PROFILE, 'shot.png'); writeFileSync(tmp, Buffer.from(data, 'base64'));
execFileSync('magick', [tmp, '-resize', '1200x750', '-strip', '-quality', '86', OUT]);
console.log(OUT);
ws.close(); chrome.kill(); await sleep(300); try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
