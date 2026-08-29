# AI door testing notice, and the CLI callout in the public docs

**Branch:** `claude/p-ai-door-copy` · **Date:** 2026-08-29 · **Gate:** `npm run build` green,
60 e2e passing across the three touched specs.

## What the owner asked for

Two things, both from 2026-08-29:

> "we should have a warning about the AI creations, or maybe we should disable the AI creations
> for the moment... they're still in the testing phase"

> "we should inform people to use the NoaCG CLI tool straight from their own Claude Code or
> Codex."

Both options were offered for the first one. **Labelling was chosen over disabling**, and the
reason is a pillar rather than a preference: "Create with AI" is the one AI door, and an AI
assist a pro keeps control of is one of the four things the product says it is. Removing the
door answers a copy problem with a product retreat. The pipeline is also not broken - it is
metered, validated and benched - so "disabled" would be a false statement about it in the other
direction. What it actually owes a first-time reader is that the RESULT is not settled yet.

## What changed

### 1. The Entry card says it in words

`src/components/wizard/steps/EntryStep.tsx`. The "Create with AI" card's description now LEADS
with **"Still in testing - results vary."** (`data-testid="ai-testing-note"`), and the Beta tag
stays where it was.

Three decisions inside that one line:

- **Words, not only a tag.** "Beta" is a label a reader carries their own meaning into. Half the
  industry ships Beta features that are finished. The sentence says the specific thing.
- **It LEADS.** A caution after two sentences of what the door does is a caution nobody reaches.
- **It costs the height budget nothing.** The note is an inline `<span>` inside the existing
  `.hint`, so the card's three reserved description lines still hold the whole of the copy.
  Measured: the AI card's hint is two lines at 1366x768, inside its three-line reserve, and the
  step still has zero overflow. "broadcast" came out of "a proven broadcast design" to pay for
  the words - the sentence says the same thing without it.
- **Not amber.** The Beta tag beside the title already spends that card's one accent. The note is
  brighter and heavier than the copy around it (`.wz-testing-note`), which is what a caution
  needs and what a second amber mark would not have given it.

### 2. The AI step repeats it, through the step's own convention

`src/components/wizard/steps/AiStep.tsx`. The step's opening `<h3>` + paragraph became a
`SectionHead`: the title, the always-visible line **"Still in testing - results vary"**, and an
ⓘ holding the fuller sentence.

**No second notice pattern was added** - this is the ⓘ convention the wizard already runs on
(GOALS goal 4, `SectionHead.tsx`), which is also why the tier paragraph that used to sit under
this heading moved behind the ⓘ with it. That is precisely what the convention prescribes
("the paragraphs that used to sit under every heading move inside the ⓘ"), so the caution
arrived and the step got SHORTER, not longer.

The fuller sentence separates two claims that are easy to conflate, because conflating them
would be its own dishonesty:

- what varies is the **design** - some briefs land close to finished, others come back plainer
  than a catalog design;
- what does **not** vary is whether it works - every result is validated and exercised in a live
  playout test before it can be created.

It ends somewhere useful: if you need a settled result today, start from a template or import
your own artwork.

The line lives in `.wz-sec-head .muted`, which is one nowrap line with an ellipsis and otherwise
holds neutral descriptors ("where this graphic will be watched"). Two consequences were handled:
it wears `.wz-testing-note` so it does not read as another descriptor, and the spec MEASURES
that the extra weight did not push it into the ellipsis.

### 3. The public docs point coding-agent owners at the CLI

`docs.html`. The agent guide already existed and is good - it was at the BOTTOM, under "For
developers", which is the last place a reader with Claude Code already open would scroll to. So
`#getting-started` now carries a callout: **"Have Claude Code or Codex?"**, what the CLI gives
the agent (the contract, the studio's own validator, screenshots, saving into the library), and
a link into `#claude-code`. The install commands stay in one place - a second copy is the copy
that goes stale, and the spec pins that this callout contains no `npx`.

One factual fix in the same section: it claimed the wizard offers **four** starting points. It
offers three; blank is behind Advanced mode. The page's own rule is that everything on it has
been run.

### 4. Pins and the contract

- `e2e/wizard-entry-fit.spec.ts` - the note's exact text, that it LEADS the hint, that the hint
  still fits its three-line reserve (measured, not assumed), and that the door is still enabled.
- `e2e/ai.spec.ts` - the section head's summary, that it is not clipped by the ellipsis, that the
  ⓘ body is closed by default, and the three things the fuller sentence has to say.
- `e2e/docs.spec.ts` - the callout, both agent names, the working link, and no second copy of the
  install commands.
- `src/components/wizard/AGENTS.md` - four lines stating the rule (the note leads, inline, the
  ⓘ carries the rest, the door is never disabled). The chain still passes
  `check:shared-instructions` with room to spare.

## Verification

- `npm run build` green, stamped `claude/p-ai-door-copy@6ad4f9b1a2`.
- `npm run check:copy` green (the docs page's zero-em-dash baseline still empty).
- `npm run test:e2e:focus:queued`: 656 passed.
- The three touched specs re-run directly plus screenshots: **60 passed**.
- Both surfaces were LOOKED AT, not only asserted about: the entry step at 1366x768, the AI step
  with its ⓘ open and closed, and the docs callout.

**A note on the browser pane:** `preview_start` in this session started a dev server for a
DIFFERENT worktree (it served stale sources on 5186 while this checkout's reserved port is
5182), so the pane could not show this branch's code at all. The screenshots above were taken
through this checkout's own Playwright config instead, which is the only path that is
guaranteed to be looking at the right tree. Worth knowing for any session launched into a
nested agent worktree.

## What this branch deliberately did NOT do

- **It did not disable anything.** No subsurface of the AI step is broken today: Lite, Pro and
  BYO key all run, and each already refuses honestly where it cannot help (Lite explains an
  unsupported graphic type rather than forcing a poor design). There was nothing to switch off
  that was not already refusing on its own.
- **It did not add an ⓘ to the entry cards.** The task sketch suggested putting the fuller
  sentence behind "the card's existing info affordance", but entry cards have none - only Browse
  cards do. Adding one would be a new pattern on the app's first screen and would cost the
  measured height budget. The fuller sentence went to the AI step's ⓘ instead, which is one
  click further on and is where the reader has actually opened the door.

## Flaky specs found in passing (not this branch's)

`e2e/video-project.spec.ts` and `e2e/video-hyperframes.spec.ts` are flaky. Two runs of the same
unchanged code produced three DIFFERENT failures, all waiting for content inside the video
player iframe or for the video shell after a reload. Nothing in this branch touches the video
pipeline. Filed as its own task with the three exact failures, since it is a real wait bug
worth finding and not a one-line fix.

## Next

Nothing outstanding on this branch. If the owner reads the entry card and wants the caution
louder or quieter, both are one string and one CSS declaration
(`.wz-testing-note`, `src/styles/wizard-and-dialogs.css`).
