---
kind: owner-action
date: 2026-09-02
needs: money
---
# Publish `@noacg/cli` 0.3.0 - the plugin runs nothing until a graphic is being made

**Branch:** `claude/e-invisible-cli` (landing through the queue). Until it is on `main`, the route
below shows the OLD plugin, which still declares its MCP server.

**What changed.** The `noacg` plugin no longer declares an MCP server. It is the skill and the
command, and the skill drives the CLI from the terminal. The server moved to a second, optional
plugin, `noacg-mcp`, in the same marketplace. The server itself went from seven tools to one
(`noacg`, with `command` as the verb), and the skill description was cut with every trigger kept.

**The numbers** (`docs/AGENT_CLI.md`, "What a session pays", method included). A session that
never mentions NoaCG paid about 1,356 system-prompt tokens and one 37 MB process (83 MB on the
published 0.2.0). With `noacg` alone it now pays about 151 tokens and no process. With `noacg-mcp`
too, about 741 tokens and the one process.

**The owner action: publish 0.3.0.** Publishing is past `main` and is yours alone. Until it is on
npm, every `noacg-mcp` install and every `claude mcp add noacg -- npx -y @noacg/cli mcp` still
runs the 0.2.0 server - the eager-Playwright build at 83 MB, exposing the seven-tool shape.
`cli/package.json` is at 0.3.0 on this branch; `docs/AGENT_CLI.md` "Releasing to npm" is the path
(`git tag cli-v0.3.0 && git push origin cli-v0.3.0` after the branch lands). Also still owed, and
needing only a `claude login` on a machine: the Anthropic-tokenizer count of the before/after
texts. The numbers above are o200k counts of the exact rendered text; the two public tokenizers
agree within 4%.

**Route, under a minute (after the branch lands).** `claude plugin marketplace update noacg-studio`
then `claude plugin details noacg@noacg-studio`: the inventory shows the skill and the command and
NO MCP server, always-on about 150 tokens. `claude plugin details noacg-mcp@noacg-studio` (after
`claude plugin install noacg-mcp@noacg-studio`) shows the server alone. Then start a session in a
directory that has nothing to do with graphics and run `/mcp`: with `noacg` alone there is no
noacg server in the list.

## 2026-09-05: the branch has landed, and the tag push was REFUSED here

Two things changed since this was filed.

**The branch is on `main`** (`bdac41d8`, "Split the MCP server out of the noacg plugin into an
optional noacg-mcp plugin"). All six version stamps agree at 0.3.0 on `main` - `cli/package.json`,
both plugins' Claude Code and Codex manifests, and both root marketplace entries - so the
workflow's stamp guard would pass. There are no `cli-v*` tags in the repository at all: 0.2.0
predates the workflow and was published by hand.

**The owner asked, on 2026-09-05, whether a session could do the publish instead of him.** It
cannot, and the reason is worth recording because it is not the one either of us assumed. It is
not that a token is missing - there is no token anywhere by design, and
`.github/workflows/release-cli.yml` mints a short-lived credential from GitHub's OIDC token
through npm trusted publishing. It is that **this session's permission classifier refuses
`git tag` and `git push origin cli-v0.3.0`**, which is the correct call: pushing that tag IS the
publish, and a published version can never be taken back.

So the one manual step stands, and it is thirty seconds at any machine with the repository
checked out:

```bash
git tag cli-v0.3.0 origin/main && git push origin cli-v0.3.0
```

**Or with no checkout at all, from a phone:** the repository's Actions tab -> "Release CLI to npm"
-> "Run workflow" -> untick `dry_run` -> Run. The workflow's own comments name this as the door
for re-driving a tagged run, and it does exactly what the tag push does. It refuses anything that
is not an ancestor of `main`, so running it against `main` is the same publish. The only thing the
tag route adds is the `cli-v0.3.0` ref in the history; the GitHub Release is created either way.

A rehearsal costs nothing and burns no version: the same button with `dry_run` left ticked runs
every guard, the build, the tests and `npm pack --dry-run`.
