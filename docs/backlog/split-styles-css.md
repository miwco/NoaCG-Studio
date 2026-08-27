# Split `src/styles.css` along its 38 existing section boundaries

**Filed:** 2026-08-28. **Source:** weekly quality review (measurement)

## Why

**It is the file where parallel branches collide, and merge latency is the stated bottleneck.**

`src/styles.css` is 7,841 lines and 1,840 selectors in ONE file, imported once from
`src/main.tsx:3`. Every UI feature - wizard, editor, timeline, home, playout dashboard - writes
into it, so the rule that keeps worktrees apart ("a feature edits its own domain plus thin wiring
in `components/`", root `AGENTS.md`) does not hold here. There is no domain to stay inside.

It took **137 commits in the month to 2026-08-28** - more than any other file in the repo, ahead
of the next (`src/ai/AGENTS.md`, 84). In that month it went **+4,461 / -740 lines**: roughly 4,100
lines to 7,841, close to doubling. With 12 worktrees live, every one of them that touches UI
queues behind the same file.

The reason this is worth a session rather than a shrug: the split is nearly mechanical. The file
already carries **38 named top-level sections** (30 `/* ---------- */` plus 8 `/* ══ ══ */`), and
the large ones map one-to-one onto component directories.

## What it would take

One session.

Move each section into `src/styles/<surface>.css` and import them from `main.tsx` **in the same
order**, so the cascade is unchanged. The natural first cuts, by size:

| Section | Lines | Goes with |
|---|---|---|
| Creation wizard | 1,659 (1234-2893) | `components/wizard/` |
| Playout dashboard | 1,314 (5839-7153) | `components/home/ProductionPage.tsx` |
| Home (routed dashboard) | 718 (5121-5839) | `components/home/` |
| Timeline v2 + machine graph + Inspector | ~850 | `components/timeline/` |
| Canvas + canvas selection | ~330 | `components/canvas/` |

**Risk: cascade order.** Later rules currently override earlier ones by position alone, so any
rule depending on cross-section proximity breaks silently. Importing the parts in source order
preserves it; a section moved out of order does not.

**Proof it did not break:** `npm run build`, then `overflow-sweep --baseline` and
`test:e2e:focus:queued` (both render real UI), plus before/after screenshots of `/app` at the
wizard, editor, home and `#/production/<id>` routes. A pixel diff is the real gate here - a
cascade regression will not fail a build.

## Evidence

- `wc -l src/styles.css` -> 7,841; selectors via `grep -cE '^\.[a-zA-Z]|^#[a-zA-Z]'` -> 1,840.
- `git log --since="1 month ago" --name-only` -> styles.css is rank 1 at 137 commits.
- `git log --since="1 month ago" --numstat -- src/styles.css` -> +4,461 / -740.
- `grep -cE '^/\* (-{2,}|══)' src/styles.css` -> 38 top-level sections.
- `git worktree list` -> 12 live at time of measurement; one held `src/styles.css` uncommitted
  during this very review.
- Related: [[production-page-extraction]] - the dashboard's 1,314 CSS lines and its 2,968-line
  component are the same surface, and splitting both together is cheaper than either alone.

## Trend

- 2026-08-28: 7,841 lines, 1,840 selectors, 137 commits/month, 12 live worktrees
