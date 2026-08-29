# Session H - coherence and condense (2026-08-29)

**Branch:** `claude/h-coherence-condense` (three commits, queued for landing)
**Gate:** `npm run build` green on the branch; CI run 33249042490.
**Owner review item:** `docs/acceptance/owner-queue/2026-08-29-h-condense-cuts.md` - every cut,
move and retirement, with a revert path for each.

---

## 1. Headroom, before and after

`project_doc_max_bytes = 112000`, unchanged (see §5).

| Chain | Before | After |
|---|---|---|
| `src/components/wizard/AGENTS.md` | **25 bytes free** | **4,462 free** |
| `src/templates/importedDesign/AGENTS.md` | 88 free | 1,056 free |
| `src/templates/types/AGENTS.md` | 2,480 free | 3,448 free |
| every other chain | - | improved by ~1 KB (the root contract shrank, and it is in all 38) |

The goal was 4 KB free on the wizard chain. It has 4.46 KB.

**Most of it came from MOVING sections, not from shorter prose** - the remedy
`src/components/AGENTS.md` already prescribed for itself:

- the **dialog anatomy** (every dialog's header/✕, checkbox row, form row, footer, the
  `.spacer`-is-not-a-push trap) went to a **new `src/styles/AGENTS.md`**, which now also carries the
  cascade-order rule and the app-wide amber link rule. `src/components/AGENTS.md` keeps a pointer
  telling anyone writing dialog markup to read it, so nothing about reach was lost silently.
- the **`PayloadStage` / `ProgramStage`** monitor contract went to `src/components/home/AGENTS.md`,
  where both files live.
- the **duplicate-renderer-command trap** (why the hosted-control recovery spec counts entrances
  instead of comparing pictures) went to `e2e/AGENTS.md`, where every other spec trap lives.

The rest was duplication removed at the source: the job-runner cost table is stated in full in
`docs/JOB_RUNNER_PLAN.md`, the amber link rule with its full reasoning is in `src/styles/base.css`,
and `/bridge` was described twice in the root contract.

## 2. The cuts list

`docs/acceptance/owner-queue/2026-08-29-h-condense-cuts.md`. It has six sections: the seven deleted
handoffs, the four moved sections, the six deleted duplicate sentences, the four trimmed incident
narratives, the memory changes, and - the one to read hardest - **the four things deleted with no
other home**, which are a commit sha, one file-size fact, one command name, and the job-runner
weights. Everything else still exists somewhere, and every row names its revert.

## 3. MEMORY.md (outside the repo - did NOT land through the queue)

`C:\Users\ahonemi\.claude\projects\C--claude-NoaCG-Studio\memory\`. **66 lines -> 59** (ceiling 60).

- **Retired `check-skill-trial`**, the one entry whose exit condition is satisfied: it said the
  entry goes once the orchestrator contract carries the trial, and
  `.agent-workflows/orchestrator.md:400` carries it with the 2026-09-04 date. The file was **moved,
  not deleted**, to `C:\claude\memory-archive-2026-08-25\`.
- **Folded four index pairs into two lines each** without losing an entry file: the two taste-rules
  entries, the two owner-decisions entries, the two 2026-08-27 follow-ons, the two AI-pricing
  entries. Merged the two one-line sections into "Live threads and pointers".
- **Corrected** the index's pointer from `docs/acceptance/OWNER_QUEUE.md` to the
  `docs/acceptance/owner-queue/` directory, which is where items actually go.
- **Updated** the `wave-leftovers-2026-08-27` row that asked for this condense: it now records the
  work as done and names what is still tight.

Nothing else was retired. I checked the other dated entries and their exits are genuinely not
satisfied - `wave-leftovers` in particular is a live backlog with a dozen open machinery defects.

## 4. Coherence cadence - all five steps ran

**1. Cold-read test: PASS on all three questions.** From root `AGENTS.md` + `docs/GOALS.md` alone,
what the product is, what the push is (students make their own graphics and play them out,
2026-09-12, quiz + scoreboard, SVG import) and what is parked (everything under NEXT / THEN /
Parking lot) all came out fast and consistent. Three defects found and fixed:

- the root contract said "**Six rules**" over a list of **seven**;
- `docs/GOALS.md "Student release"` was cited ten times across the contracts, and that section has
  moved to `docs/GOALS_ARCHIVE.md` - a cold reader following it landed nowhere;
- MEMORY.md pointed at the retired owner-queue file rather than the directory.

One friction, not fixed: `## NEXT - AI that anyone can afford` contains "Lite and Pro are
**revived**", which reads as active until you notice it sits under NEXT. The root contract's "AI
work stays postponed" is what settles it.

**2. Contradictions between contracts:** `src/components/AGENTS.md` claimed its chain "is the
tightest in the repository", which the split made false - now "among the tightest". The
architecture map did not mark `src/styles` as owning a contract, which it does as of this branch.
Both fixed.

**3. Orphan docs and dangling references:** repaired eleven dangling references (listed in the
second commit). Four of them were caused by this branch's own handoff deletion, and now name the
`git show` command instead. **Reported, not fixed:** `docs/CATALOG_EXPANSION_PLAN.md` and 19 files
in `docs/backlog/` are referenced by nothing - for a backlog that is normal, so nothing was
deleted.

**4. The byte ratchet: deliberately NOT tightened.** Reasoning is now in `.codex/config.toml`
beside the number. See §5.

**5. GOALS drift: reported below, GOALS.md untouched** (session G owns it this wave).

## 5. Why the ratchet did not move - and the next split

`src/templates/importedDesign/AGENTS.md` now has ~1 KB free and is the tightest chain. Lowering the
limit would move the failure to the fourteen category directories rather than remove it.

**The next split is identified and is the largest single win left.** `src/templates/AGENTS.md` is
**67 KB**, and every one of its fourteen category subdirectories loads it. Its two biggest sections
- "Shared assemblers" (200 lines) and "The canonical REPEATING-DATA system" (74 lines, describing
`dataRuntimes.ts` / `sportsRuntimes.ts`) - describe files that could own them. Moving them to
**different** directories (one split alone does not help - the bytes just follow the chain) would
free roughly 10-12 KB across all fourteen chains at once, and *then* the ratchet can come down.

I did not do it here: `src/templates/` is catalog territory and this wave had catalog sessions in
flight, so the conflict cost outweighed the benefit tonight.

## 6. GOALS drift - the owner rules on this, I only report it

**`## NOW` is engineering-complete and blocked entirely on owner walks, while the waves are
building `## NEXT`.**

- NOW steps **4, 5, 6 are checked**. Steps **1, 2, 3 are unchecked, and all three are owner walks**
  - prove the SVG road, walk the behaviour attachment, then walk the two graphics as a student.
  Step 3 is described in GOALS.md as "the acceptance test for the whole goal, and the rehearsal for
  2026-09-12". That date is **14 days out**.
- Meanwhile the recent landings on `main` are OGraf-first work (`44a4faa4`, `893b6d5f`), catalog
  gates and IBC readiness. OGraf-first sits under `## NEXT`, which the root contract defines as
  PARKED.

So the gap is not that work is going badly - it is that the push cannot advance without the owner
on a keyboard, and sessions have filled the space with parked work. **The decision is the owner's:**
either the three walks get scheduled this week, or `## NOW` should be rewritten to admit that
OGraf-first has become the actual push. Nothing in the repo can settle that.

Supporting evidence that this is not theoretical: commit `4a9fb94e`, earlier the same day, is
titled *"Tighten the standards-first pillar to fit the instruction-chain byte budget"* - a session
shortened a **product pillar** because the byte budget had no room. That is the cost this session
removed, and it is why the templates split above matters.

## 7. What is left

1. **The `src/templates/AGENTS.md` split** (§5) - the biggest remaining headroom win, and the
   precondition for ratcheting the limit down.
2. **69 more `docs/GOALS.md "Student release"` citations** in source comments, e2e specs,
   `scripts/e2e-lists.mjs`, `scripts/e2e-affected.mjs` and two GitHub workflows. All are the same
   mechanical rename to `docs/GOALS_ARCHIVE.md`. I left them because a 69-file edit across `src/`
   and `e2e/` during a live wave conflicts with everybody; it is a five-minute job for a quiet
   machinery session, in one commit.
3. **`docs/OGRAF.md` and `docs/SVG_IMPORT_PLAN.md`** now point at `GOALS_ARCHIVE.md` for "the SVG
   road". If session G moves that section back into GOALS.md, those two pointers need updating.
