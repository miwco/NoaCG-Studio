# A contract points, it does not restate

**Branch:** `claude/f-contracts-point`. **Merge base:** `332e8b56`. Two commits, `e79a7669` and
`7c268f5b`. Build green on the final state; no product code changed, so no e2e run.

The owner's 2026-09-03 ruling - a contract states the rules its own directory owns and points at
the file that owns anything else - is applied to all four cuts it named. The defaults-are-not-taste
ruling is in `pushback.md` and `walk.md`. The date-is-a-forecast ruling is in the two register docs
that still contradicted it. **The 85% byte target is not met and is not reachable from these cuts;
that is a measurement, and it is the most useful thing in this handoff.**

## The numbers, before and after

`npm run check:shared-instructions`, quoted from its own output:

| | before | after |
|---|---|---|
| `src/components/wizard` chain | 100,292 used, 9,708 free, **91.2%** | 98,541 used, 11,459 free, **89.6%** |
| `src/templates/importedDesign` chain | 87,482 used, **79.5%** | 84,950 used, **77.2%** |
| orchestrator common path | 640/640 lines | 640/640 lines |
| `src/components/wizard/AGENTS.md` | 50,990 bytes | 49,239 bytes |
| `src/templates/AGENTS.md` | 50,898 bytes | 48,366 bytes |

The common path took the new rule and stayed at its budget by trading three sections that were
themselves restating a doc: `grounding.md`'s morning-report paragraph now points at
`docs/ROUTINES.md`, `routing.md`'s ruling list points at where each ruling is quoted in full, and
`prompts.md`'s delegation bullet points at `routing.md` instead of repeating it.

## Why 85% is not reachable, with the evidence

The row asked for under 85%, from 91.2%. It lands at 89.6%. This is not a shortfall of effort, and
the measurement is repeatable:

- **A sentence-coverage pass over the rewritten Import/SVG block found 4 of its 54 sentences
  present in `docs/SVG_IMPORT_PLAN.md` or `docs/IMPORT_MVP.md` - and all four are rules the ruling
  says to keep.** The wizard's contract is not restating those plans. It holds rules they do not.
  So there is no fifth cut of the same kind waiting in that block.
- The 2026-09-03 findings still hold and I re-checked both: the file is not stale, and it has no
  split, because a child contract under `wizard/` loads on TOP of this one rather than instead of
  it, which moves bytes without moving the maximum.
- The remaining levers are structural, not editorial - moving the import steps out from under this
  contract in the source tree, or content `src/components/AGENTS.md` gives up. **Neither is a byte
  problem, so neither should be started to make a percentage.** Recorded in
  `docs/backlog/instruction-files-need-a-shrinking-mechanism.md`.

**Free bytes is the honest measure**: 365 free on 2026-09-02, 9,708 after the root trims, 11,459
now. The percentage moves against you every time the ceiling ratchets, which is what makes it a bad
target.

## The delegation, and the defect it nearly shipped

Codex (`gpt-5.6-sol`, `high`, through `rescue`, job `task-mtm0qoyv-3i99io`) did the four cuts from a
10.4 KB spec. **Cuts 1, 2 and 4 were right and I kept them almost as delivered.** Cut 3 reported
success, hit the byte target to within one byte, and had deleted rules.

- **17 backticked names went to no file at all** - `withUniversalMotion`, `isWholeUnitPreset`,
  `draft.animation.motionIn/motionOut`, `components/MotionPresetPicker.tsx`,
  `e2e/motion-presets.spec.ts`, `withDesignFieldSpecs`, `proposeFollowers`, `svgStretch.followers`,
  `svgFitNodes`, `assets/svgGeometry.ts`, `wizard/FontPicker.tsx`, `.wz-help-strip`,
  `placefields-baked-note`, `onDraw`, `onPick`, `✨ Suggest fields`, and the OUTLINED-TEXT rule.
- Its pointer for the animation content named a section of the wizard's own file that **does not
  contain it** - a pointer that reads as correct and is false.
- The surviving prose had gone telegraphic ("Re-derive until `authored`"), which is not this repo's
  voice and is harder to act on.

**The instrument that caught it is worth reusing, and the obvious one does not work.** A line-level
verbatim diff audit - the one that proved the 2026-09-03 root trims lossless - reported 154 lines
"lost" here and was useless, because that audit assumes prose was MOVED and this prose was
REWRITTEN. What worked: extract every backticked token and bare file path from the pre-edit file,
check each against the post-edit file and against every candidate receiving doc, and read the
residue. 304 tokens in, 17 genuinely homeless, and the two that still report as missing are a
substring miss (`ai/pro/language/gate.ts`, held as `pro/language/gate.ts`) and a Playwright API
name. The method is written down in the shrinking-mechanism backlog file; the script itself was
scratch and is cheap to rebuild from that description.

Recorded with `npm run outcome` as `codex / gpt-5.6-sol / doc-sweep / repaired / worker`.

**The routing lesson, for the next plan:** this task was long to do and short to specify, which is
the delegation shape - but its acceptance condition was a byte number, and a byte number is exactly
what a delegate will satisfy by deleting. A spec that names a target and a prohibition ("keep every
rule") gives the worker a way to satisfy one by violating the other. Give a delegate the
prohibition with a MECHANICAL check it must run itself, or give it no number at all.

## What changed, by file

- `src/components/wizard/AGENTS.md` - cut 3 (the Import/SVG block) and cut 4 (the Pro engine). The
  block now states the three modes and every rule that is this wizard's, and points at
  `docs/IMPORT_MVP.md` by section and `docs/SVG_IMPORT_PLAN.md` §§1-4, §§6a-6c for the walk.
- `src/templates/AGENTS.md` - cut 1 (the storefront's shape now points at the wizard's Browse
  section) and cut 2 (THE STAGE's two measurement narratives now point at
  `docs/FOOTPRINT_STABILITY.md` by section). Every rule, exception, mechanism, gate and instrument
  name stayed inline.
- `.agent-workflows/orchestrator/pushback.md` - a design default is named in the section's preamble
  as what does NOT belong in the list.
- `.agent-workflows/walk.md` §4 - the same rule as the prior question before the kind is picked.
- `.agent-workflows/orchestrator/{grounding,routing,prompts}.md` - the three trades that paid for it.
- `docs/NORTH_STAR_2027.md` §3 and `docs/GOALS.md` - a date-only entry condition is met when the row
  is written; the programme flips with the first work it permits. Both now defer to the register.
- `docs/backlog/agents-md-byte-headroom.md` - **deleted.** Its work has landed and landed is not a
  state; `node scripts/owner-receipts.mjs --closed` reads it back out of git.
- `docs/backlog/instruction-files-need-a-shrinking-mechanism.md` - carries what outlives it.
- `src/ai/pro/AGENTS.md`, `docs/TEMPLATE_TAXONOMY_PROPOSAL.md` - pointer corrections from the check.

## Two things for a later row, neither blocking

1. **`docs/IMPORT_MVP.md`'s "The wizard is a SETUP flow, not a second editor" section is STALE.** It
   says the design flow is three steps and that "everything the wizard's old Text / Style /
   Animation steps did lives in the editor now". The shipped wizard renders `PlaceFieldsStep` at
   step 3 and an Animation step at 4 (`CreationWizard.tsx`). I did not fix it - that doc is outside
   this row's `TOUCHES` and a correction there is its own change - so the wizard contract carries an
   explicit warning not to follow that section, and the walk is stated where it is true. **The
   warning should be deleted by whoever fixes the doc.**
2. **The symbol-survival check belongs in `npm run build`**, beside `check-docs-index` and the
   staleness pass the shrinking-mechanism file already asks for. It is the same shape of check and
   it would have failed this branch's first commit. That is a gate, and a gate lands alone.

## Check

- `review: delegated` - the code-review skill at `high` returned ten findings and named this
  branch, this merge base and these files, so it passed the scope check. All ten confirmed against
  the surrounding files and all ten fixed, in `7c268f5b`. The load-bearing one was the stale
  `IMPORT_MVP.md` pointer; the others were the mutual pointer loop between the wizard and templates
  contracts, the GOALS/NORTH_STAR/register disagreement about programme state, the design-default
  rule sitting inside a list of things to report, the receipt left `active` after its work landed,
  a relocated Pro sentence naming a file the symbol does not live in, a superseded back-pointer in
  `TEMPLATE_TAXONOMY_PROPOSAL.md` §12, a delegation pointer too narrow to carry the fallback rule,
  and one dropped invariant about the universal-motion default.
- `simplify: inline` - the skill returned fan-out instructions rather than a result, so the leg ran
  here over its four angles. Three findings, all fixed: the backlog note quoted byte figures that
  the review's own fixes had already moved (numbers re-measured, never re-estimated), `GOALS.md`
  restated the register's state mechanism instead of deferring to it, and the wizard's stale-section
  warning was tightened to one sentence.
- `verify: inline` - `npm run build` green on `7c268f5b`, stamped
  `dist/version.json -> claude/f-contracts-point@e79a76690f` at the first run and re-run green after
  the fixes. `npm run check:shared-instructions` green, common path 640/640. No e2e: no product code
  changed. Verdict stamp written to `.git/noacg-jobs/checks/claude-f-contracts-point.json`.

`origin/main` may have moved while this ran. I did not merge it in - integrating and gating on the
integrated sha is the landing queue's job.
