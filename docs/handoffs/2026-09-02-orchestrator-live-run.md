# 2026-09-02 - the first live wave on the rewritten orchestrator contract

Branch `claude/orchestrator-live-run-test-146f79`. This is the answer to item 1 of
`docs/handoffs/2026-09-02-orchestrator-review.md`: *"The first real wave on the rewritten contract
is the test that matters... sixteen dry runs are evidence, not the night."* The wave ran 15:20 to
21:30 as a day wave, planned and launched from inside the orchestrator session.

The plan, its heartbeat and every ruling are in the wave-state file, which is gitignored and lives
in the orchestrator home: `.claude/worktrees/orchestrator/docs/handoffs/2026-09-02-day-wave-plan.local.md`.
This file is the part that belongs in the repository.

## What the wave landed

Three of four rows landed on `main` the same day. Row B was routed to Codex, which is user-started
by the routing contract, and the user did not start it - so it is unstarted, not failed.

| row | branch | what landed |
|---|---|---|
| A | `claude/a-teams-spec-diagnosability` | a settle-wait that misses a third settled state now fails in **29 ms naming `teams-load-error`** instead of timing out for **20009 ms** on "element(s) not found"; happy path still 5 ms, a genuinely stuck screen still 20 s, so the speed was not bought by weakening the wait. Sibling sweep over five `.or(` sites found no other missed state, each verdict a source reading. `configured-suite` dispatched directly: 39/39, 0 skipped |
| D | `claude/d-mistake-trigger-hooks` | the machine-wide browser guard now catches eight wrapped spellings that walked past it (`bash -c`, `sh -c`, `nohup`, `start`, `powershell -Command`, a PowerShell `if ($?) { }` block, a bare `&` sequencing `npx playwright test`, and the sweep equivalents), with the enqueue exemption routed through the same helper so the hole could not move; `docs/MISTAKE_TRIGGERS.md` records which lessons can become hooks and which cannot; destroying an untraced handoff now raises a notice |
| C | `claude/c-ograf-host-page` | an exported OGraf graphic no longer restyles the renderer's host page - the stylesheet is re-addressed to the graphic's element, and a **fail-closed, browser-parsed export gate** refuses any export whose CSS would still reach the renderer. 0 px drift against the studio frame; eight backlog receipts hold what the check found and this row deliberately does not fix |
| B | not started | the landing-gate CI selector faults and the `cmdCancel` terminal-job overwrite. Routed `codex`, fallback `opus high`; a Codex row is never auto-launched |

## Orcestrato live-run evidence

### What worked, and would not have worked without the rewrite

- **The home worktree removed the whole class of stale reads.** `orchestrator-home.mjs`
  fast-forwarded three times during the wave (`6887d527 -> 8c0848c0 -> c66604b8 -> dddde7c1`).
  Twice that mattered: `claude/walk-0c61a1` landed *while the plan was being written*, and without
  the re-run the plan would have kept planning around files nobody held.
- **`wave-plan-check` refused the plan once, correctly**: row B named `codex + opus` in POOL and
  "hand it to opus high" in the prompt, and the check wanted the literal word "fallback". The
  refusal was right even though the grammar behind it is a word match (see friction).
- **Routing as a step produced four different pools** - `opus medium`, `codex`, `fable high`,
  `opus high` - decided from the plan-time snapshot rather than by omission. The `opus high` rung
  on D earned itself: D found its own over-refusal (brace splitting manufactured a part and refused
  `jq '.scripts | {test:e2e}' package.json`) **by probing eighteen innocent commands**, not by
  rereading its regex. The `fable high` rung on C earned itself too - the row's real content turned
  out to be a rendering decision with catalog-wide consequences.
- **The receipts line changed what the wave started.** Two of four rows came from unstarted owner
  receipts (`ograf-host-page-restyle`, `mistake-trigger-hooks`), both 1 day old and both authorized
  by name. Under the old contract they would have sat behind the handoff folder.
- **The rewind test earned its place by saying NO.** Row C's check returned ~25 findings including
  two regressions the change itself introduced, which felt like a rewind. `recovery.md`'s three
  signals fire zero times: one `/check` round rather than two consecutive rounds of the same class,
  every defect stateable without reference to the attempt's reasoning, the assignment not misread.
  Repairing was right, and the test is what made that a decision rather than a nerve.
- **`WHY is a target, not a route` fired twice, both times correctly.** Row A was told to delete
  eleven handoff files and deleted nine, keeping the two that `docs/backlog/` still cites as
  Evidence - one of which row D was reading at that moment. Row C found that the plan's GATE line
  was factually wrong and dispatched the right workflow instead.

### What caused friction

1. **THE STOP HOOK DID NOT FIRE, TWICE.** Rows A and C each ended a turn saying they were waiting
   on background work that would wake them. Nothing would have. `scripts/hooks/stop-wait.mjs`
   exists to refuse exactly that turn, and both prompts carried the rule verbatim, so the hook and
   the text channel both failed. Cost: about 40 minutes of dead wall clock per occurrence, and the
   only thing that recovered either was this session being awake to notice. **On a night wave
   nobody would have found it until morning.** Note the shape: these were the rows' OWN background
   Bash jobs, not subagent notifications, so the existing prompt line about fan-out does not cover
   it. Filed: `docs/backlog/stop-hook-background-wait-gap.md`.
2. **`/check` in a launched session is not a leg the session runs - it is a fan-out the
   orchestrator receives.** Row C's seven check angles all reported here, ~25 findings, six
   separate relays each needing a scope ruling. The orchestrator became the adjudicator of another
   session's quality gate, which is not a role the contract sizes it for. And the reverse tell was
   already in three handoffs today - "simplify: inline - the skill returned fan-out instructions,
   which in a launched session means it did not run". **It ran every time.** The reports went to
   the wrong address, and sessions have been recording a leg as not-run when it ran and found
   things. Filed: `docs/backlog/check-fanout-in-launched-sessions.md`.
3. **`MINTS: LAST landing` is unenforceable, and this wave proved it.** D was the designated last
   landing and queued FIRST, while C was still working - not by disobeying, but because "land last"
   and "queue at your true end" cannot both be obeyed by whichever session finishes first. Holding
   a queue slot means ending a turn on a wait, which the Stop hook refuses. The plan can mint the
   slot; nothing can honour it, because `auto-merge.mjs` takes no ordering input from the plan.
   Mitigated by hand - C was messaged with exactly what tightened - which is the human-shaped relay
   a wave exists to remove. Filed: `docs/backlog/wave-last-landing-unenforceable.md`.
4. **The confirmation pass does not cover CI job names.** The plan told row A to confirm
   `configured-suite` among `ci.yml`'s jobs. It is a separate workflow
   (`.github/workflows/configured-suite.yml`), so the instruction could never be satisfied. The
   pass checks that paths exist and that commands live where their kind lives; a workflow-versus-job
   claim is neither, and nothing would have caught it. The row did.
5. **`merge-order`'s verdict words need `--branch`.** The core says to quote `clear` / `caution` /
   `hold`. The plain invocation prints `free: conflicts with nothing in flight` and `--json` returns
   `verdict: null`; only `--branch <b>` prints `VERDICT: clear`. A planner following the core
   literally would quote words the command did not say.
6. **`wave-plan-check`'s fallback rule is a word match**, `/\bfallback\b/i` over the row and the
   prompt text. It refused a row that named its fallback pool in the POOL column as `codex + opus`
   and again in prose. Correct outcome by luck of phrasing rather than by structure.
7. **A "consumed" handoff that is deliberately KEPT has no vocabulary.** Row A rightly kept two
   files the backlog cites; the drain still prints them as `consumed`, which reads as "should have
   been deleted". The four classes need a fifth, or `consumed` needs to stop implying deletion.

### What the next architecture review should investigate

- **Finding 2 first.** If `/check`'s legs fan out and their reports route to the orchestrator, then
  every launched wave session either misreports its check or hands its findings to a session that
  has to adjudicate them across scope boundaries it cannot see. Both happened today. This is
  upstream of the wave contract - it is about what a slash command means inside a subagent.
- **Whether the landing queue should take a per-wave order.** Finding 3 has only two honest
  resolutions and the contract should pick one rather than keep minting a slot nothing reads.
- **Two structural findings surfaced by row C that outlive it.** The OGraf boundary question -
  a shadow root or per-graphic iframe instead of a hand-rolled CSS parser, with `@font-face` in
  shadow trees as the real counter-argument and lifting those rules into `document.head` as the
  answer - is a design row, `fable high` or an `so` second opinion, not a build row. And 30 files
  under `docs/acceptance/owner-queue/` lack the `kind:`/`date:` front matter that `/walk` reads.
- **One relayed claim was wrong and this session caught it**, which is worth generalising: the
  altitude review asserted that `:where()` widens the inbound specificity leak. It does not -
  `:where()` contributes zero specificity, so a rule was `(0,0,1)` before the rewrite and `(0,0,1)`
  after. A relayed finding is a claim like any other. Six reports passed through unexamined would
  have put a wrong fact into a landed handoff.

## What is left

- **Row B was never started.** The work is real and specified: `docs/backlog/landing-gate-run-selection.md`
  (four faults in `waitForCi`, filed 2026-08-26, all with line numbers) plus `cmdCancel` at
  `scripts/jobs.mjs:402` writing `cancelled` over an already-terminal job. Its full prompt is in
  the wave-state file. Do NOT re-plan `NOT RANKED - no local branch` from
  `docs/handoffs/2026-09-01-j-landing-success-state.md`: it is already fixed by `02a4f722`.
- **The three new handoffs** (`2026-09-02-a-`, `-c-`, `-d-`) are unclassified by design; the next
  wave's plan owes each a line.
- **The night wave** was planned for 21:30 with P1 Teams stage 4 (the team productions list) as its
  candidate large row - big, browser-heavy, unattended-friendly, no schema prerequisite.

## `/check`

- `review: inline` - this branch is four documentation files with no executable content; the
  review angles that apply (are the claims true, do the filed items match what was observed) were
  done by re-deriving every number in the table above from `git log`, `npm run jobs` and the
  landed trees rather than from the rows' own reports.
- `simplify: inline` - three findings were merged into one backlog file each rather than one per
  symptom, and the wave-state file's heartbeat was left as the long form because it is gitignored
  and is the evidence.
- `verify: inline` - `npm run build` green on this branch. Every claim in "What the wave landed"
  was re-derived from the repository, not taken from a subagent's report; the two measurements
  quoted (20009 ms -> 29 ms; 0 px drift) come from the rows' own runs and are attributed as such.
