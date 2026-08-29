# Handoff - IBC / OGraf listing readiness

Session FF of the 2026-08-29 day wave. Branch `claude/ff-ibc-readiness`, three commits, build
green, queued for landing.

## The question this answered

"Check that we have everything ready for us to list there today. What do we need?"

## The answer, which is not what anyone expected

**There is no official EBU vendor list.** `ograf.ebu.io` is GitHub Pages served from the README of
`github.com/ebu/ograf`. Its entire navigation is Project status, Version History, Introduction,
Getting Started, Tools. No vendors page, no ecosystem page, no adopters page. The repository has no
CONTRIBUTING file, no issue template and no PR template, so there is no documented way to ask to be
added to anything. The only listing surface there is a "Tools" section holding two SuperFly.tv
entries, with no precedent for a product being added to it.

**The list broadcasters actually browse is [ograf.dev](https://ograf.dev/ecosystem)** - an
independent community hub run by a participant in the spec work (two open specification PRs in the
EBU repo). It carries 30 products across 10 categories, it has a written CONTRIBUTING process, and
the submission is a pull request editing one JSON file
(`apps/dev/src/content/ecosystem.json` in `ficosta/ograf`).

**NoaCG is not on it.** Verified directly against the live data file: the string "noacg" does not
appear. The Editors category already holds Loopic, DJ HTML Creator, Eyevinn's ograf-editor,
Ferryman, everviz, StreamShapers and After Effects. Renderers holds CasparCG, BBright, Pixotope and
Grass Valley AMPP.

**EBU membership is not required** for anything relevant - the README says the general industry is
invited to the HTML Graphics Working Group. Contact is published: sunna@ebu.ch.

**There is a time-critical IBC opportunity.** The EBU runs five-minute open-source pitches on its
stand (10.D21) on 12 September, sign-up at `https://forms.office.com/e/ZRGvwnpgG5`, no published
deadline. Separately, Niels Borg (TV 2 Denmark, WG chair, ran a national election on OGraf) and
Paola Sunna speak on OGraf on 12 September, 16:10-16:50, room E102.

## What was built

**`scripts/check-ograf-schema.mjs`** - the ajv harness from `docs/OGRAF.md`, which had been written
by hand and thrown away twice. It now runs weekly (`weekly-audit.yml`) and in
`npm run check:freshness`, never in the build gate, because it fetches ograf.ebu.io.

It reports three things: **drift** (sha256 per published file against
`scripts/ograf-schema-baseline.json`, the bytes `ografSchema.ts` was transcribed from, the files
DISCOVERED by following `$ref` rather than hard-coded); **corpus** (every `*.ograf.json` in the
repo through ajv draft 2020-12 against the published files, plus `--from <dir>`); and **agreement**
(corpus and an eight-mutation battery through both validators, reporting any disagreement).

The duplicate-`customActions`-id case is encoded as an *expected* disagreement: JSON Schema cannot
express uniqueness across a keyed array, so the published files structurally cannot catch it, ours
does, and the report goes red if ours ever stops. That is the conformance argument worth making in
public - we are stricter than the standard's own files exactly where being lax breaks somebody's
on-air graphic.

**`docs/IBC_LISTING_CHECKLIST.md`** - written for a non-technical reader. Where the list is, the
exact JSON and justification text to paste, the four owner steps in order with time estimates
(about 45 minutes total), a table of every claim with the proof beside it, and the answers to the
awkward questions.

## Verified today

- `npm run check:ograf-schema`: seven schema files fetched, corpus clean, all eight mutations
  behaving exactly as the 2026-08-26 hand round recorded them, no disagreements.
- 15 OGraf e2e tests pass (`ograf-conformance` 8, `ograf-contract` 4, `ograf-starters` 3) - the
  `/ograf` starters still build and validate.
- `npm run build` green on `claude/ff-ibc-readiness`.

## Not verified

No NoaCG package has been through **ograf.dev's own 82-rule package checker** (`ograf.dev/tools`,
in-browser, with a runtime sandbox). That is the only route where a third party judges our
conformance rather than us, it takes about ten minutes, and it is the optional step at the end of
the checklist. Worth doing before anyone at IBC asks.

Nothing was submitted, and no email was sent. That is section 4 of the checklist and it is the
owner's to do.

## The check verdict

`/check` ran. The code-review skill forked into the main checkout rather than this worktree and
reviewed an unrelated commit on `main` - its six findings are about
`.agent-workflows/orchestrator.md` and have nothing to do with this branch. **That is a real bug in
the workflow worth someone's attention: a review that silently reviews the wrong tree is the same
shape of fault as the green-gate-on-the-wrong-tree incident in the root `AGENTS.md`.**

The branch was then reviewed directly. One confirmed defect, fixed in `44b737b3`: an empty corpus
made every mutation report a phantom disagreement, because `every` over an empty set is true and
both reject flags fell to false. The battery is now skipped with the reason printed. The simplify
pass removed a now-unused import and stopped the corpus walk following symlinks.

## Next

Nothing left on this branch. The owner-queue item
(`docs/acceptance/owner-queue/2026-08-29-ibc-ograf-listing.md`) is the continuation, and it is the
owner's own hour.

One thing a later session could pick up: the checklist's claim table rests on the corpus being one
committed fixture manifest plus CI's 1470 exporter manifests through our transcription. Feeding a
real exported package into `check-ograf-schema --from` on every CI run would close that seam
without a browser, if somebody wants the chain to be one instrument instead of two.
