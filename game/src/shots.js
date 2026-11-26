// shots.js — deterministic screenshot staging: ?shot=start|play|end&seed=1
// start = cover scene (airborne over the coast, ring + runway ahead, full HUD).
// play  = banked mid-flight over the islands. end = final approach over the runway.
window.TW = window.TW || {};
(function () {
  'use strict';

  function parse() {
    var q = {};
    var s = window.location.search.replace(/^\?/, '');
    s.split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return q;
  }

  function stage(state, shot, seed) {
    var p = state.plane;
    var terrain = window.TW.terrain;
    window.TW.terrain.rebuildScenery(seed || 7);
    state.shotMode = shot;
    state.time = 12.5;
    if (shot === 'start') {
      // Airborne off Home Atoll, ring 1 large ahead framing the horizon, Palm Cay beyond.
      p.x = -985; p.y = 218; p.z = -591;
      p.heading = 0.75; p.pitch = -0.03; p.bank = 0.1;
      p.speed = 44; p.throttle = 0.66; p.vy = 1.2;
      p.fuel = 88; p.hull = 100; p.flaps = false; p.onGround = false; p.crashed = false; p.stall = false;
      state.mission = window.TW.missions.createMissionState(0);
      state.mission.time = 18; state.mission.message = 'Thread the five sunset rings in order, then land at Lantern Field.'; state.mission.messageTimer = 99;
      state.score = 0;
    } else if (shot === 'play') {
      // Banked turn over Lantern Isle, two rings cleared, cargo sortie in progress.
      p.x = 180; p.y = 275; p.z = 60;
      p.heading = 1.05; p.pitch = -0.06; p.bank = -0.55;
      p.speed = 52; p.throttle = 0.74; p.vy = -1.8;
      p.fuel = 61; p.hull = 92; p.flaps = false; p.onGround = false; p.crashed = false; p.stall = false;
      state.mission = window.TW.missions.createMissionState(1);
      state.mission.rings[0].done = true; state.mission.rings[1].done = true; state.mission.nextRing = 2;
      state.mission.time = 74; state.mission.message = 'All rings clear — head for the runway.'; state.mission.messageTimer = 99;
      state.score = 420;
    } else if (shot === 'end') {
      // Final approach to Lantern Field: low, flaps down, runway filling the view.
      var rw = window.TW.config.runways[1];
      var elev = terrain.runwayElev(1);
      var back = 420;
      p.x = rw.x - Math.sin(rw.heading) * back;
      p.z = rw.z - Math.cos(rw.heading) * back;
      p.y = elev + 52;
      p.heading = rw.heading; p.pitch = 0.05; p.bank = 0.03;
      p.speed = 27; p.throttle = 0.34; p.vy = -1.6;
      p.fuel = 44; p.hull = 100; p.flaps = true; p.onGround = false; p.crashed = false; p.stall = false;
      state.mission = window.TW.missions.createMissionState(0);
      state.mission.rings.forEach(function (r) { r.done = true; });
      state.mission.nextRing = state.mission.rings.length;
      state.mission.time = 132; state.mission.message = 'All rings clear — head for the runway.'; state.mission.messageTimer = 99;
      state.score = 860;
    }
    state.screen = 'flying';
    state.snapCam = true;
    return state;
  }

  window.TW.shots = { parse: parse, stage: stage };
})();
