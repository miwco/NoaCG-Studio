---
v: 1
source: owner
raised: 2026-09-02
state: unstarted
asked: "if people want to use my CLI tool, it can't be heavy - it should be minimal and only used when they are creating graphics. Find a way that people can use it when they need it, and it shouldn't mess up their other chats"
---
# The MCP server loads Playwright at boot, so every unrelated chat pays for it

**Filed:** 2026-09-02, measured on the owner's machine while investigating RAM pressure.
**Source:** owner ask, 2026-09-02, after seeing four `noacg mcp` processes resident in sessions
that had nothing to do with NoaCG.

## Why

`cli/plugin/.mcp.json` starts `noacg mcp` in **every** Claude Code session where the plugin is
installed, and the server stays resident for the life of that session. A user who installs the
plugin to make one graphic pays for it in every unrelated chat afterwards, forever, without ever
being told. That is a bad first impression of a tool whose whole pitch is that it is small, and it
is the kind of cost a user attributes to the product rather than to its dependency graph.

The weight is not the CLI. `dist/` is 248 KB, 80 KB of it JavaScript. It is one dependency,
loaded eagerly for a function that does not need it at startup.

## Evidence

Measured 2026-09-02, Node v24.13.0, Windows, importing each dependency into an otherwise empty
process and reading `process.memoryUsage()`:

| imported | rss | heapUsed |
|---|---|---|
| nothing (bare node) | 45 MB | 4 MB |
| `zod` | 47 MB | 5 MB |
| `jszip` | 49 MB | 6 MB |
| `@modelcontextprotocol/sdk` (mcp + stdio) | 66 MB | 18 MB |
| **`playwright-core`** | **114 MB** | **52 MB** |
| all four | 130 MB | 67 MB |

**`playwright-core` alone costs 69 MB of RSS over the baseline** - more than everything else in the
CLI combined, including the MCP SDK. On disk it is 13 MB of the 36 MB `node_modules`.

It is pulled in eagerly through a cleanup helper:

- `dist/mcp.js:11` - `import { closeBrowser } from './browser.js'`
- `dist/browser.js:14` - `import { chromium } from 'playwright-core'`

Both are static top-level imports, so Node resolves and evaluates the whole Playwright module graph
before the server accepts its first request. `closeBrowser` is a shutdown function. A session that
never calls `noacg_screenshot` still pays all 69 MB. `jszip` arrives the same way, via
`dist/mcp.js:21` -> `dist/workspace.js:9`, for 4 MB.

The four live servers on this machine measured 81-84 MB private bytes each, consistent with the
table.

**Second, separate cost: the npx wrapper.** `.mcp.json` runs `npx -y @noacg/cli mcp`, which on
Windows leaves the npx launcher resident alongside the server for the whole session - measured
83-86 MB private, doing nothing but holding the child. It also means a registry round-trip at every
session start. Per session today: ~169 MB across two processes.

Mitigating fact, worth keeping honest: Windows pages an idle server out. Several of the measured
servers showed a working set of 0 MB. The 83 MB is commit charge, not resident RAM, while idle. It
still counts against the commit limit and still contributes to paging pressure, and on a 16 GB
machine running four sessions it is ~676 MB of commit for a tool nobody was using that day.

## What it would take

Three fixes, increasing in ambition. The first two are small and independent.

1. **Load Playwright lazily.** Move `import { chromium }` inside the function that actually launches
   a browser (`await import('playwright-core')`), and stop importing `closeBrowser` at module scope
   in `mcp.js` - have the shutdown path import it only if a browser was ever opened. Same for
   `jszip` in `workspace.js`. Expected: ~130 MB -> ~66 MB, so roughly half, with no change to any
   tool's behaviour. This is the whole win for one afternoon.

2. **Drop the npx wrapper.** Point `.mcp.json` at the installed binary rather than `npx -y`. Must
   stay portable - it ships to every plugin user, so it cannot hardcode a path. Worth ~85 MB per
   session and removes a registry check from session start.

3. **Do not run at all until needed.** The real answer to the owner's ask. Options, none decided:
   - split the package - a thin `noacg mcp` that declares only the tools needing no browser, and a
     `screenshot`/`pack` path that spawns a separate short-lived process on demand;
   - ship the MCP server as an on-demand server the host starts when a NoaCG tool is first called,
     if the plugin format grows that (it does not today - MCP servers in `.mcp.json` start eagerly);
   - make the plugin's install message say plainly that the server runs in every session and how to
     disable it per project. This is the floor, not the goal - the owner named it as the bare
     minimum and explicitly not optimal.

Fix 1 should not wait for the design question in fix 3.

## Related

`cli/plugin/.mcp.json` is the config; `cli/package.json` holds the four dependencies;
`docs/AGENT_CLI.md` documents the CLI and MCP door.
