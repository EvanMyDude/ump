# UMP

A first-person arcade baseball umpire game, built as a browser prototype. You crouch in the slot behind the catcher, see every pitch through your mask, and own the call. Balls and strikes are judged by exact geometry, rare rule events like balks show up when you least expect them, and every miss can be replayed down to the inch.

The design, research, and milestone plan live in [`docs/plans/2026-10-05-0759-feat-first-person-umpire-arcade-prototype-plan.md`](docs/plans/2026-10-05-0759-feat-first-person-umpire-arcade-prototype-plan.md).

## Status

M0 (foundations) and M1 (the core calling loop in graybox) are built. The playable build deploys to GitHub Pages from `main`: <https://evanmydude.github.io/ump/>. Next is the U9 playtest gate; see the plan's Sequencing table.

What M1 plays like: a 50-pitch session against three fictional pitchers. Batters only take in M1, so every pitch is yours to call. Runners reach first now and then so the no-stop balk can happen, Robo-Ump challenges can overturn you, and the Ump Card at the end grades you by zone region and timing. The title screen also offers the balk drill: 24 deliveries from the stretch, about half of them no-stop balks, graded on balks spotted and false alarms.

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

| Action                                   | Keyboard             | Gamepad             | Touch         |
| ---------------------------------------- | -------------------- | ------------------- | ------------- |
| Call a strike                            | `J` or `Right Arrow` | Right trigger       | STRIKE button |
| Call a ball                              | `F` or `Left Arrow`  | Left trigger        | BALL button   |
| Call a balk (runners on)                 | `Space`              | A / Cross           | BALK button   |
| Replay last pitch (press again to close) | `R`                  | Y / Triangle        | Replay button |
| Change replay camera                     | `C`                  |                     |               |
| Next pitch                               | `Enter`              | Start or B / Circle | Next button   |
| Mute                                     | `M`                  |                     |               |
| Download the pitch log                   | `L`                  |                     |               |
| Tuning panel                             | `` ` ``              |                     |               |

Wait for the glove to settle before calling: a call within 0.35 s of the catch is graded quick and costs points, and a call 0.75 to 1.15 s after the catch earns pro timing.

## URL options

| Option         | Effect                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| `?seed=abc`    | Replays the same session exactly, given the same calls                        |
| `?autostart=1` | Skips the title screen                                                        |
| `?pitches=10`  | Shortens the session                                                          |
| `?drill=balk`  | Starts the balk drill right away                                              |
| `?debug=1`     | Opens the tuning panel (camera, overlays, game speed, seed, replay any pitch) |
| `?touch=1`     | Shows the on-screen buttons on any device                                     |
| `?quality=low` | Turns off shadows and antialiasing for slow devices                           |

## Project layout

- `src/sim/` is the deterministic simulation: seeded randomness, pitch physics, the strike zone, rules, and scoring. It never imports Three.js or touches the DOM, and lint enforces that.
- `src/render/` draws the sim with Three.js and never changes sim state.
- `src/input/`, `src/ui/`, `src/audio/`, and `src/debug/` are the presentation layers.
- `src/data/` holds tuning values and content as typed TypeScript.
- `tests/unit/`, `tests/golden/`, and `tests/e2e/` hold unit and property tests, seeded golden logs, and browser tests.

## Content and rules

Every team, player, umpire, and announcer line is original. Baseball rules are paraphrased with rule numbers from the Official Baseball Rules, never reproduced. Nothing here is affiliated with or endorsed by Major League Baseball.
