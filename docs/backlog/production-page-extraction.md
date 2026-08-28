# Extract `ProductionPage.tsx` - one 2,968-line component behind the 12 September production

**Filed:** 2026-08-28. **Source:** weekly quality review (measurement)

## Why

**The screen the student release runs on is the hardest file in the repo to change safely.**

`src/components/home/ProductionPage.tsx` is 2,968 lines with a **single export**: the default
component opens at line 168 and runs to roughly line 2,460. That one function body holds
**30 `useState` calls and 77 hooks in total**. Only six helpers have ever been pulled out
(`elapsed`, `nameList`, `ProductionShell`, `CasparAirRow`, `LinkRow`, `ProductionLinks`).

It is also **the highest-churn component in the repo at 66 edits in the month to 2026-08-28**,
and it is the playout dashboard - the surface the 2026-09-12 production depends on. So every
remaining student-release change lands in the file where a mistake is least visible, at the point
in the calendar where a mistake is most expensive.

The state names say why it resists editing: `liveCue`, `selectedCueId`, `draft`, `liveData`,
`machineStates`, `airedData`, `wireLog`, `programOverflow`, `previewOverflow` - the rundown, both
monitors, the cue draft and the wire log are one interleaved scope, so a change to any of them is
a change to all of them.

## What it would take

A day.

Split along the surfaces the file's own header comment already names - rundown, PREVIEW monitor,
PROGRAM monitor, cue draft, data/wire panels - lifting only the state each genuinely needs.

The order that keeps it safe: extract the **read-only** pieces first (the wire log, the links
rows, the overflow readouts), which cannot change Take behaviour. Do the cue draft last, because
`liveCue` is a MAP keyed by layer and every verb but Take addresses the selected cue's layer - the
one piece of state that must not be split by accident.

Best done in the same branch as [[split-styles-css]]: the dashboard's CSS is another 1,314 lines
inside that file, and the two halves of one surface are cheaper to move together.

**Risk: hook order, and state that is genuinely shared.** Lifting `liveCue` or `selectedCueId`
into the wrong child changes what Take airs - the one behaviour in the product that must not
regress quietly.

**Proof it did not break:** the production-route e2e specs already exist (`hosted-control.spec.ts`,
`caspar-connect.spec.ts` and the others matching `production`); run the affected plan. Any cue path
that turns out to be uncovered gets its own spec in the same commit (root `AGENTS.md`,
verification rule 2), because "it still rendered" is not proof that Take still aired the right
layer.

## Evidence

- `wc -l` -> 2,968. `grep -n '^export'` -> exactly one line (168).
- `grep -c 'useState\|useEffect\|useMemo\|useCallback'` -> 77; `useState` alone -> 30.
- `git log --since="1 month ago" --name-only` -> 66 commits, rank 1 among components
  (rank 3 overall, behind `src/styles.css` and `src/ai/AGENTS.md`).
- Its CSS block in `src/styles.css` is lines 5839-7153 (1,314 lines).
- Deadline context: root `AGENTS.md` "Current push" - a QUIZ and a SCOREBOARD decide the release
  by 2026-09-12, both played out from this surface.

## Trend

- 2026-08-28: 2,968 lines, 1 export, 77 hooks (30 `useState`), 66 commits/month
