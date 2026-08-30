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
as "no doc exists"; closing it properly plus the build gate that keeps it closed is filed as
`docs/backlog/docs-index-is-incomplete.md`.

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
- **`docs/backlog/docs-index-is-incomplete.md`** - 51 rows plus a gate, one session.
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

## Landing - NOT queued, and why

`/queue-merge` was run and its step 2 refused, so nothing was queued. The work itself is finished:
tree clean, pushed, CI green on the queued-shaped commit.

    node scripts/merge-order.mjs --branch claude/a-coherence-round
    VERDICT: caution - landing it first leaves 1 conflicted file(s) for
             claude/ae-autonomous-cleanup
    Land first instead: claude/codex-antigravity-tokens-3b9791

**The conflict is one file: `AGENTS.md`**, confirmed with
`git merge-tree --write-tree HEAD origin/claude/ae-autonomous-cleanup`. Both branches edit the
"Git" section and the hunks are adjacent - this round rewrote the production-migration bullet, that
one rewrites the worktree-cleanup bullet. Whoever lands second resolves it by keeping both
bullets; there is no semantic overlap. It is a `caution` rather than a `hold` for exactly that
reason.

Root `AGENTS.md` says `caution` stops and asks, so it stops here rather than being waved through
with `--accept`. Two things a person should know before deciding:

- `claude/ae-autonomous-cleanup` is not landing imminently anyway - its own landing (`j-0268`)
  refused on a RED CI run of its own (`CI gate` concluded failure on `33308609714`), not on this
  collision.
- `claude/codex-antigravity-tokens-3b9791`, the recommended first lander, is a one-commit branch
  in the wave's own worktree and was not queued at 11:40 UTC. Only its session can queue it.

Once the order clears, this branch needs nothing re-done:

    node scripts/auto-merge.mjs --branch claude/a-coherence-round --dry-run
    npm run queue:merge      # from .claude/worktrees/agent-a4c6c086508767ec9

## Needs the owner

**One decision, and it is the only thing holding this branch:** the `caution` verdict above. Either
let `claude/codex-antigravity-tokens-3b9791` land first and re-run the dry-run, or weigh the one
`AGENTS.md` conflict and accept it.

Two things to rule on when convenient, both in §4, neither blocking: whether GOALS.md should say
what a session does while NOW is owner-bound, and whether the OGraf sequencing sentence still means
what it says.

No `docs/acceptance/owner-queue/` item: this round has no product surface and therefore no route
to walk.
