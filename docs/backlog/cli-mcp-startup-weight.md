---
v: 1
source: owner
raised: 2026-09-02
state: active
branch: claude/e-invisible-cli
asked: "if people want to use my CLI tool, it can't be heavy - it should be minimal and only used when they are creating graphics. Find a way that people can use it when they need it, and it shouldn't mess up their other chats"
---
# What installing the NoaCG plugin costs a session that never touches NoaCG

**Filed:** 2026-09-02, measured on the owner's machine while investigating RAM pressure.
**Source:** owner ask, 2026-09-02, after seeing four `noacg mcp` processes resident in sessions
that had nothing to do with NoaCG. Later the same day: "Installing NoaCG should not noticeably
consume or pollute a user's context window during normal Claude Code work. If it does, that will
eventually become a reason for people to uninstall it."

## The two costs, measured

A plugin that declares an MCP server costs an unrelated session in two currencies, and they are
different problems:

- **Context.** Every tool's schema, the skill's description and the command's description sit in
  the system prompt of every session where the plugin is enabled. The model reads them on every
  turn.
- **RAM.** The server process starts at session start and stays for the life of the session.

**Method.** Tokens: the exact text a client renders was captured (the `tools/list` answer, one
`{"description","name","parameters"}` object per tool, and the skill/command lines as Claude Code
lists them) and counted with two public BPE tokenizers, o200k and cl100k, which agree within 4%.
Claude's own tokenizer is not public and the API count needs a logged-in `claude` (this machine's
CLI login had expired; `claude auth status` said `loggedIn: false`), so the o200k number is what is
reported and the exact count is the one re-measurement still owed - the captured texts are the
before/after files under the session scratchpad, and `claude plugin details noacg@noacg-studio`
gives Claude Code's own estimate for the skill and command (~180, "tool schemas resolved at
runtime; not counted"). RAM: the launcher spawned exactly as Claude Code spawns it
(`node mcp-server.mjs`, stdio), an MCP client performing the same `initialize` + `tools/list`
handshake, 20 s of settle, then `Get-Process` private bytes and working set. Node v24.13.0,
Windows 10. A bare idle `node` measures 20 MB private / 44 MB working set by the same method.

| | before (2026-09-02 morning) | after (this change) |
|---|---|---|
| tool schemas in the system prompt | 7 tools, 4,897 chars, **1,162 tokens** | 1 tool, 2,434 chars, **590 tokens** - and 0 unless the optional `noacg-mcp` plugin is installed |
| skill + command descriptions | 729 chars, **194 tokens** | 535 chars, **151 tokens** |
| always-on context, `noacg` plugin alone | **~1,356 tokens** | **~151 tokens** (89% less) |
| always-on context, with `noacg-mcp` too | ~1,356 tokens | ~741 tokens (45% less) |
| resident processes, `noacg` plugin alone | 1 | **0** |
| private bytes of the server at 20 s | 37 MB (local build); **83 MB on the published 0.2.0**, which still loads Playwright eagerly | 0 with `noacg` alone; 37 MB with `noacg-mcp` |
| working set at 20 s | 61 MB (local) / 110 MB (0.2.0) | 0 / 66 MB |
| server ready (initialize + tools/list) | 352 ms (local) / 923 ms (0.2.0) | 0 / 363 ms |

Two facts about the context number, both worth stating because they change what "small" means:

- Claude Code 2.1.232+ has tool search on by default, which lists MCP tools by NAME in the system
  prompt and loads the schema on demand. The docs do not say at what size it kicks in, and a
  session whose only MCP server is this one is well under any plausible threshold, so the
  full-schema number is the honest one for the plugin's target user. Under deferral the seven
  names alone cost about 90 tokens; the one name about 13.
- The Anthropic tokenizer will not give exactly 590 or 151. It will be within the spread of the
  two public tokenizers above (o200k 590 / cl100k 568) rather than off by a factor.

## What changed

1. **One MCP tool instead of seven** (`cli/src/mcp.ts`). The tool is `noacg`, with the terminal's
   own grammar: `command` is the verb (`types`, `scaffold`, `validate`, `inspect`, `screenshot`,
   `docs`, `save`) and the other arguments are that verb's flags. Every description is one line
   about DISPATCH; the teaching moved to the skill, which loads only when a graphic is being
   made. A new verb now costs one enum entry rather than a schema. `cli/test/mcp.test.mjs` pins
   the verb set, the arguments, `caspar`'s absence and a character ceiling on the rendered schema
   (2,800; the shape measures about 2,450), so a teaching sentence added to a description fails
   the build instead of quietly costing every session.
2. **The skill description was cut** from 729 to 535 characters with every trigger phrase kept
   ("for NoaCG", NoaCG, SPX, CasparCG, OGraf, "operate live", Take/Update/Out).
3. **The plugin runs no server.** `cli/plugin/` is the skill and the command; its skill drives
   the CLI from the terminal (`noacg <command>`, or `npx -y @noacg/cli <command>` with nothing
   installed). The server moved to a second, optional plugin, **`noacg-mcp`** (`cli/plugin-mcp/`),
   listed in the same marketplace, carrying the same launcher and `.mcp.json`. Both plugins are
   stamped from `cli/package.json` by `cli/scripts/build-skill.mjs`.
4. **Version 0.3.0** in `cli/package.json`, so the published 0.2.0 (still the eager-Playwright
   build, 83 MB) is replaced by the lazy build the moment it is published. Publishing is past
   `main` and is the owner's call; until then a user on 0.2.0 sees the plugin-side change (no
   server) as soon as the marketplace updates, and the server-side numbers only after the release.

## Why the split is the answer, and what would make it unnecessary

The owner's actual ask was "do not run at all until needed." That is not available for a stdio
server today, and the evidence:

- **Claude Code starts a plugin's stdio MCP servers at session start**, for every session where
  the plugin is enabled, and documents no lazy, deferred or on-first-call start for them
  (code.claude.com/docs/en/mcp: "At session startup, Claude Code connects the servers for enabled
  plugins automatically"). The one lazy mechanism that exists, the discovery cache
  (`MCP_DISCOVERY_CACHE=1`, 2.1.221+, "connects the server the first time Claude calls one of the
  server's tools"), is for HTTP/SSE servers only. The upstream change that would let the server
  stay in the `noacg` plugin is that same cache for stdio servers: remember the last `tools/list`,
  spawn on first call. Worth asking for; not something to wait for.
- **A plugin cannot ship a server disabled by default.** `enabledMcpjsonServers` and
  `disabledMcpjsonServers` apply to a project's own `.mcp.json`, not to plugin-declared servers;
  a plugin's `defaultEnabled: false` disables the whole plugin, skill included. So "one plugin,
  server off until you want it" is not expressible.
- **A skill cannot declare or start a server**, and nothing connects a new server mid-session
  without the user choosing Reconnect in `/mcp`. So "the skill fires and brings the tool with it"
  is not expressible either.
- **A server that exits when it is not wanted** (start, look at the cwd, quit) would show as a
  failed server in every unrelated session, which is worse than the cost it removes.

What IS expressible today, and is what shipped: the skill drives the terminal entrance, which the
agent already has, and the MCP entrance is opt-in - as the `noacg-mcp` plugin for "in every
session", or as a project's own `.mcp.json` for "in exactly the sessions about graphics". The
price of the terminal path is a browser launch per verb: `noacg types` against the hosted bridge
measures 2.0 s cold, `noacg docs contract` 0.4 s with no browser. The agent-round bench
(`scripts/agent-round-bench.mjs`) has driven every one of its cells through that same terminal
path since 2026-08-27, so it is the proven road, not the fallback.

## Still open, in order of value

1. **The Anthropic token count** of the before/after texts, once `claude login` is done on a
   machine: the captured texts are in this session's scratchpad and the shape is trivially
   re-captured with an MCP client's `tools/list`. Expect the same ratio.
2. **Publish 0.3.0** (owner). Until then the `noacg-mcp` plugin and any `claude mcp add` user run
   the 83 MB 0.2.0 server, and `npx -y @noacg/cli mcp` exposes the seven-tool shape.
3. **The MCP SDK is 14 of the 37 MB.** An SDK-only server with one trivial tool measures 34 MB
   private by the same method; the CLI's own modules add 3 MB. A hand-written JSON-RPC stdio
   server (initialize, ping, tools/list, tools/call, resources/list, resources/read) would sit
   near the 20 MB bare-node floor and would let `@modelcontextprotocol/sdk` and `zod` leave the
   package's dependencies. About 150 lines, tested by the same SDK client the test already uses.
   Worth it only when the `noacg-mcp` plugin has users; the split made it the smaller problem.
4. **Re-verify the Codex side after the split** (`codex plugin add noacg-mcp@noacg-studio`
   registering the server the way the combined plugin did on 2026-08-27).

## Related

`cli/plugin/` and `cli/plugin-mcp/` are the two plugins; `.claude-plugin/marketplace.json` lists
both; `cli/src/mcp.ts` is the server; `docs/AGENT_CLI.md` documents the door and "What a session
pays".
