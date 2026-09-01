# Section 7 - the morning report

**Only for a wave that has already run** - when the plan is first written this section is one line
saying when the report will be available. It is what the user reads instead of opening six
sessions, produced entirely from read-only commands in this session, and **ordered by who is
blocked** - the reader acts on it over coffee, so the report is short and everything long sits
behind a link.

1. **Needs you, FIRST, and step-by-step.** Anything waiting on the user carries its FULL
   instructions inline - never a pointer to a file they must open. The user is the critical path:
   a night's work postponed because their part was unclear is the whole night wasted. Walk items
   stay one line each - `/walk` carries the detail - it is the non-walk actions (a registry
   setting, a token to revoke, anything with a form to fill) that get every step written out.
2. **Landed** - a one-line-per-branch table from `npm run jobs`: branch, commit, five words.
3. **Continue prompts, pasteable - only where the work is real.** One fenced block per session
   whose handoff leaves genuinely valuable follow-up, in the section-5 format, so the user can
   scroll and paste. **A finished session gets no prompt.** Never invent work to fill this section
   - most mornings it holds zero or one block, and an empty section is the good outcome.
4. **Handoffs** - one quoted "what is left" line each, plus the `docs/handoffs/` file link. Never
   the full text.
5. **Refused, and WHICH KIND** - `auto-merge.mjs` refuses loudly with a reason, and the four are
   four different mornings: a red gate, a conflict integrating `main`, a dirty worktree, and a
   stale pin (the branch moved after it was queued). Name the kind, not just the failure - and
   check the LANDING JOBS' own logs, not just the queue listing: a refused landing drops out of
   `npm run jobs` by morning and reads as "never queued", which is a different (wrong) story.
6. **Still holding** - `node scripts/merge-order.mjs` for anything ahead of `main`,
   `node scripts/worktree-activity.mjs` for work a session left uncommitted.
7. **Follow-ons and loop vitals, brief, last** - which fired and when, which did not and why; for
   a conditional one, which arm the handoff file selected; ticks fired and the time of the last
   one. A report that cannot show a live tick late in the night is reporting a dead loop. Any
   rewind taken (`recovery.md`) is named here with the abandoned branch and the corrected
   assignment. Work the night opened up that fits no prompt goes here as candidate rows.
8. **The alignment questionnaire** - every decision taken on the owner's behalf this wave (the
   section-6 answer-it-yourself rule), asked back as options-with-recommendation with the taken
   answer marked. A teaching instrument, not a gate: the work already shipped, the owner vetoes
   cheaply, and the pattern of vetoes is what tunes the next wave's decisions.
9. **One lesson, in every report** - one thing this wave taught that the next wave will apply,
   named concretely; when it is an orchestration rule, it is also applied to this system
   (`coherence.md`). A wave that taught nothing says so - a lesson is found, never invented.

**The report and the questionnaire are written for a NON-TECHNICAL reader**: what happened, what
was chosen, why, and what to do - in plain words, with jargon never carrying the meaning.
*"Nothing gets lost just because I don't understand it."* A row the owner cannot follow is a
failed row, whatever it records.

In Claude Code the watch loop produces this by itself when the wave finishes. Anywhere without a
loop, it is produced by re-invoking this workflow in the morning, and section 7 of the evening's
plan says so in one line.

Nothing in this section merges, re-queues or cleans up anything. A refusal is reported with the
command that would settle it and WHERE to run it, exactly as section 5's prompts are.
