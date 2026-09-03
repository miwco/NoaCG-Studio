---
kind: agent
date: 2026-09-02
---

> **Re-kinded 2026-09-03 - a design default, not a taste question.** Both halves have defensible
> general answers. A CLI first with an optional MCP registration on top is how tools in this category
> tell that story, and whether two seconds per verb is acceptable is arithmetic against how often a
> verb runs.
# Two plugins on the docs page, and a browser launch per verb

**Branch:** `claude/e-invisible-cli` (landing through the queue).

**What changed.** The public docs page now tells the agent-door story in two steps: install
`noacg` (the skill and the command, which runs nothing until a graphic is being made), and add
`noacg-mcp` only if you want the `noacg` MCP tool present in every session. The same story is in
the marketplace descriptions, `cli/README.md` (the one npmjs.com shows) and the root README.

**Route, under a minute.** `npm run dev`, open `/docs`, find "Make graphics with an agent" and
read the Claude Code install block: the two install commands, then the paragraph offering
`noacg-mcp` with its cost. Then `/app` is not involved; the second half of this item is a feel
question answered by running one command in a terminal in the checkout:
`node cli/dist/index.js types` (after `npm --prefix cli run build`) - about 2 s, a browser launch
plus the hosted bridge, which is what every verb costs on the terminal path the skill now uses.

**What to look at.** Whether "install noacg, and add noacg-mcp if you want the tool in every
session" is the story you want told to a stranger, and whether the 2 s per verb reads as
acceptable in an authoring session where validate runs perhaps ten times. The agent-round bench
has used that same terminal path since 2026-08-27, so the answer changes only where the story is
told, not what runs.
