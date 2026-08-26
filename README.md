# NoaCG Studio

**Premium broadcast graphics, built by choosing — then exported to whatever you already run.**

Lower thirds, tickers, scoreboards, countdowns, alerts, credits and more: pick a design, set your
fields, style it to your brand, animate it, and export a working template for **SPX**,
**CasparCG**, **OGraf**, **H2R**, **LiveOS**, or a plain **HTML overlay** for OBS and vMix. Or skip
the export and render finished **MP4 / transparent WebM / ProRes / PNG** media instead.

**No account needed to create, preview, or export.** Free forever for the core, self-hostable in
full, AGPL-3.0.

**→ [noacg.studio](https://noacg.studio)**

![The New Project entry: start from a template, create with AI, import your own graphic, or start blank](docs/images/start.png)

## The 60-second version

Broadcast graphics are usually one of two bad deals: a closed composer that locks your work
inside it, or hand-written HTML that only one person on the team can touch. NoaCG Studio refuses
the trade.

- **You never have to write code** — the wizard walks Browse → Fields → Style → Animation → Finish
  with a live preview at every step, and a non-technical user can make a broadcast-ready graphic
  without opening the editor once.
- **The code is always real and always there** — every visual and AI action writes clean,
  commented HTML/CSS/JS. Nothing hides behind a proprietary scene model. A professional drops into
  the bundled Monaco editor and takes full control at any point, and the panels keep working on
  what they wrote.
- **Your work leaves with you** — six export targets plus rendered media, all plug-and-play:
  relative paths, bundled GSAP and fonts, no CDN, no runtime dependencies, no phone-home.

![The template storefront: 21 categories, search, and facets for fields, style and capabilities](docs/images/browse.png)

## What's in it

- **386 designs across 21 categories** — lower thirds, info cards, bugs & corner logos,
  scoreboards, tickers & crawls, timers & clocks, alerts & status, public information, credits,
  holding & break screens, infographics, polls & quizzes, audience questions & chat, results &
  standings, matchups & reveals, esports scores, frames, stingers and more. Designs are tuned to
  read as siblings, so a project's graphics form one coherent package.
- **A faceted storefront** — search by what you're making ("countdown", "church verse"), rank by
  programme type, then narrow by field count, style family, structure, capability and motion.
- **Create with AI** — describe what you need, optionally with a logo, brand stills, or an
  existing `.html`/`.zip` to convert. Every result is validated *and exercised in a live runtime
  bench* before it can be applied, with bounded repair rounds. It lands as ordinary editable code.
  Bring your own key, or use the free managed tier where available.
- **Import your own artwork** — drop in a finished design, erase baked-in text, place real
  editable fields on it, pick fonts and animation. No AI involved; you place every piece.
- **A real timeline and node editor** — keyframes, per-property tracks, easing, multi-step
  reveals, and a state-machine graph for graphics that are more than one linear run.
- **Operator control panels, generated** — every graphic's fields become an operator UI and every
  state-machine event becomes a button, with illegal actions greyed out. Ships as a self-contained
  `controlpanel.html`, or runs as a hosted page for a whole rundown.
- **Video & animation projects** — a second project kind for stingers, intros and logo reveals,
  generated as React/Remotion or HyperFrames compositions and rendered through the same service.

## For coding agents (Claude Code, Codex, any MCP client)

Ask your coding agent for a graphic "for NoaCG" and it designs one the way it normally designs;
NoaCG supplies the contract, the tools, the validation and the destination. The `noacg` CLI + MCP
server (`cli/`, published as **`noacg`** on npm) scaffolds a graphic package - one folder that is
a valid **EBU OGraf** Graphic, the **SPX/CasparCG** package and the workspace the agent edits -
validates and benches it against the deployment's own gate, screenshots it, prints the operator
surface NoaCG derives from it, and saves it straight into your NoaCG library with a scoped agent
key (`noacg login`). The `noacg-graphic` skill teaches the contract, not a look.

```bash
npx @noacg/cli scaffold --type scoreboard --design neutral --name "Football scoreboard" --out ./football-scoreboard
npx @noacg/cli validate ./football-scoreboard --screenshots ./shots
npx @noacg/cli save ./football-scoreboard
```

Claude Code: `claude mcp add noacg -- npx -y @noacg/cli mcp` is the whole setup. The plugin
(the `noacg-graphic` skill, a `/noacg:graphic` command and the same MCP server) lives in
`cli/plugin/`; installing it from a clone, and the Codex route, are in `cli/plugin/README.md`. The whole account: [`docs/AGENT_CLI.md`](docs/AGENT_CLI.md)
and [`docs/AGENT_SAVE.md`](docs/AGENT_SAVE.md).

## Run it yourself

```bash
npm install
npm run dev      # landing at /, editor at /app
npm run build    # typecheck + lint + production build to dist/
```

The dev port is per-checkout; `node scripts/dev-port.mjs` prints it (5174 in a plain clone — see
[`docs/DEV_PORTS.md`](docs/DEV_PORTS.md) for why a git worktree gets its own).

**A clean clone with an empty `.env` is the whole product.** Everything above works offline with
no accounts, no server, and no telemetry. Supabase and the AI routes are strictly optional: with
their environment variables unset the app grows no auth UI, no sync, and reports nothing anywhere.
See [`.env.example`](.env.example) for what turns each optional piece on.

## Documentation

| Doc | What it covers |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The authoritative project contract — architecture, conventions, non-negotiables |
| [`docs/GOALS.md`](docs/GOALS.md) | North star and the open road ahead (shipped work: [`docs/GOALS_ARCHIVE.md`](docs/GOALS_ARCHIVE.md)) |
| [`docs/SPX_TEMPLATE_FORMAT.md`](docs/SPX_TEMPLATE_FORMAT.md) | The SPX template contract |
| [`docs/OGRAF.md`](docs/OGRAF.md) | The EBU OGraf v1 export: manifest, Web Component, limits |
| [`docs/AGENT_CLI.md`](docs/AGENT_CLI.md) | The agent door: `noacg` CLI + MCP server, the `/bridge` page, the graphic package, the plugin |
| [`docs/STATE_MACHINE_SCHEMA.md`](docs/STATE_MACHINE_SCHEMA.md) | What a graphic *is*: states, transitions, the default path |
| [`docs/CONTROL_LAYER.md`](docs/CONTROL_LAYER.md) | Operator panels, rundowns, hosted control |
| [`docs/RENDER.md`](docs/RENDER.md) | The video/image render service |
| [`docs/AI_PROVIDER_GATEWAY.md`](docs/AI_PROVIDER_GATEWAY.md) | Model routing, managed and BYO keys |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers and allowed import edges |
| [`docs/DEV_PORTS.md`](docs/DEV_PORTS.md) | Per-checkout dev ports |

## The SPX field convention

Each data field `fN` maps to **one element `id="fN"`**; `update(data)` (a JSON string) writes the
value straight into it via `getElementById`. No hidden holders, no `_gfx` display split. Full
contract in [`docs/SPX_TEMPLATE_FORMAT.md`](docs/SPX_TEMPLATE_FORMAT.md).

## License

**AGPL-3.0** — see [LICENSE](LICENSE).

Use it, self-host it, modify it, and ship graphics made with it however you like: **your output is
yours**, with no licence obligations attached to the templates you export. The copyleft applies to
*NoaCG Studio itself* — if you offer a modified version of the app as a network service, you must
publish your changes under the same licence. This repository is the complete, self-hostable
product; nothing is held back in a paid edition.

The bundled fonts ship under the SIL Open Font License — `src/assets/OFL.txt` is the single
licence source copied into every export. GSAP and the Lottie player are vendored locally too, so
nothing an export needs is ever fetched from a CDN.
