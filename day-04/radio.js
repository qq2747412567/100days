(function () {
  "use strict";

  var KEY = "weidengji-band-v1";
  var TALK = { weather: 1, letters: 1, lesson: 1, story: 1, seek: 1, harbor: 1 };

  var state = {
    powered: false,
    band: "mw",
    mwBase: 702,
    swBase: 5980,
    fine: 0,
    volume: 0.72,
    tone: 0.56,
    bandwidth: 0.62,
    sky: "auto",
    log: [],
    heard: [],
    storyIndex: 0,
    storyLeft: null,
    storyDone: false,
    clearArmed: false
  };

  var audio = null;
  var mix = emptyMix();
  var smooth = emptyMix();
  var measure = null;
  var lastTs = 0;
  var holdMs = 0;
  var holdId = "";
  var lastLogged = {};
  var sylNext = 0;
  var musicNext = 0;
  var musicStep = 0;
  var operaNext = 0;
  var operaStep = 0;
  var numbersNext = 0;
  var numbersIdx = 0;
  var numbersShown = "";
  var fogNext = 0;
  var morse = null;
  var morseIdx = 0;
  var morseBase = 0;
  var beepWall = 0;
  var knockQueued = false;
  var lastStoryIndex = 0;
  var passId = "";
  var saveTimer = 0;
  var paperStamp = 0;
  var clearTimer = 0;

  var els = {};

  function emptyMix() {
    return { talk: 0, beep: 0, morse: 0, music: 0, opera: 0, numbers: 0, fog: 0, het: 0, hetF: 700, hiss: 0.2, hum: 0 };
  }

  function $(id) { return document.getElementById(id); }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function bandSpec() { return state.band === "sw" ? BAND.sw : BAND.mw; }

  function baseFreq() { return state.band === "sw" ? state.swBase : state.mwBase; }

  function setBase(v) {
    var b = bandSpec();
    v = clamp(v, b.min, b.max);
    if (state.band === "sw") state.swBase = v;
    else state.mwBase = v;
  }

  function tuned() {
    var b = bandSpec();
    return clamp(baseFreq() + state.fine, b.min, b.max);
  }

  function freqPct(freq) {
    var b = bandSpec();
    var raw = (freq - b.min) / (b.max - b.min);
    return 5 + clamp(raw, 0, 1) * 90;
  }

  function freqFromX(clientX) {
    var rect = els.scale.getBoundingClientRect();
    var raw = (clientX - rect.left) / rect.width;
    var ratio = clamp((raw - 0.05) / 0.9, 0, 1);
    var b = bandSpec();
    return b.min + ratio * (b.max - b.min);
  }

  function shanghaiParts(date) {
    var fmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    var out = {};
    fmt.formatToParts(date || new Date()).forEach(function (p) { out[p.type] = p.value; });
    return out;
  }

  function shanghaiHour() {
    return parseInt(shanghaiParts().hour, 10);
  }

  function isNight() {
    if (state.sky === "night") return true;
    if (state.sky === "day") return false;
    var h = shanghaiHour();
    return h >= 19 || h < 6;
  }

  function nightName() {
    if (state.sky === "night") return "入夜";
    if (state.sky === "day") return "白天";
    return isNight() ? "此刻 · 夜" : "此刻 · 昼";
  }

  function propagation(st, night) {
    if (st.dx) return night ? 1 : 0.4;
    if (st.band === "sw") return night ? 1 : 0.74;
    return night ? 0.94 : 1;
  }

  function carrierOf(st, t) {
    if (!st.drift) return st.freq;
    return st.freq + Math.sin((t / st.drift.period) * Math.PI * 2 + st.drift.phase) * st.drift.amp;
  }

  function measureAt(freq, t) {
    var night = isNight();
    var best = null;
    var heard = [];
    BAND.stations.forEach(function (st) {
      if (st.band !== state.band) return;
      var carrier = carrierOf(st, t);
      var detune = freq - carrier;
      var wide = (st.narrow ? 5.5 : 10) + state.bandwidth * 14;
      var skirt = Math.exp(-Math.pow(detune / wide, 2) * 1.15);
      var coreSigma = (st.narrow ? 0.62 : 1.15) + state.bandwidth * 2.4;
      var core = Math.exp(-Math.pow(detune / coreSigma, 2));
      var prop = propagation(st, night);
      var row = {
        st: st,
        carrier: carrier,
        detune: detune,
        skirt: skirt,
        core: core,
        prop: prop,
        presence: skirt * st.power * prop,
        loud: (core * 0.82 + skirt * 0.28) * st.power * prop
      };
      heard.push(row);
      if (!best || row.presence > best.presence) best = row;
    });
    return { best: best, heard: heard, night: night };
  }

  function computeMix(m) {
    var next = emptyMix();
    var cover = 0;
    m.heard.forEach(function (row) {
      cover = Math.max(cover, row.core * row.prop);
      var voice = row.st.voice;
      if (TALK[voice]) {
        var amt = voice === "seek" ? row.loud * 0.9 : row.loud * 0.95;
        next.talk += amt;
      }
      if (voice === "time") next.beep += row.loud;
      if (voice === "morse") next.morse += row.loud;
      if (voice === "music") next.music += row.loud;
      if (voice === "opera") next.opera += row.loud;
      if (voice === "numbers") next.numbers += row.loud;
      if (voice === "harbor") next.fog += row.loud * 0.85;
    });
    next.talk = clamp(next.talk, 0, 1);
    next.beep = clamp(next.beep, 0, 1);
    next.morse = clamp(next.morse, 0, 1);
    next.music = clamp(next.music, 0, 1);
    next.opera = clamp(next.opera, 0, 1);
    next.numbers = clamp(next.numbers, 0, 1);
    next.fog = clamp(next.fog, 0, 1);
    var bandNoise = state.band === "sw" ? (m.night ? 0.9 : 1.18) : 1;
    next.hiss = (0.16 + state.bandwidth * 0.34) * (1 - cover * 0.84) * bandNoise;
    if (m.best) {
      var hz = Math.abs(m.best.detune) * 1000;
      if (hz >= 28 && hz <= 3400) {
        var near = hz < 90 ? hz / 90 : 1;
        var far = hz > 1700 ? Math.max(0, 1 - (hz - 1700) / 1700) : 1;
        next.hetF = clamp(hz, 40, 3200);
        next.het = near * far * (1 - m.best.core) * m.best.skirt * 0.28;
      }
    }
    next.hum = state.powered ? 0.03 : 0;
    return next;
  }

  function approach(key, target, rate) {
    if (typeof smooth[key] !== "number" || !isFinite(smooth[key])) smooth[key] = 0;
    smooth[key] += (target - smooth[key]) * rate;
    if (Math.abs(smooth[key] - target) < 0.0008) smooth[key] = target;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      ["band", "sky"].forEach(function (k) {
        if (typeof data[k] === "string") state[k] = data[k];
      });
      ["mwBase", "swBase", "fine", "volume", "tone", "bandwidth", "storyIndex", "storyLeft"].forEach(function (k) {
        if (typeof data[k] === "number" && isFinite(data[k])) state[k] = data[k];
      });
      if (Array.isArray(data.log)) state.log = data.log.filter(validEntry);
      if (Array.isArray(data.heard)) {
        state.heard = data.heard.filter(function (n) { return typeof n === "number" && n >= 0 && n < STORY.length; });
      }
      state.storyDone = !!data.storyDone;
      state.fine = clamp(state.fine, -3, 3);
      state.volume = clamp(state.volume, 0, 1);
      state.tone = clamp(state.tone, 0, 1);
      state.bandwidth = clamp(state.bandwidth, 0, 1);
      if (state.band !== "mw" && state.band !== "sw") state.band = "mw";
      if (["auto", "night", "day"].indexOf(state.sky) < 0) state.sky = "auto";
      state.storyIndex = clamp(state.storyIndex | 0, 0, STORY.length - 1);
    } catch (e) { /* 旧簿子读不出来就从今晚重新听 */ }
  }

  function validEntry(e) {
    return e && typeof e.id === "string" && typeof e.name === "string";
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        band: state.band,
        sky: state.sky,
        mwBase: state.mwBase,
        swBase: state.swBase,
        fine: state.fine,
        volume: state.volume,
        tone: state.tone,
        bandwidth: state.bandwidth,
        log: state.log,
        heard: state.heard,
        storyIndex: state.storyIndex,
        storyLeft: state.storyLeft,
        storyDone: state.storyDone
      }));
    } catch (e) { /* 隐私模式里听完即走 */ }
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 180);
  }

  function buildAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 16;
    comp.ratio.value = 2.6;
    comp.attack.value = 0.012;
    comp.release.value = 0.22;
    var pre = ctx.createGain();
    var toneLow = ctx.createBiquadFilter();
    toneLow.type = "lowshelf";
    toneLow.frequency.value = 340;
    var toneHigh = ctx.createBiquadFilter();
    toneHigh.type = "highshelf";
    toneHigh.frequency.value = 2400;
    var program = ctx.createGain();
    program.connect(toneLow);
    toneLow.connect(toneHigh);
    toneHigh.connect(pre);

    var noiseBuf = makeNoise(ctx);
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    var staticFilter = ctx.createBiquadFilter();
    staticFilter.type = "bandpass";
    staticFilter.frequency.value = 1600;
    staticFilter.Q.value = 0.7;
    var staticGain = ctx.createGain();
    staticGain.gain.value = 0;
    noise.connect(staticFilter);
    staticFilter.connect(staticGain);
    staticGain.connect(toneLow);

    var talkSend = ctx.createGain();
    noise.connect(talkSend);
    var formantSum = ctx.createGain();
    var formants = [680, 1200, 2500].map(function (f, i) {
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = i === 2 ? 5 : 8;
      var g = ctx.createGain();
      g.gain.value = i === 0 ? 0.7 : i === 1 ? 0.42 : 0.22;
      talkSend.connect(bp);
      bp.connect(g);
      g.connect(formantSum);
      return bp;
    });
    var talkBed = ctx.createGain();
    talkBed.gain.value = 0;
    var syllable = ctx.createGain();
    syllable.gain.value = 0;
    var talkLevel = ctx.createGain();
    talkLevel.gain.value = 0;
    formantSum.connect(talkBed);
    talkBed.connect(program);
    formantSum.connect(syllable);
    syllable.connect(talkLevel);
    talkLevel.connect(program);

    function level(freq, type) {
      var osc = ctx.createOscillator();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      var key = ctx.createGain();
      key.gain.value = type ? 1 : 0;
      var lv = ctx.createGain();
      lv.gain.value = 0;
      osc.connect(key);
      key.connect(lv);
      lv.connect(program);
      osc.start();
      return { osc: osc, key: key, level: lv };
    }

    var het = ctx.createOscillator();
    het.type = "sine";
    het.frequency.value = 700;
    var hetGain = ctx.createGain();
    hetGain.gain.value = 0;
    het.connect(hetGain);
    hetGain.connect(pre);
    het.start();

    var hum = ctx.createGain();
    hum.gain.value = 0;
    [50, 100, 150].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.value = i === 0 ? 0.6 : 0.25;
      o.connect(g);
      g.connect(hum);
      o.start();
    });
    hum.connect(pre);

    var morseV = level(680);
    var musicLevel = ctx.createGain();
    musicLevel.gain.value = 0;
    musicLevel.connect(program);
    var operaLevel = ctx.createGain();
    operaLevel.gain.value = 0;
    operaLevel.connect(program);
    var numbersLevel = ctx.createGain();
    numbersLevel.gain.value = 0;
    numbersLevel.connect(program);
    var beepV = level(990);
    var fogLevel = ctx.createGain();
    fogLevel.gain.value = 0;
    fogLevel.connect(program);

    var analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    pre.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    master.connect(analyser);
    noise.start();

    return {
      ctx: ctx,
      master: master,
      staticGain: staticGain,
      staticFilter: staticFilter,
      toneLow: toneLow,
      toneHigh: toneHigh,
      talkBed: talkBed,
      syllable: syllable,
      talkLevel: talkLevel,
      formants: formants,
      formantSum: formantSum,
      het: het,
      hetGain: hetGain,
      hum: hum,
      morse: morseV,
      musicLevel: musicLevel,
      operaLevel: operaLevel,
      numbersLevel: numbersLevel,
      beep: beepV,
      fogLevel: fogLevel,
      program: program,
      analyser: analyser
    };
  }

  function makeNoise(ctx) {
    var n = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.95 * b2 + w * 0.05;
      d[i] = (b0 + b1 + b2 + w * 0.12) * 0.42;
    }
    return buf;
  }

  function retire(nodes, at) {
    if (!audio) return;
    var ms = Math.max(0, (at - audio.ctx.currentTime) * 1000) + 100;
    setTimeout(function () {
      nodes.forEach(function (n) {
        try { n.disconnect(); } catch (e) { /* 已经拆掉的线 */ }
      });
    }, ms);
  }

  function envGain(ctx, t, peak, attack, dur, dest) {
    var g = ctx.createGain();
    var start = Math.max(t, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.02, dur));
    g.connect(dest);
    retire([g], start + dur + 0.08);
    return g;
  }

  function thump() {
    var t = audio.ctx.currentTime;
    var o = audio.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    var g = envGain(audio.ctx, t, 0.35, 0.01, 0.22, audio.master);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.24);
  }

  function tickClick() {
    if (!audio || !state.powered) return;
    var t = audio.ctx.currentTime;
    var len = Math.floor(audio.ctx.sampleRate * 0.015);
    var buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 18);
    var src = audio.ctx.createBufferSource();
    src.buffer = buf;
    var g = audio.ctx.createGain();
    g.gain.value = 0.22;
    src.connect(g);
    g.connect(audio.master);
    src.start(t);
    src.onended = function () { src.disconnect(); g.disconnect(); };
  }

  function applyAudio() {
    if (!audio) return;
    var a = audio;
    var vol = (state.powered ? 1 : 0) * (0.08 + state.volume * 0.92);
    approach("master", vol, 0.18);
    a.master.gain.value = smooth.master || 0;
    approach("hiss", state.powered ? mix.hiss : 0, 0.12);
    a.staticGain.gain.value = smooth.hiss;
    approach("het", state.powered ? mix.het : 0, 0.2);
    a.hetGain.gain.value = smooth.het;
    if (mix.hetF) a.het.frequency.value = mix.hetF;
    approach("hum", mix.hum, 0.08);
    a.hum.gain.value = smooth.hum;
    approach("talk", state.powered ? mix.talk : 0, 0.12);
    a.talkLevel.gain.value = smooth.talk;
    a.talkBed.gain.value = smooth.talk * (bestVoice() === "seek" ? 0.05 : 0.12);
    approach("beep", state.powered ? mix.beep : 0, 0.15);
    a.beep.level.gain.value = smooth.beep * 0.45;
    approach("morse", state.powered ? mix.morse : 0, 0.12);
    a.morse.level.gain.value = smooth.morse * 0.55;
    approach("music", state.powered ? mix.music : 0, 0.1);
    a.musicLevel.gain.value = smooth.music;
    approach("opera", state.powered ? mix.opera : 0, 0.1);
    a.operaLevel.gain.value = smooth.opera;
    approach("numbers", state.powered ? mix.numbers : 0, 0.12);
    a.numbersLevel.gain.value = smooth.numbers;
    approach("fog", state.powered ? mix.fog : 0, 0.1);
    a.fogLevel.gain.value = smooth.fog;
    a.toneHigh.gain.value = (state.tone - 0.5) * 14;
    a.toneLow.gain.value = (0.5 - state.tone) * 10;
    a.staticFilter.Q.value = 0.35 + (1 - state.bandwidth) * 1.5;
    a.staticFilter.frequency.value = 800 + state.tone * 2000;
    shiftFormants();
  }

  function bestVoice() {
    return measure && measure.best && measure.best.presence > 0.08 ? measure.best.st.voice : "";
  }

  function shiftFormants() {
    if (!audio || !measure || !measure.best) return;
    var sets = {
      weather: [700, 1220, 2550],
      harbor: [520, 1080, 2200],
      seek: [820, 1500, 2860],
      story: [640, 1180, 2460],
      letters: [690, 1300, 2600],
      lesson: [710, 1250, 2480]
    };
    var f = sets[measure.best.st.voice] || [680, 1200, 2500];
    audio.formants.forEach(function (bp, i) { bp.frequency.value = f[i]; });
  }

  function schedule() {
    if (!audio || !state.powered) return;
    var ctx = audio.ctx;
    if (ctx.state !== "running") return;
    scheduleSyllables();
    scheduleMorse();
    scheduleMusic();
    scheduleOpera();
    scheduleNumbers();
    scheduleFog();
    scheduleBeeps();
    maybeCrackle();
  }

  function scheduleSyllables() {
    var tNow = audio.ctx.currentTime;
    if (smooth.talk < 0.04) {
      sylNext = tNow + 0.05;
      return;
    }
    if (sylNext < tNow) sylNext = tNow;
    var voice = bestVoice();
    var rate = voice === "seek" ? 0.62 : voice === "harbor" ? 0.22 : 0.17;
    var horizon = tNow + 0.28;
    while (sylNext < horizon) {
      var t = Math.max(sylNext, tNow);
      var peak = voice === "seek" ? 0.55 : 1;
      var g = audio.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (voice === "seek" ? 0.16 : 0.09));
      audio.formantSum.connect(g);
      g.connect(audio.talkLevel);
      retire([g], t + 0.22);
      sylNext += rate * (0.85 + Math.random() * 0.3);
    }
  }

  function morsePattern() {
    if (morse) return morse;
    var map = {
      V: "...-",
      "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
      "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----."
    };
    var unit = 0.088;
    var text = "VVV " + BAND.morseGroups.join(" ");
    var events = [];
    var groups = [];
    var t = 0;
    var words = text.split(" ");
    words.forEach(function (word, wi) {
      var start = t;
      for (var c = 0; c < word.length; c++) {
        var pat = map[word[c]];
        for (var i = 0; i < pat.length; i++) {
          var dur = (pat[i] === "-" ? 3 : 1) * unit;
          events.push({ t: t, dur: dur });
          t += dur + unit;
        }
        t += 2 * unit;
      }
      groups.push({ text: word, t0: start, t1: t });
      t += 4 * unit;
      if (wi === 0) t += unit * 4;
    });
    morse = { events: events, groups: groups, loop: t };
    return morse;
  }

  function scheduleMorse() {
    var pat = morsePattern();
    var tNow = audio.ctx.currentTime;
    if (smooth.morse < 0.05) {
      morseIdx = 0;
      morseBase = tNow + 0.05;
      return;
    }
    if (morseBase < tNow - pat.loop) morseBase = tNow;
    var guard = 0;
    while (guard++ < 30) {
      var ev = pat.events[morseIdx];
      var at = morseBase + ev.t;
      if (at > tNow + 0.35) break;
      if (at > tNow - 0.02) keyMorse(at, ev.dur);
      morseIdx++;
      if (morseIdx >= pat.events.length) {
        morseIdx = 0;
        morseBase += pat.loop;
      }
    }
  }

  function keyMorse(t, dur) {
    var g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, dur));
    audio.morse.osc.connect(g);
    g.connect(audio.morse.level);
    retire([g], t + dur + 0.06);
  }

  function currentMorseGroup() {
    if (!audio) return "";
    var pat = morsePattern();
    var pt = (audio.ctx.currentTime - morseBase);
    if (pat.loop <= 0) return "";
    pt = ((pt % pat.loop) + pat.loop) % pat.loop;
    var found = "";
    pat.groups.forEach(function (g) {
      if (pt >= g.t0 && pt < g.t1) found = g.text;
    });
    return found;
  }

  var MUSIC = [
    { d: 0, oct: 0, len: 0.7 },
    { d: 1, oct: 0, len: 0.7 },
    { d: null, len: 0.45 },
    { d: 4, oct: 0, len: 1.1 },
    { d: 3, oct: 0, len: 0.55 },
    { d: 2, oct: 0, len: 0.9 },
    { d: null, len: 0.6 },
    { d: 0, oct: -1, len: 1.4 },
    { d: 4, oct: 0, len: 0.5 },
    { d: 1, oct: 0, len: 1.2 }
  ];

  function pent(degree, oct, root) {
    var semis = [0, 2, 4, 7, 9][degree];
    return root * Math.pow(2, semis / 12 + oct);
  }

  function scheduleMusic() {
    var tNow = audio.ctx.currentTime;
    if (smooth.music < 0.04) {
      musicNext = tNow + 0.08;
      return;
    }
    if (musicNext < tNow) musicNext = tNow;
    var horizon = tNow + 0.4;
    while (musicNext < horizon) {
      var step = MUSIC[musicStep % MUSIC.length];
      if (step.d !== null) pluck(musicNext, pent(step.d, step.oct, 220), audio.musicLevel, 0.22);
      if (musicStep % 4 === 0) pluck(musicNext, 110, audio.musicLevel, 0.08);
      musicNext += step.len;
      musicStep++;
    }
  }

  function pluck(time, freq, dest, amp) {
    var ctx = audio.ctx;
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = freq;
    o2.frequency.value = freq * 2.003;
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.max(400, freq * 7), time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.6), time + 0.45);
    var g = envGain(ctx, time, amp, 0.012, 1.5, dest);
    var g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    o1.start(time);
    o2.start(time);
    o1.stop(time + 1.6);
    o2.stop(time + 1.6);
  }

  var OPERA = [
    { d: 0, len: 1.15 },
    { d: 2, len: 0.55 },
    { d: 4, len: 1.25 },
    { d: 3, len: 0.4 },
    { d: 2, len: 1.35 },
    { d: null, len: 0.5 },
    { d: 4, len: 0.7 },
    { d: 1, len: 1.5 }
  ];

  function scheduleOpera() {
    var tNow = audio.ctx.currentTime;
    if (smooth.opera < 0.04) {
      operaNext = tNow + 0.08;
      return;
    }
    if (operaNext < tNow) operaNext = tNow;
    var horizon = tNow + 0.4;
    while (operaNext < horizon) {
      var step = OPERA[operaStep % OPERA.length];
      if (operaStep % 4 === 0) clack(operaNext);
      if (step.d !== null) sung(operaNext, pent(step.d, 0, 293.66), step.len * 0.92);
      operaNext += step.len;
      operaStep++;
    }
  }

  function sung(time, freq, dur) {
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = "sawtooth";
    var sine = ctx.createOscillator();
    sine.type = "sine";
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 5.1;
    var lfoG = ctx.createGain();
    lfoG.gain.value = freq * 0.015;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);
    lfoG.connect(sine.frequency);
    o.frequency.setValueAtTime(freq * 0.96, time);
    sine.frequency.setValueAtTime(freq * 0.96, time);
    o.frequency.linearRampToValueAtTime(freq, time + Math.min(0.2, dur * 0.35));
    sine.frequency.linearRampToValueAtTime(freq, time + Math.min(0.2, dur * 0.35));
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    var mixG = ctx.createGain();
    var sawG = ctx.createGain();
    sawG.gain.value = 0.22;
    var g = envGain(ctx, time, 0.16, 0.05, Math.max(0.2, dur), audio.operaLevel);
    o.connect(sawG);
    sawG.connect(lp);
    sine.connect(lp);
    lp.connect(mixG);
    mixG.connect(g);
    o.start(time);
    sine.start(time);
    lfo.start(time);
    var stop = time + dur + 0.05;
    o.stop(stop);
    sine.stop(stop);
    lfo.stop(stop);
  }

  function clack(time) {
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(240, time);
    o.frequency.exponentialRampToValueAtTime(70, time + 0.04);
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 2;
    var g = envGain(ctx, time, 0.18, 0.004, 0.07, audio.operaLevel);
    o.connect(bp);
    bp.connect(g);
    o.start(time);
    o.stop(time + 0.08);
  }

  function knock(time) {
    if (!audio) return;
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(190, time);
    o.frequency.exponentialRampToValueAtTime(55, time + 0.05);
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    var g = envGain(ctx, time, 0.32, 0.004, 0.1, audio.program);
    o.connect(bp);
    bp.connect(g);
    o.start(time);
    o.stop(time + 0.12);
  }

  function scheduleNumbers() {
    var tNow = audio.ctx.currentTime;
    if (smooth.numbers < 0.05) {
      numbersNext = tNow + 0.1;
      return;
    }
    if (numbersNext < tNow) numbersNext = tNow;
    if (numbersNext > tNow + 0.3) return;
    var g = BAND.numberGroups[numbersIdx % BAND.numberGroups.length];
    numbersShown = g;
    chime(numbersNext, 740, 0.16);
    chime(numbersNext + 0.2, 980, 0.2);
    for (var i = 0; i < 4; i++) blip(numbersNext + 0.62 + i * 0.38);
    numbersIdx++;
    numbersNext += 6.4;
  }

  function chime(time, freq, dur) {
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o.frequency.value = freq;
    o2.frequency.value = freq * 2.01;
    var g = envGain(ctx, time, 0.16, 0.015, dur, audio.numbersLevel);
    var quiet = ctx.createGain();
    quiet.gain.value = 0.25;
    o.connect(g);
    o2.connect(quiet);
    quiet.connect(g);
    o.start(time);
    o2.start(time);
    o.stop(time + dur + 0.02);
    o2.stop(time + dur + 0.02);
  }

  function blip(time) {
    var ctx = audio.ctx;
    var len = Math.floor(ctx.sampleRate * 0.05);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var env = Math.exp(-i / 80);
      d[i] = Math.sin(i / ctx.sampleRate * Math.PI * 2 * 420) * env * 0.8;
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(g);
    g.connect(audio.numbersLevel);
    src.start(time);
  }

  function scheduleFog() {
    var tNow = audio.ctx.currentTime;
    if (smooth.fog < 0.08) {
      fogNext = tNow + 0.2;
      return;
    }
    if (fogNext < tNow) fogNext = tNow;
    if (fogNext > tNow + 0.4) return;
    foghorn(fogNext);
    foghorn(fogNext + 2.1);
    fogNext += 18;
  }

  function foghorn(time) {
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(128, time);
    o.frequency.exponentialRampToValueAtTime(74, time + 1.25);
    var g = envGain(ctx, time, 0.28, 0.08, 1.55, audio.fogLevel);
    o.connect(g);
    o.start(time);
    o.stop(time + 1.65);
  }

  function scheduleBeeps() {
    if (smooth.beep < 0.08) {
      beepWall = 0;
      return;
    }
    var nowMs = Date.now();
    var into = nowMs % 1000;
    var nextWall = nowMs + (into < 40 ? 1000 : 1000 - into);
    if (beepWall === nextWall) return;
    beepWall = nextWall;
    var delay = (nextWall - nowMs) / 1000;
    var at = audio.ctx.currentTime + delay;
    var sec = new Date(nextWall).getSeconds();
    var long = sec === 0;
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = long ? 520 : 990;
    var g = envGain(ctx, at, long ? 0.7 : 0.45, 0.008, long ? 0.42 : 0.08, audio.beep.level);
    o.connect(g);
    o.start(at);
    o.stop(at + (long ? 0.48 : 0.12));
  }

  var crackNext = 0;
  function maybeCrackle() {
    var tNow = audio.ctx.currentTime;
    if (tNow < crackNext) return;
    crackNext = tNow + 2.5 + Math.random() * 6;
    if (!state.powered || smooth.hiss < 0.02) return;
    var len = Math.floor(audio.ctx.sampleRate * 0.025);
    var buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 30);
    var src = audio.ctx.createBufferSource();
    src.buffer = buf;
    var g = audio.ctx.createGain();
    g.gain.value = 0.18 + Math.random() * 0.2;
    src.connect(g);
    g.connect(audio.master);
    src.start(tNow);
  }

  function garble(text, signal) {
    if (signal >= 0.8) return text;
    var flick = Math.floor(performance.now() / 160);
    var glyphs = "░▒▓·…—";
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === "\n" || ch === " " || ch === "，" || ch === "。") {
        out += ch;
        continue;
      }
      var n = Math.abs(Math.sin(i * 12.9898 + flick * 4.123));
      out += n < signal * signal ? ch : glyphs[(i + flick) % glyphs.length];
    }
    return out;
  }

  function segmentNow(st) {
    if (!st.segments || !st.segments.length) return "";
    var cycle = st.cycle || 12000;
    var idx = Math.floor(Date.now() / cycle) % st.segments.length;
    return st.segments[idx];
  }

  function storyDuration(text) {
    return Math.max(4200, text.length * 230);
  }

  function ensureStoryLeft() {
    if (state.storyLeft === null || !isFinite(state.storyLeft)) {
      state.storyLeft = storyDuration(STORY[state.storyIndex]);
    }
  }

  function markHeard(index) {
    if (state.heard.indexOf(index) >= 0) return;
    state.heard.push(index);
    state.heard.sort(function (a, b) { return a - b; });
    renderHeard();
    saveSoon();
  }

  function moveStory(dir) {
    if (dir > 0) markHeard(state.storyIndex);
    var next = state.storyIndex + dir;
    if (next < 0) next = 0;
    if (next >= STORY.length) {
      state.storyDone = true;
      state.storyIndex = STORY.length - 1;
      state.storyLeft = 0;
    } else {
      state.storyDone = false;
      state.storyIndex = next;
      state.storyLeft = storyDuration(STORY[next]);
      if (state.powered && audio) knock(audio.ctx.currentTime + 0.02);
    }
    saveSoon();
    renderPaper(true);
  }

  function paperFor(row) {
    if (!state.powered) {
      return {
        head: "电源未开",
        body: "旋钮是凉的。按下电源，等灯丝热起来，再去拧。",
        foot: "中波从 531 到 1602，短波在 5900 到 6200。"
      };
    }
    if (!row || row.presence < 0.12) {
      return {
        head: "静噪之外",
        body: "指针停在空处。沙沙声是海，不是节目。玻璃上的铅笔印，和听音簿里那张旧频率表，是同一批记号。",
        foot: nightName() + " · 带宽开大些，台更容易被撞见"
      };
    }
    var st = row.st;
    var clarity = clamp(row.core * (0.8 + row.prop * 0.2), 0, 1);
    var head = st.name + "  ·  " + st.freq.toFixed(0) + " kHz";
    if (st.drift) head += "  ·  载波 " + row.carrier.toFixed(1);
    var body = "";
    var foot = signalWord(row) + "  ·  " + nightName();
    if (st.voice === "time") {
      var p = shanghaiParts();
      body = "澄湾标准时间。" + parseInt(p.hour, 10) + " 点 " + p.minute + " 分 " + p.second + " 秒。整秒一滴，整分那一滴稍长。这只钟对过港务处，不对别处。";
    } else if (st.voice === "story") {
      ensureStoryLeft();
      body = STORY[state.storyIndex];
      var left = Math.max(0, state.storyLeft);
      foot = "第 " + (state.storyIndex + 1) + " 段 / " + STORY.length + "  ·  " + signalWord(row);
      if (state.storyDone) foot += "  ·  书场暂且停在这里";
      else foot += "  ·  这一段还剩 " + Math.ceil(left / 1000) + " 秒";
    } else if (st.voice === "seek") {
      body = st.fragments.filter(function (f) { return row.core >= f[0]; }).map(function (f) { return f[1]; }).join("\n");
      if (!body) body = "……";
      foot = "信号越稳，这句话越完整  ·  " + signalWord(row);
    } else if (st.voice === "morse") {
      var g = currentMorseGroup();
      var translated = /^\d{4}$/.test(g) ? (BAND.code[g] || "□") : "……";
      body = "先拍呼号 VVV，再来九组四位。\n正在拍：" + (g || "……") + "\n这一组对上半页：" + translated + "\n九组译完，是一句完整的话。";
      foot = "载波会走开，走开就用微调追";
    } else if (st.voice === "numbers") {
      var sheet = BAND.numberGroups.map(function (n) { return n === numbersShown ? "［" + n + "］" : n; }).join("   ");
      var ch = numbersShown ? (BAND.code[numbersShown] || "□") : "·";
      body = "五组四位，循环。先两声铃，再四个音。\n" + sheet + "\n这一组：" + ch;
      foot = "五组拼起来，是另一句";
    } else {
      body = segmentNow(st) || st.blurb;
    }
    if (st.drift && Math.abs(row.detune) > 0.35 && st.voice !== "morse") {
      foot += "  ·  载波在走动";
    }
    if (st.drift && Math.abs(row.detune) > 0.18) {
      foot += row.detune < 0 ? "  ·  载波在上面，再往上拧" : "  ·  载波在下面，再往下拧";
    }
    return {
      head: garble(head, Math.min(1, clarity + 0.22)),
      body: garble(body, clarity),
      foot: foot,
      story: st.voice === "story" && clarity > 0.62
    };
  }

  function signalWord(row) {
    if (row.core > 0.86 && row.loud > 0.2) return "听稳了";
    if (row.core > 0.5) return "还在晃";
    if (row.presence > 0.18) return "远处有一座";
    return "将进";
  }

  function renderPaper(force) {
    var now = performance.now();
    if (!force && now - paperStamp < 120) return;
    paperStamp = now;
    var row = measure && measure.best && measure.best.presence >= 0.12 ? measure.best : null;
    var view = paperFor(row);
    setText(els.paperHead, view.head);
    setText(els.paperBody, view.body);
    setText(els.paperFoot, view.foot);
    els.paperActions.hidden = !view.story;
    if (view.story) {
      els.prevPara.disabled = state.storyIndex <= 0;
      els.nextPara.disabled = false;
      els.replay.hidden = !state.storyDone && state.storyIndex === 0;
    }
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function renderScale() {
    var b = bandSpec();
    var ticks = "";
    var steps = Math.round((b.max - b.min) / b.minor);
    for (var i = 0; i <= steps; i++) {
      var f = b.min + i * b.minor;
      var isMajor = Math.round(f) % b.major === 0;
      var pct = freqPct(f);
      var label = isMajor ? "<span>" + Math.round(f) + "</span>" : "";
      ticks += '<i class="tick ' + (isMajor ? "major" : "minor") + '" style="left:' + pct + '%">' + label + "</i>";
    }
    els.ticks.innerHTML = ticks;
    var marks = "";
    BAND.stations.forEach(function (st) {
      if (st.band !== state.band) return;
      var pct = freqPct(st.freq);
      marks += '<i class="mark" style="left:' + pct + '%" title="' + st.name + '"></i>';
    });
    els.marks.innerHTML = marks;
  }

  function renderKnobs() {
    els.knobTune.style.transform = "rotate(" + (baseFreq() * (state.band === "sw" ? 0.8 : 2.2)) + "deg)";
    els.knobFine.style.transform = "rotate(" + (state.fine / 3 * 150) + "deg)";
    els.knobVol.style.transform = "rotate(" + (-130 + state.volume * 260) + "deg)";
    els.knobTone.style.transform = "rotate(" + (-130 + state.tone * 260) + "deg)";
    els.knobBw.style.transform = "rotate(" + (-130 + state.bandwidth * 260) + "deg)";
    var b = bandSpec();
    var pct = freqPct(tuned());
    els.needle.style.left = pct + "%";
    els.freqRead.textContent = tuned().toFixed(1);
    els.bandPill.textContent = b.name;
    var fineLabel = (state.fine >= 0 ? "+" : "") + state.fine.toFixed(1);
    els.finePill.textContent = "微调 " + fineLabel;
    els.btnMw.classList.toggle("is-on", state.band === "mw");
    els.btnSw.classList.toggle("is-on", state.band === "sw");
    els.btnAuto.classList.toggle("is-on", state.sky === "auto");
    els.btnNight.classList.toggle("is-on", state.sky === "night");
    els.btnDay.classList.toggle("is-on", state.sky === "day");
    var night = isNight();
    els.room.classList.toggle("is-night", night);
    els.room.classList.toggle("is-day", !night);
    els.radio.classList.toggle("is-on", state.powered);
    els.powerBtn.setAttribute("aria-pressed", state.powered ? "true" : "false");
    var s = 0;
    if (state.powered && measure && measure.best) s = Math.round(clamp(measure.best.loud, 0, 1) * 9);
    for (var i = 0; i < els.lamps.children.length; i++) {
      els.lamps.children[i].classList.toggle("on", i < s);
      els.lamps.children[i].classList.toggle("hot", i >= 7 && i < s);
    }
    var prop = state.powered
      ? (night ? "传播偏夜" : "传播偏昼") + (state.band === "sw" ? " · 短波会自己走" : " · 中波锚在刻度上")
      : "电源未开";
    if (state.powered && measure && measure.best && measure.best.st.drift && measure.best.core > 0.28) {
      prop += "  ·  载波 " + measure.best.carrier.toFixed(1);
    }
    setText(els.propLine, prop);
    var parts = shanghaiParts();
    setText(els.clock, parts.year + "年" + parts.month + "月" + parts.day + "日 " + parts.weekday + "\n澄湾 " + parts.hour + ":" + parts.minute + ":" + parts.second);
  }

  function renderLog() {
    if (!state.log.length) {
      els.log.innerHTML = '<p class="empty">还没有抄下来的声音。把一座台听稳，它会自己落在这里。</p>';
      return;
    }
    els.log.innerHTML = "";
    state.log.forEach(function (entry) {
      var node = document.createElement("article");
      node.className = "entry";
      node.innerHTML = '<div class="meta"></div><p></p><input type="text" maxlength="80" placeholder="记一笔，可空着" />';
      node.querySelector(".meta").textContent = entry.at + "  ·  " + entry.freq + " kHz  ·  " + entry.band;
      node.querySelector("p").textContent = entry.name + " — " + entry.excerpt;
      var input = node.querySelector("input");
      input.value = entry.note || "";
      input.dataset.id = entry.id;
      els.log.appendChild(node);
    });
  }

  function renderHeard() {
    if (!state.heard.length) {
      els.heard.innerHTML = '<p class="empty">还没从书场抄下段落。停在 810，听完一段，它会落在这里。</p>';
      return;
    }
    els.heard.innerHTML = "";
    state.heard.forEach(function (idx) {
      var node = document.createElement("article");
      node.className = "para";
      node.innerHTML = '<div class="meta"></div><p></p>';
      node.querySelector(".meta").textContent = "第 " + (idx + 1) + " 段";
      node.querySelector("p").textContent = STORY[idx];
      els.heard.appendChild(node);
    });
  }

  function renderTable() {
    var body = $("freqTable").querySelector("tbody");
    body.innerHTML = "";
    BAND.stations.forEach(function (st) {
      var tr = document.createElement("tr");
      var note = st.blurb;
      if (st.drift) note += "。载波会走动";
      if (st.dx) note += "。夜里更清楚";
      tr.innerHTML = "<td class='num'></td><td></td><td></td>";
      tr.children[0].textContent = st.freq.toFixed(0);
      tr.children[1].textContent = st.name;
      tr.children[2].textContent = (st.band === "sw" ? "短波 · " : "中波 · ") + note;
      body.appendChild(tr);
    });
  }

  function renderSlip() {
    var pairs = [
      ["3390", "潮"], ["6622", "退"], ["0037", "之"], ["0683", "后"], ["1574", "巷"],
      ["0656", "口"], ["6703", "还"], ["2589", "有"], ["3597", "灯"], ["7183", "雨"],
      ["0255", "停"], ["0055", "了"], ["0171", "来"], ["8126", "听"]
    ];
    els.slip.innerHTML = pairs.map(function (p) {
      return "<div><span>" + p[0] + "</span><span>" + p[1] + "</span></div>";
    }).join("");
  }

  function decodeInput() {
    var raw = els.codeIn.value.replace(/[^\d\s]/g, " ").trim();
    if (!raw) {
      els.decoded.textContent = "译出的字会落在这里。";
      return;
    }
    var groups = raw.split(/\s+/).filter(Boolean);
    if (groups.length === 1 && groups[0].length > 4 && groups[0].length % 4 === 0) {
      groups = groups[0].match(/.{4}/g);
    }
    var text = groups.map(function (g) {
      if (!/^\d{4}$/.test(g)) return "□";
      return BAND.code[g] || "□";
    }).join("");
    els.decoded.textContent = text;
  }

  function excerptOf(row) {
    var view = paperFor(row);
    var line = view.body.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)[0] || "";
    return line.slice(0, 42);
  }

  function maybeLog(row, dtMs) {
    if (!state.powered || !row || row.core < 0.84 || row.loud < 0.18) {
      holdMs = 0;
      holdId = "";
      return;
    }
    if (holdId !== row.st.id) {
      holdId = row.st.id;
      holdMs = 0;
    }
    holdMs += dtMs;
    if (holdMs < 1600) return;
    if (Date.now() - (lastLogged[row.st.id] || 0) < 90000) return;
    lastLogged[row.st.id] = Date.now();
    var parts = shanghaiParts();
    state.log.unshift({
      id: Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
      at: parts.hour + ":" + parts.minute,
      freq: tuned().toFixed(1),
      band: bandSpec().name,
      name: row.st.name,
      excerpt: excerptOf(row),
      note: ""
    });
    if (state.log.length > 40) state.log.pop();
    renderLog();
    saveSoon();
  }

  function advanceStory(dtMs) {
    if (!state.powered || !measure || !measure.best) return;
    var row = measure.best;
    if (row.st.voice !== "story" || row.core < 0.8 || state.storyDone) return;
    ensureStoryLeft();
    if (lastStoryIndex !== state.storyIndex) {
      lastStoryIndex = state.storyIndex;
      knockQueued = true;
    }
    if (knockQueued && audio) {
      knock(audio.ctx.currentTime + 0.03);
      knockQueued = false;
    }
    state.storyLeft -= dtMs;
    if (row.core > 0.84 && state.storyLeft < storyDuration(STORY[state.storyIndex]) - 1200) {
      markHeard(state.storyIndex);
    }
    if (state.storyLeft > 0) return;
    if (state.storyIndex >= STORY.length - 1) {
      state.storyDone = true;
      state.storyLeft = 0;
      markHeard(state.storyIndex);
      saveSoon();
      return;
    }
    state.storyIndex += 1;
    state.storyLeft = storyDuration(STORY[state.storyIndex]);
    lastStoryIndex = state.storyIndex;
    knockQueued = true;
    saveSoon();
  }

  function checkPass() {
    if (!measure || !measure.best) return;
    var row = measure.best;
    if (row.core > 0.82 && passId !== row.st.id) {
      passId = row.st.id;
      tickClick();
    }
    if (row.core < 0.25) passId = "";
  }

  function frame(ts) {
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    var t = audio ? audio.ctx.currentTime : performance.now() / 1000;
    measure = measureAt(tuned(), t);
    mix = computeMix(measure);
    if (state.powered) {
      applyAudio();
      advanceStory(dt * 1000);
      maybeLog(measure.best, dt * 1000);
      checkPass();
      drawSpeaker();
    } else if (audio) {
      applyAudio();
    }
    var eyeSignal = 0;
    if (state.powered && measure.best) eyeSignal = clamp(measure.best.loud, 0, 1);
    var dark = 330 - eyeSignal * 300;
    els.eyeShadow.style.setProperty("--dark", dark + "deg");
    renderKnobs();
    renderPaper(false);
    requestAnimationFrame(frame);
  }

  function drawSpeaker() {
    var c = els.speaker;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, c.clientWidth);
    var h = Math.max(1, c.clientHeight);
    if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
    }
    var g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    if (!audio) return;
    var arr = new Uint8Array(audio.analyser.fftSize);
    audio.analyser.getByteTimeDomainData(arr);
    g.beginPath();
    g.strokeStyle = "rgba(255, 186, 120, 0.9)";
    g.lineWidth = 2 * dpr;
    var mid = c.height / 2;
    for (var i = 0; i < arr.length; i++) {
      var x = (i / (arr.length - 1)) * c.width;
      var y = mid + ((arr[i] - 128) / 128) * mid * 0.8;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  function typing(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  }

  function drag(el, onDelta) {
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      var x = e.clientX;
      var y = e.clientY;
      function move(ev) {
        var dx = ev.clientX - x;
        var dy = ev.clientY - y;
        x = ev.clientX;
        y = ev.clientY;
        onDelta(dx, dy);
      }
      function up() {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        saveSoon();
      }
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
    });
  }

  function stepChannel(dir) {
    var step = state.band === "mw" ? 9 : 5;
    setBase(baseFreq() + dir * step);
  }

  async function togglePower() {
    if (!audio) {
      try {
        audio = buildAudio();
        smooth.master = 0;
      } catch (err) {
        els.paperHead.textContent = "这只箱子发不出声";
        els.paperBody.textContent = "浏览器没有把音频接口交出来。换一个较新的浏览器再打开一次。";
        return;
      }
    }
    state.powered = !state.powered;
    try { await audio.ctx.resume(); } catch (e) { /* 下一次点击再试 */ }
    if (state.powered) {
      smooth.master = Math.max(smooth.master || 0, 0.25);
      thump();
      if (audio.ctx.state !== "running") {
        els.paperFoot.textContent = "声音被浏览器拦住了。再按一次电源。";
      }
    }
    renderPaper(true);
    saveSoon();
  }

  function setBand(id) {
    if (id !== "mw" && id !== "sw") return;
    state.band = id;
    renderScale();
    renderPaper(true);
    saveSoon();
  }

  function setSky(id) {
    state.sky = id;
    saveSoon();
  }

  function logText() {
    var lines = ["未登记的波段 · 听音簿", ""];
    state.log.forEach(function (e) {
      lines.push(e.at + "  " + e.freq + " kHz  " + e.band + "  " + e.name);
      lines.push(e.excerpt);
      if (e.note) lines.push("记：" + e.note);
      lines.push("");
    });
    if (state.heard.length) {
      lines.push("书场《伞柄朝西》");
      state.heard.forEach(function (idx) {
        lines.push("第" + (idx + 1) + "段  " + STORY[idx]);
        lines.push("");
      });
    }
    return lines.join("\n");
  }

  function copyLog() {
    var text = logText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        els.copyLog.textContent = "已抄上";
        setTimeout(function () { els.copyLog.textContent = "抄成文本"; }, 1200);
      }, fallback);
    } else fallback();
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (e) { /* 选中失败就留在簿子里 */ }
      area.remove();
      els.copyLog.textContent = "已抄上";
      setTimeout(function () { els.copyLog.textContent = "抄成文本"; }, 1200);
    }
  }

  function bind() {
    $("powerBtn").addEventListener("click", togglePower);
    $("btnMw").addEventListener("click", function () { setBand("mw"); });
    $("btnSw").addEventListener("click", function () { setBand("sw"); });
    $("btnAuto").addEventListener("click", function () { setSky("auto"); });
    $("btnNight").addEventListener("click", function () { setSky("night"); });
    $("btnDay").addEventListener("click", function () { setSky("day"); });
    drag(els.knobTune, function (dx, dy) {
      var per = state.band === "mw" ? 0.32 : 0.09;
      setBase(baseFreq() + (-dy + dx) * per);
    });
    drag(els.knobFine, function (dx, dy) {
      state.fine = clamp(state.fine + (-dy + dx) * 0.012, -3, 3);
    });
    drag(els.knobVol, function (dx, dy) {
      state.volume = clamp(state.volume + (-dy) * 0.006, 0, 1);
    });
    drag(els.knobTone, function (dx, dy) {
      state.tone = clamp(state.tone + (-dy) * 0.006, 0, 1);
    });
    drag(els.knobBw, function (dx, dy) {
      state.bandwidth = clamp(state.bandwidth + (-dy) * 0.006, 0, 1);
    });
    els.knobFine.addEventListener("dblclick", function () {
      state.fine = 0;
      saveSoon();
    });
    var scaleDrag = false;
    var scaleX = 0;
    var moved = 0;
    els.scale.addEventListener("pointerdown", function (e) {
      scaleDrag = true;
      scaleX = e.clientX;
      moved = 0;
      els.scale.setPointerCapture(e.pointerId);
    });
    els.scale.addEventListener("pointermove", function (e) {
      if (!scaleDrag) return;
      var dx = e.clientX - scaleX;
      scaleX = e.clientX;
      moved += Math.abs(dx);
      var per = (bandSpec().max - bandSpec().min) / Math.max(1, els.scale.clientWidth * 0.9);
      setBase(baseFreq() + dx * per);
      state.fine = 0;
    });
    els.scale.addEventListener("pointerup", function (e) {
      if (moved < 4) {
        setBase(freqFromX(e.clientX));
        state.fine = 0;
      }
      scaleDrag = false;
      saveSoon();
    });
    els.scale.addEventListener("wheel", function (e) {
      e.preventDefault();
      var dir = e.deltaY > 0 ? -1 : 1;
      if (e.shiftKey) state.fine = clamp(state.fine + dir * 0.1, -3, 3);
      else setBase(baseFreq() + dir * (state.band === "mw" ? 1 : 0.4));
    }, { passive: false });
    document.addEventListener("keydown", function (e) {
      if (typing(e.target)) return;
      if (e.key === "p" || e.key === "P") { togglePower(); return; }
      if (e.key === "b" || e.key === "B") { setBand(state.band === "mw" ? "sw" : "mw"); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        var dir = e.key === "ArrowRight" ? 1 : -1;
        if (e.shiftKey) setBase(baseFreq() + dir);
        else stepChannel(dir);
      } else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        var big = state.band === "mw" ? 90 : 25;
        setBase(baseFreq() + (e.key === "PageUp" ? big : -big));
      } else if (e.key === "," || e.key === ".") {
        state.fine = clamp(state.fine + (e.key === "." ? 0.1 : -0.1), -3, 3);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        state.volume = clamp(state.volume + (e.key === "ArrowUp" ? 0.04 : -0.04), 0, 1);
      }
    });
    document.addEventListener("keyup", function () { saveSoon(); });
    els.prevPara.addEventListener("click", function () { moveStory(-1); });
    els.nextPara.addEventListener("click", function () { moveStory(1); });
    els.replay.addEventListener("click", function () {
      state.storyIndex = 0;
      state.storyDone = false;
      state.storyLeft = storyDuration(STORY[0]);
      if (audio) knock(audio.ctx.currentTime + 0.02);
      saveSoon();
      renderPaper(true);
    });
    els.log.addEventListener("input", function (e) {
      var id = e.target.dataset && e.target.dataset.id;
      if (!id) return;
      var entry = state.log.filter(function (item) { return item.id === id; })[0];
      if (!entry) return;
      entry.note = e.target.value;
      saveSoon();
    });
    els.copyLog.addEventListener("click", copyLog);
    els.clearLog.addEventListener("click", function () {
      if (!state.clearArmed) {
        state.clearArmed = true;
        els.clearLog.textContent = "再点一次，清空";
        clearTimeout(clearTimer);
        clearTimer = setTimeout(function () {
          state.clearArmed = false;
          els.clearLog.textContent = "清空";
        }, 2500);
        return;
      }
      state.log = [];
      state.clearArmed = false;
      els.clearLog.textContent = "清空";
      renderLog();
      saveSoon();
    });
    els.codeIn.addEventListener("input", decodeInput);
  }

  function boot() {
    els = {
      room: $("room"),
      radio: $("radio"),
      scale: $("scale"),
      ticks: $("ticks"),
      marks: $("marks"),
      needle: $("needle"),
      freqRead: $("freqRead"),
      bandPill: $("bandPill"),
      finePill: $("finePill"),
      lamps: $("lamps"),
      propLine: $("propLine"),
      paperHead: $("paperHead"),
      paperBody: $("paperBody"),
      paperFoot: $("paperFoot"),
      paperActions: $("paperActions"),
      prevPara: $("prevPara"),
      nextPara: $("nextPara"),
      replay: $("replay"),
      speaker: $("speaker"),
      knobTune: $("knobTune"),
      knobFine: $("knobFine"),
      knobVol: $("knobVol"),
      knobTone: $("knobTone"),
      knobBw: $("knobBw"),
      powerBtn: $("powerBtn"),
      btnMw: $("btnMw"),
      btnSw: $("btnSw"),
      btnAuto: $("btnAuto"),
      btnNight: $("btnNight"),
      btnDay: $("btnDay"),
      clock: $("clock"),
      log: $("log"),
      heard: $("heard"),
      slip: $("slip"),
      codeIn: $("codeIn"),
      decoded: $("decoded"),
      copyLog: $("copyLog"),
      clearLog: $("clearLog"),
      eyeShadow: $("eyeShadow")
    };
    for (var i = 0; i < 9; i++) {
      var lamp = document.createElement("i");
      els.lamps.appendChild(lamp);
    }
    smooth.master = 0;
    load();
    renderScale();
    renderTable();
    renderSlip();
    renderLog();
    renderHeard();
    bind();
    renderKnobs();
    setInterval(schedule, 60);
    requestAnimationFrame(frame);
  }

  boot();
})();
