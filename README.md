# Ternwing Courier — Archipelago Mail Flight

[![make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/vvtwentyfive/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/vvtwentyfive/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Fly a little mail plane through sunset rings, drop cargo low over Gull Rock, and grease the landing before the fuel runs dry.

## How to play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open http://localhost:8080). Press 1–3 to pick a sortie, ENTER to fly.

- **↑ ↓** pitch · **← → / A D** bank & turn · **W S** throttle · **F** flaps · **M** mouse steer (hold mouse)
- **P** pause · **R** restart sortie · **T** title
- Sortie 1 — Ring Runner: thread five sunset rings in order, then land at Lantern Field.
- Sortie 2 — Cargo Drop: clear two rings, fly low (25–130 m AGL) over the Gull Rock drop zone, then land at Ember Strip.
- Sortie 3 — Golden Landing: cross the Far Beacon gate, then land slow, aligned, and gentle (sink under 2 m/s).
- Watch fuel and hull: land at any strip to refuel and patch up. Climbing bleeds speed, diving gains it, and the Tern stalls below about 60 km/h.

## How it works

Vanilla canvas 2D, no libraries, no network. A pseudo-3D chase camera projects a deterministic sunset archipelago (seven islands, four runways) with a banked-turn flight model: throttle/energy, stall, fuel burn, and hull damage from hard arrivals. Source is split one job per file under `game/src/` — `config.js` (world + palette), `input.js`, `terrain.js` (heightfield + runways), `plane.js` (flight model), `missions.js` (sorties + grading), `hud.js` (lit instruments), `render.js` (world + aircraft), `audio.js` (WebAudio-synthesized sound), `shots.js` (deterministic `?shot=start|play|end&seed=1` staging), and `main.js` (loop + screens). Run `node main.ts` to build the dossier into `/output` (or `MAKEFUN_OUTPUT_DIR`).
