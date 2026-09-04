---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
---
# The Style step's typeface search, upload and installed roads ignore "Apply to"

**Filed:** 2026-09-05. **Source:** the dead-control sweep (`offer-nothing-that-cannot-work.md`),
measured live on the House Strap lower third.

## Why

The Style step's typeface panel has two halves: a role picker ("Apply to: All Text / Heading /
Label") and a face picker. Choosing a role and then picking a face **from the list** now writes
that role only - that half was repaired on 2026-09-05. Choosing a role and then reaching for
**🔎 Find a typeface**, **⬆ Upload** or **💻 Installed** still changes every face in the graphic:
those three roads call `onCustomFont`, and `StyleStep`'s handler is
`(customFont) => onDraft({ customFont, fontId: 'custom' })`, which is the ALL-TEXT write.

Measured: with Apply to set to Label, searching Montserrat set `--font-heading` AND `--font-label`
to Montserrat. Nothing on screen says the role was ignored.

A control that does the wrong thing is worse than one that does nothing, and this is the same
panel the owner already caught once ("nothing happens in the graphic. That's a bug."). It reads
as ours-not-listening rather than as a missing feature.

## What it would take

1. `handleCustomFont` has to branch on the role the way `handleFontPick` does: for a role, write
   `cssVarOverrides[role]` rather than `fontId`.
2. **The bytes are the hard half.** For a face from our own list, `draft.ts` embeds it via
   `ensureFontFace(css, fontByStack(value))` - it resolves the family from the FONTS registry by
   its stack. A Google-fetched, uploaded, or locally installed face is not in that registry, so a
   per-role override pointing at one would emit a `font-family` with no `@font-face` behind it:
   the preview looks right on this machine and playout falls back silently. The custom font's
   asset has to travel with the override, which is why this was filed rather than fixed in the
   same pass.
3. Whichever way it goes, the role picker and the face picker must not be able to disagree again -
   one function deciding where a picked face is written, both roads calling it.

## Evidence

`src/components/wizard/steps/StyleStep.tsx` (`handleFontPick` vs the `onCustomFont` prop),
`src/components/wizard/FontPicker.tsx` line ~174 (the search road's `onCustomFont`), and
`src/components/wizard/draft.ts` `buildDraftTemplate` (the `ensureFontFace` call on each
override). The role-key repair that made this visible is commit "Make the Style step's per-role
typeface pick reach the graphic".
