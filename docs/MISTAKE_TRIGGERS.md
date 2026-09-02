# Mistake triggers: which lessons become hooks, and which cannot

The owner asked on 2026-09-01: "we keep running into the same mistakes... why can't we find those
when we need them?" The short answer is that a rule in a contract fires only if somebody reads the
contract, and a session reads a contract at the start of its work rather than at the moment it is
about to make the mistake. A hook fires at the tool call.

That is not an argument for hooking everything. A hook that blocks wrongly is worse than the
mistake it prevents, because a refusal is paid by every session on the machine while the mistake
was paid by one. This doc is the rule for deciding, so the next hook is a decision rather than an
impulse.

## Three places a lesson can live

Before asking "should this be a hook", ask which of the three it is. Most lessons that feel
hookable are really one of the other two.

| Where | Fires | Good for | Cost of being wrong |
|---|---|---|---|
| Hook (`scripts/hooks/`) | every matching tool call, in every session | a mistake visible in the ARGUMENTS of one call | a false refusal blocks the whole machine, silently and repeatedly |
| Gate (a `scripts/check-*.mjs` in `npm run build`, or a landing check) | once per build or per landing | a mistake visible in the TREE, not in any one call | a red build, which is loud and local |
| Contract (`AGENTS.md`, `docs/`, `.agent-workflows/`) | when somebody reads it | judgement, taste, and everything with no mechanical test | the lesson does not fire at all |

The gate row is the one that gets forgotten. `wave-plan-check.mjs`, `owner-receipts.mjs --check`
and `check-docs-index.mjs` all catch mistakes that no single tool call contains, and each would
have been a bad hook: the fact they need is the state of the whole tree.

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

The 2026-09-02 widening is the worked example. With an inert stand-in on the process table,
`npm run test:e2e` was refused and eight wrapped spellings of the same command were allowed. The
first fix then refused `jq '.scripts | {test:e2e}' package.json`, because splitting on braces
manufactures a part out of an argument. That over-refusal was found by probing eighteen innocent
commands, not by thinking harder about the regex.

## What fires today

| Hook | Event | Verdict | The mistake |
|---|---|---|---|
| `guard-command.mjs` | PreToolUse `Bash`/`PowerShell` | deny | a hand-started dev server on a checkout's port; a branch created in the primary checkout; a commit message carrying agent language, an em dash or a `Co-Authored-By` trailer; a commit sweeping in `dist/`; a foreground poll of the job queue; browser work started while another browser job is live anywhere on the machine |
| `guard-edit.mjs` | PreToolUse `Edit`/`Write` | deny | editing a generated or vendored file by hand |
| `warn-command.mjs` | PostToolUse `Bash`/`PowerShell` | warn | a commit that just staled a queued landing pin |
| `warn-edit.mjs` | PostToolUse `Write` | warn | a new migration whose number is already claimed on another ref |
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
- **A background fan-out spawned from a launched session** (warn only). The `check` workflow already
  says a launched session must not do it; on 2026-09-01 a session spawned six subagents anyway, and
  twenty-one findings survived only because a human was awake to relay them. A launched session
  never receives its own subagents' completion notifications, which is what makes this silent. It is
  a warn because a fan-out is legitimate in an interactive session and the hook cannot always tell
  which it is in.
- **An Agent launch whose prompt names a path that does not exist.** Parse the `TOUCHES` and `READ`
  lines out of the prompt text, resolve each, and quote the bad line back. `wave-plan-check.mjs`
  already checks the plan; the launch is the second place the same path can be wrong.

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

## When a hook turns out to be wrong

Loosen it the same way it was tightened: with a case. Add the innocent command to
`scripts/command-match.test.mjs` with the date and what it cost, then make it pass. Every carve-out
in `command-match.mjs` got there that way, and each one names the command that was refused for real.
A guard that is widened by argument rather than by measurement is how the too-eager failures got in.
