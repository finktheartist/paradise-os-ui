// Glitch Paradise — recorded Sample Deck + Procedural Web Audio Synthwave Hip-Hop & Foley
// Automatically loads real recorded SFX & synthwave hip-hop MP3s from audio/manifest.json when present,
// with zero-latency Web Audio synthesis & a 5-track synthwave hip-hop beat engine as seamless fallback!
(() => {
  'use strict';
  if (window.ParadiseSound) return;

  const TRACKS = [
    {
      id: 'trk-01', code: '01', title: 'NEON BOULEVARD', sub: '92 BPM · D MIN', bpm: 92,
      accent: ['#38F6F0', '#F69CD8'], file: 'audio/tracks/trk-01.mp3',
      bass: [73.42, 73.42, 58.27, 65.41], // D2, D2, Bb1, C2
      chords: [[293.66, 349.23, 440.00, 523.25], [233.08, 293.66, 349.23, 440.00], [261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00]],
      arp: [587.33, 659.25, 698.46, 880.00, 698.46, 659.25, 587.33, 523.25],
      kickPat:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,1],
      snarePat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hatPat:   [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,1,1,0],
    },
    {
      id: 'trk-02', code: '02', title: 'CHROME 808', sub: '86 BPM · F MIN', bpm: 86,
      accent: ['#B292FF', '#FF66C4'], file: 'audio/tracks/trk-02.mp3',
      bass: [87.31, 69.30, 77.78, 65.41], // F2, Db2, Eb2, C2
      chords: [[349.23, 415.30, 523.25, 622.25], [277.18, 349.23, 415.30, 523.25], [311.13, 392.00, 466.16, 587.33], [261.63, 311.13, 392.00, 466.16]],
      arp: [698.46, 830.61, 1046.50, 932.33, 830.61, 698.46, 622.25, 523.25],
      kickPat:  [1,0,0,1, 0,0,0,0, 1,0,1,0, 0,0,0,0],
      snarePat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hatPat:   [1,1,1,0, 1,1,1,1, 1,0,1,1, 1,1,1,1],
    },
    {
      id: 'trk-03', code: '03', title: 'PALM DRIFT', sub: '98 BPM · A MIN', bpm: 98,
      accent: ['#3CF8E8', '#FFC694'], file: 'audio/tracks/trk-03.mp3',
      bass: [55.00, 65.41, 73.42, 61.74], // A1, C2, D2, B1
      chords: [[220.00, 261.63, 329.63, 392.00], [261.63, 329.63, 392.00, 493.88], [293.66, 349.23, 440.00, 523.25], [246.94, 311.13, 392.00, 493.88]],
      arp: [440.00, 523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33],
      kickPat:  [1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,1,0],
      snarePat: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
      hatPat:   [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,1,1,0],
    },
    {
      id: 'trk-04', code: '04', title: 'MIDNIGHT VHS', sub: '80 BPM · C MIN', bpm: 80,
      accent: ['#9B88FA', '#5CF5F0'], file: 'audio/tracks/trk-04.mp3',
      bass: [65.41, 51.91, 58.27, 49.00], // C2, Ab1, Bb1, G1
      chords: [[261.63, 311.13, 392.00, 466.16], [207.65, 261.63, 311.13, 392.00], [233.08, 293.66, 349.23, 466.16], [196.00, 246.94, 293.66, 392.00]],
      arp: [523.25, 622.25, 783.99, 932.33, 783.99, 622.25, 587.33, 466.16],
      kickPat:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
      snarePat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hatPat:   [1,0,1,0, 1,0,1,0, 1,1,1,0, 1,0,1,1],
    },
    {
      id: 'trk-05', code: '05', title: 'HELIOS TAPE', sub: '104 BPM · G MIN', bpm: 104,
      accent: ['#FFE08A', '#44F6F0'], file: 'audio/tracks/trk-05.mp3',
      bass: [98.00, 77.78, 87.31, 73.42], // G2, Eb2, F2, D2
      chords: [[392.00, 466.16, 587.33, 698.46], [311.13, 392.00, 466.16, 587.33], [349.23, 440.00, 523.25, 659.25], [293.66, 369.99, 440.00, 587.33]],
      arp: [783.99, 932.33, 1174.66, 1046.50, 932.33, 783.99, 698.46, 587.33],
      kickPat:  [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0],
      snarePat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
      hatPat:   [1,1,1,0, 1,1,1,0, 1,1,1,1, 1,0,1,1],
    },
  ];

  let ctx = null;
  let master = null;
  let dryBus = null;
  let wetBus = null;
  let musicBus = null;
  let eqFilters = [];
  let analyser = null;
  let fftBins = null;
  let noiseBuf = null;
  let hissNode = null;
  let hissGain = null;
  let hissFilter = null;
  let muted = false;

  // recorded decoded audio cache (populated cleanly when audio/manifest.json exists!)
  const sfxBuffers = new Map();
  const trackBuffers = new Map();
  let manifestChecked = false;

  // Live music player state (supports both recorded MP3 loops & 5-track synthwave hip-hop sequencer!)
  let activeTrackIdx = 0;
  let isPlayingTrack = false;
  let activeBufferSrc = null;
  let activeBufferGain = null;
  let seqTimer = null;
  let seqStep = 0;
  let lastEqNorms = [0.68, 0.78, 0.62, 0.48, 0.56, 0.72, 0.64];

  function boot() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0.74;

      // Live FFT Analyser driving PALM_DECK.EQ's 7 ceramic liquid tubes!
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.76;
      fftBins = new Uint8Array(analyser.frequencyBinCount);
      master.connect(analyser);
      analyser.connect(ctx.destination);

      // 7-Band Hardware EQ Filter Chain for live synthwave hip-hop tracks (controlled by PALM_DECK.EQ!)
      const eqFreqs = [60, 170, 310, 600, 1000, 3000, 12000];
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.78;
      let chain = musicBus;
      eqFilters = eqFreqs.map((f, i) => {
        const flt = ctx.createBiquadFilter();
        flt.type = i === 0 ? 'lowshelf' : i === 6 ? 'highshelf' : 'peaking';
        flt.frequency.value = f;
        flt.Q.value = 1.25;
        flt.gain.value = ((lastEqNorms[i] ?? 0.5) - 0.5) * 18;
        chain.connect(flt);
        chain = flt;
        return flt;
      });
      chain.connect(master);

      dryBus = ctx.createGain();
      dryBus.gain.value = 0.85;
      dryBus.connect(master);

      // Soft 1991 mall-atrium stereo tape-echo / chorus bus
      wetBus = ctx.createGain();
      wetBus.gain.value = 0.34;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3600;

      const dL = ctx.createDelay(0.5);
      const dR = ctx.createDelay(0.5);
      dL.delayTime.value = 0.145;
      dR.delayTime.value = 0.215;

      const fbL = ctx.createGain();
      const fbR = ctx.createGain();
      fbL.gain.value = 0.28;
      fbR.gain.value = 0.26;

      const merger = ctx.createChannelMerger(2);
      wetBus.connect(lp);
      lp.connect(dL);
      lp.connect(dR);
      dL.connect(fbL); fbL.connect(dR);
      dR.connect(fbR); fbR.connect(dL);
      dL.connect(merger, 0, 0);
      dR.connect(merger, 0, 1);
      merger.connect(master);

      // Reusable 1.5s white noise buffer for tape hiss, CRT static, shutter friction
      const len = Math.floor(ctx.sampleRate * 1.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      loadTrackFiles();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // The songs: five files, loaded when a page asks (ParadiseSound.loadTracks or <paradise-cd-dial tracks="...">).
  // Without them each track plays as a beat synthesized on the spot.
  let trackSource = null;
  async function loadTrackFiles() {
    if (manifestChecked || !ctx || !trackSource) return;
    manifestChecked = true;
    const urls = Array.isArray(trackSource)
      ? trackSource
      : TRACKS.map((t) => new URL(`${t.id}.mp3`, trackSource.endsWith('/') ? trackSource : trackSource + '/').href);
    await Promise.all(TRACKS.map(async (t, i) => {
      if (!urls[i]) return;
      try {
        const r = await fetch(urls[i]);
        if (!r.ok) return;
        trackBuffers.set(t.id, await ctx.decodeAudioData(await r.arrayBuffer()));
      } catch {}
    }));
    // if a synthesized beat is playing and its file just arrived, switch to the file
    if (isPlayingTrack && !activeBufferSrc && trackBuffers.has(TRACKS[activeTrackIdx].id)) startCurrentTrack();
    window.dispatchEvent(new CustomEvent('paradise-audio-ready', { detail: { tracks: trackBuffers.size } }));
  }

  function playSfxBuf(key, { gain = 0.65, rate = 1, wet = 0.12 } = {}) {
    if (!ctx || !sfxBuffers.has(key)) return false;
    const src = ctx.createBufferSource();
    src.buffer = sfxBuffers.get(key);
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(dryBus);
    if (wet > 0) {
      const wg = ctx.createGain(); wg.gain.value = wet;
      g.connect(wg); wg.connect(wetBus);
    }
    src.start();
    return true;
  }

  // --- Built-In 5-Track Synthwave Hip-Hop Web Audio Beat Engine (instant playback + recorded drop-in) ---
  function trig808Kick(c, t, subFreq = 58) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(subFreq, t + 0.065);
    osc.frequency.exponentialRampToValueAtTime(subFreq * 0.86, t + 0.34);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(g); g.connect(musicBus);
    osc.start(t); osc.stop(t + 0.4);
  }
  function trigGatedSnare(c, t) {
    // 80s synthwave gated reverb snare + crisp body pop
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1850; bp.Q.value = 0.85;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.004);
    g.gain.setValueAtTime(0.18, t + 0.11);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp); bp.connect(g); g.connect(musicBus);
    const wg = c.createGain(); wg.gain.value = 0.42; g.connect(wg); wg.connect(wetBus);
    src.start(t, Math.random() * 0.5, 0.22);

    const body = c.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(215, t);
    body.frequency.exponentialRampToValueAtTime(112, t + 0.075);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.22, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    body.connect(bg); bg.connect(musicBus);
    body.start(t); body.stop(t + 0.1);
  }
  function trigHat(c, t, open = false) {
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7400;
    const g = c.createGain();
    const dur = open ? 0.12 : 0.036;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(open ? 0.08 : 0.065, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(musicBus);
    src.start(t, Math.random() * 0.6, dur + 0.02);
  }
  function trigJunoChord(c, t, freqs, dur = 0.8) {
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(2100, t);
    flt.frequency.exponentialRampToValueAtTime(680, t + dur);
    flt.Q.value = 1.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.085, t + 0.028);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    flt.connect(g); g.connect(musicBus);
    const wg = c.createGain(); wg.gain.value = 0.52; g.connect(wg); wg.connect(wetBus);
    for (const f of freqs) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.5, t);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 14, t);
      osc.connect(flt);
      osc.start(t); osc.stop(t + dur + 0.04);
    }
  }
  function trigArpNote(c, t, freq, dur = 0.2) {
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.068, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(musicBus);
    const wg = c.createGain(); wg.gain.value = 0.55; g.connect(wg); wg.connect(wetBus);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function stopTrackAudio() {
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
    if (activeBufferSrc) {
      try {
        const g = activeBufferGain;
        const s = activeBufferSrc;
        if (g && ctx) {
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
          setTimeout(() => { try { s.stop(); } catch {} }, 160);
        } else { s.stop(); }
      } catch {}
      activeBufferSrc = null;
      activeBufferGain = null;
    }
  }

  function startCurrentTrack() {
    const c = boot(); if (!c) return;
    stopTrackAudio();
    const trk = TRACKS[activeTrackIdx] || TRACKS[0];

    // Prefer genuine recorded Music MP3 buffer when loaded!
    if (trackBuffers.has(trk.id)) {
      const src = c.createBufferSource();
      src.buffer = trackBuffers.get(trk.id);
      src.loop = true;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.linearRampToValueAtTime(0.85, c.currentTime + 0.16);
      src.connect(g);
      g.connect(musicBus);
      src.start();
      activeBufferSrc = src;
      activeBufferGain = g;
      return;
    }

    // Fallback: Live 16-step Synthwave Hip-Hop Web Audio Sequencer (zero silence before recorded auth!)
    const stepMs = (60 / trk.bpm / 4) * 1000;
    seqStep = 0;
    const tickStep = () => {
      if (!isPlayingTrack || !ctx || muted) return;
      const t = ctx.currentTime + 0.012;
      const s = seqStep % 16;
      const bar = Math.floor(seqStep / 16) % 4;
      const bassF = trk.bass[bar];
      if (trk.kickPat[s]) trig808Kick(ctx, t, bassF);
      if (trk.snarePat[s]) trigGatedSnare(ctx, t);
      if (trk.hatPat[s]) trigHat(ctx, t, s === 14);
      if (s === 0 || s === 10) trigJunoChord(ctx, t, trk.chords[bar], (stepMs / 1000) * (s === 0 ? 7.5 : 5));
      if (s % 2 === 0) trigArpNote(ctx, t, trk.arp[(bar * 2 + (s >> 1)) % trk.arp.length], (stepMs / 1000) * 1.9);
      seqStep++;
    };
    tickStep();
    seqTimer = setInterval(tickStep, stepMs);
  }

  function noiseBurst(c, { dur = 0.06, freq = 2400, q = 1.4, gain = 0.12, type = 'bandpass', delay = 0, wet = 0.15 } = {}) {
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(freq, t);
    flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.008, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dryBus);
    if (wet > 0) {
      const wg = c.createGain();
      wg.gain.value = wet;
      g.connect(wg);
      wg.connect(wetBus);
    }
    src.start(t, Math.random() * 0.6, dur + 0.02);
  }

  // Pitched-down (-12% tape speed) velvety FM-style glassy tine voice
  function chime(c, freq, { dur = 0.42, gain = 0.08, delay = 0, detune = 0, wet = 0.7 } = {}) {
    const t = c.currentTime + delay;
    const f = freq * 0.88; // classic -12% vaporwave tape pitch-down
    const osc1 = c.createOscillator();
    const osc2 = c.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(f, t);
    osc2.frequency.setValueAtTime(f * 2.002, t);
    osc1.detune.setValueAtTime(detune - 6, t);
    osc2.detune.setValueAtTime(detune + 7, t);
    // Subtle tape wow pitch drift on release
    osc1.frequency.exponentialRampToValueAtTime(f * 0.994, t + dur);

    const g1 = c.createGain();
    const g2 = c.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.linearRampToValueAtTime(gain, t + 0.012);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(gain * 0.28, t + 0.006);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.42);

    osc1.connect(g1); osc2.connect(g2);
    g1.connect(dryBus); g2.connect(dryBus);
    const wg = c.createGain();
    wg.gain.value = wet;
    g1.connect(wg); g2.connect(wg);
    wg.connect(wetBus);

    osc1.start(t); osc2.start(t);
    osc1.stop(t + dur + 0.03); osc2.stop(t + dur + 0.03);
  }

  function thock(c, { f0 = 185, f1 = 58, dur = 0.065, gain = 0.22, delay = 0 } = {}) {
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dryBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function droplet(c, f0 = 520, f1 = 1040, { dur = 0.11, gain = 0.08, delay = 0 } = {}) {
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dryBus);
    const wg = c.createGain(); wg.gain.value = 0.65;
    g.connect(wg); wg.connect(wetBus);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  const Sound = {
    TRACKS,
    get muted() { return muted; },
    set muted(v) {
      muted = !!v;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.74, ctx.currentTime, 0.02);
      if (muted) stopTrackAudio();
      else if (isPlayingTrack) startCurrentTrack();
      window.dispatchEvent(new CustomEvent('gp-audio-change'));
    },
    unlock() { boot(); },

    // Live 5-Track Synthwave Hip-Hop Music Player (recorded MP3s with live Web Audio beat fallback!)
    playTrack(idx = activeTrackIdx) {
      const n = Math.max(0, Math.min(TRACKS.length - 1, idx | 0));
      activeTrackIdx = n;
      isPlayingTrack = true;
      startCurrentTrack();
      window.dispatchEvent(new CustomEvent('gp-audio-change', { detail: { idx: n, playing: true } }));
      return TRACKS[n];
    },
    pauseTrack() {
      isPlayingTrack = false;
      stopTrackAudio();
      window.dispatchEvent(new CustomEvent('gp-audio-change', { detail: { idx: activeTrackIdx, playing: false } }));
    },
    isTrackPlaying() { return isPlayingTrack && !muted; },
    getTrackIndex() { return activeTrackIdx; },
    getTrackSource(idx = activeTrackIdx) {
      const trk = TRACKS[Math.max(0, Math.min(TRACKS.length - 1, idx | 0))];
      return trk && trackBuffers.has(trk.id) ? 'file' : 'synth';
    },
    // a folder holding trk-01.mp3 ... trk-05.mp3, or an array of five URLs
    loadTracks(src) {
      if (!src) return;
      trackSource = Array.isArray(src) ? src.map((u) => new URL(u, document.baseURI).href) : new URL(src, document.baseURI).href;
      manifestChecked = false;
      if (ctx) loadTrackFiles();
    },
    getTrackStats() { return { trackCount: trackBuffers.size }; },
    // Live 7-Band Hardware EQ Filter Control + Real-Time FFT Spectrum Readout for PALM_DECK.EQ!
    setEqGains(norm7) {
      if (!Array.isArray(norm7) || norm7.length !== 7) return;
      lastEqNorms = norm7.map((v) => Math.max(0, Math.min(1, Number(v) || 0.5)));
      if (!ctx || eqFilters.length !== 7) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 7; i++) {
        eqFilters[i].gain.setTargetAtTime((lastEqNorms[i] - 0.5) * 18, t, 0.04);
      }
    },
    getBands7() {
      if (!analyser || !fftBins || !isPlayingTrack || muted) return null;
      analyser.getByteFrequencyData(fftBins);
      // 128 bins spanning 0..24kHz (~187Hz/bin) -> 7 musical bands matching 60Hz..12K
      const ranges = [[0, 1], [1, 3], [3, 6], [6, 12], [12, 22], [22, 46], [46, 96]];
      const out = new Float32Array(7);
      for (let b = 0; b < 7; b++) {
        const [a, z] = ranges[b];
        let sum = 0;
        let peak = 0;
        for (let k = a; k < z; k++) {
          const v = fftBins[k] / 255;
          sum += v;
          if (v > peak) peak = v;
        }
        const avg = sum / Math.max(1, z - a);
        out[b] = Math.min(1, avg * 0.55 + peak * 0.62);
      }
      return out;
    },

    // 1. 3.5" Floppy metal shutter + glitch chirp + maj7 bloom
    floppy(on) {
      const c = boot(); if (!c) return;
      noiseBurst(c, { dur: 0.075, freq: on ? 3400 : 2500, q: 2.2, gain: 0.14 });
      thock(c, { f0: on ? 260 : 210, f1: 72, dur: 0.055, gain: 0.2, delay: 0.045 });
      if (on) {
        // Brief VHS glitch micro-chirp then dreamy maj7 dyad
        noiseBurst(c, { dur: 0.04, freq: 5200, q: 4.5, gain: 0.06, delay: 0.055, wet: 0.4 });
        chime(c, 523.25, { dur: 0.55, gain: 0.065, delay: 0.065 });
        chime(c, 659.25, { dur: 0.62, gain: 0.055, delay: 0.115 });
        chime(c, 987.77, { dur: 0.72, gain: 0.042, delay: 0.165 });
      } else {
        chime(c, 440.0, { dur: 0.34, gain: 0.05, delay: 0.05 });
        chime(c, 349.23, { dur: 0.42, gain: 0.045, delay: 0.095 });
      }
    },

    // 2. Crystal-grown 1994 mechanical beige keycap
    keycapDown() {
      const c = boot(); if (!c) return;
      thock(c, { f0: 215, f1: 52, dur: 0.068, gain: 0.28 });
      noiseBurst(c, { dur: 0.028, freq: 1800, q: 1.8, gain: 0.11 });
      // Subtle PNG-texture-drop digital blip
      chime(c, 784, { dur: 0.08, gain: 0.045, wet: 0.25 });
    },
    keycapUp() {
      const c = boot(); if (!c) return;
      thock(c, { f0: 320, f1: 110, dur: 0.042, gain: 0.17 });
      // Quartz crystal prism chime cascade
      chime(c, 1046.5, { dur: 0.48, gain: 0.055, delay: 0.01 });
      chime(c, 1318.5, { dur: 0.52, gain: 0.045, delay: 0.055 });
      chime(c, 1568.0, { dur: 0.58, gain: 0.036, delay: 0.1 });
    },

    // 3. Dolphin Pool Slider continuous scrub hiss + droplet settle
    scrub(speed) {
      const c = boot(); if (!c) return;
      const amt = Math.min(1, Math.max(0, speed));
      if (!hissNode) {
        hissNode = c.createBufferSource();
        hissNode.buffer = noiseBuf;
        hissNode.loop = true;
        hissFilter = c.createBiquadFilter();
        hissFilter.type = 'bandpass';
        hissFilter.Q.value = 2.6;
        hissFilter.frequency.value = 1800;
        hissGain = c.createGain();
        hissGain.gain.value = 0.0001;
        hissNode.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(dryBus);
        hissNode.start();
      }
      const t = c.currentTime;
      hissFilter.frequency.setTargetAtTime(1100 + amt * 4200, t, 0.03);
      hissGain.gain.setTargetAtTime(amt > 0.08 ? amt * 0.095 : 0.0001, t, 0.035);
    },
    poolSettle(val = 0.5) {
      const c = boot(); if (!c) return;
      this.scrub(0);
      if (playSfxBuf('pool-detent', { gain: 0.55, rate: 0.88 + val * 0.28, wet: 0.2 })) return;
      const base = 420 + val * 340;
      droplet(c, base * 0.72, base * 1.38, { dur: 0.13, gain: 0.075 });
      chime(c, 587.33 + val * 260, { dur: 0.48, gain: 0.045, delay: 0.03 });
    },

    // 4. Mini Beige CRT channel switch + SMPTE static burst + degauss hum
    crtSwitch(ch = 1) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('crt-switch', { gain: 0.65, rate: 0.96 + (ch % 3) * 0.05, wet: 0.12 })) return;
      thock(c, { f0: 290, f1: 78, dur: 0.048, gain: 0.23 });
      // Classic TV snow static burst
      noiseBurst(c, { dur: 0.115, freq: 3600, q: 0.75, gain: 0.13, delay: 0.015, wet: 0.3 });
      // Subtle low degauss bloom
      const t = c.currentTime + 0.02;
      const hum = c.createOscillator();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(118, t);
      hum.frequency.exponentialRampToValueAtTime(58, t + 0.22);
      const hg = c.createGain();
      hg.gain.setValueAtTime(0.0001, t);
      hg.gain.linearRampToValueAtTime(0.085, t + 0.015);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      hum.connect(hg); hg.connect(dryBus);
      hum.start(t); hum.stop(t + 0.26);

      const notes = [[440, 554.37], [523.25, 659.25], [587.33, 739.99]][ch % 3];
      chime(c, notes[0], { dur: 0.46, gain: 0.052, delay: 0.09 });
      chime(c, notes[1], { dur: 0.54, gain: 0.044, delay: 0.135 });
    },

    // 5. Pastel Archway checkbox
    arch(on) {
      const c = boot(); if (!c) return;
      thock(c, { f0: on ? 340 : 250, f1: 95, dur: 0.04, gain: 0.15 });
      noiseBurst(c, { dur: 0.048, freq: 4400, q: 3.2, gain: 0.055, delay: 0.015 });
      chime(c, on ? 659.25 : 493.88, { dur: 0.45, gain: 0.058, delay: 0.025 });
      if (on) chime(c, 987.77, { dur: 0.55, gain: 0.046, delay: 0.075 });
    },

    // 6. Checkerboard & Mirror Chrome Sphere Pool Toggle
    poolToggle(on) {
      const c = boot(); if (!c) return;
      thock(c, { f0: 240, f1: 88, dur: 0.05, gain: 0.16 });
      if (on) {
        droplet(c, 480, 960, { dur: 0.12, gain: 0.08, delay: 0.04 });
        droplet(c, 690, 1320, { dur: 0.1, gain: 0.055, delay: 0.11 });
        chime(c, 587.33, { dur: 0.52, gain: 0.052, delay: 0.07 });
        chime(c, 880.0, { dur: 0.62, gain: 0.042, delay: 0.13 });
      } else {
        noiseBurst(c, { dur: 0.05, freq: 1600, q: 1.5, gain: 0.06, delay: 0.02 });
        chime(c, 392.0, { dur: 0.36, gain: 0.048, delay: 0.04 });
      }
    },

    // 7. Holographic CD-ROM Dial micro-detent tick
    cdTick(step = 0) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('cd-tick', { gain: 0.52, rate: 0.9 + (step % 7) * 0.04, wet: 0.16 })) return;
      const f = 920 + (step % 12) * 48;
      chime(c, f, { dur: 0.09, gain: 0.032, wet: 0.35 });
    },

    // 8. Floating 3D Statue Agent state cues (7 states + live token pulse)
    orbState(state) {
      const c = boot(); if (!c) return;
      if (state === 'done' && playSfxBuf('statue-done', { gain: 0.72, rate: 1, wet: 0.22 })) return;
      if ((state === 'thinking' || state === 'searching' || state === 'tool' || state === 'writing') &&
          playSfxBuf('statue-slice', { gain: 0.62, rate: state === 'tool' ? 1.12 : state === 'searching' ? 1.05 : 0.96, wet: 0.2 })) return;
      if (state === 'done') {
        // Magnetic marble reassembly slam + pool caustic splash + lush maj9 convergence chord!
        thock(c, { f0: 210, f1: 58, dur: 0.068, gain: 0.24 });
        droplet(c, 540, 1180, { dur: 0.14, gain: 0.075, delay: 0.03 });
        chime(c, 523.25, { dur: 0.72, gain: 0.062, delay: 0.035 });
        chime(c, 659.25, { dur: 0.78, gain: 0.056, delay: 0.085 });
        chime(c, 783.99, { dur: 0.85, gain: 0.05, delay: 0.135 });
        chime(c, 987.77, { dur: 0.92, gain: 0.044, delay: 0.185 });
        chime(c, 1174.66, { dur: 1.05, gain: 0.038, delay: 0.24 });
      } else if (state === 'searching') {
        noiseBurst(c, { dur: 0.075, freq: 4400, q: 3.6, gain: 0.068 });
        chime(c, 740, { dur: 0.28, gain: 0.048, delay: 0.02 });
        chime(c, 987.77, { dur: 0.34, gain: 0.036, delay: 0.08 });
      } else if (state === 'tool') {
        thock(c, { f0: 380, f1: 145, dur: 0.036, gain: 0.16 });
        thock(c, { f0: 460, f1: 185, dur: 0.028, gain: 0.11, delay: 0.05 });
        chime(c, 622.25, { dur: 0.32, gain: 0.046, delay: 0.025 });
      } else if (state === 'writing') {
        chime(c, 587.33, { dur: 0.42, gain: 0.048 });
        chime(c, 880.0, { dur: 0.48, gain: 0.042, delay: 0.055 });
        chime(c, 1174.66, { dur: 0.52, gain: 0.032, delay: 0.11 });
      } else if (state === 'error') {
        // Fracture snap + nostalgic pitched-down dissonant  95-era alert
        noiseBurst(c, { dur: 0.095, freq: 2400, q: 1.8, gain: 0.13 });
        thock(c, { f0: 155, f1: 48, dur: 0.09, gain: 0.22 });
        chime(c, 311.13, { dur: 0.42, gain: 0.06, delay: 0.02, wet: 0.4 });
        chime(c, 293.66, { dur: 0.48, gain: 0.056, delay: 0.08, wet: 0.4 });
      } else if (state === 'thinking') {
        // Subtle glassy marble slab levitation shimmer
        noiseBurst(c, { dur: 0.05, freq: 3200, q: 2.8, gain: 0.045 });
        chime(c, 493.88, { dur: 0.52, gain: 0.05 });
        chime(c, 587.33, { dur: 0.58, gain: 0.042, delay: 0.075 });
      } else {
        chime(c, 440, { dur: 0.36, gain: 0.038 });
      }
    },

    // Micro sparkle tick for token emission / live pulse() events
    tokenPulse(step = 0) {
      const c = boot(); if (!c) return;
      const scale = [783.99, 880.0, 987.77, 1174.66, 1318.5, 1567.98];
      const f = scale[Math.abs(step | 0) % scale.length];
      chime(c, f, { dur: 0.16, gain: 0.028, wet: 0.55 });
    },

    // 9. Dreamy  95-era-meets-mallsoft dialog chime & key tap
    dialog(open = true) {
      const c = boot(); if (!c) return;
      if (open) {
        chime(c, 523.25, { dur: 0.5, gain: 0.06 });
        chime(c, 659.25, { dur: 0.55, gain: 0.055, delay: 0.07 });
        chime(c, 783.99, { dur: 0.65, gain: 0.05, delay: 0.14 });
      } else {
        thock(c, { f0: 260, f1: 70, dur: 0.05, gain: 0.14 });
        chime(c, 659.25, { dur: 0.25, gain: 0.04 });
        chime(c, 440.0, { dur: 0.35, gain: 0.04, delay: 0.05 });
      }
    },

    keyTap() {
      const c = boot(); if (!c) return;
      thock(c, { f0: 310 + Math.random() * 45, f1: 95, dur: 0.026, gain: 0.1 });
    },

    glitchSlice() {
      const c = boot(); if (!c) return;
      noiseBurst(c, { dur: 0.075, freq: 3900, q: 2.0, gain: 0.095 });
      chime(c, 880, { dur: 0.18, gain: 0.04, delay: 0.02 });
    },

    // 10. ridged bevel switch toggle + pool/checkerboard flip
    winToggle(on) {
      const c = boot(); if (!c) return;
      if (playSfxBuf(on ? 'win-toggle-on' : 'win-toggle-off', { gain: 0.68, rate: 1, wet: 0.12 })) return;
      thock(c, { f0: on ? 320 : 240, f1: 84, dur: 0.045, gain: 0.2 });
      noiseBurst(c, { dur: 0.045, freq: on ? 3600 : 2100, q: 2.2, gain: 0.08, delay: 0.02 });
      if (on) {
        droplet(c, 520, 1080, { dur: 0.11, gain: 0.07, delay: 0.035 });
        chime(c, 587.33, { dur: 0.48, gain: 0.055, delay: 0.05 });
        chime(c, 880.0, { dur: 0.58, gain: 0.045, delay: 0.10 });
      } else {
        chime(c, 440.0, { dur: 0.32, gain: 0.045, delay: 0.03 });
        chime(c, 329.63, { dur: 0.38, gain: 0.04, delay: 0.08 });
      }
    },

    // 11. error cascade fountain!
    winCascade(combo = 1) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('win-cascade', { gain: 0.68, rate: 0.95 + ((combo - 1) % 5) * 0.045, wet: 0.18 })) return;
      const root = [523.25, 587.33, 659.25, 783.99, 880.0][(combo - 1) % 5];
      thock(c, { f0: 290, f1: 72, dur: 0.05, gain: 0.22 });
      // rapid stepped card-stamp flutter ticks!
      for (let i = 0; i < 6; i++) {
        thock(c, { f0: 440 + i * 55, f1: 180 + i * 20, dur: 0.024, gain: 0.085 - i * 0.01, delay: 0.025 + i * 0.034 });
      }
      // Dreamy nostalgic  95-era-inspired maj9 arpeggio
      chime(c, root, { dur: 0.52, gain: 0.058, delay: 0.02 });
      chime(c, root * 1.25, { dur: 0.56, gain: 0.048, delay: 0.075 });
      chime(c, root * 1.5, { dur: 0.64, gain: 0.042, delay: 0.13 });
    },

    // 12. Classic soft Vaporwave  95-era alert chord
    winAlert() {
      const c = boot(); if (!c) return;
      chime(c, 659.25, { dur: 0.45, gain: 0.06 });
      chime(c, 493.88, { dur: 0.55, gain: 0.055, delay: 0.08 });
      chime(c, 587.33, { dur: 0.65, gain: 0.05, delay: 0.16 });
    },

    // 13. Pool Slider magnetic detent droplet ping + dolphin breach splash
    detentPing(idx = 0) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('pool-detent', { gain: 0.46, rate: 0.9 + (idx % 4) * 0.09, wet: 0.22 })) return;
      const f = 540 + (idx % 4) * 120;
      droplet(c, f * 0.85, f * 1.45, { dur: 0.075, gain: 0.05 });
    },
    dolphinSplash() {
      const c = boot(); if (!c) return;
      if (playSfxBuf('pool-splash', { gain: 0.72, rate: 1, wet: 0.2 })) return;
      noiseBurst(c, { dur: 0.11, freq: 3200, q: 1.5, gain: 0.085, wet: 0.45 });
      droplet(c, 480, 1240, { dur: 0.13, gain: 0.085 });
      droplet(c, 740, 1620, { dur: 0.11, gain: 0.055, delay: 0.055 });
      chime(c, 987.77, { dur: 0.36, gain: 0.04, delay: 0.04 });
    },

    // 14. Authentic 1994 CRT magnetic coil degauss BZZZ-WWOOOMM + phosphor collapse
    degauss() {
      const c = boot(); if (!c) return;
      if (playSfxBuf('crt-degauss', { gain: 0.74, rate: 1, wet: 0.1 })) return;
      const t = c.currentTime;
      thock(c, { f0: 260, f1: 54, dur: 0.06, gain: 0.28 });
      const osc = c.createOscillator();
      const osc2 = c.createOscillator();
      osc.type = 'sawtooth';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(124, t);
      osc.frequency.exponentialRampToValueAtTime(56, t + 0.62);
      osc2.frequency.setValueAtTime(62, t);
      osc2.frequency.exponentialRampToValueAtTime(48, t + 0.62);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(840, t);
      lp.frequency.exponentialRampToValueAtTime(160, t + 0.62);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
      osc.connect(lp); osc2.connect(lp);
      lp.connect(g); g.connect(dryBus);
      osc.start(t); osc2.start(t);
      osc.stop(t + 0.7); osc2.stop(t + 0.7);
      noiseBurst(c, { dur: 0.09, freq: 3800, q: 1.4, gain: 0.09, delay: 0.01 });
    },
    crtOff() {
      const c = boot(); if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4200, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + 0.14);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g); g.connect(dryBus);
      osc.start(t); osc.stop(t + 0.17);
    },

    // 15. ERROR_95.EXE hold-to-charge hypercube ascending pulse
    chargeTick(level = 0) {
      const c = boot(); if (!c) return;
      const f = 440 * Math.pow(2, Math.min(1.5, level * 1.35));
      chime(c, f, { dur: 0.18, gain: 0.038 + level * 0.025, wet: 0.55 });
      thock(c, { f0: 280 + level * 260, f1: 110, dur: 0.022, gain: 0.07 });
    },

    // 16. DREAM_CTRL.DLL locked spring bounce + global reality shift chord
    lockedBounce() {
      const c = boot(); if (!c) return;
      thock(c, { f0: 190, f1: 70, dur: 0.04, gain: 0.22 });
      thock(c, { f0: 165, f1: 62, dur: 0.045, gain: 0.16, delay: 0.065 });
      chime(c, 349.23, { dur: 0.24, gain: 0.045, wet: 0.25 });
    },
    realityShift(paradise = true) {
      const c = boot(); if (!c) return;
      if (paradise) {
        chime(c, 523.25, { dur: 0.65, gain: 0.055 });
        chime(c, 659.25, { dur: 0.72, gain: 0.048, delay: 0.05 });
        chime(c, 987.77, { dur: 0.85, gain: 0.042, delay: 0.10 });
      } else {
        noiseBurst(c, { dur: 0.08, freq: 1800, q: 1.8, gain: 0.08 });
        chime(c, 440.0, { dur: 0.35, gain: 0.045 });
        chime(c, 311.13, { dur: 0.42, gain: 0.042, delay: 0.06 });
      }
    },

    // 17. CDROM_DIAL.DRV optical spindle motor toggle + laser skip scratch!
    cdMotor(spinning = true) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('cd-motor', { gain: 0.64, rate: spinning ? 1.06 : 0.78, wet: 0.14 })) return;
      thock(c, { f0: spinning ? 240 : 320, f1: spinning ? 95 : 64, dur: 0.048, gain: 0.18 });
      const t = c.currentTime + 0.015;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(spinning ? 280 : 620, t);
      osc.frequency.exponentialRampToValueAtTime(spinning ? 680 : 190, t + 0.16);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(g); g.connect(dryBus);
      osc.start(t); osc.stop(t + 0.2);
      chime(c, spinning ? 783.99 : 493.88, { dur: 0.28, gain: 0.042, delay: 0.04 });
    },
    cdScratch(intensity = 0.7) {
      const c = boot(); if (!c) return;
      if (playSfxBuf('cd-scratch', { gain: 0.62 * Math.max(0.5, intensity), rate: 0.92 + intensity * 0.2, wet: 0.15 })) return;
      noiseBurst(c, { dur: 0.045, freq: 3800 + intensity * 1800, q: 4.2, gain: 0.07 * intensity, wet: 0.35 });
      chime(c, 1180 + intensity * 420, { dur: 0.06, gain: 0.028 * intensity, wet: 0.3 });
    },

    // 18. PALM_DECK.EQ 7-band pentatonic Vaporwave harp swipe + preset chord!
    eqBand(idx = 0, norm = 0.5) {
      const c = boot(); if (!c) return;
      const ratios = [0.74, 0.84, 0.95, 1.06, 1.19, 1.34, 1.50];
      if (playSfxBuf('eq-chime', { gain: 0.44, rate: ratios[Math.max(0, Math.min(6, idx | 0))] * (0.96 + norm * 0.08), wet: 0.3 })) return;
      // Lush Cmaj9 pentatonic frequencies mapped across the 7 ceramic slots
      const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 987.77];
      const f = notes[Math.max(0, Math.min(6, idx | 0))] * (0.94 + norm * 0.12);
      droplet(c, f * 0.9, f * 1.15, { dur: 0.085, gain: 0.036 });
      chime(c, f, { dur: 0.28, gain: 0.038 + norm * 0.015, wet: 0.65 });
    },
    eqPreset(name = 'mallsoft') {
      const c = boot(); if (!c) return;
      const chords = {
        mallsoft: [392.00, 493.88, 587.33, 783.99],
        sunset:   [329.63, 440.00, 523.25, 659.25],
        glitch:   [440.00, 554.37, 659.25, 987.77],
        flat:     [392.00, 523.25, 659.25],
      };
      const seq = chords[name] || chords.mallsoft;
      seq.forEach((f, i) => chime(c, f, { dur: 0.52, gain: 0.045, delay: i * 0.045 }));
    },
  };

  window.ParadiseSound = Sound;
})();
