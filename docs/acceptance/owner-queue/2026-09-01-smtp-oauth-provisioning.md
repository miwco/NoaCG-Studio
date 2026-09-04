---
kind: owner-action
date: 2026-09-01
needs: account
---
# SMTP + Google OAuth provisioning - you committed to starting this week

Date: 2026-09-01, rewritten 2026-09-04 with the provider chosen and the DNS question answered.

## What this is

Ruling on the Teams plan's §8 question 5 (2026-09-01): the provisioning starts THIS WEEK, because
the class is this autumn and DNS verification is the step with lead time. Both jobs need consoles
we do not hold, which is why they are yours and not a session's.

## Do the SMTP half now, and leave Google until after the autumn class

There is an order forced by the product, not a preference. `docs/DEPLOYMENT.md` records that email
confirmations are OFF and that Supabase auto-links identities by address. Together that means a
student who signs up with an address and a password, then later clicks "Continue with Google" on
the same address, **loses their password** - Supabase deletes the unconfirmed email identity when
it links. The account and the work survive; the password does not. Turning confirmations back on is
what removes that edge, and turning confirmations on needs working SMTP.

So SMTP is a prerequisite for fixing the Google problem, not an unrelated errand. And enabling
Google is the only thing that creates the problem, so it should wait. What SMTP buys immediately is
password reset, which today runs on Supabase's built-in sender - a testing facility capped at a
handful of messages an hour.

## The provider, and where the DNS goes

**Resend**, chosen 2026-09-04. `docs/DEPLOYMENT.md` had listed five candidates and never picked
one. The free tier is 3,000 messages a month, far past a class, and setup is three DNS records
rather than a wizard. Nothing in the repo depends on the choice - Supabase authenticates to
whatever SMTP host it is given - so this is reversible.

**Vercel does not send email**, which is worth stating because it hosts the frontend. But it IS
the DNS host: `noacg.studio` answers on `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (checked
2026-09-04), so Resend's records go in the Vercel dashboard under Domains, not at a registrar.
The domain carries no TXT records today, so there is no existing SPF to merge with.

**Gmail SMTP is not an option here.** It sends as `@gmail.com`, so Supabase's sender address
cannot match the domain; it throttles well below a class signing up at once; and Google suspends
accounts that send transactional mail in bursts.

## The route

1. Create a Resend account, add `noacg.studio` as a sending domain, and copy the records it
   shows into Vercel → the project → Domains → `noacg.studio`. Verification is usually under an
   hour.
2. Create a Resend API key. That key is the SMTP password.
3. Supabase dashboard → Authentication → Emails → SMTP Settings:
   - Sender email address: `noreply@noacg.studio`
   - Sender name: `NoaCG Studio`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend` - the literal word, not an email address. This is the field people get
     wrong, and a Gmail address in it is the sign that a Gmail setup was attempted.
   - Password: the `re_...` API key
4. Supabase → Authentication → Rate Limits. Attaching custom SMTP defaults to **30 new users per
   hour**, which is exactly one class arriving at once. Raise it.
5. Resend → turn OFF link tracking. It rewrites Supabase's single-use reset links and breaks them.

Google OAuth stays unstarted, and `GOOGLE_SIGN_IN_ENABLED` stays `false`. Its steps are in
`docs/DEPLOYMENT.md`, "Google sign-in"; it is about twenty minutes of console work with no lead
time, so there is no reason to do it before the confirmations decision.

## What to look at

Done when a password reset delivers from `noreply@noacg.studio` and lands in an inbox rather than
spam. Send one to yourself after step 4.

## The decision still open

Whether to turn email confirmations back ON once SMTP works. It closes the password-deletion trap
and the address-squatting hole, and it costs every student one extra click before they can start.
Confirmations were turned off deliberately for the student push, so this is a real reversal rather
than a fix, and it is not settled.

---

## SMTP is LIVE - owner, 2026-09-04

Resend is set up, the domain verified, and the owner confirmed the first real password-reset mail
arrived. The DNS lead time this item existed to protect is behind us. Checked from the public DNS
rather than the dashboard: DKIM at `resend._domainkey.noacg.studio`, SPF
`v=spf1 include:amazonses.com ~all` and MX `feedback-smtp.eu-west-1.amazonses.com` on
`send.noacg.studio`, the region matching the Ireland choice.

**Two settings still outstanding, both in the Supabase dashboard:**

1. **Authentication → URL Configuration → Redirect URLs: add `https://noacg.studio/**`.** The
   reset mail delivers but its link lands on the public landing page, which runs no Supabase
   client, so nothing opens. Supabase rejected the `redirectTo` of `https://noacg.studio/app` and
   fell back to the Site URL. Filed as `docs/backlog/password-reset-link-lands-nowhere.md`, which
   also carries the deeper fix - recovery has no page of its own, so the config change repairs the
   symptom and not the fragility.
2. **Authentication → Rate Limits** - confirm it is above the 30 new users per hour that attaching
   custom SMTP sets by default. One class arriving at once is exactly 30.

**Still not started, deliberately:** DMARC (`_dmarc.noacg.studio` TXT `v=DMARC1; p=none;`), and
Google OAuth, which waits on the confirmations decision below.
