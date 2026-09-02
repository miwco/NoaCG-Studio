---
kind: owner-action
date: 2026-09-02
---
# The plugin runs nothing until a graphic is being made, and 0.3.0 is waiting to be published

**What changed.** The `noacg` plugin no longer declares an MCP server: it is the skill and the
command, and the skill drives the CLI from the terminal. The server moved to a second, optional
plugin, `noacg-mcp`, in the same marketplace. The server itself went from seven tools to one
(`noacg`, with `command` as the verb), and the skill description was cut with every trigger kept.

**The numbers** (`docs/backlog/cli-mcp-startup-weight.md`, method included). A session that never
mentions NoaCG paid about 1,356 system-prompt tokens and one 37 MB process (83 MB on the
published 0.2.0). With `noacg` alone it now pays about 151 tokens and no process. With `noacg-mcp`
too: about 741 tokens and the one process.

**The owner action: publish `@noacg/cli` 0.3.0.** Publishing is past `main` and is yours alone.
Until it is on npm, every `noacg-mcp` install and every `claude mcp add noacg -- npx -y @noacg/cli
mcp` still runs the 0.2.0 server: the eager-Playwright build at 83 MB, exposing the seven-tool
shape. `cli/package.json` is at 0.3.0 on this branch; the release workflow in
`docs/AGENT_CLI.md` ("Releasing") is the path. Also still owed, and needing only a `claude login`
on a machine: the Anthropic-tokenizer count of the before/after texts. The numbers above are
o200k counts of the exact rendered text; the two public tokenizers agree within 4%.

**Route, under a minute.** `claude plugin marketplace update noacg-studio` then
`claude plugin details noacg@noacg-studio`: the inventory shows the skill and the command and
NO MCP server, always-on about 150 tokens. `claude plugin details noacg-mcp@noacg-studio` (after
`claude plugin install noacg-mcp@noacg-studio`) shows the server alone. Then start a session in a
directory that has nothing to do with graphics and run `/mcp`: with `noacg` alone there is no
noacg server in the list.

**What to look at.** Whether "install noacg, and add noacg-mcp if you want the tool in every
session" is the story you want on the docs page (`/docs`, "Make graphics with an agent") and in
the marketplace descriptions, and whether the terminal path's 2 s browser launch per verb reads
as acceptable in a real authoring session (the agent-round bench has used it since 2026-08-27).
