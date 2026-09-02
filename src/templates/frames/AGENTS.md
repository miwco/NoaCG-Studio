# src/templates/frames - chrome around a HOLE

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-09-02, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## frames/ - chrome around a HOLE

**frames/** - fr01…fr15 (prefix 'frame', type 'frame', SELF-ASSEMBLED like infographics: the
DESIGN owns its fields, because a frame's field count follows its camera count - 2 lines for
one camera, 4 for a two-up) + framePresets.ts (frame-draw / frame-fade / frame-slide). The one
category that is not a panel of words: it is chrome around a HOLE, so `.frame-window`
interiors stay transparent, the stage is `pointer-events: none`, and every design states its
window rectangles in 1080p design px in its own header (that geometry IS the contract with the
switcher). A split design repeats `.frame-window` / `.frame-plate` so ONE preset drives one
camera or four - the trade is that a repeated class is not a unique selector, so an individual
window is not a registry part (root, stage and every text line are).
