---
kind: agent
date: 2026-09-02
---
# The plugin's MCP server now starts as one process, not two

The plugin used to declare `npx -y @noacg/cli mcp`. npx resolved the package, spawned the real
binary, and then sat there for the whole session holding ~85 MB to forward an exit code. It also
added 1.5-4 s to every session start. Both costs landed on every session that had the plugin
installed, NoaCG-related or not.

## The route, about a minute

With any session open, count the processes:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'noacg' } |
  ForEach-Object { '{0} MB  {1}' -f [math]::Round($_.PrivatePageCount/1MB,0), $_.CommandLine.Substring(0,80) }
```

**Before:** two rows per session - an `npx-cli.js` wrapper and the server it spawned.
**After:** one row per session, no wrapper.

## What to look at, and the honest caveat

The single-process path needs a resolvable `@noacg/cli`. It was installed globally on this machine
on 2026-09-02, so the sessions started after the next plugin update take it. Sessions running
before that keep their old two-process servers until they restart.

**The full memory win is not visible yet.** The published `@noacg/cli` 0.2.0 still loads Playwright
at startup, so one process measures 146 MB today against 168 MB in two. The lazy-import fix that
takes it to **53 MB in one process** is on `main` but not released. Publish the CLI and the number
lands; until then the thing to confirm is the PROCESS COUNT, not the megabytes.

A user with no global install is unaffected either way - the launcher falls back to npx in-process
and prints how to get the fast path. Measured level with the old route, 91 MB against 89 MB.

Background and every measurement: `docs/backlog/cli-mcp-startup-weight.md`.
