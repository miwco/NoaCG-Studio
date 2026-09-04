# Row H - dropping several pictures at once

**Branch:** `claude/h-drop-several-files`
**Backlog answered:** `docs/backlog/dropping-several-files-at-once.md` (owner, 2026-09-03)
**Owner-queue item:** `docs/acceptance/owner-queue/2026-09-05-dropping-several-pictures-says-what-it-took.md`

## What was broken, measured

The owner dropped several pictures on the Import graphic step and got one, silently. Reproduced in
the browser on this branch before touching anything:

- Five PNGs dropped at once imported `board-a.png`. The step then read as a complete success:
  "Your design / board-a.png / Frame-sized". Nothing anywhere mentioned the other four.
- A second, worse case the backlog had not considered: `take()` picks by TIER, not by drop order.
  Dropping `the-one-i-want.png` first and `artwork.svg` second imports the SVG. The pick is
  correct and the silence made it look random.
- The file input has no `multiple`, so several files can only ever arrive by drag. That is left
  alone: offering multi-select in the picker would promise a batch import that does not exist.

## The decision, and why

**Keep importing one, never in silence. Name what was used, name what was not, say the others can
come in one at a time.** The three shapes the backlog argued, judged:

- *Import them as separate graphics* was rejected as out of scope for a drop zone, not as a bad
  idea. The wizard walk from Start to Finish produces exactly one project and asks single-artwork
  questions the whole way: one project format, one erase pass, one field placement, one motion
  choice. Fanning out to five means five walks or a batch mode that answers none of those
  questions. That is a change to what the wizard IS. The owner-queue item puts it to him as a real
  option rather than burying it.
- *Refuse the drop* was rejected because it throws away work the user already did, and turns the
  commonest accident - grabbing a folder's worth of files - into a dead end. The intent for at
  least one of those files is unambiguous.
- *Say what happened* is what shipped, with one addition beyond the backlog's floor: when the tier
  order actually overruled the drop order, the notice says WHY that file won. That is the case a
  user cannot work out alone, and it is the case reproduction turned up.

Copy, verbatim:

> Used artwork.svg. Not used: the-one-i-want.png. The SVG was used because it is the better
> import: its text layers become fields. One graphic is built from one design. Bring the others in
> one at a time - each becomes its own graphic.

The reason clause is deliberately narrow. Four pictures and a readme get no reason, because no
picture outranked another and "the image was used because it is a design file" would imply the
other pictures were not images. The raster tier therefore has no reason string at all: it is
reached only when the drop held no template and no SVG.

## Delegation: Codex gpt-5.6-sol, effort high

Spec written before delegating - decided behaviour, eight numbered acceptance conditions, the two
files it could change, the five it could not, and the house style. Job `task-mtngfbuz-g4pyuj`,
about nine minutes wall.

**It came back nearly right, and the one substantive repair was my spec's fault, not the worker's.**
It built the whole feature on the first pass: the state, the tier handling, clearing on all three
clear buttons, no forbidden file touched, build green, and a working e2e test using the synthetic
DataTransfer drop.

The defect: I defined a mixed-kind drop as "the used file's kind is not the only kind present",
which by my own wording counts an unsupported `.txt` as a competing kind. So four pictures plus a
readme produced "The image was used because it is a design file NoaCG can import." Codex followed
my sentence exactly. The repair narrows the check to usable kinds only and deletes the now-dead
raster reason. Second, cosmetic: the new test sat between two helper functions rather than after
them - moved, and extended to cover the mixed-kind case and a `not.toContainText('because')`
assertion that guards the narrow reason rule.

Recorded with `scripts/delegation-outcome.mjs` as `repaired` / cause `prompt`. The lesson for the
next spec is small and concrete: when a rule turns on "kinds", enumerate which kinds count.

## What `/check` found, after all that

`review: delegated` · `simplify: inline` · `verify: inline` · `taste: not applicable`

The review leg came back with five findings on the right branch and the right files. Three were
fixed, two reported.

**Fixed, and the medium one mattered.** `importedFileError` is `CreationWizard`'s state, and it is
cleared only by a template drop, the template card's ✕, the entry card and a walk reopen - never
by `onArt` or `onSvg`. A rejected `.zip` therefore leaves an error on screen with no card and so
no button to clear it. Gating the notice on `fileError` reintroduced the exact bug the notice
exists to close: drop a malformed zip, then five pictures, and one imports with the other four
unmentioned. Two gestures. The guard now stands aside only for an error about the notice's OWN
file, which is the case it was meant for - a template that failed to parse must not be reported as
used. Verified both ways in the browser: the zip-then-pictures sequence now shows the notice, and
a `[broken.zip, good.png]` drop still suppresses it.

Also fixed: unreadable files inherited the closing promise, so `[design.png, notes.txt]` invited
the user to bring `notes.txt` back in as its own graphic - a retry that errors out. The skipped
files are now split, and unreadable ones are named without the invitation. And my own comment plus
the owner-queue item claimed the reason appears when the tier order "overruled the drop order",
which the code never inspects; both now say what is true, that more than one kind of usable file
was in the drop.

**Reported, not fixed.** The stale `importedFileError` is a real pre-existing bug that outlives
this change, so it is filed as `docs/backlog/a-rejected-template-file-leaves-an-error-nobody-can-
clear.md` with the fix written out, rather than reaching into a 1900-line shared component
mid-wave. The other: `take`'s error paths still say nothing about the other dropped files, and
`onTemplateFile` can leave a stale design card beside a template card. Both predate this change.

The simplify skill returned fan-out instructions rather than results, so that leg ran inline over
its four angles. Reuse: no shared list or plural helper exists, and the inline form matches the
file. Simplification and efficiency: `multiDropMessage` classified the same files three times;
that is now one pass filling both name lists and the usable-kind set. Altitude: the notice guard
is a local workaround for parent state, which is what the backlog file above is for.

## Files

- `src/components/wizard/steps/ImportDesignStep.tsx` - `importFileKind`, `multiDropMessage`, the
  `multiDropNotice` state, and clearing it in the three clear buttons.
- `e2e/import-graphic.spec.ts` - one test, `dropFiles` helper. No mapping edit needed:
  `scripts/e2e-affected.mjs` already maps `src/components/wizard/` to `import-graphic.spec.ts`.
- No CSS touched: the notice reuses `status-warn`, which renders brand amber (rgb(246,166,35)).

## Verification

`npm run build` green three times: on the change, after taking `main` in the first time (row L),
and after taking it in again (rows C and B). Branch stamp confirmed `claude/h-drop-several-files`
on each, never `main`.

**Verified by driving the browser myself, not by reading Codex's report.** Every acceptance
condition re-derived from scratch against the running app:

| case | result |
| --- | --- |
| five PNGs | `board-a.png` imported; notice names the other four; no reason clause |
| PNG first + SVG second | SVG imported; notice names the PNG and says why the SVG won |
| PNG + `.html` template | template imported; notice says why the template won |
| four PNGs + `readme.txt` | notice names the skipped files, **no** reason clause (the repair) |
| one file | no notice at all |
| two `.txt` files | existing error line only, no notice |
| clear the design | notice goes |
| rejected `.zip`, then five PNGs | notice appears (the review's medium finding) |
| `[broken.zip, good.png]` | notice suppressed - it would have claimed the zip was used |
| `[design.png, notes.txt]` | `notes.txt` named as unreadable, no invitation to retry it |

**e2e: the local slot never came free.** Three attempts at
`npm run test:e2e:integration:queued` sat behind other sessions' browser jobs all evening (one
16-minute run in the main checkout, then a 114-spec run in another worktree), and killing a queued
run twice left a Vite server squatting port 5254 that had to be identified and closed by hand
before the next attempt. So the e2e verdict comes from CI instead, which does strictly more on a
clean checkout: `gh workflow run ci.yml` on this sha, the full suite across nine shards rather
than an affected plan. The push-triggered run was cancelled by that dispatch, which is the trap
the root `AGENTS.md` names - the jobs list is what says which suite actually ran, and it was read.

CI ran on `43c9d60b`, which is the last commit that changes any behaviour. Everything after it is
this handoff and one comment reworded in the spec. The queue builds and gates the merged tree
before landing, so the final combined state is gated there rather than assumed from this run.

## Not done, deliberately

- Batch import as several graphics - put to the owner in the owner-queue item.
- `multiple` on the file input - see above.
- A "which one did you mean?" chooser. Cheap to build since the File objects are in hand, but it
  adds a UI surface to a step its own contract says is at its clutter ceiling, and re-dragging one
  file is trivial once you can see which one won.
