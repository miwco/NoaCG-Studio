# noacg

The [NoaCG Studio](https://noacg.studio) command-line tool and MCP server: make broadcast
graphics for NoaCG from a coding agent's terminal - scaffold, validate, inspect, screenshot,
package, save - against any NoaCG deployment. The full account is the repo's `docs/AGENT_CLI.md`.

## Install

```
npx noacg doctor                 # no install: runs the published build
npm i -g noacg                   # or install it once
```

**Claude Code**: the `noacg` plugin ships the `noacg-graphic` skill, a `/noacg:graphic` command
and this MCP server:

```
claude plugin marketplace add miwco/NoaCG-Studio
claude plugin install noacg@noacg-studio
```

**Codex**: copy `skill/noacg-graphic/` from this package (or `cli/plugin/skills/noacg-graphic/`
in the repo) to `~/.codex/skills/noacg-graphic/`, then `codex mcp add noacg -- npx -y noacg mcp`.

**Any MCP client**: `claude mcp add noacg -- npx -y noacg mcp` (Claude Code), or the equivalent
stdio entry - command `npx`, args `-y noacg mcp`.

## Use

```
npx noacg types
npx noacg scaffold --type scoreboard --design neutral --name "Football scoreboard" --out ./football-scoreboard
#  ...design it: edit football-scoreboard.html, css/template.css, js/template.js ...
npx noacg validate ./football-scoreboard --screenshots ./shots
npx noacg inspect ./football-scoreboard
npx noacg login                  # once per machine: a scoped key that can only create graphics in your library
npx noacg save ./football-scoreboard
```

| Command | What it does |
|---|---|
| `doctor` | Which browser and which NoaCG deployment (`NOACG_URL`) this tool will use, the bridge version it found, and whether a key is held. |
| `types` | The graphic types the deployment knows: fields, operator events, designs, neutral scaffold. |
| `scaffold --type <id> [--design <id>\|neutral] [--name N] [--set key=value]... --out <dir>` | A complete, valid package from a type: a catalog chassis or the NEUTRAL scaffold (fields, machine, controls and runtime on a plain spine). |
| `scaffold --fields "Label:kind[=value],..." [--name N] --out <dir>` | A typeless graphic with exactly the fields you declare. |
| `validate <dir\|zip> [--no-bench] [--no-house-contract] [--screenshots <dir>]` | The static gate + the live runtime bench, every finding as a teaching line, readiness rows, optional off/on-air/stress frames - and the package's generated half regenerated from the sources. Third-party OGraf packages: manifest conformance + a host-driven lifecycle check. |
| `inspect <dir\|zip>` | The operator surface NoaCG derives from the graphic's own contract (inputs, buttons, steps). |
| `screenshot <dir\|zip> --state off\|onair\|stress --out <png>` | One transparent frame. |
| `pack <dir\|zip>... --out <file.noacgpack.json>` | A multi-graphic production file for the studio's Import door. |
| `docs [topic]` | The skill's reference texts. |
| `mcp` | The same verbs as an MCP server over stdio. |
| `login [--name N] [--no-browser] [--key <noacg_ak_…>]` | Get a scoped agent key for this machine: opens the NoaCG consent page, receives a one-time code on a loopback listener, redeems it. The key can only create graphics in your library; revoke it in Settings → Account → Agent access or with `logout`. `NOACG_AGENT_KEY` for CI. |
| `logout [--local]` / `whoami` | Revoke + forget this machine's key / show which key is held and whether it is still valid. |
| `save <dir\|zip> [--name N] [--folder F] [--no-bench]` | Validate (gate + bench), refuse on errors, then put the graphic in your NoaCG library and print its `#/graphic/<id>` link. Save = the library, never a production. |

Add `--json` to any command for one JSON object on stdout. Exit codes: 0 clean, 1 findings or
refused, 2 usage/IO error. Environment: `NOACG_URL` (default `https://noacg.studio`; a dev server
or self-host works), `NOACG_BROWSER` (a Chromium executable; otherwise the system Chrome/Edge or a
Playwright-installed Chromium is used), `NOACG_AGENT_KEY` (a key for CI - beats the stored one).

## The package on disk

```
<slug>/
  SOURCES - edit these                  GENERATED - never edit; `noacg validate` rebuilds them
    <slug>.html                            <slug>.ograf.json   the OGraf v1 manifest (+ v_noacg)
    css/template.css                       graphic.mjs         the OGraf Web Component
    js/template.js                         FIELDS.md  README.md  controlpanel.html
    js/gsap.min.js  images/  fonts/
```

One folder is a valid EBU OGraf v1 Graphic, the SPX/CasparCG package and the workspace you edit.
Zip it and it imports through the studio's Import door; drop it in an OGraf renderer and it plays.

## MCP

Tools: `noacg_types`, `noacg_scaffold`, `noacg_validate` (screenshots as images), `noacg_inspect`,
`noacg_screenshot`, `noacg_save` (after `noacg login`), `noacg_docs`; the skill's references are
resources (`noacg://docs/<topic>`). The `noacg-graphic` skill ships under `skill/`.

## Develop

```
npm install
npm run build                                # generates the plugin's skill copy, then tsc
NOACG_URL=http://localhost:5174 npm test     # against a NoaCG dev server's /bridge
npm run check:skill                          # every shipped copy of the skill matches cli/skill/
```
