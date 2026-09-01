# COMPETITORS.md - the capability matrix

**What this is.** One page holding, per competitor and per capability: what they have, whether we
match it, whether we beat it, and where the gap is. It is the standing answer to "are we behind on
anything that matters", and its rows are candidate work for the orchestrator - a **GAP** row is a
thing somebody could pick up tomorrow.

**Refresh is TIME-driven, never commit-driven.** Nothing here changes because code changed; it
changes when somebody re-reads the competitor's public material. Each block carries the date it was
last read. Treat anything older than a quarter as stale rather than wrong.

**Sources are public material only.** Most of this file is assembled from
`docs/COMPETITOR_MXMZ.md` (read 2026-08-22, re-read 2026-08-28), `docs/GOALS.md` "Who we are
replacing", and
`docs/EXPORT_TARGETS_RESEARCH.md`. Where a block has no such doc behind it, it carries **its own
dated read with the URLs in the block** - that is the only new research this file may hold, and it
is a read of somebody's public material, never an analysis written without looking. Where a cell says UNRESEARCHED it means nobody has looked, which
is different from "they do not have it". Marketing copy is strong evidence about what a company
SELLS and weak evidence about what it ships; a row that would change an architecture decision gets
re-checked in a demo before it does.

---

## The OGraf convergence - read 2026-09-01

**The most important movement on this page, and it is not one competitor.** Through 2026 OGraf went
from a spec document to the layer several vendors are meeting on - and they arrive at it from
DIFFERENT directions: editors, AI creation tools, controllers, renderers, and now post-production.

- **EBU** froze the **Server API at v1, stable and production-ready, 2026-08-13**, beside the
  Graphics spec (2025-09-17); changes from here are backwards-compatible or optional
  ([ograf.ebu.io](https://ograf.ebu.io/)). OGraf is a named technology demonstration on the EBU's
  own IBC2026 stand **10.D21** - *"open, agile, unified: the new specification for dynamic media
  graphics"* ([tech.ebu.ch](https://tech.ebu.ch/events/ebu_at_ibc2026)).
- **BBright** announced an OGraf graphics engine inside its UHD / ST 2110 software playout,
  2026-08-12.
- **Zero Density** announced AI-assisted HTML5 generative templates in the same breath as OGraf,
  2026-08-21 - block below.
- **DaVinci Resolve 21** (June 2026) imports OGraf natively as rendered animation clips, which puts
  the format in POST, not only on air.
- **ograf.dev**, a community hub outside the EBU (repo created 2026-04-17, active through August),
  carries a ~25-entry ecosystem directory and a public package validator at `ograf.dev/check`.
- **TV2 Denmark** presented OGraf carrying a national election at the EBU Network Technology
  Seminar, 2026-06-09.

**What it means, and it is the strategic point:** this market is **not** shaping into "one OGraf
product wins". It is an interchange layer with many vendors either side of it. That is the argument
FOR the sequencing already ratified in `docs/GOALS.md` "NEXT - OGraf-first" - make OGraf the
contract, and differentiate on what the contract does not standardise: the editor, the agent/CLI
creation door, the generated control layer, and eventually our own renderer. A commodity interchange
format favours whoever has the better surfaces on top of it, provided the surfaces really are
better.

**What it costs us:** any capability we hold that OGraf standardises stops being a differentiator
the day a rival ships it, and export breadth is the first to go. The two that are ours and are NOT
in the spec are authored BEHAVIOUR and generated control (`docs/STATE_MACHINE_SCHEMA.md`,
`docs/CONTROL_LAYER.md`). That is where the moat has to be.

**We are not in the ograf.dev directory.** The bar is four fields and a pull request
(`CONTRIBUTING.md` in `ficosta/ograf`), so it is not a capability gate - the owner ruled 2026-09-01
to wait until our own OGraf output has been watched running in software we did not write, rather
than list on an assertion.

---

## MXMZ - the one Yle named as the working model

Read 2026-08-22, re-read 2026-08-28. Full account: `docs/COMPETITOR_MXMZ.md`. Cloud-native HTML5/SVG
graphics, spun out of Banijay's sports arm, in Grass Valley AMPP, price floor under $3,000/year.

| Capability | They have | Us | Verdict |
|---|---|---|---|
| SVG import, every layer exposed | Yes, from Illustrator / Figma / Canva, no renaming ritual | SVG import v1, the current push | **Match, unproven at their scale** |
| Keyframe timeline as the primary surface | Yes, frame-accurate, every layer and property, trained in one day | Timeline v2 exists, sits in Advanced mode, nobody is taught it | **GAP** - not the feature, the teaching |
| Authored behaviour / logic | **Nothing public shows them authoring logic at all.** This covers AUTHORED LOGIC only - it is not a claim about AI or automation, see the two rows below | Full state machine: structural guards, parallel groups, timers, snap, serial queue, inside the template | **We beat**, on logic |
| AI-assisted assembly from newsroom context | **Not built by MXMZ - but MXMZ is one of four engines HighField AI drives** (story analysis, asset retrieval, data verification, layout, template selection + playout mapping; NRCS in, filled package out, human sign-off before air) | Nothing takes a story, a rundown or a running production as input; no assembly layer lists us as an engine | **GAP, and the biggest one on this page** |
| AI that AUTHORS a graphic | Nothing public, from them or from HighField - the templates are made by hand in XPression, Viz, Unreal or MXMZ | The agent door (`docs/AGENT_CLI.md`) and Create with AI: a chat produces a complete, validated, benched, playable graphic | **We beat**, on an axis nobody else is contesting |
| Third-party playout reach | Grass Valley AMPP; ToolsOnAir just:live / just:play pro 2026 names MXMZ templates on macOS SDI/NDI | **SPX is on that same ToolsOnAir list**, so our canonical format reaches it - unclaimed, and never tested by us | **Match on paper, untested** |
| Control panel | Hand-built per vertical (Match Control, per-sport panels) | GENERATED from the machine, every event a button, legality mirrored as greying | **We beat** |
| Live data binding | JSON, Opta / Gracenote / Sportradar and custom APIs | The production DATA API (`docs/DATA_API.md`), update rows in the control log | **Match** |
| Version control with rollback | Yes, every adjustment logged, rollback to any iteration | Undo and saved documents | **GAP** |
| Locked master template + local variations | Yes, sold as the org story | Open in `docs/SVG_IMPORT_PLAN.md` P2 | **GAP** |
| Team font library | Uploaded once, shared across the team | Per project | **GAP** |
| MOS / CII newsroom integration | Yes | No | **GAP**. Re-weighted 2026-08-28: nobody asked, but the NRCS is where the assembly layer gets its input, so this is the door that row depends on |
| Auto-advance timers on the rundown | Yes | The machine already has timer transitions; the rundown does not expose them | **GAP**, cheap |
| Multi-channel as a first-class concept | Unlimited channels, each with its own library and data | Productions, one persistent output URL each | **Match** |
| Audience-facing plane | Nothing public suggests one exists | Join page, vote-to-air, presenter view | **We beat** |
| Export, and owning the files | Cloud-first, Docker escape hatch; the graphic is not a folder you keep | Six targets, the files are yours | **We beat** |
| Catalog | They import your design; they do not hand you designs | ~500 designs | **We beat** |
| Price | Under $3,000/year floor | Free forever, self-hostable, open | **We beat** |

**The strategic read, corrected 2026-08-28:** their architecture still has no place to put a library
of named behaviours a person attaches to their own artwork, and that is what the 2026-09-12
production tests. What has to sit beside it: the AI competition in this market is **not** about
generating a graphic - nobody sells that. It is an **orchestration layer above the graphics engine**
that selects an existing template and fills it from newsroom context at rundown scale, with a human
gate before air. MXMZ did not build that layer; MXMZ became a supported output of it. **We are not
on any such list**, and that absence is the honest AI verdict for this page. **Amended 2026-09-01:**
"nobody sells generating a graphic" was true of MXMZ and is no longer true of the market - Zero
Density announced AI-assisted HTML5 generative templates for IBC2026 (block below). Nobody has seen
that product, so it moves no verdict yet; it does make this a claim with a date on it rather than a
standing fact. Full account:
`docs/COMPETITOR_MXMZ.md` section 8. What it means for the CLI: `docs/backlog/cli-roadmap.md`.

## Singular.live

Last read 2026-07-09 (`docs/EXPORT_TARGETS_RESEARCH.md`), plus `docs/GOALS.md`. Cloud graphics with
a browser control room and playout that reaches air. **They do most of what we intend**, so the gap
to open is breadth over equivalent cloud playout rather than any single feature.

| Capability | They have | Us | Verdict |
|---|---|---|---|
| Cloud authoring + browser control room + playout to air | Yes, the whole chain, proven | The whole chain exists (`docs/CLOUD_PLAYOUT.md`); proven on the owner's hardware, not at their scale | **Match, unproven at scale** |
| Importing third-party HTML | **No supported path** - a closed cloud composer | Every graphic is real HTML you can take anywhere | **We beat** |
| Breadth of export targets | Their own playout | Six targets plus whole-show export | **We beat** |
| Everything else | UNRESEARCHED | | Nobody has read their material properly since 2026-07-09 |

## Loopic

Last read 2026-07-09. HTML broadcast graphics, the **closest positioning to ours**.

| Capability | They have | Us | Verdict |
|---|---|---|---|
| Timeline and canvas editing | The bar Advanced mode has to beat | Timeline v2 and the canvas exist | **Unjudged** - nobody has put them side by side |
| LiveOS integration | A legacy `templates.json` export into a LiveOS templates folder | We reach LiveOS through OGraf, which cannot drift | **We beat**, on robustness |
| Everything else | UNRESEARCHED | | The single biggest hole in this file, given the positioning overlap |

## Zero Density

**Read 2026-09-01**, from public IBC2026 material only: an
[ibc.org preview dated 2026-08-21](https://www.ibc.org/production/news/zero-density-unites-graphics-and-newsroom-workflows/22794),
the EBU IBC2026 stand listing, and search coverage of the same announcement. **Nothing here has been
seen running.** Unreal-based virtual production and broadcast graphics - Reality 5, Traxis Hub 3.0,
NODOS, NLE Live Link - on stand **7.B01**. **An established graphics vendor, not an OGraf
experiment**, which is what makes this block worth opening.

| Capability | They have | Us | Verdict |
|---|---|---|---|
| AI that AUTHORS a graphic | **"AI-powered HTML5 Generative Graphics Templates"**, demonstrated at IBC2026 - the first vendor of any size to announce this | The agent door (`docs/AGENT_CLI.md`) and Create with AI: shipped, benched, validated | **Contested.** The MXMZ block called this "an axis nobody else is contesting" until 2026-09-01 |
| OGraf compatibility of those templates | Reported in IBC coverage; **not quotable from Zero Density's own material** - their news page carried no IBC2026 item when read | OGraf export shipped, the whole catalog gated against the live EBU schema (`e2e/ograf-conformance.spec.ts`) | **Unverified** - the one row to re-read after IBC |
| Newsroom assembly | NRCS running orders feeding graphics directly, plus Journalist Preview, for news, sports, weather, elections and finance - **built in-house, not bought in** | Nothing takes a story or a rundown as input | **GAP** - the same one the MXMZ block calls the biggest on this page, now reached by a second vendor from a different direction |
| Renderer | Unreal Engine, multi-renderer with Chaos Vantage and NVIDIA Gaussian splatting | The browser; HTML is the artefact | **Different product** below the graphics layer, converging above it |
| Virtual studio / AR / XR | The core business | None, and none intended | **Different product** |
| Price and openness | Enterprise, quoted | Free forever, self-hostable, open | **We beat** |
| Everything else | UNRESEARCHED | | Nobody has read their material beyond one IBC preview |

**The strategic read.** The announced workflow overlaps our own sentence uncomfortably closely -
AI-assisted creation, HTML5, OGraf, live playout - and it arrives from a vendor with existing
broadcast customers and a newsroom story we do not have. What it is not, on this evidence: free,
self-hostable, export-anywhere, or openable in a browser by a student. Two things follow. **Our
AI-authors-a-graphic edge is contested rather than uncontested**, and the differentiation has to
move onto the surfaces OGraf does not standardise. Re-read this block after IBC2026 (11-14
September), when there is a product to look at instead of a stand listing.

## Rive

From `docs/GOALS.md`. Designer-first interactive animation with **real state-machine logic**. Not a
broadcast product, which is why it appears here as a BAR rather than as a competitor for customers.

| Capability | They have | Us | Verdict |
|---|---|---|---|
| State-machine authoring for designers | The reference implementation of the idea | `NOACG_ANIM` v2 and the node editor (`docs/STATE_MACHINE_SCHEMA.md`) | **Match on model, unjudged on authoring feel** |
| Broadcast playout | None - not what they are | Six targets, hosted playout, an operator layer | **Different product** |

---

## How to use this file

- A **GAP** row is a candidate piece of work, not a commitment. It competes with everything else in
  the drain order (`docs/backlog/README.md`).
- A **We beat** row is a marketing asset and should be findable in the public copy. If it is true
  and nobody outside can tell, that is its own gap.
- **UNRESEARCHED is the honest word and it should make you uncomfortable.** Two of the four blocks
  here are mostly empty. Filling one is a half-day of reading public material and it changes what
  this page is worth.
