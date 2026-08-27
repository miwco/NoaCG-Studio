# Standing routines

Scheduled Claude Code tasks that run on TIME, not on a commit - the whole point, because CI fires on
a push and so never notices that a week went by, a dependency aged, a competitor shipped, or
somebody left feedback nobody read.

They are **reports, never gates**: none edits a file, commits, or starts work - a routine that finds
something says what to do and stops. They live per machine, not in this repo, under
`~/.claude/scheduled-tasks/<id>/SKILL.md`, and run while Claude Code is open.

| Routine | Cadence | Task id |
|---|---|---|
| Feedback + freshness | Mondays 09:45 | `weekly-feedback-and-freshness` |
| Competitor review | 1st of the month, 10:00 | `monthly-competitor-review` |
| Quality / refactor review | 15th of the month, 10:00 | `monthly-quality-review` |

## Weekly - feedback and freshness

Runs `npm run feedback:count` and `npm run check:freshness` in the main checkout and reads both out
in chat: how much feedback arrived in the last 168 hours, how much is negative, how much carried a
written note, how much is still untriaged - then the one action, *open `/admin` and read what they
wrote*. Freshness rides along because `docs/STACK_FRESHNESS.md` is time-driven and nothing else
mentions it.

**Why a reminder and not a mail.** The owner's ruling, 2026-08-26: *"I will not remember to go to
the admin page."* `docs/ADMIN.md` §10 has why an unread inbox is worse than no feedback button.

**Counts travel, words do not.** `--count` never asks the database for the message column
(`COUNT_SELECT_COLUMNS`), and the one fact it wants about written notes comes back as a row count
with zero rows attached. What a person wrote stays behind the admin login, as a property of the
query rather than of the printing.

## Monthly - competitor review

MXMZ, Loopic, Singular.Live, Flowics, and the SPX / CasparCG / OGraf ecosystem: what each shipped
since the last run, what it means for us, and **what we would need in place before their users could
switch**. That third section is the point; the first two exist to earn it. It is measured against
`docs/GOALS.md` NOW so it proposes against the real road, a quiet month is reported as one, and
`docs/COMPETITORS.md` + `docs/COMPETITOR_MXMZ.md` are the background it starts from.

## Monthly - quality and refactor review

Three to seven ranked proposals about the SOURCE: the grandfathered-debt list in
`docs/ARCHITECTURE.md`, lint suppressions, oversized modules, duplication, dead code, verification
gaps, the month's churn - each with a measured cost, a size, and what would prove it did not break.

**Deliberately NOT the coherence session.** That one (`.agent-workflows/orchestrator.md`) owns the
written surface - cold-read test, contract contradictions, the byte ratchet, GOALS drift. This one
owns code and hands any doc defect over. Two reviews that overlap get read as one, then neither.

## The parked mail digest

`.github/workflows/feedback-digest.yml` would mail the inbox nightly instead. Built, tested and
scheduled, it stays **inert-green**: with its secrets absent it prints a notice and exits 0. Turning
it on needs a Gmail app password (two-step verification on, then
<https://myaccount.google.com/apppasswords>) and four `gh secret set` commands - `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `FEEDBACK_DIGEST_SMTP_USER`, `FEEDBACK_DIGEST_SMTP_PASS`. Parked
because that is five minutes nobody has spent, not because it is wrong.
`npm run feedback:digest:dry` shows what it would send, with no configuration at all.
