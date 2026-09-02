---
kind: walk
date: 2026-08-29
---
# The bundled-font licence now travels inside `fonts/`

**Date:** 2026-08-29. **Branch:** `claude/n-ograf-checker-pass`.

## What changed

Every FOLDER package (SPX starter, OGraf, LiveOS) used to write the OFL notice as
`FONT_LICENSES.md` at the package root. It is now `fonts/FONT_LICENSES.md`, beside the font
files it covers. Nothing else about the packages moved, and the single-file targets (CasparCG,
OBS/vMix, H2R) are untouched - they carry the licence as a header comment, as before.

Two reasons, and the first is the real one: OFL 1.1 §2 binds the licence to the redistributed
font software, so it should survive somebody lifting `fonts/` into another project. The second is
that the ograf.dev package checker's two font-licence rules both look for a licence path *under*
`fonts/` and cannot see a root file at all - so our packages were being read as an unlicensed
font drop while carrying a perfectly good notice one directory up.

## The route (under a minute)

1. `npm run dev`, open `/ograf`.
2. Press **⬇ OGraf package** on any card - say **Hairline**.
3. Open the downloaded `hairline-ograf.zip`.

**Look at:** inside `hairline/`, there is no longer a `FONT_LICENSES.md` at the top level; it is
at `hairline/fonts/FONT_LICENSES.md`, next to `inter.woff2`. Open it - it should be the full SIL
OFL 1.1 text plus the per-font copyright lines, unchanged.

The same is true of an SPX export from the studio (**Export…** → the SPX target), which is the
wider blast radius worth a glance.

## Why you might disagree

Someone opening a package looks at the root first, and the licence is now one click further in.
The judgement was that the licence belongs with the bytes it licenses rather than where it is
most visible. If you would rather it sat in both places, that is a one-line change.
