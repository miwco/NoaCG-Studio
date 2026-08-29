# The app's stylesheet was split into 30 files - nothing should look different

**Date:** 2026-08-28 · **Branch:** `claude/styles-css-modules-6ad51b`

## What changed

Every visual rule in the app lived in one 7,841-line file, `src/styles.css`. It was the file
every UI branch had to touch - 137 commits in a month, more than anything else in the repo - so
sessions working on completely unrelated surfaces kept queueing behind each other on it.

It is now 30 files under `src/styles/`, one per surface: the wizard, the editor, the timeline,
Home, the playout dashboard, and so on. Not one rule was rewritten, renamed or reordered. The
files are exact slices of the old one, loaded in exactly the order they used to sit in.

**The whole point of this walk is that you notice nothing.** The stylesheet the browser actually
receives is identical, byte for byte - the built file even keeps the same content hash it had
before the split. If something looks off, that is a real finding and worth saying, because no
gate should have let it through.

## The route, in under a minute

1. Open **/app** and look at **Home** - the left nav, the production cards, Recent graphics.
2. **+ New graphic**, then **Start from a template**: the entry cards, then the Browse gallery
   with its step rail down the left.
3. Pick any design, **Skip to finish**, then **Add to the production** - the **playout
   dashboard** with its Preview and Program frames and the red TAKE.
4. From the graphic's control page, **Edit graphic** - the editor, its canvas, the timeline dock
   and the Inspector.

## What to look at

- **Spacing and alignment** on each of those four surfaces: nothing shifted by a pixel, nothing
  wrapped that used to fit, no button that used to sit right now sitting left.
- **The amber accent** everywhere it belongs - the on-air dot, the primary buttons, links.
- **The dark ground** on every surface, and the transparent chequerboard behind the editor's
  canvas. A white flash or a light panel anywhere is the failure mode worth reporting.
- **Anything that draws on top of something else** - dialogs, the account menu, the library menu,
  the timeline dock over the canvas. Order-sensitive rules are the one thing a split like this
  could get wrong, and stacking is where it would show.

## Also worth a glance

Resize the window narrow enough to cross into the mobile layout (under 768px) and back. That
layout is one of the 30 files and it has to keep winning over the desktop rules that come before
it.
