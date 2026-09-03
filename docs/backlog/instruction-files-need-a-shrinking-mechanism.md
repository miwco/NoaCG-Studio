---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "The wizard instruction file being at 99% is exactly the kind of problem I expect you to solve autonomously. Compact/modularize it without losing important instructions. More broadly, all our instruction/context files keep growing, so we need a systematic way to remove stale information and modularize them before this becomes a recurring problem."
---

**2026-09-03 - part 1 done, and part 3 has its first mechanical test.** `claude/a-agents-md-headroom`
took 13.8 KB out of the root `AGENTS.md`, which all 52 chains load: the repository map and the
ten-page URL table to `docs/ARCHITECTURE.md`, the incident behind each git rule to a new
`docs/BRANCHING_AND_LANDING.md`, and two verification rules back to `docs/VERIFICATION.md`, which
already held their measurements. Nothing was deleted - an audit script checked every removed line
against the file that received it. `src/components/wizard` went from 365 bytes free to 9,921, the
chains over 80% went from ten to one, and the ceiling ratcheted 112,000 -> 110,000.

**Part 2 is done by arithmetic rather than by sweeping.** The nine other chains that printed the
warning were all paying for the same root file; none of them needs its own pass now.

**Part 3's staleness pass turns out to be cheap and worth wiring as a gate.** Extracting every
backticked token from a contract and checking each path and symbol against the tree took a
twenty-line script and answered "is any of this describing something that no longer exists?" for
three contracts in seconds - the answer was no for all three, which is itself the finding that
stopped the wizard file being cut further. It belongs in `npm run build` beside
`check-docs-index`. The evidence-date idea is untouched.

**What is still open:** the `.agent-workflows/orchestrator*` common path, at 638 of 640 lines, which
this branch did not touch and which blocks the orchestrator half of
`docs/backlog/memory-store-drain.md`; the staleness gate; and
`docs/backlog/agents-md-warning-fails-at-99.md`, which can now land because the headroom exists.

# Instruction files only ever grow, and nothing removes what stopped being true

**Filed:** 2026-09-03. **Source:** owner ruling, after two sessions in two days routed around a
full instruction chain rather than reporting it.

## Why

The contracts are load-bearing: an agent reads them before touching an area, and a rule that does
not fit in the window is a rule that does not fire. Today the mechanism only pushes one way. Every
session that learns something adds a paragraph, and **nothing anywhere removes one.** The byte
ceiling then converts an editorial problem into a build failure at the worst possible moment - the
next session to touch that area.

The measured state on 2026-09-03, from `npm run check:shared-instructions`:

| chain | used | free | |
|---|---|---|---|
| `src/components/wizard` | 111635 | **365** | **99.7%** |
| `src/templates/importedDesign` | 98825 | 13175 | 88.2% |
| `src/templates/types` | 95250 | 16750 | 85.0% |
| `src/templates/infographics` | 94007 | 17993 | 83.9% |
| `src/templates/lowerThirds` | 93826 | 18174 | 83.8% |

**And it is not only the AGENTS.md chains.** Writing this file's own rules into the orchestrator
contract on 2026-09-03 pushed its always-loaded common path to **640 of 640 lines - exactly the
ceiling, zero headroom** - and getting there required condensing two existing sections and moving a
third into a branch module. The next rule added to that contract fails the build. So the shrinking
mechanism is owed to `.agent-workflows/orchestrator*` on the same terms as the AGENTS.md chains,
and the same trap applies: the cheap response to a full contract is to file the rule somewhere it
does not belong.

Ten chains sit over 80%. The wizard chain has **365 bytes** - roughly four lines. A 2026-09-02
session (row H) spent 244 of them and deliberately filed its new contract in a different directory
to avoid the ceiling; a second (row E) had already done the same the day before. **Two sessions in
two days worked around the limit instead of reporting it**, which is how a warning stops being a
warning: the cheapest response to a full file is to put the rule somewhere it does not belong, and
the contract then rots by dispersal rather than by deletion.

## What it would take

Three parts, and the third is the one that stops this recurring.

1. **Buy real headroom on the wizard chain now.** Not a trim to get under the warning - that games
   the measurement, which the 2026-09-02 headroom session explicitly refused to do. Move whole
   sections into the directory they actually describe, the way the eight template categories were
   split on 2026-09-02: the people editing that code still load it, every sibling stops paying.
2. **Sweep the other nine chains over 80%** with the same method. `condense-doc` is the skill for
   the editorial half; the structural half is the split.
3. **Give the contracts a way to SHRINK, which is the missing half.** Candidates, in the order a
   session should judge them:
   - A **staleness pass** with a real test: for each rule, does the thing it describes still exist?
     A rule naming a file, function, script or flag that is gone is not a judgement call - it is
     mechanically detectable, and `check-docs-index` already proves that shape of check works.
   - An **evidence date** on rules that record an incident, so a reader can tell a live constraint
     from a war story. Not automatic deletion - the war stories are often the most valuable lines -
     but visible age makes the review possible.
   - The **ceiling should fail loudly rather than warn**, which is the owner's separate receipt
     `agents-md-warning-fails-at-99` - but ONLY after headroom exists, or it converts every wizard
     row into a red build. Order matters: headroom first, then the loud failure.

## Ambiguity goes to the owner as a one-line walk question, never as a blocker

The owner ruled on 2026-09-03: *"If there are genuinely ambiguous content decisions, put simple
questions in the walk such as 'Is this still relevant?' or 'Can this be removed?' I can answer
those quickly. They should not block the work."* So a section whose relevance a session genuinely
cannot judge is filed as a `kind: walk-p` owner-queue item quoting the section, and **the rest of
the compaction ships in the same commit.** Waiting for the answer is the failure mode.

## Evidence

- `npm run check:shared-instructions`, 2026-09-03 - the table above.
- `docs/handoffs/2026-09-02-e-agents-md-headroom.md` - the 2026-09-02 session that took the warning
  count from 17 of 39 chains to 10 of 52, moved prose verbatim rather than retyping it, and refused
  to trim a row purely to get a number back under the line.
- Row H's handoff, 2026-09-02: spent 244 bytes and filed its contract elsewhere.
- Owner receipts `agents-md-byte-headroom` and `agents-md-warning-fails-at-99`.
