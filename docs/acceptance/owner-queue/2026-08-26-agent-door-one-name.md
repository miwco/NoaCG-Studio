# The agent door has one name now

**Date:** 2026-08-26
**Branch:** `claude/agent-door-round-two-177d3b`

## What changed

The agent-door surface had grown four names for what is really one artifact and one capability -
"CLI", "MCP server", "skill", "plugin" - which read as four products to choose between. There is
now one vocabulary, applied everywhere a user or an agent reads it:

- **the agent door** = the capability.
- **the NoaCG CLI** = the artifact (`@noacg/cli`, the command `noacg`). Everything else is
  packaging of it.
- **three entrances** = the plugin, the MCP server, the terminal.
- **the `noacg-graphic` skill** = the contract text all three carry, not a fourth thing.

The one public surface this touches is the docs page.

## The route (under a minute)

1. Open **<http://localhost:5190/docs>** (or the deployed `/docs`).
2. In the left index, click **"Coding agents & the CLI"**.
3. Read the first two paragraphs of that section, and the last paragraph of it.

## What to look at

- The opening now says **the NoaCG CLI** rather than "the `noacg` command-line tool", and the
  paragraph after it says plainly that it is one tool with three entrances (plugin, MCP server,
  terminal) running the same package. That second paragraph is new. Does it land, or does it read
  as one explanation too many before the install commands?
- The closing paragraph of the section used to end on "a valid SPX package and an EBU OGraf v1
  graphic". It now adds that those two are what the folder satisfies with no build step, and that
  the same sources also export to CasparCG, an OBS or vMix overlay, H2R and LiveOS. The intent is
  that no reader comes away thinking a NoaCG graphic is an SPX or OGraf graphic underneath.
- Nothing else on the page moved, and every install command is unchanged.

## Also worth a look, if you want it

`docs/OGRAF.md` gained a section answering the question you asked directly - "Playing a NoaCG
production on an OGraf renderer, today". It is maintainer documentation rather than a product
surface, so it is not what this item is asking you to look at, but the short answer in it is the
one to disagree with if it is wrong: **NoaCG is the authoring and packaging side, and the renderer
owns loading and control.** There is no NoaCG-to-OGraf-renderer control link, and the section says
so rather than implying one is coming.
