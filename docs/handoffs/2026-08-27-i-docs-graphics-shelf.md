# Session I - the docs graphics shelf, and the data key

Branch `claude/docs-graphics-shelf-786532`, three commits on `9063928b`. The owner walked `/docs`
on 2026-08-26 and liked it, with one correction: end credits and tickers as top-level nav entries
confused the left nav, which must stay "only the most important information on the left". Two
defects the previous round filed as chips are also closed here.

## 1. `/docs` has a Graphics shelf

`f88a8462`. The left nav is main topics only, in five groups: Start, Make a graphic, Connect
playout, Run the show, For developers. Eleven links, every one of them a `<section id>` (the
existing spec walks that).

End credits and tickers are no longer sections. They are guides INSIDE `#graphics`, as
`h3.doc-kind` with their own `h4` sub-heads, and **their anchors are unchanged** - `#end-credits`
and `#tickers` are linked from two owner-queue notes and a handoff, and an id is an address. The
section opens with a four-item contents list, so the nesting is visible rather than something a
reader has to scroll into.

Two kinds are documented for the first time, both written against the graphic types themselves:

- **Scoreboards** (`src/templates/types/scoreboard.ts`): the four fields, the four buttons, and
  the one thing nobody would guess - Goal A raises the marker AND adds one to Score A on the same
  press, a second press during the same flag plays and bumps again, and Full time is an
  independent group. Plus the four designs by name.
- **Quizzes and game shows** (`quizBoard.ts`, `answerBoard.ts`): what the operator types
  (including that Correct answer and Selected answer paint nothing on their own), the run order,
  why Select is *unreachable* after Lock rather than refused, the sealed flow a game show really
  uses (type the letter, lock from the question, reveal the choice as its own beat, or judge
  straight from there), and that the default path degrades to question / reveal / out for a
  playout system with no control page.

`src/docs/AGENTS.md` + `CLAUDE.md` are new: the voice (plain information, zero em-dashes, pointing
at the `docs-public-copy-voice` memory rather than reprinting it), the run-it-before-you-write-it
rule with the four false claims of 2026-08-26 as its evidence, and the structure rules a new guide
has to fit. **`docs.html` points at it from its first line**, because the page is at the repository
root and a nested AGENTS.md there would never load for an author editing it.

`docs/backlog/docs-guides-to-write.md` lists the next four guides in order - the creation wizard
first, because it is the most-used surface and the least documented - with the owner's "do not
inflate the docs" constraint quoted as the binding half.

## 2. The data key is in the product

`69ad243d`. `productionDataKey()` had zero callers that put it on a screen, so the whole Production
Data API guide described something a hosted owner could not do: the key exists only in
`control_shows.data_key`, and the docs told them to read the row.

The Production data panel (Data tab) now carries a **`▾ Data key`** block. Hidden behind dots until
Reveal, Copy beside it, one line on what the key can and cannot do, and a link to `/docs#data-api`.
**Only rendered when a key exists** - unpublished and offline productions have none, and a
permanently dead button is worse than no button.

The key is threaded `ProductionPage` -> `ProductionDataWorkspace` -> `ProductionDataPanel`; the page
already resolved it for its own patches, so nothing new reads the database.

**The proof is a round trip, not a string.** `e2e/configured/production-data-key.spec.ts` publishes,
asserts the button is absent before publishing, reveals the key, then PATCHes the production's data
tree with it and reads the tree back - both through `/api/data/*`, which the dev server mounts with
the real handler (`scripts/dataDevPlugin.mjs`). The offline half is in `production-data.spec.ts`:
an unpublished production offers nothing to reveal. `scripts/e2e-lists.mjs` now names
`productionDataApi.ts`, `ProductionDataPanel.tsx`, `api/data/` and the dev plugin as configured
triggers, so a change there says out loud that the offline plan does not cover it.

## 3. The Rehearse mode is out of the maintainer docs

`bca676ed`. Rehearsal was built and removed (`docs/PLAYOUT_DASHBOARD.md` §6); the header renders
two states, `● SHOW` and `○ NOT PUBLISHED`. Four documents still described a third.

The one that mattered was troubleshooting advice: `PLAYOUT_INTEGRATION.md` told an operator whose
take did not air to check a mode strip for a mode that does not exist. It now names the real cause
and what each of the two states means for that symptom. `CLOUD_PLAYOUT.md` §4a is rewritten against
`runVerb` and `ProgramStage.tsx`. Two loose "rehearse mode" mentions in the plan docs went with
them; the audience workspace's own rehearsal (a real thing, `localAudience.ts`) is untouched.

## Verified

- `npm run build` green on the final commit (`bca676ed`).
- `npm run check:copy` PASS - the page gained ~120 lines of new public copy and no new tells.
- The page driven in the real dev server: no console errors, the nav renders eleven live anchors,
  the shelf's headings measure 26 / 21 / 16 px against 15 px body, the contents list sits flush
  with the paragraphs (its `margin-left: 0` needed `.doc-body .doc-kinds` to beat the base
  `.doc-body ul` shorthand), and no horizontal scroll at 1280 or at 375.
- The data-key block's CSS resolved against the app's own tokens (panel background, border,
  monospace chip) by measuring it in `/app`.
- `docs` + `production-data` specs are queued as **j-0089**; the machine had three jobs ahead of it
  and 1.3 GB free against a 4 GB floor, so read `node scripts/jobs.mjs log j-0089` before trusting
  this as green. CI is the gate that matters and plans from the push.

## Not done, deliberately

- **The in-app Learn pointers** (import door -> `/docs#svg`, Settings Playout -> `/docs#casparcg`,
  Data tab -> `/docs#data`), still the tail item from session B. The Data tab now has one, to
  `#data-api`, so two remain.
- **A guide for the creation wizard**, which is the biggest hole in the page and is item 1 of the
  backlog file rather than something to bolt on at the end of this branch.
