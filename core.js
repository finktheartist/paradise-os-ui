// Paradise OS core: the clock, springs, the element base class, the event bus every control shares,
// the plates (photographed parts, added by each component file) and the drawing helpers.
(() => {
  'use strict';
  if (window.ParadiseOS) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };

  class Spring {
    constructor(x = 0, k = 280, d = 22) {
      this.x = x; this.v = 0; this.to = x; this.k = k; this.d = d;
    }
    step(dt) {
      if (!(dt > 0)) return this.x;
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        this.v += (-this.k * (this.x - this.to) - this.d * this.v) * h;
        this.x += this.v * h;
      }
      return this.x;
    }
    get idle() { return Math.abs(this.x - this.to) < 1.5e-3 && Math.abs(this.v) < 1.5e-3; }
    snap(x) { this.x = this.to = x; this.v = 0; return this; }
  }

  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = rmq.matches;
  rmq.addEventListener?.('change', (e) => { reducedMotion = e.matches; });

  // Deterministic step-able clock
  let now = 0, lastMs = 0, running = false;
  const listeners = new Set();
  const timers = [];

  function later(ms, fn) {
    timers.push({ at: now + ms / 1000, fn });
    start();
  }
  function advance(dt) {
    now += dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= now) {
        const t = timers.splice(i, 1)[0];
        t.fn();
      }
    }
    for (const fn of listeners) fn(dt, now);
  }
  function loop(ms) {
    if (!running) return;
    const dt = clamp((ms - lastMs) / 1000, 0, 0.034);
    lastMs = ms;
    if (!api.paused) advance(dt);
    if (!listeners.size && !timers.length) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    lastMs = performance.now();
    requestAnimationFrame(loop);
  }

  function fit(canvas, cap = 2) {
    const dpr = Math.min(cap, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || parseFloat(canvas.style.width) || 100;
    const h = canvas.clientHeight || parseFloat(canvas.style.height) || 100;
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    return [g, w, h, dpr];
  }

  // Plates: the photographed parts. Each component file adds the ones it draws, as data URIs, so the file works alone.
  const onAssetLoad = new Set();
  const PLATES = {};
  function addPlates(map) {
    for (const [key, src] of Object.entries(map)) {
      if (PLATES[key]) continue;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { for (const cb of onAssetLoad) cb(key, im); start(); };
      im.src = src;
      PLATES[key] = im;
    }
  }
  // Fonts the canvases letter with (IBM Plex Mono, Plus Jakarta Sans; both SIL Open Font License), registered once
  function addFonts(list) {
    if (!document.fonts || typeof FontFace === 'undefined') return;
    for (const f of list) {
      const face = new FontFace(f.family, `url(${f.src}) format('woff2')`, { weight: String(f.weight), style: 'normal' });
      document.fonts.add(face);
      face.load().then(() => { for (const cb of onAssetLoad) cb('font', face); start(); }).catch(() => {});
    }
  }
  // @@fonts
  const ready = (im) => !!(im && im.complete && im.naturalWidth > 0);

  // Offscreen scratch canvas for tinted RGB ghosting of real photographed plates!
  let tintCv = null, tintCtx = null;
  function getTintCtx(w, h) {
    if (!tintCv) { tintCv = document.createElement('canvas'); tintCtx = tintCv.getContext('2d'); }
    if (tintCv.width < w || tintCv.height < h) {
      tintCv.width = Math.max(tintCv.width, Math.ceil(w));
      tintCv.height = Math.max(tintCv.height, Math.ceil(h));
    }
    tintCtx.setTransform(1, 0, 0, 1, 0, 0);
    tintCtx.clearRect(0, 0, w, h);
    return [tintCv, tintCtx];
  }

  function roundRectPath(g, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    g.beginPath();
    g.roundRect(x, y, w, h, rad);
  }

  // Crisp PNG transparency alpha-checkerboard
  function drawCheckerboard(g, x, y, w, h, size = 7, dark = '#C2C4D0', light = '#F5F6FA') {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = light;
    g.fillRect(x, y, w, h);
    g.fillStyle = dark;
    const cols = Math.ceil(w / size) + 1;
    const rows = Math.ceil(h / size) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (((r + c) & 1) === 0) g.fillRect(x + c * size, y + r * size, size + 0.3, size + 0.3);
      }
    }
    g.restore();
  }

  // Real macro-photographed turquoise swimming pool water (dual scrolling parallax layers + ripples!)
  function drawRealPoolWater(g, x, y, w, h, t, {
    alpha = 1,
    scrollX = 0,
    ripples = null,
    refractBoost = 1,
  } = {}) {
    g.save();
    g.globalAlpha *= alpha;
    g.beginPath(); g.rect(x, y, w, h); g.clip();

    const im = PLATES.poolWater;
    if (ready(im)) {
      const iw = im.naturalWidth, ih = im.naturalHeight;
      // Cover-tile horizontally with seamless mirror-wrap so there's zero seam
      const drawH = Math.max(h * 1.18, 120);
      const drawW = drawH * (iw / ih);
      const drift1 = ((t * 14 + scrollX) % drawW + drawW) % drawW;
      const bob1 = Math.sin(t * 0.9) * 5;

      for (let rx = x - drift1 - drawW; rx < x + w + drawW; rx += drawW) {
        g.drawImage(im, rx, y - (drawH - h) * 0.5 + bob1, drawW + 1, drawH);
      }

      // Counter-drifting translucent caustic overlay for living shimmering sunlight interference!
      g.save();
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = clamp(0.38 * refractBoost);
      const drift2 = ((-t * 10 + scrollX * 0.6) % drawW + drawW) % drawW;
      const bob2 = Math.cos(t * 1.15) * 6;
      for (let rx = x - drift2 - drawW; rx < x + w + drawW; rx += drawW) {
        g.save();
        g.translate(rx + drawW, y - (drawH - h) * 0.5 + bob2);
        g.scale(-1, 1);
        g.drawImage(im, 0, 0, drawW + 1, drawH);
        g.restore();
      }
      g.restore();
    } else {
      g.fillStyle = '#29C9D6';
      g.fillRect(x, y, w, h);
    }

    // Expanding sunlit concentric ripples
    if (ripples && ripples.length) {
      g.save();
      g.globalCompositeOperation = 'screen';
      for (const rp of ripples) {
        const p = clamp(rp.age / rp.life);
        const rad = lerp(8, rp.maxR || 72, 1 - (1 - p) * (1 - p));
        const a = (1 - p) * (1 - p) * 0.82;
        g.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        g.lineWidth = lerp(2.8, 0.7, p);
        g.beginPath(); g.ellipse(rp.x, rp.y, rad, rad * 0.74, 0, 0, TAU); g.stroke();
        if (p < 0.78) {
          g.strokeStyle = `rgba(175,255,255,${(a * 0.55).toFixed(3)})`;
          g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(rp.x, rp.y, rad * 0.6, rad * 0.44, 0, 0, TAU); g.stroke();
        }
      }
      g.restore();
    }

    g.restore();
  }

  // Real photographed iridescent holographic CD-ROM foil plate (with smooth specular drift)
  function drawRealHoloFoil(g, x, y, w, h, t = 0, shift = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const im = PLATES.holoFoil;
    if (ready(im)) {
      const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * 1.22;
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      const ox = Math.sin(t * 0.9 + shift) * (dw - w) * 0.38;
      const oy = Math.cos(t * 0.7 + shift) * (dh - h) * 0.38;
      g.drawImage(im, x - (dw - w) * 0.5 + ox, y - (dh - h) * 0.5 + oy, dw, dh);
    } else {
      g.fillStyle = '#DDF8F6';
      g.fillRect(x, y, w, h);
    }
    g.restore();
  }

  // Real photographed plate stretched into horizontal VHS pixel-sort strips!
  function drawPlatePixelSort(g, plate, x, y, w, h, intensity = 1, seed = 0, {
    spillX = 28,
    bands = 10,
    dir = 1,
    tintColors = ['#4CF5EE', '#FF68C4', '#FFF2A6', '#FFFFFF'],
  } = {}) {
    if (intensity <= 0.02) return;
    g.save();
    const hasImg = ready(plate);
    for (let i = 0; i < bands; i++) {
      const r1 = hash(seed * 17.3 + i * 5.1);
      const r2 = hash(seed * 29.1 + i * 11.7);
      const r3 = hash(seed * 7.9 + i * 23.3);
      const by = y + r1 * (h - 5);
      const bh = 2.0 + r2 * 6.5 * intensity;
      const stretch = (w * (0.35 + r2 * 0.65) + spillX * (0.4 + r3 * 0.8)) * clamp(intensity * 1.1);
      const dx = dir >= 0
        ? (r3 - 0.18) * spillX * intensity
        : -(r3 - 0.18) * spillX * intensity;
      const bx = dir >= 0 ? x + w - stretch + dx : x + dx;

      // Crisp magenta/cyan RGB chromatic split borders
      g.globalAlpha = 0.72 * intensity;
      g.fillStyle = '#FF4AC2';
      g.fillRect(bx - 3 * intensity, by - 0.8, stretch, bh);
      g.fillStyle = '#28F8F0';
      g.fillRect(bx + 3 * intensity, by + 0.8, stretch, bh);

      // Actual sampled pixel-column stretch from the real photographed plate!
      g.globalAlpha = 0.92 * intensity;
      if (hasImg) {
        const sx = Math.floor(r2 * (plate.naturalWidth - 6));
        const sy = Math.floor(r1 * (plate.naturalHeight - 6));
        g.drawImage(plate, sx, sy, 4, 4, bx, by, stretch, bh);
      } else {
        g.fillStyle = tintColors[i % tintColors.length];
        g.fillRect(bx, by, stretch, bh);
      }
      // Bright horizontal pixel-sort highlight glint
      g.globalAlpha = 0.35 * intensity;
      g.fillStyle = tintColors[i % tintColors.length];
      g.fillRect(bx, by, stretch, 1.2);
    }
    g.restore();
  }

  // Authentic SMPTE broadcast color-bar static tear
  function drawSmpteBars(g, x, y, w, h, t = 0, jitter = 1) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const topColors = ['#ECECEF', '#F7EC59', '#52EFEF', '#65F278', '#F264E8', '#F75966', '#5678FA'];
    const bw = w / topColors.length;
    const topH = h * 0.72;
    const slices = 16;
    const sh = topH / slices;
    for (let s = 0; s < slices; s++) {
      const sy = y + s * sh;
      const wave = (Math.sin(t * 38 + s * 1.4) * 6 + (hash(Math.floor(t * 26) * 19 + s) - 0.5) * 12) * jitter;
      for (let i = 0; i < topColors.length; i++) {
        g.fillStyle = topColors[i];
        g.fillRect(x + i * bw + wave - 14, sy, bw + 16, sh + 0.6);
      }
    }
    const botColors = ['#2A3B8F', '#FFFFFF', '#5C2C96', '#211E33', '#2B2742', '#171526'];
    const bbw = w / botColors.length;
    for (let i = 0; i < botColors.length; i++) {
      g.fillStyle = botColors[i];
      g.fillRect(x + i * bbw, y + topH, bbw + 1, h - topH + 1);
    }
    const seed = Math.floor(t * 32);
    for (let i = 0; i < 28; i++) {
      const sy = y + hash(seed * 7 + i * 3.1) * h;
      const sw = (0.14 + hash(seed * 11 + i) * 0.86) * w;
      const sx = x + hash(seed * 5 + i * 9.2) * (w - sw);
      g.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.82)' : i % 3 === 1 ? 'rgba(60,248,242,0.58)' : 'rgba(255,95,195,0.58)';
      g.fillRect(sx, sy, sw, 1.8);
    }
    g.restore();
  }

  // Real 3D rotating cyan wireframe cube (rendered inside keycap texture-drop cavity!)
  function drawWireCube(g, cx, cy, r, t, color = '#24F4EE') {
    const verts = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];
    const ay = t * 1.45, ax = 0.55 + Math.sin(t * 0.9) * 0.25;
    const cyA = Math.cos(ay), syA = Math.sin(ay);
    const cxA = Math.cos(ax), sxA = Math.sin(ax);
    const proj = verts.map(([x, y, z]) => {
      const x1 = x * cyA - z * syA;
      const z1 = x * syA + z * cyA;
      const y2 = y * cxA - z1 * sxA;
      const z2 = y * sxA + z1 * cxA;
      const f = 3.2 / (3.8 - z2);
      return [cx + x1 * r * f, cy + y2 * r * f];
    });
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 1.6;
    g.shadowColor = color;
    g.shadowBlur = 7;
    g.beginPath();
    for (const [a, b] of edges) {
      g.moveTo(proj[a][0], proj[a][1]);
      g.lineTo(proj[b][0], proj[b][1]);
    }
    g.stroke();
    g.restore();
  }

  // Escalating 3D -> 4D Tesseract Wireframe Hypercube (unfolds inner counter-rotating cube + 4D struts as charge -> 1!)
  function drawWireHypercube(g, cx, cy, r, t, charge = 0, colorA = '#24F4EE', colorB = '#FF52C2') {
    const ch = clamp(charge, 0, 1);
    const verts = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];
    const spin = 1.45 + ch * 2.8;
    const ay = t * spin, ax = 0.55 + Math.sin(t * (0.9 + ch * 1.4)) * 0.35;
    const projectSet = (scale, rotY, rotX) => {
      const cyA = Math.cos(rotY), syA = Math.sin(rotY);
      const cxA = Math.cos(rotX), sxA = Math.sin(rotX);
      return verts.map(([x, y, z]) => {
        const x1 = x * cyA - z * syA;
        const z1 = x * syA + z * cyA;
        const y2 = y * cxA - z1 * sxA;
        const z2 = y * sxA + z1 * cxA;
        const f = 3.2 / (3.8 - z2 * scale);
        return [cx + x1 * r * scale * f, cy + y2 * r * scale * f];
      });
    };
    const outer = projectSet(1 + ch * 0.14, ay, ax);

    g.save();
    // Inner nested 4D hypercube & glowing projection struts emerge smoothly with charge!
    if (ch > 0.08) {
      const innerScale = lerp(0.18, 0.56, smooth(ch));
      const inner = projectSet(innerScale, -ay * 1.25, ax + ch * 0.9);
      const strutAlpha = smooth(clamp((ch - 0.12) / 0.7));
      g.strokeStyle = `rgba(255, 255, 255, ${(strutAlpha * 0.78).toFixed(3)})`;
      g.lineWidth = 1.05;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        g.moveTo(outer[i][0], outer[i][1]);
        g.lineTo(inner[i][0], inner[i][1]);
      }
      g.stroke();

      g.strokeStyle = colorB;
      g.shadowColor = colorB;
      g.shadowBlur = 9;
      g.lineWidth = 1.5;
      g.globalAlpha = strutAlpha;
      g.beginPath();
      for (const [a, b] of edges) {
        g.moveTo(inner[a][0], inner[a][1]);
        g.lineTo(inner[b][0], inner[b][1]);
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    // Outer primary cyan cube (with subtle RGB echo at high charge)
    if (ch > 0.55) {
      g.strokeStyle = 'rgba(255, 72, 196, 0.55)';
      g.lineWidth = 1.4;
      g.beginPath();
      for (const [a, b] of edges) {
        g.moveTo(outer[a][0] - ch * 3, outer[a][1]);
        g.lineTo(outer[b][0] - ch * 3, outer[b][1]);
      }
      g.stroke();
    }
    g.strokeStyle = colorA;
    g.lineWidth = 1.65 + ch * 0.45;
    g.shadowColor = colorA;
    g.shadowBlur = 7 + ch * 6;
    g.beginPath();
    for (const [a, b] of edges) {
      g.moveTo(outer[a][0], outer[a][1]);
      g.lineTo(outer[b][0], outer[b][1]);
    }
    g.stroke();
    g.restore();
  }

  // Reusable CRT-flashing miniature telemetry badge (OVERFLOW.SYS / READ ONLY / CH 02)
  function drawMicroBadge(g, cx, cy, title, body, {
    pop = 1,
    w = 78,
    h = 30,
    pal = ['#48F4EE', '#F69ED8'],
    bodyColor = '#271E38',
  } = {}) {
    const p = clamp(pop, 0, 1);
    if (p <= 0.02) return;
    const sx = lerp(0.14, 1, smooth(clamp(p * 1.4)));
    const sy = lerp(0.06, 1, smooth(clamp((p - 0.12) / 0.88)));
    const x = -w * 0.5, y = -h * 0.5;
    g.save();
    g.translate(cx, cy);
    g.scale(sx, sy);
    g.globalAlpha *= clamp(p * 1.25);

    if (p > 0.08 && p < 0.42) {
      g.fillStyle = 'rgba(210, 255, 255, 0.92)';
      g.fillRect(x - 6, -1.5, w + 12, 3);
    }
    // Crisp  95-era raised bevel + pixel shadow
    g.fillStyle = 'rgba(28, 20, 48, 0.28)';
    g.fillRect(x + 3, y + 3, w, h);
    g.fillStyle = '#EAE5DC';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#FFFFFF'; g.fillRect(x, y, w, 1.5); g.fillRect(x, y, 1.5, h);
    g.fillStyle = '#3D354C'; g.fillRect(x, y + h - 1.5, w, 1.5); g.fillRect(x + w - 1.5, y, 1.5, h);
    g.fillStyle = '#9F97A0'; g.fillRect(x + 1.5, y + h - 2.6, w - 3, 1.1); g.fillRect(x + w - 2.6, y + 1.5, 1.1, h - 3);

    const tb = g.createLinearGradient(x + 2, y + 2, x + w - 2, y + 2);
    tb.addColorStop(0, pal[0]);
    tb.addColorStop(1, pal[1]);
    g.fillStyle = tb;
    g.fillRect(x + 2.5, y + 2.5, w - 5, 9.5);
    g.fillStyle = '#E6E1D8';
    g.fillRect(x + w - 10, y + 3.5, 7, 7);

    g.font = "700 6.5px 'IBM Plex Mono', monospace";
    g.fillStyle = '#241A36';
    g.fillText(title, x + 5, y + 9.6);
    g.font = "700 7.2px 'IBM Plex Mono', monospace";
    g.fillStyle = bodyColor;
    g.fillText(body, x + 5.5, y + 22.5);
    g.restore();
  }

  // Draw a tinted RGB chromatic ghost of ANY real photographed plate
  function drawTintedPlate(g, img, x, y, w, h, color, alpha = 0.55) {
    if (!ready(img) || alpha <= 0.01) return;
    const cw = Math.max(2, Math.ceil(w * 2));
    const ch = Math.max(2, Math.ceil(h * 2));
    const [cv, tc] = getTintCtx(cw, ch);
    tc.drawImage(img, 0, 0, cw, ch);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = color;
    tc.fillRect(0, 0, cw, ch);
    tc.globalCompositeOperation = 'source-over';
    g.save();
    g.globalAlpha *= alpha;
    g.drawImage(cv, 0, 0, cw, ch, x, y, w, h);
    g.restore();
  }

  // Grounded photorealistic studio contact shadow (crisp ambient occlusion + soft outer penumbra)
  function drawContactShadow(g, drawShape, dx = 6, dy = 11, blur = 18, alpha = 0.22) {
    g.save();
    g.shadowColor = `rgba(38, 28, 48, ${alpha.toFixed(3)})`;
    g.shadowBlur = blur;
    g.shadowOffsetX = dx;
    g.shadowOffsetY = dy;
    drawShape();
    g.restore();
  }

  // =========================================================================
  // Shared WebGL2 3D Depth-Displaced Carrara Marble Statue Mesh Renderer
  // True hardware Z-buffered 3D rotation + 4-slab sculptural deconstruction,
  // 3D volumetric laser wireframe/checkerboard scan & holographic blueprint shader!
  // =========================================================================
  let stGL = null;
  function initStatueGL() {
    if (stGL !== null) return stGL;
    const cv = document.createElement('canvas');
    cv.width = 420;
    cv.height = 560;
    const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true })
            || cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) { stGL = false; return false; }

    const vsSrc = `
      attribute vec2 aUv;
      attribute float aBand;
      uniform sampler2D uDepth;
      uniform float uAspect;
      uniform float uDepthScale;
      uniform float uYaw;
      uniform float uPitch;
      uniform float uRoll;
      uniform float uSliceGap;
      uniform float uSliceTwist;
      uniform float uErrorFrac;
      uniform float uTime;
      varying vec2 vUv;
      varying float vDepth;
      varying float vBand;
      varying float vBandYaw;
      void main() {
        vUv = aUv;
        vBand = aBand;
        float d = texture2D(uDepth, aUv).r;
        vDepth = d;

        // Per-band 3D sculptural slicing:
        // Band 0 = curly crown, Band 1 = classical face mask, Band 2 = neck, Band 3 = draped shoulders + pedestal
        float yOff = 0.0;
        float yawOff = 0.0;
        float xErr = 0.0;
        float rollErr = 0.0;
        if (aBand < 0.5) {
          yOff = 0.072 * uSliceGap;
          yawOff = 1.15 * uSliceTwist;
          xErr = 0.068 * uErrorFrac;
          rollErr = -0.055 * uErrorFrac;
        } else if (aBand < 1.5) {
          yOff = 0.025 * uSliceGap;
          yawOff = -0.88 * uSliceTwist;
          xErr = -0.076 * uErrorFrac;
          rollErr = 0.048 * uErrorFrac;
        } else if (aBand < 2.5) {
          yOff = -0.018 * uSliceGap;
          yawOff = 0.68 * uSliceTwist;
          xErr = 0.052 * uErrorFrac;
          rollErr = -0.032 * uErrorFrac;
        } else {
          yOff = -0.052 * uSliceGap;
          yawOff = -0.20 * uSliceTwist;
          xErr = -0.020 * uErrorFrac;
          rollErr = 0.014 * uErrorFrac;
        }

        // High-frequency horizontal fracture jitter during error state
        if (uErrorFrac > 0.01) {
          float jit = sin(uTime * 42.0 + aBand * 11.7) * 0.014 * uErrorFrac;
          xErr += jit;
        }

        float totalYaw = uYaw + yawOff;
        vBandYaw = totalYaw;

        // Center sculpture pivot cleanly along the marble neck / pedestal axis
        vec3 p = vec3((aUv.x - 0.5) * uAspect + xErr, (0.5 - aUv.y) + yOff, (d - 0.42) * uDepthScale);

        // Y-axis yaw rotation (per-slab counter-rotation in true 3D!)
        float cy = cos(totalYaw), sy = sin(totalYaw);
        vec3 p1 = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
        // Subtle X-axis pitch breathing / writing lean
        float cx = cos(uPitch), sx = sin(uPitch);
        vec3 p2 = vec3(p1.x, p1.y * cx - p1.z * sx, p1.y * sx + p1.z * cx);
        // Whisper Z-axis sway + error fracture tilt
        float rr = uRoll + rollErr;
        float cr = cos(rr), sr = sin(rr);
        vec3 p3 = vec3(p2.x * cr - p2.y * sr, p2.x * sr + p2.y * cr, p2.z);

        // Portrait perspective projection with generous headroom so elevated slabs never clip
        float zCam = 3.1;
        float fovScale = 4.92;
        float invZ = 1.0 / (zCam - p3.z);
        float outAspect = 420.0 / 560.0;
        vec2 ndc = vec2((p3.x * fovScale * invZ) / outAspect, p3.y * fovScale * invZ);
        float ndcZ = clamp(0.5 - p3.z * 0.85, -0.98, 0.98);
        gl_Position = vec4(ndc, ndcZ, 1.0);
      }
    `;

    const fsSrc = `
      precision highp float;
      uniform sampler2D uColor;
      uniform sampler2D uDepth;
      uniform float uPitch;
      uniform float uSliceGap;
      uniform float uWireMix;
      uniform float uScanY;
      uniform float uHoloMix;
      uniform float uWriteMix;
      uniform float uErrorFrac;
      uniform float uGlowFlash;
      uniform float uTime;
      uniform vec4 uTint; // rgb + mix amount (0 = natural marble, 1 = solid chroma ghost)
      varying vec2 vUv;
      varying float vDepth;
      varying float vBand;
      varying float vBandYaw;

      void main() {
        vec4 col = texture2D(uColor, vUv);
        if (col.a < 0.05) discard;

        // Smooth sculptural normal from depth gradient, rotated by this slab's true 3D yaw
        vec2 px = vec2(1.0 / 340.0, 1.0 / 520.0) * 2.4;
        float dL = texture2D(uDepth, vUv - vec2(px.x, 0.0)).r;
        float dR = texture2D(uDepth, vUv + vec2(px.x, 0.0)).r;
        float dU = texture2D(uDepth, vUv - vec2(0.0, px.y)).r;
        float dD = texture2D(uDepth, vUv + vec2(0.0, px.y)).r;
        vec3 n0 = normalize(vec3((dL - dR) * 2.6, (dD - dU) * 2.6, 0.52));

        float cy = cos(vBandYaw), sy = sin(vBandYaw);
        vec3 n = normalize(vec3(n0.x * cy + n0.z * sy, n0.y, -n0.x * sy + n0.z * cy));

        // Gentle studio relighting that glides across the turning curls, nose & drapery
        vec3 keyDir = normalize(vec3(-0.48, 0.56, 0.72));
        float ndl = max(dot(n, keyDir), 0.0);
        float baseNdl = max(dot(n0, keyDir), 0.0);
        float relight = 1.0 + (ndl - baseNdl) * 0.34;

        // Subtle Vaporwave pastel cyan/pink grazing Fresnel rim kiss as it turns
        float fresnel = pow(1.0 - max(n.z, 0.0), 2.5);
        vec3 rim = mix(vec3(0.32, 0.96, 0.95), vec3(1.0, 0.52, 0.82), smoothstep(-0.35, 0.35, n.x));
        vec3 rgb = col.rgb * relight + rim * fresnel * (0.14 + uWriteMix * 0.24);
        float outAlpha = col.a;

        // 1. LUMINOUS INNER-SEAM GLOW ON PARTED MARBLE SLAB CUT EDGES
        if (uSliceGap > 0.02 || uErrorFrac > 0.02) {
          float cutDist = 1.0;
          float isUpperLip = 0.0;
          if (vBand < 0.5) {
            cutDist = abs(vUv.y - 0.165);
            isUpperLip = 1.0;
          } else if (vBand < 1.5) {
            float dTop = abs(vUv.y - 0.165);
            float dBot = abs(vUv.y - 0.355);
            cutDist = min(dTop, dBot);
            isUpperLip = dBot < dTop ? 1.0 : 0.0;
          } else if (vBand < 2.5) {
            float dTop = abs(vUv.y - 0.355);
            float dBot = abs(vUv.y - 0.545);
            cutDist = min(dTop, dBot);
            isUpperLip = dBot < dTop ? 1.0 : 0.0;
          } else {
            cutDist = abs(vUv.y - 0.545);
            isUpperLip = 0.0;
          }
          float seamGlow = exp(-cutDist * 46.0) * clamp(uSliceGap * 1.1 + uErrorFrac * 0.85, 0.0, 1.0);
          vec3 seamCol = mix(vec3(1.0, 0.44, 0.82), vec3(0.22, 0.98, 0.96), isUpperLip);
          if (uErrorFrac > 0.2) {
            seamCol = mix(seamCol, vec3(1.0, 0.24, 0.58), uErrorFrac * 0.75);
          }
          // Crisp razor specular edge + warm pastel inner core bleed
          rgb = mix(rgb, seamCol * 1.18 + vec3(0.18), clamp(seamGlow * 0.88, 0.0, 0.95));
        }

        // 2. SEARCHING STATE: 3D VOLUMETRIC LASER WIREFRAME + PNG CHECKERBOARD RECONSTRUCTION SWEEP
        if (uWireMix > 0.01) {
          float dScan = vUv.y - uScanY;
          float bandEnv = smoothstep(0.28, 0.0, abs(dScan)) * uWireMix;
          if (bandEnv > 0.005) {
            // Crisp exposed PNG transparency alpha checkerboard inside the scanned volume
            vec2 chk = floor(gl_FragCoord.xy / 6.0);
            float cPat = mod(chk.x + chk.y, 2.0);
            vec3 chkCol = mix(vec3(0.68, 0.72, 0.84), vec3(0.95, 0.96, 1.0), cPat);

            // Real 3D topological wireframe: UV mesh lattice + 3D depth contour isolines
            vec2 grid = abs(fract(vUv * vec2(24.0, 38.0) - 0.5) - 0.5);
            float gLine = 1.0 - smoothstep(0.04, 0.115, min(grid.x, grid.y));
            float iso = abs(fract(vDepth * 14.0 - 0.5) - 0.5);
            float isoLine = 1.0 - smoothstep(0.05, 0.125, iso);
            float wire = clamp(max(gLine * 0.96, isoLine * 0.88), 0.0, 1.0);

            vec3 wireBase = mix(chkCol * 0.90, vec3(0.10, 0.18, 0.34), 0.28);
            vec3 wireColor = mix(wireBase, vec3(0.06, 0.92, 0.96), wire);
            // Vibrant pink depth ridge contour highlights
            wireColor = mix(wireColor, vec3(1.0, 0.30, 0.76), isoLine * (0.28 + fresnel * 0.52));

            rgb = mix(rgb, wireColor, clamp(bandEnv * 0.96, 0.0, 0.96));
          }
          // Blazing electric cyan-white laser plane right at vUv.y == uScanY
          float beam = exp(-abs(dScan) * 125.0) * uWireMix;
          float pinkEdge = exp(-abs(dScan - 0.014) * 115.0) * uWireMix;
          rgb = mix(rgb, vec3(0.68, 1.0, 1.0), clamp(beam * 0.92, 0.0, 0.95));
          rgb += vec3(0.25, 0.98, 1.0) * beam * 0.65 + vec3(1.0, 0.28, 0.76) * pinkEdge * 0.92;
        }

        // 3. TOOL STATE: TRANSLUCENT HOLOGRAPHIC CYAN/LILAC BLUEPRINT GLASS + ANIMATED SCANLINES
        if (uHoloMix > 0.01) {
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          vec3 holoTint = mix(vec3(0.28, 0.94, 0.98), vec3(0.76, 0.62, 1.0), smoothstep(0.15, 0.88, vUv.y));
          float scanL = 0.84 + 0.16 * sin(vUv.y * 210.0 - uTime * 14.0);
          vec3 holoCol = (holoTint * (0.48 + lum * 0.68) + vec3(0.55, 1.0, 1.0) * fresnel * 0.85) * scanL;
          // Subtle blueprint horizontal grid ticks
          float bGrid = 1.0 - smoothstep(0.02, 0.065, abs(fract(vUv.y * 16.0) - 0.5));
          holoCol += vec3(0.32, 0.98, 0.96) * bGrid * 0.22;
          rgb = mix(rgb, holoCol, uHoloMix * 0.84);
          // Translucent interior glass, crisp bright Fresnel silhouette edges
          outAlpha *= mix(1.0, 0.78 + fresnel * 0.22, uHoloMix);
        }

        // 4. WRITING STATE: LUMINOUS PEARL-PASTEL SHIMMER WAVE RISING UP THE MARBLE
        if (uWriteMix > 0.01) {
          float wave = 0.5 + 0.5 * sin(vUv.y * 16.0 + uTime * 6.5);
          vec3 wCol = mix(vec3(0.45, 0.98, 0.96), vec3(1.0, 0.64, 0.88), wave);
          rgb += wCol * (fresnel * 0.26 + 0.055 * wave) * uWriteMix;
        }

        // 5. ERROR STATE: HOT MAGENTA/CYAN HORIZONTAL GLITCH BANDS + DESATURATED FLASH
        if (uErrorFrac > 0.01) {
          float tear = step(0.84, fract(sin(floor(vUv.y * 36.0 + uTime * 12.0) * 91.7) * 43758.5));
          rgb = mix(rgb, vec3(1.0, 0.26, 0.62), tear * uErrorFrac * 0.55);
          rgb += vec3(0.95, 0.22, 0.52) * fresnel * 0.42 * uErrorFrac;
        }

        // 6. DONE REASSEMBLY / PULSE SPECULAR FLASH WAVE
        if (uGlowFlash > 0.01) {
          float flashBand = exp(-abs(vUv.y - (1.0 - uGlowFlash)) * 7.5);
          rgb += mix(vec3(0.58, 1.0, 0.98), vec3(1.0, 0.92, 0.98), 0.5) * (uGlowFlash * 0.34 + flashBand * uGlowFlash * 0.52);
        }

        // Optional RGB chromatic ghost tint pass (uTint.a > 0)
        rgb = mix(rgb, uTint.rgb, uTint.a);
        gl_FragColor = vec4(rgb * outAlpha, outAlpha);
      }
    `;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('Statue shader error:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) { stGL = false; return false; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { stGL = false; return false; }

    // 4 independent triangulated anatomical marble slabs (duplicated seam vertices -> ZERO stretched gap triangles!)
    const cols = 96;
    const bands = [
      { v0: 0.0,   v1: 0.165, rows: 24, id: 0 }, // Crown curls
      { v0: 0.165, v1: 0.355, rows: 28, id: 1 }, // Brow, eyes, nose & lips
      { v0: 0.355, v1: 0.545, rows: 28, id: 2 }, // Chin & sculptural neck
      { v0: 0.545, v1: 1.0,   rows: 64, id: 3 }, // Draped toga shoulders + pedestal
    ];
    let totalVerts = 0, totalQuads = 0;
    for (const b of bands) {
      totalVerts += (cols + 1) * (b.rows + 1);
      totalQuads += cols * b.rows;
    }
    const verts = new Float32Array(totalVerts * 3); // [u, v, bandId]
    const indices = new Uint16Array(totalQuads * 6);
    let vi = 0, ii = 0, baseVert = 0;
    for (const b of bands) {
      for (let r = 0; r <= b.rows; r++) {
        const v = b.v0 + (b.v1 - b.v0) * (r / b.rows);
        for (let c = 0; c <= cols; c++) {
          verts[vi++] = c / cols;
          verts[vi++] = v;
          verts[vi++] = b.id;
        }
      }
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i0 = baseVert + r * (cols + 1) + c;
          const i1 = i0 + 1;
          const i2 = i0 + (cols + 1);
          const i3 = i2 + 1;
          indices[ii++] = i0; indices[ii++] = i2; indices[ii++] = i1;
          indices[ii++] = i1; indices[ii++] = i2; indices[ii++] = i3;
        }
      }
      baseVert += (cols + 1) * (b.rows + 1);
    }

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    stGL = {
      cv, gl, prog, vbo, ibo,
      count: indices.length,
      texColor: makeTex(),
      texDepth: makeTex(),
      uploadedColor: false,
      uploadedDepth: false,
      loc: {
        aUv: gl.getAttribLocation(prog, 'aUv'),
        aBand: gl.getAttribLocation(prog, 'aBand'),
        uColor: gl.getUniformLocation(prog, 'uColor'),
        uDepth: gl.getUniformLocation(prog, 'uDepth'),
        uAspect: gl.getUniformLocation(prog, 'uAspect'),
        uDepthScale: gl.getUniformLocation(prog, 'uDepthScale'),
        uYaw: gl.getUniformLocation(prog, 'uYaw'),
        uPitch: gl.getUniformLocation(prog, 'uPitch'),
        uRoll: gl.getUniformLocation(prog, 'uRoll'),
        uSliceGap: gl.getUniformLocation(prog, 'uSliceGap'),
        uSliceTwist: gl.getUniformLocation(prog, 'uSliceTwist'),
        uWireMix: gl.getUniformLocation(prog, 'uWireMix'),
        uScanY: gl.getUniformLocation(prog, 'uScanY'),
        uHoloMix: gl.getUniformLocation(prog, 'uHoloMix'),
        uWriteMix: gl.getUniformLocation(prog, 'uWriteMix'),
        uErrorFrac: gl.getUniformLocation(prog, 'uErrorFrac'),
        uGlowFlash: gl.getUniformLocation(prog, 'uGlowFlash'),
        uTime: gl.getUniformLocation(prog, 'uTime'),
        uTint: gl.getUniformLocation(prog, 'uTint'),
      },
    };
    return stGL;
  }

  function renderStatue3D(yaw = 0, pitch = 0, roll = 0, tint = [1, 1, 1, 0], fx = {}) {
    if (!ready(PLATES.statueBust) || !ready(PLATES.statueDepth)) return null;
    const s = initStatueGL();
    if (!s) return null;
    const { gl, prog, loc } = s;

    if (!s.uploadedColor) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, s.texColor);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, PLATES.statueBust);
      s.uploadedColor = true;
    }
    if (!s.uploadedDepth) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, s.texDepth);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, PLATES.statueDepth);
      s.uploadedDepth = true;
    }

    gl.viewport(0, 0, s.cv.width, s.cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo);
    gl.enableVertexAttribArray(loc.aUv);
    gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(loc.aBand);
    gl.vertexAttribPointer(loc.aBand, 1, gl.FLOAT, false, 12, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.ibo);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s.texColor);
    gl.uniform1i(loc.uColor, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.texDepth);
    gl.uniform1i(loc.uDepth, 1);

    const aspect = PLATES.statueBust.naturalWidth / PLATES.statueBust.naturalHeight;
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uDepthScale, 0.28);
    gl.uniform1f(loc.uYaw, yaw);
    gl.uniform1f(loc.uPitch, pitch);
    gl.uniform1f(loc.uRoll, roll);
    gl.uniform1f(loc.uSliceGap, fx.sliceGap || 0);
    gl.uniform1f(loc.uSliceTwist, fx.sliceTwist || 0);
    gl.uniform1f(loc.uWireMix, fx.wireMix || 0);
    gl.uniform1f(loc.uScanY, fx.scanY ?? -1.0);
    gl.uniform1f(loc.uHoloMix, fx.holoMix || 0);
    gl.uniform1f(loc.uWriteMix, fx.writeMix || 0);
    gl.uniform1f(loc.uErrorFrac, fx.errorFrac || 0);
    gl.uniform1f(loc.uGlowFlash, fx.glowFlash || 0);
    gl.uniform1f(loc.uTime, fx.time || 0);
    gl.uniform4f(loc.uTint, tint[0], tint[1], tint[2], tint[3]);

    gl.drawElements(gl.TRIANGLES, s.count, gl.UNSIGNED_SHORT, 0);
    return s.cv;
  }

  class Base extends HTMLElement {
    constructor() {
      super();
      this.root = this.attachShadow({
        mode: 'open',
        delegatesFocus: !!this.constructor.delegates,
      });
      if (this.constructor.formAssociated && this.attachInternals) {
        this.internals = this.attachInternals();
      }
    }
    connectedCallback() {
      if (!this._booted) {
        this._booted = true;
        this.root.innerHTML = `<style>*{box-sizing:border-box}${this.constructor.css || ''}</style>${this.render()}`;
        this.setup();
        this.dirty = true;
        this._ro = new ResizeObserver(() => { this.dirty = true; start(); });
        this._ro.observe(this);
        this._assetCb = () => { this.dirty = true; start(); };
        onAssetLoad.add(this._assetCb);
      }
      this._tick ||= (dt, t) => this.frame(dt, t);
      listeners.add(this._tick);
      start();
    }
    disconnectedCallback() {
      listeners.delete(this._tick);
      if (this._assetCb) onAssetLoad.delete(this._assetCb);
    }
    $(sel) { return this.root.querySelector(sel); }
    $$(sel) { return [...this.root.querySelectorAll(sel)]; }
    emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }
    render() { return ''; }
    setup() {}
    frame() {}
  }

  // Shared "PARADISE OS 95" Cross-Window Reactive Signal Bus
  const busHandlers = new Map();
  const bus = {
    state: {
      paradise: true,       // DREAM_CTRL.DLL global mode (true = PARADISE.SYS, false = REALITY.SYS)
      poolLevel: 0.62,      // POOL_FLOOD.EXE normalized 0..1 flood level
      agentState: 'thinking',
      crtChannel: 1,
      tempo: 1.0,           // CDROM_DIAL.DRV live playback rate (0.76 .. 1.24)
      spinning: true,
    },
    on(type, fn) {
      if (!busHandlers.has(type)) busHandlers.set(type, new Set());
      busHandlers.get(type).add(fn);
      return () => busHandlers.get(type)?.delete(fn);
    },
    emit(type, payload = {}) {
      if (type === 'reality') bus.state.paradise = !!payload.paradise;
      else if (type === 'pool') bus.state.poolLevel = clamp(payload.norm ?? bus.state.poolLevel, 0, 1);
      else if (type === 'agent') bus.state.agentState = payload.state || bus.state.agentState;
      else if (type === 'crt') bus.state.crtChannel = payload.channel ?? bus.state.crtChannel;
      else if (type === 'tempo') {
        if (payload.rate !== undefined) bus.state.tempo = clamp(payload.rate, 0.5, 1.8);
        if (payload.spinning !== undefined) bus.state.spinning = !!payload.spinning;
      }
      const set = busHandlers.get(type);
      if (set) for (const fn of set) fn(payload, bus.state);
      start();
    },
  };


  // Helper: razor-sharp 2px raised or sunken bevel rectangle
  function drawBevelBox(g, x, y, w, h, {
    fill = '#E4E0D8',
    sunken = false,
    hi = '#FFFFFF',
    hiInner = '#F2EFE9',
    loInner = '#9A939B',
    lo = '#3D354B',
  } = {}) {
    g.save();
    if (fill) {
      g.fillStyle = fill;
      g.fillRect(x, y, w, h);
    }
    const tl1 = sunken ? lo : hi;
    const tl2 = sunken ? loInner : hiInner;
    const br1 = sunken ? hi : lo;
    const br2 = sunken ? hiInner : loInner;

    // Outer 1px rim
    g.fillStyle = tl1;
    g.fillRect(x, y, w, 1.5);
    g.fillRect(x, y, 1.5, h);
    g.fillStyle = br1;
    g.fillRect(x, y + h - 1.5, w, 1.5);
    g.fillRect(x + w - 1.5, y, 1.5, h);

    // Inner 1px chamfer
    g.fillStyle = tl2;
    g.fillRect(x + 1.5, y + 1.5, w - 3, 1.2);
    g.fillRect(x + 1.5, y + 1.5, 1.2, h - 3);
    g.fillStyle = br2;
    g.fillRect(x + 1.5, y + h - 2.7, w - 3, 1.2);
    g.fillRect(x + w - 2.7, y + 1.5, 1.2, h - 3);
    g.restore();
  }

  function define(tag, cls) {
    if (!customElements.get(tag)) customElements.define(tag, cls);
  }

  const api = {
    TAU, clamp, lerp, smooth, hash,
    Spring, Base, define, fit, later, start, advance,
    paused: false,
    get now() { return now; },
    get reducedMotion() { return reducedMotion; },
    PLATES, ready, onAssetLoad, bus,
    roundRectPath, drawCheckerboard, drawRealPoolWater, drawRealHoloFoil,
    drawPlatePixelSort, drawSmpteBars, drawWireCube, drawWireHypercube, drawMicroBadge,
    drawTintedPlate, drawContactShadow, renderStatue3D, drawBevelBox,
    addPlates, addFonts,
  };

  window.ParadiseOS = api;
})();
