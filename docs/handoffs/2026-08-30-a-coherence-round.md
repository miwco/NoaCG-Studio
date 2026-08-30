# A - the weekly coherence round

Branch `claude/a-coherence-round`, five commits, docs and contracts only. No product code, no
tests, no scripts.

**Verified.** `npm run build` green locally, branch stamp read rather than assumed
(`[write-version] dist/version.json -> claude/a-coherence-round@79d014153b`), so the gate ran on
this branch and not on a tree someone else owned.

**CI read to a conclusion, not assumed green.** Run `33309209246` on `063c736b`, the final commit:
Build, Factory gates, **all nine E2E shards**, the combined report and the CI gate all success.
Catalog calibration skipped, correctly - nothing in the catalog changed. No earlier run on this
branch was cancelled or superseded, so this run planned the whole change rather than a tail of it.

## 1. The cold-read test - what it got wrong

The three answers, written down before checking, from root `AGENTS.md` + `docs/GOALS.md` alone:

| Question | Verdict |
|---|---|
| What is this product | **Right, and fast.** Root `AGENTS.md` "What this is" and GOALS.md's north star agree and neither is stale. |
| What is the current push | **Right, and fast.** Students make their own graphics and play them out; quiz + scoreboard; 2026-09-12. Both files say it, consistently. |
| What is deliberately parked | **WRONG from GOALS.md alone**, which is the defect. |

**The defect.** The parked rule - *NOW is the push; NEXT, THEN and Parking lot are PARKED* - is
stated **only in the root contract**. `docs/GOALS.md`, the file that rule is about, never said it.
A reader who opens GOALS.md alone meets three `## NEXT` sections; the OGraf one happens to say
"nothing below starts before the NOW date", and the other two - the agent door and the AI tiers -
say nothing of the kind. The AI section in particular reads exactly like live work: owner decisions
with dates, price commitments, open checkboxes, a gate with a pass rule. Nothing in the file marks
it as shelved. **Fixed**: GOALS.md now states the rule in its own header.

**Second defect, same file.** GOALS.md declares "Keep it under ~200 lines" and stood at **460**.
A file that visibly ignores its own stated budget teaches every reader that rules stated in it are
decorative - which is worse than the length. Four items that were built and dated (the three from
the owner's 2026-08-25 SVG walk, and the dashboard's dropped Preview verb) moved verbatim to
`GOALS_ARCHIVE.md` under the existing "Landed parts of live goals" pattern, with their open
remainder kept in place. **460 -> 400 lines.** Still double the budget; see §4.

## 2. Room - the byte ratchet

`src/templates/AGENTS.md` was 66.5 KB and every one of the fourteen category contracts loads it,
so it was the real constraint, not `importedDesign/` itself. It carried the shared logo slot
**twice** - a nine-hundred-word measurement narrative under the assembler list, and again under the
field policy. The evidence moved whole to **`docs/LOGO_SLOT.md`**; what stays in the contract is
what binds an author. Every kept rule was checked against `shared/logoSlot.ts` and
`e2e/catalog/mark-height.spec.ts` before the cut (inject-as-last-child at line 314, clear-space-as-
margin at 135/193, the 84px ceiling at 203, the lt49/lt53 exception list checked from both sides).

The root contract's production-migration bullet collapsed onto `supabase/AGENTS.md`, which already
carried the same rule at greater length. That was felt by all 38 chains.

| chain | before | after |
|---|---|---|
| `src/templates/importedDesign/AGENTS.md` | 1,542 free (98.6%) | **10,830 free (90.3%)** |
| `src/templates/types/AGENTS.md` | 2,041 free | 11,329 free |
| `src/templates/AGENTS.md` (the file) | 66,578 bytes | 57,656 bytes |
| tightest chain overall | 110,458 | **107,819** (`src/components/wizard/`) |

**The ratchet did NOT move, deliberately, and this is now a ceiling rather than a postponement.**
The one tight chain left is `src/components/wizard/AGENTS.md` at 4,181 free. Lowering
`project_doc_max_bytes` to capture the reclaimed room would put that chain BELOW the headroom it
had this morning - causing the failure the ratchet exists to prevent. `.codex/config.toml` records
the reason and, more usefully, why no split is available inside that chain: root (32 KB) +
`src/components` (26 KB) + `src/components/wizard` (48 KB), and none of the three has a section
whose code lives in a subdirectory it could follow. The panels sit directly in `src/components/`,
`AiStep.tsx` directly in `steps/`, the SVG-import steps directly in `steps/` - so every candidate
split is parent-to-same-child, which moves bytes and not the maximum. **The move that works is the
one done twice here: find a section that is MEASUREMENT rather than rule and send it to a doc,
which is in no chain at all.** About 6 KB out of the wizard contract and the limit can go to
105,000.

## 3. References to nothing - and the class of defect behind them

Ten broken doc citations, seven repaired (the other three are in `.agent-workflows/`, the owner
queue and the `ag` handoff, all outside this session's scope).

They are one defect, not ten: **`docs/handoffs/` is swept and `docs/acceptance/owner-queue/`
expires after 7 days, so any durable doc citing either one rots on a timer, silently** - the
sentence still reads fine and the thing it promised to explain is gone. `docs/backlog/README.md`
now carries that rule, since a backlog item outlives both directories by design.

The worst instance cost real content: **`docs/handoffs/lower-third-shapes.md` was a 111-line
drawing brief** carrying an owner ruling ("sameness is a defect, not a house style") and the
measurement behind it (99 of 103 lower thirds are one silhouette), cited from three live docs -
and it went out with a handoff sweep. Recovered from git as `docs/LOWER_THIRD_SHAPES_BRIEF.md`,
with all four citations repointed.

**`docs/README.md` calls itself "the map of this directory" and has rows for 62 of the 112 files
in it.** The 51 with no row include `VERIFICATION.md`, `SVG_IMPORT_PLAN.md`, `PLAYOUT_DASHBOARD.md`,
`OGRAF.md`, `NOACG_PRO_PLAN.md` and `GOALS.md`. That is how a subject gets documented twice and
the two copies drift. The header now states the gap with its count so a missing row stops reading
as "no doc exists"; closing it properly plus the build gate that keeps it closed was filed as
`docs/backlog/docs-index-is-incomplete.md` - and was BUILT the same afternoon by
`claude/f-gates-fail-closed`, so the warning paragraph is retired on merge and the item graduates.
See "The docs-map item GRADUATED" below.

## 4. GOALS drift - the verdict, for the owner to rule on

**`## NOW` is accurate about what is LEFT, and that is the problem: none of what is left is
engineering.** All three open items - prove the SVG road, attach behaviour, walk the two graphics -
plus the consolidated 4/5/6 item are blocked on **the owner's eyes**, not on code. Meanwhile
`docs/acceptance/owner-queue/` holds 39 unwalked items.

So a fresh session that reads GOALS.md correctly concludes the push is SVG work, opens the NOW
list, and finds nothing it can start. What the week's waves actually built sits in three places the
roadmap does not describe: SVG follow-ons (aa, u, v - genuinely NOW), OGraf groundwork (af landed
`docs/OGRAF_STATE_IN_FIELDS.md`, n deferred), and agent/session infrastructure (harness routing,
permission prompts, check-in waves, this round). That is a defensible use of a week in which the
push is owner-bound - but **GOALS.md does not say the push is owner-bound**, so nothing tells a
session what to do while it waits. That is the gap. It is direction, so it is not re-ruled here.

One narrower point worth a ruling: the `## NEXT - OGraf-first` section says *"nothing below starts
before the NOW date"* (2026-09-12), and OGraf work landed this week. `OGRAF_STATE_IN_FIELDS.md` is
arguably behaviour work rather than a rung on that ladder - it answers how a behaviour's state
reaches any controller - so this reads as the sequencing sentence being too absolute rather than a
wave going off-roadmap. Either the sentence loosens or the work stops; only the owner can say
which.

GOALS.md is still 400 lines against its own ~200. The remaining bulk is genuinely open work under
NEXT/THEN/Parking lot, so cutting it further means deciding what is no longer wanted - a direction
call, deliberately not made here.

## 5. What is left

- **The wizard chain**, with the recipe in §2 and in `.codex/config.toml`. It is the only thing
  standing between the repo and a real ratchet move.
- ~~`docs/backlog/docs-index-is-incomplete.md`~~ - **done**, by `claude/f-gates-fail-closed` the
  same afternoon it was filed. It graduates on this branch's merge of `main`; see below.
- **Three broken citations outside this scope**: `.agent-workflows/check.md` ->
  `docs/handoffs/2026-08-29-dd-svg-fitting-two.md`;
  `docs/acceptance/owner-queue/2026-08-30-red-main-landing-gates.md` -> a sibling owner-queue item
  that has been walked; `docs/handoffs/2026-08-30-ag-poll-status-field.md` ->
  `docs/backlog/poll-status-own-field.md`, which was never created. The `ag` handoff was not in the
  sweep list and is left alone.
- **Two stale citations the `ac` round could not reach** because another worktree held the files;
  that branch has since landed, so `e2e/ai.spec.ts:196` and `e2e/exports.spec.ts:708` still say
  `docs/GOALS.md "Student release"` where they mean `docs/GOALS_ARCHIVE.md`. One-line Form A fixes,
  outside this session's declared file scope.
- **`docs/handoffs/` holds four files**: the three deferred ones the plan named
  (`n-ograf-checker`, `t-poll-behaviour`, `x-control-panel-research`) plus `ag-poll-status-field`,
  which landed after the plan was written and was in neither list.

## The docs-map item GRADUATED - and how the overlap happened

`docs/backlog/docs-index-is-incomplete.md` was filed by this round at about 11:00 and **built the
same afternoon by `claude/f-gates-fail-closed`** (commit `806a3623`, "Complete the docs/ map, and
gate it so it stays complete"): the 51 missing rows, `scripts/check-docs-index.mjs`, its test, and
the `package.json` wiring, which is the whole of what the item asked for.

**It graduated; it was not abandoned.** The backlog's own "graduate or die" rule says the file is
deleted in the commit that schedules the work, so this round's merge of `main` deletes it.

**The overlap was a planning fault, not two sessions racing.** The wave's planner wrote the
`docs/README.md` step into F's prompt straight from this round's backlog item without checking that
this branch still held the file - the scarce-shared-slot case the plan is supposed to allocate up
front. The planner has said so, has told F not to widen further, and has stopped launching rows
touching `docs/` or any contract file until this branch is landed. Recording it because the failure
is the useful part: **a backlog item names a file, and filing one is therefore a claim on that file
until the branch that filed it lands.**

It was caught before it merged, which is the part that matters - both branches edit
`docs/README.md` in ways that merge cleanly into a document neither of them built. F completes the
map and gates completeness; this round added a paragraph stating the map is INCOMPLETE with a
count. Landed together without thought, the file would carry a false warning above a complete table
and a gate enforcing the opposite.

**The resolution, decided by the planner and to be carried out without asking again once F lands:**

- take F's completed table and its `check-docs-index` gate;
- **keep this round's two rows** for `docs/LOGO_SLOT.md` and `docs/LOWER_THIRD_SHAPES_BRIEF.md` -
  both are new files that exist only on this branch, so F's table cannot contain them, and the gate
  fails CLOSED on rule 1 (MISSING) without them. This is the half that would have turned a careless
  merge into a red build;
- delete the "this map is INCOMPLETE / 51 files have no row" paragraph, which becomes false;
- delete `docs/backlog/docs-index-is-incomplete.md`.

## Landing - NOT queued, and why

`/queue-merge` was run three times across the round and refused every time at its step 2. The work
itself is finished: tree clean, pushed at `c213c917`, CI green.

**The standing verdict** (re-read fresh at 12:35 UTC against `main` at `3935167d`, not trusted from
an earlier run):

    VERDICT: caution (claude/a-coherence-round)
      - landing it first leaves 1 conflicted file(s) for other branches to resolve
        (claude/ae-autonomous-cleanup: 1)
      Land first instead: claude/codex-antigravity-tokens-3b9791

**The caution is TEXTUAL, and it is the loud class, not the silent one.** Measured, not assumed:

- `git merge-tree --write-tree HEAD origin/claude/ae-autonomous-cleanup` reports one file,
  `AGENTS.md`, and reading the produced tree shows **exactly one conflict hunk**.
- Both sides start from the same two adjacent bullets in the "Git" section and each rewrote a
  DIFFERENT one. This round rewrote the production-migration bullet and left the cleanup bullet
  alone; that branch deleted the cleanup bullet outright and replaced it with "Cleanup is a
  MECHANISM, not a permission", leaving the migration bullet alone. Git cannot auto-merge only
  because the two rewritten regions abut with no unchanged line between them. **Nothing has to be
  reconciled, only ordered** - keep both bullets.
- It is not the class the verdict exists for. `silentCollisions()` in `scripts/merge-order.mjs`
  fires only on `SILENT_MERGE_FILES` (`scripts/overflow-baseline.json`, `scripts/e2e-affected.mjs`)
  at severity `hold`; `AGENTS.md` is in neither and this verdict is `caution`. The threshold beside
  it is `HOLD_CONFLICT_FILES = 5`, with the authors' own note that "a couple of hunks in one file
  is the normal cost of parallel work".

**The ordering did not resolve itself, and the reason is worth recording.** Three branches landed
while this one waited, including `claude/codex-antigravity-tokens-3b9791` at `1d999632` - the
branch merge-order had named as the first lander. That should have cleared the order. Instead
**that session committed again after landing** (`af9026ed`, `.agent-workflows/orchestrator.md`
only), putting the branch back ahead of `main` and unqueued, so it is once more the named first
lander. The same re-block took `claude/ae-autonomous-cleanup`'s landing down: `j-0273` refused with
"blocked by claude/codex-antigravity-tokens-3b9791 - still ahead of main", which reads like a stale
ref and is not one - local `main` and `origin/main` agree at `3935167d`, and that branch's local
tip genuinely is not contained in it.

So this is a live ordering block on a one-file branch nobody has queued, not a judgement anyone has
declined to make.

**This branch is otherwise ready.** Against `main` at `3935167d` it merges with **zero conflicts**,
and it has zero conflicts with the blocking branch too - the only collision in the repo is the one
`AGENTS.md` hunk with `ae-autonomous-cleanup`. It is 23 commits behind main, so whoever picks this
up merges main first, resolves that single hunk by keeping both bullets, re-runs the gate on the
merged result, and only then queues:

    git merge origin/main          # expect one AGENTS.md hunk; keep BOTH bullets
    npm run build                  # read the branch stamp - it must name this branch
    node scripts/auto-merge.mjs --branch claude/a-coherence-round --dry-run
    npm run queue:merge            # only on a `clear` verdict

Nothing here was forced and nothing was accepted with `--accept`.

## Needs the owner

**Nothing here is a decision this round declined to make.** The branch is blocked on an ordering
fact, not a judgement: `claude/codex-antigravity-tokens-3b9791` is ahead of `main` with one commit
touching one file, and only its own session can queue it. Once it lands, the order clears on its
own and the recipe above applies. The alternative - weighing the single `AGENTS.md` hunk and
passing `--accept caution` - is a person's call, and the evidence for it is written out above.

Two things to rule on when convenient, both in §4, neither blocking: whether GOALS.md should say
what a session does while NOW is owner-bound, and whether the OGraf sequencing sentence still means
what it says.

No `docs/acceptance/owner-queue/` item: this round has no product surface and therefore no route
to walk.
