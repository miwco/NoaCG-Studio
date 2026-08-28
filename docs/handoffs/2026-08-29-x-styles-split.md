# Handoff - src/styles.css becomes 30 stylesheets

Branch `claude/styles-css-modules-6ad51b` (the brief called it `claude/x-styles-split`; the
worktree was already cut under the other name and keeping it avoided a rename mid-flight).
Two commits: the split, then the contracts that pointed at the old file.

---

## What this was for

`docs/backlog/split-styles-css.md` measured it: 7,841 lines, 1,840 selectors, one file, **137
commits in the month to 2026-08-28 - rank 1 in the repo**, with 12 worktrees live. The rule that
keeps parallel sessions apart ("a feature edits its own domain plus thin wiring") had no domain to
apply to here, so every UI branch collided on the same file. The owner named merge latency the
bottleneck; this was its clearest single cause.

The backlog item is deleted, as the shelf requires of anything that graduates.

## Own research first - what was verified before moving a byte

The report proposed a cut at the file's 38 named sections. Three things were checked rather than
taken on trust:

1. **Are the 38 boundaries genuinely top-level?** A brace-depth walk over the whole file
   (comment- and string-aware) at every section-comment line: **all 38 sit at depth 0, outside any
   comment, and the file's braces balance.** No rule, media query or nested block spans a
   boundary, so every cut is safe. The report's line numbers had drifted (it read the wizard as
   1234-2893); the boundaries were re-derived from the file itself.

2. **Which selectors depend on file position across a cut?** Every selector prelude in the file
   was collected with its nesting depth and mapped to its part. **Six preludes appear in more than
   one part:** `.topbar` and `.topbar button` (app-shell.css / machine-graph.css), `50%` (a
   keyframe stop, brand-mark.css / inspector.css), `.lib-list` and `.lib-row--grid .lib-actions`
   (selection.css / video-editor.css), `.pd-stagehead` (home.css / playout-dashboard.css). All six
   are decided by ORDER alone. Order is preserved, so all six behave exactly as before - but they
   are why the order is written down as a rule rather than left as a convention. Three of them
   also show that a couple of rules sat in the wrong section in the monolith (`.lib-list` under
   "Shared selection", `.pd-stagehead` under Home); moving them would be a behaviour change, so
   they stayed where they were.

3. **The open design question: `@import` in one index.css, or one import line per part in
   main.tsx?** **`@import` in `src/styles/index.css`, and the reason is the cascade.** With import
   lines in main.tsx the order is the MODULE GRAPH's, not the list's: anything main.tsx pulls in
   before the last CSS line can inject its own stylesheet in between (two components already do -
   `wizard/prepProposal.css`, `wizard/mapSvgFields.css`), and moving one import line in main.tsx
   silently re-orders the cascade. With one `index.css` the list itself IS the order, whatever the
   graph does. Vite resolves and inlines `@import` at build time in both dev and build, and the
   file it produces is identical (below). The cost is one shared file every new part must touch -
   a 30-line list, where a conflict is one line in an obvious place, instead of 7,841 lines where
   it is not.

## What shipped

- **30 parts under `src/styles/`**, cut at the 38 section comments and grouped only where adjacent
  sections belong to one surface (Editor + Preview, Canvas selection + Shared selection, and so
  on). Each part opens with its original section comment, so it is still findable by the words it
  always had.
- **`src/styles/index.css`** - the ordered `@import` list, with the rule stated at the top: append
  a new part where its rules already sat, never re-sort, never alphabetise.
- **One textual change in 346,067 bytes**: `@import "./brandTokens.css"` moves from the top of the
  old file to the top of index.css, so the whole order lives in one place.
- `src/main.tsx` imports `./styles/index.css`.
- Contracts updated: the root `AGENTS.md` architecture map (new `styles/` row) and its
  `color-scheme` gotcha, `src/components/AGENTS.md`, `src/components/wizard/AGENTS.md`,
  `docs/acceptance/owner-pack/README.md`, `docs/TEMPLATE_TAXONOMY_PROPOSAL.md`,
  `docs/backlog/production-page-extraction.md`, and the stale comments in
  `.dependency-cruiser.cjs` and `scripts/e2e-affected.mjs`.

`scripts/e2e-affected.mjs` needed no logic change: its CORE pattern is `/^src\/styles/`, which
matched the old file and matches the new directory.

## The proof

**The dist CSS diff is the gate, and it is clean in the strongest available sense.** Built before
the split, kept the seven emitted stylesheets, built after, diffed:

```
diff -r before/ after/   ->  no differences
md5  app-*.css           ->  7ba9388c8c163df4ac6756126c0a6227 on both sides
```

Every emitted CSS file kept **the same content hash in its own filename** (`app-DDXqBKKh.css`,
174,004 bytes, before and after). A content hash is computed from the bytes, so identical
filenames are proof on their own: the browser receives exactly the stylesheet it received before,
in exactly the same order. A cascade regression is not merely unlikely here, it is excluded.

Underneath that, the split is checked at the source level too: concatenating the 30 parts in
index.css order reproduces the old `src/styles.css` **byte for byte** (346,067 bytes), and the
script that performed the split refuses to write unless that holds.

`npm run build` green (typecheck, eslint, depcruise, the node test suites, the prerender).

**Screenshots, dev server on 5288** - the dev path is the one thing dist identity does not prove,
because Vite serves CSS differently there. All four named surfaces render correctly: the wizard's
Browse step (step rail, gallery grid, footer), Home (left nav, production card, Recent graphics),
the playout dashboard (amber Preview / red Program frames, cue rundown, the red TAKE) and the
editor (canvas chequerboard, timeline dock with the Timeline/States switch, Inspector). No console
errors beyond Vite's own connect messages.

**`overflow-sweep --baseline`: PASS** - no variant regressed.

**`main` was taken in and re-verified.** The fork point (`fb97ab5d`) was RED on CI, so the
branch integrated the 12 commits `main` had gained (which include the fix for that failure).
The merge was clean, and two things were checked rather than assumed: `main` touched
`src/styles.css` in NONE of those 12 commits (`git rev-list --count fb97ab5d..origin/main --
src/styles.css` -> 0, so there was no modify/delete conflict to lose quietly), and the 30 parts
still reproduce the fork-point file byte for byte afterwards. The only file both sides touched
is `scripts/e2e-affected.mjs`, where both sides survived.

**`e2e-affected --integration` on the integrated sha: 1156 passed, 0 failed, catalog gate
passed.** The build after the merge is green, and the emitted stylesheet is STILL
`app-DDXqBKKh.css` - the same content hash it carried before the split and after `main` moved.

### The 21-minute detour, and the guard hole it found

The first integration run failed 12 specs - `render.spec.ts` entire, plus `project-format`'s
render readout and `video-settings`' duration warning. None of them were this change: every
failure read `element(s) not found` for `render-panel`, and a byte-identical stylesheet cannot
remove an element from the DOM.

The cause was a dev server left listening on this checkout's port (started to take the
screenshots above). Playwright adopted it through `reuseExistingServer`, so `webServer.env` -
which pins `VITE_RENDER_API: '1'` - never applied, and `ExportSurface` renders no `RenderPanel`
at all without it (`src/render/config.ts` is the one feature-detection point).

`e2e/_offline-guard.ts` exists to refuse exactly that, and it did not, because it only compared
the keys the config pins EMPTY. An ordinarily started dev server has those empty already, so it
passes the guard while being wrong in the other direction. Fixed in this branch: a `MUST_BE_SET`
list beside `MUST_BE_EMPTY`, both named in the same refusal, so the next session gets one
sentence instead of twelve confusing failures. Re-run with no adopted server: all green.

## For whoever picks this up next

- **The one rule that matters:** `src/styles/index.css` is the cascade. A new part is appended
  where its rules already sat. Re-sorting that list to taste - alphabetically, or "logically" - is
  the one edit that can break the app invisibly.
- **The next cut, if it is ever wanted:** `wizard-and-dialogs.css` is 1,713 lines and the biggest
  remaining part. It is one top-level section holding three things - the shared dialog anatomy
  (used by SettingsDialog, SaveDialogs and AiProviderSettings, not only the wizard), Settings, and
  the wizard steps. It cannot be split at the 38-section boundaries because none exist inside it;
  it would be cut at its own sub-headers, and that needs the same depth check run here before
  anything moves. Not urgent - it is a quarter of the old file, not the whole of it.
- **`production-page-extraction`** on the shelf is now half done: the dashboard's 1,314 CSS lines
  are `src/styles/playout-dashboard.css`, and what is left there is the 2,968-line component.
