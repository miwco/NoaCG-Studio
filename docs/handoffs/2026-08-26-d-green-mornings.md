# Green mornings - every GitHub email of the week, explained

Session D, branch `claude/d-green-mornings`, 2026-08-25/26.

Goal: explain every GitHub email the owner got this week, fix every cause that can be fixed
without hiding a real problem, and leave a list the next email can be checked against.

## The headline

**A cancelled run does not email.** The session started from the premise that a run cancelled by
a superseding push "emails as a failure" - specifically run
[32894928634](https://github.com/miwco/NoaCG-Studio/actions/runs/32894928634), `main`, 20:22 UTC
on 2026-08-25. It did not. Nor did any of the other 28 cancelled runs in the window. The
concurrency shape was not the inbox problem it looked like, so nothing about it was changed.

What *is* mailing, in order of volume, is ordinary red CI (correct), a person's own dispatches of
a workflow they are debugging (correct - it is the answer they asked for), and **repeat issue
comments** (not correct, and now fixed for `nightly-drift`).

## Method, so the numbers are checkable

The run list is not evidence about email. The notification inbox is:

```bash
gh api --paginate "notifications?all=true&per_page=100&since=2026-08-22T00:00:00Z" \
  --jq '.[] | select(.repository.full_name=="miwco/NoaCG-Studio")
        | "\(.updated_at)\t\(.subject.type)\t\(.subject.title)"'
```

35 `CheckSuite` threads came back for the window 2026-08-22 00:00 - 2026-08-25 21:00 UTC. Each was
matched by timestamp against the 59 non-success runs in the same window. Every thread landed on a
`failure`; none landed on a `cancelled`.

Five threads had no matching failed *run* - they matched a failed **attempt 1** of a run that a
re-run later turned green:

```bash
gh api repos/miwco/NoaCG-Studio/actions/runs/<id>/attempts/1 --jq '.conclusion'
```

## The inventory

59 non-success runs: 30 `failure`, 29 `cancelled`. Plus 5 flaky first attempts on runs that read
`success`. Plus 9 issues opened and 17 issue comments. **~61 emails, ~16/day, 26 of them issue
traffic.**

| Class | n | Emailed | Verdict |
|---|---|---|---|
| CI red on a feature branch | 12 | yes | real - a person must act |
| CI red on `main` | 4 | yes | real - all four were "Merge branch 'main' into ...", i.e. integration failures |
| `nightly` red | 2 | yes | real |
| `deploy-verify` red | 1 | yes | real |
| `nightly-drift` red (issue #44) | 1 | yes | by design; the repeat comment is what got fixed |
| `configured-suite` dispatch red | 10 | yes | self-requested - 8 of them one branch iterating |
| Flake, green on re-run | 5 | yes | red with no action available; only fixable by fixing the flake |
| Superseded mid-run (branch) | 26 | **no** | deliberate, `cancel-in-progress: true` |
| Superseded while queued (`main`) | 3 | **no** | zero jobs, no verdict - see below |

## What changed

**`.github/workflows/nightly-drift.yml`** - both jobs now withhold a comment whose finding is
identical to the one already at the bottom of the rolling issue. The key is the `latest` value
(the newest watched run found, or `none`), which is the whole of the state these jobs report; the
cutoff is deliberately excluded because it moves every run and would make every repeat look new.
**The run still fails, the issue stays open, the tick stays red.** A green alarm while a schedule
is dead is exactly the silence the workflow exists to prevent, and that trade was not made.

This is the amendment `nightly.yml` and `configured-suite.yml` already carry (commit `1e05894e`,
2026-08-25). `nightly-drift` was the one alarm in the repo without it and the fastest-repeating of
the three - twice a day, forever, while a condition holds.

**Decision on the twice-daily red (item 3 of the brief).** Keep it, and keep both slots. Two slots
exist so one dropped GitHub cron slot cannot hide a missing nightly; that reasoning is unchanged.
The red is the alarm and it must stay while the condition is unresolved. Only the *repeat* was
removed, because a comment that says what the last comment said carries no information and costs
an email. The reason is written into the workflow header, as the brief required.

Live case: issue #44 was filed 2026-08-25 18:57 UTC. Without this change it would have collected
an identical "Still missing." comment at 06:17 and 18:17 every day until the configured suite's
cron fires.

**`.github/workflows/ci.yml`** - comment only, no behaviour change. The concurrency block claimed
that queueing (rather than cancelling) main's runs means "main's HEAD always ends with a completed
run". True, and it reads as though every main commit gets a verdict, which is not what happens:
GitHub keeps only the *newest* queued run and cancels the rest, so three main commits in three days
ended with `jobs: []` and no answer of their own (`32894928634`, `32852667652`, `32849327749`).

Left as it is, deliberately, and the reasoning is in the file: the fix is a per-SHA group on main,
which trades a verdict nothing reads for queue time on the branch gates everyone waits on (16 jobs
per full main run against a 20-concurrent-job ceiling; runs starting beside two mid-gate branches
have been measured waiting 22-45 minutes for a shard). Landings are `--ff-only`, so the superseded
SHA was already green on its branch and the run that supersedes it tests a tree containing it.

**`docs/VERIFICATION.md`** - new final section, "What a red run means, and what actually emails":
the class table above, the cancelled-runs-are-silent finding, the issue-comment asymmetry, and the
commands to reproduce the inventory. F's "A schedule that never fires reads exactly like a healthy
one" section was not touched.

## Left for someone else

**`configured-suite.yml` files its rolling alarm issue from feature-branch dispatches.** This is
the single largest email cluster in the window: issue #38 collected **seven identical "Still red."
comments** between 2026-08-24 19:31 and 2026-08-25 01:03, every one of them a `workflow_dispatch`
of `claude/configured-suite-no-service-role` while that branch was being debugged. Each was 1
comment email on top of 1 run-failure email, so one branch's iteration cost ~15 emails.

The guard is one line, and `ci.yml` already has it - its issue steps carry
`if: ${{ failure() && github.ref == 'refs/heads/main' }}`. `configured-suite.yml`'s do not. A
rolling alarm titled "Configured (authenticated) E2E suite is red" is a statement about `main`; a
WIP branch must not be able to file it.

**This session did not make that change, because `configured-suite.yml` is frozen** until tonight's
01:10 UTC cycle produces its verdict - editing it re-registers the cron and destroys the evidence.
Session F owns that verdict. Whoever unfreezes the file should add the guard to both the
"File / update the rolling issue" and "Close the rolling issue" steps.

The fingerprint suppression already in that file (commit `1e05894e`) would not have caught these:
it suppresses only flakes with zero hard failures, and these were hard failures. That is correct
behaviour - the missing piece is the branch guard, not a wider suppression.

**Flakes.** Five runs in the window went red on attempt 1 and green on a re-run: on branches
`claude/configured-alarm-no-repeat`, `claude/svg-vertical-growth`,
`claude/svg-one-fitting-system-97f810`, `claude/debate-clock-wire-origin-139b05`,
`claude/svg-import-wizard-defects-aaf24f`. Each is an email a person could do nothing about. Not
in scope here; the only honest fix is fixing the flake.

## Gate

`npm run check:workflows` (8 validated), `npm run build` green. The comment-suppression logic was
exercised directly - the marker round-trips through the `printf` body and `grep -qF` matches an
unchanged finding and misses a moved one.
