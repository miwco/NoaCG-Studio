---
kind: owner-action
date: 2026-09-01
needs: account
---
# SMTP + Google OAuth provisioning - you committed to starting this week

Date: 2026-09-01
Kind: owner-action

## What this is

Ruling on the Teams plan's §8 question 5 (2026-09-01): the provisioning starts THIS WEEK,
because the class is this autumn and the DNS/SPF/DKIM verification is the step with weeks of
lead time. Both jobs are owner-only - they need accounts we hold, no repo code.

## The route

`docs/DEPLOYMENT.md`, sections "Auth email" and "Google sign-in" - the step-by-step for each is
already written there. Custom SMTP: attach a real provider and start DNS verification (the
long pole). Google sign-in: create the Google Cloud OAuth client, add its credentials to the
hosted project, then flip `GOOGLE_SIGN_IN_ENABLED`.

## What to look at

Done when password-reset mail delivers reliably from the real provider and the Google button is
live. Until then, real multi-account student teams run on the built-in sender's hourly mail cap.
