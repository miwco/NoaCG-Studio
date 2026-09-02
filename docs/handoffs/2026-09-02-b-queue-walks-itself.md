# Handoff - session B, the queue walks itself (2026-09-02)

Branch `claude/b-queue-walks-itself`, worktree `.claude/worktrees/agent-ade8f71d13902aa3f`.
Goal: every open owner-queue item carries a kind saying WHO can settle it, every item an agent can
settle has been driven and settled with the evidence in the commit, and what is left for the owner
is ordered with the things that actually need him first.

**The queue went from 62 open files to 42, and nothing in it now carries `kind: agent`.** Twenty
items were driven and deleted, two came back unsettled and stay open with what I found written
into them, and one of his own items gained a measurement that changes whether the walk is worth
his minute.

## The vocabulary, and why it is a widening

`kind:` now answers one question - who can settle this - with five values: `walk` (him, at the
computer), `walk-p` (him, from his phone: a taste ruling, a preference, a direction call),
`owner-action`, `hardware`, and `agent` (an agent confirms it by driving the product; not for him
at all). The decision rule is one paragraph in `docs/acceptance/OWNER_QUEUE.md`'s shape section,
where a FILING session reads it, so routing happens when the item is written rather than as triage
somebody does later. `/walk` presents the phone list first, because a phone item costs him a
sentence and a desk item costs five minutes at the machine.

`scripts/check-owner-queue.mjs` accepts the two new values and still accepts the three old ones.
That was deliberate and is worth keeping: seven sibling sessions were filing owner-queue items
while this landed, and a tightening would have redded their builds for a line their prompts never
saw. The one new rule the check leg added - `serves:` must read `now` when present - is safe by
the same test, because no item outside this branch carries the key at all.

## The classification, in one table

| kind | count | what it means |
|---|---|---|
| `walk-p` | 18 | a ruling or preference he can give in a sentence, from anywhere |
| `walk` | 12 | needs the product on screen |
| `owner-action` | 5 | an account, a signature, money |
| `hardware` | 4 | a playout box, an SPX server, an audience |
| `done: true` | 3 | kept as a record, never presented |

The call worth arguing with, so the next session can: **an item whose only surviving human
question is an OFFER - "if you would rather it cropped, say so and it becomes its own piece of
work" - is `agent`.** The product is not blocked on it and the offer can be made again any time. An
item that asks him a question it needs answered is not. Applying that rule is most of what moved 22
items off his list.

The second call: **reading a document and ruling on it is `walk-p`, not `walk`.** The editor
research, the control road, the condense cuts, the AGENTS.md cuts and the programme register have
all been sitting unread because they were filed as desk work. None needs the dev environment.

## What was walked, and how

The instrument matters, because it is reusable. The wizard preview iframe is sandboxed, so nothing
can be measured inside it. Instead each SVG check mounted the same `srcdoc` in an unsandboxed
frame, called `update()` and `play()` the way a playout server does, and read real bounding boxes
at 1920x1080. That is a stronger check than looking at the preview, and it is how claims like
"stays at the size you drew it" became numbers.

The twenty deleted items and the one-line evidence behind each:

1. **2026-09-01-b-one-question-one-field** - the multiline board gives five field rows with the
   whole question in one, at the designer's 52px, and a 117-character question re-wraps rather than
   shrinking; the Inkscape lower third keeps 56/30/22px in Archivo and Inter with its drawn
   `letter-spacing: 2px`, and its panel renders at the drawn 190px.
2. **2026-08-26-the-too-long-ladder** - arrives growing, the dropdown is in the ruled order, a
   72-character name grows the panel to 1620px whose right edge lands 150px from the frame edge
   mirroring the drawn left inset, and on "gets smaller" an 87-character name squeezes 54px to
   29.7px and stops at 1100 against the panel's 1150.
3. **2026-09-02-your-board-measures-its-own-plates** - the picker reads `q bg - 1238 x 259` and the
   rendered plate measures 1239x260, so the rotation is read; the answers do not move at all, which
   is better than the item claims.
4. **2026-08-26-svg-mapping-grows-by-itself** - the lower third arrives on a growth answer with no
   picker (one candidate shape), the scorebug arrives on shrink, and every section on Fields and
   Animation is a title, one muted line and an information dot.
5. **2026-09-01-figma-picture-swaps-on-air** - a Pictures row named "Guest photo", off by default,
   becomes `f2` with `ftype: filelist` when ticked; the image href goes 130 -> 118 on a swap and
   back to 130 on a clear, and the Illustrator control does the same (114 -> 118 -> 114).
6. **2026-09-02-l-photo-panel-grows** - the line reads "Strap backplate is the shape that grows",
   ticking the picture leaves the growth answer alone, and a 45-character name widens the
   backplate 980 -> 1271px with the name still at 48px.
7. **2026-08-30-quiz-state-pickers-fit** - the widest option measures 131px against 153px of inner
   width in all twelve pickers, all 169px wide at x=236/415/593; two per row at 1280 and one at
   980, equal widths at every step.
8. **2026-08-28-rehearsal-machine-pre-run** - the four claims re-drive clean and the third has
   improved past itself; a fragment of the student rehearsal walk, so its two OWNER questions moved
   into that item rather than being walked separately.
9. **2026-08-27-new-graphic-from-every-surface** - the door sits at x=250 on Home and x=110 on a
   production dashboard, before the spacer and at the opposite end from All out, carrying no
   `primary` class; `e2e/project.spec.ts` pins the same two properties on all five surfaces.
10. **2026-08-29-font-licence-travels-inside-fonts** - a built OGraf package carries
    `fonts/FONT_LICENSES.md` (6939 bytes, full OFL 1.1, 19 copyright lines) and no root copy, on
    all six lower-third designs.
11. **2026-09-02-c-ograf-host-page** - the built `graphic.mjs` has zero selectors addressing the
    document (no bare `html`, `body`, `:root` or `*`) and `GRAPHIC_BOX_CSS` scoped to
    `:where([data-noacg-graphic=...])`, on all six designs. Its own caveat stands: no real renderer.
12. **2026-08-29-catalog-checks-only-what-changed** - a blank line in `lt01.ts` prints one design
    and the five narrowed commands; the same line in `shared.ts` prints the whole-catalog form.
13-15. **the three jobs-listing items** - checked together, since they are three readings of one
    block: the row carries commit count, age and worktree; a dead landing reads `LANDING FAILED
    j-0352 ... (exit 1)` with log and re-queue commands; six cleanly landed branches sit in their
    own list with no fabricated refusal; and with one untracked file the row ends "- 1 uncommitted
    file(s)".
16-18. **the three Antigravity items** - `harness:usage` prints the ANTIGRAVITY block with its four
    columns and its refusal to add them, plus the Codex window percentages. Both actions they asked
    him for are already done: `agy` answers from PATH, `agy models` returns the list with no prompt,
    and `~/.gemini/antigravity-cli/settings.json` exists with his allow-only choice.
19. **2026-09-01-render-smoke-orange-dot** - opened the archived frame: dark 1280x720, FIELDS OK f20
    in white, blue bar, orange square dead centre below it.
20. **2026-09-02-mcp-server-one-process** - the launcher resolves the global CLI and imports it in
    process rather than spawning; the two processes visible here are the pre-restart case the item
    names itself.

## What is left, and why

**Two items came back NOT settled.** Both are honest failures of the claim, not of the check:

- `2026-08-27-counting-graphics-start-at-zero` - the Rising Total fix does not exist.
  `docs/backlog/counting-playout-remnants.md` is still `state: unstarted`. Reclassified back to
  `walk`; it is waiting on work, not on him.
- `2026-08-28-plainer-style-names` - the rename has not landed either. That one is deliberate: he
  parked it himself for a not-busy day and it is tracked as
  `docs/backlog/apply-plain-style-names.md`, which cites the queue file for the verbatim lists.
  Marked `done: true` so it stops being presented without breaking that pointer.

**One of his own items gained a measurement.** `2026-09-02-text-knows-its-box` stays open, but both
claims that failed his walk now measure correct on `main`: a short "Who won?" sits dead on the plate
centre at every length tested, and a 124-character question wraps inside the plate at the drawn
36px rather than running off it. An agent measuring that is not him looking at it, which is the
whole point of the queue - but the re-walk is now worth his minute.

**The order.** Priority is one optional front-matter key, `serves: now`, set on the nine items whose
work serves the `## NOW` push. Below it, `answered: true` marks the re-looks he is owed, then newest
first. It lives in each item's own front matter rather than in a ranked list for the same reason the
items are one file each: five sessions editing one ordered list at the same offset is a conflict,
and a conflict strands a landing.

## What the next session should know

- **The measurement harness is worth reusing.** Mounting the wizard's `srcdoc` unsandboxed and
  driving `update()`/`play()` turns "does the text fit" into numbers. It is a dozen lines of
  page-context JavaScript and it caught the difference between "the preview looks wrong" and "the
  emitted graphic is wrong" twice tonight.
- **`preview_start` starts the dev server in the MAIN checkout.** It did it here, on port 5174,
  before anything was measured. `npm run dev:worktree` is the only thing that serves a linked
  worktree (`docs/DEV_PORTS.md` says so and names the same trap). Everything measured here ran on
  this worktree's own reserved port 5276.
- **`kind: agent` has no reader outside `/walk`.** The count is zero today because this branch
  drained it, and the first session to file one re-opens the hole - the orchestrator's fill order,
  `npm run jobs` and the session report all know nothing about it. Filed as
  `docs/backlog/agent-queue-items-have-no-reporter.md` with the shape of the reporter it needs.
- **Deleting a handoff breaks pointers nothing checks.** `check-docs-index` exempts
  `docs/handoffs/` by design, so two open backlog items and one keep-decision were left pointing at
  files this branch removed. All three are repaired, and the pattern to use is
  `git show <sha>:<path>`. Worth knowing before the next drain: the OGraf checker handoff had been
  wrongly deleted and restored once already, and its keep-note is now corrected rather than left
  contradicting the tree.

## The check, honestly stated

`review: delegated` - the code-review skill (level `high`) forked and returned 14 findings directly.
Scope-checked against phase 1 first: it named this branch and files inside this worktree's changed
set. All 14 confirmed against the surrounding files; 13 fixed here, 1 (the missing agent-item
reporter) filed as backlog because the reporter is code outside this branch's scope.

`simplify: inline` - the simplify skill returned fan-out instructions rather than a delegated
result, so the four angles were covered here. Two findings, both fixed: the priority rule was stated
twice in `OWNER_QUEUE.md` and is now defined once in the shape section, and the ordering section's
numbered list collapsed to one sentence. Reuse and efficiency were clean - `parseFrontmatter`,
`QUEUE_DIR` and `KINDS` are reused rather than reimplemented, and `SERVES` follows the `KINDS`
pattern exactly.

`verify: inline` - `npm run build` green (exit 0) on `ba5a17f4`, including `check-owner-queue`
(42 items) and its paired test (20/20). CI green on `5ccd22aa` with Build, Factory gates, E2E plan
and CI gate all `success`; the E2E shards were SKIPPED by the plan job, which is correct and not a
cancelled run - no `src/`, `api/` or `e2e/` file changed on this branch, which is also why
`test:e2e:affected` does not apply. The product claims were observed in a browser, not inferred
from a green build.

Verdict stamp at `.git/noacg-jobs/checks/claude-b-queue-walks-itself.json` (per-machine, not
committed).

## State

Five commits. Working tree clean. Queuing for merge next; nothing here needs the owner before it
lands.
