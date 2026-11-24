// =========================================================================
// 5. <paradise-statue> — Floating 3D statue that shows what an AI agent is doing
//    True 4-slab 3D sculptural deconstruction (crown · face · neck · shoulders),
//    3D volumetric laser wireframe/checkerboard scan, holographic blueprint mode,
//    front/back Z-sorted  95-era micro-dialogs & chrome pearls, reactive
//    checkerboard plinth with pool-caustic convergence shockwave, plus
//    progress arc, pulse(), and deterministic simulateRun() choreography!
// =========================================================================
const ORB_STATES = ['idle', 'thinking', 'searching', 'tool', 'writing', 'error', 'done'];
const STATUE_TARGETS = {
  idle:      { sliceGap: 0.00, sliceTwist: 0.00, wireMix: 0.00, holoMix: 0.00, writeMix: 0.00, errorMix: 0.00, elev: 0.00, halo: 0.00, orbit: 0.00 },
  thinking:  { sliceGap: 1.00, sliceTwist: 1.00, wireMix: 0.00, holoMix: 0.00, writeMix: 0.00, errorMix: 0.00, elev: 1.00, halo: 0.14, orbit: 1.00 },
  searching: { sliceGap: 0.24, sliceTwist: 0.34, wireMix: 1.00, holoMix: 0.10, writeMix: 0.00, errorMix: 0.00, elev: 0.96, halo: 0.12, orbit: 1.00 },
  tool:      { sliceGap: 0.14, sliceTwist: 0.00, wireMix: 0.16, holoMix: 1.00, writeMix: 0.00, errorMix: 0.00, elev: 1.00, halo: 0.24, orbit: 1.00 },
  writing:   { sliceGap: 0.42, sliceTwist: 0.32, wireMix: 0.00, holoMix: 0.14, writeMix: 1.00, errorMix: 0.00, elev: 0.88, halo: 0.36, orbit: 0.86 },
  error:     { sliceGap: 0.48, sliceTwist: 0.16, wireMix: 0.22, holoMix: 0.00, writeMix: 0.00, errorMix: 1.00, elev: 0.68, halo: 0.00, orbit: 0.72 },
  done:      { sliceGap: 0.00, sliceTwist: 0.00, wireMix: 0.00, holoMix: 0.00, writeMix: 0.00, errorMix: 0.00, elev: 0.44, halo: 1.00, orbit: 0.00 },
};
const GLYPH_POOL = ['✦', '0x', '░', '95', '::', '◇', '▓', 'OK'];

class VpStatueAgent extends Base {
  static delegates = true;
  static observedAttributes = ['state', 'progress'];
  static css = `
    :host { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; }
    button {
      all: unset; position: relative; display: block; width: 240px; height: 256px;
      cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
    }
    button:focus-visible { outline: 2px solid #3CEBE2; outline-offset: 6px; border-radius: 18px; }
    canvas {
      position: absolute; left: -46px; top: -26px;
      width: 332px; height: 288px; pointer-events: none;
    }
  `;
  render() {
    return `<button type="button" aria-label="Floating 3D Statue Agent State (click to cycle)"><canvas aria-hidden="true"></canvas></button>`;
  }
  setup() {
    this.btn = this.$('button');
    this.cv = this.$('canvas');
    const initSt = ORB_STATES.includes(this.getAttribute('state')) ? this.getAttribute('state') : 'thinking';
    this._state = initSt;
    this._progress = this._parseProgress(this.getAttribute('progress'));
    const tgt = STATUE_TARGETS[initSt];

    // Continuous spring-blended animation channels for butter-smooth state transitions
    this.spr = {
      sliceGap:   new Spring(tgt.sliceGap,   185, 19),
      sliceTwist: new Spring(tgt.sliceTwist, 140, 17),
      wireMix:    new Spring(tgt.wireMix,    180, 20),
      holoMix:    new Spring(tgt.holoMix,    175, 20),
      writeMix:   new Spring(tgt.writeMix,   160, 18),
      errorMix:   new Spring(tgt.errorMix,   260, 20),
      elev:       new Spring(tgt.elev,       150, 16),
      halo:       new Spring(tgt.halo,       155, 17),
      orbit:      new Spring(tgt.orbit,      210, 20),
      kick:       new Spring(0,              290, 16),
    };
    this.lookX = new Spring(0, 120, 18);
    this.lookY = new Spring(0, 120, 18);

    this.doneFlash = initSt === 'done' ? 0.85 : 0;
    this.glowFlash = 0;
    this.portalWave = initSt === 'done' ? 0.42 : 0; // 0..1 expanding turquoise pool caustic shockwave
    this.portalActive = initSt === 'done';
    this.angle = 0;
    this.scanPhase = 0.25;
    this.motes = [];
    this._moteSpawnAcc = 0;
    this._pulseIdx = 0;
    this._sim = null;
    this._internalSet = false;

    // Seed ambient rising motes if booted directly into writing or thinking
    if (initSt === 'writing' || initSt === 'thinking') {
      for (let i = 0; i < (initSt === 'writing' ? 9 : 4); i++) {
        this._spawnMote(i * 0.14);
      }
    }

    this.btn.addEventListener('pointermove', (e) => {
      const r = this.btn.getBoundingClientRect();
      this.lookX.to = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      this.lookY.to = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      start();
    });
    this.btn.addEventListener('pointerleave', () => { this.lookX.to = 0; this.lookY.to = 0; start(); });
    this.btn.addEventListener('click', () => {
      this.stopSimulation();
      const next = ORB_STATES[(ORB_STATES.indexOf(this._state) + 1) % ORB_STATES.length];
      this.state = next;
      SND?.orbState(next);
      this.emit('change', { state: next, progress: this._progress });
    });
  }
  _parseProgress(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return clamp(n > 1 ? n / 100 : n, 0, 1);
  }
  get state() { return this._state; }
  set state(v) {
    const clean = ORB_STATES.includes(v) ? v : 'idle';
    if (!this._internalSet) this.stopSimulation();
    this.setAttribute('state', clean);
  }
  get progress() { return this._progress; }
  set progress(v) {
    if (v === null || v === undefined || v === '') {
      this._progress = null;
      this.removeAttribute('progress');
    } else {
      const val = this._parseProgress(v);
      this._progress = val;
      this.setAttribute('progress', val === null ? '' : val.toFixed(3));
    }
    this.dirty = true; start();
  }
  get simulating() { return !!(this._sim && this._sim.active); }
  stopSimulation(silent = false) {
    if (this._sim && this._sim.active) {
      this._sim.active = false;
      this._sim = null;
      if (!silent) this.emit('sim-end', { state: this._state, completed: false });
    }
  }
  simulateRun() {
    this._sim = { active: true, elapsed: 0, stepIdx: -1, lastPulseAt: -1 };
    this._progress = 0.02;
    this.emit('sim-start', {});
    this.dirty = true; start();
  }
  pulse(kind = 'token', silent = false) {
    if (!this.spr) return;
    this.spr.kick.v += kind === 'tool' ? -5.8 : 4.6;
    this.glowFlash = Math.max(this.glowFlash, kind === 'tool' ? 0.72 : 0.56);
    const count = kind === 'done' ? 12 : 5;
    for (let i = 0; i < count; i++) this._spawnMote(0, kind);
    if (!silent) SND?.tokenPulse(++this._pulseIdx);
    this.emit('pulse', { kind, state: this._state });
    this.dirty = true; start();
  }
  _spawnMote(preAge = 0, kind = 'token') {
    const seamY = [0.21, 0.38, 0.55][Math.floor(Math.random() * 3)];
    const side = Math.random() < 0.5 ? -1 : 1;
    // Bias slightly outward around the open seams & halo aura so glyphs frame the marble head cleanly
    const spreadX = side * (22 + Math.random() * (kind === 'done' ? 42 : 34));
    const glyph = Math.random() < 0.58 ? GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)] : null;
    const palette = kind === 'error'
      ? ['#FF387A', '#FF78B4', '#26F4EE']
      : ['#18E6E0', '#FF56BE', '#9B7CFF', '#4AF8F2', '#FF8AD6'];
    this.motes.push({
      ox: spreadX,
      seamY,
      vx: side * (6 + Math.random() * 12),
      vy: -(28 + Math.random() * 34),
      size: glyph ? 9.5 + Math.random() * 2.5 : 2.6 + Math.random() * 2.6,
      glyph,
      color: palette[Math.floor(Math.random() * palette.length)],
      phase: Math.random() * TAU,
      age: preAge,
      life: 1.05 + Math.random() * 0.72,
    });
    if (this.motes.length > 36) this.motes.shift();
  }
  attributeChangedCallback(name) {
    if (!this._booted) return;
    if (name === 'progress') {
      this._progress = this._parseProgress(this.getAttribute('progress'));
      this.dirty = true; start();
      return;
    }
    const next = ORB_STATES.includes(this.getAttribute('state')) ? this.getAttribute('state') : 'idle';
    const prev = this._state;
    this._state = next;
    const tgt = STATUE_TARGETS[next];

    // Tune magnetic slam stiffness on DONE for unmistakable physical impact!
    this.spr.sliceGap.k = next === 'done' ? 360 : 185;
    this.spr.sliceGap.d = next === 'done' ? 20 : 19;
    this.spr.sliceGap.to   = tgt.sliceGap;
    this.spr.sliceTwist.to = tgt.sliceTwist;
    this.spr.wireMix.to    = tgt.wireMix;
    this.spr.holoMix.to    = tgt.holoMix;
    this.spr.writeMix.to   = tgt.writeMix;
    this.spr.errorMix.to   = tgt.errorMix;
    this.spr.elev.to       = tgt.elev;
    this.spr.halo.to       = tgt.halo;
    this.spr.orbit.to      = tgt.orbit;

    if (next !== prev) {
      bus.emit('agent', { state: next });
      if (next === 'done') {
        this.doneFlash = 1.0;
        this.glowFlash = 1.0;
        this.portalWave = 0.01;
        this.portalActive = true;
        this.spr.kick.v -= 13.5; // crisp magnetic slam downward recoil!
        for (let i = 0; i < 12; i++) this._spawnMote(0, 'done');
      } else if (next === 'error') {
        this.spr.kick.v += 9.5;
        for (let i = 0; i < 6; i++) this._spawnMote(0, 'error');
      } else if (next === 'thinking') {
        this.spr.kick.v += 5.5;
      } else if (next === 'searching') {
        this.scanPhase = 0.05;
      }
    }
    this.dirty = true; start();
  }

  // Crisp 4-point Vaporwave Renaissance diamond star flare
  drawStarFlare(g, x, y, r, alpha = 1) {
    if (alpha <= 0.01) return;
    g.save();
    g.translate(x, y);
    g.globalAlpha = clamp(alpha);
    const rg = g.createRadialGradient(0, 0, 1, 0, 0, r * 1.15);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.35, 'rgba(110,252,248,0.55)');
    rg.addColorStop(0.75, 'rgba(255,148,218,0.18)');
    rg.addColorStop(1, 'rgba(255,148,218,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(0, 0, r * 1.15, 0, TAU); g.fill();

    g.fillStyle = '#FFFFFF';
    g.shadowColor = '#5CF8F4';
    g.shadowBlur = 10;
    const inR = r * 0.16;
    g.beginPath();
    g.moveTo(0, -r);
    g.quadraticCurveTo(inR * 0.5, -inR * 0.5, r, 0);
    g.quadraticCurveTo(inR * 0.5, inR * 0.5, 0, r);
    g.quadraticCurveTo(-inR * 0.5, inR * 0.5, -r, 0);
    g.quadraticCurveTo(-inR * 0.5, -inR * 0.5, 0, -r);
    g.closePath();
    g.fill();
    g.restore();
  }

  // Miniature floating 95-era micro-dialog or mirror chrome pearl orbiting in true 3D!
  drawMicroArtifact(g, art, t) {
    const pop = clamp(art.pop);
    if (pop <= 0.02) return;
    const scaleX = art.scale * lerp(0.14, 1.0, smooth(clamp(pop * 1.35)));
    const scaleY = art.scale * lerp(0.06, 1.0, smooth(clamp((pop - 0.12) / 0.88)));

    g.save();
    g.translate(art.x, art.y);
    g.scale(scaleX, scaleY);
    g.globalAlpha = clamp(pop * 1.15) * lerp(0.72, 1.0, (art.z + 1) * 0.5);

    // 1-frame CRT power-on bright white phosphor flash during pop-in / collapse!
    if (pop > 0.08 && pop < 0.42) {
      g.fillStyle = 'rgba(220, 255, 255, 0.92)';
      g.fillRect(-30, -2, 60, 4);
    }

    if (art.kind === 'pearl') {
      // real photographed mirror chrome pearl with pastel specular aura
      const pr = 11.5;
      const ag = g.createRadialGradient(0, 0, 2, 0, 0, pr * 1.55);
      ag.addColorStop(0, art.accent === 'pink' ? 'rgba(255,140,214,0.45)' : 'rgba(72,248,242,0.45)');
      ag.addColorStop(1, 'rgba(72,248,242,0)');
      g.fillStyle = ag;
      g.beginPath(); g.arc(0, 0, pr * 1.55, 0, TAU); g.fill();
      if (ready(PLATES.chromeSphere)) {
        g.save();
        g.shadowColor = 'rgba(30, 22, 52, 0.28)';
        g.shadowBlur = 7;
        g.shadowOffsetY = 3;
        g.drawImage(PLATES.chromeSphere, -pr, -pr, pr * 2, pr * 2);
        g.restore();
      } else {
        g.fillStyle = '#E8F8FF';
        g.beginPath(); g.arc(0, 0, pr * 0.85, 0, TAU); g.fill();
      }
      // Orbiting diamond twinkle beside chrome pearl
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.arc(-pr * 0.38, -pr * 0.38, 2.2, 0, TAU); g.fill();
    } else {
      // miniature 95-era dialog card (FIND.EXE / RUN.DLL / ERROR 1995)
      const w = art.w || 58, h = art.h || 31;
      const x = -w * 0.5, y = -h * 0.5;
      // Subtle pixel-offset shadow
      g.fillStyle = 'rgba(28, 20, 48, 0.28)';
      g.fillRect(x + 3, y + 3, w, h);
      drawBevelBox(g, x, y, w, h, { fill: '#ECE7DE' });

      // Pastel  95-era titlebar
      const tb = g.createLinearGradient(x + 2, y + 2, x + w - 2, y + 2);
      if (art.kind === 'error') {
        tb.addColorStop(0, '#FF3E78'); tb.addColorStop(1, '#FF8CC4');
      } else if (art.kind === 'tool') {
        tb.addColorStop(0, '#8E88FA'); tb.addColorStop(1, '#58F2EE');
      } else {
        tb.addColorStop(0, '#3EECE8'); tb.addColorStop(1, '#F69ED8');
      }
      g.fillStyle = tb;
      g.fillRect(x + 2.5, y + 2.5, w - 5, 9.5);

      // Tiny [×] bevel pip
      g.fillStyle = '#E6E1D8';
      g.fillRect(x + w - 10, y + 3.5, 7, 7);
      g.fillStyle = '#241A36';
      g.font = "700 6.5px 'IBM Plex Mono', monospace";
      g.fillText(art.title, x + 4.5, y + 9.6);

      // Micro-dialog body content
      if (art.kind === 'search') {
        // Animated scanning progress ticks inside FIND.EXE
        g.fillStyle = '#D2CEC6';
        g.fillRect(x + 5, y + 16, w - 10, 7);
        const prog = (0.5 + 0.5 * Math.sin(t * 4.5 + art.idx * 1.7));
        const segs = Math.max(1, Math.round(prog * 6));
        for (let s = 0; s < segs; s++) {
          g.fillStyle = s % 2 === 0 ? '#28DCE2' : '#9B8CF8';
          g.fillRect(x + 6.5 + s * 7.2, y + 17.5, 5.4, 4);
        }
      } else if (art.kind === 'tool') {
        // Blinking execution LED + code tag
        const blink = Math.sin(t * 11 + art.idx * 2.1) > -0.2;
        g.fillStyle = blink ? '#2AF8CC' : '#7E989E';
        g.beginPath(); g.arc(x + 9, y + 20, 2.8, 0, TAU); g.fill();
        g.fillStyle = '#2A213C';
        g.font = "700 7px 'IBM Plex Mono', monospace";
        g.fillText(art.body || '0x95', x + 15, y + 22.5);
      } else if (art.kind === 'error') {
        g.fillStyle = '#C81E56';
        g.font = "700 7.5px 'IBM Plex Mono', monospace";
        g.fillText(art.body || '! FAULT', x + 6, y + 22.5);
      }
    }
    g.restore();
  }

  // Step deterministic choreographed SIMULATE RUN timeline
  _stepSimulation(dt) {
    if (!this._sim || !this._sim.active) return;
    this._sim.elapsed += dt;
    const e = this._sim.elapsed;
    const phases = [
      { at: 0.0, state: 'thinking',  p0: 0.04, p1: 0.20, dur: 1.5 },
      { at: 1.5, state: 'searching', p0: 0.20, p1: 0.44, dur: 1.7 },
      { at: 3.2, state: 'tool',      p0: 0.44, p1: 0.68, dur: 1.7 },
      { at: 4.9, state: 'writing',   p0: 0.68, p1: 0.99, dur: 2.0 },
      { at: 6.9, state: 'done',      p0: 1.00, p1: 1.00, dur: 1.9 },
    ];
    let idx = 0;
    for (let i = phases.length - 1; i >= 0; i--) {
      if (e >= phases[i].at) { idx = i; break; }
    }
    const ph = phases[idx];
    const frac = clamp((e - ph.at) / ph.dur, 0, 1);
    this._progress = lerp(ph.p0, ph.p1, smooth(frac));

    if (idx !== this._sim.stepIdx) {
      this._sim.stepIdx = idx;
      this._internalSet = true;
      this.state = ph.state;
      this._internalSet = false;
      SND?.orbState(ph.state);
      this.emit('change', { state: ph.state, progress: this._progress, simulated: true });
    }
    // Mid-tool execution pulse + rhythmic writing token pulses!
    if (ph.state === 'tool' && e >= 4.05 && this._sim.lastPulseAt < 4.0) {
      this._sim.lastPulseAt = e;
      this.pulse('tool');
    } else if (ph.state === 'writing' && e - this._sim.lastPulseAt >= 0.38) {
      this._sim.lastPulseAt = e;
      this.pulse('token');
    }
    this.emit('sim-progress', { state: ph.state, progress: this._progress });

    if (e >= 8.8) {
      this._sim.active = false;
      this._sim = null;
      this.emit('sim-end', { state: 'done', completed: true });
    }
  }

  frame(dt, t) {
    this._stepSimulation(dt);
    for (const s of Object.values(this.spr)) s.step(dt);
    this.lookX.step(dt);
    this.lookY.step(dt);

    if (this.doneFlash > 0) this.doneFlash = Math.max(0, this.doneFlash - dt * 0.95);
    if (this.glowFlash > 0) this.glowFlash = Math.max(0, this.glowFlash - dt * 1.45);
    if (this.portalActive) {
      this.portalWave = Math.min(1, this.portalWave + dt * 1.05);
      if (this.portalWave >= 1) this.portalActive = false;
    }

    const st = this._state;
    const sliceGapRaw = clamp(this.spr.sliceGap.x, 0, 1.35);
    const progMod = this._progress !== null ? (1 - this._progress * 0.22) : 1;
    const sliceGap = sliceGapRaw * progMod;
    const sliceTwistMix = clamp(this.spr.sliceTwist.x, 0, 1.2);
    const wireMix = clamp(this.spr.wireMix.x, 0, 1);
    const holoMix = clamp(this.spr.holoMix.x, 0, 1);
    const writeMix = clamp(this.spr.writeMix.x, 0, 1);
    const errorMix = clamp(this.spr.errorMix.x, 0, 1);
    const elev = clamp(this.spr.elev.x, -0.1, 1.2);
    const haloAmt = clamp(this.spr.halo.x, 0, 1.15);
    const orbitVis = clamp(this.spr.orbit.x, 0, 1);
    const kick = this.spr.kick.x;

    const speed = st === 'idle' ? 0.35 : st === 'thinking' ? 1.05 : st === 'searching' ? 1.75 : st === 'tool' ? 2.35 : st === 'writing' ? 1.35 : st === 'error' ? 2.1 : 0.25;
    if (!GP.reducedMotion) {
      this.angle += dt * speed;
      this.scanPhase = (this.scanPhase + dt * 0.44) % 1.0;
    }

    // Ambient mote spawning during writing & thinking
    if (!GP.reducedMotion && (writeMix > 0.35 || sliceGap > 0.55)) {
      const rate = writeMix > 0.35 ? 9.5 : 2.6;
      this._moteSpawnAcc += dt * rate;
      while (this._moteSpawnAcc >= 1) {
        this._moteSpawnAcc -= 1;
        this._spawnMote(0, writeMix > 0.35 ? 'token' : 'think');
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dt;
      if (m.age >= m.life) this.motes.splice(i, 1);
    }

    // Smooth 3D turntable yaw -> blends seamlessly into stepped mechanical yaw detents in TOOL state!
    const rotAmp = st === 'idle' ? 0.20 : st === 'thinking' ? 0.25 : st === 'searching' ? 0.29 : st === 'tool' ? 0.28 : st === 'writing' ? 0.19 : st === 'error' ? 0.24 : 0.14;
    const rotRate = st === 'idle' ? 0.45 : st === 'thinking' ? 0.58 : st === 'searching' ? 0.88 : st === 'tool' ? 0.72 : st === 'writing' ? 0.54 : st === 'error' ? 1.55 : 0.36;
    const smoothYaw = Math.sin(t * rotRate) * rotAmp;
    // Stepped mechanical clockwork detents for tool holographic inspection
    const detPhase = t * 1.15;
    const detStepped = Math.floor(detPhase) + smooth(clamp((detPhase - Math.floor(detPhase) - 0.72) / 0.28));
    const steppedYaw = Math.sin(detStepped * 0.92) * 0.29;
    const baseYaw = lerp(smoothYaw, steppedYaw, holoMix);

    const yaw = GP.reducedMotion ? 0 : (0.055 + baseYaw + this.lookX.x * 0.12);
    const pitch = GP.reducedMotion ? 0 : (Math.cos(t * 0.58) * 0.042 + writeMix * 0.068 - this.lookY.x * 0.07 + kick * 0.012);
    const roll = GP.reducedMotion ? 0 : (Math.sin(t * 0.44) * 0.018 + kick * 0.006);
    const sliceTwist = GP.reducedMotion ? 0 : (Math.sin(t * 1.15 + 0.4) * 0.24 * sliceTwistMix);
    const scanY = 0.04 + 0.90 * (0.5 - 0.5 * Math.cos(this.scanPhase * TAU));

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const cx = W * 0.5;
    const baseCy = H - 54;
    const platR = 88;
    const platYScale = 0.40;

    // =====================================================================
    // 1. REACTIVE FLUTED CARRARA MARBLE CHECKERBOARD PORTAL PLINTH
    // =====================================================================
    if (ready(PLATES.marbleRing)) {
      g.save();
      g.translate(cx, baseCy);
      g.scale(1, platYScale);
      drawContactShadow(g, () => {
        g.save();
        g.rotate(yaw * 0.45);
        g.drawImage(PLATES.marbleRing, -platR, -platR, platR * 2, platR * 2);
        g.restore();
      }, 0, 26, 28, 0.24);

      // Clip reactive plinth effects cleanly to the inner checkerboard disk
      g.save();
      g.beginPath(); g.arc(0, 0, platR * 0.72, 0, TAU); g.clip();

      // 1a. Soft cyan/pink (or coral error) under-glow cast from the floating sculpture core
      const glowAmt = clamp(sliceGap * 0.72 + wireMix * 0.55 + writeMix * 0.5 + errorMix * 0.75);
      if (glowAmt > 0.02) {
        const ug = g.createRadialGradient(0, 0, 6, 0, 0, platR * 0.74);
        if (errorMix > 0.45) {
          ug.addColorStop(0, `rgba(255, 62, 128, ${(0.52 * glowAmt).toFixed(3)})`);
          ug.addColorStop(0.55, `rgba(255, 118, 180, ${(0.24 * glowAmt).toFixed(3)})`);
          ug.addColorStop(1, 'rgba(255, 62, 128, 0)');
        } else {
          ug.addColorStop(0, `rgba(68, 248, 244, ${(0.44 * glowAmt).toFixed(3)})`);
          ug.addColorStop(0.52, `rgba(255, 134, 212, ${(0.24 * glowAmt).toFixed(3)})`);
          ug.addColorStop(1, 'rgba(72, 248, 242, 0)');
        }
        g.fillStyle = ug;
        g.fillRect(-platR, -platR, platR * 2, platR * 2);
      }

      // 1b. SEARCHING: horizontal VHS shear slicing the marble checkerboard floor
      if (wireMix > 0.2 && !GP.reducedMotion) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 6.2);
        const sy = Math.sin(t * 3.4) * 34;
        g.save();
        g.globalAlpha = wireMix;
        g.beginPath(); g.rect(-platR, sy, platR * 2, 16); g.clip();
        g.rotate(yaw * 0.45);
        g.drawImage(PLATES.marbleRing, -platR + 15 * pulse, -platR, platR * 2, platR * 2);
        g.fillStyle = 'rgba(48,248,242,0.65)'; g.fillRect(-platR, sy, platR * 2, 3);
        g.fillStyle = 'rgba(255,78,195,0.65)'; g.fillRect(-platR, sy + 13, platR * 2, 3);
        g.restore();
      }

      // 1c. TOOL: spinning concentric cyan/lilac calibration reticle rings on marble plinth!
      if (holoMix > 0.05) {
        g.save();
        g.globalAlpha = holoMix * 0.88;
        g.rotate(t * 0.85);
        g.strokeStyle = '#32F6F0';
        g.lineWidth = 2.6;
        g.setLineDash([12, 7]);
        g.beginPath(); g.arc(0, 0, platR * 0.58, 0, TAU); g.stroke();
        g.rotate(-t * 1.75);
        g.strokeStyle = '#C4A2FF';
        g.lineWidth = 2.0;
        g.setLineDash([6, 8]);
        g.beginPath(); g.arc(0, 0, platR * 0.42, 0, TAU); g.stroke();
        g.setLineDash([]);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          g.strokeStyle = i % 3 === 0 ? '#FFFFFF' : 'rgba(52, 246, 240, 0.72)';
          g.lineWidth = i % 3 === 0 ? 2.4 : 1.4;
          g.beginPath();
          g.moveTo(Math.cos(a) * platR * 0.48, Math.sin(a) * platR * 0.48);
          g.lineTo(Math.cos(a) * platR * 0.66, Math.sin(a) * platR * 0.66);
          g.stroke();
        }
        g.restore();
      }

      // 1d. DONE: Expanding sunlit turquoise pool-caustic shockwave washing across checkerboard!
      if (this.portalWave > 0.01 && this.portalWave < 0.99) {
        const p = this.portalWave;
        const ease = 1 - (1 - p) * (1 - p);
        const outerR = lerp(14, platR * 0.82, ease);
        const bandW = lerp(34, 14, p);
        const innerR = Math.max(0, outerR - bandW);
        const fade = Math.sin(clamp(p) * Math.PI);
        g.save();
        g.globalAlpha = fade * 0.95;
        g.beginPath();
        g.arc(0, 0, outerR, 0, TAU, false);
        if (innerR > 1) g.arc(0, 0, innerR, 0, TAU, true);
        g.clip('evenodd');
        drawRealPoolWater(g, -platR, -platR, platR * 2, platR * 2, t * 1.4, { alpha: 1, refractBoost: 1.35 });
        g.restore();

        // Bright white-cyan sunlit wave crest ring
        g.save();
        g.globalAlpha = fade * 0.92;
        g.strokeStyle = '#9EFFFF';
        g.lineWidth = lerp(4.5, 1.4, p);
        g.beginPath(); g.arc(0, 0, outerR - 1, 0, TAU); g.stroke();
        g.restore();
      }
      g.restore();
      g.restore();
    }

    // Compute live levitation elevation
    const floatWave = GP.reducedMotion ? 0 : Math.sin(t * (st === 'idle' ? 1.35 : 2.15));
    const hoverH = 12 + elev * 13 + floatWave * (st === 'idle' ? 2.4 : 4.8) - kick * 1.25;

    // =====================================================================
    // 2. HEIGHT-COUPLED DROP SHADOW ON MARBLE CHECKERBOARD FLOOR
    // =====================================================================
    g.save();
    const shScale = clamp(1.08 - hoverH * 0.011, 0.62, 1.06);
    const shAlpha = clamp(0.36 - hoverH * 0.0052, 0.14, 0.35);
    const shG = g.createRadialGradient(cx, baseCy + 2, 4, cx, baseCy + 2, 48 * shScale);
    shG.addColorStop(0, `rgba(22, 16, 40, ${shAlpha.toFixed(3)})`);
    shG.addColorStop(0.65, `rgba(22, 16, 40, ${(shAlpha * 0.45).toFixed(3)})`);
    shG.addColorStop(1, 'rgba(22, 16, 40, 0)');
    g.fillStyle = shG;
    g.beginPath();
    g.ellipse(cx, baseCy + 2, 48 * shScale, 16 * shScale, 0, 0, TAU);
    g.fill();
    g.restore();

    // Statue bounding box inside 332x288 canvas
    const drawH = 200;
    const drawW = drawH * (420 / 560); // 150px
    const bustX = cx - drawW * 0.5;
    const bustY = baseCy - hoverH - drawH + 24;
    const headCy = bustY + drawH * 0.34;

    // =====================================================================
    // 3. PREPARE 3D FRONT/BACK Z-SORTED ORBITING VAPORWAVE MICRO-ARTIFACTS
    // =====================================================================
    const baseA = holoMix > 0.45
      ? lerp(this.angle, Math.floor(this.angle * 1.9) * (Math.PI / 4), holoMix)
      : this.angle;
    const orbitCenterY = bustY + drawH * 0.48;
    let artifacts = [];
    if (orbitVis > 0.02) {
      if (errorMix > 0.45) {
        // Glitching ERROR 1995 floating micro-dialog beside temple + trailing pearl
        const jitterX = GP.reducedMotion ? 0 : Math.sin(t * 36) * 2.4 * errorMix;
        const jitterY = GP.reducedMotion ? 0 : Math.cos(t * 29) * 1.8 * errorMix;
        artifacts = [
          { kind: 'error', idx: 0, title: 'ERROR 1995', body: '! 0xDEAD', w: 66, h: 32, x: cx + 76 + jitterX, y: headCy - 14 + jitterY, z: 0.75, scale: 1.04, pop: orbitVis },
          { kind: 'error', idx: 1, title: 'FAULT.SYS', body: 'RETRY?', w: 58, h: 30, x: cx - 78 - jitterX * 0.8, y: orbitCenterY + 18 - jitterY, z: -0.35, scale: 0.88, pop: orbitVis },
        ];
      } else if (holoMix > 0.45) {
        // 3 Crisp  95-era Execution Micro-Dialogs snapped into mechanical orbit!
        const specs = [
          { title: 'RUN.DLL', body: 'EXEC' },
          { title: 'TOOL.95', body: '0x0F' },
          { title: 'SYS.EXE', body: 'SYNC' },
        ];
        artifacts = specs.map((sp, k) => {
          const a = baseA + k * (TAU / 3) - 0.55;
          const z = Math.sin(a);
          return {
            kind: 'tool', idx: k, title: sp.title, body: sp.body, w: 58, h: 30,
            x: cx + Math.cos(a) * 96,
            y: orbitCenterY + z * 24 + Math.sin(t * 2.2 + k) * 3,
            scale: lerp(0.76, 1.06, (z + 1) * 0.5),
            z, pop: orbitVis,
          };
        });
      } else if (wireMix > 0.45) {
        // 3 Crisp  95-era Search Micro-Dialogs (FIND.EXE / INDEX.95 / SCAN)
        const specs = [
          { title: 'FIND.EXE' },
          { title: 'INDEX.95' },
          { title: '0x1995' },
        ];
        artifacts = specs.map((sp, k) => {
          const a = baseA + k * (TAU / 3) - 0.4;
          const z = Math.sin(a);
          return {
            kind: 'search', idx: k, title: sp.title, w: 60, h: 30,
            x: cx + Math.cos(a) * 96,
            y: orbitCenterY + z * 24 + Math.cos(t * 2.4 + k) * 3.5,
            scale: lerp(0.76, 1.06, (z + 1) * 0.5),
            z, pop: orbitVis,
          };
        });
      } else {
        // THINKING / WRITING: 3 mirror chrome pearls orbiting in luminous 3D!
        artifacts = [0, 1, 2].map((k) => {
          const a = baseA + k * (TAU / 3) - 0.6;
          const z = Math.sin(a);
          return {
            kind: 'pearl', idx: k, accent: k === 1 ? 'pink' : 'cyan',
            x: cx + Math.cos(a) * 86,
            y: orbitCenterY + z * 23 + Math.sin(t * 2.0 + k * 1.4) * 4,
            scale: lerp(0.72, 1.14, (z + 1) * 0.5),
            z, pop: orbitVis,
          };
        });
      }
    }

    // Draw BACK-arc orbiting micro-artifacts cleanly behind the marble statue
    for (const art of artifacts) if (art.z < 0) this.drawMicroArtifact(g, art, t);

    // =====================================================================
    // 4. PRISMATIC RENAISSANCE DOUBLE-HALO + LIVE PROGRESS ARC + 4-PT STAR FLARE
    // =====================================================================
    const showProgress = this._progress !== null && this._progress > 0.005;
    const haloVis = Math.max(haloAmt, this.doneFlash * 0.92, showProgress ? 0.35 : 0);
    if (haloVis > 0.02) {
      g.save();
      const haloR = 52 + (1 - clamp(haloAmt)) * 6;
      // Full double halo when in DONE or forming softly in WRITING
      if (haloAmt > 0.04 || this.doneFlash > 0.04) {
        const fa = clamp(Math.max(haloAmt, this.doneFlash));
        const hg = g.createLinearGradient(cx - haloR, headCy - haloR, cx + haloR, headCy + haloR);
        hg.addColorStop(0, `rgba(74, 248, 244, ${(fa * 0.95).toFixed(3)})`);
        hg.addColorStop(0.48, `rgba(255, 255, 255, ${(fa * 0.98).toFixed(3)})`);
        hg.addColorStop(1, `rgba(255, 146, 214, ${(fa * 0.95).toFixed(3)})`);
        g.strokeStyle = hg;
        g.shadowColor = '#64FAF4';
        g.shadowBlur = 16 * fa;
        g.lineWidth = 2.8;
        g.beginPath(); g.arc(cx, headCy, haloR, 0, TAU); g.stroke();

        // Outer delicate Renaissance celestial ring
        g.lineWidth = 1.15;
        g.globalAlpha = fa * 0.58;
        g.beginPath(); g.arc(cx, headCy, haloR + 7.5, 0, TAU); g.stroke();

        // Rotating subtle micro-orbiting pearl dots on outer halo rim during DONE
        if (fa > 0.65) {
          g.shadowBlur = 6;
          for (let d = 0; d < 4; d++) {
            const da = t * 0.45 + d * (Math.PI * 0.5);
            g.fillStyle = d % 2 === 0 ? '#FFFFFF' : '#78FAF6';
            g.beginPath();
            g.arc(cx + Math.cos(da) * (haloR + 7.5), headCy + Math.sin(da) * (haloR + 7.5), 1.8, 0, TAU);
            g.fill();
          }
        }

        // Iconic 4-point Renaissance star flare twinkling on upper-right halo crown!
        if (fa > 0.55) {
          const twinkle = 0.78 + 0.22 * Math.sin(t * 4.2);
          this.drawStarFlare(g, cx + haloR * 0.74, headCy - haloR * 0.68, 16 * twinkle, (fa - 0.4) * 1.6);
          this.drawStarFlare(g, cx - haloR * 0.82, headCy + haloR * 0.22, 8.5 * (1.2 - twinkle * 0.3), (fa - 0.55) * 1.4);
        }
      }

      // Live radial PROGRESS arc around outer halo track!
      if (showProgress) {
        const pr = clamp(this._progress);
        const pR = haloR + 8;
        const startA = -Math.PI * 0.5;
        const endA = startA + TAU * pr;
        g.globalAlpha = 0.22;
        g.strokeStyle = '#92A2C8';
        g.lineWidth = 2.2;
        g.beginPath(); g.arc(cx, headCy, pR, 0, TAU); g.stroke();

        g.globalAlpha = 0.96;
        const pg = g.createLinearGradient(cx, headCy - pR, cx, headCy + pR);
        pg.addColorStop(0, '#3CF8F2');
        pg.addColorStop(0.55, '#FF8CD6');
        pg.addColorStop(1, '#FFF1A6');
        g.strokeStyle = pg;
        g.shadowColor = '#46FAF4';
        g.shadowBlur = 10;
        g.lineWidth = 3.0;
        g.lineCap = 'round';
        g.beginPath(); g.arc(cx, headCy, pR, startA, endA); g.stroke();

        // Luminous leading bead at arc tip
        const bx = cx + Math.cos(endA) * pR;
        const by = headCy + Math.sin(endA) * pR;
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.arc(bx, by, 3.2, 0, TAU); g.fill();
      }
      g.restore();
    }

    // =====================================================================
    // 5. VOLUMETRIC INNER DREAM CORE (shines PHYSICALLY through open 3D slab gaps!)
    // =====================================================================
    if (sliceGap > 0.06 || errorMix > 0.15) {
      const coreStrength = clamp(sliceGap * 0.95 + errorMix * 0.55);
      g.save();
      // Vertical glowing energy column tucked right inside the sculpture's spine
      const coreTop = bustY + drawH * 0.16;
      const coreBot = bustY + drawH * 0.64;
      const cg = g.createRadialGradient(cx, (coreTop + coreBot) * 0.5, 4, cx, (coreTop + coreBot) * 0.5, 48);
      if (errorMix > 0.45) {
        cg.addColorStop(0, `rgba(255, 190, 225, ${(0.88 * coreStrength).toFixed(3)})`);
        cg.addColorStop(0.35, `rgba(255, 52, 128, ${(0.62 * coreStrength).toFixed(3)})`);
        cg.addColorStop(1, 'rgba(255, 52, 128, 0)');
      } else {
        cg.addColorStop(0, `rgba(255, 255, 255, ${(0.92 * coreStrength).toFixed(3)})`);
        cg.addColorStop(0.28, `rgba(74, 250, 244, ${(0.72 * coreStrength).toFixed(3)})`);
        cg.addColorStop(0.62, `rgba(255, 118, 206, ${(0.38 * coreStrength).toFixed(3)})`);
        cg.addColorStop(1, 'rgba(255, 118, 206, 0)');
      }
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(cx, (coreTop + coreBot) * 0.5, 34, (coreBot - coreTop) * 0.62, 0, 0, TAU);
      g.fill();

      // Three crisp horizontal luminous seam beams aligned accurately to the 3 parted 3D marble gaps!
      const seamFracs = [0.196, 0.382, 0.563];
      for (let i = 0; i < seamFracs.length; i++) {
        const sy = bustY + drawH * seamFracs[i];
        const sw = (i === 2 ? 46 : 36) * (0.85 + 0.15 * Math.sin(t * 4.2 + i * 1.9));
        const sg = g.createRadialGradient(cx, sy, 2, cx, sy, sw);
        sg.addColorStop(0, `rgba(255, 255, 255, ${(0.95 * coreStrength).toFixed(3)})`);
        sg.addColorStop(0.42, i % 2 === 0
          ? `rgba(56, 250, 246, ${(0.78 * coreStrength).toFixed(3)})`
          : `rgba(255, 116, 208, ${(0.78 * coreStrength).toFixed(3)})`);
        sg.addColorStop(1, 'rgba(56, 250, 246, 0)');
        g.fillStyle = sg;
        g.beginPath();
        g.ellipse(cx, sy, sw, 6.5 * coreStrength + 2, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }

    // =====================================================================
    // 6. SLOWLY ROTATING 3D WEBGL2 CARRARA MARBLE SCULPTURE (4-SLAB SHADER!)
    // =====================================================================
    const fx = {
      sliceGap: GP.reducedMotion ? sliceGap * 0.45 : sliceGap,
      sliceTwist,
      wireMix,
      scanY,
      holoMix,
      writeMix,
      errorFrac: errorMix,
      glowFlash: this.glowFlash,
      time: t,
    };
    if (ready(PLATES.statueBust) && ready(PLATES.statueDepth)) {
      const splitAmt = errorMix > 0.15
        ? 7.5 + errorMix * 5.0 + Math.abs(Math.sin(t * 28)) * 4.2 * errorMix
        : sliceGap * 4.5 + wireMix * 6.5 + holoMix * 4.2 * Math.abs(Math.sin(t * 4.8)) + writeMix * 2.2;

      // Chromatic 3D RGB ghost passes (fractured & counter-rotated in exact 3D lockstep!)
      if (splitAmt > 0.35 && !GP.reducedMotion) {
        g.save();
        g.globalAlpha = errorMix > 0.2 ? 0.64 : 0.46;
        const glPink = renderStatue3D(yaw - 0.036, pitch, roll, [1.0, 0.24, 0.72, 0.94], fx);
        if (glPink) g.drawImage(glPink, bustX - splitAmt, bustY - splitAmt * 0.2, drawW, drawH);
        g.globalAlpha = errorMix > 0.2 ? 0.64 : 0.48;
        const glCyan = renderStatue3D(yaw + 0.036, pitch, roll, [0.16, 0.97, 0.94, 0.94], fx);
        if (glCyan) g.drawImage(glCyan, bustX + splitAmt, bustY + splitAmt * 0.2, drawW, drawH);
        g.restore();
      }

      // TOOL: stepped translucent lilac/cyan 3D hologram echoes!
      if (holoMix > 0.12 && !GP.reducedMotion) {
        const stepPulse = Math.abs(Math.sin(t * 4.4)) * holoMix;
        g.save();
        g.globalAlpha = 0.32 * holoMix;
        const glLilac = renderStatue3D(yaw - 0.075 * stepPulse, pitch, roll, [0.72, 0.56, 1.0, 0.96], fx);
        if (glLilac) g.drawImage(glLilac, bustX - 11 * stepPulse, bustY + 2.5 * stepPulse, drawW, drawH);
        const glAqua = renderStatue3D(yaw + 0.075 * stepPulse, pitch, roll, [0.24, 0.98, 0.94, 0.96], fx);
        if (glAqua) g.drawImage(glAqua, bustX + 11 * stepPulse, bustY - 2.5 * stepPulse, drawW, drawH);
        g.restore();
      }

      // Primary 3D marble pass with full sculptural slicing, wireframe scan & hologram glass!
      const glCore = renderStatue3D(yaw, pitch, roll, [1, 1, 1, 0], fx);
      if (glCore) {
        g.drawImage(glCore, bustX, bustY, drawW, drawH);
      } else {
        const fw = 112, fh = 172;
        g.drawImage(PLATES.statueBust, cx - fw * 0.5, baseCy - hoverH - fh + 8, fw, fh);
      }

      // SEARCHING: subtle outer laser emitter brackets flanking the active 3D scan plane!
      if (glCore && wireMix > 0.2 && !GP.reducedMotion) {
        const beamY = bustY + drawH * lerp(0.10, 0.90, scanY);
        g.save();
        g.globalAlpha = wireMix * 0.88;
        g.strokeStyle = '#36FAF4';
        g.shadowColor = '#36FAF4';
        g.shadowBlur = 10;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(bustX - 10, beamY); g.lineTo(bustX + 18, beamY);
        g.moveTo(bustX + drawW - 18, beamY); g.lineTo(bustX + drawW + 10, beamY);
        g.stroke();
        g.fillStyle = '#FF58C6';
        g.fillRect(bustX - 13, beamY - 2, 4, 4);
        g.fillRect(bustX + drawW + 9, beamY - 2, 4, 4);
        g.restore();
      }
    } else if (ready(PLATES.statueBust)) {
      const fw = 112, fh = 172;
      g.drawImage(PLATES.statueBust, cx - fw * 0.5, baseCy - hoverH - fh + 8, fw, fh);
    }

    // =====================================================================
    // 7. RISING LUMINOUS GLYPHS & PASTEL MARBLE DUST MOTES (WRITING / PULSE)
    // =====================================================================
    if (this.motes.length) {
      g.save();
      for (const m of this.motes) {
        const p = clamp(m.age / m.life);
        const fade = Math.sin(p * Math.PI);
        const mx = cx + m.ox + m.vx * m.age + Math.sin(t * 3.4 + m.phase) * 5.5;
        const my = bustY + drawH * m.seamY + m.vy * m.age;
        g.globalAlpha = fade * 0.94;
        if (m.glyph) {
          g.font = `700 ${m.size.toFixed(1)}px 'IBM Plex Mono', monospace`;
          g.lineWidth = 2.2;
          g.strokeStyle = 'rgba(34, 22, 62, 0.55)';
          g.strokeText(m.glyph, mx, my);
          g.fillStyle = m.color;
          g.shadowColor = m.color;
          g.shadowBlur = 7;
          g.fillText(m.glyph, mx, my);
        } else {
          g.fillStyle = m.color;
          g.shadowColor = m.color;
          g.shadowBlur = 8;
          g.beginPath();
          g.moveTo(mx, my - m.size);
          g.lineTo(mx + m.size * 0.85, my);
          g.lineTo(mx, my + m.size);
          g.lineTo(mx - m.size * 0.85, my);
          g.closePath();
          g.fill();
          g.strokeStyle = 'rgba(34, 22, 62, 0.35)';
          g.lineWidth = 0.8;
          g.stroke();
        }
      }
      g.restore();
    }

    // =====================================================================
    // 8. FRONT-ARC 3D ORBITING MICRO-ARTIFACTS PASSING IN FRONT OF STATUE
    // =====================================================================
    for (const art of artifacts) if (art.z >= 0) this.drawMicroArtifact(g, art, t);
  }
}
define('paradise-statue', VpStatueAgent);
