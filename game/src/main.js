// main.js — Ternwing Courier game loop, screens, scoring, and wiring.
window.TW = window.TW || {};
(function () {
  'use strict';
  var C = window.TW.config;
  var COL = C.colors;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  window.TW.input.attach(canvas);

  function fit() {
    var scale = Math.min(window.innerWidth / C.viewW, window.innerHeight / C.viewH);
    canvas.style.width = Math.floor(C.viewW * scale) + 'px';
    canvas.style.height = Math.floor(C.viewH * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  var state = {
    screen: 'title',
    plane: window.TW.plane.createPlane(),
    mission: window.TW.missions.createMissionState(0),
    sortieIndex: 0,
    score: 0,
    time: 0,
    shotMode: null,
    snapCam: true,
    paused: false,
    useMouse: false,
    gradeResult: null,
    best: [0, 0, 0]
  };

  var query = window.TW.shots.parse();
  if (query.shot) {
    window.TW.shots.stage(state, query.shot, parseInt(query.seed || '1', 10) || 1);
  }

  function startSortie(index) {
    state.sortieIndex = window.TW.clamp(index, 0, window.TW.missions.SORTIES.length - 1);
    window.TW.plane.resetPlane(state.plane);
    state.mission = window.TW.missions.createMissionState(state.sortieIndex);
    state.score = 0;
    state.gradeResult = null;
    state.screen = 'flying';
    state.snapCam = true;
    state.paused = false;
  }

  function handleEvents(events) {
    events.forEach(function (ev) {
      var p = state.plane, m = state.mission;
      if (ev === 'ring') {
        state.score += 120;
        window.TW.audio.ring();
        var r = m.rings[m.nextRing - 1];
        if (r) window.TW.render.burst(r.x, r.y, r.z, '#ffd94a', 22);
      } else if (ev === 'cargo') {
        state.score += 150 + m.cargoScore;
        window.TW.audio.cargo();
        window.TW.render.burst(p.x, p.y - 4, p.z, '#7ad9ff', 18);
      } else if (ev === 'refuel') {
        window.TW.plane.refuelAndRepair(p);
        window.TW.audio.touchdown();
      } else if (ev === 'complete') {
        state.gradeResult = window.TW.missions.grade(m, p);
        state.score += state.gradeResult.total * 5;
        if (state.score > state.best[state.sortieIndex]) state.best[state.sortieIndex] = state.score;
        state.screen = 'complete';
        window.TW.audio.fanfare();
      } else if (ev === 'crash') {
        state.screen = 'crashed';
        window.TW.audio.crash();
        window.TW.render.burst(p.x, p.y, p.z, '#ff8a5a', 30);
      }
    });
  }

  function update(dt) {
    var p = state.plane, m = state.mission, input = window.TW.input;
    if (input.wasPressed('m')) { state.useMouse = !state.useMouse; window.TW.audio.click(); }
    if (state.screen === 'title') {
      if (input.wasPressed('enter') || input.wasPressed(' ')) { window.TW.audio.unlock(); startSortie(state.sortieIndex); }
      if (input.wasPressed('1')) state.sortieIndex = 0;
      if (input.wasPressed('2')) state.sortieIndex = 1;
      if (input.wasPressed('3')) state.sortieIndex = 2;
      return;
    }
    if (state.screen === 'complete' || state.screen === 'crashed') {
      if (input.wasPressed('enter')) startSortie(state.screen === 'complete' ? Math.min(2, state.sortieIndex + 1) : state.sortieIndex);
      if (input.wasPressed('r')) startSortie(state.sortieIndex);
      if (input.wasPressed('t')) state.screen = 'title';
      return;
    }
    // flying
    if (input.wasPressed('p')) state.paused = !state.paused;
    if (input.wasPressed('r')) { startSortie(state.sortieIndex); return; }
    if (input.wasPressed('f')) { p.flaps = !p.flaps; window.TW.audio.click(); }
    if (input.wasPressed('t')) { state.screen = 'title'; return; }
    if (state.paused) return;
    var axes = input.flightAxes(state.useMouse);
    var wasGround = p.onGround;
    window.TW.plane.updatePlane(p, axes, dt);
    if (!wasGround && p.onGround) window.TW.audio.touchdown();
    var events = [];
    window.TW.missions.updateMission(m, p, dt, events);
    handleEvents(events);
    window.TW.audio.setEngine(p.throttle, p.speed, !p.crashed);
    state.time += dt;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = COL.hudPanel;
    ctx.strokeStyle = 'rgba(255,179,107,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  }
  function txt(s, x, y, size, color, align, bold) {
    ctx.fillStyle = color || COL.hudText;
    ctx.font = (bold ? '700 ' : '600 ') + size + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  function drawTitle(W, H) {
    panel(W / 2 - 340, 60, 680, 600);
    txt('TERNWING COURIER', W / 2, 118, 44, COL.hudWarn, 'center', true);
    txt('Archipelago Mail Flight — sunset rings, cargo drops, golden landings', W / 2, 152, 15, COL.hudDim, 'center');
    txt('Fly the little mail plane Tern over seven sunset islands.', W / 2, 192, 16, COL.hudText, 'center');
    txt('Thread rings, drop parcels low, and grease the landing before fuel runs dry.', W / 2, 216, 16, COL.hudText, 'center');
    var sorties = window.TW.missions.SORTIES;
    sorties.forEach(function (s, i) {
      var y = 262 + i * 62;
      var sel = i === state.sortieIndex;
      ctx.fillStyle = sel ? 'rgba(255,179,107,0.22)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 300, y - 24, 600, 52, 8); ctx.fill();
      txt((i + 1) + '. ' + s.title + (state.best[i] ? '   ·   Best ' + state.best[i] : ''), W / 2, y - 8, 16, sel ? COL.hudWarn : COL.hudText, 'center', true);
      txt(s.brief, W / 2, y + 14, 12, COL.hudDim, 'center');
    });
    txt('CONTROLS', W / 2, 462, 14, COL.hudWarn, 'center', true);
    txt('↑ ↓ pitch  ·  ← → / A D bank & turn  ·  W S throttle  ·  F flaps  ·  M mouse steer (hold mouse)', W / 2, 486, 13, COL.hudText, 'center');
    txt('P pause  ·  R restart sortie  ·  T title  ·  Land gently: slow, aligned, sink under 2 m/s', W / 2, 508, 13, COL.hudText, 'center');
    txt('Watch fuel and hull — land at any strip to refuel and patch up.', W / 2, 530, 13, COL.hudDim, 'center');
    txt('Press 1–3 to choose a sortie, ENTER to fly', W / 2, 572, 18, COL.hudGood, 'center', true);
    txt('Throttle discipline wins: climb bleeds speed, dives gain it, stalls bite below 60 km/h.', W / 2, 606, 12, COL.hudDim, 'center');
  }

  function drawComplete(W, H) {
    var g = state.gradeResult;
    panel(W / 2 - 280, 130, 560, 430);
    txt('SORTIE COMPLETE', W / 2, 178, 32, COL.hudGood, 'center', true);
    txt(state.mission.sortie.title, W / 2, 212, 16, COL.hudDim, 'center');
    txt('GRADE ' + (g ? g.letter : '—'), W / 2, 272, 54, COL.hudWarn, 'center', true);
    if (g) {
      txt('Time ' + g.time + '   ·   Fuel left ' + g.fuel + '   ·   Hull ' + g.hull + '   ·   Landing ' + g.landing, W / 2, 322, 15, COL.hudText, 'center');
      txt('Sortie score ' + state.score + (state.best[state.sortieIndex] === state.score ? '  (best!)' : '  ·  Best ' + state.best[state.sortieIndex]), W / 2, 350, 15, COL.hudText, 'center');
    }
    if (state.plane.touchdown) txt('Touchdown sink ' + state.plane.touchdown.sink.toFixed(1) + ' m/s at ' + state.plane.touchdown.runway, W / 2, 380, 14, COL.hudDim, 'center');
    txt(state.sortieIndex < 2 ? 'ENTER — next sortie   ·   R — fly again   ·   T — title' : 'ENTER — fly again   ·   R — restart   ·   T — title', W / 2, 440, 15, COL.hudGood, 'center', true);
    txt('Golden hour waits for no courier. The next parcel is already packed.', W / 2, 482, 13, COL.hudDim, 'center');
  }

  function drawCrashed(W, H) {
    panel(W / 2 - 280, 180, 560, 330);
    txt('TERN IS DOWN', W / 2, 232, 34, COL.hudBad, 'center', true);
    txt(state.plane.hull <= 0 ? 'The hull gave out. Hard arrivals add up.' : 'That arrival was not a landing.', W / 2, 272, 16, COL.hudText, 'center');
    txt('Rings ' + state.mission.nextRing + '/' + state.mission.rings.length + '   ·   Score ' + state.score, W / 2, 312, 15, COL.hudDim, 'center');
    txt('Slow down, line up with the strip, flare with flaps (F),', W / 2, 352, 14, COL.hudText, 'center');
    txt('and keep the sink under 2 m/s. Water and hills are not runways.', W / 2, 374, 14, COL.hudText, 'center');
    txt('ENTER / R — fly again   ·   T — title', W / 2, 432, 16, COL.hudGood, 'center', true);
  }

  var last = performance.now();
  var acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var W = C.viewW, H = C.viewH;
    var rawDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.shotMode) {
      // Deterministic staged frame: no physics advance, fixed time.
      window.TW.render.render(ctx, W, H, state.plane, state.mission, state.time, 0, state.snapCam);
      state.snapCam = false;
      window.TW.hud.drawHud(ctx, W, H, state.plane, state.mission, state);
      window.TW.input.clearPressed();
      return;
    }
    acc += rawDt;
    var step = 1 / 60;
    var guard = 0;
    while (acc >= step && guard < 6) { update(step); acc -= step; guard++; }
    if (guard >= 6) acc = 0;
    window.TW.input.clearPressed();
    window.TW.render.render(ctx, W, H, state.plane, state.mission, state.time, rawDt, state.snapCam);
    state.snapCam = false;
    if (state.screen === 'flying' || state.screen === 'complete' || state.screen === 'crashed') {
      window.TW.hud.drawHud(ctx, W, H, state.plane, state.mission, state);
    }
    if (state.screen === 'title') drawTitle(W, H);
    if (state.screen === 'complete') drawComplete(W, H);
    if (state.screen === 'crashed') drawCrashed(W, H);
    if (state.paused && state.screen === 'flying') txt('PAUSED — P to resume', W / 2, H / 2 + 190, 20, COL.hudWarn, 'center', true);
    if (state.useMouse && state.screen === 'flying') txt('MOUSE STEER — hold mouse to fly', W / 2, H - 88, 12, COL.hudDim, 'center', true);
  }
  requestAnimationFrame(frame);

  canvas.addEventListener('mousedown', function () { window.TW.audio.unlock(); });
  window.addEventListener('keydown', function () { window.TW.audio.unlock(); }, { once: true });
})();
