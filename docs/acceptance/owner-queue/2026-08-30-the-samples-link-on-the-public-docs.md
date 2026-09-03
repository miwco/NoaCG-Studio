---
kind: walk-p
date: 2026-08-30
done: true
---
> **Settled 2026-09-03 without him.** The question was whether a README with a line per sample beats
> a bare GitHub directory listing for a student landing there. It does, and it is not close: a
> directory listing shows filenames and byte counts and teaches nothing about which file to open
> first. The README stays.

# The public docs now point at the practice library, not a folder listing

**Date:** 2026-08-30 · **Branch:** `claude/aa-svg-samples-followups`

## The route, under a minute

`/docs` -> **Import your own SVG graphic** in the left rail -> scroll to just below the
"Export settings, app by app" table.

## What to look at

The paragraph under that table. It used to say "Five files to try" and link the GitHub directory
listing for `docs/svg-samples`. It now says twenty-three and links the folder's `README.md`, which
carries a line per sample saying what each one teaches. Click the link and see whether that page is
what you would want a student to land on, or whether the directory listing was actually better.

The same pointer changed in `docs/SVG_AUTHORING.md`, which is the page a designer is handed.

## Also worth a glance

`docs/svg-samples/scorebug.svg` opened in any browser: the home crest slot used to paint a
half-opaque red square over the "HJK" glyph, because the 1x1 PNG this repo called transparent was
not. It is transparent now, in that file and in seven others.
