---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
asked: "the survey's clearest un-taken finding, filed rather than guessed"
---
# Add and remove time on a clock that is already running

**Filed:** 2026-09-05, while building the countdown behaviour
(`src/templates/importedDesign/timerBehaviour.ts`). **Source:** the behaviour survey,
`docs/BEHAVIOUR_SURVEY.md`.

## Why

A segment overruns and the clock has to be corrected without being restarted. That is the one
timer verb the survey found in the market and NoaCG does not have, anywhere - not on the catalog
countdown, not on the imported one:

- vMix ships `AdjustCountdown` beside `SetCountdown` and `ChangeCountdown`
  ([Shortcut Function Reference](https://www.vmix.com/help28/ShortcutFunctionReference.html)).
- H2R Graphics ships "add/remove time", taking `HH:MM:SS`, `MM:SS` or plain seconds, as a named
  verb in its Companion module
  ([companion-module-h2r-graphics](https://github.com/bitfocus/companion-module-h2r-graphics)).

Nobody else surveyed ships it, which is why it is a backlog item and not a gap in what shipped.
Two products out of ten with a timer is not a default; it is a good idea two products had.

## Why it was NOT shipped with the countdown behaviour

Because both cheap versions are wrong, and the right one needs a mechanism that does not exist.

1. **An `adjust` on the minutes field does not add a minute to what is LEFT.** `clockDataUpdated()`
   re-arms a running count to the whole new length (`src/templates/shared/clock.ts`, and the owner
   walk of 2026-08-29 that made it do so). So "+1 min" pressed on a clock reading 0:20 of 5:00
   would put 6:00 on air, not 1:20. That is not a correction, it is a restart wearing a plus sign.
2. **Shifting `clockDeadline` in the runtime instead** would air a count the operator's own minutes
   box no longer describes, so the next ✎ Update would push the old length straight back. That is
   exactly the drift `MachineControl.set` was added to prevent on the score board
   (`src/templates/importedDesign/scoreBehaviour.ts`).

## What it would take

A clock whose REMAINING time is addressable, rather than only its total length. Concretely: a
second value the runtime derives from and an event that can move it, so the field the operator
reads and the count on air stay one fact. Whether that is a second hidden field ("time already
run"), or `set`/`adjust` learning to speak to the runtime rather than to a field, is the design
question - and it is the same question `docs/CONTROL_PANEL_RESEARCH.md` row 7 already parks under
"a timer arrow whose duration comes from a field".

## Evidence

`docs/BEHAVIOUR_SURVEY.md` (per-product verbs, and the frequency table where a timer ranks
second). The reasoning above is stated in full in the `timerControls` comment in
`src/templates/importedDesign/timerBehaviour.ts`, which is where somebody looking for the missing
button will land.
