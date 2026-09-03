# Orchestrator - the 2026-09-03 ownership rulings, and two captures

**Branch:** `claude/o-orchestrator-owns-it`, one commit `2bff93a0`, gated green
(`npm run build` on the branch - the version stamp reads
`claude/o-orchestrator-owns-it@1c49bb95a3`, so the gate ran on this tree and not on `main`).

Written by the orchestrator session itself under exception 1 of its own contract, plus the owner's
explicit 2026-09-03 instruction to capture surfaced work without being asked.

## What changed and why

**The collision lesson.** `collisions.md` gains "a shared CHECK - two rows that change one FLOW,
not one file", with `scripts/e2e-affected.mjs` named as the measurement rather than foresight. The
core's order-free rule is amended: chain when the collision pass is unsure. Evidence in
`incidents.md` under the heading **"two dialogs"** (short, because the contract cites it twice and
lines were scarce).

**Capture.** `report.md` gains "Work the wave surfaces": anything worth surfacing to the owner is
worth a `docs/backlog/` file in the same wave, because a chip is a suggestion to a human and this
owner does not click them. `collisions.md` carries the one-line pointer.

**Autonomy.** Core section 6: a tentative opinion is not a requirement, and the owner is inside
section 4's pushback rather than above it. `pushback.md` gains the matching bullet. Core frontier:
spare capacity STARTS unstarted receipts; "deferred behind the push" now needs a per-receipt reason.

**Routing.** `routing.md`: a delegation that returns nothing is a PROMPT defect until proven
otherwise - pass `--write`, give the WORKTREE's absolute paths. Both cost a row on 2026-09-02 and
both were the assignment's fault, not Antigravity's.

## Two backlog files, both previously untracked

- `docs/backlog/e2e-webserver-hang-blocks-the-machine.md` - the owner asked for this by name after
  finding it was only ever a task chip. Three fixes, cheapest first; fix 2 (a `webServer` timeout)
  is the one that makes the whole class survivable, fix 3 (a stuck check reading CPU TIME rather
  than liveness) is the one that makes it visible.
- `docs/backlog/instruction-files-need-a-shrinking-mechanism.md` - the wizard chain has **365 bytes
  free**, ten chains are over 80%, and the contracts have no mechanism that ever REMOVES a rule.
  Also updated `byo-key-and-create-with-ai-guidance.md`: the owner re-confirmed on 2026-09-03 that
  the CLI is the PREFERRED path, which settles the open question that file carried.

## What is left, in the order I would take it

1. **The wizard instruction chain, 365 bytes free.** First row of the next wave. The next session
   to add a paragraph under `src/components/wizard/` fails the build. Method is proven: move whole
   sections into the directory they describe, as the eight template categories were split on
   2026-09-02. Do NOT trim to get under the warning - that games the measurement.
2. **The other nine chains over 80%**, same method.
3. **The shrinking mechanism itself** - a staleness pass with a real test (does the file, function
   or flag a rule names still exist?), which is mechanically detectable the way `check-docs-index`
   already is. This is the part that stops the problem recurring. `agents-md-warning-fails-at-99`
   (make the ceiling fail loudly) lands AFTER headroom exists, never before.
4. **The e2e web-server hang**, per its backlog file.
5. **The plan-check mechanism for shared checks** - `wave-plan-check.mjs` refusing a wave whose
   rows' `e2e-affected` sets intersect while their `TOUCHES` sets do not. The RULE landed here; the
   CHECK did not, because `scripts/wave-plan-check.mjs` is outside this session's exception 1.

## Traps

- **The orchestrator's common path is at exactly 640/640 lines.** The next rule added to that
  contract fails `check:shared-instructions`. Budget a module move into the same change.
- `incidents.md` headings are cited by exact string from the contract; renaming one silently breaks
  nothing and misleads a reader. Two citations point at "two dialogs".
- `check-shared-instructions` pins several rule phrases VERBATIM as critical markers. Condensing a
  section that contains one fails the build with a clear message - that is the mechanism working,
  and it caught two of my edits.
- No `Co-Authored-By` trailer: both the user's global instructions and root `AGENTS.md` forbid an
  agent co-author, and that outranks the harness's generic attribution default.
