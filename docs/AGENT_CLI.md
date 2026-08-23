# The agent door: `noacg` CLI + MCP server, the `/bridge` page, the graphic package

> Let users use Claude Code, Codex and future coding/design agents to create genuinely
> excellent-looking graphics IN THE WAY THOSE AGENTS WORK BEST, while NoaCG provides the bridge
> that turns those graphics into reliable, editable, controllable broadcast graphics that can be
> saved and played through NoaCG.

Two conditions, both required: the graphic must look genuinely good, and it must be genuinely
NoaCG-playable (fields, actions, animation, validation, compatibility, operator controls and
playout all work). **The CLI/MCP is a BRIDGE and broadcast interface, not a creative harness.**
NoaCG tells the agent WHAT the graphic must expose, WHICH runtime/interchange contract to satisfy,
HOW to validate, inspect, play and save it, and the hard broadcast constraints that matter. It is
deliberately silent about composition, hierarchy, shape language and the agent's design process -
the agent does what it is already good at; NoaCG supplies the contract, tools, validation and
destination. The outcome to judge every decision against: *"I asked my coding agent to make a
great graphic. It made one. Now it is in NoaCG, editable and ready to go on air."*

## The shape

```
 user's machine                                            the NoaCG deployment (NOACG_URL)
 ┌──────────────────────────────────────────┐              ┌───────────────────────────────────┐
 │ Claude Code / Codex / any MCP client     │              │ /bridge   window.noacgBridge       │
 │   the noacg-graphic skill (contract only)│   drives     │   hello types scaffold validate    │
 │   noacg CLI (playwright-core, system     ├─────────────▶│   inspect compose readPackage      │
 │     Chrome/Edge, a FRESH contained ctx)  │  headless    │   exportPackage packEntry          │
 │   noacg mcp  (same library, stdio)       │  Chromium    │   graphicDoc ografHost             │
 │   holds: a scoped agent key              │              ├───────────────────────────────────┤
 │     (noacg login, docs/AGENT_SAVE.md)    │   POST       │ /api/me/graphics  -> the library  │
 └──────────────────────────────────────────┘              └───────────────────────────────────┘
```

Everything the bridge does is the studio's OWN code - the type registry, `publishGate`, the
runtime bench, `composeDocument`, the exporters, the importer, the control generator - so an
agent is validated by the very deployment it saves into. The bridge page holds no account, no
key and no store (`src/bridge/`, `docs/ARCHITECTURE.md`).

## The graphic package (the workspace on disk)

One folder that is simultaneously a valid **EBU OGraf v1** Graphic and the **SPX** package, and
the workspace an agent edits (`src/export/noacgPackage.ts`, `docs/OGRAF.md`):

```
<slug>/
  SOURCES - edit these                  GENERATED - never edit, rebuilt by `noacg validate`/`save`
    <slug>.html                            <slug>.ograf.json     the OGraf manifest (+ v_noacg)
    css/template.css                       graphic.mjs           the Web Component wrapping the runtime
    js/template.js                         FIELDS.md  README.md  GETTING-ON-AIR.md  controlpanel.html
    js/gsap.min.js  images/  fonts/     (shared by both halves)
```

A renderer reads the manifest + `graphic.mjs` and ignores the sources; NoaCG reads the sources
(and the manifest's `v_noacg` block for the graphic TYPE) and ignores the generated half; SPX /
CasparCG read `<slug>.html` + `css/` + `js/` as they always have. The manifest's `v_noacg` is the
standard's vendor-extension mechanism used for exactly what plain OGraf cannot express: the type,
pointers at the sources, the sources' content hash (`sourceHash`, so a stale generated half is
detectable), and the generator. Nothing else is NoaCG-specific; there is no second manifest.

`zip` the folder and it imports through the studio's Import door (it is an SPX package); drop it
in an OGraf renderer and it plays (it is an OGraf package); `noacg save` puts it in your library.

## The CLI

Install: `npx noacg <command>` (or `npm i -g noacg`). Every command takes `--json` for
machine-readable output. Exit codes: `0` clean, `1` the graphic has findings (validate) or the
request was refused, `2` a usage/IO error.

| Command | What it does |
|---|---|
| `noacg doctor` | Reports the browser it will use, the bridge it reaches at `NOACG_URL` and its protocol version, and whether a key is held for it (`whoami` asks the deployment if it is still valid). |
| `noacg types [--json]` | The graphic TYPES the deployment knows: fields (key, label, kind, role), operator events, designs, whether a neutral scaffold exists. Optional - an agent may author from scratch against the contract. |
| `noacg scaffold --type <id> [--design <id>\|neutral] [--name N] [--set key=value ...] [--palette id] [--font id] [--zone z] --out <dir>` | A complete, valid graphic package from a type: a catalog chassis (a proven composition to restyle) or the NEUTRAL scaffold (the type's fields, machine, controls and runtime on a plain spine). |
| `noacg scaffold --fields "Label:kind[=value],..." [--name N] --out <dir>` | A typeless graphic (`blank`) with exactly the fields you declare - every one an operator input, the implicit lifecycle machine. |
| `noacg validate <dir\|zip> [--no-bench] [--no-house-contract] [--screenshots <dir>] [--json]` | For a NoaCG package: the static gate (`publishGate`), the live runtime bench (binding, pre-play, entrance, overlap/overflow, doubled-text stress, exit, replay, editability, field paint, type floor), readiness rows, engine compatibility - then REGENERATES the OGraf half from the sources and warns when it was stale. For a third-party OGraf package: manifest + package conformance, then the OGraf host drives load / update / custom actions / play / stop and reports every ReturnPayload. `--screenshots` writes `off.png`, `onair.png`, `stress.png` (transparent) - the agent's eyes. |
| `noacg inspect <dir\|zip> [--json]` | The operator surface NoaCG derives from the graphic's own contract: one input per field, one button per action/event, the step semantics - for a NoaCG template from its definition + machine, for any OGraf manifest from `schema` + `customActions` + `stepCount`. No category is consulted, ever. |
| `noacg screenshot <dir\|zip> --state off\|onair\|stress [--data k=v ...] --out <png>` | One transparent frame of the settled graphic. |
| `noacg pack <dir...> --out <file.noacgpack.json> [--layer n]` | A multi-graphic production file for the studio's Import door (`docs/GRAPHICS_PACKS.md`). |
| `noacg docs [contract\|package\|validator\|ograf]` | Prints the skill's reference texts (the same files the skill ships). |
| `noacg login [--name N] [--no-browser] [--key <noacg_ak_…>]` / `logout [--local]` / `whoami` | Obtain, end and show this machine's SCOPED AGENT KEY (docs/AGENT_SAVE.md): `login` opens the consent page in your browser and receives a one-time code on a loopback listener - the key is minted at redeem and never transits the browser; it can only create graphics in your library. `--key` stores a key minted elsewhere. |
| `noacg save <dir\|zip> [--name N] [--folder F] [--no-bench]` | Validate (gate + bench) in the bridge, refuse on errors, then POST the library record to `/api/me/graphics` with the key; prints the `#/graphic/<id>` link, which opens at once (a miss while signed in runs one sync pass). SAVE is the library - never publish, never a production. |
| `noacg mcp` | The same verbs as an MCP server over stdio (`noacg_types`, `noacg_scaffold`, `noacg_validate`, `noacg_inspect`, `noacg_screenshot`, `noacg_save`; screenshots are returned as images). |

Environment: `NOACG_URL` (the deployment to drive and save to; default `https://noacg.studio`;
`http://localhost:<port>` for a dev server; any self-host), `NOACG_BROWSER` (a Chromium
executable when the system Chrome/Edge channel is not wanted), `NOACG_AGENT_KEY` (a key for CI /
containers - beats the stored one), `NOACG_AGENT_NAME` (what `login` calls itself).

Vocabulary (the product's): `save` puts a graphic in the LIBRARY. `publish` is what a PRODUCTION
does when it goes to the hosted control page / output URL; `add`, `publish`, `take`/`update`/
`next`/`out` are reserved verbs for later capabilities and are never what `save` does.

### Protocol

The CLI opens `${NOACG_URL}/bridge` in its own headless browser, waits for
`window.__noacgBridgeReady`, calls `hello()` and reads `{ channel: 'noacg-bridge', v, app }`
(`src/bridge/bridgeApi.ts`, `BRIDGE_V`). The CLI declares the `v` range it speaks; a deployment
speaking a newer `v` is refused with *"this NoaCG speaks bridge v2 - update noacg"*, an older one
with the reverse - the pack format's refuse-with-upgrade idiom, because a human can act on it.
Additive fields on any result never bump `v`; a breaking change does.

### Containment (the bench executes the agent's code)

The bridge's validator runs the template - in the bench browser, at the app origin, in an iframe
the bench reads directly. The execution environment is therefore the boundary, and the CLI's
browser context is built for it, in this order: the share-safety regex screen runs FIRST and a
template it refuses is never benched (`unsafe-js-*` findings are taught, not run); the context is
FRESH and non-persistent (never the user's profile - it holds no session, no key; the agent
credential is sent from Node, never from the browser); a `context.route('**/*')` allowlist admits
the app origin's GET requests outside `/api/*` and the CLI's own package mount, and aborts
everything else; `routeWebSocket` closes every socket; `serviceWorkers: 'block'`,
`acceptDownloads: false`, `permissions: []`, `bypassCSP: false`; popups are closed on arrival; the
bench's own `timeoutMs` is explicit and an outer race at about twice that hard-closes the context
(the bench's race only stops waiting). Residual: a template that spins the main thread, GPU
exhaustion - stated, not hidden. A later hardening is to sandbox the bench iframe and take the
measurements from the driver through `frameLocator().evaluate()` (see `src/ai/safety.ts`).

Third-party OGraf packages are mounted under the app origin at `/__noacg-package/<id>/...` by
`context.route` (a module import needs a real http(s) URL, and a component's
`new URL(…, import.meta.url)` needs a base) and hosted by `src/bridge/ografHost.ts` - a minimal
renderer for ONE Graphic with a driver the CLI calls.

## The skill (`cli/skill/noacg-graphic/`)

Contract-only by default: the SPX/NoaCG runtime contract (definition + DataFields, `fN` ->
`id="fN"`, `play/stop/update/next`, ES5, GSAP only, relative references), the EDITABILITY contract
(the structure spine `.<prefix> > .<prefix>-box > .<prefix>-mask > span#fN`, the `:root`
variables, the marked ANIMATION region with its NOACG_ANIM data and the interpreter you never
edit), the package anatomy, the OGraf contract, the control verbs and the two markup conventions
the control layer reads (`.<prefix>-clock` + `data-count`/`data-start`; A/B side tokens), and a
glossary of WHAT THE VALIDATOR MEASURES so a finding is understood. The loop it teaches:
(optionally `types` / `scaffold` when the graphic needs a type's machine or a chassis saves work)
-> author the way the agent normally works -> `validate` (+ screenshots) until clean -> `save`.
The one content rule: content an operator or another broadcaster would change is a field;
decoration and genuinely fixed semantic labels may stay static; never bake event-specific
content. NOT in the default skill: taste rules, motion doctrine, composition/hierarchy/shape
guidance - those live in `references/design-notes.md`, off by default, to be tested as its own
arm. With a design skill active, NoaCG's rules bind only for correctness, editability,
compatibility and playout; the look is the agent's; page/responsive/mobile guidance does not
apply to a fixed 1920x1080 frame.

The canonical source is the one under `cli/skill/`; the in-repo dogfooding adapters
(`.agent-workflows/noacg-graphic.md`, `.claude/skills/noacg-graphic/`, `.agents/skills/noacg-graphic/`)
and every shipped copy (npm, the Claude Code plugin, the Codex skill) are generated from it by
`cli/scripts/build-skill.mjs` - never hand-copied.

## Distribution (one source, every shipped copy generated)

| Channel | What ships | Install |
|---|---|---|
| **npm** `noacg` (`cli/`) | the CLI + MCP server (`dist/`), the skill (`skill/` IS `cli/skill/noacg-graphic/`), README, LICENSE | `npx noacg <cmd>` / `npm i -g noacg` |
| **Claude Code plugin** (`cli/plugin/`, marketplace `noacg-studio` = root `.claude-plugin/marketplace.json`) | the skill copy, `/noacg:graphic`, `.mcp.json` running `npx -y noacg mcp` | `claude plugin marketplace add miwco/NoaCG-Studio` then `claude plugin install noacg@noacg-studio`; from a checkout `claude --plugin-dir ./cli/plugin` |
| **Codex** (`cli/plugin/.codex-plugin/plugin.json`, the same `skills/`) | the skill copy | copy `cli/plugin/skills/noacg-graphic/` to `~/.codex/skills/`; `codex mcp add noacg -- npx -y noacg mcp` |
| **In-repo dogfooding** | the thin adapter triple (`.agent-workflows/noacg-graphic.md`, `.claude/skills/`, `.agents/skills/`) - POINTERS at the source | already there |

`cli/scripts/build-skill.mjs` writes every generated copy from `cli/skill/noacg-graphic/` and stamps
the npm version onto the two plugin manifests and the marketplace entry; `npm run build` runs it in
`--check` mode and fails on drift (a deleted reference must vanish from the copy too). The adapter
triple is guarded by `scripts/check-shared-instructions.mjs` and never generated. Verified
2026-08-22: `npm pack --dry-run` = 31 files (dist, skill, package.json, README, LICENSE); the plugin
installed from this repository as a marketplace (`claude plugin install noacg@noacg-studio`) and
`claude plugin details` listed the skill, the command and the MCP server at v0.2.0. Publishing
(`npm publish` from `cli/`, and pushing the marketplace) is the owner's call; until the package is
on npm the plugin's MCP server cannot start (`npx -y noacg` has nothing to fetch) while its skill
and command already work.

## The category-agnostic proof

The playout boundary derives every operator surface from the graphic itself - fields -> inputs,
the machine's operator events -> buttons, nothing from a category (`docs/CONTROL_LAYER.md`,
`src/control/controlModel.ts`). Two acceptance cases pin it for the agent door:
`e2e/ograf-contract.spec.ts` renders the REAL control components from a hand-written third-party
OGraf manifest (semantic keys, custom actions, `stepCount`) through `control/ografContract.ts`,
and drives the Graphic in the host; and a typeless NoaCG graphic (`scaffold --fields`) added to a
production shows an input per field + Take/Update/Next/Out. No application code names either.

## Status

- **P1 (this document's subject):** the bridge page, the dual package, the neutral scaffold, the
  OGraf contract adapter, the CLI core + MCP, the skill. LANDED on the branch, offline-verified:
  `e2e/bridge.spec.ts` + `e2e/ograf-contract.spec.ts`, the CLI smoke (`npm run bench:cli`, five
  tests including the third-party OGraf host), and the pre-existing OGraf conformance, import,
  export and SVG-import specs all green.
- **P2 (docs/AGENT_SAVE.md):** `save` - a scoped agent key minted through a loopback one-time
  code, the permission vocabulary (`src/entitlements/permissions.ts`), `/api/me/agent-keys` +
  `/api/me/graphics` (the server never executes template code), the consent route, Settings →
  Account → Agent access, and the library->air gates at hosted publish and production export.
  LANDED on its branch; offline-verified by `e2e/agent-access.spec.ts` + `e2e/production-gate.spec.ts`
  and the api unit tests; the live walk is `e2e/configured/agent-access.spec.ts`.
- **P3, part A (distribution):** LANDED on its branch - the one skill generator + check, the
  Claude Code plugin + marketplace entry, the Codex manifest + skill copy, the npm package at
  0.2.0 (`npm pack --dry-run` clean), the plugin installed from the repo marketplace for real; the
  two P1 leftovers closed (the dual package loaded and driven in SuperFlyTV's ograf-server -
  `docs/OGRAF.md` - and the CLI-produced zip walked through the Import door, which also found
  and fixed a PowerShell-backslash zip and the scaffold-name round trip); a typeless graphic
  reads "Custom" in the library; the round's brief bank (`benchmarks/agent/v1/briefs.json`) and
  runner (`scripts/agent-round-bench.mjs`, control mode free, `--run` spends).
- **P3, part B (the measured round): RUN 2026-08-22, blind-read 2026-08-23, decided.** 25/25
  cells validator-clean across arms A-E; the owner could not separate the arms visually and
  called every graphic airable ("so much better than through the Create with AI and the API").
  The verdict (`benchmarks/agent/rounds/2026-08-22/VERDICT.md`): the skill STAYS contract-only
  with free authoring as the default; design-notes stays optional (arm E showed no visible gain,
  arm D none for the highest cost); the one sharpened rule is "actions come from a type" -
  scaffold arms carried the machine every time, free arms shipped state as fields on 4 of 7
  typed-action cells; and all five novel-brief cells authored a WORKING machine from scratch -
  the evidence the Future item "agent-authored machines" was waiting on (owner gate).
