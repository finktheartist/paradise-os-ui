// Put each component file together from its parts, so each file works on its own.
//   <id>/<id>.js = a header + core.js (with the fonts stamped in) + src/sound.js + the plates it draws + src/elements/<id>.js
//   node tools/build.mjs          (run it after editing core.js, anything in src/ or art/, or tools/spec.mjs)
//   node tools/build.mjs --check  (exits 1 if any file is out of date, and changes nothing)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC, ART, REPO } from './spec.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8').trim();
const b64 = (f) => readFileSync(join(root, f)).toString('base64');
const check = process.argv.includes('--check');

const FONTS = [
  { family: 'IBM Plex Mono', weight: 700, file: 'fonts/plex-mono-700.woff2' },
  { family: 'IBM Plex Mono', weight: 600, file: 'fonts/plex-mono-600.woff2' },
  { family: 'Plus Jakarta Sans', weight: 600, file: 'fonts/jakarta-600.woff2' },
];
const coreSrc = read('core.js');
if (!coreSrc.includes('// @@fonts')) throw new Error('core.js: no @@fonts marker');
const fonts = `  addFonts([\n${FONTS.map((f) => `    { family: '${f.family}', weight: ${f.weight}, src: 'data:font/woff2;base64,${b64(f.file)}' },`).join('\n')}\n  ]);`;
export const core = coreSrc.replace(/ *\/\/ @@fonts[^\n]*/, () => fonts) + '\n' + read('src/sound.js');

// what every element file takes from the core
const TAKE = `const GP = window.ParadiseOS;
const SND = window.ParadiseSound;
const {
  TAU, clamp, lerp, smooth, hash,
  Spring, Base, define, fit, start,
  PLATES, ready, bus, roundRectPath,
  drawCheckerboard, drawRealPoolWater, drawRealHoloFoil,
  drawPlatePixelSort, drawSmpteBars, drawWireCube, drawWireHypercube, drawMicroBadge,
  drawTintedPlate, drawContactShadow, renderStatue3D, drawBevelBox,
} = GP;`;
const mime = (f) => (f.endsWith('.png') ? 'image/png' : 'image/webp');

let stale = 0;
const put = (rel, next) => {
  let was = ''; try { was = readFileSync(join(root, rel), 'utf8'); } catch {}
  if (next !== was) { stale++; if (!check) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), next); } console.log(`${check ? 'stale' : 'wrote'} ${rel} (${Math.round(next.length / 1024)} KB)`); }
};
const wrapLines = (s, n = 112) => s.split(' ').reduce((a, w) => { const l = a[a.length - 1]; if ((l + ' ' + w).length > n) a.push(w); else a[a.length - 1] = l ? l + ' ' + w : w; return a; }, ['']);

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const c of SPEC) {
    const head = [`Paradise OS ${c.name}: ${c.desc}`, '', `One file, no dependencies. Load it with a script tag and use ${c.tag1}. ${c.docs}`, '',
      `Made of four parts, put together by tools/build.mjs in github.com/${REPO}: the shared core (clock, springs, the element`,
      'base class, the bus the controls share, the drawing helpers and two fonts), the sound engine, the photographed plates',
      'this control draws, and the element.']
      .flatMap((l) => (l ? wrapLines(l) : [''])).map((l) => ('// ' + l).trimEnd()).join('\n');
    const plates = c.plates.length
      ? `GP.addPlates({\n${c.plates.map((k) => `  ${k}: 'data:${mime(ART[k])};base64,${b64('art/' + ART[k])}',`).join('\n')}\n});\n`
      : '';
    put(`${c.id}/${c.id}.js`, `${head}
// >>> paradise core (core.js and src/sound.js; edit those, not this)
${core}
// <<< paradise core
(() => {
'use strict';
${TAKE}
// >>> plates (art/)
${plates}// <<< plates
if (customElements.get('${c.tag}')) return;
// >>> element (src/elements/${c.id}.js)
${read(`src/elements/${c.id}.js`)}
// <<< element
})();
`);
  }
  put('skills/paradise-os-ui/core.js', core + '\n');
  if (check && stale) process.exit(1);
}
