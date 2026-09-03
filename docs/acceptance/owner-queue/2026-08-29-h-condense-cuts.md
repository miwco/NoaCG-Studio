---
kind: walk-p
date: 2026-08-29
---
# What the condense pass cut, moved or retired - review list

**Date:** 2026-08-29
**Branch:** `claude/h-coherence-condense`
**Route (under a minute):** read this file. Nothing to click - this is a review of text, not of the
product. To see any cut in full: `git show <ref> -- <path>`, refs given per row.

You asked to check what we skip so nothing important is forgotten. Every removal is below, with
where it went. **Nothing here was deleted outright without a named home** except the four rows in
the last section, which say so plainly.

The pre-change state is `0eec5a83`, so `git show 0eec5a83:<path>` prints any file as it stood.

---

## 1. Handoff files deleted (commit `c5823d3b`)

Git is the archive; all seven print with `git show 0eec5a83:docs/handoffs/<name>`.

| File | Why it was consumable |
|---|---|
| `2026-08-27-editor-stage-blank.md` | investigation summary also lives in the `wave-leftovers-2026-08-27` memory row 8 and on branch `claude/editor-blank-stage-note` |
| `2026-08-29-cc-playout-polish.md` | work landed |
| `2026-08-29-dd-svg-fitting-two.md` | work landed |
| `2026-08-29-ee-catalog-gates.md` | folded into this wave's prompts |
| `2026-08-29-ff-ibc-readiness.md` | folded into this wave's prompts |
| `2026-08-29-orchestrator-day-wave.md` | superseded by the evening wave |
| `2026-08-29-orchestrator-review.md` | superseded by the evening wave |

**One consequence, already repaired:** four places cited the editor-stage-blank handoff by path
(`docs/EDITOR_RESEARCH.md` x3, `docs/backlog/auto-merge-needs-the-temporary-worktree.md`). They now
cite the `git show` command instead, so the trail still leads somewhere.

**If you disagree with any row here, `git revert c5823d3b` restores all seven.**

## 2. Sections MOVED (nothing lost - they load in a different place now)

These are the bulk of the reclaimed bytes. Each moved to the directory that owns the files it
describes, which is the remedy the components contract already prescribed.

| What moved | From | To | Who still sees it |
|---|---|---|---|
| The dialog anatomy: header/✕, checkbox row, `110px \| 1fr` form row, footer, the `.spacer`-is-not-a-push trap, the Settings worked example | `src/components/AGENTS.md` | **new** `src/styles/AGENTS.md` | anyone working in `src/styles`; `src/components/AGENTS.md` keeps a pointer that says to read it before writing dialog markup |
| The `PayloadStage` / `ProgramStage` monitor contract (the once-a-second state re-ask, the `data-plays` counter) | `src/components/AGENTS.md` | `src/components/home/AGENTS.md` | anyone working in `home/`, where both files live |
| Why the hosted-control recovery spec counts entrances instead of comparing pictures | `src/components/AGENTS.md` | `e2e/AGENTS.md` | anyone writing specs - which is where every other spec trap already lives |
| The app-wide amber link rule | `src/components/wizard/AGENTS.md` | `src/styles/AGENTS.md` (short form) | the full rule and its reasoning were already in `src/styles/base.css` lines 10-18, verbatim |

## 3. Sentences DELETED as duplication (the same fact is stated in full elsewhere)

| Deleted | Where the fact still lives |
|---|---|
| The job-runner cost table (1.0 a suite, 0.4 a build, 0.15 a landing, the night allowance, the RAM floor) in root `AGENTS.md` | `docs/JOB_RUNNER_PLAN.md` lines 101-137, in a table, plus the runner that enforces it. Root now says the weights are there. |
| The amber link rule's reasoning in the wizard contract | `src/styles/base.css` comment above the `a` rule |
| `/bridge`'s function list, stated twice in root `AGENTS.md` (the page table and the architecture map) | kept in the map; removed from the table row |
| `ten unit motions drawn as SIX family cards` (third copy, in the wizard's import-animation paragraph) | still stated in `src/components/AGENTS.md` and in the wizard's own Animation-step paragraph |
| `npm run test:ports covers the allocator` | `docs/DEV_PORTS.md` |
| `the AGENTS.md here is the contract for both - the voice, the run-it-before-you-write-it rule, and the nav/shelf structure` (map entry for `src/docs/`) | `src/docs/AGENTS.md` itself - the map line is only a label |

## 4. Landed history trimmed (the RULE and its reason kept, the incident narrative shortened)

No rule lost its "why" here. What went is retelling.

- Root `AGENTS.md`, the main-checkout rule: the two 2026-08-28 incidents are now one sentence
  instead of six lines. **Kept:** that a feature branch in the main checkout blocks the queue, that
  a build there silently gated `main` while reporting green, the `[write-version]` stamp that was
  the only evidence, and "a green gate on the wrong tree is worse than a red one". **Gone:** the
  commit sha of the blocked landing.
- Root `AGENTS.md`, the merge queue: the "five branches in a hundred minutes" arithmetic became
  "on a busy day". **Kept:** that nothing was ever at risk, that a collision costs a full
  re-verification because a new `main` is a new tree, and that the queue trades racing for waiting.
- Root map, `styles/`: dropped "(this was one 7,841-line src/styles.css until 2026-08-28)".
- `src/components/AGENTS.md` and `cli/` / `bridge/` map entries: file-pointer lists that the
  nested contracts and `docs/AGENT_CLI.md` carry in full.

## 5. Memory retired (MEMORY.md: 66 lines -> 59, ceiling is 60)

MEMORY.md lives outside the repo, so this did not land through the merge queue.

- **Retired: `check-skill-trial`.** Its exit condition said the entry goes once the orchestrator
  contract carries the trial. It does - `.agent-workflows/orchestrator.md:400` states the trial,
  its one-week window and the 2026-09-04 evaluation date. The file was **moved, not deleted**, to
  `C:\claude\memory-archive-2026-08-25\check-skill-trial.md`.
- **Folded, no entry lost** (four index lines became two, every file still there): the two
  owner-taste-rules entries; the two owner-decisions entries; the two 2026-08-27 follow-on entries;
  the two AI-pricing entries. The sections "Live branches and owner actions" and "Pointers" merged
  into "Live threads and pointers".
- **Corrected:** MEMORY.md pointed at `docs/acceptance/OWNER_QUEUE.md`; new items go in the
  `docs/acceptance/owner-queue/` directory, one file per item.
- **Updated, not cut:** the `wave-leftovers-2026-08-27` row that asked for this condense now records
  it as done, and names what is still tight.

## 6. Deleted with no other home - the four to look at hardest

Everything else above still exists somewhere. These four do not, beyond git.

1. The sentence `Both were paid for on 2026-08-28: ... (cb868669, "queueing blocked on the occupied
   main checkout")` - the **commit sha** of the blocked landing. The lesson is kept; the pointer to
   the incident commit is not.
2. `this was one 7,841-line src/styles.css until 2026-08-28` - the size of the file before the split.
3. `npm run test:ports covers the allocator` - true, and in `docs/DEV_PORTS.md`, but the root
   contract no longer names that command.
4. The exact job-runner weights in root `AGENTS.md`. A reader who never opens
   `docs/JOB_RUNNER_PLAN.md` no longer learns that a landing is cheap and a suite is not.

**Say the word on any of these and it goes back in one commit.**
