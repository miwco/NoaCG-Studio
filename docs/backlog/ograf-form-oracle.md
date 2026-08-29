# ograf-form as a GDD oracle - cross-check our derived controls against the reference

**Filed:** 2026-08-29. **Source:** the OGraf ecosystem research round (`docs/OGRAF_ECOSYSTEM.md`
§1b).

## Why

`ograf-form` (MIT, npm 1.0.0, zero-dependency Web Component,
<https://github.com/SuperFlyTV/ograf-form>) is the reference GDD-to-controls mapping - what the
reference controller itself embeds. We deliberately do NOT embed it (two form systems in one
product); its value is as an **oracle**: render the same GDD schema through it and through
`src/control/ografContract.ts`, compare what each offers the operator, and catch our GDD
misreadings mechanically. This keeps the GOALS-ladder GDD alignment work (emit standard
`gddType`, read it first on import) honest against the implementation operators will actually
meet elsewhere, instead of against our own reading of the spec - the same non-circularity rule
the interop suite applies to renderers.

## What it would take

A small test harness (node + jsdom or the bench browser) that mounts
`<superflytv-ograf-form>` with each fixture schema from the GDD coverage table, snapshots the
control kinds it renders, and diffs against `ografContract`'s descriptor kinds; expected
divergences (e.g. its array-of-objects table vs our `notes` listing) recorded as known rows, so
the test goes red only on NEW disagreement. Rides the GDD-alignment branch or lands just after
it.

## Evidence

`docs/OGRAF_ECOSYSTEM.md` §1b (coverage, gaps, the table asymmetry);
`docs/OGRAF_FIRST_REVIEW.md` §5 item 1 (the `v_noacg.kind` misreading that motivates an
external check).
