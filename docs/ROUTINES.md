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
| Orchestrator week | Tuesdays 09:15 | `weekly-orchestrator-review` |
| Competitor review | 1st of the month, 10:00 | `monthly-competitor-review` |
| Quality / refactor review | 15th of the month, 10:00 | `monthly-quality-review` |
| Morning CI verdict, alert-only | daily, before the morning wave | `nightly-ci-morning-report` |
| Night report - what the queue did | daily, just before the CI verdict | `nightly-queue-night-report` |
| Delegation tooling freshness | daily | `codex-update-check` |
| Configured-suite schedule check | daily | `configured-suite-cron-check` |

Three of the daily ones were on this machine before this table named them (found 2026-09-02). The
night report is the exception and the table is ahead of the machine for it: the script and its
schedule are described below, and `nightly-queue-night-report` still has to be created under
`~/.claude/scheduled-tasks/`, which is outside this repository and therefore outside what a branch
can land. Until it is, `npm run night:report` on demand gives the same answer.

The morning verdict is the one the orchestrator reads: on a red morning it writes
`docs/handoffs/ci-morning-report.local.md` in the PRIMARY checkout - gitignored, so no other
checkout ever has it - and on a green morning it deletes that file and says nothing.

## Daily - the night report

`npm run night:report -- --write` in the MAIN checkout, run just before the morning CI verdict so
the two arrive together. It reads the job store and `landed.jsonl` for the last twelve hours and
prints what landed, what refused grouped by refusal kind, what the queue repaired by itself, and
what still needs a person - with the command that answers each one, and who runs it.

**Why a report and not the queue's own listing.** `npm run jobs` answers "what is happening now",
which is the wrong tense at 08:00. The four facts the owner actually wanted on the morning of
2026-09-04 - what landed, what refused and why, what recovered, what is stuck - were each on disk
and none of them were together, so the morning began with GitHub failure mail and 560 job records.
It groups by the kinds `refusalGuidance` (`scripts/jobs-store.mjs`) already owns rather than
classifying anything itself: a second vocabulary would drift from the one the queue acts on.

**It writes `docs/handoffs/night-report.local.md`** in the checkout it runs in, which is where the
morning report reads it. The name ends in `.local.md` so it is gitignored and a dirty main checkout
never stops a landing - the same rule the CI morning verdict and the orchestrator week are written
under. It exits 0 whatever it finds, including a bad night: a morning report that can fail is a
morning report that sometimes does not arrive.

Run it by hand over any window: `npm run night:report -- --hours 24`, `-- --since 2026-09-04T18:00`,
`-- --json`.

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

## Weekly - the orchestrator's own week

Runs `.agent-workflows/orchestrator-week.md` in the main checkout: `node scripts/orchestrator-week.mjs`
for the numbers (tokens by model and per harness, the Codex snapshot, Antigravity calls, the
delegation outcomes, the waves' rows by pool, decisions taken against asks made, the commits that
touched the orchestration system and the common-path line count), then the judgement the script
does not make - which asks were the machine's to decide, which commit added text where a mechanism
was available, and at most three ideas from other orchestrator skills on GitHub, each classified
against a measured failure. Owner, 2026-09-03: a loop one level above the per-wave lesson.

**It writes one gitignored file**, `docs/handoffs/<date>-orchestrator-week.local.md` in the main
checkout, the same rule as the morning CI verdict: the name ends in `.local.md` so a dirty main
checkout never stops a landing. The next `/orchestrator` invocation reads it with the rest of the
handoff folder and turns its candidate rows into a wave, or says why not. Tuesday, not Monday,
by the owner's ruling (2026-09-03): his weekly allowance can be spent by Monday, and he reads the
weekly percentage off his account page himself, so the routine never computes or asks for it.

## Monthly - competitor review

MXMZ, Loopic, Singular.Live, Flowics, and the SPX / CasparCG / OGraf ecosystem: what each shipped
since the last run, what it means for us, and **what we would need in place before their users could
switch**. That third section is the point; the first two exist to earn it. It is measured against
`docs/GOALS.md` NOW so it proposes against the real road, a quiet month is reported as one, and
`docs/COMPETITORS.md` + `docs/COMPETITOR_MXMZ.md` are the background it starts from.

**Its OGraf findings get a written destination, and the routine still does not write.** The
OGraf-leads bet is decided by OTHER PEOPLE's adoption accumulating over months, so a finding said in
chat and nowhere else is gone when the session closes - which is what had been happening. The ledger
is `docs/backlog/ograf-ecosystem-watch.md`, and the routine's job is to end its run by printing the
block to append: a date heading, one bullet per item with a date, what it means for us, and a source
URL, or the words for a quiet month. **The append itself is made by a session working on a branch**,
because this routine runs unattended in the main checkout, and a dirty main checkout stops every
landing on the machine (`scripts/auto-merge.mjs` refuses on an unclean tree - root `AGENTS.md`,
"Git"). So the rule above holds without an exception: routines report, sessions write.

## Monthly - quality and refactor review

Three to seven ranked proposals about the SOURCE: the grandfathered-debt list in
`docs/ARCHITECTURE.md`, lint suppressions, oversized modules, duplication, dead code, verification
gaps, the month's churn - each with a measured cost, a size, and what would prove it did not break.

**Deliberately NOT the coherence session.** That one (`.agent-workflows/orchestrator/coherence.md`) owns the
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
