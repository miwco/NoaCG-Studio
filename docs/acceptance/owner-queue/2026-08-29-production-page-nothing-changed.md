---
kind: walk
date: 2026-08-29
---
# The playout dashboard, after the first split: nothing changed

**The deliverable is that nothing visibly changed.** `ProductionPage.tsx` went from 2,968 lines to
2,541 by moving three read-only pieces into their own files. If you can tell the difference by
looking at the surface, something is wrong.

Route, under a minute: `/app` -> Productions -> open any production with a graphic in it.

What to look at:

1. **The rundown, the monitors and the verb bar.** Select a cue, press SPACE. It goes on air on its
   layer; press SPACE again and it comes off. Take airs what is on PREVIEW, exactly as before -
   this is the behaviour the whole split was arranged around, and none of the state that decides it
   was touched.
2. **Activity.** The collapsed strip under the surface. Its summary should show the newest entry
   with its time; open it and every Take, Update, Next and Out is listed, newest first. This block
   now lives in its own file - it is the piece most likely to look subtly different and does not.
3. **Links.** Publish a production (or open one that already is) and open Links. The six rows -
   Output URL, CasparCG, Template file, Control page, Audience link, Readable name, Presenter link
   - each with its small ▸ explanation, and Publish changes / Unpublish at the foot. The whole
   panel is a new file; the popover should open downward, cap its height and scroll, as before.
4. **The too-long line.** Type a very long value into a text field in the cue editor. The amber
   "⚠ … is too long for the design — shorten it" line appears beside the unsent note in the
   editor's head, and the field itself is marked. Then take that cue and edit the ON-AIR cue: the
   warning should now be PROGRAM's answer, not PREVIEW's.

What I did not do, and why it is worth your eye:

- **The remaining phases are written, not run** - `docs/backlog/production-page-phases.md`. The
  rundown, the monitors, the publish handlers, the graphic actions and the cue editor are each a
  session of their own, in that order, with the cue draft last. They move state that decides what
  Take airs, so they are daylight work rather than night work.
- **One surprise, recorded rather than pushed through.** The links panel looks self-contained, but
  `unpublish` clears `liveCue` - the map Take reads. So its markup moved and its state did not.
  Phase 3 exists only because of that, and it wants a spec written first: nothing today proves that
  unpublishing a live production clears the on-air marker.
