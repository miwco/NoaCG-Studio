# src/templates/lowerThirds - the lower thirds and the specialist pack

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## lowerThirds/ - the straps

### specialist/ - ls01…ls41

ls01…ls41, the SPECIALIST pack: lower thirds drawn for ONE
production rather than for any show (interview duos, host-and-guest, commentary booths,
athletes, esports, worship, academic, politics, analysis, music, live-and-location, creator,
and the BROADCAST-JOURNALISM group ls33-ls40, whose subject is the words or their status
rather than the person: a quotation, an interpreted line with a language tag per line, a
caller on the line, a location slate with a computed hour, breaking and developing marks, a
fact-check ruling, and the parliamentary register).
Mechanically ordinary - same category, assembler, preset bank, export path - and they carry NO
discovery metadata of their own: browse/search facets come from the ONE taxonomy
(model/taxonomy.ts + templates/templateMeta.ts), so a design is declared there like any other.
`specialist/shared.ts` holds what the pack cannot repeat per file:
- `slot`/`slots`/`hasLine` - place a line BY INDEX into a named slot. An absent line emits
  NOTHING (the operator can delete any row, not just the last), so a design closes over the
  gap instead of reserving a hole. This is what makes the pack survive missing optional roles.
- **The two-person contract.** `duoSplitBalanced` for PEERS (the interview straps: fewer
  lines drop the ROLES first, so both people stay named - "two names, no titles" is a real
  broadcast format) and `duoSplitLed` for a LEAD + SUPPORT pair (host-and-guest: the lead is
  completed BEFORE the second person appears, so dropping to two lines never re-reads the
  guest's own role as the host's name). Picking the wrong one is a silent content bug, not a
  layout one. `duoGridCss` writes the structural half once: content-sized `auto` columns
  (a symmetric grid pads a short name out to a long one's width), `min-width: 0` on each
  column (a grid item refuses to shrink by default - that is what pushes long names off the
  safe area), a per-column cap so an extreme value wraps in its OWN column, and
  `align-items: start`. Browser-verified with a 55-character name beside a two-character one.
- `liveClockJs` / `zoneClockJs` - design-owned clock runtime (emitted OUTSIDE the marked
  region via `runtimeExtraJs`, DOM-ready guarded, the corner-bug doctrine). The zone clock
  reads a UTC offset from a HIDDEN input-only field on every tick, so one template is any
  city's clock.
**THE ACCENT RULE this pack pinned:** a design declaring `hasAccent: true` must emit its
`.lower-third-accent` node UNCONDITIONALLY. The animation data keyframes it by selector, so an
accent that comes and goes with a field leaves the timeline addressing an element that is not
there - `validateTemplate`'s `anim-data-target` warning catches it, and it caught six designs
here. Make the CONTENT conditional, never the node.
**AND THE CLIP RULE:** bounding an atomic token cell (a squad number, a party tag) needs the
bound on the SPAN - `max-width` + `white-space: nowrap` + `text-overflow: ellipsis`.
`overflow: hidden` on the WRAPPER clips the PAINT but not the layout box, and the runtime
bench measures layout - so the token still collided with the name beside it.
### The shared bank - lt01…lt62

lt01…lt62 on shared.ts (prefix 'lower-third', `dataRegion: true` - the
first category to create as NOACG_ANIM data blocks) + animPresets.ts (the shared marked-region
GSAP preset bank, prefix-parameterized - it animates any category's `.{prefix}-box` structure;
on a data category the preset's emit is converted at create, and blocks/presetApply.ts derives
keyframes from the same emitters after). The bank leads with the **Slide family**
(`makeSlidePreset`: slide-up/-down/-left/-right - one choreography, four directions of travel,
ids adjacent + `SLIDE_FAMILY`/`isSlidePreset` so pickers group them: the wizard renders ONE
Slide card with a direction picker, the Inspector one optgroup), then line-reveal, mask-wipe,
pop-spring, snap-stinger, blur-in, fade, flip-3d.
