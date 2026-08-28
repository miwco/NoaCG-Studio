---
kind: walk
date: 2026-08-28
---
# The catalog's near-duplicates, ranked - your call on what goes

You asked: "go through and see if we have two similar graphics, and then remove duplicates."
Done for lower thirds (six retired, same branch). The rest of the catalog is measured and
ranked here - removals outside lower-third are your morning call, not mine.

The instrument: `node scripts/card-pair-sweep.mjs all` renders every design as a card and
ranks every same-category pair by how alike the pixels are (0 = identical). Route to any pair:
Create -> Browse -> search the design's name; the two cards sit side by side in a minute.

**The pairs fall in three classes, and they need different answers:**

**A. Same purpose, same look - the true duplicates** (the class the lower-third removals came
from). Strongest elsewhere:

| distance | pair | category |
|---|---|---|
| 0.0187 | cr01 Classic Roll ~ cr10 Graduation Roll | end-credits |
| 0.0206 | tk16 Breaking Crawl ~ tk15 Public Notice Crawl | ticker |
| 0.0229 | tk05 House Wire ~ tk07 House Rotator | ticker |
| 0.0262 | ig19 Frost Recap ~ ig28 Frost Fixtures | infographic |
| 0.0282 | card26 Clean Steps ~ card55 In Memoriam | info-card |
| 0.0233 | sb02 Quiet Score ~ sb08 Club Scorebug | scoreboard |
| 0.0245 | sb03 House Score ~ sb05 House Scorebug | scoreboard |
| 0.0330 | pi01 Public Notice ~ pi09 Notice Rotator | public-info |

**B. One graphic in four skins - the family matrix.** The biggest source by far: House / Clean
/ Frost / Volt versions of one design fill the top of nearly every category's list (corner-bug
"Live" chips at 0.002-0.008, game-timer countdowns, audience cards, poll boards, brackets,
podiums...). These are the kit matrix working as designed - a kit resolves a type in a family -
so removing them is a KIT-MODEL decision, not a cleanup (docs/CATALOG_VARIETY.md §1.4 measured
the same thing off CSS; the pixels now agree). If the sameness bothers you here, the fix is
making the families actually look different (the widened family contract, §4.2a), not deleting
cells kits resolve into.

**C. Same skin, different words** - ss04 House Hold ~ ss09 Thanks for Watching, aq04 Clean
Question ~ rq04 Clean Request, and similar. The design is identical and the PURPOSE differs.
Arguably fine (deliberate siblings in one show), arguably a defect (an operator can't tell the
cards apart at a glance). Your read decides which.

Two footnotes: imp01/svg01 measuring identical is the import chassis, not a design problem;
and the transition category could not be measured (a transition covers the frame then clears
itself, so the settled shot is empty - instrument limitation, noted for the next round).

## Owner ruled, 2026-08-28 (walk)

- **A:** *"Classic Roll and Graduation Roll do look a bit too similar so we can remove that.
  But let's keep the rest for now."* One removal (task spawned same day); the other seven pairs
  stay.
- **Finding pairs was hard because search ignores codes** - "sb08" returns nothing - and *"this
  search is very strict... We're used to how good Google is."* Routed to the running
  dropdown/search session: id search + forgiving matching.
- **B:** families may exist and kits switching a whole show's skin is *"pretty smart"* - but the
  CATALOG should lead with UNIQUE designs, and skin/look changes belong to the wizard's Style
  step: *"we should just have a unique design, and then in a wizard step you change the colors...
  we need to have the first original graphic look unique."* Direction recorded in
  `docs/backlog/unique-first-catalog.md`.
- **C:** fine as deliberate siblings - but findability is the real problem, which became
  `docs/backlog/graphic-use-case-metadata.md` (use cases and purposes as searchable metadata).

Open until the cr01~cr10 removal lands; then this deletes.
