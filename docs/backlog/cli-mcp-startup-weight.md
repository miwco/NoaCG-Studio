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

1. ~~**Load Playwright lazily.**~~ **DONE 2026-09-02.** `cli/src/browser.ts` now takes
   `playwright-core` as a type-only import and loads the module inside `launchBrowser`;
   `cli/src/workspace.ts` does the same for `jszip` behind a cached `loadJsZip()`. `mcp.ts` needed
   no change at all - once `browser.js` stops pulling Playwright in at module scope, importing
   `closeBrowser` from it is free.

   **Measured, same machine and method: 83 MB -> 53 MB private bytes, a 30 MB drop per session
   (36%).** Less than the ~50% the table above predicts, because a running stdio server costs more
   than the bare imports it was estimated from. Verified working rather than only lighter:
   `noacg doctor` still launches Chrome through the deferred import, and a `zipDirectory` ->
   `packageEntries` round trip still reads its entries back. `npm test` in `cli/` is green - 52
   passed, 5 skipped, 0 failed.

2. ~~**Drop the npx wrapper.**~~ **DONE 2026-09-02.** `.mcp.json` now runs
   `node "${CLAUDE_PLUGIN_ROOT}/mcp-server.mjs"`, a launcher that RESOLVES the CLI and `import`s it
   in the same process instead of spawning it. Resolution order: `NOACG_CLI` (a checkout under
   development), a normal resolve, then a global install found via the `noacg` shim on PATH.

   Pinning the version was tried first and rejected on measurement - `npx -y @noacg/cli@0.2.0`
   was no faster than the unpinned form (3.3 s vs 2.5 s, against 0.9 s for a direct call), so the
   cost is npx's own machinery rather than the "what is latest?" lookup.

   **Zero-install still works.** With no resolvable copy the launcher runs npm's `npx-cli.js`
   in-process and says so on stderr. Measured at a 20 s settle, that path is 91 MB against the old
   `npx -y @noacg/cli mcp` at 89 MB - level, not a regression. Two details are load-bearing and
   were both found by testing rather than reasoning: Node has refused to spawn a `.cmd` without
   `shell: true` since the 2024 argument-injection fix, so a plain `spawn('npx.cmd')` died
   immediately on Windows; and spawning at all would have made the launcher a THIRD process on the
   one path that already had two.

   **What it is worth, honestly.** The single-process path needs a resolvable install, and the
   published 0.2.0 is still the EAGER build, so a global install today measures 146 MB in one
   process against 168 MB in two. The real number arrives with the next release, when fix 1 is
   published: **53 MB in one process**, measured against the local build. Until then most users
   stay on the fallback and see no change beyond the stderr hint.

3. **Do not run at all until needed.** The real answer to the owner's ask. Options, none decided:
   - split the package - a thin `noacg mcp` that declares only the tools needing no browser, and a
     `screenshot`/`pack` path that spawns a separate short-lived process on demand;
   - ship the MCP server as an on-demand server the host starts when a NoaCG tool is first called,
     if the plugin format grows that (it does not today - MCP servers in `.mcp.json` start eagerly);
   - make the plugin's install message say plainly that the server runs in every session and how to
     disable it per project. This is the floor, not the goal - the owner named it as the bare
     minimum and explicitly not optimal.

Fix 1 did not wait for the design question in fix 3, and fixes 2 and 3 are still open. **This file
stays until fix 3 is decided.** Fix 3 is the owner's actual ask; fix 1 only made the cost smaller,
not conditional. Install the plugin and a server still runs in every session, NoaCG-related or not.

## Related

`cli/plugin/.mcp.json` is the config; `cli/package.json` holds the four dependencies;
`docs/AGENT_CLI.md` documents the CLI and MCP door.
