# The `noacg` plugin (Claude Code + Codex)

The plugin is one of three entrances to the **NoaCG CLI** (`@noacg/cli`, the command `noacg`) -
the others being the MCP server on its own and the plain terminal. It is the easiest one: it
brings the contract, the command and the tools together with nothing to install first. Everything
it runs is that same npm package; there is no separate plugin implementation.

One plugin directory, two manifests: `.claude-plugin/plugin.json` for Claude Code and
`.codex-plugin/plugin.json` for Codex. Both read the same `skills/noacg-graphic/`.

| Piece | What it is |
|---|---|
| `skills/noacg-graphic/` | **GENERATED** - a byte-identical copy of `cli/skill/noacg-graphic/` (the one source). Never edit here; edit the source and run `node cli/scripts/build-skill.mjs`. `npm run build` fails when this copy drifts. |
| `commands/graphic.md` | `/noacg:graphic <brief>` - make a NoaCG graphic (loads the skill, runs the loop). |
| `.mcp.json` | The `noacg` MCP server: `npx -y @noacg/cli mcp` - `noacg_types`, `noacg_scaffold`, `noacg_validate` (screenshots as images), `noacg_inspect`, `noacg_screenshot`, `noacg_save`, `noacg_docs`. |
| `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` | The manifests. Their `version` is stamped from `cli/package.json` by the same generator. |

The marketplace entry lives at the repository root (`.claude-plugin/marketplace.json`,
marketplace name `noacg-studio`).

## Install

**Claude Code** (any machine):

```bash
claude plugin marketplace add miwco/NoaCG-Studio
claude plugin install noacg@noacg-studio
```

From a clone, `claude plugin marketplace add ./` reads the same root manifest. Either way the
marketplace is named `noacg-studio`, which is the `name` field in
`.claude-plugin/marketplace.json` rather than anything derived from the source.

Then `/noacg:graphic a football scoreboard for our school channel`, or just ask for a graphic
"for NoaCG" - the skill triggers on the description. The MCP server starts from npm on first use
(`npx -y @noacg/cli mcp`), so `@noacg/cli` has to be published for it to come up; the skill and the command
work the moment the plugin is installed. Saving needs `noacg login` once (docs/AGENT_SAVE.md).

From a checkout, for one session only: `claude --plugin-dir ./cli/plugin`.

**Codex**: `codex plugin` reads the SAME root `.claude-plugin/marketplace.json`, so the plugin
installs from the repository the same way (verified 2026-08-27 against `origin/main` and against a
local checkout):

```bash
codex plugin marketplace add miwco/NoaCG-Studio
codex plugin add noacg@noacg-studio
```

That copies the whole plugin directory into `~/.codex/plugins/cache/noacg-studio/noacg/<version>/`
- the skill, the command and `.mcp.json` - and `codex mcp list` then shows the `noacg` server
without a line ever being written to `~/.codex/config.toml`. So neither the manual skill copy nor
`codex mcp add` is needed any more.

On a Codex build without `codex plugin`, the old path still works: copy `skills/noacg-graphic/` to
`~/.codex/skills/noacg-graphic/` (Codex loads every `~/.codex/skills/*/SKILL.md`), and add the MCP
server with `codex mcp add noacg -- npx -y @noacg/cli mcp`.

**Any MCP client**: `npx -y @noacg/cli mcp` over stdio; the skill's references are the server's
resources (`noacg://docs/<topic>`).
