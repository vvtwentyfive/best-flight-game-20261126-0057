// render.js — pseudo-3D chase view: sunset sky, archipelago terrain, rings, runways, Tern.
window.TW = window.TW || {};
(function () {
  'use strict';
  var C = window.TW.config;
  var COL = C.colors;
  var clamp = window.TW.clamp;

  var cam = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, init: false };
  var particles = [];
  var clouds = [];
  (function buildClouds() {
    var rng = window.TW.makeRng(42);
    for (var i = 0; i < 40; i++) {
      clouds.push({ x: -2600 + rng() * 5600, y: 400 + rng() * 240, z: -2600 + rng() * 5600, s: 38 + rng() * 80, puffs: 3 + Math.floor(rng() * 3) });
    }
  })();

  function focal(H) { return (H / 2) / Math.tan(C.fovDeg * Math.PI / 360); }

  function basis(heading, pitch) {
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var fx = Math.sin(heading) * cp, fy = sp, fz = Math.cos(heading) * cp;
    var rx = Math.cos(heading), rz = -Math.sin(heading);
    // up = right x forward (approx, good for small pitch)
    var ux = -Math.sin(heading) * sp, uy = cp, uz = -Math.cos(heading) * sp;
    return { fx: fx, fy: fy, fz: fz, rx: rx, ry: 0, rz: rz, ux: ux, uy: uy, uz: uz };
  }

  function project(b, cx0, cy0, cz0, x, y, z, W, H, f) {
    var dx = x - cx0, dy = y - cy0, dz = z - cz0;
    var cz = dx * b.fx + dy * b.fy + dz * b.fz;
    if (cz < 2) return null;
    var cx = dx * b.rx + dz * b.rz;
    var cy = dx * b.ux + dy * b.uy + dz * b.uz;
    return { x: W / 2 + (cx / cz) * f, y: H / 2 - (cy / cz) * f, z: cz, s: f / cz };
  }

  function updateCamera(p, dt, snap) {
    var back = 30, up = 10;
    var tx = p.x - Math.sin(p.heading) * back;
    var tz = p.z - Math.cos(p.heading) * back;
    var ty = p.y + up - Math.sin(p.pitch) * 8;
    var ground = window.TW.terrain.heightAt(tx, tz) + 4;
    if (ty < ground) ty = ground;
    if (snap || !cam.init) {
      cam.x = tx; cam.y = ty; cam.z = tz; cam.heading = p.heading; cam.pitch = p.pitch * 0.55; cam.init = true;
    } else {
      var k = Math.min(1, dt * 4.5);
      cam.x += (tx - cam.x) * k;
      cam.y += (ty - cam.y) * k;
      cam.z += (tz - cam.z) * k;
      var dh = window.TW.wrapAngle(p.heading - cam.heading);
      cam.heading += dh * Math.min(1, dt * 5);
      cam.pitch += (p.pitch * 0.55 - cam.pitch) * Math.min(1, dt * 4);
    }
  }

  function drawSky(ctx, W, H, b, time) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.skyTop);
    g.addColorStop(0.38, COL.skyMid);
    g.addColorStop(0.62, COL.skyLow);
    g.addColorStop(0.78, COL.skyHorizon);
    g.addColorStop(1, '#7a3a4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sun: fixed world direction (west-northwest), low on the horizon.
    var sunDir = { x: -0.72, y: 0.16, z: 0.42 };
    var cz = sunDir.x * b.fx + sunDir.y * b.fy + sunDir.z * b.fz;
    if (cz > 0.05) {
      var f = focal(H);
      var sx = W / 2 + ((sunDir.x * b.rx + sunDir.z * b.rz) / cz) * f;
      var sy = H / 2 - ((sunDir.x * b.ux + sunDir.y * b.uy + sunDir.z * b.uz) / cz) * f;
      var glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 190);
      glow.addColorStop(0, 'rgba(255,217,138,0.95)');
      glow.addColorStop(0.25, 'rgba(255,179,107,0.45)');
      glow.addColorStop(1, 'rgba(255,140,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 190, sy - 190, 380, 380);
      ctx.fillStyle = COL.sun;
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    }
    // Stars fading in up top.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (var i = 0; i < 40; i++) {
      var hx = window.TW.hash2(i, 3, 9) * W, hy = window.TW.hash2(i, 7, 9) * H * 0.3;
      ctx.globalAlpha = 0.25 + window.TW.hash2(i, 11, 9) * 0.5;
      ctx.fillRect(hx, hy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function terrainColor(h, slope, dist) {
    var fog = clamp(dist / 2400, 0, 1);
    function mix(a, b2, t) { return [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t, a[2] + (b2[2] - a[2]) * t]; }
    var base;
    if (h <= 0.5) base = [29, 58, 95];
    else if (h < 6) base = [232, 176, 122];
    else if (h < 45) base = [122, 154, 74];
    else if (h < 95) base = [74, 122, 58];
    else if (h < 140) base = [138, 106, 94];
    else base = [201, 166, 138];
    var shade = clamp(1 - slope * 0.012, 0.55, 1.08);
    var c = [base[0] * shade, base[1] * shade, base[2] * shade];
    var fogCol = [232, 150, 110];
    c = mix(c, fogCol, fog * 0.55);
    return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  }

  function drawTerrain(ctx, W, H, b, f, time) {
    var step = C.gridStep;
    var range = 1500;
    var cx0 = Math.round(cam.x / step) * step;
    var cz0 = Math.round(cam.z / step) * step;
    var n = Math.floor(range / step);
    var verts = [];
    var i, j;
    for (j = -n; j <= n; j++) {
      var row = [];
      for (i = -n; i <= n; i++) {
        var wx = cx0 + i * step, wz = cz0 + j * step;
        var wh = window.TW.terrain.heightAt(wx, wz);
        row.push({ x: wx, y: wh, z: wz, p: project(b, cam.x, cam.y, cam.z, wx, wh, wz, W, H, f) });
      }
      verts.push(row);
    }
    var quads = [];
    for (j = 0; j < verts.length - 1; j++) {
      for (i = 0; i < verts[j].length - 1; i++) {
        var a = verts[j][i], bq = verts[j][i + 1], cq = verts[j + 1][i + 1], dq = verts[j + 1][i];
        if (!a.p || !bq.p || !cq.p || !dq.p) continue;
        var dist = (a.p.z + bq.p.z + cq.p.z + dq.p.z) / 4;
        if (dist > C.viewRange) continue;
        var hAvg = (a.y + bq.y + cq.y + dq.y) / 4;
        var slope = Math.abs(a.y - cq.y) + Math.abs(bq.y - dq.y);
        quads.push({ a: a.p, b: bq.p, c: cq.p, d: dq.p, dist: dist, h: hAvg, slope: slope, wx: a.x, wz: a.z });
      }
    }
    quads.sort(function (p1, p2) { return p2.dist - p1.dist; });
    quads.forEach(function (q) {
      ctx.fillStyle = terrainColor(q.h, q.slope, q.dist);
      ctx.beginPath();
      ctx.moveTo(q.a.x, q.a.y); ctx.lineTo(q.b.x, q.b.y); ctx.lineTo(q.c.x, q.c.y); ctx.lineTo(q.d.x, q.d.y);
      ctx.closePath(); ctx.fill();
      if (q.h <= 0.5) {
        // Sunset sparkle on the sea.
        var sp = window.TW.hash2(Math.floor(q.wx / step), Math.floor(q.wz / step) + Math.floor(time * 2), 5);
        if (sp > 0.86) {
          ctx.fillStyle = 'rgba(255,190,120,0.35)';
          var mx = (q.a.x + q.c.x) / 2, my = (q.a.y + q.c.y) / 2;
          ctx.fillRect(mx - 3, my, 6, 1.6);
        }
      }
    });
  }

  function drawRunways(ctx, W, H, b, f) {
    C.runways.forEach(function (rw, idx) {
      var elev = window.TW.terrain.runwayElev(idx);
      var s = Math.sin(rw.heading), c = Math.cos(rw.heading);
      function corner(along, across) {
        var wx = rw.x + s * along + c * across;
        var wz = rw.z + c * along - s * across;
        return project(b, cam.x, cam.y, cam.z, wx, elev + 0.4, wz, W, H, f);
      }
      var hl = rw.length / 2, hw = rw.width / 2;
      var p1 = corner(-hl, -hw), p2 = corner(hl, -hw), p3 = corner(hl, hw), p4 = corner(-hl, hw);
      if (!p1 || !p2 || !p3 || !p4) return;
      ctx.fillStyle = COL.runway;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = COL.runwayLine; ctx.lineWidth = Math.max(1, p1.s * 1.2);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.moveTo(p4.x, p4.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
      // Centreline dashes + threshold bars + edge lights.
      ctx.fillStyle = COL.runwayLine;
      for (var a = -hl + 30; a < hl - 20; a += 44) {
        var d1 = corner(a, 0), d2 = corner(a + 22, 0);
        if (d1 && d2) { ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.lineWidth = Math.max(1, d1.s * 1.6); ctx.strokeStyle = COL.runwayLine; ctx.stroke(); }
      }
      for (var e = -hl; e <= hl; e += 52) {
        [-hw, hw].forEach(function (ac) {
          var lp = corner(e, ac);
          if (lp) { ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(lp.x, lp.y, Math.max(1.2, lp.s * 1.1), 0, Math.PI * 2); ctx.fill(); }
        });
      }
      var mid = corner(0, 0);
      if (mid && mid.z < 1400) {
        ctx.fillStyle = 'rgba(255,233,200,0.95)';
        ctx.font = '700 ' + Math.max(10, Math.min(22, mid.s * 7)) + 'px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rw.name.toUpperCase(), mid.x, mid.y - 8);
      }
    });
  }

  function drawRings(ctx, W, H, b, f, mission, time) {
    mission.rings.forEach(function (r, i) {
      var p = project(b, cam.x, cam.y, cam.z, r.x, r.y, r.z, W, H, f);
      if (!p) return;
      var rad = Math.max(4, r.r * p.s);
      var isNext = i === mission.nextRing;
      var col = r.done ? COL.ringDone : (isNext ? COL.ringNext : COL.ringTodo);
      ctx.save();
      ctx.globalAlpha = r.done ? 0.45 : 0.95;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, rad * 0.09);
      ctx.shadowColor = col; ctx.shadowBlur = isNext ? 18 : 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, rad * 0.03);
      ctx.beginPath(); ctx.arc(p.x, p.y, rad * 0.86, 0, Math.PI * 2); ctx.stroke();
      // Chevrons pointing through the ring.
      ctx.fillStyle = col;
      var pulse = isNext ? (0.8 + Math.sin(time * 4) * 0.2) : 0.7;
      ctx.globalAlpha *= pulse;
      for (var k = 0; k < 4; k++) {
        var ang = k * Math.PI / 2 + time * (isNext ? 0.7 : 0.15);
        var cxp = p.x + Math.cos(ang) * rad, cyp = p.y + Math.sin(ang) * rad;
        ctx.beginPath(); ctx.arc(cxp, cyp, Math.max(2, rad * 0.07), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (isNext) {
        ctx.fillStyle = COL.ringNext;
        ctx.font = '700 13px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▼ NEXT RING', p.x, p.y - rad - 10);
      }
    });
    if (mission.sortie.kind === 'cargo' && !mission.cargoDropped && mission.nextRing >= mission.rings.length) {
      var dz = mission.sortie.drop;
      var dp = project(b, cam.x, cam.y, cam.z, dz.x, window.TW.terrain.heightAt(dz.x, dz.z) + 2, dz.z, W, H, f);
      if (dp) {
        var dr = Math.max(6, dz.r * dp.s);
        ctx.strokeStyle = '#7ad9ff'; ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.ellipse(dp.x, dp.y, dr, dr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#7ad9ff'; ctx.font = '700 13px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DROP ZONE', dp.x, dp.y - dr * 0.42 - 8);
      }
    }
  }

  function drawScenery(ctx, W, H, b, f, time) {
    var items = [];
    window.TW.terrain.scenery().forEach(function (s) {
      var p = project(b, cam.x, cam.y, cam.z, s.x, s.y, s.z, W, H, f);
      if (p && p.z < 1700) items.push({ s: s, p: p });
    });
    items.sort(function (a, b2) { return b2.p.z - a.p.z; });
    items.forEach(function (it) {
      var s = it.s, p = it.p, sc = p.s;
      if (s.kind === 'house') {
        var w = 14 * sc * s.s, h = 9 * sc * s.s;
        ctx.fillStyle = '#f2e3c8'; ctx.fillRect(p.x - w / 2, p.y - h, w, h);
        ctx.fillStyle = '#b84a3a';
        ctx.beginPath(); ctx.moveTo(p.x - w / 2 - 2, p.y - h); ctx.lineTo(p.x, p.y - h - 6 * sc * s.s); ctx.lineTo(p.x + w / 2 + 2, p.y - h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd98a'; ctx.fillRect(p.x - 2, p.y - h * 0.6, Math.max(1.5, 3 * sc), Math.max(1.5, 3 * sc));
      } else if (s.kind === 'tree') {
        var th = 16 * sc * s.s;
        ctx.fillStyle = '#5a3a2a'; ctx.fillRect(p.x - 1, p.y - th * 0.3, 2, th * 0.3);
        ctx.fillStyle = '#2e5f3a';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - th); ctx.lineTo(p.x - th * 0.32, p.y - th * 0.25); ctx.lineTo(p.x + th * 0.32, p.y - th * 0.25); ctx.closePath(); ctx.fill();
      } else if (s.kind === 'lighthouse') {
        var lh = 42 * sc;
        for (var band = 0; band < 4; band++) {
          ctx.fillStyle = band % 2 ? '#f2e3c8' : '#e85a3a';
          ctx.fillRect(p.x - 5 * sc, p.y - lh + band * lh / 4, 10 * sc, lh / 4);
        }
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath(); ctx.arc(p.x, p.y - lh - 3 * sc, Math.max(2, 4 * sc), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,217,138,0.18)';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - lh);
        ctx.lineTo(p.x + Math.cos(time * 0.5) * 90 * sc, p.y - lh + Math.sin(time * 0.5) * 14 * sc);
        ctx.lineTo(p.x + Math.cos(time * 0.5 + 0.3) * 90 * sc, p.y - lh + Math.sin(time * 0.5 + 0.3) * 14 * sc);
        ctx.closePath(); ctx.fill();
      } else if (s.kind === 'boat') {
        var bw = 20 * sc * s.s;
        ctx.fillStyle = '#7a3a2a';
        ctx.beginPath(); ctx.moveTo(p.x - bw / 2, p.y); ctx.lineTo(p.x + bw / 2, p.y); ctx.lineTo(p.x + bw * 0.32, p.y + 4 * sc); ctx.lineTo(p.x - bw * 0.32, p.y + 4 * sc); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 16 * sc * s.s); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x + 9 * sc * s.s, p.y); ctx.closePath(); ctx.fill();
      } else if (s.kind === 'buoy') {
        ctx.fillStyle = '#ff6a4a';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 5 * sc); ctx.lineTo(p.x - 3 * sc, p.y); ctx.lineTo(p.x + 3 * sc, p.y); ctx.closePath(); ctx.fill();
      }
    });
    // Clouds as soft billboards.
    clouds.forEach(function (cl) {
      var p = project(b, cam.x, cam.y, cam.z, cl.x, cl.y, cl.z, W, H, f);
      if (!p || p.z > 3200) return;
      var r = cl.s * p.s;
      ctx.fillStyle = 'rgba(255,190,160,0.34)';
      for (var k = 0; k < cl.puffs; k++) {
        var ox = (k - cl.puffs / 2) * r * 0.55;
        ctx.beginPath(); ctx.ellipse(p.x + ox, p.y + Math.sin(k * 2.1) * r * 0.12, r * 0.62, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,230,200,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y - r * 0.12, r * 0.9, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawPlaneShadow(ctx, W, H, b, f, p) {
    var gy = window.TW.terrain.heightAt(p.x, p.z);
    var sp = project(b, cam.x, cam.y, cam.z, p.x, gy + 0.5, p.z, W, H, f);
    if (!sp) return;
    var agl = Math.max(0, p.y - gy);
    var r = Math.max(4, (16 - Math.min(12, agl * 0.04)) * sp.s);
    ctx.fillStyle = 'rgba(20,10,30,0.4)';
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, r * 1.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlane(ctx, W, H, p, time) {
    // Chase view: the Tern sits centre-low, banked with the turn, prop spinning.
    var cx = W / 2 + p.bank * -26;
    var cy = H * 0.6 + p.pitch * 46;
    var span = 360;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.bank * 0.85);
    var squeeze = 1 - Math.abs(p.bank) * 0.12;
    ctx.scale(squeeze, 1);
    // Main wing (seen from behind-above).
    ctx.fillStyle = COL.planeBody;
    ctx.strokeStyle = COL.planeDark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-span / 2, 6); ctx.lineTo(-span * 0.14, -10); ctx.lineTo(span * 0.14, -10); ctx.lineTo(span / 2, 6);
    ctx.lineTo(span * 0.44, 20); ctx.lineTo(-span * 0.44, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.planeStripe;
    ctx.fillRect(-span / 2 + 4, 8, span * 0.2, 7);
    ctx.fillRect(span / 2 - span * 0.2 - 4, 8, span * 0.2, 7);
    // Fuselage tapering to the nose (away from camera).
    ctx.fillStyle = COL.planeBody;
    ctx.beginPath();
    ctx.moveTo(-27, 36); ctx.quadraticCurveTo(-22, -36, -9, -84);
    ctx.lineTo(9, -84); ctx.quadraticCurveTo(22, -36, 27, 36);
    ctx.quadraticCurveTo(0, 48, -27, 36); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(58,46,74,0.18)';
    ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(9, -84); ctx.quadraticCurveTo(22, -36, 27, 36); ctx.quadraticCurveTo(12, 44, 0, 44); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.planeStripe;
    ctx.beginPath(); ctx.moveTo(-23, 16); ctx.lineTo(23, 16); ctx.lineTo(24, 27); ctx.lineTo(-24, 27); ctx.closePath(); ctx.fill();
    // Canopy.
    ctx.fillStyle = '#7ad9ff';
    ctx.beginPath(); ctx.ellipse(0, -40, 13, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-3, -44, 4, 9, -0.3, 0, Math.PI * 2); ctx.fill();
    // Tail: horizontal stabilizer + fin (closest to camera, largest).
    ctx.fillStyle = COL.planeBody;
    ctx.beginPath();
    ctx.moveTo(-62, 40); ctx.lineTo(-14, 30); ctx.lineTo(14, 30); ctx.lineTo(62, 40);
    ctx.lineTo(56, 50); ctx.lineTo(-56, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.planeStripe;
    ctx.beginPath(); ctx.moveTo(-7, 42); ctx.lineTo(0, 8); ctx.lineTo(7, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Propeller blur at the nose.
    ctx.fillStyle = 'rgba(40,30,50,0.35)';
    ctx.beginPath(); ctx.ellipse(0, -82, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -82, 30, 7, 0, 0, Math.PI * 2); ctx.stroke();
    var pa = p.propAngle;
    ctx.strokeStyle = 'rgba(58,46,74,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(pa) * 28, -82 + Math.sin(pa) * 6);
    ctx.lineTo(-Math.cos(pa) * 28, -82 - Math.sin(pa) * 6);
    ctx.stroke();
    // Wing-tip nav lights.
    ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.arc(-span / 2 + 3, 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4aff8a'; ctx.beginPath(); ctx.arc(span / 2 - 3, 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Landing light glow when low.
    var agl = p.y - window.TW.terrain.heightAt(p.x, p.z);
    if (agl < 90 && !p.onGround) {
      var lg = ctx.createRadialGradient(cx, cy - 60, 2, cx, cy - 60, 90);
      lg.addColorStop(0, 'rgba(255,240,190,0.5)');
      lg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(cx - 90, cy - 150, 180, 180);
    }
  }

  function burst(x, y, z, color, n) {
    for (var i = 0; i < (n || 16); i++) {
      particles.push({ x: x, y: y, z: z, vx: (Math.random() - 0.5) * 14, vy: Math.random() * 8, vz: (Math.random() - 0.5) * 14, life: 0.9, color: color });
    }
  }
  function drawParticles(ctx, W, H, b, f, dt) {
    particles = particles.filter(function (pt) { return pt.life > 0; });
    particles.forEach(function (pt) {
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt; pt.vy -= 6 * dt;
      var p = project(b, cam.x, cam.y, cam.z, pt.x, pt.y, pt.z, W, H, f);
      if (!p) return;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, 2.2 * p.s), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  // Polish pass: gull flocks, exhaust trail, and a sun-glint lane on the sea.
  var birds = [];
  (function buildBirds() {
    var rng = window.TW.makeRng(99);
    for (var i = 0; i < 22; i++) {
      birds.push({ x: -1800 + rng() * 4000, y: 120 + rng() * 160, z: -1600 + rng() * 3600, ph: rng() * Math.PI * 2, sp: 6 + rng() * 5 });
    }
  })();
  var exhaust = [];
  function drawBirds(ctx, W, H, b, f, time) {
    ctx.strokeStyle = 'rgba(40,25,45,0.85)';
    ctx.lineWidth = 2;
    birds.forEach(function (bd) {
      var bx = bd.x + Math.sin(time * 0.05 + bd.ph) * 120;
      var bz = bd.z + Math.cos(time * 0.04 + bd.ph) * 120;
      var by = bd.y + Math.sin(time * 0.3 + bd.ph) * 6;
      var p = project(b, cam.x, cam.y, cam.z, bx, by, bz, W, H, f);
      if (!p || p.z > 1200) return;
      var w = Math.max(3, 5 * p.s);
      var flap = Math.sin(time * bd.sp + bd.ph) * w * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y - flap);
      ctx.quadraticCurveTo(p.x - w * 0.3, p.y + 1, p.x, p.y);
      ctx.quadraticCurveTo(p.x + w * 0.3, p.y + 1, p.x + w, p.y - flap);
      ctx.stroke();
    });
  }
  function drawExhaust(ctx, W, H, b, f, p, dt) {
    if (dt > 0 && !p.crashed && p.throttle > 0.15) {
      exhaust.push({ x: p.x - Math.sin(p.heading) * 4, y: p.y - 0.5, z: p.z - Math.cos(p.heading) * 4, life: 0.7 });
      if (exhaust.length > 40) exhaust.shift();
    }
    exhaust = exhaust.filter(function (e) { return e.life > 0; });
    exhaust.forEach(function (e) {
      e.life -= Math.max(dt, 0.016);
      var sp = project(b, cam.x, cam.y, cam.z, e.x, e.y, e.z, W, H, f);
      if (!sp) return;
      ctx.globalAlpha = Math.max(0, e.life * 0.35);
      ctx.fillStyle = '#e8d8c8';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, Math.max(1.5, (0.7 - e.life + 0.4) * 3 * sp.s), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function render(ctx, W, H, p, mission, time, dt, snapCam) {
    updateCamera(p, dt, snapCam);
    var b = basis(cam.heading, cam.pitch);
    var f = focal(H);
    drawSky(ctx, W, H, b, time);
    drawTerrain(ctx, W, H, b, f, time);
    drawRunways(ctx, W, H, b, f);
    drawScenery(ctx, W, H, b, f, time);
    drawRings(ctx, W, H, b, f, mission, time);
    drawPlaneShadow(ctx, W, H, b, f, p);
    drawExhaust(ctx, W, H, b, f, p, dt);
    drawParticles(ctx, W, H, b, f, dt);
    drawBirds(ctx, W, H, b, f, time);
    drawPlane(ctx, W, H, p, time);
  }

  window.TW.render = { render: render, burst: burst, camera: function () { return cam; } };
})();
