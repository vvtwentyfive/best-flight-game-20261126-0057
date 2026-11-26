// input.js — keyboard and mouse state for Ternwing Courier.
window.TW = window.TW || {};
(function () {
  'use strict';

  var keys = {};
  var pressed = {};
  var mouse = { x: 0, y: 0, down: false, seen: false };
  var canvas = null;

  function onKeyDown(e) {
    var k = e.key.toLowerCase();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
  }
  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }
  function onMouseMove(e) {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / Math.max(1, r.width);
    mouse.y = (e.clientY - r.top) / Math.max(1, r.height);
    mouse.seen = true;
  }
  function onMouseDown() { mouse.down = true; }
  function onMouseUp() { mouse.down = false; }

  function attach(el) {
    canvas = el;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Continuous flight axes, each -1..1. Keyboard wins; mouse steers only while held down.
  function flightAxes(useMouse) {
    var pitch = 0, roll = 0, throttleDelta = 0;
    if (keys['arrowdown']) pitch += 1;
    if (keys['arrowup']) pitch -= 1;
    if (keys['arrowleft'] || keys['a']) roll -= 1;
    if (keys['arrowright'] || keys['d']) roll += 1;
    if (keys['w']) throttleDelta += 1;
    if (keys['s']) throttleDelta -= 1;
    if (keys['shift']) throttleDelta += 0.45;
    if (keys['control']) throttleDelta -= 0.45;
    if (useMouse && mouse.down && mouse.seen) {
      roll = window.TW.clamp((mouse.x - 0.5) * 2.4, -1, 1);
      pitch = window.TW.clamp((mouse.y - 0.5) * 2.4, -1, 1);
    }
    return { pitch: pitch, roll: roll, throttleDelta: throttleDelta };
  }

  function wasPressed(k) { return !!pressed[k.toLowerCase()]; }
  function clearPressed() { pressed = {}; }
  function isDown(k) { return !!keys[k.toLowerCase()]; }

  window.TW.input = {
    attach: attach,
    flightAxes: flightAxes,
    wasPressed: wasPressed,
    clearPressed: clearPressed,
    isDown: isDown,
    mouse: mouse
  };
})();
