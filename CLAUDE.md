# UMP conventions for agents

The work source is `docs/plans/2026-10-05-0759-feat-first-person-umpire-arcade-prototype-plan.md` (ce-unified-plan/v1). Scan its headings, then read the Goal Capsule, the unit you are working on, its cited R and KTD entries, the Verification Contract, and the Definition of Done.

## Rules that are easy to break

- `src/sim/` and `src/data/` are pure and deterministic. No `three`, no DOM, no `Math.random`, no `Date`, no `performance`. Use `createRng(seed).fork(label)` from `src/sim/rng.ts` and pass sim time explicitly. ESLint enforces this.
- Truth comes from geometry only (R5). Framing, streaks, difficulty, and arcade effects never change `adjudicate()`.
- The renderer reads sim snapshots and never writes sim state. If the rig must match the sim (the release point), the rig adapts to the sim, not the reverse.
- Pitch crossings are solved in closed form (`timeAtY`), never by sampling frames.
- Tuning numbers live in `src/data/`, not inline in logic.
- Rules text is paraphrased with a rule number; never paste rulebook text.
- Prose in docs and UI: American English, no em or en dashes.

## Commands

Use the Makefile: `make check` before every push, `make e2e` for anything that touches rendering, input, or flow, and `make golden-update` only when a sim change is intended (then review the diff of `tests/golden/`).

## Testing notes

- Playwright is pinned to 1.56.1 to match the container's Chromium build 1194 under `/opt/pw-browsers`; CI installs the same build.
- Headless WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader` (set in `playwright.config.ts`).
- TypeScript is pinned to 6.0.3 because typescript-eslint supports TypeScript below 6.1.
