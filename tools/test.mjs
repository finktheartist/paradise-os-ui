// node tools/test.mjs [URL]   drives every control in the gallery with real touch and key events at phone width,
// checks form values and sideways scroll, and exits 1 on a failure. Needs Chrome or Chromium (CHROME=... if it is
// somewhere unusual) and the repo being served: python3 -m http.server 8000, then the default URL works.
import { spawn } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.argv[2] || 'http://localhost:8000/gallery/';
const PORT = await new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PROFILE = mkdtempSync(join(tmpdir(), 'po-'));
const chrome = spawn(process.env.CHROME || 'chromium', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (Array.isArray(targets) && targets.find((t) => t.type === 'page')) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) logs.push('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.enable'); await send('Page.navigate', { url: URL_ }); await sleep(2500);
const E = (tag) => `document.querySelector('${tag}')`;
const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await sleep(70); await touch('touchEnd', x, y); };
const hold = async (x, y, ms) => { await touch('touchStart', x, y); await sleep(ms); await touch('touchEnd', x, y); };
const drag = async (pts, gap = 30) => { await touch('touchStart', ...pts[0]); for (const p of pts.slice(1)) { await touch('touchMove', ...p); await sleep(gap); } await sleep(gap); await touch('touchEnd', ...pts[pts.length - 1]); };
const key = async (k, code) => { const text = k === 'Enter' ? '\r' : k.length === 1 ? k : undefined; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k === ' ' ? 'Space' : k, windowsVirtualKeyCode: code, ...(text ? { text } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k === ' ' ? 'Space' : k, windowsVirtualKeyCode: code }); };
const focus = (tag) => ev(`${E(tag)}.focus()`);
await ev(`window.__n = {}; for (const t of ['input', 'change', 'track-change', 'action', 'charge']) document.addEventListener(t, (e) => { const k = e.target.localName + ' ' + t; __n[k] = (__n[k] || 0) + 1; })`);
const fired = (k) => ev(`__n[${JSON.stringify(k)}] || 0`);
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `  ->  ${got}` : ''}`); };
// a point in a control, given in its own unscaled CSS pixels from the top left of `part`, in page coordinates (controls may be zoomed to fit)
const pt = async (tag, part, x, y) => JSON.parse(await ev(`(() => { const el = ${E(tag)}; el.scrollIntoView({ block: 'center' }); const p = ${part ? `el.${part}` : 'el'}, r = p.getBoundingClientRect(), s = r.width / (p.offsetWidth || r.width); return JSON.stringify([r.left + (${x}) * s, r.top + (${y}) * s, s]); })()`));
const val = (tag, prop = 'value') => ev(`${E(tag)}.${prop}`);

check('all seven defined and drawn', (await ev(`['paradise-cd-dial', 'paradise-eq', 'paradise-pool-slider', 'paradise-toggle', 'paradise-cascade-button', 'paradise-crt-tabs', 'paradise-statue'].filter((t) => { const el = document.querySelector(t), c = el && el.shadowRoot && el.shadowRoot.querySelector('canvas'); return !(customElements.get(t) && c && c.width > 0); }).length`)) === 0);

{ // CD dial: tap the hub to play, turn the disc clockwise, then keys
  await sleep(300);
  const [hx, hy] = await pt('paradise-cd-dial', 'el', 124, 126);
  await tap(hx, hy); await sleep(400);
  check('cd-dial: tapping the hub plays it', (await val('paradise-cd-dial', 'playing')) === true);
  const t0 = await val('paradise-cd-dial', 'track'), [, , s] = await pt('paradise-cd-dial', 'el', 0, 0);
  const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * 0.75 + i * 0.13; pts.push([hx + Math.cos(a) * 60 * s, hy + Math.sin(a) * 60 * s]); }
  await drag(pts); await sleep(500);
  const t1 = await val('paradise-cd-dial', 'track');
  check('cd-dial: dragging round the disc moves it on a track or more, with change', t1 > t0 && (await fired('paradise-cd-dial change')) >= 1 && (await fired('paradise-cd-dial track-change')) >= 1, `${t0} -> ${t1}`);
  await focus('paradise-cd-dial'); await key('5', 53); await sleep(300);
  check('cd-dial: the 5 key jumps to track 05', (await val('paradise-cd-dial', 'track')) === 4, await val('paradise-cd-dial', 'track'));
  await key(' ', 32); await sleep(300);
  check('cd-dial: Space pauses it', (await val('paradise-cd-dial', 'playing')) === false);
}
{ // equalizer: one stroke across all seven slots near the bottom pulls every band down
  const before = await ev(`JSON.stringify(${E('paradise-eq')}.getValues())`);
  const pts = []; for (let i = 0; i <= 14; i++) pts.push((await pt('paradise-eq', 'el', 10 + 22 + (0.12 + i / 14 * 0.78) * 424 - 24, 214 * 0.78 + 8)).slice(0, 2));
  await drag(pts, 25); await sleep(400);
  const after = JSON.parse(await ev(`JSON.stringify(${E('paradise-eq')}.getValues())`));
  check('eq: a low stroke across the slots pulls the bands down, with change', after.filter((v) => v < 35).length >= 5 && (await fired('paradise-eq change')) >= 1, `${before} -> ${JSON.stringify(after)}`);
}
{ // pool slider: drag the ball to the far end, then Home
  const w = await ev(`${E('paradise-pool-slider')}.track.offsetWidth`), h = await ev(`${E('paradise-pool-slider')}.track.offsetHeight`), v0 = await val('paradise-pool-slider');
  const at = async (v) => (await pt('paradise-pool-slider', 'track', w * (0.175 + 0.65 * v), h / 2)).slice(0, 2);
  const pts = []; for (let i = 0; i <= 10; i++) pts.push(await at(v0 / 100 + (0.98 - v0 / 100) * i / 10));
  await drag(pts); await sleep(400);
  const v1 = await val('paradise-pool-slider');
  check('slider: dragging the ball to the end floods it, with input and one change', v1 >= 95 && (await fired('paradise-pool-slider input')) > 0 && (await fired('paradise-pool-slider change')) === 1, `${v0} -> ${v1} (${await val('paradise-pool-slider', 'regime')})`);
  await focus('paradise-pool-slider'); await key('Home', 36); await sleep(300);
  check('slider: Home drains it', (await val('paradise-pool-slider')) === 0, await val('paradise-pool-slider'));
}
{ // toggle: a tap turns it off (and the page to reality), Space turns it back on
  const [x, y] = await pt('paradise-toggle', 'el', 122, 49);
  await tap(x, y); await sleep(500);
  check('toggle: a tap turns it off and the bus says reality', (await val('paradise-toggle', 'checked')) === false && (await ev('ParadiseOS.bus.state.paradise')) === false);
  await focus('paradise-toggle'); await key(' ', 32); await sleep(500);
  check('toggle: Space turns it back on', (await val('paradise-toggle', 'checked')) === true && (await ev('ParadiseOS.bus.state.paradise')) === true);
}
{ // cascade button: a tap cascades, a long hold fires a mega cascade
  const [x, y] = await pt('paradise-cascade-button', 'btn', 124, 55);
  await tap(x, y); await sleep(500);
  check('button: a tap fires action', (await fired('paradise-cascade-button action')) === 1);
  await ev(`window.__mega = null; ${E('paradise-cascade-button')}.addEventListener('action', (e) => { __mega = e.detail.mega; }, { once: true })`);
  await sleep(1600); await hold(x, y, 1500); await sleep(400);
  check('button: holding charges it and fires a mega cascade', (await fired('paradise-cascade-button charge')) > 0 && (await ev('__mega')) === true, await ev('__mega'));
}
{ // CRT tabs: tap the third monitor, then ArrowLeft
  const [x, y] = await ev(`(() => { const el = ${E('paradise-crt-tabs')}; el.scrollIntoView({ block: 'center' }); const r = el.rigs[2].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.45]; })()`);
  await tap(x, y); await sleep(500);
  check('tabs: tapping the third monitor selects it, with change', (await val('paradise-crt-tabs')) === 2 && (await fired('paradise-crt-tabs change')) >= 1, await val('paradise-crt-tabs'));
  await ev(`${E('paradise-crt-tabs')}.rigs[2].focus()`); await key('ArrowLeft', 37); await sleep(400);
  check('tabs: ArrowLeft moves to the second', (await val('paradise-crt-tabs')) === 1, await val('paradise-crt-tabs'));
}
{ // statue: a tap steps the state on; setting state from code works
  const s0 = await val('paradise-statue', 'state');
  const [x, y] = await ev(`(() => { const el = ${E('paradise-statue')}; el.scrollIntoView({ block: 'center' }); const r = el.btn.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  await tap(x, y); await sleep(400);
  const s1 = await val('paradise-statue', 'state');
  check('statue: a tap steps to the next state', s1 !== s0, `${s0} -> ${s1}`);
  await ev(`${E('paradise-statue')}.state = 'done'`); await sleep(200);
  check('statue: state = done sticks', (await val('paradise-statue', 'state')) === 'done');
}
{ // forms: the value controls are sent with a form
  const got = await ev(`(() => {
    const f = document.createElement('form');
    f.innerHTML = '<paradise-pool-slider name="s" value="20"></paradise-pool-slider><paradise-toggle name="t" checked></paradise-toggle><paradise-cd-dial name="c" track="2"></paradise-cd-dial>';
    document.body.append(f); const out = JSON.stringify(Object.fromEntries(new FormData(f))); f.remove(); return out; })()`);
  check('forms: slider, toggle and dial are in the FormData', got === JSON.stringify({ s: '20', t: 'on', c: 'trk-03' }), got);
}
const wide = await ev('document.documentElement.scrollWidth'); check('no sideways scroll at 390', wide <= 390, wide);
check('no script errors', !logs.length, logs.join(' | '));
ws.close(); chrome.kill(); await sleep(300); try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
process.exit(fails ? 1 : 0);
