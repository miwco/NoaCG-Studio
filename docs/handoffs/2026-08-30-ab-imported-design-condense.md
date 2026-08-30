# AB - give the imported-design contract room again

Branch `claude/ab-imported-design-condense`, two commits, build green, CI read below.
Touched exactly two files: `src/templates/importedDesign/AGENTS.md` and `docs/SVG_IMPORT_PLAN.md`.

## The numbers

The cap is not on the file - it is on the whole root-to-area CHAIN, measured LF-normalised by
`scripts/check-shared-instructions.mjs` against `project_doc_max_bytes` in `.codex/config.toml`.

| | chain bytes | free | file itself |
|---|---|---|---|
| before | 111,707 / 112,000 (99.7%) | **293** | 12,101 |
| after | 109,539 / 112,000 (97.8%) | **2,461** | 9,933 |

The file lost 2,168 bytes (18%) and the chain gained 8.4x its headroom. Room for roughly 25 new
lines of rule where there was room for three.

**Why it did not go further, and what would.** Root `AGENTS.md` + `src/templates/AGENTS.md` are
99,602 bytes of the 112,000 on their own, so NO file in `src/templates/*` can exceed 12,396 bytes,
and the fourteen category contracts all sit on that same stack. This chain is still the tightest,
so the ratchet in `.codex/config.toml` still cannot move; the next tightest is
`src/templates/types/AGENTS.md` at 3,448 free. `.codex/config.toml` already names the move that
buys the ratchet its room - splitting `src/templates/AGENTS.md` (67 KB), specifically its "Shared
assemblers" and repeating-data sections, out to the directories that own those files. That was
outside this session's scope and is the next real gain.

## Moved, not deleted

The condense followed the move-not-delete rule. Everything below already lived in the cited doc, at
greater length than the contract carried it; the contract now states the rule and cites the section.

- The fit ladder's measured evidence (the 588px of unused banner, the 3.7px shrink, the 127px
  overrun past the floor, the 73px the flat-4% cap overshot) -> `docs/SVG_IMPORT_PLAN.md` §3.
- The vertical-growth mechanism narrative (the circularity and how it was answered, the
  rest-before-re-measure defect, growth having been downward-always) -> §6c and §3.
- The raster DOM map and the frame-sized/cropped anchoring rules -> `docs/IMPORT_MVP.md` "The
  structure contract"; the whole-unit motion reasoning -> its "Whole-unit motion" section.
- The one-fit-per-graphic rationale -> §6b, and the same sentence already stands in
  `src/templates/AGENTS.md` (the parent binds it) and in `shared/textFit.ts`'s own header comment.

**Six symbols were moved INTO `docs/SVG_IMPORT_PLAN.md` first**, because this contract was their
only record anywhere in the repo and shortening it would have stranded them: `svgSqueeze`,
`svgFitValue`, `svgGrowDir`, `svgCollectSpanners`, `growthRuntimeJs`, `DesignSvg.growth`. Each now
sits beside the paragraph describing what it does.

## Genuinely cut, one line each

Every one of these is recoverable from the cited doc or from the code; nothing here is a rule.

- `q-sel-N` / `q-cor-N` / `q-wrong-N` / `q-lock` - the quiz state class names. `quizBehaviour.ts`
  is the list, and it cannot drift from itself.
- The `("Artwork")` label on the `.imported-design-art` registry part - `IMPORT_MVP.md` carries it.
- "What v1 still does not handle: rectangles only, and the wizard picks ONE element per graphic" -
  §3 "What v1 handles, said out loud" and §6c "Still authored the narrow way" both state it.
- "a name with a role beneath it has no room of its own and buys a second line by GROWING" - the
  worked example of the gap rule, which is stated. §3 has the example.
- "INTERPOLATED to its share" from the poll bar description - the surviving sentence already says
  it is measured at rest and tweened on `width`.
- The 2026-08-22 split note in the preamble ("Split out of `src/templates/AGENTS.md`...") - dead
  history that git holds.

## The quality pass, and what it caught

Read cold, the condensed file answers all three questions - what the area is, what binds it, what a
session must not do - and every rule is stated as a tripwire rather than a description.

`/code-review --high` (blocking fork, findings returned inline) caught three REAL regressions in
the first commit, all fixed in the second:

1. **An invented absolute.** "no rule here may reshape it to make copy fit" was not in the old file
   and contradicts both variants - 9-slice stretch widens the artwork, growth widens the panel. An
   agent could have refused growth work on that sentence's authority.
2. **An imp01-only rule hoisted into the shared section** (the bare create with an empty `lines`
   array), which made the file contradict its own svg01 section.
3. **`NOACG_LAYOUT` attributed to the wrong emitter** - `layoutDataJs` emits the table,
   `growthRuntimeJs` emits the runtime that reads it. Corrected in the contract AND in
   `SVG_IMPORT_PLAN.md`, where the same wrong attribution had just been introduced.

It also caught that the condense had quietly rerouted "leave the reasoning in the code's own
comments" to the docs instead - restored, since `svg.ts` carries doctrine comments at every rung
and that is the house style here.

The simplify leg of `/check` fans out and cannot run in a session like this; skipped, and this line
is the record of it.

## Needs the owner

Nothing. No route to walk - this is an internal contract with no product surface, so it earns no
`docs/acceptance/owner-queue/` item.

## Traps respected

`node scripts/worktree-activity.mjs` showed one other worktree in flight
(`claude/aa-svg-samples-followups`) holding `docs.html`, `docs/SVG_AUTHORING.md` and
`docs/svg-samples/`. None of the three was touched. `docs/SVG_IMPORT_PLAN.md` is not in that set.
The file was read at current HEAD, so the poll behaviour that landed hours earlier is preserved in
full. No citation points into `docs/handoffs/`.
