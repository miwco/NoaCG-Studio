---
kind: owner-action
date: 2026-08-25
---
# Trusted publishing for the CLI

after the first publish, let npm trust a GitHub Actions
workflow in this repo (OIDC) and delete the stored token. A long-lived publish token sitting
on a laptop is the largest standing credential risk here; it can only be configured against
a package that already exists. Owner decided this is wanted (2026-08-25).
