// missions.js — three courier sorties: ring run, cargo drop, golden landing. Scoring included.
window.TW = window.TW || {};
(function () {
  'use strict';

  function ring(x, y, z) { return { x: x, y: y, z: z, r: 26, done: false }; }

  var SORTIES = [
    {
      id: 'rings',
      title: 'Sortie 1 — Ring Runner',
      brief: 'Thread the five sunset rings in order, then land at Lantern Field.',
      kind: 'rings',
      rings: [ring(-900, 230, -500), ring(-350, 260, -80), ring(150, 240, 180), ring(480, 220, 300), ring(660, 200, 340)],
      landRunway: 1,
      parTime: 150
    },
    {
      id: 'cargo',
      title: 'Sortie 2 — Cargo Drop',
      brief: 'Fly low over the Gull Rock drop zone to release the parcel, then land at Ember Strip.',
      kind: 'cargo',
      rings: [ring(-500, 250, 100), ring(300, 270, 500)],
      drop: { x: 1500, z: -650, r: 150, minAlt: 25, maxAlt: 130 },
      landRunway: 2,
      parTime: 210
    },
    {
      id: 'landing',
      title: 'Sortie 3 — Golden Landing',
      brief: 'Cross the Far Beacon gate, then grease the landing: slow, aligned, gentle sink.',
      kind: 'landing',
      rings: [ring(1000, 300, 800), ring(1400, 240, 1020)],
      landRunway: 3,
      parTime: 200
    }
  ];

  function createMissionState(index) {
    var src = SORTIES[window.TW.clamp(index, 0, SORTIES.length - 1)];
    var rings = src.rings.map(function (r) { return { x: r.x, y: r.y, z: r.z, r: r.r, done: false }; });
    return {
      index: index,
      sortie: src,
      rings: rings,
      nextRing: 0,
      cargoDropped: false,
      cargoScore: 0,
      landed: false,
      complete: false,
      failed: false,
      time: 0,
      message: src.brief,
      messageTimer: 6
    };
  }

  function objective(m) {
    if (m.complete) return { kind: 'done', label: 'Sortie complete', x: 0, y: 0, z: 0 };
    if (m.nextRing < m.rings.length) {
      var r = m.rings[m.nextRing];
      return { kind: 'ring', label: 'Ring ' + (m.nextRing + 1) + ' of ' + m.rings.length, x: r.x, y: r.y, z: r.z };
    }
    if (m.sortie.kind === 'cargo' && !m.cargoDropped) {
      return { kind: 'drop', label: 'Drop zone — fly low', x: m.sortie.drop.x, y: 60, z: m.sortie.drop.z };
    }
    var rw = window.TW.config.runways[m.sortie.landRunway];
    return { kind: 'land', label: 'Land at ' + rw.name, x: rw.x, y: window.TW.terrain.runwayElev(m.sortie.landRunway) + 10, z: rw.z };
  }

  function updateMission(m, p, dt, events) {
    if (m.complete || m.failed) return;
    m.time += dt;
    if (m.messageTimer > 0) m.messageTimer -= dt;

    if (m.nextRing < m.rings.length) {
      var r = m.rings[m.nextRing];
      var d = Math.sqrt((p.x - r.x) * (p.x - r.x) + (p.y - r.y) * (p.y - r.y) + (p.z - r.z) * (p.z - r.z));
      if (d < r.r) {
        r.done = true;
        m.nextRing++;
        events.push('ring');
        m.message = m.nextRing < m.rings.length ? 'Ring clear! Next ring ahead.' : 'All rings clear — head for the runway.';
        m.messageTimer = 3.5;
      }
    }

    if (m.sortie.kind === 'cargo' && !m.cargoDropped && m.nextRing >= m.rings.length) {
      var dz = m.sortie.drop;
      var dd = window.TW.dist2d(p.x, p.z, dz.x, dz.z);
      var agl = p.y - window.TW.terrain.heightAt(p.x, p.z);
      if (dd < dz.r && agl >= dz.minAlt && agl <= dz.maxAlt) {
        m.cargoDropped = true;
        m.cargoScore = Math.max(40, 100 - Math.round(dd * 0.35));
        events.push('cargo');
        m.message = 'Parcel away — accuracy ' + m.cargoScore + '%. Now land at Ember Strip.';
        m.messageTimer = 4;
      }
    }

    if (p.onGround && p.touchdown && p.touchdown.runway) {
      var target = window.TW.config.runways[m.sortie.landRunway].name;
      var goalsDone = m.nextRing >= m.rings.length && (m.sortie.kind !== 'cargo' || m.cargoDropped);
      if (p.touchdown.runway === target && goalsDone && p.speed < 8) {
        m.landed = true;
        m.complete = true;
        events.push('complete');
      } else if (p.touchdown.runway !== target && p.speed < 8) {
        m.message = 'Down at ' + p.touchdown.runway + ' — refuelled. Take off for ' + target + '.';
        m.messageTimer = 4;
        events.push('refuel');
        p.touchdown = null;
      }
    }
    if (p.crashed) { m.failed = true; events.push('crash'); }
  }

  function grade(m, p) {
    var timeScore = Math.max(0, 100 - Math.max(0, m.time - m.sortie.parTime) * 0.4);
    var fuelScore = p.fuel;
    var hullScore = p.hull;
    var landScore = p.touchdown ? (p.touchdown.gentle ? 100 : Math.max(20, 90 - p.touchdown.sink * 8)) : 0;
    var total = Math.round(timeScore * 0.25 + fuelScore * 0.2 + hullScore * 0.25 + landScore * 0.3 + (m.sortie.kind === 'cargo' ? m.cargoScore * 0.1 : 0));
    var letter = total >= 88 ? 'S' : total >= 75 ? 'A' : total >= 60 ? 'B' : total >= 42 ? 'C' : 'D';
    return { total: total, letter: letter, time: Math.round(timeScore), fuel: Math.round(fuelScore), hull: Math.round(hullScore), landing: Math.round(landScore) };
  }

  window.TW.missions = { SORTIES: SORTIES, createMissionState: createMissionState, objective: objective, updateMission: updateMission, grade: grade };
})();
