# Mistake triggers: which lessons become hooks, and which cannot

The owner asked on 2026-09-01: "we keep running into the same mistakes... why can't we find those
when we need them?" The short answer is that a rule in a contract fires only if somebody reads the
contract, and a session reads a contract at the start of its work rather than at the moment it is
about to make the mistake. A hook fires at the tool call.

That is not an argument for hooking everything. A hook that blocks wrongly is worse than the
mistake it prevents, because a refusal is paid by every session on the machine while the mistake
was paid by one. This doc is the rule for deciding, so the next hook is a decision rather than an
impulse.

## Four places a lesson can live

Before asking "should this be a hook", ask which of the four it is. Most lessons that feel
hookable are really one of the others.

| Where | Fires | Good for | Cost of being wrong |
|---|---|---|---|
| Hook (`scripts/hooks/`) | every matching tool call, in every session | a mistake visible in the ARGUMENTS of one call | a false refusal blocks the whole machine, silently and repeatedly |
| Gate (a `scripts/check-*.mjs` in `npm run build`, or a landing check) | once per build or per landing | a mistake visible in the TREE, not in any one call | a red build, which is loud and local |
| Contract (`AGENTS.md`, `docs/`, `.agent-workflows/`) | when somebody reads it | judgement, taste, and everything with no mechanical test | the lesson does not fire at all |
| **Memory** (the per-project store behind `MEMORY.md`) | when a session happens to recall it - **the weakest trigger there is** | the handful of facts NO file in the repo can hold: the owner's taste, money, direction, and what a human has not yet looked at | it constrains today's work with something that stopped being true, and nothing says so |

The gate row is the one that gets forgotten. `wave-plan-check.mjs`, `owner-receipts.mjs --check`
and `check-docs-index.mjs` all catch mistakes that no single tool call contains, and each would
have been a bad hook: the fact they need is the state of the whole tree.

**The memory row is the one that gets ABUSED**, because writing a memory is the cheapest way to
feel like a lesson was learned. It is also the weakest, and the section at the end of this file is
the rule for keeping it small.

## The test for a hook

A lesson has a TOOL SHAPE when all four hold. Fail any one and it is a gate or a contract.

1. **It is decidable from the call itself.** The hook sees one tool's arguments plus the session's
   cwd. If deciding needs to know what the session INTENDED, it is not hookable. A hook fires per
   tool call, so a wrong judgement inside a correctly shaped call is invisible to it.
2. **The facts it needs are cheap and reliable.** Git, the process table, the job queue and the
   filesystem are all reachable, but the hook on `Bash` runs before every shell command in every
   session, so anything expensive sits behind a pure text gate and a lazy import. `warn-command.mjs`
   costs 12 ms over a bare node start on an ordinary `ls`, and 195 ms only on an actual commit.
3. **The failure it prevents is SILENT.** This is the strongest reason to build one. A mistake that
   announces itself already has a mechanism: you see it. The three refusals that exist all guard
   failures that report nothing, or report green: a branch in the primary checkout makes a build
   gate the wrong branch and still print a pass; two browser jobs on one laptop just make the
   machine stop responding; two branches minting one migration number merge cleanly and surface
   hours later on somebody else's push.
4. **A sanctioned alternative exists and can be named in the message.** A refusal with no next
   move teaches people to route around the guard. `npm run dev` names `npm run dev:worktree`; the
   browser mutual exclusion names `:queued` and the job queue; the branch refusal names the
   `git worktree add` recipe.

## Refuse or warn

Default to WARN. Refuse only when the check is EXACT, meaning both of these:

- there is no legitimate reading of the call that the matcher would catch, and this has been
  measured against real commands rather than reasoned about; and
- the mistake cannot be undone by the session noticing afterwards.

The channel forces the choice more than it looks. `PreToolUse` can only reach the model by
BLOCKING: an allowed call's reason goes to the user, not to the model, so "warn before" does not
exist. `PostToolUse` can only warn, since there is nothing left to block. So a rule that wants to
advise rather than refuse has to run after the fact, which also means it needs a fact that is only
true afterwards. For the landing-pin notice the two agree: the fact it needs is whether the tip
actually moved, so an empty commit stays silent and the notice cannot cry wolf.

Weak evidence is a reason to warn, and it should be said out loud. `warn-edit.mjs` is a notice
rather than a refusal because it is the only one of the three with no dated incident behind it,
only the collision class the merge-order contract already names.

**Every hook fails OPEN.** `gitOutput` answers null when git cannot answer, and every caller treats
that as "nothing to say". A hook that cannot tell must not refuse.

## How a hook is verified

Reading the code is not verification, and neither is a passing unit test on the matcher. The
matcher can be right while the hook never reaches it.

1. **Red first, against the real hook.** Pipe a real event JSON into the real hook file and read the
   exit code. If the rule needs the world to be in some state (a job running, a job queued, a branch
   present), put it in that state with an inert stand-in and take it back down afterwards.
2. **Both directions, always.** The real incident case that must fire, and the innocent case that
   must not. Over-refusal is the expensive direction, so the innocent list should be longer.
3. **Pin both in the unit tests**, with the measurement in the comment. The matchers live in
   `scripts/command-match.mjs` rather than in the hook precisely so they can be imported: a hook
   reads stdin at module top level, so importing one to test it hangs.
4. **Say what it costs.** Measured, on the common case, not the rare one.

The handoff notice is the worked example for the state half. Its "must fire" case is a real
handoff the current wave plan marks `deferred`, deleted for real in a real checkout; its "must not
fire" case is the nine-file drain a wave row performs every wave, deleted the same way. Same folder,
same command shape, opposite verdicts, and what separates them is the record rather than the
document. `scripts/handoff-trace.mjs` carries the reasoning.

A hook that reaches for a fact outside the repo - the push notice asks GitHub - is verified against
the real source, bounded, and silent when it cannot answer: `gh` under a ten-second timeout, null on
any failure, and the must-fire case is a real cancelled run found with `gh run list --status
cancelled`, not a fixture.

The 2026-09-02 widening is the worked example for the matcher half. With an inert stand-in on the
process table,
`npm run test:e2e` was refused and eight wrapped spellings of the same command were allowed. The
first fix then refused `jq '.scripts | {test:e2e}' package.json`, because splitting on braces
manufactures a part out of an argument. That over-refusal was found by probing eighteen innocent
commands, not by thinking harder about the regex.

## What fires today

| Hook | Event | Verdict | The mistake |
|---|---|---|---|
| `guard-command.mjs` | PreToolUse `Bash`/`PowerShell` | deny | a hand-started dev server on a checkout's port; a branch created in the primary checkout; a commit message carrying agent language, an em dash or a `Co-Authored-By` trailer; a commit sweeping in `dist/`; a foreground poll of the job queue; browser work started while another browser job is live anywhere on the machine; a `git push` and a `gh workflow run` in one command, which is a coin flip over which run survives |
| `guard-edit.mjs` | PreToolUse `Edit`/`Write` | deny | editing a generated or vendored file by hand |
| `guard-preview.mjs` | PreToolUse `mcp__Claude_Browser__preview_start` | deny | the dev-server door opened from a LINKED worktree, which serves a sibling checkout's page as this branch's work |
| `guard-agent-launch.mjs` | PreToolUse `Agent` | deny | a wave prompt whose `TOUCHES` or `READ` line names a path that exists neither in the launching checkout nor on `origin/main` |
| `spawn-task-guard.mjs` | PreToolUse `mcp__ccd_session__spawn_task` | deny | a background-task chip minted for work the session could have done here or filed under `docs/backlog/` |
| `warn-command.mjs` | PostToolUse `Bash`/`PowerShell` | warn | a commit that just staled a queued landing pin; a handoff deleted while it still listed open items no wave plan traces; a follow-up push whose earlier CI run never finished, so the new run plans past a delta nothing covered |
| `warn-edit.mjs` | PostToolUse `Write` | warn | a new migration whose number is already claimed on another ref; a handoff overwritten so its open items are gone |
| `lint-file.mjs` | PostToolUse edits | warn | lint findings in the file just written |
| `stop-wait.mjs` | Stop / SubagentStop | warn | a turn that ends waiting on something that cannot wake the session |
| `session-start.mjs` | SessionStart | notice | what landed, what is running, what finished while you were away |

## What has a tool shape and is not built

Each of these passes the four tests and is unbuilt for a stated reason, not by oversight.

- **Occupancy of the primary checkout, not just branch creation.** `git checkout <existing-branch>`
  there causes the identical failure, and the 2026-08-28 incident is about a branch BEING there.
  It is unbuilt because `git checkout foo` and `git checkout src/foo.ts` are the same command line
  with the same shape, so telling them apart needs the filesystem. That is a real decision, not a
  detail: no refusal in this repo stats the working tree today, and one that does can be wrong when
  a file appears or disappears between the check and the run.
- **A migration created by shell redirect.** `cat > supabase/migrations/0053_x.sql <<'EOF'` creates
  the file with no `Write` event, and this environment's own instructions steer towards heredocs.
  Closing it means teaching the shell notice to read a redirect target, which is a different
  matcher with a different failure mode. Recorded in `warn-edit.mjs`'s own header, where it fires.
- **A background fan-out spawned from a launched session.** Listed here from 2026-09-02 as a warn,
  on the premise that a launched session never receives its subagents' completion notifications.
  On 2026-09-05 the premise was measured twice from the same launched row, and the two
  measurements disagree, so it is UNRESOLVED rather than refuted. A background Explore agent the
  row launched itself through the Agent tool reported back mid-turn, appended to the result of the
  row's next blocking tool call. The eight review finders the code-review skill forked from the
  same row reported to the orchestrator, none to the row, and reached it only through the relay
  file. The reading consistent with both, and with the nine stray reports of 2026-09-04, is
  narrower than any contract states: a report may reach a launched session while it is mid-turn
  and cannot reach one that has ended its turn, and which of the two the harness does for a given
  launch shape is not known. Until a second measurement separates the shapes the contracts keep
  their sentence, the relay stays the channel, and the hook stays unbuilt - a warn on every
  background launch would fire on the shape that works, and a Stop-time check (a turn ending while
  a background Agent has not reported) is the only shape both measurements allow. It would cost a
  whole-transcript read at every Stop. The signal to build it on is `agent_id`, which every hook
  event carries inside a subagent.
- **A local full suite started from a worktree before landing.** Eight handoffs of the 2026-09-05
  read name the rule, and the cost lands on OTHER sessions: the one browser slot held for 58 and
  126 minutes by a suite whose verdict CI would have given anyway. It is hook-shaped - `npm run
  test:e2e` with no spec, from a linked worktree - and unbuilt because the matcher for "the whole
  suite" against "a scoped run" has not been measured against real commands, and a wrong one
  refuses the scoped run the rule recommends. Until then it lives in the wrong place: a MEMORY
  entry (`e2e-cheapest-gate-first`), which is the weakest trigger there is. When it is built the
  entry goes.

## The 2026-09-05 read: fifty handoffs, and where each recurring mistake went

The three hooks that landed on 2026-09-05 were picked from evidence, not from a brainstorm: every
entry in `.agent-workflows/orchestrator/incidents.md` and every handoff from 2026-09-01 to
2026-09-05, fifty files, grouped by shape and counted. The count is how many handoffs carry the
same mistake. The point of keeping the table is the ROUTING, so the next reader does not re-derive
it: most of what recurs is not a hook, and saying which home it has is the answer.

| Recurring mistake | Handoffs | Home | Why there |
|---|---|---|---|
| A follow-up push cancels the earlier CI run and plans only its own delta; the new run reports green having skipped every shard | 16 | **hook, warn** (`warn-command.mjs`) | the moment is the push and the fact is whether the old tip's run finished, one `gh run list` away; what the remote held BEFORE the push is in the tool's own response, so a first push, a no-op and a rejection are silent by construction, and so is gh failing |
| Push and dispatch in one command, a coin flip over which run survives | 4 | **hook, deny** (`guard-command.mjs`) | exact in the command text, and the sanctioned shape is two commands |
| `preview_start` from a linked worktree serves a sibling checkout's page | 4 | **hook, deny** (`guard-preview.mjs`) | one stat decides it, the wrong page renders fine, and the shell guard's message never reaches a session that is not typing a shell command |
| A wave prompt naming a path that does not exist | 2 | **hook, deny** (`guard-agent-launch.mjs`) | exact, and the second half of the plan gate: the prompt a session is handed is a different file from the plan that was checked |
| "A green run is not a verdict until you read WHICH JOBS RAN" | 19 | contract | whether the colour was believed is invisible to any call; the push notice now names the command at the one moment the plan was narrowed, which is as close as a mechanism gets |
| A local full suite from a worktree before landing | 8 | hook-shaped, unbuilt (above) | needs the matcher measured; today a memory entry, the wrong home |
| An edit to a file another live row holds, or beyond the row's `TOUCHES` | 12 | queue-time gate (`merge-order.mjs`) + contract | a per-edit hook fails test 2: the fact is every other worktree's diff, and a git call across all of them on every `Edit` is the cost the doc forbids |
| A new spec that is not in `FOCUS` or the map never runs on the gate it was written for | 3 | build gate, unbuilt - `docs/backlog/unmapped-spec-never-runs-on-its-gate.md` | the fact is the state of two files against a directory, which is a tree, not a call |
| Ending a turn on a wait nothing will wake | 4 | built (`stop-wait.mjs`) | the 2026-09-04 widening and its false positive on quoted text both stay with that hook |
| A dev server left running is adopted by the suite | 3 | built (`guard-command.mjs` port check) | the 2026-09-05 case was a server killed mid-leg, which no call shows |
| A handoff deletion list that was wrong | 5 | built (`handoff-trace.mjs`) | |
| The instruction chains at their byte ceiling | 9 | built (`check:shared-instructions`) | |
| The row's premise was wrong, the bug did not reproduce | 9 | nothing | content of a correctly shaped prompt; the fix is the "reproduce first" step, which is a contract line where the work happens |

Two things the read taught about the METHOD, worth more than any row. First, the first real event
fed to the push notice was silent, and correctly so: the sha it named had two runs, the cancelled
push run and the green dispatch that cancelled it, and the rule as first written read only the
newest. The fix was the rule, not the plumbing - one finished run for the old tip is enough,
whichever it was - and it was found by feeding a REAL cancelled run from `gh run list`, not by
reasoning about the regex. Second, the fan-out entry above was measured by the row that was going to
build it, twice, with opposite results - and the first measurement alone would have landed as a
refutation of a sentence four contracts state. One observation is not a rule in either direction;
the standard this file sets for a hook, the real case AND the must-not-fire case, applies to a
refutation too.

## What cannot be hooked

These recur too, and a hook is the wrong instrument for every one of them. The tell is the same in
each case: the mistake lives in the CONTENT of a correctly shaped call, so a hook watching the call
sees nothing wrong.

- **Whether the work is actually finished.** Queueing a branch is the declaration that it is done,
  made by the only party who can make it. No check can tell a branch that is green, clean and
  `clear` from one whose session is still mid-conversation about what to do next.
- **Whether a handoff is honest.** Rounding an unverified claim up to done is invisible to any
  mechanism: the file is well-formed either way.
- **Whether a verification actually re-derived the result** rather than checking that a worker did
  as it was told. The commands look identical.
- **Whether a design is right, whether a graphic is any good, whether a message reads as
  human-written.** The owner queue exists because this is the one fact about shipped work that no
  file in the repo can hold. The commit-message guard is the useful counter-example and shows the
  edge exactly: it does not judge whether a message is good, it refuses five specific TOKENS that
  are never right, which is a tool shape hiding inside a judgement.
- **Whether the rule being followed is the right rule for this task.** A hook cannot know the task.

For all of these the mechanism is a person looking, or a review pass, or a contract that loads where
the work happens. That last one is the repo's own rule and it is worth restating here: a trap lives
in the contract that loads where it fires, not in a list somebody has to remember to read. A lesson
that fails the four tests is not homeless. It belongs in the nested `AGENTS.md` of the area it bites
in, and that is a real answer rather than a consolation prize.

## Memory: the weakest trigger, and how it stays small and current

Long-term memory is the fourth place, and it was outside this framework until 2026-09-03. That
omission is what the framework was built to prevent: a lesson with no firing moment lands in the
store, is agreed with, and is not done.

**The measured case.** The owner's rule that a surfaced task chip is started rather than offered
was recorded THREE times - `fix-dont-ask.md` (2026-08-30, *"a task chip is a queue item, not a
question - start it"*), a standing line in `MEMORY.md` itself, and a third record of him dismissing
chips on 2026-08-29. `MEMORY.md` loads into every session. It was read, agreed with, and not
applied on the 2026-09-02 night wave; the owner had to ask the next morning whether the task was
tracked, and it was not. **This was never a capture failure or a loading failure.** The entries
described a DISPOSITION - be the kind of agent that starts chips - and no procedure anywhere asks
"is there a chip?", so the rule had nothing to attach to. Rewritten as a step inside the wave
procedure (`.agent-workflows/orchestrator/report.md`, "Work the wave surfaces") it now fires.

That fixed it for a session running the wave procedure and left it unfired for every session that
is not. **On 2026-09-03 the same rule got its tool shape** in `spawn-task-guard.mjs`: minting a
chip is refused, and the refusal names the two places the work actually goes - here, on this
branch, or `docs/backlog/<slug>.md`. It is worth being precise about what changed, because the
disposition was never the problem. A session reaching for the chip tool has already decided the
work is somebody else's; no amount of prose reaches it at that point, and a refusal does. The
carve-out `launch.md` grants - a start that is genuinely the owner's call - survives as an
`OWNER-DECISION: <reason>` line in the prompt, which is a marker rather than a judgement because
no hook can tell whether the reason is true. What it can enforce is that one was written down.

### The charter - what may be a memory at all

Only what **no file in the repo can hold**: the owner's taste, money, direction and relationships,
and whether a human has looked at something. Everything else routes to a hook, a gate or a contract
by the tests above.

The test to apply before writing one: **can this fire at a moment?** If a session could be about to
get it wrong, and the moment is nameable, then it belongs where that moment happens - and a memory
is the wrong home however well written it is. "Start task chips" fires when a chip appears. "The
owner dislikes gallery rounds that reuse three graphic types" fires nowhere in particular, and is a
memory.

### Precedence - memory is EVIDENCE, never AUTHORITY

Highest first. A memory may inform a decision and may never veto one.

1. **What the owner says in the current conversation.**
2. **The repo's current state** - code, gates, contracts. It is verifiable, so it beats any
   description of it. A memory contradicting the repo is wrong by default and is deleted, not
   reconciled.
3. **The newest dated ruling** on that subject.
4. **Older entries: advisory.** They explain how we got here. They do not decide where we go.

Owner, 2026-09-03: *"I do not want something I said two months ago, under different circumstances
or with weaker models, to be treated as permanent truth."*

**A rule outlives its own why, and the why is the thing to test.** Worked example, measured the
same day: `merge-cost-is-the-bottleneck` says default to 3-4 sessions a night, because merge cost
is paid in OWNER HOURS. The landing queue was built after it was written. On the 2026-09-02 night
wave nine branches landed and cost the owner zero hours, so the premise is simply false now -
following the rule would have planned four rows instead of nine and shipped less. Neither entry was
badly written. Both had lapsed.

### The fields that make staleness detectable

- `decided:` the date the OWNER said it, not the date the file was touched.
- `strength:` `ruling` (he decided - binds until superseded) | `preference` (he leaned - informs,
  never constrains) | `observation` (measured - true until re-measured). **Unmarked defaults to
  `preference`**, because over-binding is the expensive direction.
- `holds-while:` the condition under which it is still true, written so it can be checked.
  **`exit: never` is abolished.** It was the cheapest legal value and 41 of 49 entries took it, so
  the bound that was supposed to keep the store small was opted out of one file at a time. "Never"
  becomes "not yet": when the condition lapses the entry is re-justified or deleted.
- `supersedes:` a slug, when it replaces one. Supersession recorded in prose inside an index line
  is not checkable and was already happening.

### Why a mechanism and not an audit

**203 entries were archived on 2026-08-25. Nine days later the store held 49 entries and 179 KB** -
about five new entries a day, on track to pass 200 again within a month. A 96% manual cleanup has
already been performed once and did not hold, so a second one is not a plan.

The budget also has to move. Until 2026-09-03 the only ceiling was 60 LINES ON THE INDEX, with the
corpus unbounded behind it - so pressure produced terser pointers rather than fewer memories, which
makes retrieval worse while the store grows. **The ceiling belongs on the corpus.** A related tell,
worth checking because it is cheap: 43 of 71 `[[links]]` between entries pointed at nothing, so the
graph that was supposed to carry context between memories was 61% broken while looking dense.

## When a hook turns out to be wrong

Loosen it the same way it was tightened: with a case. Add the innocent command to
`scripts/command-match.test.mjs` with the date and what it cost, then make it pass. Every carve-out
in `command-match.mjs` got there that way, and each one names the command that was refused for real.
A guard that is widened by argument rather than by measurement is how the too-eager failures got in.
