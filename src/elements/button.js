// =========================================================================
// 7. <paradise-cascade-button> — Hold-to-charge 4D hypercube + card cascade
//    Hold to charge an unfolding 4D wireframe hypercube inside PNG transparency void;
//    release to fire a proportional mega-cascade of cards (2 -> 10 cards with squash bounces!)
// =========================================================================
const CASCADE_MSGS = ['Still dreaming?', '0x1995 OK', '640K FREE', 'HELIOS.DLL', 'POOL OVERFLOW', 'NO SIGNAL'];
class VpWinCascadeBtn extends Base {
  static delegates = true;
  static observedAttributes = ['label', 'title'];
  static css = `
    :host { display: inline-block; vertical-align: middle; }
    button {
      all: unset; position: relative; display: block; width: 248px; height: 110px;
      cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
    }
    button:focus-visible { outline: 2px dotted #2C213D; outline-offset: 6px; }
    canvas {
      position: absolute; left: -92px; top: -64px;
      width: 432px; height: 246px; pointer-events: none;
    }
  `;
  render() {
    return `<button type="button" aria-label="Cascade button (hold to charge)"><canvas aria-hidden="true"></canvas></button>`;
  }
  setup() {
    this.btn = this.$('button');
    this.cv = this.$('canvas');
    this.press = new Spring(0, 440, 26);
    this.recoil = new Spring(0, 320, 16);
    this.realitySpr = new Spring(bus.state.paradise ? 0 : 1, 180, 19);
    this.hover = 0;
    this.down = false;
    this.charge = 0;       // 0..1 hold-to-charge 4D hypercube energy!
    this._lastChargeStep = 0;
    this.alertFlash = 0;   // sympathetic warning pulse when HELIOS enters error!
    this.clearSweep = 0;   // 0..1 crisp CRT collapse clear sweep!
    this.combo = 0;
    this.lastClickT = -10;
    this.particles = [];
    this.stamps = [];

    const onDown = () => {
      this.down = true;
      this.charge = 0;
      this._lastChargeStep = 0;
      this.press.to = 1;
      SND?.keycapDown();
      this.dirty = true; start();
    };
    const onUp = (fire) => {
      if (!this.down) return;
      const ch = this.charge;
      this.down = false;
      this.charge = 0;
      this.press.to = 0;
      if (fire) this.fireCascade(ch);
      this.dirty = true; start();
    };

    this.btn.addEventListener('pointerenter', () => { this.hover = 1; this.dirty = true; start(); });
    this.btn.addEventListener('pointerleave', () => { this.hover = 0; if (this.down) onUp(false); this.dirty = true; start(); });
    this.btn.addEventListener('pointerdown', (e) => { this.btn.setPointerCapture(e.pointerId); onDown(); });
    this.btn.addEventListener('pointerup', () => onUp(true));
    this.btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!this.down) onDown(); }
    });
    this.btn.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onUp(true); }
    });

    this._unsubReality = bus.on('reality', ({ paradise }) => {
      this.realitySpr.to = paradise ? 0 : 1;
      start();
    });
    this._unsubAgent = bus.on('agent', ({ state }) => {
      if (state === 'error') this.pulseAlert();
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubReality?.();
    this._unsubAgent?.();
  }
  pulseAlert() {
    this.alertFlash = 1.0;
    this.recoil.v += 11;
    this.dirty = true; start();
  }
  clearCascade() {
    if (!this.particles.length && !this.stamps.length) return;
    this.clearSweep = 1.0;
    this.particles.length = 0;
    this.combo = 0;
    SND?.crtOff();
    this.emit('action', { combo: 0, cleared: true });
    this.dirty = true; start();
  }
  fireCascade(chargeAmt = 0) {
    const ch = clamp(chargeAmt, 0, 1);
    const nowT = GP.now;
    this.combo = (nowT - this.lastClickT < 1.35) ? Math.min(12, this.combo + 1 + Math.round(ch * 3)) : (1 + Math.round(ch * 3));
    this.lastClickT = nowT;
    if (ch > 0.3) this.recoil.v += 8 + ch * 14;
    SND?.winCascade(this.combo);
    this.emit('action', { combo: this.combo, charge: ch, mega: ch >= 0.7 });

    if (GP.reducedMotion) return;
    const palettes = [
      ['#9B98FA', '#F5A6DA', '#68EFEA'],
      ['#FF78C8', '#FFC498', '#FFF2A8'],
      ['#36E8E2', '#9EA6FA', '#F5A8DE'],
      ['#1E3278', '#6B82C8', '#A8C0FA'],
      ['#FF4A98', '#FF98D4', '#58FAF4'],
    ];
    // Proportional waterfall: quick tap = 2 cards, full 4D hypercube charge = 9-card rainbow MEGA-CASCADE!
    const count = ch >= 0.72 ? 9 : Math.min(6, 2 + Math.floor(this.combo / 2) + Math.round(ch * 4));
    for (let i = 0; i < count; i++) {
      const dir = ((this.combo + i) % 2 === 0) ? 1 : -1;
      const fan = (i / Math.max(1, count - 1) - 0.5) * 2;
      this.particles.push({
        x: 92 + 54 + fan * 42 + (Math.random() - 0.5) * 18,
        y: 64 + 8,
        vx: dir * (118 + Math.random() * 125 + ch * 55),
        vy: -(115 + Math.random() * 105 + ch * 60),
        w: 112,
        h: 56,
        squash: 1,
        age: 0,
        life: 1.05 + ch * 0.35,
        stampCd: 0,
        pal: palettes[(this.combo + i) % palettes.length],
        msg: CASCADE_MSGS[(this.combo + i) % CASCADE_MSGS.length],
      });
    }
    if (this.particles.length > 16) this.particles.splice(0, this.particles.length - 16);
    this.dirty = true; start();
  }
  // One-click deterministic Charge Demo (holds 4D hypercube for 0.9s -> unleashes MEGA-CASCADE!)
  triggerChargeDemo() {
    this.down = true;
    this.charge = 0;
    this._lastChargeStep = 0;
    this.press.to = 1;
    SND?.keycapDown();
    start();
    GP.later(920, () => {
      if (!this.down) return;
      const ch = Math.max(0.92, this.charge);
      this.down = false;
      this.charge = 0;
      this.press.to = 0;
      this.fireCascade(ch);
    });
  }
  triggerDemoPress() { this.triggerChargeDemo(); }
  drawMiniDialog(g, x, y, w, h, pal, msg, alpha = 1, squash = 1) {
    g.save();
    g.globalAlpha = alpha;
    if (Math.abs(squash - 1) > 0.01) {
      g.translate(x + w * 0.5, y + h);
      g.scale(1 / squash, squash);
      g.translate(-(x + w * 0.5), -(y + h));
    }
    drawBevelBox(g, x, y, w, h, { fill: '#EAE5DC' });
    const tb = g.createLinearGradient(x + 3, y + 3, x + w - 3, y + 3);
    tb.addColorStop(0, pal[0]);
    tb.addColorStop(0.55, pal[1]);
    tb.addColorStop(1, pal[2]);
    g.fillStyle = tb;
    g.fillRect(x + 3, y + 3, w - 6, 13);
    drawBevelBox(g, x + w - 15, y + 4.5, 10, 10, { fill: '#E4E0D8' });
    g.font = "700 8px 'IBM Plex Mono', monospace";
    g.fillStyle = '#241A36';
    g.fillText('ERROR 95', x + 6, y + 12.2);
    g.font = "600 9px 'IBM Plex Mono', monospace";
    g.fillStyle = '#2B2238';
    g.fillText(msg, x + 9, y + 30);
    drawBevelBox(g, x + w * 0.5 - 18, y + h - 18, 36, 13, { fill: '#E4E0D8' });
    g.font = "700 8px 'IBM Plex Mono', monospace";
    g.fillText('OK', x + w * 0.5 - 5, y + h - 8.5);
    g.restore();
  }
  frame(dt, t) {
    this.press.step(dt);
    this.recoil.step(dt);
    this.realitySpr.step(dt);
    if (this.alertFlash > 0) this.alertFlash = Math.max(0, this.alertFlash - dt * 1.4);

    // Hold-to-charge 4D hypercube energy buildup!
    if (this.down) {
      this.charge = clamp(this.charge + dt * 0.96, 0, 1);
      const step = Math.floor(this.charge * 5);
      if (step > this._lastChargeStep && step <= 5) {
        this._lastChargeStep = step;
        SND?.chargeTick(this.charge);
        this.emit('charge', { charge: this.charge });
      }
    }

    // Clear sweep collapses all frozen cascade stamps horizontally into glowing CRT lines!
    if (this.clearSweep > 0) {
      this.clearSweep = Math.max(0, this.clearSweep - dt * 3.2);
      if (this.clearSweep <= 0.02) this.stamps.length = 0;
    }

    // Step gravity-bouncing dialog-card particles with floor squash-and-stretch!
    const floorY = 232;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.age += dt;
      pt.vy += 680 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.squash = lerp(pt.squash || 1, 1, clamp(dt * 14));
      if (pt.y + pt.h > floorY) {
        pt.y = floorY - pt.h;
        pt.vy = -Math.abs(pt.vy) * 0.64;
        pt.squash = 0.84; // tactile physical bounce squash on the well floor!
      }
      if (pt.x < 6) { pt.x = 6; pt.vx = Math.abs(pt.vx) * 0.78; }
      if (pt.x + pt.w > 426) { pt.x = 426 - pt.w; pt.vx = -Math.abs(pt.vx) * 0.78; }

      pt.stampCd -= dt;
      if (pt.stampCd <= 0) {
        pt.stampCd = 0.044;
        this.stamps.push({ x: pt.x, y: pt.y, w: pt.w, h: pt.h, pal: pt.pal, msg: pt.msg, age: 0, life: 0.88 });
        if (this.stamps.length > 64) this.stamps.shift();
      }
      if (pt.age >= pt.life) this.particles.splice(i, 1);
    }
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      this.stamps[i].age += dt;
      if (this.stamps[i].age >= this.stamps[i].life) this.stamps.splice(i, 1);
    }

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const recX = Math.sin(t * 44) * this.recoil.x * 0.45;
    const recY = this.recoil.x * 0.25;
    const ox = 92 + recX, oy = 64 + recY, bw = 248, bh = 110;
    const p = clamp(this.press.x);
    const ch = this.charge;
    const reality = clamp(this.realitySpr.x, 0, 1);

    // 1. frozen cascade stamps arcing behind & around the button!
    for (const st of this.stamps) {
      const a = smooth(clamp(1 - st.age / st.life)) * 0.92;
      if (this.clearSweep > 0.02) {
        g.save();
        g.translate(st.x + st.w * 0.5, st.y + st.h * 0.5);
        g.scale(1 + (1 - this.clearSweep) * 0.25, Math.max(0.05, this.clearSweep));
        g.translate(-(st.x + st.w * 0.5), -(st.y + st.h * 0.5));
        this.drawMiniDialog(g, st.x, st.y, st.w, st.h, st.pal, st.msg, a * this.clearSweep, 1);
        g.restore();
      } else {
        this.drawMiniDialog(g, st.x, st.y, st.w, st.h, st.pal, st.msg, a, 1);
      }
    }

    // 2. Crisp halftone pixel-dither shadow outside main button frame
    const dx = p * 2.5, dy = p * 2.5;
    g.save();
    g.fillStyle = 'rgba(72, 54, 108, 0.24)';
    for (let sy = oy + 9; sy < oy + bh + 9; sy += 4) {
      for (let sx = ox + 9; sx < ox + bw + 9; sx += 4) {
        if (sx >= ox + bw + dx || sy >= oy + bh + dy) g.fillRect(sx, sy, 2, 2);
      }
    }
    g.restore();

    // 3. main chunky critical-error dialog button!
    const bx = ox + dx, by = oy + dy;
    drawBevelBox(g, bx, by, bw, bh, { fill: '#E8E3DA', sunken: p > 0.45 });

    // Titlebar (Vaporwave Sunset <-> Classic  95-era Navy in REALITY.SYS <-> Coral pulse on HELIOS error!)
    const tbX = bx + 4, tbY = by + 4, tbW = bw - 8, tbH = 22;
    if (reality > 0.5) {
      const nav = g.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
      nav.addColorStop(0, '#0E2468'); nav.addColorStop(1, '#3664B4');
      g.fillStyle = nav;
    } else {
      const tb = g.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
      const sh = Math.sin(t * 1.6) * 0.1;
      tb.addColorStop(0, this.alertFlash > 0.15 ? '#FF4284' : '#A59DFC');
      tb.addColorStop(clamp(0.45 + sh), '#F7A6DC');
      tb.addColorStop(clamp(0.75 + sh), '#FFC79E');
      tb.addColorStop(1, '#68F0EA');
      g.fillStyle = tb;
    }
    g.fillRect(tbX, tbY, tbW, tbH);

    g.font = "700 10.5px 'IBM Plex Mono', monospace";
    g.fillStyle = reality > 0.5 ? '#FFFFFF' : '#261C38';
    const titleTxt = this.down && ch > 0.12
      ? (ch >= 0.88 ? 'OVERLOAD · RELEASE!' : `CHARGING · ${Math.round(ch * 100)}%`)
      : (this.getAttribute('title') || 'ERROR 1995');
    g.fillText(titleTxt, tbX + 8, tbY + 14.8);
    drawBevelBox(g, tbX + tbW - 35, tbY + 3, 15, 15, { fill: '#E6E1D8' });
    drawBevelBox(g, tbX + tbW - 18, tbY + 3, 15, 15, { fill: '#E6E1D8' });
    g.fillStyle = '#261C38';
    g.font = "700 9.5px 'IBM Plex Mono', monospace";
    g.fillText('?', tbX + tbW - 30, tbY + 13.8);
    g.fillText('×', tbX + tbW - 13.5, tbY + 13.8);

    // 4. Dialog Interior (HOLD -> drops texture into PNG Checkerboard + Escalating 4D Wireframe Hypercube!)
    const bodyX = bx + 6, bodyY = by + 28, bodyW = bw - 12, bodyH = bh - 34;
    if (p > 0.25 && !GP.reducedMotion) {
      g.save();
      g.beginPath(); g.rect(bodyX, bodyY, bodyW, bodyH); g.clip();
      drawCheckerboard(g, bodyX, bodyY, bodyW, bodyH, 7, '#B8BAC8', '#F4F5FA');
      g.strokeStyle = ch > 0.7 ? '#FF52C2' : '#2CF8F0';
      g.lineWidth = 1.6 + ch * 0.8;
      g.strokeRect(bodyX + 1, bodyY + 1, bodyW - 2, bodyH - 2);
      // Unfolding 3D -> 4D Tesseract Wireframe Hypercube!
      drawWireHypercube(g, bodyX + bodyW * 0.5, bodyY + bodyH * 0.45, 21, t, ch, '#1AECE6', '#FF4CC2');

      // Escalating RGB glitch bars
      g.fillStyle = 'rgba(255,72,196,0.75)'; g.fillRect(bodyX, bodyY + 10, bodyW * (0.45 + ch * 0.5), 2);
      g.fillStyle = 'rgba(42,248,242,0.85)'; g.fillRect(bodyX + bodyW * (0.45 - ch * 0.35), bodyY + bodyH - 18, bodyW * (0.55 + ch * 0.4), 2);

      // Segmented  95-era Hold-to-Charge Energy Bar along bottom edge
      const barX = bodyX + 10, barY = bodyY + bodyH - 11, barW = bodyW - 20, barH = 7;
      g.fillStyle = 'rgba(28, 22, 46, 0.22)';
      g.fillRect(barX, barY, barW, barH);
      const segs = Math.round(ch * 14);
      for (let s = 0; s < segs; s++) {
        g.fillStyle = s > 9 ? '#FF4AC4' : '#24F4EE';
        g.fillRect(barX + 1.5 + s * ((barW - 3) / 14), barY + 1.2, (barW - 3) / 14 - 2.2, barH - 2.4);
      }
      g.restore();
    } else {
      // Classic  95-era Dialog Layout: Pastel Warning Emblem + Label + Beveled OK Key!
      const icX = bodyX + 26, icY = bodyY + 24;
      if (this.alertFlash > 0.05) {
        g.save();
        g.strokeStyle = `rgba(255, 62, 128, ${(this.alertFlash * 0.9).toFixed(3)})`;
        g.lineWidth = 2.4;
        g.beginPath(); g.arc(icX, icY, 16 + (1 - this.alertFlash) * 10, 0, TAU); g.stroke();
        g.restore();
      }
      const icG = g.createLinearGradient(icX - 14, icY - 14, icX + 14, icY + 14);
      icG.addColorStop(0, this.alertFlash > 0.2 ? '#FF3A78' : '#FF8ED2');
      icG.addColorStop(1, '#5CF5EE');
      g.fillStyle = icG;
      g.beginPath(); g.arc(icX, icY, 15, 0, TAU); g.fill();
      g.strokeStyle = '#2B2238';
      g.lineWidth = 1.6;
      g.stroke();
      g.font = "700 17px 'IBM Plex Mono', monospace";
      g.fillStyle = '#FFFFFF';
      g.textAlign = 'center';
      g.fillText('!', icX, icY + 6);
      g.textAlign = 'left';

      g.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
      g.fillStyle = '#281E38';
      g.fillText(this.getAttribute('label') || 'Still dreaming?', bodyX + 52, bodyY + 28);

      // Tactile beveled [ OK ] sub-button with classic  95-era dotted hover focus ring!
      const okW = 128, okH = 26;
      const okX = bodyX + bodyW * 0.5 - okW * 0.5, okY = bodyY + bodyH - okH - 6;
      drawBevelBox(g, okX, okY, okW, okH, { fill: this.hover ? '#F2EEE6' : '#E6E1D8', sunken: p > 0.35 });
      if (this.hover) {
        g.save();
        g.setLineDash([1.5, 2]);
        g.strokeStyle = '#2C213D';
        g.lineWidth = 1;
        g.strokeRect(okX + 4.5, okY + 4.5, okW - 9, okH - 9);
        g.restore();
      }
      g.font = "700 10.5px 'IBM Plex Mono', monospace";
      g.fillStyle = '#261C38';
      g.textAlign = 'center';
      g.fillText('HOLD / CASCADE', okX + okW * 0.5, okY + 16.5);
      g.textAlign = 'left';
    }

    // 5. Lead active bouncing cards drawn cleanly on top!
    for (const pt of this.particles) {
      const a = smooth(clamp(1 - Math.max(0, pt.age - pt.life * 0.6) / (pt.life * 0.4)));
      this.drawMiniDialog(g, pt.x, pt.y, pt.w, pt.h, pt.pal, pt.msg, a, pt.squash || 1);
    }
  }
}
define('paradise-cascade-button', VpWinCascadeBtn);
