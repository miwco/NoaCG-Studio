# Agent round 2026-08-22 - the measured half (mechanical facts only)

> **Blind-read order:** the owner writes `notes.md` from `review.html` BEFORE opening `key.json`
> or this file's per-arm tables - the gallery hides the arm; this file names it. The full round
> (cells, ledgers, frames, gallery, key) is archived OUTSIDE the repo at
> `C:\claude\noacg-bench-archive\agent-round-2026-08-22\` (757 files; the temp original is
> disposable). This file records only what the harness measured; airability and visual quality
> are the blind read's to judge, and the round's VERDICT - what the skill recommends by default -
> is written only after that read.

Setup: `scripts/agent-round-bench.mjs --run` on 2026-08-22, 6 briefs x arms A-E
(`benchmarks/agent/v1/briefs.json`), 25 live cells + 5 n/a, one fresh headless Claude Code
session per cell (subscription: claude.ai max; the model the session default), the `noacg` plugin
loaded per session, deployment = this checkout's dev server. Every `noacg` call ledgered; the
FINAL verdict re-measured by the harness, never taken from the agent.

## Totals

- **25/25 cells ended validator-clean** (no errors; warnings allowed). 301 min wall clock,
  ~$129 notional API cost across the round (subscription quota).
- One cell hit the 25-minute cap (`debate-clock.D`) - its graphic was still complete and clean.

| arm | cells | clean finals | minutes | validate rounds (avg) | notional $ |
|---|---|---|---|---|---|
| A contract-only, free design | 6 | 6 | 61.3 | 3.8 | 30.11 |
| B + neutral type scaffold | 3 | 3 | 36.7 | 4.3 | 18.06 |
| C + catalog chassis | 4 | 4 | 43.4 | 2.5 | 21.21 |
| D + frontend-design skill | 6 | 6 | 88.3 | 5.7 | 28.51 |
| E + NoaCG design notes | 6 | 6 | 71.5 | 4.2 | 31.18 |

## The operator surface per cell (inputs / buttons; expectations in briefs.json)

| brief | A | B | C | D | E |
|---|---|---|---|---|---|
| news-lower-third (2 fields, no actions) | 2/0 ok | 2/0 ok | 2/0 ok | 2/0 ok | 2/0 ok |
| school-scoreboard (flag/clearFlag/final) | 6/0 **no actions** | 7/4 ok+ | 6/5 ok+ | 11/0 **no actions** | 7/0 **no actions** |
| lecture-countdown (pause/resume) | 4/0 **no actions** | n/a | 2/2 exact | 4/2 ok | 4/2 ok |
| live-vote (fields only) | 4/0 | n/a | 5/0 | 5/0 | 5/0 |
| debate-clock (NOVEL: switch/penalty/reset) | 10/3 ok | 5/3 **exact** | n/a | 9/6 ok+ (hit the cap) | 8/5 ok+ |
| third-party-ograf (nextTrack) | 6/1 ok | n/a | n/a | 3/1 **exact** | 4/1 ok |

Mechanical observations (not the verdict):

- **Actions are the fault line, and it is not one-sided.** On the TYPED briefs the free arms
  mostly shipped state as extra fields (scoreboard A/D/E: 0 buttons; countdown A: 0) while the
  scaffold arms carried - and extended - the type machine (scoreboard B split `flag` into
  `flagA`/`flagB`; C added `live`). But free authoring CAN mint a working machine: countdown D/E
  produced `pause`/`resume`, and every arm of the NOVEL debate clock produced
  `switch`/`penalty`/`reset` - **operable with zero category code**, the round's acceptance
  question for that brief.
- **Field discipline:** the scaffold arms stayed near the expected field counts; free arms
  splatted (debate-clock A: 10 inputs vs B's exact 5; scoreboard D: 11).
- **Cost/pace:** chassis C was the fastest to clean (2.5 validate rounds avg); design-skill D the
  slowest and heaviest (5.7 rounds, 88 min, one cap hit).
- The hand-written OGraf brief worked in all three arms: manifest-only operator surface
  (`nextTrack` derived, host lifecycle 2xx).

## What decides what

The blind read (airability + visual, per gallery id) decides whether free design earns the
DEFAULT recommendation and whether the design-notes arm (E) helps or hurts; this table alone
already speaks to the scaffold question for graphics that need OPERATOR ACTIONS. The skill's
default text changes only on the combination of both.
