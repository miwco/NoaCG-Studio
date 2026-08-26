---
kind: owner-action
date: 2026-08-26
---
# Turn on the nightly feedback digest (two secrets, about five minutes)

Feedback users send now sits in `/admin` waiting for a visit you have said will not happen. The
digest that mails it to `contact.noacg@gmail.com` is landed and scheduled at 06:40 UTC, and it is
**inert until these two secrets exist** - it checks, says so with a notice, and exits green.

Nothing is broken until you do this. Nothing is delivered either.

## What it looks like first

You do not have to configure anything to see the shape. Run the workflow by hand with the dry-run
box ticked (Actions -> feedback-digest -> Run workflow -> dry run), or locally:

```bash
npm run feedback:digest:dry
```

That renders three made-up rows. No database, no mail.

## Step 1 - a Gmail app password

On the Google account that owns `contact.noacg@gmail.com` (or whichever account should SEND the
mail; it does not have to be the same address that receives it):

1. Two-step verification must be on: <https://myaccount.google.com/signinoptions/twosv>
2. Create an app password: <https://myaccount.google.com/apppasswords>, name it `noacg feedback digest`
3. Copy the 16-character password. Google shows it once.

**An app password, never the account password.** It is scoped to SMTP, it can be revoked on its
own from that same page, and revoking it does not touch the account.

## Step 2 - four `gh secret set` commands

**All four are missing today.** A real run on 2026-08-26 (run `33013748824`) reported exactly
this, which is what the workflow does instead of failing:

    Missing secrets: SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY FEEDBACK_DIGEST_SMTP_USER FEEDBACK_DIGEST_SMTP_PASS

Run these in the repository. Each one prompts for the value, so nothing lands in your shell
history and nothing is echoed:

```bash
gh secret set SUPABASE_URL
```

```bash
gh secret set SUPABASE_SERVICE_ROLE_KEY
```

```bash
gh secret set FEEDBACK_DIGEST_SMTP_USER
```

```bash
gh secret set FEEDBACK_DIGEST_SMTP_PASS
```

`SUPABASE_URL` is the project URL (`https://<ref>.supabase.co`) and `SUPABASE_SERVICE_ROLE_KEY` is
the service key from the Supabase dashboard - the same pair `.env` already holds locally. The
digest uses the service key for one GET and never writes; the table's own grants refuse a delete
regardless (migration 0028).

`FEEDBACK_DIGEST_TO` is optional and defaults to `contact.noacg@gmail.com`. Set it only to send
somewhere else.

## Step 3 - confirm it

Actions -> feedback-digest -> Run workflow, dry run OFF. The log should say either how many rows
it read, or `Nothing to send.` for an empty window. It will not say what anybody wrote: the
repository is public, so a real run logs counts only, and that is asserted by a test in the build.

Then wait for tomorrow at 06:40 UTC. An empty day mails nothing on purpose.

## If you would rather not hold an app password

The alternative is a transactional mail provider (Resend, Postmark) with an API key instead. Same
workflow, one different function, roughly the same amount of setup. Say the word and it gets
swapped - the sending half of `scripts/feedback-digest.mjs` is about forty lines.
