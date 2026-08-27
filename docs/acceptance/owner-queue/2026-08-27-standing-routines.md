---
kind: walk
date: 2026-08-27
---
# Three standing routines now run on their own, and the feedback digest is parked

The mail digest needed a Gmail app password and four repository secrets, which is five minutes
nobody has spent. Instead of leaving that owner action open, the reminder moved into Claude Code.
Three scheduled tasks now exist on this machine:

| Routine | When | What it does |
|---|---|---|
| `weekly-feedback-and-freshness` | Mondays 09:45 | Runs `npm run feedback:count` and `npm run check:freshness`, reports both in chat, and tells you to open `/admin` when anything arrived |
| `monthly-competitor-review` | 1st, 10:00 | MXMZ, Loopic, Singular.Live, Flowics, SPX/CasparCG/OGraf - what shipped, what it means, what we need before their users could switch |
| `monthly-quality-review` | 15th, 10:00 | Three to seven ranked refactoring proposals about the code, scoped so it never re-does the weekly coherence session |

All three are read-only: they report and stop. None edits, commits or starts work.

**Route, under a minute:** open the **Scheduled** section in the sidebar and confirm the three are
listed and enabled. The written contract is [`docs/ROUTINES.md`](../../ROUTINES.md); the prompts
themselves are in `~/.claude/scheduled-tasks/<id>/SKILL.md`.

**What to look at.** Whether the cadences are the ones you want. The weekly slot avoids the daily
09:10 CI report and the Monday 09:24 Codex check; the two monthly ones sit two weeks apart. If a
routine should report less, more, or on a different day, say so and it is a one-line change.

**One click worth making now.** Hit **Run now** once on each, in the Scheduled panel. Tool approvals
granted during a run are stored on the task and reused, so pre-approving them stops the first real
run from stalling on a permission prompt when you are not there. The competitor review is the one
that needs it most - it uses web search.

**Optional, not required.** The mail digest is still there and still inert-green; the four
`gh secret set` commands are written out at the bottom of `docs/ROUTINES.md` if you ever want the
nightly mail as well as the weekly reminder.

From branch `claude/feedback-digest-routines-d7a916`.
