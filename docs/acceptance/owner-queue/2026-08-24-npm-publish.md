---
kind: owner-action
date: 2026-08-24
---
# `npm-publish`

publish the agent door: `cd cli && npm publish` (npm `noacg` 0.2.0), then
`git push` so `.claude-plugin/marketplace.json` goes live and
`claude plugin install noacg@noacg-studio` works for anyone. Until this runs, nobody outside
this laptop can reach the CLI or MCP server at all. Owner asked to be reminded (2026-08-24).
**Sequencing:** any branch adding a new `cli/src/commands/` entry should land first -
`claude/caspar-connect-51d22d` has one - or it misses 0.2.0.
**How, settled 2026-08-25:** the token lives in `.env` as `NPM_TOKEN` and npm does NOT read
that file, so it must be exported in the publishing shell or the publish fails with a 401
that reads like a broken token. If it asks for a one-time code, that is 2FA rather than an
error. The account `miwco` owns the `noacg` org, but an unscoped package belongs to whoever
published it - so **transfer the package to the org** in its npm settings afterwards.
