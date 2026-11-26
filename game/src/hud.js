// hud.js — lit instruments: compass tape, altitude/speed tapes, horizon, gauges, minimap.
window.TW = window.TW || {};
(function () {
  'use strict';
  var C = window.TW.config;
  var COL = C.colors;

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = COL.hudPanel;
    ctx.strokeStyle = 'rgba(255,179,107,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill(); ctx.stroke();
  }
  function text(ctx, s, x, y, size, color, align, bold) {
    ctx.fillStyle = color || COL.hudText;
    ctx.font = (bold ? '700 ' : '600 ') + size + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function headingDeg(h) {
    var d = (h * 180 / Math.PI) % 360;
    return d < 0 ? d + 360 : d;
  }
  function compassPoint(deg) {
    var pts = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return pts[Math.round(deg / 45) % 8];
  }

  function drawCompass(ctx, W, p) {
    var w = 420, x = W / 2 - w / 2, y = 14;
    panel(ctx, x, y, w, 52);
    var deg = headingDeg(p.heading);
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 6, y + 4, w - 12, 44); ctx.clip();
    for (var d = -60; d <= 60; d += 5) {
      var hd = ((deg + d) % 360 + 360) % 360;
      var sx = W / 2 + d * 3.1;
      var major = Math.round(hd) % 30 === 0;
      ctx.strokeStyle = major ? COL.hudText : COL.hudDim;
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(sx, y + 34); ctx.lineTo(sx, y + (major ? 22 : 28)); ctx.stroke();
      if (major) text(ctx, String(Math.round(hd / 10)).padStart(2, '0'), sx, y + 14, 11, COL.hudText, 'center', true);
    }
    ctx.restore();
    ctx.fillStyle = COL.hudWarn;
    ctx.beginPath(); ctx.moveTo(W / 2 - 7, y + 46); ctx.lineTo(W / 2 + 7, y + 46); ctx.lineTo(W / 2, y + 36); ctx.fill();
    text(ctx, 'HDG ' + String(Math.round(deg)).padStart(3, '0') + '° ' + compassPoint(deg), W / 2, y + 60, 13, COL.hudText, 'center', true);
  }

  function drawTape(ctx, x, y, w, h, value, step, fmt, label, unit) {
    panel(ctx, x, y, w, h);
    var midY = y + h / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 4, y + 24, w - 8, h - 48); ctx.clip();
    var base = Math.floor(value / step) * step;
    for (var v = base - step * 5; v <= base + step * 5; v += step) {
      var sy = midY - (v - value) * (h / (step * 7));
      if (sy < y + 22 || sy > y + h - 22) continue;
      ctx.strokeStyle = COL.hudDim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 8, sy); ctx.lineTo(x + 22, sy); ctx.stroke();
      text(ctx, fmt(v), x + w - 8, sy, 12, COL.hudDim, 'right');
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,217,74,0.92)';
    ctx.beginPath(); ctx.roundRect(x + 6, midY - 14, w - 12, 28, 5); ctx.fill();
    text(ctx, fmt(value), x + w / 2, midY, 17, '#241432', 'center', true);
    text(ctx, label, x + w / 2, y + 13, 11, COL.hudDim, 'center', true);
    text(ctx, unit, x + w / 2, y + h - 12, 10, COL.hudDim, 'center');
  }

  function drawHorizon(ctx, W, H, p) {
    var cx = W / 2, cy = H / 2 - 10, r = 86;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-p.bank);
    var pitchPx = p.pitch * 130;
    ctx.fillStyle = 'rgba(90,140,220,0.85)';
    ctx.fillRect(-r * 2, -r * 2 + pitchPx, r * 4, r * 2);
    ctx.fillStyle = 'rgba(140,90,60,0.9)';
    ctx.fillRect(-r * 2, pitchPx, r * 4, r * 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 2, pitchPx); ctx.lineTo(r * 2, pitchPx); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    [-20, -10, 10, 20].forEach(function (deg) {
      var ly = pitchPx + deg * 2.2;
      var lw = Math.abs(deg) === 10 ? 34 : 22;
      ctx.beginPath(); ctx.moveTo(-lw, ly); ctx.lineTo(lw, ly); ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,179,107,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // Fixed aircraft symbol.
    ctx.strokeStyle = COL.hudWarn; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 44, cy); ctx.lineTo(cx - 14, cy); ctx.lineTo(cx - 8, cy + 7);
    ctx.moveTo(cx + 44, cy); ctx.lineTo(cx + 14, cy); ctx.lineTo(cx + 8, cy + 7);
    ctx.stroke();
    ctx.fillStyle = COL.hudWarn;
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawGauge(ctx, x, y, w, label, frac, color, valueText) {
    text(ctx, label, x, y, 11, COL.hudDim, 'left', true);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.roundRect(x, y + 8, w, 12, 5); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, y + 8, Math.max(0, w * window.TW.clamp(frac, 0, 1)), 12, 5); ctx.fill();
    text(ctx, valueText, x + w, y, 11, COL.hudText, 'right', true);
  }

  function drawMinimap(ctx, W, H, p, mission) {
    var s = 150, x = W - s - 16, y = H - s - 16;
    panel(ctx, x, y, s, s);
    var scale = s / 4200;
    function mx(wx) { return x + s / 2 + wx * scale; }
    function mz(wz) { return y + s / 2 + wz * scale; }
    C.islands.forEach(function (isl) {
      ctx.fillStyle = 'rgba(122,154,74,0.85)';
      ctx.beginPath(); ctx.arc(mx(isl.x), mz(isl.z), Math.max(4, isl.r * scale), 0, Math.PI * 2); ctx.fill();
    });
    C.runways.forEach(function (rw, i) {
      ctx.strokeStyle = i === mission.sortie.landRunway ? COL.hudGood : '#fff';
      ctx.lineWidth = 2.5;
      var dx = Math.sin(rw.heading) * rw.length / 2 * scale, dz = Math.cos(rw.heading) * rw.length / 2 * scale;
      ctx.beginPath(); ctx.moveTo(mx(rw.x) - dx, mz(rw.z) - dz); ctx.lineTo(mx(rw.x) + dx, mz(rw.z) + dz); ctx.stroke();
    });
    mission.rings.forEach(function (r, i) {
      ctx.strokeStyle = r.done ? COL.hudGood : (i === mission.nextRing ? COL.hudWarn : COL.hudBad);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx(r.x), mz(r.z), 5, 0, Math.PI * 2); ctx.stroke();
    });
    if (mission.sortie.kind === 'cargo' && !mission.cargoDropped) {
      ctx.strokeStyle = '#7ad9ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx(mission.sortie.drop.x), mz(mission.sortie.drop.z), mission.sortie.drop.r * scale, 0, Math.PI * 2); ctx.stroke();
    }
    // Plane arrow.
    ctx.save();
    ctx.translate(mx(p.x), mz(p.z));
    ctx.rotate(p.heading);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-5, -6); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, 'CHART', x + s / 2, y + 11, 10, COL.hudDim, 'center', true);
  }

  function drawObjectiveArrow(ctx, W, H, p, mission) {
    var obj = window.TW.missions.objective(mission);
    if (obj.kind === 'done') return;
    var bearing = Math.atan2(obj.x - p.x, obj.z - p.z);
    var rel = window.TW.wrapAngle(bearing - p.heading);
    var dist = Math.sqrt((obj.x - p.x) * (obj.x - p.x) + (obj.y - p.y) * (obj.y - p.y) + (obj.z - p.z) * (obj.z - p.z));
    var cx = W / 2, cy = 118;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rel);
    ctx.fillStyle = COL.hudWarn;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-9, 10); ctx.lineTo(0, 4); ctx.lineTo(9, 10); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, obj.label + '  ·  ' + Math.round(dist) + ' m', cx, cy + 30, 14, COL.hudText, 'center', true);
    if (obj.kind === 'ring') text(ctx, 'ALT ' + Math.round(obj.y) + ' m', cx, cy + 50, 11, COL.hudDim, 'center');
    if (obj.kind === 'drop') {
      var agl = Math.round(p.y - window.TW.terrain.heightAt(p.x, p.z));
      text(ctx, 'AGL ' + agl + ' m — drop band 25–130 m', cx, cy + 50, 11, agl >= 25 && agl <= 130 ? COL.hudGood : COL.hudWarn, 'center', true);
    }
  }

  function drawHud(ctx, W, H, p, mission, state) {
    drawCompass(ctx, W, p);
    drawObjectiveArrow(ctx, W, H, p, mission);
    var altM = Math.max(0, Math.round(p.y));
    var agl = Math.max(0, Math.round(p.y - window.TW.terrain.heightAt(p.x, p.z)));
    var spdKmh = Math.round(p.speed * 3.6);
    drawTape(ctx, 16, H / 2 - 150, 104, 300, altM, 50, function (v) { return String(Math.round(v)); }, 'ALT', 'metres');
    drawTape(ctx, W - 120, H / 2 - 150, 104, 300, spdKmh, 20, function (v) { return String(Math.round(v)); }, 'SPEED', 'km/h');
    drawHorizon(ctx, W, H, p);
    // Vertical speed + AGL chips beside horizon.
    panel(ctx, W / 2 - 210, H / 2 - 34, 96, 68);
    text(ctx, 'V/S', W / 2 - 162, H / 2 - 20, 10, COL.hudDim, 'center', true);
    text(ctx, (p.vy >= 0 ? '+' : '') + p.vy.toFixed(1), W / 2 - 162, H / 2 + 2, 18, p.vy < -6 ? COL.hudBad : COL.hudText, 'center', true);
    text(ctx, 'm/s', W / 2 - 162, H / 2 + 22, 10, COL.hudDim, 'center');
    panel(ctx, W / 2 + 114, H / 2 - 34, 96, 68);
    text(ctx, 'AGL', W / 2 + 162, H / 2 - 20, 10, COL.hudDim, 'center', true);
    text(ctx, String(agl), W / 2 + 162, H / 2 + 2, 18, agl < 40 ? COL.hudWarn : COL.hudText, 'center', true);
    text(ctx, 'metres', W / 2 + 162, H / 2 + 22, 10, COL.hudDim, 'center');
    // Bottom-left engine block.
    panel(ctx, 16, H - 148, 240, 132);
    text(ctx, 'TERN · ENGINE', 28, H - 132, 12, COL.hudText, 'left', true);
    drawGauge(ctx, 28, H - 112, 216, 'THROTTLE', p.throttle, '#ffb36b', Math.round(p.throttle * 100) + '%');
    drawGauge(ctx, 28, H - 86, 216, 'FUEL', p.fuel / C.fuelMax, p.fuel < 20 ? COL.hudBad : COL.hudGood, Math.round(p.fuel) + '%');
    drawGauge(ctx, 28, H - 60, 216, 'HULL', p.hull / C.hullMax, p.hull < 35 ? COL.hudBad : '#7ad9ff', Math.round(p.hull) + '%');
    text(ctx, (p.flaps ? 'FLAPS DOWN' : 'FLAPS UP') + (p.onGround ? '  ·  ON GROUND' : ''), 28, H - 30, 11, p.flaps ? COL.hudWarn : COL.hudDim, 'left', true);
    // Mission block top-left.
    panel(ctx, 16, 14, 300, 96);
    text(ctx, mission.sortie.title, 28, 32, 14, COL.hudText, 'left', true);
    text(ctx, 'Rings ' + mission.nextRing + '/' + mission.rings.length + (mission.sortie.kind === 'cargo' ? '  ·  Cargo ' + (mission.cargoDropped ? 'delivered' : 'aboard') : ''), 28, 54, 12, COL.hudDim, 'left');
    var mm = Math.floor(mission.time / 60), ss = Math.floor(mission.time % 60);
    text(ctx, 'Time ' + mm + ':' + String(ss).padStart(2, '0') + '  ·  Par ' + Math.floor(mission.sortie.parTime / 60) + ':' + String(mission.sortie.parTime % 60).padStart(2, '0'), 28, 74, 12, COL.hudDim, 'left');
    text(ctx, 'Score ' + state.score, 28, 94, 12, COL.hudWarn, 'left', true);
    drawMinimap(ctx, W, H, p, mission);
    if (mission.messageTimer > 0 && mission.message) {
      ctx.fillStyle = 'rgba(12,16,28,0.78)';
      var msg = mission.message;
      ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
      var tw = ctx.measureText(msg).width + 36;
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, H - 64, tw, 36, 8); ctx.fill();
      text(ctx, msg, W / 2, H - 46, 16, COL.hudText, 'center', true);
    }
    if (p.stall) {
      ctx.fillStyle = 'rgba(255,60,40,0.9)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 70, H / 2 + 108, 140, 34, 6); ctx.fill();
      text(ctx, 'STALL', W / 2, H / 2 + 125, 18, '#fff', 'center', true);
    }
    if (p.fuel <= 0 && !p.onGround) text(ctx, 'FUEL EMPTY — GLIDE TO A RUNWAY', W / 2, H / 2 + 160, 15, COL.hudBad, 'center', true);
  }

  window.TW.hud = { drawHud: drawHud, headingDeg: headingDeg };
})();
