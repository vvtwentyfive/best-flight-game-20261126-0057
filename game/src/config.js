// config.js — world constants, sunset palette, island and runway layout for Ternwing Courier.
window.TW = window.TW || {};
(function () {
  'use strict';

  // Seeded hash RNG so scenery is identical on every load (and in staged screenshots).
  function hash2(x, z, seed) {
    var h = Math.sin(x * 127.1 + z * 311.7 + (seed || 1) * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  var CONFIG = {
    title: 'TERNWING COURIER',
    subtitle: 'Archipelago Mail Flight',
    planeName: 'Tern',
    viewW: 1280,
    viewH: 720,
    fovDeg: 62,
    viewRange: 2400,
    gridStep: 45,
    seaLevel: 0,
    start: { x: -1400, y: 210, z: -900, heading: 0.62, speed: 42, throttle: 0.62 },
    fuelMax: 100,
    fuelBurnPerSec: 0.55,
    hullMax: 100,
    stallSpeed: 17,
    maxSpeed: 78,
    colors: {
      skyTop: '#2b1b4a',
      skyMid: '#7a2e5e',
      skyLow: '#e86a4a',
      skyHorizon: '#ffb36b',
      sun: '#ffd98a',
      seaDeep: '#1d3a5f',
      seaLight: '#2e5f7a',
      sand: '#e8b07a',
      grassLow: '#7a9a4a',
      grassHigh: '#4a7a3a',
      rock: '#8a6a5e',
      peak: '#c9a68a',
      runway: '#3a3a44',
      runwayLine: '#f5e6c8',
      ringNext: '#ffd94a',
      ringDone: '#5ad98a',
      ringTodo: '#ff8a5a',
      hudPanel: 'rgba(12,16,28,0.82)',
      hudLine: '#ffb36b',
      hudText: '#ffe9c8',
      hudDim: '#c9a68a',
      hudGood: '#7ae8a8',
      hudWarn: '#ffd94a',
      hudBad: '#ff6a5a',
      planeBody: '#f2e3c8',
      planeStripe: '#e85a3a',
      planeDark: '#3a2e4a'
    },
    // Islands: x,z centre (metres), r radius, h peak height.
    islands: [
      { x: -1500, z: -1100, r: 620, h: 120, name: 'Home Atoll' },
      { x: -350, z: -250, r: 480, h: 95, name: 'Palm Cay' },
      { x: 700, z: 350, r: 560, h: 150, name: 'Lantern Isle' },
      { x: 1500, z: -650, r: 420, h: 80, name: 'Gull Rock' },
      { x: 250, z: 1250, r: 640, h: 170, name: 'Ember Peak' },
      { x: -1150, z: 900, r: 500, h: 105, name: 'Quiet Shoal' },
      { x: 1600, z: 1100, r: 520, h: 130, name: 'Far Beacon' }
    ],
    // Runways: heading in radians (0 = +Z north), elevation filled from terrain at init.
    runways: [
      { x: -1500, z: -1100, heading: 0.62, length: 520, width: 34, name: 'Home Strip' },
      { x: 700, z: 350, heading: -0.4, length: 480, width: 32, name: 'Lantern Field' },
      { x: 250, z: 1250, heading: 1.1, length: 500, width: 32, name: 'Ember Strip' },
      { x: 1600, z: 1100, heading: 0.2, length: 460, width: 30, name: 'Far Beacon Field' }
    ]
  };

  window.TW.config = CONFIG;
  window.TW.hash2 = hash2;
  window.TW.makeRng = makeRng;
  window.TW.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  window.TW.lerp = function (a, b, t) { return a + (b - a) * t; };
  window.TW.wrapAngle = function (a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  window.TW.dist2d = function (ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  };
})();
