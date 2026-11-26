// terrain.js — deterministic archipelago heightfield, runway flattening, scenery anchors.
window.TW = window.TW || {};
(function () {
  'use strict';
  var C = window.TW.config;

  function islandHeight(isl, x, z) {
    var dx = x - isl.x, dz = z - isl.z;
    var d = Math.sqrt(dx * dx + dz * dz) / isl.r;
    if (d >= 1) return 0;
    var fall = Math.cos(d * Math.PI * 0.5);
    var base = isl.h * fall * fall;
    // Ridged detail so coasts and peaks read as land, not cones.
    var ridge = Math.sin(x * 0.012 + z * 0.009) * 0.5 + Math.sin(x * 0.03 - z * 0.021) * 0.3 + Math.sin((x + z) * 0.055) * 0.2;
    var detail = ridge * 14 * fall * (1 - fall * 0.4);
    return Math.max(0, base + detail);
  }

  function rawHeight(x, z) {
    var h = 0;
    for (var i = 0; i < C.islands.length; i++) {
      var ih = islandHeight(C.islands[i], x, z);
      if (ih > h) h = ih;
    }
    return h;
  }

  // Runway elevation: sampled once at each runway centre, then terrain blends flat nearby.
  var runwayElev = [];
  function initRunways() {
    runwayElev = C.runways.map(function (rw) { return rawHeight(rw.x, rw.z); });
  }
  initRunways();

  function runwayLocal(rw, x, z) {
    var dx = x - rw.x, dz = z - rw.z;
    var s = Math.sin(rw.heading), c = Math.cos(rw.heading);
    return { along: dx * s + dz * c, across: dx * c - dz * s };
  }

  function heightAt(x, z) {
    var h = rawHeight(x, z);
    for (var i = 0; i < C.runways.length; i++) {
      var rw = C.runways[i];
      var loc = runwayLocal(rw, x, z);
      var halfL = rw.length / 2 + 90, halfW = rw.width / 2 + 70;
      var da = Math.abs(loc.along) / halfL, dw = Math.abs(loc.across) / halfW;
      var m = Math.max(da, dw);
      if (m < 1) {
        var t = 1 - m;
        var blend = t * t * (3 - 2 * t);
        h = h * (1 - blend) + runwayElev[i] * blend;
      }
    }
    return h;
  }

  function runwayAt(x, z) {
    for (var i = 0; i < C.runways.length; i++) {
      var rw = C.runways[i];
      var loc = runwayLocal(rw, x, z);
      if (Math.abs(loc.along) <= rw.length / 2 && Math.abs(loc.across) <= rw.width / 2) {
        return { runway: rw, index: i, elev: runwayElev[i], along: loc.along, across: loc.across };
      }
    }
    return null;
  }

  function nearestRunway(x, z) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < C.runways.length; i++) {
      var rw = C.runways[i];
      var d = window.TW.dist2d(x, z, rw.x, rw.z);
      if (d < bestD) { bestD = d; best = { runway: rw, index: i, elev: runwayElev[i], dist: d }; }
    }
    return best;
  }

  // Fixed scenery anchors (houses, trees, lighthouses, boats) generated once from a seed.
  var scenery = [];
  function buildScenery(seed) {
    scenery = [];
    var rng = window.TW.makeRng(seed || 7);
    C.islands.forEach(function (isl, idx) {
      var houses = 6 + Math.floor(rng() * 6);
      for (var i = 0; i < houses; i++) {
        var a = rng() * Math.PI * 2, r = isl.r * (0.25 + rng() * 0.45);
        var hx = isl.x + Math.cos(a) * r, hz = isl.z + Math.sin(a) * r;
        var hh = heightAt(hx, hz);
        if (hh > 4 && hh < isl.h * 0.75) scenery.push({ kind: 'house', x: hx, z: hz, y: hh, s: 0.8 + rng() * 0.7, rot: rng() * Math.PI });
      }
      var trees = 26;
      for (var t = 0; t < trees; t++) {
        var ta = rng() * Math.PI * 2, tr = isl.r * (0.15 + rng() * 0.7);
        var tx = isl.x + Math.cos(ta) * tr, tz = isl.z + Math.sin(tr) * tr;
        var th = heightAt(tx, tz);
        if (th > 6) scenery.push({ kind: 'tree', x: tx, z: tz, y: th, s: 0.7 + rng() * 0.9, rot: rng() * Math.PI });
      }
      if (idx === 2 || idx === 6) {
        var lx = isl.x + isl.r * 0.55, lz = isl.z - isl.r * 0.3;
        scenery.push({ kind: 'lighthouse', x: lx, z: lz, y: heightAt(lx, lz), s: 1, rot: 0 });
      }
    });
    for (var b = 0; b < 9; b++) {
      var bx = -1800 + rng() * 3800, bz = -1600 + rng() * 3400;
      if (heightAt(bx, bz) < 1) scenery.push({ kind: 'boat', x: bx, z: bz, y: 0, s: 0.8 + rng() * 0.8, rot: rng() * Math.PI * 2 });
    }
    for (var u = 0; u < 14; u++) {
      var ux = -1600 + rng() * 3400, uz = -1400 + rng() * 3200;
      if (heightAt(ux, uz) < 1) scenery.push({ kind: 'buoy', x: ux, z: uz, y: 0, s: 1, rot: 0 });
    }
  }
  buildScenery(7);

  window.TW.terrain = {
    heightAt: heightAt,
    rawHeight: rawHeight,
    runwayAt: runwayAt,
    nearestRunway: nearestRunway,
    runwayLocal: runwayLocal,
    runwayElev: function (i) { return runwayElev[i]; },
    scenery: function () { return scenery; },
    rebuildScenery: buildScenery
  };
})();
