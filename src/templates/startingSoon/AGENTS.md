# src/templates/startingSoon - the holding screens

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## startingSoon/ - the holding screens

ss01…ss20, the HOLDING SCREEN set (prefix 'starting-soon'; hold-loop preset:
entrance + calm .starting-soon-pulse breathing + clock via shared/clock.ts). DATA BLOCKS via
convertToDataRegion (self-assembled, calls it directly): the breath imports as a looping scale
track (gap 6) and startClock/stopClock ride the step calls (docs/TIMELINE_V2_PLAN.md §3b); the clock runtime stays
outside the region.
**The category is every screen shown while the show is NOT happening** - before it starts,
between its parts, when it breaks, after it ends. A design declares three things and the
assembler does the rest: `lineCount` (how many #fN spans its markup carries, default 2),
`clock` (`minutes` | `start-time` | `none`), and any `extraFields`. The clock fields land AFTER
the lines, so a 2-line minutes design is f0/f1/f2 exactly as before and every existing variant
emits byte-identically.
**`clock: 'none'` is a design decision, not a gap.** A technical pause cannot promise a time
and a sign-off card is not waiting for anything, so those screens emit no clock fields, no
clock element and no clock runtime, and ship on the `hold-still` preset (the hold loop with the
countdown calls removed). Swapping a clock preset onto one after creation degrades to "no
countdown" rather than throwing: the interpreter resolves a step's `calls` by NAME and treats a
missing function as a no-op.
