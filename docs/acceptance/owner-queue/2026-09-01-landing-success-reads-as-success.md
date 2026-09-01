# A successful landing no longer reads as a refusal (2026-09-01)

**What changed.** A merge job that exited 0 was classified as having given up, so every successful
landing was described as `auto-merge refused it (exit 0)` and handed back a command to queue a
branch that was already on main. One watch tick that night printed both `LANDED <branch>` and
`LANDING GAVE UP <branch> - auto-merge refused it (exit 0) (re-queue: ...)` about the same branch,
and only the wrong line asked for an action. Success is now its own state: the tick stays silent
(the merge-base check already announces the landing exactly once), and the listing prints a
`LANDED` row with no re-queue command unless the branch has genuinely moved since it landed.

**The route, under a minute.**

    npm run jobs

Read the "Ahead of main" block at the bottom.

**What to look at.** Whether any row still describes a landing that worked as a failure. A branch
that landed cleanly should not be in that block at all; if one is, its row should say it landed
AND that commits arrived afterwards, and only then offer a command. The thing to judge is whether
the block now reads as trustworthy enough that a row saying `LANDING FAILED` makes you act -
that was the property the fabricated refusals were spending.

The same fix feeds the night report's "Refused, and WHICH KIND" section, which is the part of the
morning read that exists to show you what needs you. Before this, a night of four clean landings
would have filled it with four refusals that never happened.

Nothing is destructive here; it is a listing and a status line.
