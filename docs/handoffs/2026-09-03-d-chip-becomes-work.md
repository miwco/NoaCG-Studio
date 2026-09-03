# 2026-09-03 - session D - a noticed defect becomes work, not a question

Branch `claude/d-chip-becomes-work`, off `main` at `a14b50bb`. Two commits, six files. No product
code: one new hook, its tests, the settings wiring, a build-list entry and two doc hunks.

## What landed

**A `PreToolUse` hook on `mcp__ccd_session__spawn_task` refuses a background-task chip**
(`scripts/hooks/spawn-task-guard.mjs`) and names the two places the work actually goes: fix it now
on this branch, or file `docs/backlog/<slug>.md` the way that folder's README describes. The tool
stays allowlisted in `.claude/settings.json`. The barrier is the hook, not the permission system,
so a legitimate chip does not also collect a permission prompt that the owner would have to answer
from his phone.

The rule was not new. The owner said it on 2026-08-30, `launch.md` says a chip is minted only when
starting the work is genuinely his call, and `collisions.md` says work a wave surfaces becomes a
backlog file and never a chip. It still did not fire, because it fires at one moment: the instant a
session reaches for the chip tool. `docs/MISTAKE_TRIGGERS.md` already prescribed the fix for
exactly this shape, and this is the fourth restatement becoming a mechanism instead of a fifth.

## Where I drew the line

**Refuse rather than warn.** `docs/MISTAKE_TRIGGERS.md` allows a refusal only for an exact check.
This one qualifies for an unusual reason: there is no reading of this tool that the rule wants to
permit silently, and every honest use is one the caller can declare in a single line. A
`PreToolUse` hook also cannot warn, because an allowed call's reason reaches the user and not the
model, so "advise and continue" was never available.

**The hook stays in one file.** The house pattern splits a hook into a pure half under `scripts/`
and a shell under `scripts/hooks/`, because a hook reads stdin at module top level and importing
one to test it hangs. That split earns its keep for `stop-wait`, which has real logic. Here the
logic is a regex and a predicate, so instead the tests spawn the real hook and pipe it real event
JSON. That is what `MISTAKE_TRIGGERS.md` asks for anyway, and it covers the stdin plumbing and the
message a session actually sees rather than a function the hook might never reach.

**One place it deliberately does not fail open.** Everything unreadable is waved through, but an
event that does not name a tool is still judged. The settings matcher is exact, so anything
reaching the file is a chip call, and reading a missing field as permission would retire the guard
silently the day that field is renamed.

## The carve-out

`launch.md` keeps one legitimate chip: when STARTING the work is the owner's decision rather than
the session's, meaning real money, a model pick worth his judgement, or a scope call. The session
declares it with a line of its own in the prompt or the tldr:

```
OWNER-DECISION: <the reason, in your own words>
```

An empty marker is refused, and so is the angle-bracket placeholder copied out of the refusal text.
A stated reason wins wherever it appears, so a stray bare marker in one field cannot mask a real
declaration in the other.

## Whether that carve-out is strong enough - it is not a lock, and should not be described as one

The marker is written by the same session the guard is judging. Anyone who wants the chip can write
the line. **So the honest claim is that this raises the cost of the wrong path and creates a
record, not that it prevents anything.** A session determined to hand work back can still do it in
one extra line, and no hook can tell whether the stated reason is true.

I think it is still worth having, and the reason is what actually went wrong on 2026-09-02. The
rule was loaded into that session, read, agreed with, and not applied. That is not defiance, it is
drift: the chip is the path of least resistance when you are mid-task and notice something, and
nothing interrupted the reach for it. A refusal interrupts exactly that, at exactly that moment,
and hands back the two routes that do keep the work. It defends against the unreflective reach,
which is the failure that has actually happened, and not against intent, which has not.

Two things follow from being accurate about this. Nobody should plan as though chips are now
impossible. And if chips reappear with thin `OWNER-DECISION:` reasons, the mechanism has not been
defeated so much as outgrown, and the answer is a review of those reasons rather than a tighter
regex, because the regex cannot reach the part that would be wrong.

## Turning it off if it is wrong

Three levels, cheapest first.

- **One session or one machine:** `NOACG_ALLOW_TASK_CHIPS=1` in the environment. Same shape as
  `NOACG_ALLOW_PARALLEL_E2E=1`.
- **Everywhere, permanently:** delete the `mcp__ccd_session__spawn_task` entry from the
  `PreToolUse` block in `.claude/settings.json`. That file is tracked, so the change lands like any
  other and reaches every checkout.
- **If it refuses something legitimate:** widen it the way this repo widens guards. Add the refused
  call to `scripts/hooks/spawn-task-guard.test.mjs` with the date and what it cost, then make it
  pass. A guard widened by argument rather than by a case is how the too-eager failures got in.

## The check, and its modes

- **review: delegated.** The code-review skill ran at level `high`, returned its findings into this
  conversation, and named this branch and this branch's files, so it passed the phase-1 scope check.
  Four findings, three fixed in the second commit. The sharpest one is worth recording: the pattern
  was unanchored, so the template line printed by the refusal itself was a valid declaration. Being
  refused and pasting the template back got you through. The guard was handing out its own key.
- **simplify: inline.** The skill returned instructions to fan out into four background agents. A
  launched session never receives its own subagents' completion notifications, so that leg was
  covered here over the four angles. Reuse and efficiency were clean and there is no existing
  hook-spawning test helper to reuse. One altitude gap was real and is fixed: nothing asserted that
  the hook is reachable from the settings matcher, so a guard that was wired to nothing would still
  have passed every test in the file, silently.
- **verify: inline.** `npm run build` green, with the branch stamp reading
  `claude/d-chip-becomes-work@30f6452da3` rather than someone else's tree. 14 tests, running inside
  the build's own list and not only standalone. No e2e: nothing under `src/` changed. CI run
  33734455117 is green with all nine E2E shards actually run, plus Build, Factory gates and the CI
  gate; the Vercel and catalog-calibration jobs skipped, which is correct for a branch with no
  product code.

Every guard claim here was made by feeding the real hook real events, never by reading the code.
Sixteen deliberate breakages were applied one at a time and each was caught by the assertion meant
to catch it, including the two that break the wiring rather than the logic. The drivers live in the
session scratchpad and are not worth keeping.

## Open, and handed on

**`launch.md` does not mention the marker the guard now requires.** The refusal points at
`.agent-workflows/orchestrator/launch.md` as the contract, and that file still describes the
legitimate chip at lines 51-52 with no mention of `OWNER-DECISION:`. So an orchestrator following
it to mint a legitimate chip gets refused and has to learn the escape from the refusal text. This
was found in review and deliberately not fixed here: row B owns `.agent-workflows/` this wave, and
this row's prompt said not to touch it. It is a two-line edit for whoever holds that directory next.
