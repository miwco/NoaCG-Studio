# 2026-09-04 - row C: the agent looks at the graphic and judges it

Branch `claude/c-graphic-taste-review`, cut from `332e8b56`. The brief was the owner's 2026-09-03
diagnosis ("if you just look at it yourself, you would notice how it should look") and his
2026-08-28 ask for a very small screenshot-based graphic-taste review. Both are answered, and the
deliverable is the trigger, not the document.

## What shipped

- **`docs/VISUAL_TASTE_REVIEW.md`** - the instrument. Five axes (hierarchy, composition,
  restraint, coherence, on-air quality) and four text questions (centred on both axes, inside its
  box at the longest string, aligned to the graphic rather than the frame, growing the way the
  design implies), each one question with a failing example drawn from a verdict he gave, each
  answered YES or NO off a rendered frame. It carries its own calibration evidence, so no handoff
  has to.
- **`scripts/taste-frame-review.mjs`** - the rendering half. `--only <ids>` or `--affected`;
  writes `hold`, `long`, `step-N` and `long-step-N` frames per design into `./shots-taste/<id>/`
  through the same settle-and-raster recipe as `cli/src/screenshot.ts`, on the grey bed his blind
  frames were shot on. It asserts nothing. Browser work, in `SWEEP_SCRIPTS` and
  `DEV_SERVER_DEPENDENT_SCRIPTS`, queued like a sweep.
- **The trigger, in `/check` phase 4** (`.agent-workflows/check.md`). A change that moves what a
  graphic looks like renders it, looks, and answers the doc in the report as `taste: answered` or
  `taste: not applicable`. `docs/VERIFICATION.md` carries a pointer; the doc owns the questions.
  Why there and not a hook, a gate or a nightly is argued in the doc.
- `scripts/catalog-affected.mjs`'s `planForWorkingTree` takes an optional `index`, so a script
  that already has the catalog open does not launch a second Chromium to list ids.

## Calibration - does it reach his verdict?

Both tables are in the doc. The short of it: on the sixteen frames he judged blind on 2026-08-18,
every AIR frame is all YES, every FAIL has a NO on the question that names his reason, and the
three TWEAKS are single NOs outside the two that mean "does not ship". On today's catalog it passes
`lt27`, `gt05`, `qz01`, `sb21`, `lt33`, `lt51`, and passes `tk01`, `ig01`, `sb01` whose faults he
named have since been fixed (or, for `tk01`, were the harness's palette rather than the design's).
It **fails `card80`** at long values - the byline is cut mid-name at the panel's padding edge with
no ellipsis, the rest painted outside and hidden - and names a padding collapse on `ls09` the
containment gate cannot see.

Honestly stated in the doc as well: his notes were read before the frames, so the sixteen-frame
table is not a blind re-judgement. It tests whether a question names his fault and whether any
fires on a frame he would air, which is the property the instrument needs.

## The lesson, and it is worth more than the script

The instrument built to catch what source-level checks miss had **six independent false-pass paths
of its own** when it went into `/check`, found by its eight review legs: swallowed exceptions in
`page.evaluate` that made `long.png` a picture of the defaults; exit 0 on a mistyped `--only` id;
a half-implemented raster recipe that made its frames incomparable to the calibration set; the
imported-design placeholder rendering an empty frame behind a branch that could never fire;
`next()`'s return value ignored, so a refused step shipped a duplicate labelled as a new step; and
T4 answered off step frames that only ever carried the default strings. All six are closed in the
landed script. Two of them would only have been caught by looking at the script's own output the
way the instrument asks a session to look at a graphic.

## What is not done, filed

`docs/backlog/taste-review-shared-rig.md`: the import-road flag `catalog-affected` does not have
(so `--affected` cannot name an imported design and points at `svg-import-sweep --shots`), the
three-copy raster recipe, the third iframe rig, the sixth long-text recipe, and the two guard lists
a browser script has to join separately. Also unrendered by any script: the owner's quiz board at
a LONG question through the real door. A hand-built import door was written and then removed
because it resolved no bundled font and skipped the wizard's fit-to-stage, so its frame was of a
graphic no student sees.

## /check

`review: inline` (the code-review skill returned a promise of a notification, so the diff was
reviewed here); `simplify: delegated` (its result reached this session by relay, was scoped to
this branch's one script, and every finding was verified against the code before acting).
Verify: `npm run build` green, stamped `claude/c-graphic-taste-review`; `command-match` and
`catalog-affected` node tests green; the script exercised through the queue on `qz01`, `card80`,
`lt27` and on `--affected` (which refused this branch's own shared-machinery diff, as designed).
No product code changed, so no e2e plan. `taste: answered` - the two calibration tables above.

## For the owner

Nothing to walk in the product. The one thing only he can settle is whether the nine questions
are the ones he would ask; the doc is written so he can strike or reword any of them, and its
"Changing it" section says how a change is tested.
