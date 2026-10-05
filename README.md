# UMP

A first-person arcade baseball umpire game, built as a browser prototype. You crouch in the slot behind the catcher, see every pitch through your mask, and own the call. Balls and strikes are judged by exact geometry, rare rule events like balks show up when you least expect them, and every miss can be replayed down to the inch.

The design, research, and milestone plan live in [`docs/plans/2026-10-05-0759-feat-first-person-umpire-arcade-prototype-plan.md`](docs/plans/2026-10-05-0759-feat-first-person-umpire-arcade-prototype-plan.md).

## Status

Prototype in progress. M0 (foundations) and M1 (the core calling loop in graybox) are being built now; see the plan's Sequencing table.

## Run it

Requires Node 22 or newer.

```bash
make install   # npm ci
make dev       # dev server with hot reload
make check     # lint, typecheck (app and DOM-free sim), unit tests, golden logs
make e2e       # production build, then headless Chromium tests
make help      # every target
```

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Call a strike | `J` or `Right Arrow` | Right trigger | STRIKE button |
| Call a ball | `F` or `Left Arrow` | Left trigger | BALL button |
| Call a balk (runners on) | `Space` | A / Cross | BALK button |
| Replay last pitch | `R` | Y / Triangle | Replay button |
| Next pitch | `Enter` | Start | Tap |
| Tuning panel | `` ` `` | | |

## Project layout

- `src/sim/` is the deterministic simulation: seeded randomness, pitch physics, the strike zone, rules, and scoring. It never imports Three.js or touches the DOM, and lint enforces that.
- `src/render/` draws the sim with Three.js and never changes sim state.
- `src/input/`, `src/ui/`, `src/audio/`, and `src/debug/` are the presentation layers.
- `src/data/` holds tuning values and content as typed TypeScript.
- `tests/unit/`, `tests/golden/`, and `tests/e2e/` hold unit and property tests, seeded golden logs, and browser tests.

## Content and rules

Every team, player, umpire, and announcer line is original. Baseball rules are paraphrased with rule numbers from the Official Baseball Rules, never reproduced. Nothing here is affiliated with or endorsed by Major League Baseball.
