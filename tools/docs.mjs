// Write every folder's README.md and index.html, registry.json, llms.txt and gallery/prompts.js from tools/spec.mjs.
//   node tools/docs.mjs          (run it after editing tools/spec.mjs, and after tools/build.mjs)
//   node tools/docs.mjs --check  (exits 1 if anything is out of date, and changes nothing)
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC, REPO, SITE, AUTHOR, COMMON_LIMITS } from './spec.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), check = process.argv.includes('--check');
let stale = 0;
const put = (rel, next) => {
  let was = ''; try { was = readFileSync(join(root, rel), 'utf8'); } catch {}
  if (next !== was) { stale++; if (!check) writeFileSync(join(root, rel), next); console.log(`${check ? 'stale' : 'wrote'} ${rel}`); }
};
const kb = (id) => Math.round(statSync(join(root, id, id + '.js')).size / 1024);
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` + rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
const COUNT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][SPEC.length];
const Count = COUNT[0].toUpperCase() + COUNT.slice(1);
const ICON = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect x=%223%22 y=%225%22 width=%2226%22 height=%2222%22 fill=%22%23E9E4DC%22 stroke=%22%23222%22 stroke-width=%222%22/%3E%3Crect x=%223%22 y=%225%22 width=%2226%22 height=%226%22 fill=%22%23C79BF2%22/%3E%3Ccircle cx=%2216%22 cy=%2219%22 r=%225%22 fill=%22%2356EFE8%22/%3E%3C/svg%3E';

// what each demo page shows in its status bar, and any toolbar it needs
const SHOW = {
  track: { bar: '', js: "const show = (d = {}) => say(`TRK ${d.code ?? String(el.track + 1).padStart(2, '0')} · ${d.title ?? ''} · ${(d.playing ?? el.playing) ? (d.bpm ?? '') + ' BPM' : 'PAUSED'}`);\n['input', 'change', 'track-change'].forEach((t) => el.addEventListener(t, (e) => show(e.detail)));\nsay('TRK 01 · NEON BOULEVARD · PAUSED');" },
  bands: { bar: '<button class="w95-btn compact" data-p="mallsoft">Mallsoft</button><button class="w95-btn compact" data-p="sunset">Sunset</button><button class="w95-btn compact" data-p="glitch">Glitch</button><button class="w95-btn compact" data-p="flat">Flat</button>',
    js: "const show = () => say(el.getValues().map((v) => Math.round(v * 100)).join(' · '));\nel.addEventListener('input', show); el.addEventListener('change', show); setTimeout(show, 50);\ndocument.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { el.preset = b.dataset.p; setTimeout(show, 50); }));" },
  value: { bar: '', js: "const show = () => say(`${el.value}% · ${el.regime.toUpperCase()}`);\nel.addEventListener('input', show); el.addEventListener('change', show); setTimeout(show, 50);" },
  checked: { bar: '<button class="w95-btn compact" data-m="ready">Ready</button><button class="w95-btn compact" data-m="busy">Busy</button><button class="w95-btn compact" data-m="locked">Locked</button>',
    js: "const show = () => say(el.checked ? 'PARADISE · ON' : 'REALITY · OFF');\nel.addEventListener('change', show); el.addEventListener('blocked', () => say('LOCKED · READ ONLY')); show();\ndocument.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { el.mode = b.dataset.m; say(b.dataset.m.toUpperCase()); }));" },
  action: { bar: '<button class="w95-btn compact" id="clear">Clear</button>',
    js: "el.addEventListener('charge', (e) => say(`CHARGE · ${Math.round(e.detail.charge * 100)}%`));\nel.addEventListener('action', (e) => say(e.detail.cleared ? 'COMBO ×0' : `${e.detail.mega ? 'MEGA' : 'COMBO'} ×${e.detail.combo}`));\ndocument.getElementById('clear').addEventListener('click', () => el.clearCascade());\nsay('COMBO ×0');" },
  channel: { bar: '<button class="w95-btn compact" id="degauss">Degauss</button>',
    js: "const names = ['CH 01 · POOL', 'CH 02 · SUNSET', 'CH 03 · AQUARIUM'];\nel.addEventListener('change', (e) => say(names[e.detail.channel]));\nel.addEventListener('degauss', () => say('DEGAUSSING…'));\ndocument.getElementById('degauss').addEventListener('click', () => el.degauss());\nsay(names[el.value]);" },
  state: { bar: ['idle', 'thinking', 'searching', 'tool', 'writing', 'error', 'done'].map((s) => `<button class="w95-btn compact" data-st="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join(''),
    js: "const show = () => say(`STATE: ${el.state.toUpperCase()}`);\nel.addEventListener('change', show);\ndocument.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { el.state = b.dataset.st; show(); }));\nshow();" },
};

for (const c of SPEC) {
  put(`${c.id}/README.md`, `# ${c.name}

${c.intro.join('\n\n')}

One of ${COUNT} controls in this repo. Same idea in each (an ordinary control built out of photographed 1995 parts: marble, pool tile, chrome, beige plastic), different control.

## Run it

\`\`\`sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/${c.id}/
\`\`\`

\`?embed=1\` shows the control alone, without its window.

## Use it

\`${c.id}.js\` is the whole component: one file of about ${kb(c.id)} KB with its photographed parts and fonts inside it, and no dependencies. It draws at ${c.size} pixels.

\`\`\`html
${c.use}
\`\`\`

\`\`\`js
${c.js}
\`\`\`

${c.attrs.length ? table(['attribute', 'what it sets', 'default'], c.attrs) + '\n\n' : ''}${c.notes.map((n) => `- ${n}`).join('\n')}
- **Sound.** It makes small synthesized sounds (clicks, chimes, splashes) once the page has had a tap or a key. \`ParadiseSound.muted = true\` silences the page.
- **Shared.** Every Paradise control on a page shares one clock, one sound engine and one bus, whichever file loads first. The dream toggle turns them all to reality and back.

## What happens

${table(['you', 'it'], c.happens)}

## Limits

${[...c.limits, ...COMMON_LIMITS].map((l) => `- ${l}`).join('\n')}
`);

  const d = c.demo, s = SHOW[d.show];
  put(`${c.id}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="${ICON}">
<title>Paradise OS ${c.name}</title>
<link rel="stylesheet" href="../gallery/desktop.css">
<style>
  .demo { width: min(620px, 100vw - 24px); margin: 0 auto; padding: 40px 0 56px; display: grid; gap: 14px; }
  .demo .win-well { display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; overflow: hidden; padding: 16px 8px; }
  .demo .stage { display: grid; place-items: center; width: 100%; max-width: 100%; }
  .demo .links { text-align: center; font: 600 12px/1.4 var(--mono); }
  .demo .links a { color: inherit; }
  html { overflow-x: clip; }
  .embed body { background: #F4F1EA; min-height: 0; overflow-x: clip; } .embed .palm-wash, .embed .titlebar, .embed .win-toolbar, .embed .win-status, .embed .links { display: none; }
  .embed .demo { padding: 0; width: auto; } .embed .win95, .embed .win95::before, .embed .win95::after { border: 0; box-shadow: none; background: transparent; } .embed .win95::before, .embed .win95::after { display: none; } .embed .win-well { border: 0; background: transparent; box-shadow: none; }
</style>
</head>
<body>
<main class="demo">
  <section class="win95">
    <div class="titlebar"><div class="titlebar-left"><i class="win-ico" aria-hidden="true"></i><h1 class="titlebar-title">${c.title} — ${c.name}</h1></div></div>
${s.bar ? `    <div class="win-toolbar"><div class="w95-tabs" style="gap:4px; flex-wrap:wrap;">${s.bar}</div></div>\n` : ''}    <div class="win-well">
      <div class="stage">${d.html}</div>
    </div>
    <div class="win-status"><span class="status-cell grow">${d.hint}</span><span class="status-cell said" aria-live="polite"></span></div>
  </section>
  <p class="links"><a href="../gallery/">All ${COUNT}</a> · <a href="https://github.com/${REPO}/blob/main/${c.id}/README.md">Docs</a> · <code>&lt;${c.tag}&gt;</code></p>
</main>
<script src="${c.id}.js"></script>
<script>
// This page's own wiring. The component is all in ${c.id}.js.
// ?embed=1 shows the control alone.
const Q = new URLSearchParams(location.search), el = document.getElementById('el'), said = document.querySelector('.said');
if (Q.get('embed') === '1') document.documentElement.classList.add('embed');
const say = (t) => { said.textContent = t; };
// the control draws at a fixed size; on a narrow screen it is zoomed down to fit its window
const fit = () => { el.style.zoom = ''; const room = el.closest('.win-well').clientWidth - 16, w = Math.max(el.offsetWidth, el.scrollWidth); if (w > room) el.style.zoom = (room / w).toFixed(3); };
new ResizeObserver(fit).observe(el.closest('.win-well')); new ResizeObserver(fit).observe(el); fit();
${s.js}
</script>
</body>
</html>
`);
}

// ---- the gallery's copy buttons: one prompt per control, and the buttons added to each window
const WIN = { 'cd-dial': 'win-cdrom', eq: 'win-eq', slider: 'win-pool', toggle: 'win-toggle', button: 'win-cascade', tabs: 'win-crt', 'agent-status': 'win-statue' };
const prompts = Object.fromEntries(SPEC.map((c) => [c.id, [
  `Add the Paradise OS ${c.name.toLowerCase()} to my app. It is a single JavaScript file with no dependencies that defines a <${c.tag}> element: ${c.desc[0].toLowerCase() + c.desc.slice(1)}`,
  `1. Get the file from @@SITE/${c.id}/${c.id}.js and save it in my project as ${c.id}.js. Do not rewrite it or split it up: its photographed parts and fonts are inside it.`,
  `2. Load it with a plain script tag (not type="module"), then use ${c.tag1}.`,
  `3. ${c.docs}`,
  `4. It draws at a fixed ${c.size} pixels and is drawn for a light background. Give it room; scale it with CSS zoom if it must be smaller.`,
  ...(c.id === 'cd-dial' ? ['5. For the real songs, also download the five files from @@SITE/audio/ (trk-01.mp3 to trk-05.mp3) into one folder and set tracks="that-folder/". Without them it plays synthesized beats.'] : []),
  `${c.id === 'cd-dial' ? 6 : 5}. The README with every attribute, property and event is at https://github.com/${REPO}/blob/main/${c.id}/README.md. Read it before wiring anything up.`,
  `When you are done, show me where you put it and what listens to it. If something about it needs to look different, tell me instead of editing its drawing code.`,
  ``,
  `These components were made with the paradise-os-ui skill: @@SITE/skills/paradise-os-ui/SKILL.md (install with: npx skills add ${REPO}). If I later ask for another control in the same style, use it.`,
].join('\n')]));
put('gallery/prompts.js', `// Written by tools/docs.mjs from tools/spec.mjs: the prompt for each control, and the buttons that copy it.
(() => {
const REPO = '${REPO}';
const WIN = ${JSON.stringify(WIN)};
const PROMPTS = ${JSON.stringify(prompts, null, 1)};
const site = new URL('..', location.href).href.replace(/\\/$/, '');
// Copying needs the clipboard API, which plain http (other than localhost) does not have, so fall back to a selected textarea.
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = Object.assign(document.createElement('textarea'), { value: text }); t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {} t.remove(); return ok;
  }
}
// each control draws at a fixed size; on a narrow screen it is zoomed down to fit its window
const fitAll = () => { for (const winId of Object.values(WIN)) { const w = document.getElementById(winId), el = w && w.querySelector('.win-well [id^=hero]'); if (!el) continue; el.style.zoom = ''; const room = el.closest('.win-well').clientWidth - 16, cw = Math.max(el.offsetWidth, el.scrollWidth); if (cw > room) el.style.zoom = (room / cw).toFixed(3); } };
let queued = 0; const refit = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; fitAll(); }); };
for (const winId of Object.values(WIN)) { const w = document.getElementById(winId), el = w && w.querySelector('.win-well [id^=hero]'); if (el) { new ResizeObserver(refit).observe(el.closest('.win-well')); new ResizeObserver(refit).observe(el); } }
fitAll();
for (const [id, winId] of Object.entries(WIN)) {
  const win = document.getElementById(winId); if (!win) continue;
  const row = document.createElement('div');
  row.className = 'win-acts';
  row.innerHTML = \`<a class="w95-btn compact" href="../\${id}/">Try it</a><button class="w95-btn compact" type="button" data-copy="cmd">Copy install</button><button class="w95-btn compact" type="button" data-copy="prompt">Copy a prompt</button><a class="w95-btn compact" href="https://github.com/\${REPO}/blob/main/\${id}/README.md">Docs</a><span class="win-acts-said" aria-live="polite"></span>\`;
  win.querySelector('.win-status').before(row);
  const said = row.querySelector('.win-acts-said');
  const say = (ok, what) => { said.textContent = ok ? what + ' copied.' : 'Could not copy here.'; setTimeout(() => { said.textContent = ''; }, 2400); };
  row.querySelector('[data-copy=cmd]').addEventListener('click', async () => say(await copy(\`npx shadcn add \${REPO}/\${id}\`), 'Install command'));
  row.querySelector('[data-copy=prompt]').addEventListener('click', async () => say(await copy(PROMPTS[id].replaceAll('@@SITE', site)), 'Prompt'));
}
})();
`);

put('registry.json', JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'paradise-os-ui', homepage: SITE,
  items: SPEC.map((c) => ({
    name: c.id, type: 'registry:file', title: `Paradise OS ${c.name}`,
    description: `${c.desc} One file of about ${kb(c.id)} KB, no dependencies, defines <${c.tag}>.`,
    author: AUTHOR, categories: c.categories,
    files: [{ path: `${c.id}/${c.id}.js`, type: 'registry:file', target: `~/public/paradise-os-ui/${c.id}.js` }],
    docs: `Paradise OS ${c.name} is a plain script that registers a custom element. Load /paradise-os-ui/${c.id}.js with a script tag (not a module), then use ${c.tag1}. ${c.docs} Draws at ${c.size} pixels on a light page. More: ${SITE}`,
  })),
}, null, 2) + '\n');

put('llms.txt', `# Paradise OS UI

> ${Count} vaporwave UI controls built out of photographed 1995 parts: a holographic CD you turn to change songs, an equalizer of pool water in a pink ceramic rack, a slider that floods a tiled pool, a switch between paradise and reality, an error dialog that cascades, three floating CRT monitors as tabs, and a marble bust that shows what an AI agent is doing. Each is one plain script that registers a custom element, with its photographed parts and fonts inside it: no dependencies, no build step. MIT licensed.

Live gallery: ${SITE}
Source: https://github.com/${REPO}

## Drop-in components

Each is one plain script that registers a custom element. Load it with a script tag, not as a module. Do not rewrite or split the file. Each carries a copy of the shared core; the first one loaded sets window.ParadiseOS and window.ParadiseSound and the rest reuse them, so any mix shares one clock, one sound engine and one bus.

${SPEC.map((c) => `- [${c.name}](${SITE}/${c.id}/${c.id}.js): ${c.desc} Use ${c.tag1}. ${c.docs} Draws at ${c.size} px. [Docs](https://github.com/${REPO}/blob/main/${c.id}/README.md)`).join('\n')}

Install any one with the shadcn CLI: \`npx shadcn add ${REPO}/NAME\`, where NAME is ${SPEC.map((c) => c.id).join(', ')}. The file lands in \`public/paradise-os-ui/\`.

Each draws at a fixed size on a light page and makes small synthesized sounds after the first tap (ParadiseSound.muted = true silences them). The CD dial's five songs are separate files in ${SITE}/audio/ (trk-01.mp3 to trk-05.mp3); point its tracks attribute at a folder holding them.

## The skill

- [paradise-os-ui skill](${SITE}/skills/paradise-os-ui/SKILL.md): the workflow and rules these were made by. Install with \`npx skills add ${REPO}\`.
- [core.js](${SITE}/skills/paradise-os-ui/core.js): the shared core (clock, springs, element base class, bus, drawing helpers, fonts) with the sound engine.
- [starter.html](${SITE}/skills/paradise-os-ui/starter.html): the smallest whole example, a new control built on the core.
- [look.mjs](${SITE}/skills/paradise-os-ui/look.mjs): stops the clock, steps an interaction to chosen moments and saves the frames side by side.

## How they were made

- [making-of/README.md](${SITE}/making-of/README.md): how the set was made, and every prompt used for its pictures and songs.
`);
if (check && stale) process.exit(1);
