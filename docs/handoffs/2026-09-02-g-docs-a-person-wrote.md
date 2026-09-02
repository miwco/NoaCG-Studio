# 2026-09-02 - row G: docs a person wrote

Branch `claude/g-docs-a-person-wrote`, three commits on `cd170361`, gated and queued. The owner's
ask: "The NoaCG documentation still reads somewhat AI-written in places... natural, direct human
writing with minimal AI-style filler, while remaining extremely clear and approachable. Aim for
documentation simple enough that even a child could understand how to use NoaCG."

One file of substance, `docs.html`, the public page at `/docs`. `src/docs/docs.css` and
`src/docs/docs.ts` needed nothing; `e2e/docs.spec.ts` needed nothing, because no section id,
heading or command block moved.

## What the page actually had wrong

The first pass was an inventory with the lines quoted, not an impression, and it is worth
recording that the inventory over-counted in one direction and under-counted in another.

**Over-counted.** The "X, never Y" construction appears seventeen times. Read case by case, most
of them earn it: "a mismatch does not crop, it scales" and "graphics are cued by the operator, not
by reloading the source" each kill a mistake a reader will actually make. Only about five were the
formula firing on its own. A sweep that removed all seventeen would have made the page worse, and
that is the trap in working from a pattern list.

**Under-counted.** The real tell was structural, not lexical. End credits and Tickers opened as
find-and-replace copies of one another, same argument with the nouns swapped, which no
per-sentence rule catches. Ten colons used as mid-sentence connectors, four hyphens standing in
for em dashes, and the CLI's capability list printed twice in near-identical words (the Getting
started callout and the head of the agent guide) round it out.

## The half that is not style

Six places where a beginner stops and cannot continue, all fixed:

1. Nothing said what a lower third is, or what "on air" means. The page opened in broadcast
   vocabulary and never came back for anyone who did not have it.
2. "A blank start is there too, under Advanced mode" - Advanced mode was never defined. It is now
   named as the Settings toggle that shows the code editor, off by default.
3. `<slug>` appeared in two URLs and was never explained. It is a random id minted at publish,
   not something you type, which a reader would otherwise try to guess from the show's name.
4. **The output URL is load-bearing in three sections and the page never said where to copy it
   from.** It is the **Links** button in the production page's header, along with the control
   page URL and the audience join link. That was the single biggest hole.
5. "Two monitors and the verbs an operator uses" reads as a hardware requirement. They are two
   panes in one browser window.
6. The Google Sheet route said "in the studio, add the live-data source" with no route at all. It
   is the editor's **Rehearse** panel, which means Advanced mode has to be on first.

## The delegation, and what it is worth

`npm run agy -- --model claude-opus-4-6-thinking --label g-docs-a-person-wrote --write`, the
Antigravity claude/gpt pool as the owner asked by name. One turn, 465 s, 75.8 K input / 28.3 K
output, no cache. Recorded in `~/.noacg/agy-usage.jsonl` and, with the verdict, in
`~/.noacg/delegation-outcomes.jsonl` (`doc-sweep`, `first-pass=no`).

**The shape that made it safe is worth copying.** The prompt is 15 K, under the wrapper's 30 K
cap, and it quotes the twelve passages inline rather than sending it to read the file. It asks for
the NEW text only, into a scratch file. So the delegate could not touch markup, ids, commands,
links or anything outside those twelve passages, and there was no read_file step to be auto-denied.
The tool set and the absence of a shell are declared in the first paragraph, which is the trap
`docs/HARNESS_ROUTING.md` names.

**Five of twelve landed clean** (P3, P4, P5, P9, P12). Seven needed my hand:

- **P1** cut the one distinctive sentence ("you describe the graphic in your own terminal instead
  of in the wizard") and kept the duplicated capability list, which is the opposite of what it was
  asked for.
- **P2** replaced the duplication with "the NoaCG CLI closes the gap" and dropped what the CLI
  does, so a reader arriving on that heading from the callout got less than before.
- **P6** left a sentence fragment. **P11** left a colon-headed fragment.
- **P7 is the one that matters.** Told to shorten the Tickers opener by leaning on the credit-roll
  guide above it, it opened the section with "This works the same way as the credit roll above"
  and deleted the sentence saying what a ticker is. Tickers is reachable directly by anchor, so a
  reader arriving there lands on a pronoun with no referent and no definition. **Every mechanical
  acceptance condition passed.** Only reading it as a stranger catches it.

The verdict for routing: good at deleting a named tell, unreliable at judging what a passage still
has to do for its reader. Sound for a bounded rewrite whose output someone reads whole; not sound
for anything shipped on acceptance conditions alone. That is the same conclusion the 2026-09-02
fixture round reached from the other direction.

## /check

- review: **delegated** - code-review at `high` returned seven findings directly, scope confirmed
  against this worktree's branch and merge-base. All seven verified against the code before acting
  and all seven were real. Six were mine, one pre-existing inside an item I had edited.
  **Three were factual errors the rewrite introduced**, which is the important number: the page
  named a field that does not exist (`Audience result` is the state; the field is
  `Audience results`), claimed a graphic moves only on an operator press when timer-fired
  transitions ship in Status Rotator, the sponsor rotation, the live poll and event notifications,
  and described Status Rotator as a list of rows when it shows one service at a time. A rewrite
  that reads well and says something untrue is worse than the original, and this is what that
  looks like in practice.
  The other four: the publish button has never been labelled "Publish" (it is **Start production**,
  then **Publish changes** in the Links panel), changing a production's readable name breaks the
  old audience link and the guide invited it without the warning the UI itself carries, a dangling
  referent in the pasted agent prompt, and an owner-queue route pointing at a left-nav entry that
  does not exist.
- simplify: **inline** - the skill returned fan-out instructions, so the four angles were covered
  here. Prose, so reuse means repetition: the **Links** button is now named in four sections, each
  in different words on purpose, because each is a separate entry point. One tightening (the
  audience name warning, two sentences to one). Nothing else needed it.
- verify: `npm run build` exit 0, branch stamp `claude/g-docs-a-person-wrote@...`;
  `npm run check:copy` PASS; `npm run test:e2e:affected` 14/14 (docs.spec.ts + landing.spec.ts);
  CI run 33689331748 on `fc9b6d06` all success (Build, Factory gates, E2E plan, E2E 1/1 subset,
  Combined E2E report, CI gate; Vercel and Catalog calibration skipped by plan), run 33690599303
  on the checked sha. Rendered `/docs` in the browser at 1440x900 and read it cold.
  The stamp is at `.git/noacg-jobs/checks/claude-g-docs-a-person-wrote.json`.

## A trap worth having in writing

`preview_start {name: "dev"}` served a **sibling worktree's checkout** on a port that was not this
one's, and the page it showed was the old text with every edit missing. That is exactly the
failure `docs/DEV_PORTS.md` records for 2026-09-01, and the guard hook catches it the moment you
try the obvious workaround. `npm run dev:worktree` is the only thing that works in a linked
worktree. Ten minutes went into believing a stale page.

## Deferred, and why

- **No new screenshots.** Only the SVG guide has any. The dashboard, the OBS setup and the quiz
  run would each be clearer with one, and `scripts/docs-shots.mjs` drives the running app to make
  them. Inventing captions for pictures nobody has taken is worse than saying so, so this is a
  named gap rather than a silent one.
- **No glossary block.** Terms are glossed at first use instead. A stranger-facing glossary is a
  different page and a different decision.
- **Live data is behind Advanced mode.** The guide now says so honestly, and that may be a product
  complaint rather than a docs fix: pointing a graphic at a Google Sheet is something a
  non-technical operator wants, and today it needs the code editor switched on. Raised in the
  owner-queue item.

## Owner queue

`2026-09-02-docs-a-person-wrote.md` (walk-p): read `/docs` cold and say whether a person wrote it.
Names the route, and the two judgement calls that are the owner's rather than mine - whether
glossing "on air" reads as helpful or as talking down to someone who works in television, and
whether the live-data route should move out of the editor.
