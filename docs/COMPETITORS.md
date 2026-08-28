# COMPETITORS.md - the capability matrix

**What this is.** One page holding, per competitor and per capability: what they have, whether we
match it, whether we beat it, and where the gap is. It is the standing answer to "are we behind on
anything that matters", and its rows are candidate work for the orchestrator - a **GAP** row is a
thing somebody could pick up tomorrow.

**Refresh is TIME-driven, never commit-driven.** Nothing here changes because code changed; it
changes when somebody re-reads the competitor's public material. Each block carries the date it was
last read. Treat anything older than a quarter as stale rather than wrong.

**Sources are public material only, and this file adds no new research** - it is assembled from
`docs/COMPETITOR_MXMZ.md` (read 2026-08-22, re-read 2026-08-28), `docs/GOALS.md` "Who we are
replacing", and
`docs/EXPORT_TARGETS_RESEARCH.md`. Where a cell says UNRESEARCHED it means nobody has looked, which
is different from "they do not have it". Marketing copy is strong evidence about what a company
SELLS and weak evidence about what it ships; a row that would change an architecture decision gets
re-checked in a demo before it does.

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
on any such list**, and that absence is the honest AI verdict for this page. Full account:
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
