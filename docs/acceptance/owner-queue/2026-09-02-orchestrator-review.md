---
kind: walk-p
date: 2026-09-02
---
# The orchestrator, reviewed with fresh eyes, and four mechanisms it now runs on

**Date:** 2026-09-02 · **Branch:** `claude/orcestrato-design-review-c599d6`

## What this is

An independent read of the modular orchestrator one day after the split, plus the six corrections
you ratified. The verdict in one line: the split is right for the rare half of the system and an
accounting change for the common half - a plan loads about 590 lines every time, not 170 - and
four more cached facts of the kind that bit twice on 2026-09-01 were found and replaced with
pointers to the instruments. The gate now prints and budgets the real always-loaded number.

## The route, under a minute

1. Open `docs/ORCHESTRATION_REVIEW.md` and read "The one architectural sentence" at the end of
   Phase A, then the three lessons and three kept ideas at the end of Phase B.
2. In any checkout, run the three new reporters:

```bash
node scripts/owner-receipts.mjs
```

```bash
node scripts/handoff-drain.mjs
```

```bash
npm run check:shared-instructions
```

## What to look at

- **The receipts.** `owner-receipts.mjs` lists every ask of yours that lives in `docs/backlog/`,
  oldest unstarted first, in your own words. Twenty-five were recovered; five are new files (the
  AGENTS.md headroom row you asked for by name, the push hook the classifier refused, the growth
  rule with your Millionaire example, the mistake-trigger hooks, the OGraf host-page fix you
  authorized). Is anything there NOT something you asked for, or missing that you did?
- **The drain.** Every handoff file reads UNCLASSIFIED until the next wave plan classifies it -
  that is the point: the folder is now visibly undrained instead of silently so.
- **The gate's last line.** "common path 589/640 lines" - the honest always-loaded number, gated.
- **The Stop hook.** The next session that ends a turn "waiting for CI" is told, at that moment,
  what to do instead. You will see it as a session continuing where it used to stop.

The before/after evaluation (eight scenarios, old contract versus new, graded) is in the review's
Phase F section; the verdict on the architecture is the last section.
