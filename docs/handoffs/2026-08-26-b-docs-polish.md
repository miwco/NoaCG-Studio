# Session B - the docs polish round

Branch `claude/b-docs-polish-ca8fde`, four commits on top of the docs home (`00f15ba8`). The owner
walked `/docs` and the landing on 2026-08-26, accepted both ("I think it's good; the important
things are there"), and gave four corrections. Standing memory: `docs-public-copy-voice`.

## What the owner asked for, and what happened to each

**1. Every command is one copy-paste.** All sixteen command blocks on `/docs` now carry a copy
button. The markup in `docs.html` is still a bare `<pre>`: `src/docs/docs.ts` wraps each one in
`.cmd` and builds the button, so a reader with JavaScript off gets a complete, selectable page
with nothing missing but the shortcut. The button lives in the wrapper rather than in the `<pre>`,
so it holds still while a long command scrolls under it, and the reserved room drops from 92px to
72px under 600px wide. `navigator.clipboard` where the context is secure, a hidden-textarea
`execCommand` fallback where it is not, and the label says `Press Ctrl+C` when even that fails
rather than lying. The agent guide opens with a one-line install that needs nothing installed
first, and the five-step loop is one command per step instead of one script to paste whole.

**2. Tone pass.** Every sentence rewritten to plain instructional prose: no superlatives, no
benefit-instead-of-fact sentences, no "which is what makes X safe" constructions, no tricolons.
**Zero em-dashes on `/docs` and zero on the landing** (the landing's selling voice is otherwise
untouched, per the owner's acceptance; only punctuation changed there, 33 substitutions). The
en-dashes left on the landing are a numeric range in a CSS comment and the score separator glyph
in the showcase, both deliberate.

**3. The personal handle.** Gone from every place a person could type it: `/docs`, `README.md`,
the npm README (`cli/README.md`), `cli/plugin/README.md`, `docs/AGENT_CLI.md` and two script
comments. It survives only inside `href`s, because that is where the repository is. `e2e/docs.spec.ts`
now fails if it returns to the page's visible text.

**4. Fresh-eyes review.** A read-only reviewer with no context read the rewritten page against the
code. It found four false claims; all four are fixed in `884bcb60` (see below). Its voice findings
were applied where they were right and skipped where its replacement was worse than the original.

## The research question, answered

`claude plugin marketplace add` accepts exactly four source forms: `owner/repo` (optionally
`@ref`), a full git URL on any host, **a plain HTTPS URL to a `marketplace.json`**, and a local
`./path`. A bare domain is rejected, and there is no well-known-path resolution. The marketplace
NAME comes from the `name` field in the manifest, not from the source. A URL-hosted marketplace
cannot use a relative plugin `source`; the entry has to name github / url / git-subdir / npm /
archive / command instead.

So there IS a handle-free route, but it needs either a GitHub org or a hosted file, and both are
owner actions. **Nothing was created.** `/docs` leads with the npm route, which never names the
handle, and the two options with their costs are in
`docs/acceptance/owner-queue/2026-08-26-a-marketplace-address-without-your-handle.md`.

## Everything documented was run first

- `claude mcp add noacg --scope project -- npx -y @noacg/cli mcp` in a throwaway directory: added,
  listed, config inspected, removed.
- The MCP server itself: a real stdio `initialize` + `tools/list` against
  `npx -y @noacg/cli@0.2.0 mcp`, which answered with `serverInfo` and the tool list.
- `npm i -g @noacg/cli` -> `noacg --version` -> `0.2.0` -> uninstalled.
- `claude plugin marketplace add ./` from this worktree: succeeded, resolved the marketplace name
  `noacg-studio`, removed again. (`.` alone is rejected; the error names the accepted forms.)
- `claude mcp add --help` for the scope default (`local`), which is now documented.

## What the review found that was actually wrong

All four verified against the source before changing anything:

- **Rehearse mode does not exist.** `ProductionPage.tsx:2513` renders two states, `● SHOW` and
  `○ NOT PUBLISHED`. `docs/PLAYOUT_DASHBOARD.md:429` says so outright. The page described a
  Rehearse/Show pair and then used it as troubleshooting advice. Both gone.
- **The CasparCG 2.3.x row contradicted the 2.4.x row beneath it.** Both are half-true about
  different things: the browser output page is compiled down and shimmed for 2.3.x
  (`PLAYOUT_INTEGRATION.md:99-104`), while 2.4/Chromium 117 is the floor the graphics themselves
  are designed against (`PLAYOUT_COMPATIBILITY.md:28,44`). Now scoped, with the engines that doc
  actually records instead of an invented "6x to 8x" range.
- **Safari was stated as measured.** `CASPARCG_CONNECT.md:97` and `:270` record it as an expected
  limit, never tested, no Safari on the machine. Now says so, three lines above the callout headed
  "What has been verified".
- **The data key's scope was overstated** ("write data only"): `GET /api/data/state` reads the tree
  back with the same key, and `DATA_API.md:29-36` retracts the older wording for exactly that
  reason. The play/stop/take/clear half is correct and kept.

Smaller truth fixes: the credits "complete set" was missing the 48-character role-label rule
(`ROLE_LABEL_MAX`, `src/templates/endCredits/shared.ts:173`) and is no longer called complete;
`docs/svg-samples/` holds five files, not four; `/api/data/patch` takes POST as well as PATCH.

Followability gaps closed: how to make and publish a production at all (a precondition of five
sections, explained by none); that `scaffold`'s generated half is rewritten by `validate`, so the
old step 2 told people to edit files their next command would overwrite; that Codex needs the skill
copied as well as the server added; that `claude mcp add` defaults to one directory; where a
CasparCG template folder is and what `<template-name>` means; that an exported overlay is a zip;
`noacg doctor` as the move when a failure has no finding attached; the `viewBox` refusal; that the
import always strips `<script>`, `on*` and `<foreignObject>`; and definitions for "zone picker" and
"behaviour pickers", which the page used without introducing.

The de-hyping had also sanded the bluntness off outlined-text imports ("gives a better result").
Restored to what `SVG_AUTHORING.md:135` says: the stand-in is re-rendered type, the kerning is the
font's and not the designer's.

## The copy gate collided with this branch, and the collision reads backwards

`scripts/check-copy.mjs` landed on main while this was in flight. It ratchets per-file copy-tell
counts, and it fails in **both** directions. Taking main in turned this branch red on Build with:

    FIXED  docs.html  em-dash: 68 -> 0
    FIXED  index.html  em-dash: 33 -> 0
    FAIL - 2 entr(ies) improved and the baseline still holds the old number.

Not new tells. The tone pass had already taken all 101, and the baseline still recorded the
pre-drain numbers, which the gate refuses because a stale-high baseline hands the file back the room
it just gave up. There was nothing to rewrite: `npm run check:copy -- --update` drops both files out
of `scripts/copy-baseline.json` entirely, and that was the whole fix (`cbb4c214`).

**That makes this branch slice 1 of `docs/backlog/copy-tells-drain.md`** - the 101 public-facing
lines it called the highest-value, lowest-risk cut. Marked done there, with the remaining totals
corrected to 5,717 lines across 538 files, so nobody picks it up twice.

The wave orchestrator's advice for this failure ("rewrite the named lines") is right for the NEW
direction and wrong for the FIXED one; a session following it after a drain would hunt for text that
is not there. Passed to the two live sessions whose branches touch prose.

Worth knowing about the queue: this branch WAS queued (j-0053). The job ran, integrated main, CI went
red on the integrated sha, and `auto-merge` refused at preflight phase 3. That is the flow working.
A wave view that reads branch-ahead state rather than job history will report it as "never queued".

## Verified

- `npm run build` green on all four commits, including after the copy gate arrived.
- `e2e/docs.spec.ts` + `e2e/landing.spec.ts`, 11/11 through the run queue, twice. Two new tests:
  one clicks the install block's copy button and reads the command back off the clipboard, one
  fails if the handle reappears in visible text.
- CI: run 32978314227 green on `a19bdd76` (the pre-integration tip), then red on the integrated
  `562c5acb` for the copy baseline alone with all nine E2E shards green, then a dispatched full run
  on `cbb4c214` after the fix. Dispatched rather than push-triggered on purpose: that last commit
  touches only a JSON baseline and a backlog file, so a plan from the previous push would have
  skipped every shard and preflight would have refused the run as unproven.
- The page driven in the real dev server: no console errors, sixteen blocks and sixteen buttons,
  the button clear of the text even with the widest command scrolled fully right, no horizontal
  page scroll at 375px.

## Deliberately not done

- **The in-app Learn pointers** (import door -> `/docs#svg`, Settings Playout -> `/docs#casparcg`,
  Data tab -> `/docs#data`). The tail item, and the correctness pass took the room. Nothing is in
  flight in `src/components/` now, so it is a clean next session; each pointer needs its own spec.
- **Two defects the review surfaced that are not this branch's.** Both filed as task chips:
  `docs/PLAYOUT_INTEGRATION.md:289` still carries the Rehearse troubleshooting row and
  `docs/CLOUD_PLAYOUT.md` still describes a three-state mode strip; and the production data key has
  no owner-facing surface at all (`fetchProductionDataKey` has zero callers), which makes the whole
  Data API guide describe something a hosted user cannot do.
- **The handle in `href`s** (about 500 exported template footers, the terms and privacy pages, the
  npm `repository` field). Only a repository move fixes those, which is the owner-queue item.

## For the owner

Two files in `docs/acceptance/owner-queue/`: the marketplace-address decision (needs an answer),
and the walk item for the page itself (route: open `/docs`, copy one command with the button, read
one guide aloud).
