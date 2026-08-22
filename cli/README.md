# noacg

The [NoaCG Studio](https://noacg.studio) command-line tool and MCP server: make broadcast
graphics for NoaCG from a coding agent's terminal - scaffold, validate, inspect, screenshot,
package - against any NoaCG deployment. The full account is the repo's `docs/AGENT_CLI.md`.

```
npx noacg doctor
npx noacg types
npx noacg scaffold --type scoreboard --design neutral --name "Football scoreboard" --out ./football-scoreboard
#  ...design it: edit football-scoreboard.html, css/template.css, js/template.js ...
npx noacg validate ./football-scoreboard --screenshots ./shots
npx noacg inspect ./football-scoreboard
```

| Command | What it does |
|---|---|
| `doctor` | Which browser and which NoaCG deployment (`NOACG_URL`) this tool will use, and the bridge version it found. |
| `types` | The graphic types the deployment knows: fields, operator events, designs, neutral scaffold. |
| `scaffold --type <id> [--design <id>\|neutral] [--name N] [--set key=value]... --out <dir>` | A complete, valid package from a type: a catalog chassis or the NEUTRAL scaffold (fields, machine, controls and runtime on a plain spine). |
| `scaffold --fields "Label:kind[=value],..." [--name N] --out <dir>` | A typeless graphic with exactly the fields you declare. |
| `validate <dir\|zip> [--no-bench] [--no-house-contract] [--screenshots <dir>]` | The static gate + the live runtime bench, every finding as a teaching line, readiness rows, optional off/on-air/stress frames - and the package's generated half regenerated from the sources. Third-party OGraf packages: manifest conformance + a host-driven lifecycle check. |
| `inspect <dir\|zip>` | The operator surface NoaCG derives from the graphic's own contract (inputs, buttons, steps). |
| `screenshot <dir\|zip> --state off\|onair\|stress --out <png>` | One transparent frame. |
| `pack <dir\|zip>... --out <file.noacgpack.json>` | A multi-graphic production file for the studio's Import door. |
| `docs [topic]` | The skill's reference texts. |
| `mcp` | The same verbs as an MCP server over stdio. |
| `login` / `save` | Next release (the scoped agent key). |

Add `--json` to any command for one JSON object on stdout. Exit codes: 0 clean, 1 findings or
refused, 2 usage/IO error. Environment: `NOACG_URL` (default `https://noacg.studio`; a dev server
or self-host works), `NOACG_BROWSER` (a Chromium executable; otherwise the system Chrome/Edge or a
Playwright-installed Chromium is used).

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

## MCP

```
claude mcp add noacg -- npx -y noacg mcp
```

Tools: `noacg_types`, `noacg_scaffold`, `noacg_validate` (screenshots as images), `noacg_inspect`,
`noacg_screenshot`, `noacg_docs`. The `noacg-graphic` skill ships under `skill/`.

## Develop

```
npm install
npm run build
NOACG_URL=http://localhost:5174 npm test     # against a NoaCG dev server's /bridge
```
