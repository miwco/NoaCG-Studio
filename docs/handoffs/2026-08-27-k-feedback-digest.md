# Handoff: the feedback digest is built and waiting for two secrets

**Branch:** `claude/feedback-digest-workflow-049aa0` (the worktree's own branch; the session brief
named `claude/k-feedback-digest`, which was never created - same work, one name).
**Landed:** `b2ba6896`. **Gate:** `npm run build` green.

## What is true now

Product feedback no longer waits in `/admin` for a visit. `.github/workflows/feedback-digest.yml`
runs `scripts/feedback-digest.mjs` at 06:40 UTC: one GET against `user_feedback` over a 26-hour
window, one plain-text mail to `contact.noacg@gmail.com`, ordered most-negative-first like the
inbox. It writes nothing - triage stays on the admin page, which is where the audit trail is.

The design decisions worth not re-litigating:

- **Inert, never red.** Missing secrets produce a notice and a green exit. A nightly red for
  unfinished configuration is how an owner learns to ignore red.
- **Counts in the log, words in the mail.** The repository is public. `logLine()` is built from
  the summary object, which has no message field. `--dry-run` is the only mode that renders a
  digest to a log, and it renders fixture rows out of the script file with no socket opened.
- **An empty window sends nothing.** A nightly "nothing happened" mail gets filtered within a week.
- **SMTP is written out, not pulled in.** About forty lines of `node:tls` against Gmail 465. It
  holds an app password in CI; one file of protocol that can be read end to end beat a dependency
  tree that cannot. Swapping it for a Resend/Postmark API key is a small, contained change.

`scripts/feedback-digest.test.mjs` (19 tests, in `npm run build`) asserts all of the above plus
the message encoding: dot-stuffing, CRLF, the 1000-octet line limit, and RFC 2047 for a non-ASCII
subject.

## The one thing that needs the owner

**Two secrets, about five minutes**, written up with the exact steps in
`docs/acceptance/owner-queue/2026-08-26-feedback-digest-secrets.md`: a Gmail app password, then
`gh secret set FEEDBACK_DIGEST_SMTP_USER` / `FEEDBACK_DIGEST_SMTP_PASS` (and
`SUPABASE_SERVICE_ROLE_KEY` if `gh secret list` does not already show it). Nothing is broken until
that happens, and nothing is delivered either.

`npm run feedback:digest:dry` shows exactly what will arrive, with no configuration at all.

## Also in this branch

- `docs/ADMIN.md` §10 gained "The inbox does not wait to be visited".
- Two backlog files from owner rulings this session:
  `docs/backlog/byo-key-and-create-with-ai-guidance.md` (steer users to their own coding agent
  before any key entry - better and cheaper) and
  `docs/backlog/playout-logic-for-all-common-graphics.md` (quiz and scoreboard exist; the system
  goal is every common graphic playable).
- Four consumed handoffs deleted (`b-docs-polish`, `c-credits-tickers-roll`,
  `d-svg-ladder-and-words`, `e-copy-gate-rubric`). `a-browse-and-find` and `lower-third-shapes`
  stay: both are deferred, not done.

## What a next session might do here

Nothing in this branch is unfinished. The obvious follow-on is only worth doing once real notes
are arriving: if the digest turns out to be the thing that gets read, the same shape wants a
weekly roll-up with the reason distribution over a longer window, which is a second render
function and no new plumbing.
