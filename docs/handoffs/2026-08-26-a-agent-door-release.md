# Agent door release - GitHub Actions + npm trusted publishing

**Branch:** `claude/agent-cli-npm-oidc-ee6f52` · **Date:** 2026-08-26

Releasing `@noacg/cli` no longer needs a long-lived secret or a laptop. `.github/workflows/release-cli.yml`
builds the package from a commit on `main` and publishes it with npm **trusted publishing**: npm
trusts that one workflow file in this repository and exchanges the run's GitHub OIDC token for a
credential that lives only for the length of the publish. Nothing is left to leak, rotate or forget
to revoke, and every published version carries a signed provenance statement.

## What landed

**`.github/workflows/release-cli.yml`** - triggered by a `cli-vX.Y.Z` tag (a real publish) or by
`workflow_dispatch` (a dry run by default). `permissions: id-token: write` + `contents: read`. No
`pull_request` trigger and `github.repository` pinned, so a fork can never reach it.

It refuses, in order, before anything is built or packed:

| Refusal | Why |
|---|---|
| the commit is not an ancestor of `origin/main` | makes "published" and "on main" structurally inseparable |
| a `cli-v*` tag disagreeing with `cli/package.json` | a tag naming a version it does not release is always a mistake |
| the version already exists on the registry | a readable answer in seconds instead of a 403 at the end. **A dry run downgrades this to a notice** |
| `build-skill.mjs --check` drift, or a build that changes a tracked file | the version bump was committed without re-stamping the plugin manifests and the marketplace entry |
| `npm --version` below 11.5.1 | trusted publishing needs it. The workflow upgrades npm and then **asserts**, because the install succeeding proves nothing about what is on PATH |
| the run is on a fork | pinned repository, no `pull_request` trigger |

Then: `npm ci` → typecheck → build → `git diff --exit-code` → tests → `npm pack --dry-run` →
`npm publish --dry-run` (only when the version is free) → `npm publish` (only when not a dry run).

**Provenance** is automatic - public repository, public package - so `--provenance` is deliberately
not passed, keeping the command identical to npm's own documented example.

**`docs/AGENT_CLI.md`** - "Releasing to npm" is rewritten around the workflow; the manual token
procedure survives only as a clearly-marked appendix explaining what the revoked tokens were for. A
new "Verifying the CLI" section documents the two test tiers.

**CLI hardening** (the release path is now unattended, so the package had better be right):

- **A real zip-slip on Windows, fixed.** `unzipTo` could write outside the package directory. A zip
  path is `/`-separated by spec and JSZip resolves `../` on read - but it leaves `..\` exactly as it
  found it, and `path.join` on Windows reads `\` as a separator. The containment check also compared
  against the target directory *without* a trailing separator, so `..\pkg-evil\x` resolved to a
  sibling whose name merely started with the target's and was accepted. `packageEntries` now
  normalizes the separator, which additionally makes a PowerShell-authored package read the same way
  on Linux instead of producing one file literally named `pkg\css\style.css`.
- **`cli/test/unit.test.mjs`** - 27 new offline tests over the flag grammar, the workspace ↔ zip
  boundary (including both traversal spellings), the credential store and its
  `NOACG_AGENT_KEY`-beats-the-file precedence, the `--fields` grammar, and the exit-code /
  one-JSON-object-on-stdout contract. **The CLI's offline count in CI goes 22 → 44.**
- **`save` is covered by the bridge smoke** - the whole client path (read, normalize, static gate,
  runtime bench, build the library record) and that the server hop's refusal is the documented
  `reason: 'refused'` rather than a crash.
- The CLI's `bin` path lost its leading `./`, which npm auto-corrected with a
  `"was invalid and removed"` warning on every publish. The binary was never actually dropped -
  published 0.2.0 carries it - but a release log shouting a removal it did not perform is noise.

## Verified

- `npm run build` green (typecheck + lint + bundle + the factory checks, `check:workflows` included).
- `npm --prefix cli test` offline: **49 tests, 44 pass, 5 skipped** (the bridge-needing ones,
  skipping honestly with a message).
- `npm run bench:cli` against this checkout's dev server on 5184: **6/6**, including the new `save`
  test and the third-party OGraf host.
- **Mutation-checked**: restoring the old containment check makes the new traversal test fail, so it
  is testing the fix and not the fixture.
- Every workflow guard dress-rehearsed locally with real commands: the ancestor-of-main check
  refuses this branch and allows `origin/main`; the tag check allows `cli-v0.2.0` and refuses
  `cli-v9.9.9`; `npm view` refuses 0.2.0 as taken; `check:skill` and `git diff --exit-code` clean;
  the npm-version assertion refuses 11.5.0 and 10.9.2 and allows 11.5.1/11.6.0/12.0.0.
- `npm pack --dry-run` in `cli/` with `dist/` deleted first: exit 0, 32 files, prepack rebuilt it -
  a stale local build cannot reach the registry.
- `npm publish --dry-run` proven both ways: it exits 0 with a **free** version and **no auth**
  (verified against a scratch copy at 0.99.0), and refuses a taken one - which is exactly why the
  packing proof and the registry rehearsal are two separate steps.
- **CI on the pushed sha `f26bf346`: green** (run 32899508926). Jobs that actually ran: Build,
  Factory gates, E2E plan, CI gate. The E2E shards are **skipped by plan, not by accident** - the
  planner measured from the fork point `c68ef9f2`, saw 9 changed files, and returned `mode: none`,
  because nothing under `src/` or `e2e/` changed. `check:workflows` validates `release-cli.yml`
  inside the Build job, and the CLI step reports **49 tests, 44 pass, 5 skipped** on Linux too - so
  the credential store and both traversal spellings are covered on the CI platform, not only on
  Windows where the zip-slip was found.

## What is left

**1. The owner configures the trusted publisher and revokes the old tokens.** Both are in
`docs/acceptance/owner-queue/2026-08-25-trusted-publishing-for-the-cli.md`, with the exact npmjs.com
fields. Until the tokens are revoked, the risk this change removes is still live.

**2. The dry run cannot be exercised until this lands.** GitHub only offers a `workflow_dispatch`
button once the trigger is on the **default branch**, so the first dispatch is only possible after
the merge. Everything the run would do has been proven locally with the real commands (above), but
the run itself has not happened.

**3. The first real release is the proof.** `cli/package.json` is still at **0.2.0, which is
published**, so:

- A dry run today reaches `npm pack --dry-run` and then says it **skipped the registry rehearsal
  because the version already exists**. That notice is expected, not a fault.
- A real release therefore starts with a version bump. `npm --prefix cli run build` must run with it
  or the workflow refuses the tree.

**What to watch on that first real run:**

- It reaches **`Publish`**, and does not stop at `Stop here (dry run)`.
- **No 401/403 at the registry call.** If it fails there, the trusted-publisher entry does not
  match - the workflow filename (`release-cli.yml`, filename only, no path) and the case of every
  field are what to re-check first. That failure is safe and repeatable: nothing is published.
- A **provenance** badge appears on https://www.npmjs.com/package/@noacg/cli linking the version to
  the commit and the run. If the version publishes without one, npm did not treat the run as
  trusted-published, and the credential path is worth re-reading before the next release.
- The guards fire in the log rather than being skipped - especially "Refuse a commit that is not on
  main", which is the one whose silence would mean it was never evaluated.

## Not done, deliberately

- **No GitHub Release is created.** That needs `contents: write`, and the whole posture of this
  workflow is that it holds the minimum. The npm page plus the provenance link already carries the
  traceability a release note would.
- **No `environment:` on the job.** npm supports pinning a trusted publisher to one; it would add a
  second place for the configuration to disagree, for a repository where the tag on `main` is
  already the gate. If the owner prefers the extra approval step, adding `environment: release` here
  and naming it on npmjs.com is a two-line change.
