// =========================================================================
// 4. <paradise-crt-tabs> — Triple Suspended 3D Floating & Rotating 1994 Mini-CRT Tabs
//    Real macro-photographed beige CRT bezels extruded into true 3D louvered
//    monitors hanging on dynamic suspension cables at staggered heights!
// =========================================================================
const CRT_CHANNELS = ['01 · POOL', '02 · SUNSET', '03 · AQUARIUM'];
const CRT_STAGGER = [
  { x: 86,  baseY: 108, yawBase:  15, yawAmp: 10, phase: 0.0, bobAmp: 5.5, freq: 0.62 },
  { x: 250, baseY: 124, yawBase:   0, yawAmp: 11, phase: 2.1, bobAmp: 6.2, freq: 0.56 },
  { x: 414, baseY: 110, yawBase: -15, yawAmp: 10, phase: 4.2, bobAmp: 5.5, freq: 0.66 },
];
class VpCrtTabs extends Base {
  static delegates = true;
  static observedAttributes = ['value'];
  static css = `
    :host { display: block; width: 500px; max-width: 100%; }
    .stage {
      position: relative; width: 500px; height: 266px;
      perspective: 860px; perspective-origin: 50% 48%;
      user-select: none; -webkit-tap-highlight-color: transparent;
    }
    canvas.wires {
      position: absolute; inset: 0; width: 500px; height: 266px; pointer-events: none;
    }
    .rig {
      all: unset; position: absolute; left: 0; top: 0;
      width: 140px; height: 128px; margin-left: -70px; margin-top: -64px;
      cursor: pointer; transform-style: preserve-3d;
      outline: none;
    }
    .rig:focus-visible .face-front { box-shadow: 0 0 0 2.5px #3CEBE2; border-radius: 6px; }
    .cube {
      position: relative; width: 140px; height: 128px;
      transform-style: preserve-3d;
      will-change: transform;
    }
    .face {
      position: absolute; backface-visibility: hidden; pointer-events: none;
    }
    .face-front {
      width: 140px; height: 128px;
      transform: translateZ(33.5px);
    }
    .face-front canvas.scr {
      position: absolute; left: 13px; top: 15px; width: 114px; height: 89px;
      border-radius: 6px; display: block;
    }
    .face-front img.bezel {
      position: absolute; inset: 0; width: 100%; height: 100%;
      display: block; object-fit: fill; pointer-events: none;
    }
    .face-front i.led {
      position: absolute; left: 74.7%; top: 89.2%;
      width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px;
      border-radius: 50%; background: #48F8A8;
      box-shadow: 0 0 8px 1.5px rgba(60, 248, 184, 0.85);
      opacity: 0; transition: opacity 0.14s ease;
    }
    .rig[aria-selected="true"] i.led { opacity: 1; }

    /* Watertight 3D extruded 1994 matte beige ABS shell matching crt-bezel main body (x:2..138, y:2..122, z:-33.5..+33.5) */
    .face-left, .face-right {
      width: 67px; height: 120px; left: 36.5px; top: 2px;
      border-right: 1px solid rgba(90, 78, 62, 0.22);
    }
    .face-left {
      transform: rotateY(-90deg) translateZ(67.5px);
      background:
        repeating-linear-gradient(
          180deg,
          transparent 0 18px,
          rgba(74, 62, 48, 0.42) 18px 21px,
          rgba(255, 250, 240, 0.35) 21px 22.5px,
          transparent 22.5px 26px
        ),
        linear-gradient(90deg, #B9AA90 0%, #CFC2AA 45%, #DED3BC 100%);
      background-size: 40px 66px, 100% 100%;
      background-position: 14px 20px, 0 0;
      background-repeat: no-repeat, no-repeat;
    }
    .face-right {
      transform: rotateY(90deg) translateZ(67.5px);
      background:
        repeating-linear-gradient(
          180deg,
          transparent 0 18px,
          rgba(74, 62, 48, 0.38) 18px 21px,
          rgba(255, 250, 240, 0.42) 21px 22.5px,
          transparent 22.5px 26px
        ),
        linear-gradient(90deg, #E2D7C0 0%, #D2C4AA 55%, #B8A88E 100%);
      background-size: 40px 66px, 100% 100%;
      background-position: 14px 20px, 0 0;
      background-repeat: no-repeat, no-repeat;
    }
    .face-top {
      width: 135px; height: 67px; left: 2.5px; top: 28.5px;
      transform: rotateX(90deg) translateZ(59.5px);
      background: linear-gradient(180deg, #DDD1BA 0%, #EFE6D6 65%, #F6EFE2 100%);
    }
    .face-bottom {
      width: 135px; height: 67px; left: 2.5px; top: 28.5px;
      transform: rotateX(-90deg) translateZ(59.5px);
      background: linear-gradient(180deg, #B5A68C 0%, #9A8C72 100%);
    }
    .face-back {
      width: 135px; height: 120px; left: 2.5px; top: 2px;
      transform: rotateY(180deg) translateZ(33.5px);
      background: #B4A58C;
    }

    /* Crisp channel caption strip anchored beneath each floating monitor */
    .labels {
      position: absolute; left: 0; right: 0; bottom: 8px;
      display: grid; grid-template-columns: repeat(3, 1fr);
      pointer-events: none;
    }
    .ch-lbl {
      text-align: center;
      font: 600 10px/1 'IBM Plex Mono', ui-monospace, monospace;
      letter-spacing: .1em; text-transform: uppercase;
      color: var(--gp-muted, #685B7C);
      transition: color 0.16s ease;
    }
    .ch-lbl.active { color: var(--gp-ink, #271E38); font-weight: 700; }
  `;
  render() {
    const bezelSrc = PLATES.crtBezel?.src || 'plates/crt-bezel.webp';
    return `
      <div class="stage" role="tablist" aria-label="Suspended 3D Mini-CRT Channel Selector">
        <canvas class="wires" aria-hidden="true"></canvas>
        ${CRT_CHANNELS.map((c, i) => `
          <button class="rig" role="tab" data-ch="${i}" aria-selected="${i === 1 ? 'true' : 'false'}" aria-label="${c}">
            <div class="cube">
              <div class="face face-back"></div>
              <div class="face face-bottom"></div>
              <div class="face face-top"></div>
              <div class="face face-left"></div>
              <div class="face face-right"></div>
              <div class="face face-front">
                <canvas class="scr" aria-hidden="true"></canvas>
                <img class="bezel" src="${bezelSrc}" alt="" draggable="false" />
                <i class="led" aria-hidden="true"></i>
              </div>
            </div>
          </button>
        `).join('')}
        <div class="labels">
          ${CRT_CHANNELS.map((c, i) => `<span class="ch-lbl${i === 1 ? ' active' : ''}">${c}</span>`).join('')}
        </div>
      </div>
    `;
  }
  setup() {
    this.wireCv = this.$('canvas.wires');
    this.rigs = this.$$('.rig');
    this.cubes = this.$$('.cube');
    this.scrCvs = this.$$('canvas.scr');
    this.lbls = this.$$('.ch-lbl');
    this._idx = clamp(Number(this.getAttribute('value') ?? 1) | 0, 0, 2);
    this.focusSpr = [0, 1, 2].map((i) => new Spring(i === this._idx ? 1 : 0, 170, 17));
    this.kickSpr = [0, 1, 2].map(() => new Spring(0, 150, 11)); // zero-G recoil on click/hover/degauss!
    this.hoverIdx = -1;
    this.hoverPt = { x: 0, y: 0 }; // normalized -1..+1 cursor inside hovered screen
    this.prevIdx = -1;
    this.switchAge = 1;
    this.collapseAge = [1, 1, 1]; // per-tube CRT phosphor horizontal-line -> pinhole collapse!
    this.degaussAge = 1;          // 0..1 magnetic coil screen warp & rainbow convergence wave!
    this.snowAlert = 0;           // sympathetic SMPTE snow burst when agent hits error!
    this.realitySpr = new Spring(bus.state.paradise ? 0 : 1, 180, 19);
    this.poolRipples = [];
    this.fish = [
      { x: 0.56, y: 0.36, vx: 0.08, vy: 0, flip: 1 },
      { x: 0.36, y: 0.66, vx: -0.06, vy: 0, flip: -1 },
    ];
    this.bubbles = [];

    this.rigs.forEach((btn, idx) => {
      btn.addEventListener('pointerenter', () => {
        this.hoverIdx = idx;
        if (!GP.reducedMotion) this.kickSpr[idx].v += 4.5;
        start();
      });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const nx = clamp(((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2, -1, 1);
        const ny = clamp(((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2, -1, 1);
        this.hoverPt.x = nx;
        this.hoverPt.y = ny;
        if (idx === 0 && this._idx === 0 && Math.random() < 0.16) {
          this.poolRipples.push({ x: (nx * 0.5 + 0.5) * 114, y: (ny * 0.5 + 0.5) * 89, age: 0, life: 0.85, maxR: 32 });
          if (this.poolRipples.length > 6) this.poolRipples.shift();
        }
        start();
      });
      btn.addEventListener('pointerleave', () => {
        if (this.hoverIdx === idx) { this.hoverIdx = -1; this.hoverPt.x = 0; this.hoverPt.y = 0; }
      });
      btn.addEventListener('click', () => this.select(idx));
      btn.addEventListener('dblclick', (e) => { e.preventDefault(); this.degauss(); });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); const n = (this._idx + 1) % 3; this.select(n); this.rigs[n].focus(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); const n = (this._idx + 2) % 3; this.select(n); this.rigs[n].focus(); }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); this.degauss(); }
      });
    });

    this._unsubReality = bus.on('reality', ({ paradise }) => {
      this.realitySpr.to = paradise ? 0 : 1;
      this.switchAge = Math.min(this.switchAge, 0.45);
      start();
    });
    this._unsubAgent = bus.on('agent', ({ state }) => {
      if (state === 'error') this.glitchSnow(0.75);
    });
    this.syncAttr(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubReality?.();
    this._unsubAgent?.();
  }
  get value() { return this._idx; }
  set value(v) { this.setAttribute('value', String(clamp(Number(v) | 0, 0, 2))); }
  attributeChangedCallback() { if (this._booted) this.syncAttr(false); }
  syncAttr(init) {
    const next = clamp(Number(this.getAttribute('value') ?? 1) | 0, 0, 2);
    if (!init && next !== this._idx) {
      this.prevIdx = this._idx;
      this.collapseAge[this._idx] = GP.reducedMotion ? 1 : 0;
      this.switchAge = GP.reducedMotion ? 1 : 0;
    }
    this._idx = next;
    this.rigs.forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === this._idx));
      b.tabIndex = i === this._idx ? 0 : -1;
      this.lbls[i]?.classList.toggle('active', i === this._idx);
      if (init) this.focusSpr[i].snap(i === this._idx ? 1 : 0);
      else this.focusSpr[i].to = i === this._idx ? 1 : 0;
    });
    bus.emit('crt', { channel: this._idx });
    this.dirty = true; start();
  }
  select(idx) {
    if (!GP.reducedMotion) this.kickSpr[idx].v -= 9.5;
    if (idx === 2) {
      // Clicking Aquarium scatters the goldfish with rising bubbles!
      for (let b = 0; b < 8; b++) {
        this.bubbles.push({ x: 18 + Math.random() * 78, y: 78 + Math.random() * 14, vy: -(28 + Math.random() * 32), r: 1.2 + Math.random() * 1.4, age: 0, life: 1.2 });
      }
    }
    if (idx === this._idx) {
      if (!GP.reducedMotion) this.switchAge = 0.22;
      SND?.crtSwitch(idx);
      start();
      return;
    }
    const oldIdx = this._idx;
    this.prevIdx = oldIdx;
    this.collapseAge[oldIdx] = GP.reducedMotion ? 1 : 0;
    this._idx = idx;
    this.setAttribute('value', String(idx));
    this.switchAge = GP.reducedMotion ? 1 : 0;
    SND?.crtOff();
    SND?.crtSwitch(idx);
    this.emit('change', { channel: idx });
    start();
  }
  degauss(silent = false) {
    if (GP.reducedMotion) return;
    this.degaussAge = 0;
    for (let i = 0; i < 3; i++) this.kickSpr[i].v += (i === 1 ? -11 : 8) * (i % 2 === 0 ? 1 : -1);
    if (!silent) SND?.degauss();
    this.emit('degauss', { channel: this._idx });
    this.dirty = true; start();
  }
  glitchSnow(amount = 0.7) {
    if (GP.reducedMotion) return;
    this.snowAlert = Math.max(this.snowAlert, clamp(amount, 0.2, 1));
    this.kickSpr[this._idx].v += 4.5;
    this.dirty = true; start();
  }
  drawChannel(g, ch, sx, sy, sw, sh, t, dt = 0.016) {
    const reality = clamp(this.realitySpr.x, 0, 1);
    if (ch === 0) {
      // CH 01 · POOL: live flood level mirrored from POOL_FLOOD.EXE + hover ripples!
      const lvl = clamp(bus.state.poolLevel ?? 0.62, 0, 1);
      const waterW = sw * lerp(0.14, 1.0, lvl);
      drawCheckerboard(g, sx, sy, sw, sh, 7, '#B4BAC8', '#F2F4FA');
      if (waterW > 2) {
        g.save();
        g.beginPath(); g.rect(sx, sy, waterW, sh); g.clip();
        drawRealPoolWater(g, sx, sy, sw, sh, t, { alpha: 0.9, ripples: this.poolRipples, refractBoost: 1.2 });
        g.restore();
        g.fillStyle = 'rgba(255,255,255,0.78)';
        g.fillRect(sx + waterW - 1.5, sy, 2, sh);
      }
    } else if (ch === 1) {
      // CH 02 · SUNSET: cursor-tilted horizon + retro green/aqua VHS OSD!
      if (ready(PLATES.sunsetScreen)) {
        const im = PLATES.sunsetScreen;
        const s = Math.max(sw / im.naturalWidth, sh / im.naturalHeight) * 1.1;
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        const ox = this.hoverIdx === 1 ? -this.hoverPt.x * 5 : 0;
        const oy = this.hoverIdx === 1 ? -this.hoverPt.y * 4 : 0;
        g.drawImage(im, sx - (dw - sw) * 0.5 + ox, sy - (dh - sh) * 0.45 + Math.sin(t * 1.4) * 2.5 + oy, dw, dh);
      } else {
        g.fillStyle = '#3B2058'; g.fillRect(sx, sy, sw, sh);
      }
      // Subtle 1995 VCR OSD bottom-left
      g.font = "700 7px 'IBM Plex Mono', monospace";
      g.fillStyle = 'rgba(130, 255, 224, 0.78)';
      g.fillText('PLAY ▸ SP', sx + 7, sy + sh - 7);
      const sec = String(Math.floor(t) % 60).padStart(2, '0');
      g.fillText(`00:19:${sec}`, sx + sw - 42, sy + sh - 7);
    } else {
      // CH 03 · AQUARIUM: cursor-tracking iridescent goldfish + interactive bubbles!
      const aq = g.createLinearGradient(sx, sy, sx, sy + sh);
      aq.addColorStop(0, '#5BF0F6'); aq.addColorStop(0.55, '#19A8C6'); aq.addColorStop(1, '#0E6B8D');
      g.fillStyle = aq; g.fillRect(sx, sy, sw, sh);
      drawRealPoolWater(g, sx, sy, sw, sh, t * 0.75, { alpha: 0.42, refractBoost: 0.9 });

      // Ambient + burst bubbles
      g.fillStyle = 'rgba(255,255,255,0.72)';
      for (let b = 0; b < 7; b++) {
        const bx = sx + 12 + hash(b * 9.3) * (sw - 24) + Math.sin(t * 2.2 + b) * 3;
        const by = sy + sh - ((t * (16 + b * 3) + b * 17) % (sh + 10));
        g.beginPath(); g.arc(bx, by, 1.1 + (b % 2) * 0.7, 0, TAU); g.fill();
      }
      for (const b of this.bubbles) {
        g.beginPath(); g.arc(sx + b.x, sy + b.y, b.r, 0, TAU); g.fill();
      }

      // Goldfish steer organically toward hovered cursor inside CH 03 glass!
      const hoveringAq = this.hoverIdx === 2 && this._idx === 2;
      const tx0 = hoveringAq ? clamp(this.hoverPt.x * 0.5 + 0.5, 0.16, 0.84) : (0.54 + Math.sin(t * 0.85) * 0.22);
      const ty0 = hoveringAq ? clamp(this.hoverPt.y * 0.5 + 0.5, 0.18, 0.80) : (0.36 + Math.cos(t * 1.35) * 0.08);
      const tx1 = hoveringAq ? clamp(1 - tx0 * 0.65, 0.18, 0.84) : (0.38 + Math.cos(t * 0.72 + 1.2) * 0.20);
      const ty1 = hoveringAq ? clamp(ty0 + 0.22, 0.24, 0.82) : (0.66 + Math.sin(t * 1.2 + 2) * 0.08);
      const targets = [[tx0, ty0], [tx1, ty1]];

      for (let fi = 0; fi < 2; fi++) {
        const f = this.fish[fi];
        const [tx, ty] = targets[fi];
        const dx = tx - f.x, dy = ty - f.y;
        f.x += dx * clamp(dt * (hoveringAq ? 3.8 : 2.2), 0, 0.35);
        f.y += dy * clamp(dt * (hoveringAq ? 3.8 : 2.2), 0, 0.35);
        if (Math.abs(dx) > 0.015) f.flip = dx >= 0 ? 1 : -1;
        if (ready(PLATES.goldfish)) {
          const fw = fi === 0 ? 40 : 32, fh = fi === 0 ? 28 : 23;
          g.save();
          g.translate(sx + f.x * sw, sy + f.y * sh);
          g.scale(f.flip, 1);
          g.drawImage(PLATES.goldfish, -fw * 0.5, -fh * 0.5, fw, fh);
          g.restore();
        }
      }
    }

    // REALITY.SYS overlay: authentic 1995 broadcast test grid & monochrome signal readout!
    if (reality > 0.04) {
      g.save();
      g.globalAlpha = reality * 0.78;
      drawCheckerboard(g, sx, sy, sw, sh, 8, '#1B2740', '#273A5C');
      g.strokeStyle = 'rgba(110, 230, 255, 0.65)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(sx + sw * 0.5, sy + sh * 0.5, Math.min(sw, sh) * 0.34, 0, TAU);
      g.moveTo(sx + sw * 0.5, sy + 6); g.lineTo(sx + sw * 0.5, sy + sh - 6);
      g.moveTo(sx + 6, sy + sh * 0.5); g.lineTo(sx + sw - 6, sy + sh * 0.5);
      g.stroke();
      g.font = "700 7.5px 'IBM Plex Mono', monospace";
      g.fillStyle = '#92F8FF';
      g.fillText('REALITY.SYS', sx + 7, sy + sh - 8);
      g.restore();
    }
  }
  frame(dt, t) {
    this.realitySpr.step(dt);
    for (let i = 0; i < 3; i++) {
      this.focusSpr[i].step(dt);
      this.kickSpr[i].step(dt);
      if (this.collapseAge[i] < 1) this.collapseAge[i] = Math.min(1, this.collapseAge[i] + dt * 2.5);
    }
    if (this.switchAge < 1) this.switchAge = Math.min(1, this.switchAge + dt * 2.1);
    if (this.degaussAge < 1) this.degaussAge = Math.min(1, this.degaussAge + dt * 1.15);
    if (this.snowAlert > 0) this.snowAlert = Math.max(0, this.snowAlert - dt * 1.1);
    for (let i = this.poolRipples.length - 1; i >= 0; i--) {
      this.poolRipples[i].age += dt;
      if (this.poolRipples[i].age >= this.poolRipples[i].life) this.poolRipples.splice(i, 1);
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age += dt; b.y += b.vy * dt; b.x += Math.sin(t * 5 + i) * 6 * dt;
      if (b.age >= b.life) this.bubbles.splice(i, 1);
    }

    // 1. Update each zero-G floating 3D monitor's pose + draw soft breathing floor shadows (NO strings!)
    const [wg, W, H] = fit(this.wireCv);
    wg.clearRect(0, 0, W, H);
    const dark = document.body.classList.contains('surf-indigo');
    const degEnv = this.degaussAge < 1 ? Math.sin((1 - this.degaussAge) * Math.PI * 0.5) * Math.exp(-this.degaussAge * 2.2) : 0;

    for (let i = 0; i < 3; i++) {
      const cfg = CRT_STAGGER[i];
      const foc = clamp(this.focusSpr[i].x);
      const kick = this.kickSpr[i].x;
      const active = i === this._idx;
      const hov = i === this.hoverIdx ? 1 : 0;

      // 3D focus staging: inactive CRTs subtly angle inward toward the selected monitor!
      const towardActive = active ? 0 : Math.sign(this._idx - i) * 4.5;
      const bob = GP.reducedMotion ? 0 : Math.sin(t * cfg.freq * 2.1 + cfg.phase) * cfg.bobAmp;
      const swayX = GP.reducedMotion ? 0 : Math.sin(t * cfg.freq * 0.95 + cfg.phase * 1.4) * 3.8;
      const degShake = degEnv > 0.01 ? Math.sin(t * 54 + i * 2) * degEnv * 2.4 : 0;
      const yaw = GP.reducedMotion
        ? cfg.yawBase * (1 - foc * 0.65) + towardActive
        : cfg.yawBase * (1 - foc * 0.6) + towardActive + Math.sin(t * cfg.freq + cfg.phase) * cfg.yawAmp + kick * 1.6 + degShake;
      const pitch = GP.reducedMotion
        ? 0
        : Math.cos(t * cfg.freq * 1.25 + cfg.phase) * 5.0 + kick * 2.2 - hov * 2.5;
      const roll = GP.reducedMotion
        ? 0
        : Math.sin(t * cfg.freq * 0.95 + cfg.phase * 1.4) * 2.2 + degShake * 0.45;

      const cx = cfg.x + swayX;
      const cy = cfg.baseY + bob - foc * 5;
      const cz = foc * 24 + kick * 5 + hov * 8;

      this.rigs[i].style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, ${cz.toFixed(2)}px)`;
      this.rigs[i].style.zIndex = active ? '6' : hov ? '5' : '3';
      this.cubes[i].style.transform = `rotateY(${yaw.toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg)`;

      // Breathing soft floor shadow directly beneath each floating 3D monitor!
      const floorY = 232;
      const hNorm = clamp((floorY - cy) / 140, 0.4, 1.3);
      const shRx = 56 * (0.85 + foc * 0.14) / (0.75 + hNorm * 0.25);
      const shRy = 10.5;
      const shAlpha = (dark ? 0.42 : 0.18) * (1.18 - hNorm * 0.3);
      const shG = wg.createRadialGradient(cx, floorY, 4, cx, floorY, shRx);
      shG.addColorStop(0, `rgba(24, 18, 42, ${shAlpha.toFixed(3)})`);
      shG.addColorStop(1, 'rgba(24, 18, 42, 0)');
      wg.fillStyle = shG;
      wg.beginPath();
      wg.ellipse(cx, floorY, shRx, shRy, 0, 0, TAU);
      wg.fill();

      // 2. Render each monitor's live curved CRT glass canvas!
      const [sg, sw, sh] = fit(this.scrCvs[i]);
      sg.clearRect(0, 0, sw, sh);

      if (!active) {
        const offG = sg.createRadialGradient(sw * 0.4, sh * 0.35, 6, sw * 0.5, sh * 0.5, sw * 0.72);
        offG.addColorStop(0, '#49515A'); offG.addColorStop(0.6, '#2B323A'); offG.addColorStop(1, '#171C24');
        sg.fillStyle = offG;
        sg.fillRect(0, 0, sw, sh);

        // Sympathetic SMPTE static flicker on inactive tubes when HELIOS hits ERROR!
        if (this.snowAlert > 0.04) {
          sg.save();
          sg.globalAlpha = this.snowAlert * 0.65;
          drawSmpteBars(sg, 0, 0, sw, sh, t * 1.6 + i, 1.4);
          sg.restore();
        }

        // AUTHENTIC CRT PHOSPHOR COLLAPSE: squash to bright white scanline -> pinhole dot -> emerald afterglow!
        const ca = this.collapseAge[i];
        if (ca < 0.99) {
          sg.save();
          if (ca < 0.34) {
            const p = ca / 0.34;
            const hh = lerp(sh, 2.4, smooth(p));
            sg.save();
            sg.translate(0, (sh - hh) * 0.5);
            sg.scale(1, hh / sh);
            this.drawChannel(sg, i, 0, 0, sw, sh, t, dt);
            sg.restore();
            sg.fillStyle = `rgba(220, 255, 255, ${(p * 0.85).toFixed(3)})`;
            sg.fillRect(0, (sh - hh) * 0.5, sw, hh);
          } else if (ca < 0.74) {
            const p = (ca - 0.34) / 0.40;
            const lw = lerp(sw, 5, smooth(p));
            sg.fillStyle = '#E8FFFF';
            sg.shadowColor = '#46FAF4';
            sg.shadowBlur = 12;
            sg.fillRect((sw - lw) * 0.5, sh * 0.5 - 1.4, lw, 2.8);
          } else {
            const p = (ca - 0.74) / 0.26;
            const dotR = lerp(5.5, 1.5, p);
            const dg = sg.createRadialGradient(sw * 0.5, sh * 0.5, 0.5, sw * 0.5, sh * 0.5, dotR * 2.5);
            dg.addColorStop(0, `rgba(210, 255, 245, ${(1 - p).toFixed(3)})`);
            dg.addColorStop(0.5, `rgba(60, 245, 210, ${((1 - p) * 0.5).toFixed(3)})`);
            dg.addColorStop(1, 'rgba(60, 245, 210, 0)');
            sg.fillStyle = dg;
            sg.beginPath(); sg.arc(sw * 0.5, sh * 0.5, dotR * 2.5, 0, TAU); sg.fill();
          }
          sg.restore();
        }
      } else {
        const a = this.switchAge;
        if (a < 0.36) {
          drawSmpteBars(sg, 0, 0, sw, sh, t, 1.2);
        } else if (a < 0.82) {
          this.drawChannel(sg, i, 0, 0, sw, sh, t, dt);
          const amt = 1 - (a - 0.36) / 0.46;
          const seed = Math.floor(t * 26);
          for (let b = 0; b < 3; b++) {
            const ty = (0.16 + b * 0.30) * sh;
            const th = 9 + b * 2;
            const shift = (b % 2 === 0 ? 1 : -1) * (15 * amt + hash(seed + b) * 9 * amt);
            sg.fillStyle = '#151220'; sg.fillRect(0, ty, sw, th);
            sg.save(); sg.beginPath(); sg.rect(0, ty, sw, th); sg.clip();
            sg.translate(shift, 0);
            this.drawChannel(sg, i, 0, 0, sw, sh, t, dt);
            sg.restore();
            sg.fillStyle = 'rgba(255,70,195,0.8)'; sg.fillRect(0, ty, sw * 0.7, 1.6);
            sg.fillStyle = 'rgba(50,248,242,0.88)'; sg.fillRect(sw * 0.2, ty + th - 1.6, sw * 0.8, 1.6);
          }
        } else {
          this.drawChannel(sg, i, 0, 0, sw, sh, t, dt);
        }

        // MAGNETIC DEGAUSS COIL WARP: sinusoidal slice warp + rainbow shadow-mask convergence ring!
        if (degEnv > 0.02) {
          const slices = 10;
          const slH = sh / slices;
          for (let s = 0; s < slices; s++) {
            const sy0 = s * slH;
            const shift = Math.sin(t * 36 + s * 0.9) * 9 * degEnv;
            sg.save();
            sg.beginPath(); sg.rect(0, sy0, sw, slH + 0.5); sg.clip();
            sg.translate(shift, 0);
            this.drawChannel(sg, i, 0, 0, sw, sh, t, dt);
            sg.restore();
          }
          // Rainbow magnetic purity rings expanding across tube!
          sg.save();
          sg.globalCompositeOperation = 'screen';
          const rRad = lerp(12, sw * 0.85, this.degaussAge);
          const cols = ['rgba(255,58,185,0.65)', 'rgba(60,250,242,0.65)', 'rgba(255,240,95,0.55)'];
          for (let c = 0; c < 3; c++) {
            sg.strokeStyle = cols[c];
            sg.lineWidth = 4.5 * degEnv + 1;
            sg.beginPath();
            sg.ellipse(sw * 0.5 + (c - 1) * 5 * degEnv, sh * 0.5, rRad + c * 6, rRad * 0.78 + c * 5, 0, 0, TAU);
            sg.stroke();
          }
          sg.restore();
        }

        if (a > 0.36) {
          sg.font = "700 8px 'IBM Plex Mono', monospace";
          sg.fillStyle = `rgba(115, 255, 245, ${(a < 0.9 || degEnv > 0.05 ? 0.95 : 0.68).toFixed(2)})`;
          sg.fillText(degEnv > 0.08 ? 'DEGAUSS' : `CH 0${i + 1} · 60Hz`, 7, 13.5);
        }
      }

      // Subtle CRT scanlines + convex glass reflection shifting dynamically with live 3D yaw!
      sg.fillStyle = 'rgba(12, 16, 28, 0.08)';
      for (let ly = 0; ly < sh; ly += 3) sg.fillRect(0, ly, sw, 1);

      const glareShift = clamp(yaw * 1.4, -26, 26);
      const gloss = sg.createLinearGradient(glareShift, 0, sw * 0.68 + glareShift, sh * 0.78);
      gloss.addColorStop(0, active ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.20)');
      gloss.addColorStop(0.32, 'rgba(255,255,255,0.04)');
      gloss.addColorStop(1, 'rgba(10,14,26,0.28)');
      sg.fillStyle = gloss;
      sg.fillRect(0, 0, sw, sh);
    }
  }
}
define('paradise-crt-tabs', VpCrtTabs);
