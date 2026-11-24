// =========================================================================
// 6. <paradise-toggle> — "Dream mode" portal switch
//    Progressive mechanical drag tension + pre-snap water leak across PNG checkerboard,
//    real lifecycle states (ready | busy | locked with READ ONLY micro-badge & bounce),
//    and OS-wide REALITY.SYS <-> PARADISE.SYS bus coupling!
// =========================================================================
class VpWinToggle extends Base {
  static delegates = true;
  static formAssociated = true;
  static observedAttributes = ['checked', 'mode'];
  static css = `
    :host { display: inline-block; vertical-align: middle; }
    .wrap {
      position: relative; width: 244px; height: 98px;
      cursor: pointer; user-select: none; touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .wrap[data-mode="locked"] { cursor: not-allowed; }
    .wrap[data-mode="busy"] { cursor: progress; }
    .wrap:focus-visible { outline: 2px dotted #2C213D; outline-offset: 6px; }
    canvas {
      position: absolute; left: -34px; top: -36px;
      width: 312px; height: 158px; pointer-events: none;
    }
  `;
  render() {
    return `<div class="wrap" role="switch" tabindex="0" aria-checked="true" aria-label="Dream mode switch"><canvas aria-hidden="true"></canvas></div>`;
  }
  setup() {
    this.el = this.$('.wrap');
    this.cv = this.$('canvas');
    this._mode = this.getAttribute('mode') || 'ready'; // 'ready' | 'busy' | 'locked'
    this.pos = new Spring(this._mode === 'busy' ? 0.5 : (this.checked ? 1 : 0), 290, 22);
    this.shakeSpr = new Spring(0, 420, 14);
    this.lockBadgeSpr = new Spring(0, 240, 20);
    this.lockBadgeTimer = 0;
    this.glitch = 0;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragBase = 0;
    this.dragMoved = false;
    this.trail = [];

    const triggerLockedFeedback = () => {
      this.shakeSpr.v += 19;
      this.lockBadgeSpr.to = 1;
      this.lockBadgeTimer = 1.65;
      SND?.lockedBounce();
      this.emit('blocked', { mode: this._mode });
      this.dirty = true; start();
    };

    this.el.addEventListener('pointerdown', (e) => {
      this.el.focus();
      if (this._mode === 'locked') { triggerLockedFeedback(); return; }
      if (this._mode === 'busy') { this.shakeSpr.v += 6; SND?.keyTap(); start(); return; }
      this.el.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragBase = this.checked ? 1 : 0;
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const r = this.el.getBoundingClientRect();
      const dx = (e.clientX - this.dragStartX) / (r.width / (this.el.offsetWidth || r.width) || 1); // in unscaled pixels
      if (Math.abs(dx) > 5) this.dragMoved = true;
      if (this.dragMoved) {
        const raw = clamp(this.dragBase + dx / 118, 0, 1);
        // Tactile mechanical rocker resistance approaching the 50% snap breakpoint!
        const resisted = clamp(raw - Math.sin(raw * TAU) * 0.048, 0, 1);
        this.pos.to = resisted;
        this.pos.x = lerp(this.pos.x, resisted, 0.72);
        this.dirty = true; start();
      }
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.dragMoved) {
        const next = this.pos.x >= 0.48;
        if (next !== this.checked) this.setChecked(next);
        else { this.pos.to = this.checked ? 1 : 0; start(); }
      } else {
        this.setChecked(!this.checked);
      }
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
    this.el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (this._mode === 'locked') triggerLockedFeedback();
        else if (this._mode === 'ready') this.setChecked(!this.checked);
      }
    });
    this.syncAttr(true);
  }
  get checked() { return this.hasAttribute('checked'); }
  set checked(v) { if (v) this.setAttribute('checked', ''); else this.removeAttribute('checked'); }
  get mode() { return this._mode; }
  set mode(v) {
    const clean = ['ready', 'busy', 'locked'].includes(v) ? v : 'ready';
    this.setAttribute('mode', clean);
  }
  nudgeLocked() {
    this.shakeSpr.v += 19;
    this.lockBadgeSpr.to = 1;
    this.lockBadgeTimer = 1.65;
    SND?.lockedBounce();
    this.dirty = true; start();
  }
  setChecked(next) {
    if (this._mode === 'locked') { this.nudgeLocked(); return; }
    this.checked = next;
    SND?.winToggle(next);
    SND?.realityShift(next);
    bus.emit('reality', { paradise: next });
    this.emit('change', { checked: next, mode: this._mode });
  }
  toggle() { this.setChecked(!this.checked); }
  attributeChangedCallback() { if (this._booted) this.syncAttr(false); }
  syncAttr(init) {
    const on = this.checked;
    this._mode = ['ready', 'busy', 'locked'].includes(this.getAttribute('mode')) ? this.getAttribute('mode') : 'ready';
    this.el.setAttribute('data-mode', this._mode);
    this.el.setAttribute('aria-checked', this._mode === 'busy' ? 'mixed' : String(on));
    this.el.setAttribute('aria-disabled', String(this._mode === 'locked'));
    if (this.internals) this.internals.setFormValue(on ? 'on' : null);

    const target = this._mode === 'busy' ? 0.5 : (on ? 1 : 0);
    if (init) this.pos.snap(target);
    else {
      this.pos.to = target;
      if (!GP.reducedMotion && this._mode === 'ready') this.glitch = 1.0;
      if (this._mode === 'locked') {
        this.lockBadgeSpr.to = 1;
        this.lockBadgeTimer = 2.4;
      } else {
        this.lockBadgeSpr.to = 0;
        this.lockBadgeTimer = 0;
      }
    }
    this.dirty = true; start();
  }
  // Crisp 1995 miniature  95-era animated hourglass inside thumb when mode="busy"
  drawHourglass(g, cx, cy, t) {
    const rot = (Math.floor(t * 2.2) % 2 === 1) ? Math.PI : 0;
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.strokeStyle = '#2B2140';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-5, -7); g.lineTo(5, -7);
    g.moveTo(-5, 7);  g.lineTo(5, 7);
    g.moveTo(-4, -7); g.lineTo(4, 7);
    g.moveTo(4, -7);  g.lineTo(-4, 7);
    g.stroke();
    // Cyan vapor sand trickling down
    const sand = (t * 1.1) % 1;
    g.fillStyle = '#22DCD8';
    g.beginPath();
    g.moveTo(-3 * (1 - sand), -6 + sand * 5);
    g.lineTo(3 * (1 - sand), -6 + sand * 5);
    g.lineTo(0, -1);
    g.closePath();
    g.fill();
    g.fillStyle = '#FF6AC4';
    g.beginPath();
    g.moveTo(-3.4 * sand, 6);
    g.lineTo(3.4 * sand, 6);
    g.lineTo(0, 6 - sand * 5);
    g.closePath();
    g.fill();
    g.restore();
  }
  frame(dt, t) {
    const prev = this.pos.x;
    this.pos.step(dt);
    this.shakeSpr.step(dt);
    this.lockBadgeSpr.step(dt);
    if (this.lockBadgeTimer > 0) {
      this.lockBadgeTimer -= dt;
      if (this.lockBadgeTimer <= 0 && this._mode !== 'locked') this.lockBadgeSpr.to = 0;
    }
    if (this.glitch > 0) this.glitch = Math.max(0, this.glitch - dt * 2.2);

    // Stamp authentic  95-era beveled thumb cascade ghosts whenever the thumb moves briskly!
    const vel = Math.abs(this.pos.x - prev) / Math.max(dt, 0.008);
    if (vel > 0.7 && !GP.reducedMotion) {
      this.trail.push({ x: clamp(this.pos.x), age: 0, life: 0.34 });
      if (this.trail.length > 8) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].age += dt;
      if (this.trail[i].age >= this.trail[i].life) this.trail.splice(i, 1);
    }

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const shakeX = this.shakeSpr.x * 0.45;
    const ox = 34 + shakeX, oy = 36, sw = 244, sh = 98;
    const p = clamp(this.pos.x);
    const gl = this.glitch;
    const busy = this._mode === 'busy';
    const locked = this._mode === 'locked';

    // Crisp 1-bit pixel halftone drop shadow strictly outside right & bottom
    g.save();
    g.fillStyle = 'rgba(72, 54, 108, 0.22)';
    for (let sy = oy + 8; sy < oy + sh + 8; sy += 4) {
      for (let sx = ox + 8; sx < ox + sw + 8; sx += 4) {
        if (sx >= ox + sw || sy >= oy + sh) g.fillRect(sx, sy, 2, 2);
      }
    }
    g.restore();

    // 1. Outer classic  95-era raised beige-silver dialog casing
    drawBevelBox(g, ox, oy, sw, sh, { fill: '#E6E1D8' });

    // 2. Miniature  95-era Titlebar (Steel Navy OFF -> Shimmering Vaporwave Pastel ON -> Amber/Lilac BUSY!)
    const tbX = ox + 4, tbY = oy + 4, tbW = sw - 8, tbH = 22;
    if (p < 0.99) {
      const nav = g.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
      nav.addColorStop(0, '#1B2D6E');
      nav.addColorStop(1, '#5A6FA8');
      g.fillStyle = nav;
      g.fillRect(tbX, tbY, tbW, tbH);
    }
    if (p > 0.01) {
      g.save();
      g.globalAlpha = smooth(p);
      const vap = g.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
      vap.addColorStop(0, '#9B98FA');
      vap.addColorStop(0.45, '#F5A6DA');
      vap.addColorStop(0.75, '#FFC59E');
      vap.addColorStop(1, '#68EFEA');
      g.fillStyle = vap;
      g.fillRect(tbX, tbY, tbW, tbH);
      g.restore();
    }
    g.font = "700 10px 'IBM Plex Mono', monospace";
    g.fillStyle = p > 0.5 ? '#261C38' : '#FFFFFF';
    const tbLabel = busy
      ? 'DREAM_CTRL.DLL · BUSY'
      : locked
        ? (p > 0.5 ? 'PARADISE.SYS · LOCK' : 'REALITY.SYS · LOCK')
        : (p > 0.5 ? 'PARADISE.SYS · ON' : 'REALITY.SYS · OFF');
    g.fillText(tbLabel, tbX + 7, tbY + 14.5);
    drawBevelBox(g, tbX + tbW - 18, tbY + 3, 15, 15, { fill: '#E6E1D8' });
    g.fillStyle = '#261C38';
    g.font = "700 10px 'IBM Plex Mono', monospace";
    g.fillText(locked ? '!' : '×', tbX + tbW - 13.5, tbY + 14);

    // 3. Recessed Sunken  95-era Switch Channel
    const tx = ox + 10, ty = oy + 32, tw = sw - 20, th = sh - 42;
    drawBevelBox(g, tx, ty, tw, th, { fill: '#D2CEC6', sunken: true });

    const ix = tx + 3, iy = ty + 3, iw = tw - 6, ih = th - 6;
    const thumbW = 86;
    const busyHum = busy && !GP.reducedMotion ? Math.sin(t * 28) * 1.1 : 0;
    const thumbX = lerp(ix + 2, ix + iw - thumbW - 2, p) + busyHum;

    g.save();
    g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();

    // Base OFF state: crisp PNG transparency checkerboard ("NO SIGNAL")
    drawCheckerboard(g, ix, iy, iw, ih, 7, '#C2C4D0', '#F5F6FA');
    g.font = "700 10px 'IBM Plex Mono', monospace";
    g.fillStyle = 'rgba(46, 36, 68, 0.58)';
    g.fillText(busy ? 'WAIT…' : 'NO SIGNAL', busy ? (ix + iw - 44) : (ix + iw - 74), iy + ih * 0.5 + 3.5);

    // Flooded ON side (left of thumb): REAL photographed turquoise pool caustics + holographic CD sheen!
    const floodW = clamp(thumbX - ix + 14, 0, iw);
    if (floodW > 4 && p > 0.02) {
      g.save();
      g.beginPath(); g.rect(ix, iy, floodW, ih); g.clip();
      drawRealPoolWater(g, ix, iy, iw, ih, t, { alpha: 1, scrollX: p * 36 });
      g.save();
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = 0.45;
      drawRealHoloFoil(g, ix, iy, iw, ih, t, p);
      g.restore();
      g.fillStyle = 'rgba(20, 26, 46, 0.36)';
      g.fillRect(ix + 8, iy + ih * 0.5 - 9, 68, 18);
      g.font = "700 10px 'IBM Plex Mono', monospace";
      g.fillStyle = '#8CFDF8';
      g.fillText(busy ? 'SYNC…' : 'DREAM ON', ix + 14, iy + ih * 0.5 + 3.5);
      g.restore();
    }

    // PROGRESSIVE PRE-SNAP LEAK: turquoise droplets & cyan pixel cracks bleeding across checkerboard near 50%!
    const midTension = Math.sin(clamp(p) * Math.PI);
    if (midTension > 0.25 && !busy && !GP.reducedMotion) {
      const leakAmt = (midTension - 0.25) / 0.75;
      g.save();
      for (let k = 0; k < 6; k++) {
        const lx = thumbX + thumbW + 4 + hash(k * 7.3 + Math.floor(t * 14)) * 38 * leakAmt;
        const ly = iy + 6 + (k / 5) * (ih - 12);
        g.fillStyle = k % 2 === 0 ? `rgba(48, 245, 240, ${(0.72 * leakAmt).toFixed(2)})` : `rgba(255, 108, 204, ${(0.64 * leakAmt).toFixed(2)})`;
        g.fillRect(lx, ly, 6 + hash(k * 13) * 14 * leakAmt, 2.4);
      }
      g.restore();
    }

    // BUSY MODE: classic  95-era marching progress ticks on both sides of the centered thumb!
    if (busy) {
      g.save();
      const phase = (t * 48) % 24;
      for (let sx = ix + phase - 24; sx < ix + iw; sx += 24) {
        g.fillStyle = 'rgba(54, 242, 236, 0.78)';
        g.fillRect(sx, iy + ih - 5, 11, 3.5);
        g.fillStyle = 'rgba(255, 130, 212, 0.65)';
        g.fillRect(sx + 12, iy + ih - 5, 6, 3.5);
      }
      g.restore();
    }

    // Stepped  95-era beveled cascade ghosts trailing behind the moving thumb!
    for (const tr of this.trail) {
      const a = clamp(1 - tr.age / tr.life) * 0.65;
      const gx = lerp(ix + 2, ix + iw - thumbW - 2, tr.x);
      g.save();
      g.globalAlpha = a;
      drawBevelBox(g, gx, iy + 2, thumbW, ih - 4, { fill: 'rgba(255,135,212,0.28)', hi: '#66FAF5', lo: '#FF60C4' });
      g.restore();
    }

    // 4. Chunky Authentic  95-era 3D-Beveled Ridged Thumb (with Hourglass when BUSY or Lock Pip when LOCKED!)
    drawBevelBox(g, thumbX, iy + 2, thumbW, ih - 4, { fill: locked ? '#DDD7CE' : '#ECE8DF' });
    const midX = thumbX + thumbW * 0.5;
    if (busy) {
      this.drawHourglass(g, midX + 6, iy + ih * 0.5, t);
    } else {
      for (const dx of [-8, 0, 8]) {
        g.fillStyle = '#FFFFFF';
        g.fillRect(midX + dx - 1, iy + 12, 1.5, ih - 24);
        g.fillStyle = '#9A939B';
        g.fillRect(midX + dx + 0.5, iy + 12, 1.5, ih - 24);
      }
    }
    // Micro LED status pip on thumb corner
    const ledCol = locked ? '#FF4682' : busy ? '#FFB84D' : (p > 0.5 ? '#36F5E8' : '#A49CA8');
    g.fillStyle = ledCol;
    g.beginPath(); g.arc(thumbX + 14, iy + ih * 0.5, 3.2, 0, TAU); g.fill();
    if (p > 0.5 || busy || locked) {
      g.fillStyle = locked ? 'rgba(255, 70, 130, 0.42)' : busy ? 'rgba(255, 184, 77, 0.42)' : 'rgba(54, 245, 232, 0.45)';
      g.beginPath(); g.arc(thumbX + 14, iy + ih * 0.5, 6.5, 0, TAU); g.fill();
    }
    g.restore();

    // 5. Overflow VHS pixel-sort tear spilling past the  95-era bevel on toggle!
    if (gl > 0.05 && !GP.reducedMotion) {
      const b = Math.sin(clamp(gl, 0, 1) * Math.PI);
      drawPlatePixelSort(g, PLATES.poolWater, ix, iy + 4, iw, ih - 8, b * 1.0, Math.floor(t * 28), {
        spillX: 26, bands: 7, dir: p > 0.5 ? 1 : -1,
      });
    }

    // 6. CRT-flashing miniature  95-era READ ONLY micro-badge when LOCKED!
    const lb = clamp(this.lockBadgeSpr.x, 0, 1);
    if (lb > 0.02) {
      drawMicroBadge(g, ox + sw - 46, oy - 14, 'READ ONLY', 'PROTECTED', {
        pop: lb, w: 80, h: 28, pal: ['#FF4682', '#FF94C8'], bodyColor: '#A8184B',
      });
    }
  }
}
define('paradise-toggle', VpWinToggle);
