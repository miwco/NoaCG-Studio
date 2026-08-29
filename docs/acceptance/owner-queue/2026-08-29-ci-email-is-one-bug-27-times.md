# The daily CI email was one bug reported 27 times, not 27 bugs

Date: 2026-08-29

## What you asked

"I feel like we are fixing things and then they break again almost every day. How can we establish
a workflow so I don't receive emails every day?"

## What the fortnight actually looked like

Every CI run from 2026-08-15 to 2026-08-29 was classified - 1245 runs, 204 of them not green.

`main` went red **40 times**, and those 40 runs had **14 distinct causes**. One single test failure
accounts for **27 of them**: it broke on the morning of 08-27, stayed broken for about 35 hours, and
was reported again on every single change that landed in that time. Same test, same error, 27
emails.

Everything else on the dashboard could not have emailed you at all. 93 runs were cancelled (a
cancelled run sends nothing), and 52 were a branch telling whoever pushed it that their own push was
red - which is the reply to something they just did, not news about the product.

So the answer to "why every day" is not that the product keeps breaking. It is that **when
something is broken, we keep landing work on top of it, and every landing re-sends the same news.**

## The three things that would change it, biggest first

1. **Stop landing onto a red `main`.** The queue that merges branches checks that the branch is
   good. It does not check whether `main` is currently broken. If it refused to land while `main`
   was red, those 27 emails would have been 1. **This removes about two thirds of your CI email and
   changes no test.** It is a change to the landing machinery, so it is written up as the next
   wave's work rather than squeezed in beside four other in-flight branches - `docs/CI_STABILITY.md`
   has the detail.
2. **Two genuinely flaky tests get an owner.** Eleven red runs over the fortnight were tests that
   pass when re-run on the identical code. They are now listed by name, with what proves each one
   flaky, in `docs/CI_STABILITY.md`. A red run with no action behind it is the kind that teaches
   everyone to stop reading red.
3. **A GitHub setting only you can change (this is the ask).** Every one of those emails is GitHub's
   default "a run you triggered went red". The repo cannot switch it off from the inside.

## Needs you (about two minutes, and it is a decision, not a chore)

The choice is whether to keep per-run CI email at all. If you want it reduced:

- **github.com → Settings → Notifications → Actions**: switch to **"Only notify for failed
  workflows"** if it is not already, and consider turning email off for Actions entirely.
- If you turn it off, the safety net has to be switched on in the same sitting, or a red `main` will
  reach nobody: **watch this repository** (repo page → Watch → Custom → **Issues**). CI already
  opens and updates a rolling issue when `main` goes red and closes it when `main` goes green -
  right now that issue notifies nobody, because the repo carries no watch subscription at all.

That swap trades roughly 13 emails a day for roughly one per genuinely-broken `main`.

## Route (under a minute)

Nothing to look at in the product - this is about your inbox and the build server.

1. Open `docs/CI_STABILITY.md`.
2. Read the first two sections: "The finding that reframes the question" and the class table.
3. The reproduction commands at the bottom re-run the whole measurement if you want to check it.

## What to look at

Whether the classification matches what your inbox felt like over the last two weeks, and whether
the notification swap above is the trade you want. If you would rather keep every email and fix the
landing rule only, say so - item 1 stands on its own and is worth doing either way.
