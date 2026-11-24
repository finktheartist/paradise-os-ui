// =========================================================================
// 8. <paradise-cd-dial> — Holographic CD-ROM Synthwave Hip-Hop Track Jukebox Dial
//    Real macro-photographed 1995 holographic CD-ROM disc over fluted marble
//    platter with 5 Synthwave Hip-Hop track sectors (01..05), radial laser pickup
//    arm seeking across concentric disc grooves, live audio playback + scratch!
// =========================================================================
const CD_SPARK_GLYPHS = ['0x95', '808', '✦', 'TRK', 'VHS', '::'];
const FALLBACK_TRACKS = [
  { id: 'trk-01', code: '01', title: 'NEON BOULEVARD', sub: '92 BPM · D MIN', bpm: 92, accent: ['#38F6F0', '#F69CD8'] },
  { id: 'trk-02', code: '02', title: 'CHROME 808',     sub: '86 BPM · F MIN', bpm: 86, accent: ['#B292FF', '#FF66C4'] },
  { id: 'trk-03', code: '03', title: 'PALM DRIFT',     sub: '98 BPM · A MIN', bpm: 98, accent: ['#3CF8E8', '#FFC694'] },
  { id: 'trk-04', code: '04', title: 'MIDNIGHT VHS',   sub: '80 BPM · C MIN', bpm: 80, accent: ['#9B88FA', '#5CF5F0'] },
  { id: 'trk-05', code: '05', title: 'HELIOS TAPE',    sub: '104 BPM · G MIN', bpm: 104, accent: ['#FFE08A', '#44F6F0'] },
];
const getTracks = () => (SND && Array.isArray(SND.TRACKS) && SND.TRACKS.length ? SND.TRACKS : FALLBACK_TRACKS);

class VpCdromDial extends Base {
  static delegates = true;
  static formAssociated = true;
  static observedAttributes = ['track', 'playing'];
  static css = `
    :host { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; }
    .stage {
      position: relative; width: 268px; height: 244px;
      cursor: grab; user-select: none; touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .stage:active { cursor: grabbing; }
    /* keyboard focus only: a press focuses the dial too, and the ring should not circle it while you turn it */
    .stage:focus { outline: none; }
    .stage:focus-visible:not([data-pointer]) { outline: 2px solid #3CEBE2; outline-offset: 6px; border-radius: 50%; }
    canvas {
      position: absolute; left: -46px; top: -16px;
      width: 360px; height: 276px; pointer-events: none;
    }
  `;
  render() {
    return `<div class="stage" role="slider" tabindex="0" aria-label="Holographic CD-ROM Synthwave Hip-Hop Track Selector (Tracks 1 to 5)" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1"><canvas aria-hidden="true"></canvas></div>`;
  }
  setup() {
    this.el = this.$('.stage');
    this.cv = this.$('canvas');
    // tracks="folder/": where trk-01.mp3 ... trk-05.mp3 live; without it each track is a synthesized beat
    if (this.hasAttribute('tracks')) SND?.loadTracks?.(this.getAttribute('tracks'));
    const tracks = getTracks();
    this._track = clamp(Number(this.getAttribute('track') ?? 0) | 0, 0, tracks.length - 1);
    this._dialPos = this._track; // continuous 0..4 while scrubbing
    this._playing = this.getAttribute('playing') === 'true';

    this.dialSpr = new Spring(this._track, 210, 19);
    this.playSpr = new Spring(this._playing ? 1 : 0, 150, 17);
    this.armSpr = new Spring(this._playing ? 1 : 0.32, 165, 18);
    this.grooveSpr = new Spring(this._track / Math.max(1, tracks.length - 1), 160, 18);
    this.hoverSpr = new Spring(0, 210, 19);
    this.hubPress = new Spring(0, 380, 24);
    this.badgeSpr = new Spring(1, 210, 19);
    this.realitySpr = new Spring(bus.state.paradise ? 0 : 1, 180, 19);
    this.lookX = new Spring(0, 130, 18);
    this.lookY = new Spring(0, 130, 18);

    this.discAngle = 0;
    this.angVel = this._playing ? 2.4 : 0.42;
    this.scratchGlitch = 0;
    this.readErr = 0;
    this.switchFlash = 0;
    this.sparks = [];
    this._sparkAcc = 0;
    this.sectorFlash = new Float32Array(5);
    this.sectorFlash[this._track] = 1.0;

    this.dragging = false;
    this.dragMode = null; // 'hub' | 'dial'
    this.dragStartY = 0;
    this.dragStartPos = 0;
    this.lastPointerAng = 0;

    const relToCenter = (e) => {
      const r = this.el.getBoundingClientRect();
      const s = r.width / (this.el.offsetWidth || r.width) || 1; // CSS zoom or a transform scales the drawing
      // Match canvas center (cx = W*0.5 - 10, cy = H*0.5 + 4; canvas left=-46, top=-16)
      const cx = r.left + ((360 * 0.5 - 10) - 46) * s;
      const cy = r.top + ((276 * 0.5 + 4) - 16) * s;
      return [(e.clientX - cx) / s, (e.clientY - cy) / s];
    };

    const angleToTrackFloat = (dx, dy) => {
      // Arc spans -135 deg (-2.356 rad) at bottom-left through -90 deg (top) to +45 deg (+0.785 rad) bottom-right
      let a = Math.atan2(dy, dx);
      // Unwrap bottom-left quadrant (a > PI*0.5 maps into [-1.5*PI, -PI])
      if (a > Math.PI * 0.5) a -= TAU;
      const minA = -Math.PI * 1.25;
      const maxA =  Math.PI * 0.25;
      return clamp((a - minA) / (maxA - minA), 0, 1) * (getTracks().length - 1);
    };

    this.el.addEventListener('pointerenter', () => { this.hoverSpr.to = 1; start(); });
    this.el.addEventListener('pointerleave', () => {
      this.hoverSpr.to = 0;
      this.lookX.to = 0; this.lookY.to = 0;
      start();
    });
    this.el.addEventListener('pointermove', (e) => {
      const [dx, dy] = relToCenter(e);
      this.lookX.to = clamp(dx / 110, -1, 1);
      this.lookY.to = clamp(dy / 110, -1, 1);
      if (!this.dragging || this.dragMode !== 'dial') { start(); return; }

      const ang = Math.atan2(dy, dx);
      let dAng = ang - this.lastPointerAng;
      if (dAng > Math.PI) dAng -= TAU;
      if (dAng < -Math.PI) dAng += TAU;
      this.lastPointerAng = ang;

      const maxIdx = getTracks().length - 1;
      const dist = Math.hypot(dx, dy);
      let nextPos;
      if (dist > 28) {
        // Smooth circular rotation across the 5 synthwave hip-hop sectors!
        nextPos = clamp(this._dialPos + (dAng / (Math.PI * 0.36)), 0, maxIdx);
      } else {
        const dY = this.dragStartY - e.clientY;
        nextPos = clamp(this.dragStartPos + dY * 0.028, 0, maxIdx);
      }
      this._scrubDial(nextPos, Math.abs(dAng) * 14);
    });

    this.el.addEventListener('keydown', () => { delete this.el.dataset.pointer; }, true);
    this.el.addEventListener('pointerdown', (e) => {
      this.el.dataset.pointer = '';
      this.el.focus();
      this.el.setPointerCapture(e.pointerId);
      const [dx, dy] = relToCenter(e);
      const dist = Math.hypot(dx, dy);
      this.dragging = true;
      if (dist < 24) {
        this.dragMode = 'hub';
        this.hubPress.to = 1;
      } else if (dist >= 88 && dist <= 132) {
        // Clicking directly on one of the 5 glowing outer track ticks jumps straight to that track!
        const clickedTrack = Math.round(angleToTrackFloat(dx, dy));
        this.dragMode = 'dial';
        this.dragStartY = e.clientY;
        this.dragStartPos = clickedTrack;
        this.lastPointerAng = Math.atan2(dy, dx);
        this.selectTrack(clickedTrack, { autoPlay: true, kick: 0.7 });
      } else {
        this.dragMode = 'dial';
        this.dragStartY = e.clientY;
        this.dragStartPos = this._dialPos;
        this.lastPointerAng = Math.atan2(dy, dx);
      }
      start();
    });

    const endPtr = () => {
      if (!this.dragging) return;
      const mode = this.dragMode;
      this.dragging = false;
      this.dragMode = null;
      this.hubPress.to = 0;
      if (mode === 'hub') {
        this.togglePlay();
      } else {
        // Snap dial cleanly into the nearest track's magnetic detent!
        this._dialPos = this._track;
        this.dialSpr.to = this._track;
        this.emit('change', this._detail());
      }
      start();
    };
    this.el.addEventListener('pointerup', endPtr);
    this.el.addEventListener('pointercancel', endPtr);

    this.el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const maxIdx = getTracks().length - 1;
      const next = clamp(this._track + (e.deltaY < 0 ? 1 : -1), 0, maxIdx);
      this.selectTrack(next, { autoPlay: true, kick: 0.65 });
    }, { passive: false });

    this.el.addEventListener('keydown', (e) => {
      const maxIdx = getTracks().length - 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.selectTrack(clamp(this._track + 1, 0, maxIdx), { autoPlay: true }); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.selectTrack(clamp(this._track - 1, 0, maxIdx), { autoPlay: true }); }
      else if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
      else if (e.key >= '1' && e.key <= '5') { e.preventDefault(); this.selectTrack(Number(e.key) - 1, { autoPlay: true }); }
    });

    this._unsubReality = bus.on('reality', ({ paradise }) => {
      this.realitySpr.to = paradise ? 0 : 1;
      this.scratchGlitch = Math.max(this.scratchGlitch, 0.45);
      start();
    });
    this._unsubAgent = bus.on('agent', ({ state }) => {
      if (state === 'error') this.triggerReadError();
      else if (state === 'done') this.burstSparks(8);
    });
    this._syncUI();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubReality?.();
    this._unsubAgent?.();
  }
  _detail() {
    const trk = getTracks()[this._track] || FALLBACK_TRACKS[0];
    return {
      track: this._track,
      code: trk.code,
      title: trk.title,
      bpm: trk.bpm,
      sub: trk.sub,
      playing: this._playing,
      source: SND?.getTrackSource?.(this._track) || 'synth',
    };
  }
  get track() { return this._track; }
  set track(idx) { this.selectTrack(idx, { autoPlay: true }); }
  get playing() { return this._playing; }
  set playing(v) { this.setPlaying(!!v); }
  get spinning() { return this._playing; }
  set spinning(v) { this.setPlaying(!!v); }
  attributeChangedCallback(name, o, n) {
    if (!this._booted || o === n) return;
    if (name === 'track' && (Number(n) | 0) !== this._track) this.selectTrack(Number(n) | 0, { autoPlay: this._playing, fromAttr: true });
    if (name === 'playing') this.setPlaying(n === 'true', true);
  }
  togglePlay() {
    this.setPlaying(!this._playing);
  }
  setPlaying(on, silent = false) {
    const next = !!on;
    const changed = next !== this._playing;
    this._playing = next;
    this.setAttribute('playing', String(next));
    this.playSpr.to = next ? 1 : 0;
    this.armSpr.to = next ? 1 : 0.28;
    const trk = getTracks()[this._track] || FALLBACK_TRACKS[0];
    if (!silent) {
      if (next) {
        SND?.cdMotor(true);
        SND?.playTrack(this._track);
      } else {
        SND?.pauseTrack();
        SND?.cdMotor(false);
      }
    }
    bus.emit('tempo', { rate: trk.bpm / 92, spinning: next, track: this._track });
    if (changed) this.emit('change', this._detail());
    this.dirty = true; start();
  }
  _scrubDial(pos, kick = 0) {
    const maxIdx = getTracks().length - 1;
    const prevPos = this._dialPos;
    this._dialPos = clamp(pos, 0, maxIdx);
    this.dialSpr.to = this._dialPos;
    const delta = this._dialPos - prevPos;
    if (!GP.reducedMotion && Math.abs(delta) > 0.005) {
      this.angVel += delta * 6.5;
      if (Math.abs(delta) > 0.35 || kick > 1.35) {
        this.scratchGlitch = clamp(this.scratchGlitch + 0.35);
      }
    }
    const snapped = clamp(Math.round(this._dialPos), 0, maxIdx);
    if (snapped !== this._track) {
      this.selectTrack(snapped, { autoPlay: true, kick: 0.9, keepDialPos: true });
    }
    this.dirty = true; start();
  }
  selectTrack(idx, { autoPlay = true, kick = 0.7, fromAttr = false, keepDialPos = false } = {}) {
    const tracks = getTracks();
    const next = clamp(idx | 0, 0, tracks.length - 1);
    const prev = this._track;
    const switched = next !== prev;
    this._track = next;
    if (!keepDialPos) {
      this._dialPos = next;
      this.dialSpr.to = next;
    }
    this.grooveSpr.to = next / Math.max(1, tracks.length - 1);
    this.sectorFlash[next] = 1.0;
    this.switchFlash = 1.0;
    this.badgeSpr.to = 1;

    if (!fromAttr) this.setAttribute('track', String(next));
    if (switched && !GP.reducedMotion) {
      this.angVel += (next > prev ? 5.2 : -5.2) * kick;
      this.scratchGlitch = Math.max(this.scratchGlitch, 0.55);
      this.burstSparks(6);
    }

    const trk = tracks[next];
    if (!fromAttr) {
      SND?.cdTick(next + 1);
      const wasPlaying = this._playing;
      if (autoPlay) {
        this._playing = true;
        this.setAttribute('playing', 'true');
        this.playSpr.to = 1;
        this.armSpr.to = 1;
      }
      // Only (re)start audio on a real track switch or when starting from pause,
      // so re-selecting the playing track never restarts the song.
      if (this._playing && (switched || !wasPlaying)) SND?.playTrack(next);
    }
    this._syncUI();
    bus.emit('tempo', { rate: trk.bpm / 92, spinning: this._playing, track: next });
    this.emit('input', this._detail());
    if (switched) this.emit('track-change', this._detail());
    this.dirty = true; start();
  }
  triggerReadError() {
    this.readErr = 1.0;
    this.scratchGlitch = Math.max(this.scratchGlitch, 0.85);
    this.angVel -= 6.5;
    this.burstSparks(6, true);
    this.dirty = true; start();
  }
  scratchPulse(dir = 1) {
    this.angVel += dir * 13.5;
    this.scratchGlitch = 0.95;
    SND?.cdScratch(0.9);
    this.burstSparks(7);
    this.dirty = true; start();
  }
  burstSparks(count = 5, err = false) {
    if (GP.reducedMotion) return;
    const trk = getTracks()[this._track] || FALLBACK_TRACKS[0];
    for (let i = 0; i < count; i++) {
      const glyph = Math.random() < 0.34 ? CD_SPARK_GLYPHS[Math.floor(Math.random() * CD_SPARK_GLYPHS.length)] : null;
      this.sparks.push({
        ox: (Math.random() - 0.5) * 24,
        oy: (Math.random() - 0.5) * 14,
        vx: 16 + Math.random() * 34,
        vy: -(30 + Math.random() * 38),
        glyph,
        color: err ? '#FF4080' : (i % 3 === 0 ? trk.accent[0] : i % 3 === 1 ? trk.accent[1] : '#FFFFFF'),
        size: glyph ? 7.5 : 2.3 + Math.random() * 1.7,
        age: 0,
        life: 0.68 + Math.random() * 0.38,
      });
    }
    if (this.sparks.length > 24) this.sparks.splice(0, this.sparks.length - 24);
  }
  _syncUI() {
    const trk = getTracks()[this._track] || FALLBACK_TRACKS[0];
    this.el.setAttribute('aria-valuenow', String(this._track + 1));
    this.el.setAttribute('aria-valuetext', `Track ${trk.code}: ${trk.title}`);
    if (this.internals) this.internals.setFormValue(trk.id);
  }
  frame(dt, t) {
    this.dialSpr.step(dt);
    this.playSpr.step(dt);
    this.armSpr.step(dt);
    this.grooveSpr.step(dt);
    this.hoverSpr.step(dt);
    this.hubPress.step(dt);
    this.badgeSpr.step(dt);
    this.realitySpr.step(dt);
    this.lookX.step(dt);
    this.lookY.step(dt);

    if (this.scratchGlitch > 0) this.scratchGlitch = Math.max(0, this.scratchGlitch - dt * 2.1);
    if (this.readErr > 0) this.readErr = Math.max(0, this.readErr - dt * 0.72);
    if (this.switchFlash > 0) this.switchFlash = Math.max(0, this.switchFlash - dt * 2.3);
    for (let i = 0; i < 5; i++) {
      if (this.sectorFlash[i] > 0) this.sectorFlash[i] = Math.max(0, this.sectorFlash[i] - dt * 2.2);
    }

    const tracks = getTracks();
    const trk = tracks[this._track] || FALLBACK_TRACKS[0];
    const bpmFactor = trk.bpm / 92;

    // True flywheel motor + inertia physics! Gentle holographic idle drift when paused, BPM-locked spin when playing!
    const targetVel = this._playing ? (2.35 * bpmFactor) : 0.38;
    this.angVel = lerp(this.angVel, targetVel, clamp(dt * (this._playing ? 3.5 : 3.2), 0, 1));
    if (!GP.reducedMotion) this.discAngle += this.angVel * dt;

    // Live audio beat energy pulse from Web Audio Analyser when playing!
    const fft = SND?.getBands7?.();
    const bassEnergy = fft ? (fft[0] * 0.65 + fft[1] * 0.35) : (this._playing ? (0.45 + 0.35 * Math.sin(t * (trk.bpm / 60) * Math.PI)) : 0);

    // Ambient optical laser sector sparks when playing!
    if (this._playing && !GP.reducedMotion) {
      const rate = 2.0 + bassEnergy * 3.2;
      this._sparkAcc += dt * rate;
      while (this._sparkAcc >= 1) {
        this._sparkAcc -= 1;
        this.burstSparks(1, this.readErr > 0.3);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].age += dt;
      if (this.sparks[i].age >= this.sparks[i].life) this.sparks.splice(i, 1);
    }

    const [g, W, H] = fit(this.cv);
    g.clearRect(0, 0, W, H);
    const cx = W * 0.5 - 10;
    const cy = H * 0.5 + 4;
    const discR = 76;
    const playAmt = clamp(this.playSpr.x, 0, 1);
    const arm = clamp(this.armSpr.x, 0, 1);
    const groove = clamp(this.grooveSpr.x, 0, 1);
    const reality = clamp(this.realitySpr.x, 0, 1);
    const gl = this.scratchGlitch;
    const dark = document.body.classList.contains('surf-indigo');
    const [colA, colB] = reality > 0.5 ? ['#2868D8', '#68B4FF'] : trk.accent;

    // 1. Subtle fluted Carrara marble base platter framing the levitating optical disc!
    if (ready(PLATES.marbleRing)) {
      g.save();
      drawContactShadow(g, () => {
        g.save();
        if (reality > 0.05) g.filter = `saturate(${(1 - reality * 0.8).toFixed(2)})`;
        g.drawImage(PLATES.marbleRing, cx - 94, cy - 94, 188, 188);
        g.restore();
      }, 3, 10, 18, 0.22);
      g.restore();
    }

    // 2. Calibrated 5-Track Synthwave Hip-Hop Selector Arc (01 · 02 · 03 · 04 · 05)
    const arcR = 102;
    const minA = -Math.PI * 1.25;
    const maxA =  Math.PI * 0.25;
    const maxIdx = Math.max(1, tracks.length - 1);
    const dialNorm = clamp(this.dialSpr.x / maxIdx, 0, 1);
    const curA = lerp(minA, maxA, dialNorm);

    g.save();
    g.strokeStyle = dark ? 'rgba(190, 178, 224, 0.24)' : 'rgba(116, 102, 148, 0.24)';
    g.lineWidth = 3.4;
    g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, arcR, minA, maxA); g.stroke();

    // Active neon synthwave progress arc from Track 01 up to the active track!
    const ag = g.createLinearGradient(cx - arcR, cy, cx + arcR, cy);
    ag.addColorStop(0, colA);
    ag.addColorStop(1, colB);
    g.strokeStyle = ag;
    g.shadowColor = colA;
    g.shadowBlur = 10 + bassEnergy * 6;
    g.lineWidth = 4.0;
    g.beginPath();
    g.arc(cx, cy, arcR, minA, Math.max(minA + 0.04, curA));
    g.stroke();
    g.shadowBlur = 0;

    // 5 Crisp Numbered Track Detents (01..05) + fine sub-ticks between them!
    g.font = "700 9.2px 'IBM Plex Mono', monospace";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < tracks.length; i++) {
      const a = lerp(minA, maxA, i / maxIdx);
      const isSel = i === this._track;
      const flash = this.sectorFlash[i];
      const r0 = arcR + 4;
      const r1 = arcR + (isSel ? 12.5 : 9.5);
      g.strokeStyle = isSel ? colA : (dark ? 'rgba(216, 206, 240, 0.50)' : 'rgba(98, 84, 132, 0.52)');
      g.lineWidth = isSel ? 2.6 : 1.5;
      g.shadowColor = isSel ? colA : 'transparent';
      g.shadowBlur = isSel ? 8 + flash * 8 : 0;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();

      // Crisp track number caption outside each detent (01..05)
      const lr = arcR + 22;
      const lx = cx + Math.cos(a) * lr;
      const ly = cy + Math.sin(a) * lr;
      g.shadowBlur = 0;
      g.fillStyle = isSel
        ? (dark ? '#FFFFFF' : '#241A36')
        : (dark ? 'rgba(232, 224, 248, 0.56)' : 'rgba(84, 70, 114, 0.68)');
      g.fillText(tracks[i].code, lx, ly);

      // Subtle mid-detent hairlines between tracks
      if (i < maxIdx) {
        const ma = lerp(minA, maxA, (i + 0.5) / maxIdx);
        g.strokeStyle = dark ? 'rgba(196, 186, 226, 0.25)' : 'rgba(112, 98, 146, 0.28)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(cx + Math.cos(ma) * (arcR + 4), cy + Math.sin(ma) * (arcR + 4));
        g.lineTo(cx + Math.cos(ma) * (arcR + 7.5), cy + Math.sin(ma) * (arcR + 7.5));
        g.stroke();
      }
    }

    // Luminous track selector bead riding the arc!
    const bx = cx + Math.cos(curA) * arcR;
    const by = cy + Math.sin(curA) * arcR;
    g.fillStyle = '#FFFFFF';
    g.strokeStyle = colA;
    g.lineWidth = 2.4;
    g.shadowColor = colA;
    g.shadowBlur = 10;
    g.beginPath(); g.arc(bx, by, 4.8 + this.switchFlash * 1.6, 0, TAU); g.fill(); g.stroke();
    g.restore();

    // 3. Levitating Height-Coupled Shadow + Beat-Reactive Track Aura beneath the spinning CD!
    const bob = GP.reducedMotion ? 0 : Math.sin(t * 2.2) * (1.2 + playAmt * 1.4);
    const liftY = -(2.5 + playAmt * 4.5 + this.hoverSpr.x * 2 + bassEnergy * 1.8) + bob;
    const dy = cy + liftY;

    if (playAmt > 0.04 || this.switchFlash > 0.04) {
      g.save();
      const auraR = discR + 14 + bassEnergy * 10;
      const rg = g.createRadialGradient(cx, dy, discR * 0.68, cx, dy, auraR);
      const aAlpha = clamp((0.34 * playAmt + 0.26 * bassEnergy + 0.28 * this.switchFlash), 0, 0.78);
      rg.addColorStop(0, colA + Math.round(aAlpha * 165).toString(16).padStart(2, '0'));
      rg.addColorStop(0.55, colB + Math.round(aAlpha * 95).toString(16).padStart(2, '0'));
      rg.addColorStop(1, 'rgba(52, 248, 244, 0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx, dy, auraR, 0, TAU); g.fill();
      g.restore();
    }

    // Grounded studio shadow on marble platter
    g.save();
    const shG = g.createRadialGradient(cx + 3, cy + 7, discR * 0.25, cx + 3, cy + 7, discR * 1.06);
    shG.addColorStop(0, 'rgba(26, 18, 46, 0.30)');
    shG.addColorStop(0.75, 'rgba(26, 18, 46, 0.16)');
    shG.addColorStop(1, 'rgba(26, 18, 46, 0)');
    g.fillStyle = shG;
    g.beginPath(); g.arc(cx + 3, cy + 7, discR * 1.06, 0, TAU); g.fill();
    g.restore();

    // 4. REAL MACRO-PHOTOGRAPHED 1995 HOLOGRAPHIC SILVER CD-ROM DISC!
    if (ready(PLATES.cdDisc)) {
      // Track-Switch / Scratch RGB Chromatic Ghost Discs!
      if (gl > 0.06 && !GP.reducedMotion) {
        const off = gl * 8.5;
        drawTintedPlate(g, PLATES.cdDisc, cx - discR - off, dy - discR - 1.5, discR * 2, discR * 2, '#FF3EC0', gl * 0.65);
        drawTintedPlate(g, PLATES.cdDisc, cx - discR + off, dy - discR + 1.5, discR * 2, discR * 2, '#24F8F0', gl * 0.68);
      }

      // Primary rotating real photographed CD-ROM plate!
      g.save();
      g.translate(cx, dy);
      g.rotate(this.discAngle);
      if (reality > 0.05) g.filter = `saturate(${(1 - reality * 0.85).toFixed(2)})`;
      g.drawImage(PLATES.cdDisc, -discR, -discR, discR * 2, discR * 2);
      g.restore();

      // Subtle glowing concentric track groove ring highlighting the active song band on the CD!
      g.save();
      const activeRingR = lerp(discR * 0.44, discR * 0.88, groove);
      g.strokeStyle = colA;
      g.globalAlpha = (0.28 + playAmt * 0.38 + this.switchFlash * 0.32) * (1 - reality * 0.4);
      g.lineWidth = 1.6 + bassEnergy * 1.2;
      g.shadowColor = colA;
      g.shadowBlur = 8;
      g.beginPath(); g.arc(cx, dy, activeRingR, 0, TAU); g.stroke();
      g.restore();

      // Live Pointer-Reactive Optical Rainbow Diffraction Cones!
      if (reality < 0.85) {
        g.save();
        g.beginPath();
        g.arc(cx, dy, discR * 0.96, 0, TAU, false);
        g.arc(cx, dy, discR * 0.34, 0, TAU, true);
        g.clip('evenodd');
        const glintAng = -0.65 + this.lookX.x * 0.55 - this.lookY.x * 0.35 + Math.sin(t * 1.1) * 0.14;
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = (0.30 + playAmt * 0.14 + bassEnergy * 0.14) * (1 - reality);
        g.save();
        g.translate(cx, dy);
        g.rotate(glintAng);
        g.beginPath();
        g.moveTo(0, 0); g.arc(0, 0, discR, -0.36, 0.36); g.closePath();
        g.moveTo(0, 0); g.arc(0, 0, discR, Math.PI - 0.36, Math.PI + 0.36); g.closePath();
        g.clip();
        drawRealHoloFoil(g, -discR, -discR, discR * 2, discR * 2, t * 1.15, this._track * 0.9);
        g.restore();
        g.restore();
      }

      // REALITY.SYS Mode: crisp 1995 ISO-9660 radial sector-map wireframe overlay!
      if (reality > 0.04) {
        g.save();
        g.beginPath();
        g.arc(cx, dy, discR * 0.96, 0, TAU, false);
        g.arc(cx, dy, discR * 0.32, 0, TAU, true);
        g.clip('evenodd');
        g.globalAlpha = reality * 0.78;
        drawCheckerboard(g, cx - discR, dy - discR, discR * 2, discR * 2, 7, '#1B2844', '#2A3F68');
        g.strokeStyle = '#6AE8FF';
        g.lineWidth = 1;
        for (const rf of [0.44, 0.55, 0.66, 0.77, 0.88]) {
          g.beginPath(); g.arc(cx, dy, discR * rf, 0, TAU); g.stroke();
        }
        for (let s = 0; s < 12; s++) {
          const sa = this.discAngle * 0.4 + (s / 12) * TAU;
          g.beginPath();
          g.moveTo(cx + Math.cos(sa) * discR * 0.33, dy + Math.sin(sa) * discR * 0.33);
          g.lineTo(cx + Math.cos(sa) * discR * 0.96, dy + Math.sin(sa) * discR * 0.96);
          g.stroke();
        }
        g.restore();
      }

      // Pixel-sort laser skip tear on fast scratches & track seeks!
      if (gl > 0.14 && !GP.reducedMotion) {
        drawPlatePixelSort(g, PLATES.cdDisc, cx - discR * 0.8, dy - 22, discR * 1.6, 44, gl * 0.85, Math.floor(t * 32), {
          spillX: 22, bands: 6, dir: this.angVel >= 0 ? 1 : -1,
        });
      }
    }

    // 5. Tactile Center Spindle Clamping Hub Button (Click to Play / Pause Synthwave Hip-Hop!)
    const hubR = 17.5 * (1 - this.hubPress.x * 0.08);
    g.save();
    const hg = g.createRadialGradient(cx - 5, dy - 5, 2, cx, dy, hubR);
    hg.addColorStop(0, '#FFFFFF');
    hg.addColorStop(0.55, '#E4DEE8');
    hg.addColorStop(1, '#9E96AD');
    g.fillStyle = hg;
    g.shadowColor = 'rgba(28, 20, 48, 0.32)';
    g.shadowBlur = 7;
    g.shadowOffsetY = 2.5;
    g.beginPath(); g.arc(cx, dy, hubR, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = this._playing ? colA : '#B4AABF';
    g.lineWidth = this._playing ? 2.2 : 1.6;
    g.stroke();

    // Play / Pause micro-icon centered inside chrome spindle cap
    g.fillStyle = '#2B213E';
    if (this._playing) {
      g.fillRect(cx - 4.2, dy - 4.8, 3, 9.6);
      g.fillRect(cx + 1.4, dy - 4.8, 3, 9.6);
    } else {
      g.beginPath();
      g.moveTo(cx - 3.2, dy - 5.4);
      g.lineTo(cx + 6.2, dy);
      g.lineTo(cx - 3.2, dy + 5.4);
      g.closePath();
      g.fill();
    }
    g.restore();

    // 6. PRECISION BRUSHED-CHROME OPTICAL LASER PICKUP ARM (Physically seeks each track groove!)
    const pivX = cx + 94, pivY = cy + 68;
    const errJit = this.readErr > 0.05 ? Math.sin(t * 48) * 0.09 * this.readErr : 0;
    // Smoothly seeks radial track groove (inner Track 01 -> outer Track 05) when playing!
    const engagedAng = lerp(0.56, 0.16, groove) + (this._playing ? Math.sin(t * 0.8) * 0.025 : 0);
    const armAng = lerp(-0.18, engagedAng, arm) + errJit;
    const armLen = 84;
    const tipX = pivX - Math.cos(armAng) * armLen;
    const tipY = pivY - Math.sin(armAng) * armLen;

    g.save();
    g.strokeStyle = 'rgba(26, 18, 46, 0.24)';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(pivX + 2, pivY + 6); g.lineTo(tipX + 2, tipY + 6); g.stroke();

    const armG = g.createLinearGradient(pivX, pivY - 6, tipX, tipY + 6);
    armG.addColorStop(0, '#FFFFFF');
    armG.addColorStop(0.5, '#C8C2D2');
    armG.addColorStop(1, '#F6F2FA');
    g.strokeStyle = armG;
    g.lineWidth = 5.2;
    g.beginPath(); g.moveTo(pivX, pivY); g.lineTo(tipX, tipY); g.stroke();
    g.strokeStyle = 'rgba(54, 42, 74, 0.45)';
    g.lineWidth = 1;
    g.stroke();

    // Gimbal pivot base housing at bottom-right
    const bg = g.createRadialGradient(pivX - 4, pivY - 4, 2, pivX, pivY, 15);
    bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(0.6, '#CFC9D8'); bg.addColorStop(1, '#7D7490');
    g.fillStyle = bg;
    g.beginPath(); g.arc(pivX, pivY, 14, 0, TAU); g.fill();
    g.strokeStyle = '#3D354C'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = this._playing ? colA : '#9B94A8';
    g.beginPath(); g.arc(pivX, pivY, 4.2, 0, TAU); g.fill();

    // Optical Laser Carriage Head at arm tip
    g.save();
    g.translate(tipX, tipY);
    g.rotate(armAng);
    drawBevelBox(g, -11, -6.5, 18, 13, { fill: '#EAE5DC' });
    if (arm > 0.55) {
      const lCol = this.readErr > 0.2 ? '#FF3A78' : colA;
      g.fillStyle = lCol;
      g.shadowColor = lCol;
      g.shadowBlur = 12 + bassEnergy * 6;
      g.beginPath(); g.arc(-6, 0, 3.2 + bassEnergy * 0.8, 0, TAU); g.fill();
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.arc(-6, 0, 1.4, 0, TAU); g.fill();
    }
    g.restore();
    g.restore();

    // 7. Rising Luminous Track-Sector Sparks kicking off the laser contact point!
    if (this.sparks.length) {
      g.save();
      for (const sp of this.sparks) {
        const p = clamp(sp.age / sp.life);
        const fade = Math.sin(p * Math.PI);
        const sx = tipX + sp.ox + sp.vx * sp.age;
        const sy = tipY + sp.oy + sp.vy * sp.age;
        g.globalAlpha = fade * 0.92;
        if (sp.glyph) {
          g.font = `700 ${sp.size}px 'IBM Plex Mono', monospace`;
          g.lineWidth = 2;
          g.strokeStyle = 'rgba(30, 20, 54, 0.55)';
          g.strokeText(sp.glyph, sx, sy);
          g.fillStyle = sp.color;
          g.fillText(sp.glyph, sx, sy);
        } else {
          g.fillStyle = sp.color;
          g.shadowColor = sp.color;
          g.shadowBlur = 6;
          g.beginPath(); g.arc(sx, sy, sp.size, 0, TAU); g.fill();
        }
      }
      g.restore();
    }

    // 8. CRT-Flashing Adaptive  95-era Track Micro-Badge (TRK 01 · NEON BLVD / READ ERR!)
    if (this.readErr > 0.08) {
      drawMicroBadge(g, cx + 106, cy - 90, 'CDROM.DRV', '! READ ERR', {
        pop: clamp(this.readErr * 1.4), w: 86, h: 30, pal: ['#FF3E78', '#FF8CC4'], bodyColor: '#A8184B',
      });
    } else {
      const shortTitle = trk.title.length > 12 ? trk.title.slice(0, 11) + '…' : trk.title;
      const header = this._playing ? `▶ TRK ${trk.code}` : `II TRK ${trk.code}`;
      drawMicroBadge(g, cx + 106, cy - 90, header, shortTitle, {
        pop: clamp(this.badgeSpr.x, 0, 1), w: 92, h: 30, pal: [colA, colB],
      });
    }
  }
}
define('paradise-cd-dial', VpCdromDial);
