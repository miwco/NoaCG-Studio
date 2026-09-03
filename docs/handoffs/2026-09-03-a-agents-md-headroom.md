# Room in the contracts

**Branch:** `claude/a-agents-md-headroom`. **Merge base:** `a14b50bb`. Six commits plus the check's
own. CI green with all nine E2E shards run; `npm run build` green on the final state.

`src/components/wizard` had 365 bytes free of 112,000, so the next session to add a paragraph under
that directory would have failed the build. It now has 9,708 free of a ceiling that has itself come
down to 110,000.

## Before and after, per chain

Every chain in the repo moved by the same amount, because every byte came out of the one file all
52 of them load. The ten that were tightest:

| chain | before (of 112,000) | after (of 110,000) | freed |
|---|---|---|---|
| `src/components/wizard` | 111,635 (99.7%) | 100,292 (91.2%) | 11,343 |
| `src/templates/importedDesign` | 98,825 (88.2%) | 87,482 (79.5%) | 11,343 |
| `src/templates/types` | 95,250 (85.0%) | 83,907 (76.3%) | 11,343 |
| `src/templates/infographics` | 94,007 (83.9%) | 82,664 (75.1%) | 11,343 |
| `src/templates/lowerThirds` | 93,826 (83.8%) | 82,483 (75.0%) | 11,343 |
| `src/ai/pro` | 93,570 (83.5%) | 82,261 (74.8%) | 11,309 |
| `src/templates/scoreboards` | 91,832 (82.0%) | 80,489 (73.2%) | 11,343 |
| `src/ai/lite` | 91,223 (81.4%) | 79,914 (72.6%) | 11,309 |
| `src/templates/pack4` | 90,429 (80.7%) | 79,086 (71.9%) | 11,343 |
| `src/templates/endCredits` | 89,621 (80.0%) | 78,278 (71.2%) | 11,343 |

**Chains printing the 80% warning: ten before, one after.** Root `AGENTS.md` went 34,416 -> 23,073
bytes, a net 11,343 once the replacement prose is counted. (An earlier commit message said 13.8 KB;
that was the gross removal, and the check caught it. Every file that quoted it is corrected.)

## What moved, and where

Nothing was condensed by feel. The principle each time: **the rule that has to fire stays inline,
the reference behind it becomes a pointer.**

- **The repository map** (65 lines, the directory tree) -> `docs/ARCHITECTURE.md` §8. It answers
  "what lives where" when you go looking; it is not a rule that fires while you edit, and that doc
  already owned the domain registry and the edge table the map serves. The rule it carried stayed:
  a directory marked `*` has its own `AGENTS.md`, read it before editing that area.
- **The ten-page URL table** -> `docs/ARCHITECTURE.md` §9. What stayed is what you need without
  looking: Vite MPA, the studio is `/app`, clean URLs come from `app-clean-url` and Vercel
  `cleanUrls`.
- **The incident behind each git rule** -> a new `docs/BRANCHING_AND_LANDING.md`. `## Git` was the
  largest section in the root file, and most of its weight was the story rather than the rule: the
  2026-08-28 build that gated `main` from the wrong checkout, why the queue trades racing for
  waiting, the ledger that drifted for hours. Every rule stayed - branch in a worktree, never
  occupy the checkout holding `main`, `/queue-merge` is how work reaches `main` and nobody else
  queues your branch, publishing past `main` still needs the user, and the migration and cleanup
  mechanisms with `supabase/AGENTS.md` and `.agent-workflows/cleanup-worktrees.md` named as their
  authoritative homes.
- **Two verification rules condensed in place.** Rules 3 and 4 carried their measurements inline,
  and `docs/VERIFICATION.md` already held all of it under sections named for the same rules - the
  spike family, the shard-by-test-count spread, the push that cancelled the run covering the real
  change. Both rules and every command they name stayed.

## The verbatim audit, which I ran rather than delegated

An audit script diffs every line present in the pre-edit file and absent from the post-edit file
against the files that received it. Against `origin/main` at the merge base: **156 lines relocated
verbatim, 0 lost.** Thirty lines came back as "rewritten" and each is deliberate - four intro
sentences I reworded so a pointer reads correctly, and the two verification rules condensed in
place, whose detail I checked line by line against `docs/VERIFICATION.md` before touching them.

I skipped the optional Antigravity audit. It would have been asked exactly the question this script
answers, and its result would have had to be re-derived with this same diff before I believed it -
so it adds a round trip and no evidence.

## Why the wizard chain stopped at 91% rather than the 85% the row asked for

I could not get there without deleting live rules, so I did not.

- **Its 50 KB leaf is not stale.** A staleness pass extracted every backticked token from
  `src/components/wizard/AGENTS.md` and checked each path and symbol against the tree: 28
  path-shaped and 119 symbol-shaped tokens, **nothing missing**. Same result for the root file and
  `src/components/AGENTS.md`. Nothing in there describes something that no longer exists.
- **It has no split.** Every file it describes sits in `wizard/` or `wizard/steps/`, so a child
  contract would be loaded on top of this one rather than instead of it - it moves the bytes and
  not the maximum. The `.codex/config.toml` header already said this; I re-checked it against the
  directory listing and it is still true.
- **`src/components/AGENTS.md` has no lossless move either.** Its two large sections, Panels
  (10.5 KB) and Shell & editor (8 KB), describe components sitting directly in `src/components/`,
  and reading them line by line they are rules - which key a surface may claim, when the verb keys
  bind, never reporting a save the storage layer has not agreed to. The nine children that could
  have received content already have their own contracts and already did.

**The percentage and the ratchet also pull against each other**, and that is worth saying plainly:
85% is measured against the ceiling, and lowering the ceiling to bank the room makes the percentage
worse. Against the old 112,000 the chain reads 89.5%; against the new 110,000 it reads 91.2%. The
number that actually matters is the absolute one - **365 bytes free became 9,708** - and that is
what the row existed to buy.

## The ceiling: 112,000 -> 110,000

108,000 was the tempting number and would have matched the ~7.4 KB margin the 2026-08-26 ratchet
left. I chose 110,000 for the wizard chain's sake, since it is the one that red-gates first and the
reason this row existed.

**One thing to know rather than discover:** `src/templates/importedDesign` is 87,482 bytes, which
at this ceiling is 518 bytes under the 80% warning. It trips on the next small addition to
`src/templates/AGENTS.md`, which fourteen chains load. That is a question of when, not whether, at
any limit in this range. When it happens the fix is that file, not this number, and the header says
so.

## What this unblocks, and what it does not

- **`docs/backlog/memory-store-drain.md` phase 2, the `AGENTS.md` half.** Ten memory entries marked
  `(route)` had nowhere to land; a routed rule of a few hundred bytes now fits where it belongs.
- The instruction-chain gate LANDED 2026-09-03 at a 4 KB reserve; the row that proposed it is closed.
- **Still blocked: the orchestrator half.** `.agent-workflows/orchestrator*`'s always-loaded common
  path is 638 of 640 lines. This branch did not touch it, and no memory rule can be routed there
  until it gets the same treatment. That is the obvious next row.
- **Worth building: the staleness pass as a gate.** It took a twenty-line script to answer "is any
  of this describing something that no longer exists?" for three contracts in seconds, and it is
  what stopped me cutting the wizard file further. It belongs in `npm run build` beside
  `check-docs-index`. Recorded in the shrinking-mechanism backlog.

## The one question I could not answer

Filed as `docs/acceptance/owner-queue/2026-09-03-room-in-the-contracts.md` (`kind: walk-p`).
Nothing is blocked on it. Since the wizard's contract is neither stale nor splittable, the only
things left that would shrink it are a ruling or a code reorganization - so the question is whether
anything in the creation wizard is settled enough to stop writing down (the Pro tier's engine
behaviour, the SVG import flow, the Browse filter drawer, roughly 12 KB between them, all currently
true), or whether the wizard is simply the most complex surface in the product and its contract is
meant to be the longest.

## Check

- `review: delegated` - the code-review skill at level `high` returned six findings into this
  conversation and named this branch's diff, so it passed the scope check. All six confirmed
  against the surrounding files and all six fixed: the wrong 13.8 KB figure in four places, dead
  "root architecture map" pointers in `api/AGENTS.md` and `src/ai/AGENTS.md`, the `docs/README.md`
  row that did not mention where the map went, an overclaiming sentence in the ceiling header, and
  a contradiction the split created between the root's "never run `safe-merge` directly" and the
  doc's "use the flow rather than raw git".
- `simplify: inline` - the skill returned fan-out instructions rather than a result, so the leg ran
  here. Two findings, both fixed: a repo-wide sweep for other pointers into moved content (none
  left beyond the two the review named), and the root's `## Architecture map` heading, which after
  the move described a pointer plus the auth posture and the creation flow - those are now their
  own sections and the pointer section is `## Where the code lives`.
- `verify: inline` - `npm run build` green on the final state. No product code changed, so no e2e
  run; CI was green on `134a3b01` with Build, E2E plan, Factory gates, all nine E2E shards and the
  CI gate all reporting success.

`origin/main` moved to `d43199d3` while this ran. I did not merge it in - integrating and gating on
the integrated sha is the landing queue's job, and driving that by hand is the churn `/queue-merge`
exists to end.
