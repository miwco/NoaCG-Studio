# The `noacg` plugin (Claude Code + Codex)

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

**Claude Code**, from a clone of this repository:

```bash
claude plugin marketplace add ./
claude plugin install noacg@noacg-studio
```

`noacg-studio` is the `name` in the root `.claude-plugin/marketplace.json`, not something
derived from where the marketplace came from. There is deliberately no `owner/repo` shorthand
here: it would put a personal GitHub handle into a command people type. A published address for
this marketplace is an owner decision, filed under `docs/acceptance/owner-queue/`.

Then `/noacg:graphic a football scoreboard for our school channel`, or just ask for a graphic
"for NoaCG" - the skill triggers on the description. The MCP server starts from npm on first use
(`npx -y @noacg/cli mcp`), so `@noacg/cli` has to be published for it to come up; the skill and the command
work the moment the plugin is installed. Saving needs `noacg login` once (docs/AGENT_SAVE.md).

From a checkout, for one session only: `claude --plugin-dir ./cli/plugin`.

**Codex**: copy `skills/noacg-graphic/` to `~/.codex/skills/noacg-graphic/` (Codex loads every
`~/.codex/skills/*/SKILL.md`), and add the MCP server with
`codex mcp add noacg -- npx -y @noacg/cli mcp`. A Codex plugin marketplace entry is not shipped yet -
the `.codex-plugin/plugin.json` manifest is here so the same directory is installable the day one
is added.

**Any MCP client**: `npx -y @noacg/cli mcp` over stdio; the skill's references are the server's
resources (`noacg://docs/<topic>`).
