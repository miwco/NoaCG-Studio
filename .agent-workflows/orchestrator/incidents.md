# Incidents - the evidence behind the rules

Every rule in this system was paid for. The rule keeps its why in one clause; the story lives
here, dated, so a session planning a wave does not carry it and a session about to CHANGE a rule
can find it. **Append only. Never delete an entry** - a rule that is repealed keeps its incident,
because the next person to propose the same rule needs to know it was tried.

Cite an entry from a rule by its heading, e.g. *(evidence: `incidents.md` "the copy gate landed
mid-wave")*.

---

## the copy gate landed mid-wave

**2026-08-26.** A session added a build gate and it landed 35 minutes into the wave. Every
sibling's next merge of `main` then brought a gate into their tree that did not exist when their
prompt was written, and two sibling sessions went silent on reds they could not have anticipated
and could not attribute. **Rule: A GATE LANDS ALONE** (core file; `collisions.md`). An allowlist
note in a prompt does not substitute - the builder may rightly choose a better design than the
planner named, and then the note is wrong too.

## the docs-index backlog item

**2026-08-30.** Session A filed `docs/backlog/docs-index-is-incomplete.md` about `docs/README.md`
while it was still editing that file. Four hours later the same defect went into session F's
prompt, read as unowned work. Both then held the file. **Two rules came out of it.** First: a
backlog item filed by a LIVE session is not free work - check who filed it and whether that
session is still live before turning it into a prompt (`collisions.md`).

Second, the collision ruling. A's change added a paragraph saying the docs map was incomplete;
F's completed the map and gated it. Merging them without a ruling would have shipped a false
statement, a graduated backlog item, and a gate failing MISSING on two docs only A creates. The
ruling was *"the completed, gated map wins: take theirs, keep my two new rows, delete my now-false
paragraph, delete the graduated backlog item"*. **A collision settled by whoever happens to merge
second, with no ruling from the plan, is how a clean merge produces a tree describing something
neither branch built.**

## the two classifier refusals

**2026-08-30.** Two refusals by the harness safety classifier, both correct in shape.

1. A row that would have built a `PreToolUse` auto-allow hook for `git push` was refused at
   launch. Spawning an autonomous agent to widen the machine's permission posture is exactly what
   that check exists to stop, and owner ratification does not reach it.
2. Two attempts to message a finished wave session, telling it to proceed past a `caution` merge
   verdict, were refused - on evidence that had already reduced the risk to one hunk in one
   markdown file.

**These are the two hard edges of the orchestrator's autonomy, and both are enforced by the
harness rather than by this contract**: widening the machine's permission posture, and overruling
a merge-safety verdict. A refused row is HELD, not dropped - it keeps its letter, its full prompt
goes in the wave-state file and in section 4, and the owner starts it himself. Never re-word a
prompt to get it past the classifier, and never hand it to a different session hoping it lands
differently.

## the headless auth that died silently

**2026-08-28.** An expired OAuth killed the headless `claude -p` launch path with no visible
error, while the Agent-tool subagent path delivered both follow-ons that night. **Rule: the Agent
tool is the PRIMARY launch path; headless needs live CLI auth verified that day**
(`collisions.md`).

## the fan-out that waited on notifications that could not arrive

**2026-08-29.** A wave session spawned its own research subagents and stalled twice waiting for
completion notifications. Those notifications route to the ORCHESTRATOR session, not to the
session that spawned them. **Rule: a prompt that sanctions a fan-out says to collect results via
FILES at agreed paths, never to wait on notifications** (`collisions.md`).

## the seven-hour hang that was not one

**2026-08-29.** A wave session was written up as having hung for seven hours on a permission
prompt nobody was awake to answer. It had not: it committed, ran a long blocking review leg,
integrated `main`, and ran a full nine-shard suite - hours of legitimate work, none of which moves
a branch tip. **A branch tip that has stopped moving is NOT the stall signal.** The transcript is:
a tool call still carrying no result is a session waiting, at that instant, on that call
(`night.md`, tick step 2).

## the phone that could not answer a prompt

**2026-08-30, owner, from his phone:** *"I didn't realize from my phone that there were rights
that had to be approved. I wish I can approve them from my phone or I need to leave bypass
permissions on."* He hit permission prompts he could not see or answer. **A wave session hanging
on one has not been observed** - the one night it was suspected is the entry above - so this is a
hazard to prevent, not an incident to remember. **Rule: plan inside the tracked allowlist, and
never plan around it by asking for bypass mode** (`collisions.md`).

## the vanity rename

**2026-08-26.** A docs session was asked to remove a personal handle, did it to the letter, and
broke the documented CLI install path. The owner's own verdict: *"a vanity reason and not our true
reason to break the functionality"*. **Rule: THE WHY MUST BE TRUE, and function outranks
cosmetics** (`prompts.md`). When the asked change would break something that works, keep the
function, do the rest, and put the tension in the handoff.

## the three stacked pins

**2026-08-28.** One interactive session queued, committed more, and queued again - three landing
jobs from one branch, two of them burned as stale-pin refusals. **Rule: queue ONCE, at the true
end** (`prompts.md`).

## the branch that /check found nine issues on

**2026-09-01.** One branch, one day, one run of the check workflow: **nine real issues, eight
fixed, including a Windows-only path bug that was invisible locally and red on CI.** That is what
widened the rule from night-only (2026-08-30) to **every wave session, day or night**
(`prompts.md`). The carve-out stays honest rather than silent: a session out of time queues
without it and its handoff says `check: not run`.

## the landing path's two refusals

**2026-08-28.** Two separate landing failures the same night, both from the same class - the
landing path has preconditions the plan must check rather than assume.

1. An unplanned session parked the MAIN CHECKOUT on its own branch, and every landing of the wave
   refused with "main is checked out nowhere".
2. A closed session's worktree-less branch failed twice on the no-worktree rule, which only the
   human safe-merge flow carves around.

**Rule: verify both at plan time and on watch-loop ticks, and never assign a retry through a path
these rules make impossible** (`grounding.md`).

## the wave that starved the queue

**2026-08-26.** A wave where several sessions queued full catalog batteries at once drove free RAM
to 0.1 GB, with seven gate jobs waiting behind one suite. **Rule: RAM is a shared resource like
the browser slot and the merge queue; the plan names which sessions carry heavy batteries and
staggers or trims them** (`collisions.md`).

## the sweep that measured the wrong tree

**2026-08-29, re-sighted 2026-09-01.** An SVG import sweep ran from a linked worktree and silently
measured `main`'s importer rather than the branch's, because the preview tooling resolves to the
session's own checkout. Neither run noticed from inside. This is the "green gate on the wrong
tree" shape the root `AGENTS.md` calls worse than a red one. Recorded here because it is the
standing argument for the confirmation habit in general: **a measurement whose subject was never
verified is not evidence.**

## the row that named the wrong step

**2026-09-01.** A prompt about the SVG drop zone named the images step beside it. The path was
plausible and never grepped. Because `TOUCHES` is section 2's collision instrument, two rows
called disjoint on unconfirmed paths are not disjoint - they are unanalysed. **Rule: one
confirmation PASS over the finished prompts before the plan ships, and a correction sends the rows
it touches back through section 2** (`prompts.md`). It is a pass rather than a virtue because the
failure was care running out at the end of a long grounding read, not ignorance of care.

## the empty branch that read as landed

**2026-09-01, hours after the follow-on trigger rule was written.** Row H had been launched and
had committed nothing, so its branch tip WAS `origin/main` - and
`git merge-base --is-ancestor claude/h-orchestration-guardrails origin/main` returned true. Run by
hand as a cross-check, that command reported a session which had done no work as having landed.

It did not bite: the loop's own instrument was right, because `wave-tick.mjs` emits `LANDED` on the
TRANSITION (a branch it previously saw ahead of main, now contained) rather than on containment
alone. The contract's prose was the half that was wrong, and prose is what a session follows when
it checks a trigger by hand at 03:00. **A landing is containment for a branch previously seen
ahead of main; containment on its own means landed OR empty and cannot tell you which**
(`night.md`).

Worth keeping for the general shape as much as the case: the fallback a session reaches for when
it distrusts an instrument needs the same scrutiny as the instrument. This one was adopted the same
night precisely because `landingStateFor` was misreporting landings, and it had its own defect.

## the file that reached 924 lines

**2026-09-01, owner:** *"The current SKILL.md became far too large (~915 lines), which means we
designed it incorrectly."* The old contract obeyed "every wave improves this file" and had no
counterweight, so every lesson added text and none removed it. The rebuild split it into a
200-line always-loaded core plus phase-loaded modules, moved narrative evidence into this file,
and gated all three properties in `npm run check:shared-instructions`. **Rule: this system
improves by MOVING text, not by adding it** (`coherence.md`).

## the row that waited on CI

**2026-09-01, 01:36 UTC.** Row L finished its work, pushed, and ended its turn saying it was
waiting on a CI run before writing its handoff and queueing. Nothing can wake a stopped session;
the branch sat green and unqueued until the loop's finished-but-unqueued check saw it and the
session was resumed by hand. Its prompt already carried "queue as your LAST action". Fourth
instance of the shape after three on 2026-08-30. **Mechanism: the Stop hook
`scripts/hooks/stop-wait.mjs`** refuses a turn that ends on a wait for something that cannot wake
the session, with the three things to do instead. The prompt line stays as the sentence the hook
enforces (`prompts.md`).

## the ten rows that all went to Opus

**2026-09-01 night wave.** Ten rows, every one on Claude Opus, the two Antigravity pools and Codex
used for nothing - against a standing rule making delegation the default for work long to do and
short to specify. Not a decision: no rule asked the planner to choose, so the default won by
omission. **Rule: every row names its POOL, routing is a step of the plan** (core, `routing.md`),
**and `wave-plan-check.mjs` refuses a row without one.** The 2026-09-02 delegation trial supplied
the first graded evidence of what each pool can be given (`docs/HARNESS_ROUTING.md`).

## the row the owner asked for by name, and nobody launched

**2026-09-01.** The owner asked for the AGENTS.md byte-headroom row by name. The day wave held it
for the night wave; the night wave was re-planned by a different session and never carried it;
by 2026-09-02 the ask existed in a memory file, a gitignored plan and a chat, and in no file the
repository tracks. **Mechanism: the owner receipt** - a `docs/backlog/` file with front matter
naming who asked, when, what, and its state, listed by `scripts/owner-receipts.mjs`, validated in
the build, and refused by the plan check when unmentioned. Landed work is the file's deletion,
which `--closed` reads back out of git.

## the four cached facts of 2026-09-02

**2026-09-02, one review.** Beyond the two false statements already known (the landing check that
passes for an empty branch; the stale line count), the day-after review found four more of the
same class in the rebuilt contract: an incident entry naming `check:workflows` as the modular gate
(it is `check:shared-instructions`); `grounding.md` saying `auto-merge` refuses a branch with no
worktree (the temporary-worktree carve-out had landed); a sentence about a guard hook's false
positive that the guard's own tests had since settled; and provider facts (model ids, which pool
takes which flag) written as contract text. Every one was prose restating what a script, a test or
a meter already knew. **Rule: a contract sentence that describes what a mechanism does, or quotes a
number, is a cache - cite the instrument** (`coherence.md`); and the gate now refuses an `npm run`
script the contract names that `package.json` does not have.

## the loop that died twice

**2026-08-30 and 2026-09-01.** The self-paced watch loop died in both observed night waves - about
six hours dark after tick 8 on the first night, 4h57m between ticks 22 and 23 on the second - and
each time the wave landed anyway because every prompt queues itself. The additive-never-load-bearing
rule is what held. Recorded so the next reader knows the loop is a convenience whose death is
expected, and so a dead-man tick (a scheduled task running `wave-tick.mjs` while a fresh wave plan
exists, observation only) is the candidate mechanism rather than more prose about staying awake.
