# 2026-09-02 - row E: the invisible CLI

Branch `claude/e-invisible-cli`, four commits on `b0750116`, gated and queued. The owner's ask:
"How can we make the CLI as close to invisible as possible unless the user is actually using
NoaCG?" The answer is a measured before-and-after, a real cut, and a design for the rest that
says what is possible today and what needs an upstream change.

## The numbers

Method in `docs/AGENT_CLI.md` "What a session pays" (the durable home; the backlog receipt is
deleted as landed). A Claude Code session that never mentions NoaCG, with the plugin installed:

| | before | after |
|---|---|---|
| tool schemas in the system prompt | 7 tools, 4,897 chars, 1,162 tokens | 1 tool, 2,457 chars, 596 tokens - and **0** unless the optional `noacg-mcp` plugin is installed |
| skill + command descriptions | 729 chars, 194 tokens | 535 chars, 151 tokens |
| always-on context, `noacg` plugin alone | ~1,356 tokens | **~151 tokens** (89% less) |
| always-on context, with `noacg-mcp` too | ~1,356 tokens | ~747 tokens |
| resident processes, `noacg` plugin alone | 1 | **0** |
| private bytes of the server at 20 s | 37 MB local build; 83 MB on the published 0.2.0 | 0 with `noacg` alone; 37 MB with `noacg-mcp` |

Token counts are o200k counts of the exact rendered text (cl100k agrees within 4%). The
Anthropic count needs a logged-in `claude`; this machine's CLI login had expired (`claude auth
status`: `loggedIn: false`), and that is not something a session can fix. `claude plugin details`
gives Claude Code's own estimate for the skill and command (~180 before) and says outright that
MCP schemas are "resolved at runtime; not counted", so the schema number had to be measured by
hand. RAM: the launcher spawned as Claude Code spawns it, a real MCP client doing initialize +
tools/list, 20 s settle, `Get-Process`. Bare node is 20 MB by the same method, an MCP SDK server
with one trivial tool 34 MB.

## What landed

1. **One MCP tool instead of seven.** `noacg`, with `command` as the verb and the terminal's flags
   as arguments. One table, READS, says which verb reads which argument; it writes the argument
   descriptions and refuses a stray argument by name, which is what closed the bug the flat
   schema had opened (validate honoured `houseContract`, save silently dropped it). A missing
   argument is the CLI's own `UsageError`; the SDK turns any throw into a tool error. The offline
   test pins the verb set, `caspar`'s absence, the per-verb prefix on every description, the
   usage errors and a 2,800-character ceiling on the rendered schema.
2. **The plugin runs nothing until a graphic is being made.** `cli/plugin/` is the skill and the
   command; its skill drives the CLI from the terminal (`noacg <command>` or `npx -y @noacg/cli
   <command>`). The server, its launcher and `.mcp.json` moved to `cli/plugin-mcp/`, the optional
   `noacg-mcp` plugin in the same marketplace. Both are stamped from `cli/package.json` by
   `build-skill.mjs`, which now reads the plugin list from the marketplace so a listed plugin can
   never miss its stamp. The `.mcp.json` ignore rule is anchored to the repository root - the
   old per-path negation shipped the split plugin with no server until it was found by hand.
3. **The MCP validate shares the regenerate step with the terminal** (`regenerateInPlace` in
   `commands/validate.ts`): it had dropped an existing thumbnail and left a previous name's
   generated files behind, two fixes only the terminal had received. `save` refuses a missing key
   before it starts a browser, as the terminal does.
4. **Version 0.3.0**, skill description cut with every trigger kept, and every README, help text
   and doc that promised the server inside the `noacg` plugin or named the seven tools now
   describes the split.

## Fix 3, the design

"Start only when a NoaCG tool is first called" is not available for a stdio server today, with
the evidence in `docs/AGENT_CLI.md`: Claude Code starts plugin stdio servers at session start and
documents no lazy start for them; the discovery cache (`MCP_DISCOVERY_CACHE=1`, 2.1.221+) does
exactly that but for HTTP/SSE servers only; a plugin cannot ship a server disabled by default; a
skill cannot bring a server; a server that exits when unwanted shows as failed everywhere. **The
upstream ask is the discovery cache for stdio servers** (remember the last `tools/list`, spawn on
first call), which would let the server move back into the one plugin. What is expressible today
shipped: the terminal entrance by default, the MCP entrance opt-in (the `noacg-mcp` plugin, or a
graphics project's own `.mcp.json` for "exactly the sessions about graphics"). The terminal path
costs a browser launch per verb, 2.0 s cold for `noacg types` against the hosted bridge; the
agent-round bench has run on that path since 2026-08-27.

## /check

- review: **delegated** - code-review returned five candidates directly, and the orchestrator
  relayed eight finder reports its fan-out produced; 31 findings, 24 fixed, all verified against
  this worktree's files first (scope: 34 files on `b0750116`, branch confirmed).
- simplify: **inline** - the skill returned fan-out instructions; the four angles were covered
  here (six changes, listed in the verdict stamp).
- verify: root `npm run build` exit 0; `cli/` build + test 55 passed / 5 skipped (smoke, no
  bridge) / 0 failed; `claude plugin validate` passed on both plugin dirs and the marketplace; CI
  run 33683809183 on `7578277e`: Build, E2E plan, Factory gates, E2E 1/1 (subset), Combined E2E
  report and CI gate all success, Vercel and Catalog calibration skipped by plan. The stamp is at
  `.git/noacg-jobs/checks/claude-e-invisible-cli.json`.

## Deferred, recorded in `docs/AGENT_CLI.md` "Still open"

The Anthropic token count (needs `claude login`); publishing 0.3.0 (owner-queue item, kind
owner-action); a hand-written JSON-RPC server to drop the SDK's 14 of 37 MB; re-verifying the
Codex side after the split; `scaffold`, `inspect` and `screenshot` still re-implementing the
terminal's package-open sequence, with `scaffold` round-tripping typed input through the flag
grammar (`--size-scale`, `--type-scale`, `--fps`, `--resolution` unreachable over MCP, a value
starting with `--` swallowed). Also not built: a `claude plugin validate` gate over the plugin
dirs (the CLI is not on CI) and a tie between `MCP_COMMANDS` and the terminal's `COMMANDS` table.

## For row G (the public-docs rewrite)

`docs.html` was touched in exactly two places, both under "Make graphics with an agent":

- the paragraph after `<strong>Claude Code.</strong>` (the skill and the command, "runs nothing
  until a graphic is being made", the terminal drives the CLI) plus a new paragraph and
  `<pre>` offering `claude plugin install noacg-mcp@noacg-studio` with its cost;
- the paragraph after `claude mcp add noacg -- npx -y @noacg/cli mcp`, now describing the one
  `noacg` tool and its `command` argument, and that a server registered that way runs in every
  session of its scope.

Everything else on the page is old prose. The colon-as-connector the review caught is fixed.

## Owner queue

- `2026-09-02-the-invisible-plugin.md` (owner-action): publish 0.3.0; the route to see the split.
- `2026-09-02-two-plugins-story.md` (walk): is the two-plugin story the one to tell strangers,
  and does 2 s per verb on the terminal path read as acceptable.

## Measurement scripts

In the session scratchpad, not the repo: `measure-ram.mjs` (spawn the launcher, handshake, settle,
`Get-Process`), `dump-tools.mjs` (the rendered tool schemas), `count.mjs` (o200k + cl100k), and
the captured before/after texts. Re-creating them is a few minutes with any MCP client.
