# AGENTS.md byte headroom - what moved, what I propose cutting, what I left alone

**Branch:** `claude/e-agents-md-headroom` (two commits, `c0a074af` then `5a0a348e`).
**Row:** session E of the 2026-09-02 cohort. Receipt: `docs/backlog/agents-md-byte-headroom.md`.

## The numbers, before and after

Both columns are `npm run check:shared-instructions` reading its own output, not a figure from
the plan. `project_doc_max_bytes` is 112000.

| chain | before | after |
|---|---|---|
| chains printing the 80% warning | **17** of 39 | **10** of 52 |
| `src/components/wizard` | 110530 (98.7%) | 110530 (98.7%) - unchanged, see below |
| `src/templates/importedDesign` | 103118 (92.1%) | 96360 (86.0%) |
| `src/templates/types` | 102008 (91.1%) | 95250 (85.0%) |
| `src/templates/infographics` | 100765 (90.0%) | 94007 (83.9%) |
| `src/templates/lowerThirds` | 100584 (89.8%) | 93826 (83.8%) |
| `src/ai/pro` | 99606 (88.9%) | 93570 (83.5%) |
| `src/templates/scoreboards` | 98590 (88.0%) | 91832 (82.0%) |
| `src/ai/lite` | 97259 (86.8%) | 91223 (81.4%) |
| `src/templates/pack4` | 97187 (86.8%) | 90429 (80.7%) |
| `src/templates/endCredits` | 89520 (79.9%) | 89621 (80.0%) - see the honest note |

**The honest note.** The headline is 17 down to 10, not 17 down to 9. `endCredits` was sitting
21 bytes under the warning line and my own index rows pushed it over, so a chain I did not
otherwise touch now prints a warning it did not print before. I did not trim the row to get the
number back - that would be gaming a measurement rather than buying headroom. Both proposal 1 and
proposal 2 below cut `src/templates/AGENTS.md`, which is the file that would take it back under.

## What I moved, and why a move needed no ruling

Moving a section into the one directory it describes needs nobody's permission: the people
editing that code still load it, and every sibling stops paying for it. **The prose moved
verbatim** - I extracted it programmatically rather than retyping, then diffed every removed line
against the new files to prove it. The only removed lines not found verbatim afterwards were the
`- ` bullet markers stripped by de-bulleting and five intro sentences I knowingly rewrote (the
subdirectory counts, and `Three traps` becoming `Four traps` when a fourth trap moved into that
section from where the split had orphaned it).

- **Eight template categories** - `tickers`, `alerts`, `publicInfo`, `gameTimers`, `versus`,
  `poll`, `frames`, `transitions` - now carry their own `AGENTS.md` plus the thin `CLAUDE.md`.
  This ended the parent's "the rest are a paragraph each and stay here" rule: those paragraphs
  had grown to 23, 17 and 10 lines, and every one of the thirteen category chains was paying for
  all of them.
- **Four `src/ai` subdirectories** - `spec`, `importAnalysis`, `spike`, `creative`. Where a rule
  still binds outside the directory I left it in the parent, following the pattern `lite/` and
  `pro/` already set (a pointer plus the bullets that bind from out here). `creative/` is the
  worked example: the retired pilot's record moved, but its two rules that reach outside it - the
  custom coder being the benchmark control, and the absolute anti-anchoring rule - stayed.

## What I propose cutting, for the owner to rule on

`docs/acceptance/owner-queue/2026-09-02-e-agents-md-cuts.md`, front matter `kind: decision` /
`date: 2026-09-02`. Five cuts, each with the measured size of the section and what is lost:
the Browse storefront written twice (2742 bytes, in both `src/templates` and the wizard), the
"THE STAGE" measurement narratives (5005 bytes, already pointed at `docs/FOOTPRINT_STABILITY.md`),
the wizard's Import/SVG block (10741 bytes) and its Pro engine restatement (3841 bytes), and two
root-file trims (2624 bytes) that are the only lever reaching every chain at once.

**Coordination point for session F:** I picked `kind: decision`, which is outside the vocabulary
`docs/acceptance/OWNER_QUEUE.md` documents (`walk | owner-action | hardware`). Four other
non-canonical kinds are already in that directory and `/walk` reads every file regardless of kind,
so nothing is broken - but if F's new check enumerates allowed kinds, this file is one to
normalize.

## What I left alone, and why

This is the part the row said was the whole reason it is not mechanical.

- **`src/templates/shared/` gets no contract, deliberately.** It is the single biggest movable
  block left (9884 bytes for 112 lines describing six files), and moving it would have been the
  largest number in this handoff. It is also wrong. Its rules bind in the CATEGORIES that call
  those files, not where the files live: `shared/clock.ts` says "every design that emits
  `clockRuntimeJs` owes that call in its `update()`" and names three category directories,
  `shared/standard.ts` says every category creates as a data block. Relocating those buys bytes by
  hiding a rule from the people it is addressed to. It is now the one documented exception in the
  new gate.
- **`src/components/wizard/AGENTS.md` has 1470 bytes free and no move left in it.** Two walls, and
  both matter for whoever picks this up. Its step rules and its shell rules share `draft.ts`,
  `WizardPreview` and `CreationWizard` state throughout, so every candidate section binds in both
  places. And its files are already in `steps/`, where moving deeper buys nothing at all - a chain
  is measured to its leaf, which `docs/AGENT_WORKFLOWS.md` already warned about and I confirmed.
  Only a ruled deletion or a reorganization of `src/components/wizard/` moves that chain. This is
  the chain that will red-gate the next branch to touch it.
- **The root `AGENTS.md` has no clean single-directory move in it.** I looked specifically, because
  it is the only file that reaches the wizard chain. Every section is genuinely global - the
  architecture map, the verification rules, the Git rules, the state-machine model. What it has
  instead is duplication and narrative, which is proposal 5.

## Two things the check found that were not in the plan

- **`streamNotifications/` was a registered category (sn01-sn04) with no contract and no row in
  the index.** The rule I had just written into the parent - "every category carries its own
  `AGENTS.md`" - was false the moment I wrote it. It now has a contract, minted from what its own
  source header states rather than invented: a follower, donation, gift or raid is DATA, not a
  state, so the machine owns only the shared enter/hold/exit lifecycle.
- **That rule had no mechanism.** `npm run check:shared-instructions` now refuses a
  `src/templates/` subdirectory with no `AGENTS.md`. I mutation-tested it - hide the
  streamNotifications contract and it fails naming that directory; restore it and it is green.
  This is a gate every branch meets, but it is green on `main`'s content today and it enforces a
  rule the file already stated, so it does not red-gate anything in flight.

## Not this row's work, filed instead

**Making the warning FAIL at 99% is now its own backlog row**
(`docs/backlog/agents-md-warning-fails-at-99.md`). It is step 4 of the original receipt and it is
a build gate, so it has to land alone and only once the headroom exists - and this wave measured
that a wave cannot promise which branch lands last
(`docs/backlog/wave-last-landing-unenforceable.md`). Its precondition is NOT met today: ten chains
still print the warning and the wizard chain has 1470 bytes free. It waits on the owner's ruling
on the cuts, or on the wizard reorganization.

## Verification

- `npm run build` green (the check runs inside it). CI run `33646252724` green on `c0a074af`.
- `/check`: **review `delegated`** (returned findings, scope-checked to this branch and these
  files, six findings all fixed), **simplify `inline`** (the skill returned fan-out instructions,
  which the workflow defines as not run, so the four angles were covered by hand; two findings,
  both fixed), **verify `inline`**. Verdict stamp written.
- No e2e: nothing product-facing changed. The diff is documentation contracts plus one build-gate
  script.
- **UNVERIFIED:** nothing in this handoff. Every number above is quoted from the check's own
  output, and the "prose moved verbatim" claim is backed by the line-level diff described above,
  not by inspection.
