// =========================================================================
// 1. <paradise-pool-slider> — Adaptive Glazed Pink-Tile Checkerboard Pool Slider
//    1D spring-coupled shallow-water wave simulation, sunlit spray droplets,
//    physically rolling chrome sphere + breaching chrome dolphin, quarter-step
//    detent pings, 85-100% OVERFLOW.SYS holographic surge & REALITY.SYS wireframe!
// =========================================================================
class VpPoolSlider extends Base {
  static delegates = true;
  static formAssociated = true;
  static observedAttributes = ['value', 'min', 'max', 'thumb'];
  static css = `
    :host { display: block; width: min(560px, 100%); margin: 0 auto; }
    .track {
      position: relative; width: 100%; aspect-ratio: 960 / 387;
      cursor: grab; user-select: none; touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .track:active { cursor: grabbing; }
    .track:focus-visible { outline: 2px solid #3CEBE2; outline-offset: 8px; border-radius: 999px; }
    canvas {
      position: absolute; left: -24px; top: -28px;
      width: calc(100% + 48px); height: calc(100% + 52px);
      pointer-events: none;
    }
  `;
  render() {
    return `<div class="track" role="slider" tabindex="0" aria-label="Pool Flood Slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62"><canvas aria-hidden="true"></canvas></div>`;
  }
  setup() {
    this.track = this.$('.track');
    this.cv = this.$('canvas');
    this.min = Number(this.getAttribute('min') ?? 0);
    this.max = Number(this.getAttribute('max') ?? 100);
    this.thumbMode = this.getAttribute('thumb') || 'sphere'; // 'sphere' | 'dolphin'
    const initVal = Number(this.getAttribute('value') ?? 62);
    this._norm = clamp((initVal - this.min) / (this.max - this.min || 1));
    this.pos = new Spring(this._norm, 270, 22);
    this.hover = new Spring(0, 260, 22);
    this.grab = new Spring(0, 320, 24);
    this.overflowSpr = new Spring(this._norm >= 0.85 ? 1 : 0, 210, 20);
    this.realitySpr = new Spring(bus.state.paradise ? 0 : 1, 180, 19);

    // 1D Shallow-water wave heightfield (15 spring-coupled nodes along the vertical waterline!)
    this.waveN = 15;
    this.waveX = new Float32Array(this.waveN);
    this.waveV = new Float32Array(this.waveN);
    this.slosh = new Spring(0, 88, 7.5);
    this.leapY = 0;      // Dolphin parabolic breach height (0..1)
    this.leapV = 0;
    this._breachCd = 0;
    this._lastDetent = Math.round(this._norm * 4);
    this.detentFlash = [0, 0, 0, 0, 0];

    this.velSmooth = 0;
    this.glitch = 0;
    this.ripples = [];
    this.droplets = [];
    this.dragging = false;

    const setFromClientX = (clientX, jump = false) => {
      const r = this.track.getBoundingClientRect();
      const x0 = r.left + r.width * 0.175;
      const x1 = r.left + r.width * 0.825;
      this.setNorm(clamp((clientX - x0) / Math.max(10, x1 - x0)), jump);
    };

    this.track.addEventListener('pointerenter', () => { this.hover.to = 1; start(); });
    this.track.addEventListener('pointerleave', () => { this.hover.to = 0; start(); });
    this.track.addEventListener('pointerdown', (e) => {
      this.track.focus();
      this.track.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.grab.to = 1;
      setFromClientX(e.clientX, true);
    });
    this.track.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      setFromClientX(e.clientX, false);
    });
    const endDrag = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.grab.to = 0;
      this.spawnRipple();
      SND?.poolSettle(this._norm);
      this.emit('change', { value: this.value });
    };
    this.track.addEventListener('pointerup', endDrag);
    this.track.addEventListener('pointercancel', endDrag);
    this.track.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.05;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.setNorm(clamp(this._norm + step), true); this.spawnRipple(); SND?.poolSettle(this._norm); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.setNorm(clamp(this._norm - step), true); this.spawnRipple(); SND?.poolSettle(this._norm); }
      else if (e.key === 'Home') { e.preventDefault(); this.setNorm(0, true); this.spawnRipple(); }
      else if (e.key === 'End') { e.preventDefault(); this.setNorm(1, true); this.spawnRipple(); }
    });

    this._unsubReality = bus.on('reality', ({ paradise }) => {
      this.realitySpr.to = paradise ? 0 : 1;
      this.glitch = Math.max(this.glitch, 0.52);
      start();
    });
    this.syncAttr();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubReality?.();
  }
  get value() { return Math.round(lerp(this.min, this.max, this._norm)); }
  set value(v) { this.setAttribute('value', String(v)); }
  get thumb() { return this.thumbMode; }
  set thumb(v) { this.setAttribute('thumb', v); }
  get regime() {
    return this._norm < 0.04 ? 'dry' : this._norm >= 0.85 ? 'overflow' : 'flooded';
  }
  attributeChangedCallback(name, o, n) {
    if (!this._booted || o === n) return;
    if (name === 'min') this.min = Number(n ?? 0);
    if (name === 'max') this.max = Number(n ?? 100);
    if (name === 'thumb') {
      this.thumbMode = n || 'sphere';
      this.glitch = Math.max(this.glitch, 0.55);
      if (this.thumbMode === 'dolphin') this.triggerBreach(0.75, true);
    }
    if (name === 'value') {
      this._norm = clamp((Number(n) - this.min) / (this.max - this.min || 1));
      this.pos.to = this._norm;
      this.overflowSpr.to = this._norm >= 0.85 ? 1 : 0;
      bus.emit('pool', { norm: this._norm });
    }
    this.syncAttr();
  }
  syncAttr() {
    this.track.setAttribute('aria-valuemin', String(this.min));
    this.track.setAttribute('aria-valuemax', String(this.max));
    this.track.setAttribute('aria-valuenow', String(this.value));
    if (this.internals) this.internals.setFormValue(String(this.value));
    this.dirty = true;
    start();
  }
  setNorm(n, jump = false) {
    const delta = n - this._norm;
    this._norm = n;
    this.pos.to = n;
    this.overflowSpr.to = n >= 0.85 ? 1 : 0;

    // Magnetic quarter-detent ping feedback (25%, 50%, 75%)
    const det = Math.round(n * 4);
    if (det !== this._lastDetent && det > 0 && det < 4 && Math.abs(n - det * 0.25) < 0.055) {
      this._lastDetent = det;
      this.detentFlash[det] = 1.0;
      SND?.detentPing(det);
    } else if (Math.abs(n - det * 0.25) > 0.08) {
      this._lastDetent = det;
    }

    if (jump && Math.abs(delta) > 0.04 && !GP.reducedMotion) {
      this.glitch = clamp(this.glitch + Math.abs(delta) * 1.9);
      this.slosh.v += delta * 68;
      this._kickWaves(delta * 85);
      if (Math.abs(delta) > 0.18) this._spawnDroplets(6, delta >= 0 ? 1 : -1);
    }
    this.track.setAttribute('aria-valuenow', String(this.value));
    if (this.internals) this.internals.setFormValue(String(this.value));
    bus.emit('pool', { norm: n });
    this.emit('input', { value: this.value, speed: this.velSmooth, regime: this.regime });
    this.dirty = true;
    start();
  }
  _kickWaves(impulse) {
    for (let i = 1; i < this.waveN - 1; i++) {
      const f = i / (this.waveN - 1);
      const bell = Math.sin(f * Math.PI);
      this.waveV[i] += impulse * bell * (0.7 + 0.6 * Math.sin(i * 1.9));
    }
  }
  _spawnDroplets(count = 7, dir = 1, power = 1) {
    if (GP.reducedMotion) return;
    const r = this.track.getBoundingClientRect();
    const tw = r.width || 540, th = r.height || 218;
    const tx = 24 + lerp(tw * 0.178, tw * 0.822, clamp(this.pos.x));
    const ty = 28 + th * 0.48;
    for (let i = 0; i < count; i++) {
      this.droplets.push({
        x: tx + (Math.random() - 0.5) * 18,
        y: ty + (Math.random() - 0.5) * th * 0.28,
        vx: dir * (45 + Math.random() * 115) * power + (Math.random() - 0.5) * 65,
        vy: -(95 + Math.random() * 125) * power,
        r: 1.8 + Math.random() * 2.6,
        age: 0,
        life: 0.48 + Math.random() * 0.34,
        color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#5CF8F4' : '#FFB4E4',
      });
    }
    if (this.droplets.length > 36) this.droplets.splice(0, this.droplets.length - 36);
  }
  triggerBreach(power = 1, silent = false) {
    if (GP.reducedMotion || this._breachCd > 0) return;
    this.leapV = Math.max(this.leapV, 5.4 * power);
    this._breachCd = 0.52;
    this._spawnDroplets(9, this.velSmooth >= 0 ? 1 : -1, 1.15);
    this.spawnRipple(1.15);
    if (!silent) SND?.dolphinSplash();
  }
  spawnRipple(scale = 1) {
    const r = this.track.getBoundingClientRect();
    const tw = r.width || 540, th = r.height || 218;
    const tx = 24 + lerp(tw * 0.175, tw * 0.825, this.pos.x);
    const ty = 28 + th * 0.52;
    this.ripples.push({ x: tx, y: ty, age: 0, life: 0.95, maxR: th * 0.46 * scale });
    this.dirty = true;
    start();
  }
  // Public reactive API: external splash / sympathetic surge!
  splash(normX = null, power = 1) {
    const r = this.track.getBoundingClientRect();
    const tw = r.width || 540, th = r.height || 218;
    const nx = normX === null ? this.pos.x : clamp(normX);
    const tx = 24 + lerp(tw * 0.175, tw * 0.825, nx);
    const ty = 28 + th * 0.52;
    this.ripples.push({ x: tx, y: ty, age: 0, life: 1.05, maxR: th * 0.54 * power });
    this.slosh.v += 34 * power;
    this._kickWaves(58 * power);
    this._spawnDroplets(8, 1, power);
    if (this.thumbMode === 'dolphin') this.triggerBreach(0.95 * power, true);
    SND?.dolphinSplash();
    this.dirty = true;
    start();
  }
  surge(amount = 0.8) {
    this.slosh.v += 42 * amount;
    this._kickWaves(64 * amount);
    this.glitch = Math.max(this.glitch, 0.55 * amount);
    this.spawnRipple(1.25);
    this._spawnDroplets(7, 1, 0.95);
    if (this.thumbMode === 'dolphin') this.triggerBreach(0.85 * amount, true);
    this.dirty = true;
    start();
  }
  frame(dt, t) {
    const prev = this.pos.x;
    this.pos.step(dt);
    this.hover.step(dt);
    this.grab.step(dt);
    this.overflowSpr.step(dt);
    this.realitySpr.step(dt);
    this.slosh.step(dt);
    if (this._breachCd > 0) this._breachCd = Math.max(0, this._breachCd - dt);

    const rawVel = dt > 0 ? (this.pos.x - prev) / dt : 0;
    this.velSmooth = lerp(this.velSmooth, clamp(rawVel * 0.65, -1.7, 1.7), clamp(dt * 14));
    const speed = Math.abs(this.velSmooth);

    // Feed real drag motion into 1D shallow-water spring wave field + dolphin breach trigger!
    if (speed > 0.12 && !GP.reducedMotion) {
      this.slosh.v += this.velSmooth * dt * 110;
      this._kickWaves(this.velSmooth * dt * 190);
      if (speed > 0.62 && Math.random() < dt * 18) {
        this._spawnDroplets(2, this.velSmooth >= 0 ? 1 : -1, 0.85);
      }
      if (this.thumbMode === 'dolphin' && speed > 0.58) {
        this.triggerBreach(clamp(speed * 0.95, 0.7, 1.25));
      }
    }

    // Step 1D spring-coupled shallow-water wave equation (wave speed + neighbor coupling + damping)
    if (!GP.reducedMotion && dt > 0) {
      const sub = Math.max(1, Math.ceil(dt / 0.01));
      const h = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (let i = 1; i < this.waveN - 1; i++) {
          const neigh = (this.waveX[i - 1] + this.waveX[i + 1]) * 0.5 - this.waveX[i];
          const acc = -135 * this.waveX[i] + 340 * neigh - 4.4 * this.waveV[i];
          this.waveV[i] += acc * h;
        }
        for (let i = 1; i < this.waveN - 1; i++) {
          this.waveX[i] = clamp(this.waveX[i] + this.waveV[i] * h, -24, 24);
        }
      }
    }

    // Step dolphin parabolic breach physics
    if (this.leapY > 0 || this.leapV > 0) {
      this.leapV -= 17.5 * dt;
      this.leapY += this.leapV * dt;
      if (this.leapY <= 0) {
        this.leapY = 0;
        if (Math.abs(this.leapV) > 1.4) {
          this.spawnRipple(0.9);
          this._spawnDroplets(5, 0, 0.7);
        }
        this.leapV = 0;
      }
    }

    if (speed > 0.14 && !GP.reducedMotion) {
      this.glitch = clamp(Math.max(this.glitch, speed * 0.95));
    } else {
      this.glitch = Math.max(0, this.glitch - dt * 2.1);
    }
    for (let i = 0; i < 5; i++) {
      if (this.detentFlash[i] > 0) this.detentFlash[i] = Math.max(0, this.detentFlash[i] - dt * 2.2);
    }

    if (this.dragging) SND?.scrub(clamp(speed * 0.85));
    else if (this._wasDragging) SND?.scrub(0);
    this._wasDragging = this.dragging;
    if (speed > 0.12) this.emit('scrub', { value: this.value, speed: this.velSmooth, regime: this.regime });

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += dt;
      if (this.ripples[i].age >= this.ripples[i].life) this.ripples.splice(i, 1);
    }
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.age += dt;
      d.vy += 520 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.age >= d.life) this.droplets.splice(i, 1);
    }

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const ox = 24, oy = 28;
    const tw = W - 48, th = H - 52;
    const reality = clamp(this.realitySpr.x, 0, 1);
    const ovf = clamp(this.overflowSpr.x, 0, 1);

    // 1. Real macro-photographed glazed pink-tile pool trough + grounded studio shadow!
    if (ready(PLATES.poolTrough)) {
      drawContactShadow(g, () => {
        g.save();
        if (reality > 0.05) g.filter = `saturate(${(1 - reality * 0.72).toFixed(2)})`;
        g.drawImage(PLATES.poolTrough, ox, oy, tw, th);
        g.restore();
      }, 4, 14, 24, 0.24);
    }

    // 2. Exact inner pool basin bounds measured from pool-trough.webp (960x387)
    const bx = ox + tw * 0.112;
    const by = oy + th * 0.214;
    const bw = tw * 0.776;
    const bh = th * 0.606;
    const brad = bh * 0.49;

    const thumbX = lerp(ox + tw * 0.178, ox + tw * 0.822, clamp(this.pos.x));
    const thumbY = oy + th * 0.51;
    const gl = this.glitch;

    // Helper to trace the live 1D shallow-water spline right along thumbX!
    const waveW = clamp(thumbX - bx + 10 + this.slosh.x * 0.8, 0, bw);
    const traceWaterline = (pathOnly = false) => {
      const pts = [];
      for (let i = 0; i < this.waveN; i++) {
        const f = i / (this.waveN - 1);
        const amb = Math.sin(t * 4.6 + f * TAU * 1.1) * 3.2;
        const x = clamp(bx + waveW + this.waveX[i] + amb + this.velSmooth * 9 * Math.sin(f * Math.PI), bx, bx + bw);
        const y = by + f * bh;
        pts.push([x, y]);
      }
      g.beginPath();
      if (!pathOnly) {
        g.moveTo(bx, by);
        g.lineTo(pts[0][0], pts[0][1]);
      } else {
        g.moveTo(pts[0][0], pts[0][1]);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) * 0.5;
        const my = (pts[i][1] + pts[i + 1][1]) * 0.5;
        g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      g.lineTo(last[0], last[1]);
      if (!pathOnly) {
        g.lineTo(bx, by + bh);
        g.closePath();
      }
    };

    // 3. FLOODED LEFT HALF: Real turquoise water caustics (or raw PNG checkerboard in REALITY.SYS!)
    if (thumbX > bx + 4) {
      g.save();
      roundRectPath(g, bx, by, bw, bh, brad);
      g.clip();
      traceWaterline(false);
      g.clip();

      if (reality < 0.98) {
        drawRealPoolWater(g, bx, by, bw, bh, t, {
          alpha: 0.78 * (1 - reality * 0.85),
          scrollX: this.pos.x * 48 + this.slosh.x * 1.4,
          ripples: this.ripples,
          refractBoost: 1.15 + gl * 0.35 + ovf * 0.35,
        });
      }
      // 85-100% OVERFLOW SURGE: iridescent holographic foil blooms across the turquoise water!
      if (ovf > 0.02 && reality < 0.8) {
        g.save();
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = ovf * 0.44 * (1 - reality);
        drawRealHoloFoil(g, bx, by, bw, bh, t * 1.35, this.pos.x);
        g.restore();
      }
      // REALITY.SYS mode: drains water into crisp PNG alpha checkerboard + cyan blueprint grid!
      if (reality > 0.02) {
        g.save();
        g.globalAlpha = reality * 0.92;
        drawCheckerboard(g, bx, by, bw, bh, 8, '#B6BCCB', '#EFF2FA');
        g.strokeStyle = 'rgba(28, 72, 168, 0.36)';
        g.lineWidth = 1;
        for (let gy = by + 16; gy < by + bh; gy += 16) {
          g.beginPath(); g.moveTo(bx, gy); g.lineTo(bx + bw, gy); g.stroke();
        }
        g.restore();
      }

      // Cool depth shadow under upper glazed ceramic wall
      const wallShadow = g.createLinearGradient(bx, by, bx, by + bh * 0.25);
      wallShadow.addColorStop(0, 'rgba(18, 62, 78, 0.36)');
      wallShadow.addColorStop(1, 'rgba(18, 62, 78, 0)');
      g.fillStyle = wallShadow;
      g.fillRect(bx, by, bw, bh * 0.25);

      // Real-pixel VHS pixel-sort wake strips on fast drags!
      if (gl > 0.05) {
        const wakeW = clamp(bw * (0.25 + gl * 0.52), 45, waveW);
        drawPlatePixelSort(g, PLATES.poolWater, Math.max(bx, thumbX - wakeW), by + 6, wakeW, bh - 12, gl * 0.95, Math.floor(t * 28), {
          spillX: 20, bands: 11, dir: this.velSmooth >= 0 ? 1 : -1,
        });
      }
      g.restore();

      // Sparkling curved foam meniscus crest hugging the live 1D shallow-water wave spline!
      g.save();
      roundRectPath(g, bx, by, bw, bh, brad);
      g.clip();
      g.strokeStyle = reality > 0.5
        ? `rgba(42, 92, 210, ${(0.75 + gl * 0.2).toFixed(2)})`
        : `rgba(255,255,255,${(0.72 + gl * 0.26).toFixed(2)})`;
      g.lineWidth = 2.6 + ovf * 1.1;
      g.shadowColor = reality > 0.5 ? '#5E88F5' : '#66FAF5';
      g.shadowBlur = 9;
      traceWaterline(true);
      g.stroke();
      g.restore();
    }

    // 3b. OVERFLOW SURGE: luminous turquoise shimmer spilling softly over the pink tile lip!
    if (ovf > 0.04 && reality < 0.7) {
      g.save();
      g.globalAlpha = ovf * 0.52 * (1 - reality);
      const rimG = g.createRadialGradient(thumbX + 18, thumbY, 12, thumbX + 18, thumbY, bh * 0.85);
      rimG.addColorStop(0, 'rgba(92, 250, 246, 0.62)');
      rimG.addColorStop(0.55, 'rgba(255, 148, 218, 0.24)');
      rimG.addColorStop(1, 'rgba(92, 250, 246, 0)');
      g.fillStyle = rimG;
      g.beginPath();
      g.ellipse(thumbX + 14, thumbY, bh * 0.72, bh * 0.62, 0, 0, TAU);
      g.fill();
      g.restore();
    }

    // 4. Calibrated quarter-detent pips beneath the pool capsule (with live ping pulse rings!)
    const pipY = oy + th + 10;
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      const px = lerp(ox + tw * 0.178, ox + tw * 0.822, f);
      const lit = this.pos.x >= f - 0.02;
      g.fillStyle = lit ? (reality > 0.5 ? '#2A4AA8' : '#29C9D6') : 'rgba(130,108,148,0.28)';
      g.beginPath();
      g.arc(px, pipY, i % 2 === 0 ? 2.7 : 2.0, 0, TAU);
      g.fill();
      if (this.detentFlash[i] > 0.02) {
        const df = this.detentFlash[i];
        g.save();
        g.strokeStyle = `rgba(60, 248, 242, ${(df * 0.9).toFixed(3)})`;
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(px, pipY, 3 + (1 - df) * 9, 0, TAU);
        g.stroke();
        g.restore();
      }
    }

    // 5. THUMB: Physically Rolling Chrome Sphere OR Parabolic Breaching Chrome Dolphin!
    const lift = this.hover.x * 2.5 + this.grab.x * 4;
    const scale = 1 + this.hover.x * 0.03 + this.grab.x * 0.045;

    if (this.thumbMode === 'dolphin' && ready(PLATES.dolphin)) {
      const barH = bh * 0.94;
      g.save();
      const barG = g.createLinearGradient(thumbX - 4, thumbY - barH * 0.5, thumbX + 4, thumbY - barH * 0.5);
      barG.addColorStop(0, 'rgba(255,255,255,0.25)');
      barG.addColorStop(0.5, 'rgba(255,255,255,0.92)');
      barG.addColorStop(1, 'rgba(180,235,245,0.35)');
      g.fillStyle = barG;
      roundRectPath(g, thumbX - 3, thumbY - barH * 0.5, 6, barH, 3);
      g.fill();
      g.restore();

      const breachPx = this.leapY * 34;
      const leapScale = 1 + this.leapY * 0.11;
      const dw = bh * 1.18 * scale * leapScale;
      const dh = dw * (PLATES.dolphin.naturalHeight / PLATES.dolphin.naturalWidth);
      const breachPitch = clamp(-this.leapV * 0.072, -0.34, 0.34);
      const tilt = clamp(this.velSmooth * 0.08 + breachPitch, -0.38, 0.38);
      const bob = Math.sin(t * 2.5) * 1.6 - lift * 0.5 - breachPx;

      // Grounded shadow shrinks & softens as dolphin breaches into mid-air!
      g.save();
      const shF = clamp(1 - this.leapY * 0.42, 0.45, 1);
      g.fillStyle = `rgba(16, 62, 80, ${(0.28 * shF).toFixed(3)})`;
      g.beginPath();
      g.ellipse(thumbX + 4, thumbY + dh * 0.34 + lift * 0.4, dw * 0.36 * shF, dh * 0.16 * shF, 0, 0, TAU);
      g.fill();
      g.restore();

      g.save();
      g.translate(thumbX, thumbY + bob);
      g.rotate(tilt);
      if (gl > 0.18) {
        const off = clamp(gl * 14, 3, 15);
        const dir = this.velSmooth >= 0 ? 1 : -1;
        drawTintedPlate(g, PLATES.dolphin, -dw * 0.5 - dir * off * 1.2, -dh * 0.5 - 1.5, dw, dh, '#FF4AC4', gl * 0.72);
        drawTintedPlate(g, PLATES.dolphin, -dw * 0.5 - dir * off * 0.5, -dh * 0.5 + 1.5, dw, dh, '#22F8F0', gl * 0.76);
      }
      g.drawImage(PLATES.dolphin, -dw * 0.5, -dh * 0.5, dw, dh);
      g.restore();
    } else if (ready(PLATES.chromeSphere)) {
      const d = bh * 0.86 * scale;
      const r = d * 0.5;
      const yPos = thumbY - lift * 0.6;
      // Grounded spherical shadow on checkerboard/water
      g.save();
      g.fillStyle = `rgba(22, 24, 42, ${(0.32 - this.grab.x * 0.08).toFixed(3)})`;
      g.beginPath();
      g.ellipse(thumbX + 4 + lift * 0.4, thumbY + d * 0.24 + lift * 0.5, d * 0.44, d * 0.32, 0, 0, TAU);
      g.fill();
      g.restore();

      // Peak velocity RGB chromatic ghost spheres!
      if (gl > 0.16) {
        const off = clamp(gl * 13, 3, 14);
        const dir = this.velSmooth >= 0 ? 1 : -1;
        drawTintedPlate(g, PLATES.chromeSphere, thumbX - r - dir * off * 1.1, yPos - r - 1, d, d, '#FF4AC4', gl * 0.68);
        drawTintedPlate(g, PLATES.chromeSphere, thumbX - r - dir * off * 0.45, yPos - r + 1.5, d, d, '#24F8F0', gl * 0.72);
      }

      // Physically rolling chrome reflection tied directly to drag distance (pos.x)!
      g.save();
      g.beginPath(); g.arc(thumbX, yPos, r * 0.97, 0, TAU); g.clip();
      g.save();
      g.translate(thumbX, yPos);
      // Gentle physical roll angle so reflected sky & checkerboard turn subtly with travel
      g.rotate((this.pos.x - 0.62) * 1.15);
      g.drawImage(PLATES.chromeSphere, -r, -r, d, d);
      g.restore();

      // Dynamic upward turquoise water caustic glow reflected onto bottom of chrome ball!
      if (this.pos.x > 0.04 && reality < 0.85) {
        const refl = clamp(this.pos.x * 1.3) * (1 - reality);
        const cg = g.createRadialGradient(thumbX - r * 0.25, yPos + r * 0.55, 2, thumbX, yPos + r * 0.55, r * 0.95);
        cg.addColorStop(0, `rgba(74, 250, 244, ${(0.44 * refl).toFixed(3)})`);
        cg.addColorStop(0.6, `rgba(255, 140, 214, ${(0.16 * refl).toFixed(3)})`);
        cg.addColorStop(1, 'rgba(74, 250, 244, 0)');
        g.fillStyle = cg;
        g.fillRect(thumbX - r, yPos - r, d, d);
      }
      // Crisp fixed studio overhead skylight glint so lighting stays anchored to the room while sphere rolls!
      const sg = g.createRadialGradient(thumbX - r * 0.34, yPos - r * 0.36, 1, thumbX - r * 0.34, yPos - r * 0.36, r * 0.34);
      sg.addColorStop(0, 'rgba(255,255,255,0.68)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(thumbX - r, yPos - r, d, d);
      g.restore();
    }

    // 6. Sunlit water spray droplets arcing past the pink ceramic rim!
    if (this.droplets.length) {
      g.save();
      for (const dr of this.droplets) {
        const a = smooth(clamp(1 - dr.age / dr.life));
        g.globalAlpha = a * 0.92;
        g.fillStyle = dr.color;
        g.shadowColor = '#5CF8F4';
        g.shadowBlur = 5;
        g.beginPath(); g.arc(dr.x, dr.y, dr.r * (0.55 + a * 0.45), 0, TAU); g.fill();
      }
      g.restore();
    }

    // 7. CRT-flashing miniature  95-era OVERFLOW.SYS badge at 85-100% surge!
    if (ovf > 0.02) {
      drawMicroBadge(g, ox + tw - 52, oy + 14, 'OVERFLOW.SYS', `SURGE · ${this.value}%`, {
        pop: ovf, w: 86, h: 30, pal: ['#3EF4EE', '#FF82CE'],
      });
    }
  }
}
define('paradise-pool-slider', VpPoolSlider);
