---
kind: owner-action
date: 2026-08-26
---
# A Claude Code marketplace address that is not your GitHub handle

You asked that `miwco` appear nowhere user-facing. The command that bothered you,
`claude plugin marketplace add miwco/NoaCG-Studio`, is gone from every place a person could type
it: /docs, `README.md`, the npm README (`cli/README.md`), and the comment in
`scripts/check-tree-shape.mjs`. `/docs` now leads with the npm route, which never names the
handle:

```bash
claude mcp add noacg -- npx -y @noacg/cli mcp
```

That command was verified end to end before it was written down: added, listed, the stdio server
handshaked, `tools/list` answered, and the test config removed again. `npm i -g @noacg/cli`
installs the `noacg` binary and was installed and uninstalled to prove it.

**What is left is a decision only you can make.** The MCP server is everything the CLI can do, but
the Claude Code *plugin* also carries the `noacg-graphic` skill and the `/noacg:graphic` command,
and a plugin can only be installed from a marketplace. Right now the only handle-free way in is
from a clone (verified today, then removed again):

```bash
claude plugin marketplace add ./
claude plugin install noacg@noacg-studio
```

Nobody who is not already cloning the repo can use that. To give strangers a one-line install that
reads as "NoaCG Studio", pick one:

**Option A - a GitHub organisation.** Create a free `noacg` (or similar) organisation and transfer
the repository to it. The command becomes `claude plugin marketplace add noacg/NoaCG-Studio`, and
the handle also disappears from every `github.com/miwco/...` link on /docs, the landing, the terms
and privacy pages, the npm `repository` field and 500-odd exported template footers, which this
branch could not fix. **Cost: free. Effort: yours, about ten minutes.** GitHub redirects the old
URLs, so nothing breaks the moment you do it, but the trusted-publisher entry on npmjs.com names
`miwco` as the organisation and would need updating in the same sitting (see
`2026-08-25-trusted-publishing-for-the-cli.md`), or the next CLI release fails to authenticate.

**Option B - host the marketplace file at noacg.studio.** `claude plugin marketplace add` accepts
a plain HTTPS URL to a `marketplace.json`, so `claude plugin marketplace add
https://noacg.studio/marketplace.json` would work and reads as the product. The catch: a
URL-hosted marketplace cannot use a relative `source`, so the plugin entry inside that file would
have to name `{"source": "github", "repo": "miwco/NoaCG-Studio"}`. The handle stops being
something anyone types, but it is still in a file a curious person can open, and every
`github.com/miwco/...` link elsewhere stays. **Cost: free. Effort: a small branch, plus a Vercel
route.** A bare domain is not accepted, so it has to be the full path to the file.

A is the real fix; B is the cheap one, and B does not rule out A later.

**Route to check it once you have decided:** open /docs, scroll to "Coding agents & the CLI", and
read the Install block. It should name npm and nothing else. `e2e/docs.spec.ts` has a test that
fails if `miwco` ever reappears in the page's visible text.
