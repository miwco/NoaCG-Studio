---
description: Plan what to do next in this session - concrete options to choose from, or an honest "nothing left"
argument-hint: [optional constraint or focus, e.g. "small tasks only" or "stay in the video area"]
---

Mid-session planning for **NoaCG Studio**. The user wants to decide what to do next in THIS
session and expects real, choosable options - or an honest "we're done". This command only
plans and presents; implementation starts after the user picks.

Optional focus from the user: $ARGUMENTS

## The honesty rule (overrides everything below)

**Never invent work to have something to offer.** If the session's line of work is complete,
verified, and committed, and nothing actionable is outstanding, the correct output is one short
paragraph saying exactly that - and, if true, that the natural next step is `/safe-merge` or
`/handoff`, not more work here. A padded option list is a failure of this command. "Nothing more
to be done in this session" is a fully valid, complete answer.

This never waives the clickable pick (section 2b): an honest "nothing left" still ends in an
AskUserQuestion offering the *close* options, not invented work.

Do not downgrade real gaps to reach that answer either: uncommitted changes, a failing check, a
bug found but not fixed, or a step the work implies (migration, env var, doc now wrong) mean the
session is NOT done, and fixing that is option one.

## How to ground it (read-only, a couple of minutes max)

Do this for yourself; almost none of it reaches the response. Never write, commit, or fix
anything while grounding. Stop researching once you have enough for good options - this is a
quick scan, not an audit.

- **This chat first.** The best options come from the session itself: work started but not
  finished, a bug or smell noticed in passing, a decision made but not built, a review finding
  deferred, something the user said earlier and dropped. Re-read the conversation before
  touching git. Skip anything the user already declined this session.
- **Repo state.** `git branch --show-current`, `git status --porcelain=v1 --branch`,
  `git log --oneline -5`, untracked files worth keeping. Uncommitted verified work is always a
  candidate option; unverified work makes verification the option.
- **Verification gap.** Was `npm run build` run after the last code change? Is there observable
  behaviour that was never checked in the browser or with a focused `e2e/` spec? A green build
  alone does not close a UI-visible change. But absence of a test is a gap, not a bug - never
  claim something is broken without evidence it is.
- **Evidence in the work area** - `TODO`/`FIXME`/`HACK` markers and open questions in the files
  this session touched, plus the nested `CLAUDE.md` and `docs/` contracts that govern them.
- **The backlog, only if the session's own work is exhausted:** `docs/GOALS.md` (unchecked
  milestones) and the memory index at
  `C:\Users\ahonemi\.claude\projects\C--claude-NoaCG-Studio\memory\MEMORY.md` (deferred and
  open items).
- **Verify before you list.** Backlog entries, memory notes, old TODOs, and handoff prompts go
  stale: before offering one, spend the thirty seconds to confirm in the current code/git that
  it is still open and not already done. A completed item offered as work is this command's
  worst failure mode after invented work.

## Output

**Write the whole response telegram-short: bullets and fragments, no prose paragraphs, no
headers, phone-glanceable.** Terse wording never excuses vague content - every fact below
still lands, in fewer words.

### 0. Pending question / obvious next step comes first

The user may have missed that the conversation already contains an unanswered question, a
choice waiting on them, or one obvious next action. Check for that before anything else. If it
exists, restate it in 1-2 compact lines at the very top and make it option 1 (or the whole
answer) - never bury it under new options, and never invent new work while it is open.

### 1. Where this session stands

ONE line: what the session set out to do; done/verified/committed or not.

### 2. The options

**Numbered 1..N (max 5), best first**, so the user can answer "1" or "do option 2" from a
phone. Each option 1-2 lines, fragment style:

- **`N. Imperative title`** - what + size (must fit rest of session; bigger item = its first
  well-defined slice, said so). Why now + evidence citing something specific in THIS repo (a
  file, commit, doc line, chat moment) - an option that would read true in any repository is
  banned. Real risk/blocker appended only if one exists; no ritual fields.

Sources rank in this order: session leftover > verification gap > landing the work
(`/safe-merge` + push) > backlog (`docs/GOALS.md` / memory). Prefer product-meaningful work
over easy filler - a test or doc task earns its place only by closing a real risk, not by
being convenient. Every option must fit the product pillars and the governing nested
`CLAUDE.md`/`docs/` contracts.

When the session's work is committed and verified, **"merge and push via `/safe-merge`" is a
first-class option** - often the recommended one. Offering it here is fine; the user picking it
is what makes it user-initiated. Never run it yourself off this command.

**Optionally add ONE wildcard**: a creative improvement just outside the current scope, clearly
labelled **(speculative)** and pitched as a maybe, not a need - grounded options never get this
label. At most one; zero is fine and usually right.

Mark exactly one option as **recommended**, why in a few words. If only one honest option
exists, list only that one - do not pad.

### 2b. ALWAYS end with a clickable pick - no exceptions

**Every single run of this command MUST finish with an AskUserQuestion call.** The user reads
this on a phone and answers by pressing a button - never make them type. A run that ends in
prose alone is a failed run, *including* the "nothing left to do" run.

- Recommended option first, its label suffixed `(Recommended)`.
- The tool takes **2-4 options**. If you wrote 5 numbered options, carry the top 4 - the
  auto-added "Other" covers the rest.
- Labels must match the numbered options above so "option 2" and the button agree.
- Never skip the call because the answer feels obvious, because there is only one real option,
  or because there is no work left. Those cases still get buttons - see section 3.

### 3. If the answer is "nothing"

Skip the numbered list. 1-2 lines: session complete, the evidence (build/e2e/commit state),
and the natural close. No consolation backlog list.

**Then still call AskUserQuestion** - the close is a choice too. Build it from whichever of
these are genuinely available, recommended one first:

- **`/safe-merge`** - only when this session's branch is committed, verified, and actually
  mergeable. Picking it is what makes it user-initiated; still never run it unasked.
- **`/handoff`** - write the handoff note and close out.
- **Stop here** - nothing further, leave the session as is.
- **Start something new** - open the backlog (`docs/GOALS.md` / memory index) and plan fresh
  work outside this session's line.

Two of those is enough to satisfy the tool's minimum; `/handoff` plus **Stop here** is the
honest floor when nothing else applies.

### 4. Then stop

Present the options, make the AskUserQuestion call, and END THE TURN. Do not start any option,
"get a head start", or stage changes. The user approves with the button (or a number, a title,
"do the recommended one") - only then begin, and do only the picked option.

## Rules

- **Read, don't write.** The planning turn changes nothing. No commits, fixes, file creation,
  or memory writes.
- **Options must be about THIS session's line of work.** Suggesting `/safe-merge`/push for this
  session's branch is in scope; never execute it unasked. Never offer repo/workspace cleanup
  (leftover worktrees, stale branches, node_modules pruning, etc.) - the user handles those
  deliberately elsewhere. Same for other worktrees' business or work that plainly belongs in a
  fresh session - name that separately in one line if it exists.
- **Respect the user's focus argument** - filter options through it; if it filters everything
  out, say so rather than stretching.
- **Be fast and cheap.** Grounding is a couple of minutes of reads. Never run the full e2e
  suite or anything that spends tokens/money to generate options.
