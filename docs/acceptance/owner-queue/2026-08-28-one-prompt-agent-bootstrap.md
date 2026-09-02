---
kind: walk
date: 2026-08-28
---
# One prompt sets up the agent door

**Date:** 2026-08-28 · **Branch:** `claude/sharp-ardinghelli-01eadb`

## What this is

Your 2026-08-28 walk ruling (`docs/backlog/one-prompt-agent-bootstrap.md`): one prompt the reader
pastes to their agent, and the agent does the installing. The "Coding agents & the CLI" section now
leads with that prompt and a Copy button. The three per-agent command blocks moved down into
Reference; nothing was deleted, and `#agent-install`, `#agent-loop` and `#agent-setup` still point
where they did.

The prompt is tool-agnostic (the agent picks Claude Code, Codex, or a plain MCP registration), it
uses `npx -y @noacg/cli` for the first session because a freshly installed plugin only loads in the
next one, it verifies itself with `doctor`, and it ends by asking you to describe the graphic you
want. The same prompt is mirrored in `cli/README.md`.

## The route, in under a minute

1. Open **`/docs`**.
2. Left nav, **"Coding agents & the CLI"**.
3. The first thing under it is **"Paste this to your agent and start building"** with **one copy
   button** on the prompt block. That button is the item.

## What to look at

- **Does the prompt read like something you would paste to an agent**, and is it short enough.
  It is four numbered steps plus a closing line about the loop.
- **The warning sits above the block**: "It runs a couple of install commands that you have to
  approve." You asked for that warning; check it lands where a reader sees it before copying.
- **Reference still has every command**, under "The install commands, one by one". The move was
  meant to cost nothing.
- The prompt block is prose, so it wraps rather than scrolling sideways, and it carries the amber
  left edge to mark it as the path to take first.

## What was verified, and what was not

Every command the prompt names was run cold on this machine: both Claude Code installs, both Codex
installs, the MCP server over stdio, and `npx -y @noacg/cli docs / doctor / scaffold / validate`.
**A live agent reasoning through the whole prompt was not verified** - a nested `claude -p` could
not authenticate, and `codex exec` hit its usage limit. That is the one thing worth trying yourself:
paste the prompt into a fresh session and see whether the agent follows it.
