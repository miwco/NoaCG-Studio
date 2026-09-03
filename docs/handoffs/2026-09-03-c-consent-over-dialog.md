# Nothing sits on top of a dialog

**Branch:** `claude/c-consent-over-dialog` · **Date:** 2026-09-03 · **Merge base:** `a14b50bb`

## The measured cause

The scheduled configured suite went red overnight (issue #50, run 33719914276): one failure,
`e2e/configured/imported-quiz-output.spec.ts`, failing on the retry too. Playwright's call log named
the culprit outright - the click on `wz-finish-production-confirm-go` was intercepted by
`<aside class="analytics-consent">` for the full 240 s.

I reproduced it locally before changing anything, and the first measurement is the one that
mattered: the offline suite clicks that same test id in two places and passes, because
`AnalyticsConsentBanner` returns `null` unless `isBackendConfigured()`. The banner only exists on a
deployment with Supabase env set. That is why a defect this broad lived this long - it is invisible
to every tier that runs on a push.

Mounting the real banner over the real dialog in the offline tier reproduced the CI error verbatim:
`<aside class="analytics-consent" ...> intercepts pointer events`.

The cause is one number with nothing to compare it against. `.analytics-consent` carried a bare
`z-index: 1200`; the highest value anywhere else in `src/styles` was 140, on the dialog layer. So the
banner was above **every** dialog in the app - sixteen of them wear `.gallery-backdrop` - not just
the one that failed. The failing click reaches it through `addToProductionFromFinish`, which is the
last click before a production and therefore on the NOW push's own road.

What convinced me this was a missing mechanism rather than a bad number: **six configured specs had
already been taught to answer the banner before driving anything**, each comment recording the
overlap as somebody else's problem. `teams.spec.ts`, `production-links.spec.ts`,
`hosted-control-recovery.spec.ts`, `production-data-key.spec.ts`, `pro-wizard.spec.ts` and
`moderator.spec.ts`. The suite had been absorbing this defect for weeks.

## The layering rule I chose, and why

A named scale in `src/styles/base.css`, with every floating surface reading from it:

```
full-screen < notice < popover < modal < modal-over < auth-gate
   70          80       90        100     140          200
```

The order is about **whether the user asked for the surface**, which is the only ordering that
survives contact with a new surface nobody has thought of yet. A notice is the one thing the user did
not ask for - it put itself on screen - so it loses to everything they opened. A popover was opened by
a click. A modal is the only surface that claims the whole app, which is exactly why nothing passive
may sit on it.

I chose "the notice drops below the modal layer" over the other candidate, "the banner hides while a
modal is open", because the second needs global modal state and every future dialog has to remember
to register with it. A dialog that forgets reintroduces the bug silently. The scale is declarative and
a new dialog inherits it by doing nothing.

Two decisions inside that are worth arguing with rather than inheriting:

**Notices lose to popovers too, not just to dialogs.** Both notices park in a screen corner, which is
exactly where a production's Links popover footer lands - `production-links.spec.ts` and
`hosted-control-recovery.spec.ts` both record the banner covering ⟳ Publish changes. A notice that
outranked popovers would have fixed the dialog and left that one standing.

**The full-screen wizard is not a dialog.** This is the sixth value, and I only added it because the
first code-review pass caught me getting it wrong. The wizard fills the viewport through the same
`.gallery-backdrop`, but its shell is deliberately **opaque**, and `/app` opens it immediately. Ranked
with the dialogs, a notice underneath it is not dimmed - it is gone. The consent banner would have
been invisible for the whole of a first visit, which is the only visit it exists for, and the
storage-health warning invisible during exactly the boot it warns about. That is the same defect
pointing the other way. A notice may sit over a page; it may not sit over a question.

## What the sweep found

Beyond the two known notices, three surfaces sat at or above the modal layer:

- **`.tlv2-menu`, 320** (`machine-graph.css`) - a fixed right-click context menu at 3× the modal
  backdrop. A step-timeline menu left open when a dialog opened stayed painted over it. Now a popover.
- **`.account-menu`, 150** (`auth.css`) - a dropdown above every dialog. `.topbar` sets no `position`,
  so it makes no stacking context to confine it, and `.save-menu` wears the same class. Now a popover.
- **`.auth-gate`, 200** - legitimately above dialogs and documented as such in
  `components/teams/useEscapeToClose.ts`. Left where it is, now named on the scale.

`.lib-menu` and `.pd-links` were already at 90 and `pd-links` already carried a comment calling 90
"the same 90 every popover uses" - so the convention existed in prose and nowhere enforceable. Both
now read the token.

Surfaces I deliberately did **not** touch: `.agent-consent-page` and `.sendin` are full-screen and
carry no z-index at all, relying on DOM order. They are not offenders and changing them is a
behavioural risk with no defect behind it.

## The hole the second review found

Worth reading even if you skip the rest. Dropping the wizard shell to 70 made it a **stacking
context**, and a stacking context is absolute: anything rendered *inside* the wizard is clamped below
the root-level notices however high its own z-index goes. `WizardConfirm` was already portalled to the
body and so unaffected, but the SVG import's "what should happen to these words?" dialog
(`MapSvgFieldsStep`) was nested. That left the exact issue #50 failure alive in the walk that matters
most - a student mapping their own artwork's text layers - with every number looking correct.

It now portals to the body like its sibling. `untickTextRow` in `e2e/_svg-import.ts` is the only
helper that opens that dialog, so the nesting assertion lives there and all three specs that walk it
carry the guard.

This is also why `SaveDialogs` must keep mounting outside the wizard in `App.tsx`. Both files carried
comments saying every backdrop shares z-index 100 and DOM order decides; that stopped being true on
this branch, and both now state the real reason.

## The pin

`e2e/overlay-layers.spec.ts`, in the **offline** tier, because that is the only tier that runs on
every push and the banner that caused this exists only on a configured deployment.

1. **The stylesheet audit** reads the live CSS, resolves tokens, and fails on any floating surface
   that outranks the modal layer, on any bare number at or above the full-screen layer, and on any
   z-index it cannot parse. It would have caught the 1200 the day it was written.
2. **The click**, walking issue #50 to the button that failed, with both notices mounted over it.
3. **The readability half** - a notice must still be topmost over the wizard.

Both notices are mounted rather than driven, because neither can be driven offline. I verified the pin
fails on the broken code rather than trusting a green run: reinstating `z-index: 1200` turns tests 1
and 2 red, and test 1 names both offenders by selector.

## Verification

- `npm run build` green.
- **Full CI green on the final sha `2fc40155`** - run 33737972755: all nine shards in `full` mode,
  plus Factory gates, Build and the catalog calibration gate. This is the verdict the branch lands on.
- An earlier full run (33735751141) was also green on `75241d23`, before the portal fix.
- **Both had to be asked for by `workflow_dispatch`, and that is the lesson worth keeping.** Three
  ordinary pushes on this branch each cancelled the run in flight, and the replacement planned only
  the new commit - one of them **skipped every E2E shard and still reported the CI gate green**.
  Exactly the trap the root `AGENTS.md` documents. If you take one thing from this file: on a branch
  you are pushing to repeatedly, a green CI badge means nothing until you have read WHICH JOBS RAN.
- The portal commit is additionally covered locally by overlay-layers, import-svg-corpus,
  import-svg-behaviour and student-rehearsal - 27 passed.
- One failure appeared in a local focus run taken while I was still editing CSS
  (`student-rehearsal.spec.ts:229`, a quiz state class inside the template's own iframe). It passes on
  the final tree and the mechanism is unrelated - the dev server was hot-swapping CSS mid-test.

`check` legs: **review: delegated** (twice, opus high - 10 findings, 9 fixed), **simplify: inline**
(the skill returned fan-out instructions rather than a result, so the four angles were covered here),
**verify: inline**. The verdict stamp under `<git-common-dir>/noacg-jobs/checks/` could **not** be
written - this session is worktree-isolated and refuses writes to the shared `.git`. That is a real
gap in the stamp mechanism for isolated sessions, not a skipped step.

## What is left

- **Deferred, pre-existing, not a regression.** The consent banner partly overlaps the wizard's own
  `Next →` on a laptop viewport, and below 600px it covers the wizard footer outright.
  `pro-wizard.spec.ts` has recorded this since before this branch. It is a placement question - where
  should a corner notice sit when the surface under it is full-screen - not a layering one, and it
  wants a design answer rather than another number.
- **`src/styles/AGENTS.md` does not document the scale.** It should: the root `AGENTS.md` makes nested
  contracts binding, and the scale currently lives only as a comment in `base.css` plus a spec. I did
  not add it because row A owns every `AGENTS.md` this wave.
- The six configured specs still answer the banner before driving. I left the code (I cannot run that
  tier) and corrected the three comments that asserted a defect that no longer exists.
