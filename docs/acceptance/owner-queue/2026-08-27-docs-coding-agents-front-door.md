---
kind: walk
date: 2026-08-27
---
# The docs page's coding-agent section reads as a front door

The `/docs` section "Coding agents & the CLI" was rewritten so a first-time reader connects NoaCG
to their agent once and then talks to the agent, instead of learning the CLI first. The lead is
your own paragraph. Manual CLI use, npx vs global, env vars, generated-file detail, `doctor` and
the SPX/OGraf package facts all moved down into a Reference sub-section.

**Route** (under a minute): open `/docs`, click **Coding agents & the CLI** in the left nav.

**What to look at**

- The first two paragraphs. Do they say what NoaCG adds to what an agent already does, without
  making you learn a tool first?
- **Connect NoaCG to your agent**: Claude Code, Codex and any-MCP-client are now three short
  blocks of the same shape, two commands each. Codex used to need a manual folder copy plus a
  separate `codex mcp add`; `codex plugin` reads our existing marketplace manifest, so it is now
  the same two commands as Claude Code (measured on this machine against `origin/main`).
- **Then describe the graphic you want**: scaffold / author / validate / iterate / save is now
  written as what the AGENT does for you, not as commands you type.
- **Reference**: nothing was deleted. Check that anything you would actually need is still there.

**Also in this branch, worth one glance each**

- The wizard's **Import graphic** step, behind the ⓘ beside "Your design": a new last line links
  to the SVG import guide.
- **Settings, Playout**: a new last line links to the CasparCG guide.

Both open `/docs` in a new tab. They render in the default light-blue link colour, like the
existing `/docs#data-api` link on the production Data tab, because the app has no `a` colour rule.
If you want in-app links amber, that is one CSS rule and its own change.
