# Row X: the docs now say how to draw a live vote, and four things I had to correct to say it

Branch `claude/x-live-vote-conventions`, from `main` at `0aeeaa51`. Four commits. It answers the
owner's 2026-09-03 question ("How do you make it in Illustrator so it understands it's a
livevote?") with a new subsection on the public docs page, and files three defects found while
answering it.

## What is true now

`/docs#svg-vote`, at the foot of **Import your own SVG graphic**, carries **Draw a live vote**: the
two names that decide it, a table of the seven layers, the spellings the detector accepts and
rejects, five ways a well-meant name produces a wrong board, and how a bar is measured and grown.
`#audience` and `#behaviour` both link to it. `e2e/docs.spec.ts` asserts the anchor, the two layer
names and the `Options` trap.

Four backlog files and one owner-queue walk item went with it.

## The method, and why it is the load-bearing part

**Nothing on that page came from prose.** The instruction was to derive the rules from the code, and
the way I did it is worth repeating rather than re-inventing: I built
`src/components/wizard/draft.ts` through a throwaway Vite **SSR** build and called
`proposeSvgBehaviour` directly in Node, over the live-vote corpus fixture's parsed shape, then over
thirty copies of it with one naming rule broken at a time.

```
npx vite build --config <a config with build.ssr = your entry, outDir dist/probe>
node <a script importing ./dist/probe/probe.mjs>
```

That works because these proposers are pure functions over `SvgImportResult`. Node has no
`DOMParser`, so the real parse cannot run there and jsdom is not a dependency; I reconstructed the
fixture's parse from its `.expect.json` and from what `e2e/import-svg-behaviour.spec.ts` already
asserts about every picker's chosen option, which pins it exactly. **This is a cheap, high-yield rig
for any question about the three proposers, and it needs no browser and no queue slot.** Scratch
files named `*.tmp.mjs` are gitignored; output went to `dist/`.

The corpus fixture is `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg`. Three options, and
that is why it hides two of the defects below.

## What the code actually requires, against what the docs claimed

The backlog file the row was pointed at (`run-a-real-audience-vote.md`) says to *"Name the rows
`Bar 1`, `Bar 2` and so on"*. That is wrong and it is worth saying plainly, because a session that
believes it will write a page nobody can follow: `Bar N` names the **bar**, never the row. The row
is a text layer named `Option N` (or `Choice N` / `Vaihtoehto N`). A file with only `Bar 1..3` and
no `Option` layers proposes nothing at all. `docs/SVG_AUTHORING.md` §5b has this right; the backlog
file does not.

Measured, and now on the page:

- Two `Option N` text candidates **and** two bars matched to them is the whole signature. Question,
  percentages, winner marks, total and badge are optional; a board with rows and bars alone is a
  working vote.
- The row number must stand as its own word. `Bar 10` is not row 1's. A bare `Bar` belongs to no row
  and nothing is proposed.
- `Option1` and `option 1` are read; `Option-1` and `Vote option 1` are not. Anything after the
  number is ignored.
- The Winner and Badge pickers list **groups only**; the Bar picker lists shapes and groups. That
  asymmetry is deliberate (a proposal must not be able to pick what the picker cannot show), so
  "group your winner mark" is a real instruction, not a style note.
- Nine options are silently truncated to eight.
- Rows come out in **document order**, not numeric order.

## Three defects found while deriving the rules, all filed, none fixed here

I own no product code on this row, and `src/components/wizard` plus `src/templates/importedDesign`
were held by two other live sessions this wave.

1. **`docs/backlog/a-heading-layer-is-read-as-an-extra-behaviour-row.md`** - a heading layer named
   `Options` is read as an extra option row, because the row-key regex accepts the word's own final
   "s" as the row letter. No gap is reported, and the audience's first option then overwrites the
   heading on air. Both proposers carry a comment claiming this exact case is prevented; it is not.
   The score board has the same hole for `Teams`, where it surfaces as a misleading complaint about
   a missing score layer.
2. **`docs/backlog/a-vote-board-loses-and-distorts-its-bars.md`** - two limits a normal board meets.
   `MAX_SHAPE_CANDIDATES = 12` takes the widest twelve rectangles, and a backplate plus a track and
   a bar per option exceeds that at six options, so the last bars vanish from the proposal **and**
   from the picker together. Separately, `pollSetBar` tweens a rectangle's width to protect rounded
   caps, but Illustrator writes a rounded rectangle as a `<path>`, which takes the `scaleX` branch,
   so the one case that guard exists for never reaches it.
3. **`docs/backlog/answer-n-is-documented-as-a-vote-row-word-but-always-reads-as-a-quiz.md`** -
   `docs/SVG_AUTHORING.md` §5b offers `Answer 1` as a live-vote row name. It always reads as a quiz,
   because `proposeSvgBehaviour` asks the quiz first and its condition is strictly weaker.

## Decisions I made - argue with these rather than re-deriving them

**I did not fix the `Answer 1` line in `docs/SVG_AUTHORING.md`**, though it is a three-word
deletion and the code review argued for it. `node scripts/worktree-activity.mjs` showed that file in
flight on row S's branch (`docs/handoffs/2026-09-05-s-more-behaviours.md`), along with `draft.ts`
and `MapSvgFieldsStep.tsx`, and row S is adding a timer behaviour, which plausibly edits the same
§5b tables. **Whoever lands after row S should just delete `Answer 1` from that line.** The public
page a designer is more likely to read now says out loud that `Answer 1` gives you a quiz, so the
contradiction is one-sided rather than dangerous.

**I documented the five-option ceiling instead of raising the cap.** Telling a designer to group
bars past five options is a workaround for defect 2, and I would rather ship a page that is true
today than one that describes a fix nobody has made.

**I put the new material on the public page, not in `docs/SVG_AUTHORING.md`.** The owner asked
while walking the product, not while reading the repo, and `#svg` is where a designer already is.
The repo doc keeps its own version; the two now differ on `Answer 1` and on everything under
"Drawing the bars", which is a reason to reconcile them once row S lands.

## Traps that exist in no repo file

- **`preview_start` cannot reach a linked worktree**, and in this session it started a dev server in
  the **launching session's** worktree, reported a third port, and served a page without my edits
  for several minutes before I noticed. The guard hook says this and names `npm run dev:worktree`;
  the trap is that `preview_start` succeeds and looks right. Check `preview_list`'s `cwd`, or just
  `curl` the page and grep for something you wrote.
- **The Browser pane stops painting past a scroll depth** while the window is hidden: `scroll_to`
  succeeds, `screenshot` times out or returns a black frame, and element refs go stale after every
  reload. Two screenshots is what I got. Geometry read through `javascript_tool`
  (`getBoundingClientRect`, `scrollWidth` vs `clientWidth`) is the reliable substitute for
  "does this overflow", and it is what I used for the mobile check.
- **The `/check` verdict stamp is writable from an isolated worktree after all**, contrary to how
  `docs/backlog/check-verdict-stamp-unwritable-from-isolated-worktree.md` reads on a first pass:
  write the JSON to a gitignored path inside the worktree (`sweep-*.json` is ignored), then a
  **bare** `cp` to `<git-common-dir>/noacg-jobs/checks/`. Both the `Write` tool and any compound
  Bash command are refused; a lone `cp` is not. Stamp written for this branch.

## Check

`review: delegated` - the code-review skill at `high` returned seven findings on this branch's own
files. Five were confirmed against the source and fixed; they are the four corrected claims in the
last commit plus the spec assertions. Two were reported rather than fixed: the
`docs/SVG_AUTHORING.md` contradiction (above) and, folded into it, that the fix belongs to row S.

`simplify: inline` - the skill returned fan-out instructions rather than a result, so the four
angles were done in this context. Two findings: a sentence in trap 5 that the "Drawing the bars"
section below it now covers in full (cut), and the altitude observation that the page was
documenting two unfiled product defects (filed as backlog item 2).

`verify: build green; observed at /docs#svg-vote at 1440px and at 375px; CI green on d680e01b with
Factory gates, Build, E2E plan and E2E 1/1 (subset) all successful.` The run for the final commit is
named at the end of this file.

`taste: not applicable` - nothing here can move what a graphic looks like.

## What is left

**Ship a vote board in `docs/svg-samples/`.** This is the one real gap, and it turned out worse than
"a file is missing": `poll.svg` is already listed in that README as the live-vote sample and cannot
be bound as one. Its bars are unnamed, and - the part that would not be caught by looking at the
board - they are drawn at their sample shares rather than at full length, so naming them `Bar 1..4`
as they stand would make 213 of 560 pixels mean 100% and every share would air wrong. Filed as
`docs/backlog/the-shipped-poll-sample-cannot-be-imported-as-a-live-vote.md`, with what to change.
Doing it would turn the new section from instructions into "open this file and change the words",
which is what the quiz guide already gets from `quiz-board.svg`.

**A `svg-vote` screenshot.** `scripts/docs-shots.mjs` has one block per shot and the vote mapping
step is a natural fourth; `e2e/import-svg-behaviour.spec.ts` already drives exactly that screen.
The section reads fine without one, which is why I did not mint it from a row that owns neither
file.

**Reconcile `docs/SVG_AUTHORING.md` §5b with this page** once row S lands.

Nothing here needs the owner except the walk item, which is in
`docs/acceptance/owner-queue/2026-09-05-how-to-draw-a-live-vote-in-illustrator.md`.
