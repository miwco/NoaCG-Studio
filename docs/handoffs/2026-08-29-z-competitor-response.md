# Handoff - the competitive picture, corrected

Branch `claude/z-competitor-response`. Docs only, no product code. Written 2026-08-28 for the next
orchestrator run.

---

## What was wrong, and what it is now

`docs/GOALS.md` listed **AI** among the things we beat MXMZ on outright, and `docs/COMPETITORS.md`
had no AI row at all - so the matrix's "nothing public shows them authoring logic -> **We beat**"
was reading as a blanket AI lead. It has not been one since 2025, and the shape of the miss is worse
than the date: **we were measuring the wrong axis.**

Nobody in this market sells AI that AUTHORS a graphic. What is sold and bought is an
**orchestration layer above the graphics engine** - **HighField AI** - which reads a story a
journalist wrote in the NRCS and runs agents for context analysis, asset retrieval, data
verification, layout, and template selection + playout mapping, handing a filled package to a human
before air. It names four supported engines: Ross XPression, Vizrt Pilot Edge, Unreal, and **MXMZ**.

MXMZ did not build it. **MXMZ became a supported output of it**, and we are on nobody's list.

Corrected in: `docs/COMPETITOR_MXMZ.md` (new section 8, and section 3 now says out loud that its
finding covers authored LOGIC only), `docs/COMPETITORS.md` (three new rows, the newsroom row
re-weighted, the strategic read rewritten), `docs/GOALS.md` (the AI claim), `docs/README.md`.

## Evidence, all public, all verified this session

- **HighField AI** - `highfield-ai.com/platform/graphics/` for the pipeline, the four engines and
  the eight NRCS integrations; commercially available 2025-07-09 with a trial figure of *"up to 75
  per cent"*; Ross Video partnership 2026-04-13.
  **The MXMZ tie is a vendor listing on HighField's own page, not a joint press release** - stated
  that way in the doc, because it is weaker evidence than a partnership and still the fact that
  matters.
- **ToolsOnAir just:live / just:play pro 2026** add HTML template rendering naming *"singular.live,
  Viz Flowics, SPX, MXMZ and others"*. **SPX is on that list**, so our canonical format already
  reaches a macOS SDI/NDI playout family we never built for. Nobody here had noticed; nobody here
  has tested it either.
- **OGraf** - Server API stable 2026-08-13; BBright rendering OGraf natively in UHD/ST 2110 playout
  (IBC 2026, announced 2026-08-12); **TV 2 Denmark ran a national election on OGraf**, June 2026,
  presented at the EBU Network Technology Seminar. All three now live in
  `docs/backlog/ograf-ecosystem-watch.md` with what each means for us.

## The gap analysis - the actual deliverable

`docs/backlog/cli-roadmap.md`, new section **"What theirs does that ours cannot"**. One line:
*our door authors ONE graphic well from a chat and stops at a library record; theirs assembles
graphics from newsroom CONTEXT, at rundown scale, and stops at an operator's sign-off.* It maps
their five pipeline stages onto our verbs, then proposes five capabilities:

1. `noacg find` - selection over the type registry + catalog metadata. Cheap; blocked on
   `docs/backlog/graphic-use-case-metadata.md`.
2. **`noacg fill --data` - the leapfrog.** Bind a data row and run the SAME runtime bench, so a fill
   that would overflow or go unreadable is refused with a screenshot. **A pipeline over XPression or
   Viz cannot measure its own rendered result.** Do this one first.
3. `noacg assemble --context` - N graphics as the pack format we already emit. Near-zero if the
   caller's agent reasons and we supply find + fill + pack; a trap if we build the reasoning.
4. `noacg save --production <slug>`, staged not aired - our sign-off would be the operator surface a
   person already uses, not a review queue bolted on. **This is a ruling to get, not code to write:**
   `save` is library-only deliberately (`docs/AGENT_SAVE.md`).
5. **Speak the OGraf Server API.** The only item that puts NoaCG on the list MXMZ is on, and it does
   it through an open standard rather than a partnership. Bounded: the spec is finished and our
   packages are already conformant Graphics.

And what NOT to chase: first-party NRCS/MOS/MAM adapters. Eight newsroom systems deep is a services
business.

## Needs a person

- **The monthly competitor routine needs one line added, per machine.** Its OGraf findings now have
  a destination (`docs/backlog/ograf-ecosystem-watch.md`), and the routine's job is to END ITS RUN
  BY PRINTING the block to append - a date heading, one bullet per item with date, meaning and
  source URL, or the words for a quiet month. **It must not write the file itself:** routines run
  unattended in the main checkout, and a dirty main checkout makes `scripts/auto-merge.mjs` refuse,
  which stops every landing on the machine. The in-repo half is in `docs/ROUTINES.md`; the
  machine-local half is `~/.claude/scheduled-tasks/monthly-competitor-review/SKILL.md` and this
  branch cannot reach it.
- **Not planned here, deliberately: the vendor-list / npm-publish move** - getting `@noacg/cli` on
  the registry and NoaCG onto somebody's supported-engine list. Owner-blocked, and publishing past
  `main` needs the owner in the message that does it (root `AGENTS.md`, "Git"). Grounds when it is
  unblocked: `docs/AGENT_CLI.md` §publish and capability 5 above.

## What was verified, and what was not

- `npm run build` green on the branch, twice. CI read on the pushed head.
- **No product code changed**, so no e2e was run and none is owed.
- **Untested claim, stated as untested:** that an SPX package this project exports actually plays in
  ToolsOnAir just:play pro 2026. It is on their list; nobody here has a Mac and a licence. Same for
  BBright and OGraf - the only external OGraf walks we have are the two in `docs/OGRAF.md`.
- The sixteen consumed `2026-08-28-*` handoffs were deleted in this branch's first commit;
  `2026-08-27-editor-stage-blank.md` is still open and still wants an orchestrator run.

## Safe to archive

Yes, once this branch has landed. Nothing here is in flight and no follow-up depends on this
session's context - the two things a person has to do are both written above.
