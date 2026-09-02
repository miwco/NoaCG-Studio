---
kind: walk
date: 2026-08-30
---
# The landing queue now refuses to merge onto a broken main

Date: 2026-08-30

## What changed

The three mechanisms `docs/CI_STABILITY.md` proposed on 2026-08-29 are built. Together they are the
answer to "how do I stop receiving emails every day" that does not involve fixing a single test.

1. **A landing will not merge onto a red `main`.** The queue now asks whether `main` itself is
   currently green before it touches anything. If it is red, the landing stops with, in plain
   words, `main is red on e2e/anim-engine.spec.ts since 2026-08-27T08:39:00Z (35 h ago) - 2
   consecutive red runs`, and `npm run jobs` prints "main itself is red - fix main first" instead of
   a generic refusal. That is the change that turns 27 emails into 1: the 27 happened because every
   landing pushed `main`, and every push started a run that re-reported somebody else's bug.
2. **The rolling red-main issue says each distinct problem once.** It used to comment on every new
   commit, and every landing is a new commit. It now compares WHAT is failing, so a repeat of the
   same failing spec set adds nothing - while a new spec, a changed set, or a failure it could not
   identify always comments. The run still goes red; only the notification is withheld.
3. **A feature branch can no longer raise or withdraw an alarm about `main`.** Two more workflows
   got the branch guard that `configured-suite.yml` already had.

## Needs you - the same two minutes as the 2026-08-29 item, now with one correction

`docs/acceptance/owner-queue/2026-08-29-ci-email-is-one-bug-27-times.md` asked you to swap per-run
CI email for the rolling issue. That ask stands, and item 2 above is what makes it safe - before
today the issue would have repeated itself as often as the email did.

**Do both halves in one sitting, or not at all:**

- **Turn the noise down:** github.com -> Settings -> Notifications -> Actions -> turn **email**
  off. (The "only failed workflows **I trigger**" setting is the one you already have, and is
  exactly why the landings mailed you - every landing counts as triggered by you.)
- **Keep the signal on:** on the repository page -> **Watch** -> **Custom** -> tick **Issues**.
  That is what makes the rolling red-main issue reach you.

**Correction to the earlier item:** it stated that the repo "carries no watch subscription at all".
That was inferred from a `gh api .../subscription` 404, and the 404 is ambiguous - the CLI token
simply lacks the `notifications` scope. Your actual watch state is unknown from here. The Watch
menu on the repo page is where to read it, and ticking Issues is harmless if it is already on.

## Route (under a minute)

Nothing to look at in the product. To see the gate itself answer:

1. `node scripts/main-health.mjs` - prints `main is green (run <id>)`, or the red refusal wording.
2. `docs/CI_STABILITY.md`, the table at the end ("What landed on 2026-08-30, in one place").

## What to look at

Whether the refusal wording is what you would want to read at 7am when five queued landings have
all stopped for the same reason. And whether the escape hatch is the right shape: a branch that
FIXES a red `main` has to be able to land, and it does that with
`node scripts/jobs.mjs add-merge <branch> --onto-red-main` - typed by a person on purpose, because
"does this branch fix that spec?" is not a question a diff can answer.
