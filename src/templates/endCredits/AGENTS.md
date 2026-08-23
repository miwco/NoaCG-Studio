# src/templates/endCredits - the credit rolls and name lists

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## endCredits/ - the LIST category

cr01…cr12 (prefix 'credits') + creditsPresets.ts (credits-roll /
credits-loop / credits-board / credits-pages / credits-crawl) + **creditsMotion.ts**;
data-driven: a hidden #f0 textarea holds "Role | Name" lines, template JS parses and rebuilds
#credits-track, ends with logo + year (.credits-end). DATA BLOCKS via convertToDataRegion.
**The category is LISTS, not just credits** - the same data model at a different speed is a
credit roll, a name wall, a donor board, a sponsor acknowledgement, a graduation roll or a
schedule. Choosing a design is choosing that speed, which is what the index groups by.
**Three line kinds, one rule each** (parseCredits): `Role | Name` is a credit; a pipe-less line
that OPENS a section is that section's heading; any other pipe-less line is a plain `entry`
(a name on a wall, a thank-you, an untimed note). The heading rule is POSITIONAL on purpose -
a wall is one heading followed by names, a roll's sections already open with theirs, so both
read correctly from the same text with nothing to mark up. **A row builder must answer all
three kinds**; a design that only handles 'heading' and 'credit' renders `undefined` for a
bare name.
`credits-board` is the one format with NO motion: the list fades up and holds. It exists
because rolling a schedule or a wall past the audience means the line they need is the one
that just left, and it is the reason a board design lays `.credits-page` out in normal flow
where a paged design stacks them absolutely.
`credits-loop` is the seamless repeat, for the long tail after a show. `creditsLoop()` wraps
the track's content in one `.credits-loop-run`, appends as many `.credits-loop-clone` copies as
the viewport needs, and travels exactly one run's height - a bare `repeat: -1` would snap the
list back to the top, which everyone watching a wall of names is watching closely enough to see.
