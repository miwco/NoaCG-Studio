# Row L: which graphics belong to which production

Branch `claude/l-browse-a-productions-graphics`, queued for landing. The goal was that the library
shows, at a glance, which graphics belong to which production, and lets you narrow to one without
hunting. The owner's words, today: "it is quite hard to do this because I can't see which graphics
are part of which production easily."

## What the library actually looked like first

I drove it before designing anything, because the backlog file describes a walk rather than the
screen. What is there today: cards or a table of preview / name / type / edited, a folder band,
type chips, search, sort. A "+ Production" button on every row - a WRITE door with no matching
readout. The Productions section shows a card per production with "3 graphics · 3 cues" as dead
text and a strip of four unlabelled thumbnails. Nothing anywhere says which production a graphic
is in, and the only list of a production's graphics is inside the playout dashboard.

The relation itself already existed and needed no model change: a production's pool holds COPIES,
each recording the id of the library graphic it came from (`productionsContaining` in
`model/shows.ts` reads exactly that), and a graphic can be in several productions at once.

## What I decided, and why

**Pills, not a grouping.** A graphic can be in several productions, so grouping the library by
production would print the same graphic under two headings. Folders already own grouping and a
graphic has exactly one. So membership is a set of tags on the item, in both views.

**A select in the one header row, not a second chip row.** `src/components/home/AGENTS.md` makes
the single header row binding - a title on one line with the search on the next once cost two
bands of the fold. A second chip strip under the type chips would have cost the same band, so the
filter is a `<select>` beside Sort. It renders only when a production exists, the same "one type
is not a filter" rule the type chips follow.

**"Not in a production" is a first-class option.** A facet whose only states are one production
and all of them makes every unassigned graphic unreachable through it. Its count sits in the
option text like the others.

**A production filter flattens the folder band, exactly as a search does.** A production's
graphics are spread across folders, so answering with the unfiled ones alone is a lie by
omission. One `flat` boolean replaced every grouping use of `searching`; `searching` itself still
means what it meant, so `folderFilter` is still RETAINED and clearing the filter puts you back in
the folder you were in.

**Session state, not a route parameter.** `#/home/<section>` is a documented contract
(`docs/SAVED_CONTENT_MODEL.md` §3) and the goal is reached without touching it. The cost is that
the filter does not survive a reload or a bookmark. If someone later wants to link to "the Friday
show's graphics", that is when the route earns the change.

**The production card's size line is the door.** "4 graphics" opens the library already narrowed.
That is the backlog file's production -> graphics direction, literally.

## The delegation, honestly

Codex `gpt-5.6-sol` at high effort built it through `/rescue`, from a 14.8 KB brief written before
launch that enumerated the files, the shape and the acceptance conditions. It came back in about
35 minutes with all eight files, a green `npm run build`, and a passing spec run - all three of
which I re-derived rather than believed.

**Codex built exactly what the brief said. Every repair traced to the brief, not to the worker**,
which is why the outcome is recorded `repaired / prompt` rather than `repaired / worker`
(`scripts/delegation-outcome.mjs`, wave 2026-09-04 row L). What the brief got wrong:

1. It told the table cell to print up to two production names in a 150px track. Driving it, they
   ellipsized to "Frid…" and "Bas…" - two stubs answer less than one name and a `+1`. The card
   keeps two names; the table prints one, and both carry the full list in the wrapper's tooltip.
2. It said nothing about the filter's COUNTS following the search box, so they counted the whole
   library: typing "quiz" left the dropdown promising four and listing two. They now count the
   search-filtered set, which is the rule the type chips already follow.
3. It said nothing about a filter left pointing at a production that has since been DELETED. The
   select matched no option while the list stayed empty - the "parked inside a place that no
   longer exists" state the folder band walks itself out of.
4. It made the browse handler optional, so the door rendered as a live-looking dead button
   wherever no handler was given.
5. It asked for six behaviours "covered" without saying they should be separate tests, and got one
   test doing all six. Split into eight, and the seed now files the shared graphic inside a folder
   so the flattening rule is actually pinned.

**The lesson for the next delegation: the brief is where the defects came from.** Three of the
five are cases the brief never named at all, and one is a case where the brief named the wrong
number. A spec that enumerates the happy path in detail and leaves the edges implicit gets exactly
that back.

## What `/check` found on top

`review: delegated` (code-review skill, level high - it returned findings into the conversation
and every file it named was in this branch's diff). `simplify: inline` - the skill returned
fan-out instructions rather than a result, so the pass ran here over its four angles.

Five review findings confirmed against the code and fixed:

- **"Not in a production" could not be cleared once the last production went**, because the whole
  control is drawn only while a production exists. The guard now walks that value out too;
  otherwise the folder band stayed flattened for the life of the page.
- **A type chip could outlive its own strip.** Narrowing to a production holding none of the
  picked type takes the chip off screen (and at one type the strip too) while the filter goes on
  excluding everything - an empty list with nothing able to explain it, which reads as "this
  production is empty". A filter the user cannot see is a filter the user cannot undo, so it is
  released when its chip leaves.
- **The door promised a number the destination would not show.** A production's size counts pool
  entries; the library can only list the ones whose back-link still resolves. Where they differ,
  the size is now plain text and the browsable subset gets its own words.
- **The select had no width ceiling**, and a `<select>` sizes to its widest option while a
  production name is uncapped user input - a long name would squeeze the search box to nothing and
  overflow the one-row header. Capped at 220px with an ellipsis.
- **The first-run empty hint fired on a filter**, telling a user with forty graphics they had none.
  It is now keyed on the library being empty rather than on the list being short.
- **The spec was mapped but not in `FOCUS`** (`scripts/e2e-lists.mjs`), so a `model/shows.ts`
  change - the change most likely to break this surface - would have escalated to the focus list
  and skipped the one spec written to protect it.

Two simplify findings, both on my own diff: `filtered` was rebuilt on every render, busting every
downstream memo in the Graphics section including the one that re-reads folders off the model, so
it is memoised and passed through by identity when no filter stands; and the production card's
stats line called its counting helper three times and duplicated the door's JSX, so it became one
`ProductionStats` component.

## The pre-existing bug this surfaced

`docs/backlog/picture-upload-severs-a-pool-graphics-library-link.md`. Adding a picture to a graphic
on the production page re-pools it with `addGraphicToShow(show.id, template, {})`, and that call
rebuilds the pool record by name while writing `graphicId` only when the caller supplies one - so
`{}` DELETES the back-link that was already there. `publishControlShow` follows that link to
publish a graphic's control entries, and this new filter follows it to list a production's
graphics. Both go quiet rather than failing. Filed rather than fixed: it belongs one layer down in
`model/shows.ts`, beside the `id` and `layer` lines that already carry forward on a replacement,
and changing shared behaviour there wants its own change and its own review of every caller.

## Verification

- `npm run build` green, branch-stamped `claude/l-browse-a-productions-graphics`.
- `e2e/library-productions.spec.ts` - 8 tests, all passing, mapped in `scripts/e2e-affected.mjs`
  (both the `src/components/(home|save)/` and `src/templates/` rows) and added to `FOCUS` in
  `scripts/e2e-lists.mjs`.
- `npm run test:e2e:focus:queued` - 485 passed, before the check fixes.
- `npm run test:e2e:affected:queued` - run after the check fixes; result in the wrap-up.
- CI green on `67669f43` with all nine E2E shards actually running, read job by job. The check
  fixes are a later commit and get their own run.
- Driven by hand at 1280 and 1024: pills, both views, all three filter states, the flattening, the
  door from a production card, and the guard that releases a filter when its production is deleted.

`taste: not applicable` - nothing here changes what a graphic looks like; the change is library
chrome around them.

## For whoever picks this up

The three things most likely to be got wrong next:

- **Do not turn the production filter into a grouping.** A graphic in two productions would appear
  twice, and folders already own grouping.
- **Do not let a filter hide the unassigned.** "Not in a production" is the point, not a nicety.
- **Do not count a production's graphics twice in two places.** `ProductionStats` counts what the
  library can list; the production card's size counts what the production holds. They are
  different numbers on purpose, and the backlog file above is why.
