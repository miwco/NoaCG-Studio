# Handoff - Session AF: designing around the OGraf state gap, and telling EBU it exists (2026-08-30)

**Branch:** `claude/af-ograf-state-gap`. **Gate:** `npm run build` green locally on both commits,
stamp `[write-version] dist/version.json -> claude/af-ograf-state-gap@…` (it gated this branch, not
`main`). CI green on `ae9ebb5c` (run 33304285724): `Build`, `E2E plan`, `Factory gates` and
`CI gate` all success; the E2E shards, the Vercel job and the catalog-calibration gate skipped,
which is the correct plan for a diff that touches only documentation.

**Diff:** two new docs, six edited, **no product code**. The only non-`docs/` files are two contract
files - `AGENTS.md` and `src/templates/types/AGENTS.md`.

---

## The public thing that went out in the owner's name

**<https://github.com/ebu/ograf/issues/82>** - filed under `miwco`, purely technical.

**It is not a duplicate.** All 42 issues on the repo were listed and the four plausible neighbours
read in full: **#55** (real-time transport / AsyncAPI - closed 2026-04-29 for want of a strong use
case; it is about a faster INBOUND channel, the opposite direction), **#61** (a CasparCG-style data
store - closed), **#73** (a docs-rendering bug - closed) and **#75** (behaviour on malformed data -
open, unrelated). A code search for `ReturnPayload` across issues and PRs returns nothing on this.
The repo has GitHub Discussions disabled, so there is no second venue that could hold a prior report.

The issue describes the asymmetry, cites exact files and lines as permalinks pinned to
`8468da15f207384077a0d324af0e3fee20df03c6`, gives one concrete thing a controller cannot learn (a
live vote's counts, whether voting is still open, and anything at all after a controller restart),
and proposes the smallest additive fix. **It pitches NoaCG nowhere and invites nobody**; the
standing owner ruling that EBU/YLE outreach waits for a real production on working OGraf playout is
untouched by it and remains in force.

---

## The verification, and the correction it forced

The brief said to re-verify before asserting anything publicly. That was the right instruction: the
claim as previously recorded was **too strong in one respect and understated in another**.

**Confirmed exactly as described.** `server-api.yaml` declares `result` on the Renderer's own
custom action (L337-346) and on **none** of the four GraphicInstance action endpoints (L510, L579,
L653, L727-748); `RenderTargetInfo` (L969-993) carries only `graphicInstanceId` and which Graphic is
loaded, so no state, no step and no data. There is no events/subscription/push mechanism anywhere in
either half of the specification.

**Wider than described.** The gap is not only about `customAction` - all four GraphicInstance action
responses lack `result`, and the Graphics specification **disagrees with itself**: the normative
prose lists `result` (`Specification.md` L241-244) while the informative TypeScript definitions omit
it entirely (`types.ts` L6-16). That three-way disagreement is what the filed issue leads with,
because it is the strongest evidence that this is an omission rather than a decision.

**Narrower than described, and this is the one that mattered.** *"The Server API drops `result`"* is
wrong. No response schema sets `additionalProperties: false`, and the de-facto reference
implementation **forwards it**: `SuperFlyTV/ograf-server` `packages/renderer-layer/.../LayerHandler.ts`
returns the Graphic's whole `ReturnPayload` and `packages/server/src/serverApi.ts` L708-718 spreads
it into the HTTP body (`...result.result, // To pipe through any vendor specific data`) before
overriding the three declared keys. The accurate word is **undeclared, not dropped**.

The issue says so explicitly rather than claiming more than is true, and the conclusion is unchanged
either way: an undocumented channel that one server happens to forward is not something a second
controller can be written against. **Four in-repo docs that said "dropped" are corrected**
(`CONTROL_PANEL_RESEARCH.md` §4c, `OGRAF_FIRST_REVIEW.md` §2 and §4, and both backlog items).

---

## The design, which is the half that ships

**`docs/OGRAF_STATE_IN_FIELDS.md`**, binding for every behaviour authored from here on. Its answer
is an inversion of ownership rather than a workaround bolted onto the machine:

> Over a wire with no return channel, the only state a controller can be certain of is state the
> **controller itself put there**. So a behaviour's operator-visible facts are data the controller
> owns and the graphic obeys - mirrored into a hidden, input-only field that the runtime writes into
> the artwork **and reads back** - never machine state a controller would have to ask about.

That needs no return channel at all, which is why it works today and why it does not degrade if the
standard never moves.

**The honest self-assessment the brief asked for**, on the poll's three facts:

- **The tally: served completely.** The counts never originated in the graphic - the audience plane
  counts them and an operator takes them as ordinary field values - so there is nothing to report.
  The only loss is the WIDGET (GDD has no array presentation), which `docs/backlog/tally-field-shape.md`
  already owns and which does not touch this design.
- **Open/closed: served well, at the price of one prohibition.** *A behaviour meant to survive
  export owns no fact its controller cannot observe* - so no `timer` edge may change
  operator-visible state; that timer belongs to the controller. The imported poll had already
  dropped the catalog's 20-second auto-close as a hazard; this promotes that from a UX judgement to
  a wire requirement.
- **Legality: not served at all, and it has no faithful expression.** Two independent reasons, each
  sufficient: legality is a function of the CURRENT state and current state does not cross; and
  `customActions` is a flat always-available list with no `enabled` and nowhere to put one. What the
  field mirror buys is a bounded approximation - a controller that owns every fact can compute
  legality from its own copy of the graph, exact for exactly the class of behaviours the
  prohibition above confines us to. The load-bearing property is therefore the safety one, restated
  as a rule: **legality is a courtesy, never a precondition.**

§7 states four exits and a default, so the workaround cannot become permanent by accident.

---

## Everything else that changed

- **`src/templates/types/AGENTS.md`** - the short form of the rule where behaviour authors actually
  read it, per the repo's own doctrine that a trap lives in the contract that loads where it fires.
- **`AGENTS.md`** (root) - **a real defect found in passing, fixed.** The SPX section still told
  authors an input-only field "may live in a hidden `<div id="fN" style="display:none">`". That is
  the one shape `e2e/catalog-baseline.spec.ts` rejects: the editor's entrance reset clears inline
  properties across the root subtree, so an inline-hidden holder returns VISIBLE on the canvas and
  the raw value airs. `DATA_SOURCE_CLASS` has been the answer for a while; only the root contract
  had not caught up, so an author following it wrote code that failed at night.
- **`docs/README.md`** - a row for the new binding contract.
- **`docs/backlog/ograf-graphic-state-return.md`** - half two recorded as DONE with the issue URL,
  and the note that **nothing waits on it any more**. Half one (returning `result` from our own
  emitted graphic) is what is left, now a nice-to-have.
- **`docs/backlog/behaviour-state-as-fields.md`** - the CONVENTION half is done; what remains is the
  two enforcements (the `validateMachine` warning and the round-trip spec row).
- **`docs/backlog/poll-status-own-field.md`** - NEW, and the one genuine defect the design surfaced.

## The finding worth acting on next

Writing rule R7 caught a deviation in the poll that landed hours earlier: **its open/closed status
is a regex over a human-facing, localisable display string.** `tallyValues` writes
`"4 votes · voting open"` into the `Vote count` field, the same string is drawn into the designer's
total layer, and `pollVotingClosed()` reads it back with `/voting\s+closed/i`. A station writing
`"4 ääntä · äänestys suljettu"` gets a board saying VOTE NOW through a closed vote, silently, on
air, in the one state the graphic exists to get right. The mechanism is right; the carrier is not.
Fix is a fourth wire field with a token vocabulary, appended last so no index moves. Half a day.
**Not done here because the brief said no product code this round**, which was the right call - the
comment that needs correcting alongside it is emitted template bytes.

## Verification

`npm run build` green (typecheck + lint + all five checks) on every commit. **CI green on all three
pushes, including the final SHA** - runs 33304285724 (`ae9ebb5c`), 33304576844 (`d3f950f7`) and
33304726727 (`f7606746`). Jobs read rather than trusting the colour: `Build`, `E2E plan`,
`Factory gates` and `CI gate` success; the E2E shards, the Vercel job and the catalog-calibration
gate skipped. That is the correct plan, not a hole - the `E2E plan` job itself ran and decided
there was nothing to shard, because **nothing this branch touches is executable**.

The `/check` code-review leg ran at **level: high** and returned three findings, all applied:
the backlog item's migration premise was inverted (artwork fields come first, so appending is
index-safe by construction - which is the reason to append rather than a lucky property), the root
`AGENTS.md` hidden-holder contradiction above, and two stale comments in `pollBehaviour.ts` that
still say "dropped" - recorded in the poll backlog item rather than edited, because one of them is
emitted template bytes and belongs in a commit already moving those templates.
