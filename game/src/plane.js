// plane.js — Tern flight model: throttle, energy, banked turns, stall, fuel, damage, landing.
window.TW = window.TW || {};
(function () {
  'use strict';
  var C = window.TW.config;
  var clamp = window.TW.clamp;

  function createPlane() {
    return {
      x: C.start.x, y: C.start.y, z: C.start.z,
      heading: C.start.heading,
      pitch: 0, bank: 0,
      speed: C.start.speed,
      throttle: C.start.throttle,
      vy: 0,
      fuel: C.fuelMax,
      hull: C.hullMax,
      flaps: false,
      onGround: false,
      crashed: false,
      stall: false,
      propAngle: 0,
      touchdown: null
    };
  }

  function resetPlane(p) {
    var n = createPlane();
    for (var k in n) p[k] = n[k];
    return p;
  }

  // One fixed-step update. axes: {pitch, roll, throttleDelta} in -1..1. dt seconds.
  function updatePlane(p, axes, dt) {
    if (p.crashed) return;
    var terrain = window.TW.terrain;

    p.throttle = clamp(p.throttle + axes.throttleDelta * 0.55 * dt, 0, 1);
    if (p.fuel <= 0) p.throttle = 0;

    var targetBank = axes.roll * 0.95;
    p.bank += (targetBank - p.bank) * Math.min(1, dt * 3.2);
    var targetPitch = axes.pitch * 0.42;
    p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 2.6);

    // Banked turn: heading rate grows with bank, eases at high speed.
    var turnRate = Math.tan(p.bank) * 9.8 / Math.max(14, p.speed);
    p.heading = window.TW.wrapAngle(p.heading + turnRate * dt);

    // Energy: engine pushes toward a throttle speed; climbing bleeds speed, diving gains it.
    var cruise = 16 + p.throttle * (C.maxSpeed - 16);
    var drag = p.flaps ? 7 : 0;
    p.speed += ((cruise - drag - p.speed) * 0.55 - Math.sin(p.pitch) * 14) * dt;
    p.speed = clamp(p.speed, 6, 92);

    p.stall = p.speed < C.stallSpeed && !p.onGround;
    var liftPitch = p.stall ? -0.22 : p.pitch;
    var climb = Math.sin(liftPitch) * p.speed;
    if (p.stall) climb -= (C.stallSpeed - p.speed) * 0.55;
    if (p.flaps && p.speed > C.stallSpeed) climb += 1.2;
    p.vy = climb;

    var vx = Math.sin(p.heading) * Math.cos(p.pitch) * p.speed;
    var vz = Math.cos(p.heading) * Math.cos(p.pitch) * p.speed;
    p.x += vx * dt;
    p.z += vz * dt;
    p.y += p.vy * dt;
    p.propAngle += (6 + p.throttle * 55) * dt;

    if (!p.onGround && p.fuel > 0) {
      p.fuel = Math.max(0, p.fuel - C.fuelBurnPerSec * (0.25 + p.throttle * 1.15) * dt);
    }

    var ground = terrain.heightAt(p.x, p.z);
    var rw = terrain.runwayAt(p.x, p.z);
    var floorY = (rw ? rw.elev : ground) + 1.6;

    if (p.y <= floorY) {
      p.y = floorY;
      if (rw && p.speed < 52 && Math.abs(p.vy) < 9 && Math.abs(p.bank) < 0.35) {
        // Touchdown on a runway: gentle = clean, firm = hull damage, never a free crash.
        var sink = Math.abs(p.vy);
        var dmg = sink > 4.5 ? (sink - 4.5) * 6 : 0;
        p.hull = Math.max(0, p.hull - dmg);
        p.touchdown = { runway: rw.runway.name, sink: sink, speed: p.speed, damage: dmg, gentle: sink <= 2.2 };
        p.onGround = true;
        p.pitch = 0; p.bank *= 0.4;
        if (p.hull <= 0) p.crashed = true;
      } else if (rw && p.speed < 60 && Math.abs(p.vy) < 13) {
        p.hull = Math.max(0, p.hull - 22);
        p.touchdown = { runway: rw.runway.name, sink: Math.abs(p.vy), speed: p.speed, damage: 22, gentle: false };
        p.onGround = true;
        if (p.hull <= 0) p.crashed = true;
      } else {
        // Terrain or water strike.
        p.hull = Math.max(0, p.hull - 45);
        p.crashed = true;
        p.touchdown = { runway: null, sink: Math.abs(p.vy), speed: p.speed, damage: 45, gentle: false };
      }
    } else if (p.y > floorY + 2) {
      p.onGround = false;
    }

    if (p.onGround) {
      // Rollout: friction bleeds speed; throttle can take off again.
      p.speed = Math.max(0, p.speed - (p.throttle > 0.75 ? 1.5 : 7) * dt);
      p.vy = 0;
      if (p.speed > 24 && p.pitch < -0.12 && p.throttle > 0.6) {
        p.onGround = false;
        p.y += 1.5;
      }
    }
    if (p.y > 900) p.y = 900;
  }

  function refuelAndRepair(p) {
    p.fuel = C.fuelMax;
    p.hull = Math.min(C.hullMax, p.hull + 35);
  }

  window.TW.plane = { createPlane: createPlane, resetPlane: resetPlane, updatePlane: updatePlane, refuelAndRepair: refuelAndRepair };
})();
