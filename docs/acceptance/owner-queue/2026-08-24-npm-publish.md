---
kind: owner-action
date: 2026-08-24
---
# `npm-publish`

**DONE - nothing to do here.** `@noacg/cli@0.2.0` is on npm (Apache-2.0, under the `noacg` org,
maintainer `miwco`), and `.claude-plugin/marketplace.json` is on main, so
`claude plugin install noacg@noacg-studio` works for anyone and the plugin's MCP server can start.

**Do not follow the manual procedure that used to be written here.** `cd cli && npm publish` with
`NPM_TOKEN` exported is superseded: every version after 0.2.0 is released by
`.github/workflows/release-cli.yml` from a `cli-vX.Y.Z` tag on main, with no token anywhere
(docs/AGENT_CLI.md "Releasing to npm"). The token that published 0.2.0 is a live credential until
it is revoked - that revocation is the open item, and it lives in
`2026-08-25-trusted-publishing-for-the-cli.md`.
