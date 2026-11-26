// audio.js — all sound synthesized with WebAudio. No audio files, no network.
window.TW = window.TW || {};
(function () {
  'use strict';
  var ctx = null, engineOsc = null, engineGain = null, windGain = null, started = false;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(ctx.destination);
      engineOsc.start();
      // Wind: looping filtered noise.
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      src.connect(bp); bp.connect(windGain); windGain.connect(ctx.destination);
      src.start();
      started = true;
      return true;
    } catch (e) { return false; }
  }

  function setEngine(throttle, speed, flying) {
    if (!ctx || !started) return;
    var t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(45 + throttle * 95, t, 0.08);
    engineGain.gain.setTargetAtTime(flying ? 0.015 + throttle * 0.05 : 0, t, 0.1);
    windGain.gain.setTargetAtTime(flying ? Math.min(0.06, speed * 0.0009) : 0, t, 0.15);
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noiseBurst(dur, vol) {
    if (!ensure()) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.value = vol || 0.25;
    src.connect(g); g.connect(ctx.destination); src.start();
  }

  window.TW.audio = {
    unlock: function () { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setEngine: setEngine,
    ring: function () { blip(880, 0.22, 'sine', 0.14); blip(1318, 0.3, 'sine', 0.1); },
    cargo: function () { blip(220, 0.18, 'triangle', 0.16, 90); },
    touchdown: function () { noiseBurst(0.18, 0.18); blip(140, 0.15, 'triangle', 0.12, 80); },
    crash: function () { noiseBurst(0.7, 0.32); blip(90, 0.6, 'sawtooth', 0.14, 35); },
    click: function () { blip(660, 0.07, 'square', 0.06); },
    fanfare: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.28, 'triangle', 0.13); }, i * 110); }); }
  };
})();
