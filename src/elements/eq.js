// =========================================================================
// 9. <paradise-eq> — 7-Band Liquid-Glass & Glazed Pink Ceramic Spectrum Equalizer
//    Real macro-photographed 7-slot glazed pink ceramic bezel with physically recessed
//    shimmering turquoise pool-water columns, gravity-bouncing mirror chrome peak-hold
//    pearls, paint-across swipe sculpting, musical presets, CLIP +3dB & live bus sync!
// =========================================================================
const EQ_SLOTS = [
  { x: 0.0941, y: 0.1599, w: 0.0556, h: 0.6696, lbl: '60Hz' },
  { x: 0.2204, y: 0.1599, w: 0.0556, h: 0.6679, lbl: '170'  },
  { x: 0.3468, y: 0.1599, w: 0.0556, h: 0.6679, lbl: '310'  },
  { x: 0.4731, y: 0.1599, w: 0.0556, h: 0.6696, lbl: '600'  },
  { x: 0.5986, y: 0.1616, w: 0.0565, h: 0.6679, lbl: '1K'   },
  { x: 0.7249, y: 0.1599, w: 0.0565, h: 0.6679, lbl: '3K'   },
  { x: 0.8522, y: 0.1616, w: 0.0547, h: 0.6661, lbl: '12K'  },
];
const EQ_PRESETS = {
  mallsoft: [0.68, 0.78, 0.62, 0.48, 0.56, 0.72, 0.64],
  sunset:   [0.84, 0.72, 0.58, 0.50, 0.66, 0.82, 0.90],
  glitch:   [0.94, 0.34, 0.92, 0.42, 0.95, 0.28, 0.88],
  flat:     [0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50],
};

class VpVaporEq extends Base {
  static delegates = true;
  static observedAttributes = ['preset', 'live'];
  static css = `
    :host { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; }
    .deck {
      position: relative; width: 444px; height: 236px;
      cursor: crosshair; user-select: none; touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .deck:focus { outline: none; }
    /* keyboard focus only: a press focuses it too, and the ring should not circle it under the pointer */
    .deck:focus-visible:not([data-pointer]) { outline: 2px solid #3CEBE2; outline-offset: 6px; border-radius: 14px; }
    canvas {
      position: absolute; left: -24px; top: -22px;
      width: 492px; height: 280px; pointer-events: none;
    }
  `;
  render() {
    return `<div class="deck" role="group" tabindex="0" aria-label="7-Band Liquid-Glass Ceramic Spectrum Equalizer (swipe across columns to sculpt)"><canvas aria-hidden="true"></canvas></div>`;
  }
  setup() {
    this.el = this.$('.deck');
    this.cv = this.$('canvas');
    this._preset = EQ_PRESETS[this.getAttribute('preset')] ? this.getAttribute('preset') : 'mallsoft';
    this._live = this.getAttribute('live') !== 'false';
    this.bands = EQ_PRESETS[this._preset].map((v) => new Spring(v, 220, 18));
    this.peakY = EQ_PRESETS[this._preset].slice(); // 0..1 gravity peak-hold mirror chrome pearl height!
    this.peakV = new Array(7).fill(0);
    this.clipFlash = new Float32Array(7);
    this.clipBadgeSpr = new Spring(0, 220, 20);
    this.realitySpr = new Spring(bus.state.paradise ? 0 : 1, 180, 19);
    this.fountainAge = 1; // 0..1 joyous harmonic wave when HELIOS hits DONE!
    this.activeBand = -1;
    this.dragging = false;
    this._lastPaintedBand = -1;
    this.phase = 0;

    const paintAt = (e) => {
      const r = this.el.getBoundingClientRect();
      // Match exact canvas rack projection inside .deck (rx = 34, ry = 30, rw = 424, rh = 214; canvas left=-24, top=-22)
      const s = r.width / (this.el.offsetWidth || r.width) || 1; // CSS zoom or a transform scales the drawing
      const lx = (e.clientX - r.left) / s + 24;
      const ly = (e.clientY - r.top) / s + 22;
      const rw = 424, rh = 214, rx = (492 - rw) * 0.5, ry = 30;
      const nx = (lx - rx) / rw;
      // Pick nearest of the 7 ceramic slots cleanly even while swiping fast across dividers!
      let bestIdx = 0, bestDist = 99;
      for (let i = 0; i < 7; i++) {
        const cxSlot = EQ_SLOTS[i].x + EQ_SLOTS[i].w * 0.5;
        const d = Math.abs(nx - cxSlot);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const sl = EQ_SLOTS[bestIdx];
      const sy0 = ry + sl.y * rh;
      const sh = sl.h * rh;
      const val = clamp(1 - (ly - sy0) / sh, 0.04, 1.0);
      this.activeBand = bestIdx;
      this.setBand(bestIdx, val, bestIdx !== this._lastPaintedBand);
      this._lastPaintedBand = bestIdx;
    };

    this.el.addEventListener('keydown', () => { delete this.el.dataset.pointer; }, true);
    this.el.addEventListener('pointerdown', (e) => {
      this.el.dataset.pointer = '';
      this.el.focus();
      this.el.setPointerCapture(e.pointerId);
      this.dragging = true;
      this._lastPaintedBand = -1;
      paintAt(e);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      paintAt(e);
    });
    const endPaint = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.activeBand = -1;
      this._lastPaintedBand = -1;
      this.emit('change', { bands: this.getValues(), preset: 'custom' });
    };
    this.el.addEventListener('pointerup', endPaint);
    this.el.addEventListener('pointercancel', endPaint);

    this._unsubReality = bus.on('reality', ({ paradise }) => {
      this.realitySpr.to = paradise ? 0 : 1;
      start();
    });
    this._unsubAgent = bus.on('agent', ({ state }) => {
      if (state === 'done') this.triggerFountain();
      else if (state === 'error') this.applyPreset('glitch', true);
    });
    SND?.setEqGains?.(this.bands.map((b) => b.to));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubReality?.();
    this._unsubAgent?.();
  }
  get preset() { return this._preset; }
  set preset(name) { this.applyPreset(name, false); }
  get live() { return this._live; }
  set live(v) { this._live = !!v; this.setAttribute('live', String(this._live)); start(); }
  getValues() { return this.bands.map((b) => Math.round(clamp(b.to, 0, 1) * 100)); }
  attributeChangedCallback(name, o, n) {
    if (!this._booted || o === n) return;
    if (name === 'preset' && EQ_PRESETS[n]) this.applyPreset(n, true);
    if (name === 'live') this._live = n !== 'false';
  }
  setBand(idx, val, chime = true) {
    const v = clamp(val, 0.04, 1);
    const b = this.bands[idx];
    if (!b) return;
    const kick = Math.max(0, v - b.x);
    b.to = v;
    if (v > this.peakY[idx]) {
      this.peakY[idx] = v;
      this.peakV[idx] = Math.max(this.peakV[idx], 0.45 + kick * 1.4);
    }
    if (v >= 0.88) this.clipFlash[idx] = 1.0;
    SND?.setEqGains?.(this.bands.map((x) => x.to));
    if (chime) SND?.eqBand(idx, v);
    this.emit('input', { band: idx, value: Math.round(v * 100), bands: this.getValues() });
    this.dirty = true; start();
  }
  applyPreset(name, silent = false) {
    const vals = EQ_PRESETS[name] || EQ_PRESETS.mallsoft;
    this._preset = EQ_PRESETS[name] ? name : 'mallsoft';
    vals.forEach((v, i) => {
      this.bands[i].to = v;
      this.peakV[i] = Math.max(this.peakV[i], 0.65 + (i % 2) * 0.25);
      if (v >= 0.88) this.clipFlash[i] = 1.0;
    });
    SND?.setEqGains?.(this.bands.map((x) => x.to));
    if (!silent) SND?.eqPreset(this._preset);
    this.emit('change', { preset: this._preset, bands: this.getValues() });
    this.dirty = true; start();
  }
  triggerFountain() {
    this.fountainAge = 0;
    for (let i = 0; i < 7; i++) {
      this.peakV[i] = 0.85 + Math.sin((i / 6) * Math.PI) * 0.65;
    }
    this.dirty = true; start();
  }
  frame(dt, t) {
    this.realitySpr.step(dt);
    this.clipBadgeSpr.step(dt);
    if (this.fountainAge < 1) this.fountainAge = Math.min(1, this.fountainAge + dt * 1.05);

    // Tempo & live real-time Web Audio FFT spectrum lock to CDROM_DIAL.DRV!
    const tempo = bus.state.spinning ? (bus.state.tempo || 1.0) : 0.45;
    if (!GP.reducedMotion) this.phase += dt * tempo;
    const ph = this.phase;
    const agentSt = bus.state.agentState || 'thinking';
    const fft = this._live && !GP.reducedMotion ? SND?.getBands7?.() : null;

    const liveLevels = new Float32Array(7);
    let clippingCount = 0;
    for (let i = 0; i < 7; i++) {
      this.bands[i].step(dt);
      if (this.clipFlash[i] > 0) this.clipFlash[i] = Math.max(0, this.clipFlash[i] - dt * 1.9);

      // Drive directly from real-time Synthwave Hip-Hop FFT when music plays, else ambient shimmer!
      let lvl;
      if (fft) {
        const bandGain = 0.55 + this.bands[i].x * 0.72;
        lvl = clamp(this.bands[i].x * 0.36 + fft[i] * bandGain * 0.78, 0.05, 1.0);
      } else {
        let mod = 0;
        if (this._live && !GP.reducedMotion) {
          if (agentSt === 'searching') {
            const scan = (ph * 1.35) % 1;
            const d = Math.abs(i / 6 - scan);
            mod = Math.exp(-d * 6.5) * 0.24 - 0.05;
          } else if (agentSt === 'error') {
            mod = Math.sin(ph * 11 + i * 2.4) * 0.18;
          } else {
            const w1 = Math.sin(ph * (2.2 + i * 0.32) + i * 1.15);
            const w2 = Math.cos(ph * 3.8 - i * 0.85);
            const amp = agentSt === 'idle' ? 0.045 : agentSt === 'writing' ? 0.13 : 0.095;
            mod = (w1 * 0.65 + w2 * 0.35) * amp;
          }
        }
        lvl = clamp(this.bands[i].x + mod, 0.04, 1.0);
      }
      // Harmonic fountain wave on HELIOS DONE!
      if (this.fountainAge < 1) {
        const wavePos = this.fountainAge * 1.35 - 0.15;
        lvl = clamp(lvl + Math.exp(-Math.abs(i / 6 - wavePos) * 7) * 0.32 * (1 - this.fountainAge), 0.04, 1.0);
      }
      liveLevels[i] = lvl;
      if (lvl >= 0.86) {
        clippingCount++;
        this.clipFlash[i] = Math.max(this.clipFlash[i], 0.72);
      }

      // Real gravity physics on the mirror chrome peak-hold pearls!
      if (lvl > this.peakY[i]) {
        this.peakY[i] = lvl;
        this.peakV[i] = Math.max(this.peakV[i], 0.28);
      } else if (!GP.reducedMotion) {
        this.peakV[i] -= 1.35 * dt;
        this.peakY[i] += this.peakV[i] * dt;
        if (this.peakY[i] < lvl) {
          this.peakY[i] = lvl;
          this.peakV[i] = Math.abs(this.peakV[i]) > 0.25 ? Math.abs(this.peakV[i]) * 0.25 : 0;
        }
      }
      this.peakY[i] = clamp(this.peakY[i], lvl, 0.99);
    }
    this.clipBadgeSpr.to = clippingCount >= 2 ? 1 : 0;

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const rw = 424, rh = 214;
    const rx = (W - rw) * 0.5;
    const ry = 30;
    const reality = clamp(this.realitySpr.x, 0, 1);
    const dark = document.body.classList.contains('surf-indigo');

    // 1. Soft grounded studio shadow underneath the ceramic 7-slot EQ rack!
    g.save();
    g.shadowColor = dark ? 'rgba(6, 4, 16, 0.55)' : 'rgba(42, 28, 56, 0.22)';
    g.shadowBlur = 22;
    g.shadowOffsetX = 4;
    g.shadowOffsetY = 12;
    g.fillStyle = dark ? '#1B1530' : '#DED6D8';
    roundRectPath(g, rx + 3, ry + 3, rw - 6, rh - 6, 18);
    g.fill();
    g.restore();

    // 2. RECESSED LIQUID-GLASS COLUMNS + MIRROR CHROME PEAK PEARLS (drawn BEHIND ceramic bezel!)
    for (let i = 0; i < 7; i++) {
      const sl = EQ_SLOTS[i];
      // Expand 3px under the opaque ceramic lips so water sits edge-to-edge with zero 1px gap!
      const sx = rx + sl.x * rw - 3;
      const sy = ry + sl.y * rh - 3;
      const sw = sl.w * rw + 6;
      const sh = sl.h * rh + 6;
      const lvl = liveLevels[i];
      const fillH = Math.max(8, sh * lvl);
      const topY = sy + sh - fillH;
      const cf = this.clipFlash[i];

      g.save();
      roundRectPath(g, sx, sy, sw, sh, sw * 0.48);
      g.clip();

      // Recessed channel backing (subtle dB tick ladder)
      g.fillStyle = dark ? '#161128' : '#E2DCE2';
      g.fillRect(sx, sy, sw, sh);
      if (reality > 0.04) {
        g.save();
        g.globalAlpha = reality * 0.92;
        drawCheckerboard(g, sx, sy, sw, sh, 5, '#B2BACB', '#EEF1FA');
        g.restore();
      }
      g.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(56, 44, 78, 0.14)';
      for (let k = 1; k < 8; k++) g.fillRect(sx + 5, sy + (k / 8) * sh, sw - 10, 1);

      // Live Liquid Turquoise Pool-Water Column (or 1995 LED blocks in REALITY.SYS!)
      if (reality < 0.96) {
        g.save();
        g.beginPath(); g.rect(sx, topY, sw, fillH + 2); g.clip();
        drawRealPoolWater(g, sx - 20, sy, sw + 40, sh, t + i * 0.45, {
          alpha: (1 - reality * 0.85),
          scrollX: i * 38,
          refractBoost: 1.2 + cf * 0.4,
        });
        // Holographic CD shimmer & pink overload bloom near the top when >78%!
        if (lvl > 0.72) {
          g.save();
          g.globalCompositeOperation = 'screen';
          g.globalAlpha = clamp((lvl - 0.72) / 0.28) * 0.65 * (1 - reality);
          drawRealHoloFoil(g, sx, topY, sw, fillH, t * 1.4, i);
          g.restore();
        }
        if (cf > 0.05) {
          const ovg = g.createLinearGradient(sx, topY, sx, topY + 26);
          ovg.addColorStop(0, `rgba(255, 62, 168, ${(0.78 * cf).toFixed(3)})`);
          ovg.addColorStop(1, 'rgba(255, 62, 168, 0)');
          g.fillStyle = ovg;
          g.fillRect(sx, topY, sw, 26);
        }
        g.restore();

        // Sparkling sunlit foam meniscus crest at water top
        g.fillStyle = cf > 0.25 ? '#FF98DC' : '#FFFFFF';
        g.shadowColor = cf > 0.25 ? '#FF48B8' : '#58FAF4';
        g.shadowBlur = 7;
        g.fillRect(sx, topY - 1, sw, 2.4);
        g.shadowBlur = 0;
      }

      // REALITY.SYS Mode: crisp stepped 1995 digital LED equalizer blocks!
      if (reality > 0.04) {
        g.save();
        g.globalAlpha = reality * 0.95;
        const totalBlocks = 12;
        const litBlocks = Math.max(1, Math.round(lvl * totalBlocks));
        const bh = (sh - 10) / totalBlocks;
        for (let b = 0; b < litBlocks; b++) {
          const by = sy + sh - 5 - (b + 1) * bh;
          g.fillStyle = b >= 10 ? '#E83268' : b >= 7 ? '#26B8E8' : '#1E54B8';
          g.fillRect(sx + 5, by + 1.5, sw - 10, bh - 2.6);
        }
        g.restore();
      }

      // Gravity-Bouncing Mirror Chrome Peak-Hold Pearl riding atop each column!
      const pearlY = clamp(sy + sh - sh * this.peakY[i], sy + 11, sy + sh - 10);
      const pr = 7.4;
      if (ready(PLATES.chromeSphere)) {
        g.save();
        g.shadowColor = 'rgba(20, 48, 64, 0.35)';
        g.shadowBlur = 5;
        g.shadowOffsetY = 2;
        g.drawImage(PLATES.chromeSphere, sx + sw * 0.5 - pr, pearlY - pr, pr * 2, pr * 2);
        g.restore();
      }

      // Subtle inner ceramic groove shadow + vertical glass highlight along each recessed slot!
      const inSh = g.createLinearGradient(sx, sy, sx + sw, sy);
      inSh.addColorStop(0, 'rgba(34, 20, 44, 0.32)');
      inSh.addColorStop(0.22, 'rgba(255, 255, 255, 0.14)');
      inSh.addColorStop(0.78, 'rgba(255, 255, 255, 0.0)');
      inSh.addColorStop(1, 'rgba(34, 20, 44, 0.24)');
      g.fillStyle = inSh;
      g.fillRect(sx, sy, sw, sh);
      g.restore();
    }

    // 3. REAL MACRO-PHOTOGRAPHED GLAZED BLUSH-PINK CERAMIC 7-SLOT BEZEL ON TOP!
    if (ready(PLATES.eqRack)) {
      g.save();
      if (reality > 0.05) g.filter = `saturate(${(1 - reality * 0.78).toFixed(2)})`;
      g.drawImage(PLATES.eqRack, rx, ry, rw, rh);
      g.restore();
    }

    // 4. Peak Overload RGB Glitch Slivers spilling cleanly above clipping slots (>86%)!
    if (!GP.reducedMotion) {
      for (let i = 0; i < 7; i++) {
        const cf = this.clipFlash[i];
        if (cf > 0.12 && liveLevels[i] >= 0.85) {
          const sl = EQ_SLOTS[i];
          const gx = rx + sl.x * rw - 6;
          const gy = ry + sl.y * rh - 3;
          const gw = sl.w * rw + 12;
          g.save();
          g.globalAlpha = cf * 0.88;
          g.fillStyle = '#FF3EC0'; g.fillRect(gx - 3, gy - 2, gw, 2.2);
          g.fillStyle = '#24F8F0'; g.fillRect(gx + 3, gy + 1, gw, 2.2);
          g.restore();
        }
      }
    }

    // 5. Crisp Frequency Scale Captions beneath all 7 glazed ceramic slots!
    g.save();
    g.font = "700 9.2px 'IBM Plex Mono', monospace";
    g.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const sl = EQ_SLOTS[i];
      const lx = rx + (sl.x + sl.w * 0.5) * rw;
      const active = i === this.activeBand || liveLevels[i] >= 0.88;
      g.fillStyle = active
        ? (dark ? '#5CF8F4' : '#0B9FA8')
        : (dark ? 'rgba(242, 236, 249, 0.65)' : '#685B7C');
      g.fillText(sl.lbl, lx, ry + rh + 16);
    }
    g.restore();

    // 6. CRT-Flashing Miniature  95-era CLIP +3dB Micro-Badge when >= 2 bands overload!
    const cb = clamp(this.clipBadgeSpr.x, 0, 1);
    if (cb > 0.02) {
      drawMicroBadge(g, rx + rw - 44, ry - 4, 'CLIP +3dB', 'OVERLOAD', {
        pop: cb, w: 80, h: 28, pal: ['#FF4284', '#FF98D4'], bodyColor: '#A8184B',
      });
    }
  }
}
define('paradise-eq', VpVaporEq);
