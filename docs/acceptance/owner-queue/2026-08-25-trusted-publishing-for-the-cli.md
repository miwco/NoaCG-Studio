---
kind: owner-action
date: 2026-08-25
---
# Trusted publishing for the CLI

The release path is now `.github/workflows/release-cli.yml` (docs/AGENT_CLI.md "Releasing to npm"):
a `cli-vX.Y.Z` tag on main, or a manual dispatch, builds the package in Actions and publishes it
with npm trusted publishing - no token anywhere, and a signed provenance statement on every
version. The workflow is landed and its dry run is proven in CI. **Two things are left, and only
you can do them:**

**1. Add the trusted publisher on npmjs.com.** npmjs.com → `@noacg/cli` → Settings → Trusted
publishers → add a GitHub Actions publisher:

- Organization or user: `miwco`
- Repository: `NoaCG-Studio`
- Workflow filename: `release-cli.yml` — **the filename only, not a path**
- Environment: leave blank
- Allowed actions: `npm publish`

Every field is case-sensitive.

**2. Delete `NPM_TOKEN` from `.env`, then revoke BOTH tokens** in npm account settings → Access
Tokens. Until they are revoked, the risk this whole change removes is still live: either token can
publish as you, from anywhere it has leaked to, and one of them bypasses 2FA.

**Then prove it, without spending a version:** Actions → "Release CLI to npm" → Run workflow, leave
`dry_run` checked. It runs every guard, the build, the tests and `npm publish --dry-run`. Before
step 1 that dry run already passes (a dry run never reaches the registry), so what step 1 actually
buys is the real publish - which is proven on the next version bump, not before.

**The first real release is the proof.** Watch for: the run reaching `Publish` (not stopping at
`Stop here (dry run)`); no 401/403 at the registry call; and a **provenance** badge on
https://www.npmjs.com/package/@noacg/cli linking the version to the commit. If the publish fails
with an OIDC or auth error, the trusted-publisher entry does not match - the workflow filename and
the case of every field are what to re-check first. That failure is safe and repeatable: nothing is
published, and nothing else about the run changes.
