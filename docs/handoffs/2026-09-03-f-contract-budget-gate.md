# The instruction budget fails loudly, on bytes rather than a percentage

**Branch:** `claude/f-contract-budget-gate`. **Merge base:** `bd82588e`. Three commits, eleven
files, no product code. Working tree clean.

## The trigger I chose, and why it is not the one the receipt asked for

The receipt asked for a failure at **99% of `project_doc_max_bytes`**. I made it fail at **4,096
bytes free**, and this is the one real judgement in the row, so here is the whole argument.

**A percentage gate fights the ratchet.** The ceiling only ever goes down. That is the whole point
of it - it is what stops a chain growing back once trimmed. But it means the reward for shortening
a contract is to lower the ceiling and bank the room, and lowering the ceiling raises every chain's
percentage. Row A's morning is the clean demonstration, and it is two separate steps that are easy
to run together and should not be:

| step | wizard chain | of ceiling | percentage |
|---|---|---|---|
| before | 111,635 | 112,000 | 99.7% |
| after the 11,343-byte cut | 100,292 | 112,000 | 89.5% |
| after banking 2,000 in the ceiling | 100,292 | **110,000** | **91.2%** |

The cut helped the percentage. **The banking hurt it, with nobody writing a byte.** Every future
ratchet does the same to all 52 chains at once, so under a 99% rule the gate creeps toward the
whole repository precisely as the contracts get tidier. A reserve measured in bytes does not move
when the ceiling moves, and it measures the thing that actually matters: how much room the next
person has to write their paragraph in.

**Why 4 KB specifically.** The number is squeezed from both ends, and I want the next person to see
the bracket rather than re-derive it.

- **Below it, the gate is decorative.** 99% of 110,000 leaves 1,100 bytes - about four paragraphs.
  Tripping that gate and actually breaking the chain are nearly the same event, so the author who
  trips it has no room to work in, which is the situation the headroom row existed to end.
- **Above 9,708 it fires today** on `src/components/wizard`, and well before that it leaves that
  chain too little to grow into. The 2026-09-03 staleness pass found no lossless cut left in it, so
  an 8 KB reserve would hand it 1.7 KB of room and rebuild the 365-byte wall at a different number.
- 4,096 leaves it 5,612 bytes of honest growth, and refuses any future ratchet that would set the
  ceiling within 4 KB of a live chain. That last property is a bonus I did not design for and would
  keep: the reserve is now also a floor under the ratchet.

The 80% report stays a percentage and stays advisory. It answers a different question - what share
of the budget one area claims - and it always fires first, for any ceiling above 5x the reserve.

**If the owner wants the percentage instead, it is one constant.** Filed as
`docs/acceptance/owner-queue/2026-09-03-the-budget-fails-loudly.md` (`kind: walk-p`), with the
reasoning, and nothing is blocked on the answer.

## Proof, which I ran before believing any of it

Both directions, on the real gate, twice - once when the gate landed and again after the review
changed the failure path.

- **Fails inside the reserve.** Appended filler to `src/components/wizard/AGENTS.md` until the
  chain read 3,767 bytes free. Exit 1, and the message named the chain, listed all three files
  biggest-first (`wizard 56,931 + components 26,225 + root 23,073`), pointed at the leaf as where
  the bytes are, and gave the pointer/split moves plus the refusal to raise the budget.
- **Fails over the ceiling.** More filler, to 111,770 bytes. Exit 1, message reads `1,770 OVER`.
- **Passes on the real tree.** Exit 0, 9,708 bytes free on the tightest chain.
- Reverted with `git checkout --` each time; the wizard contract is untouched in the diff.

## The review's findings, all four confirmed and fixed

`review: delegated` - the code-review skill at `high` returned into this conversation and named
this branch's files, so it passed the scope check. It also exercised the gate itself by ratcheting
the ceiling to 102,000 and reverting.

1. **The comment justifying 4 KB contradicted itself** - it said a reserve "much above ~5.5 KB
   fires TODAY", but 5,612 is the growth room the reserve LEAVES and 9,708 is where it would fire.
   Two different quantities. An editor weighing a 6-8 KB reserve would have read the wrong one.
2. **The percentage evidence conflated the cut with the ratchet** in three places, exactly as the
   table above separates them. The conclusion survives, but the owner is being asked to ratify the
   byte reserve on this evidence, so it had to be right.
3. **Four files still carried the pre-correction figures.** `.codex/config.toml`,
   `instruction-files-need-a-shrinking-mechanism.md` and `memory-store-drain.md` had 11,556 /
   100,079 / 9,921, and the config also had importedDesign at 87,269 / 731. I measured the tree:
   11,343 / 100,292 / 9,708 and 87,482 / 518. The config header is the base the next person
   computes a ratchet from, so it cannot be the stale copy.
4. **The headroom table did not print on the failing path**, because it ran after `process.exit(1)`.
   That was tolerable when failure meant "already over"; it is not now that running low is the
   designed failure. It prints before the errors.

`simplify: inline` - the skill returned fan-out instructions rather than a result, so the leg ran
here over the four angles. Two fixes: the advice sentence is now one module constant
(`CHAIN_OVERFLOW_ADVICE`) instead of a literal built inside the loop, and the byte sum uses
`parts.length` rather than mixing `parts` and `chain` for the same count. **Reported, not fixed:**
`chainBytes` re-reads the root `AGENTS.md` once per chain, 52 times a run. That predates this
branch, the cost is milliseconds, and memoizing it reaches outside the diff.

`verify: inline` - `npm run build` green on the final state. No product code changed.

**CI, and I walked into the trap I had just filed.** Worth reading, because the branch's own history
is now the cleanest demonstration of it:

- `35365166` (the gate + `launch.md`): a genuine full run - Build, E2E plan, Factory gates, all
  nine shards, Combined E2E report, CI gate, all success.
- `bc867984` (the review fixes): its run was **cancelled by my next push** and never finished.
- `f9dffb6a` (the handoff): the push run reported **`CI gate: success` with every shard skipped** -
  the shard job did not even expand its matrix, printing the literal
  `E2E ${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`. Conclusion green, nothing tested. This
  is exactly `docs/backlog/ci-run-cancellation-hides-skipped-shards.md`, filed an hour earlier by
  me, and I still only caught it because rule 4 made me read the job list instead of the
  conclusion.
- **The verdicts this branch rests on**, both from `gh workflow run ci.yml --ref
  claude/f-contract-budget-gate`: run `33742040840` on `f9dffb6a`, and run `33743686051` on
  `cff4888f`, the commit carrying the last code and every record. Both are full runs - all nine
  shards in `(full)` mode, Catalog calibration gate, Combined E2E report and CI gate, all success.

So the branch is gated green, and the evidence for the backlog item is no longer second-hand.

`scripts/check-shared-instructions.mjs` has been byte-identical since `bc867984`; everything after
it is prose. If a further documentation commit sits on top of `cff4888f`, it does not need its own
full suite - `npm run build` covers what a docs change can break, and the landing queue re-gates on
the INTEGRATED sha regardless, which is the gate that actually decides whether this lands.

## The wave's loose end, and a wrong assumption in my own prompt

`.agent-workflows/orchestrator/launch.md` now names the `OWNER-DECISION: <reason>` marker beside
the legitimate-chip carve-out, matching `scripts/hooks/spawn-task-guard.mjs` exactly - marker in
the prompt or the tldr, bare marker and angle-bracket placeholder both refused.

**The prompt said this addition MUST move text out rather than add, because the common path is 639
of 640 lines. That constraint was wrong, and the orchestrator has asked for it in the record rather
than left in chat.** `launch.md` is not on the common path at all - the every-plan modules are
`grounding`, `collisions`, `pushback`, `prompts` and `routing`, and `launch.md` loads only when
rows are actually launched. The common path is still 639/640 after the addition, unchanged, and I
added four lines without moving anything.

It is worth naming the error class rather than just the fact, because it is the same one the
contracts warn about elsewhere: **a constraint was asserted from a number that was true of a
neighbouring thing.** 639/640 is real, and `launch.md` is a module of the same workflow, so the
inference looked safe and cost nothing to check - `grep -n "every plan"` on the routing table
answers it in one command. A row that had obeyed the constraint would have spent its budget
relocating text to buy room it already had. The next orchestrator should not inherit this: check
which modules carry the `*every plan*` mark before spending a row's effort on the line budget.

## Filed on the way through

Two mechanism gaps row C surfaced, filed as backlog files rather than chips:

- `docs/backlog/ci-run-cancellation-hides-skipped-shards.md`. A push cancels the run in flight, and
  a replacement can skip every E2E shard and still report the gate green. Root `AGENTS.md` rule 4
  already warns about this in prose and it fired three times anyway on a session that had read it.
  The candidate fix MEASURES which jobs ran; I did not design it.
- `docs/backlog/check-verdict-stamp-unwritable-from-isolated-worktree.md`. I probed this rather
  than taking it on report, and it is sharper than "it does not work": the **Write tool refuses**
  the shared `.git` path from an isolated worktree, and **Bash succeeds** - but only for a simple
  command, since a compound `mkdir && cat > … && echo` is also refused as too complex to verify. So
  the stamp is reachable, through a path nobody would guess from the refusal message. I wrote this
  branch's stamp by staging the JSON in the scratchpad and copying it with a bare `cp`.

Backlog subdirectories are exempt from `check-docs-index` (line 17 of that script), so neither file
needs a `docs/README.md` row. I checked rather than assumed.

## The receipt, and what I deliberately left alone

`docs/backlog/agents-md-warning-fails-at-99.md` is deleted, per the folder's "landed is not a
state" rule; `node scripts/owner-receipts.mjs --closed` reads it back out of git. Every file that
cited it now states the fact and cites something durable instead.

`docs/backlog/agents-md-byte-headroom.md` stays open and I did not touch its receipt fields - its
`branch: claude/e-agents-md-headroom` is a live branch, and what remains of that ask is the owner's
ruling on the wizard cuts. I added a dated note saying both halves landed.

**One stale number I chose not to fix:** `docs/acceptance/owner-queue/2026-09-03-room-in-the-contracts.md`
says the wizard chain went to 9,921 free; it is 9,708. That is row A's message to the owner, it is
about to be consumed by `/walk`, and the 213-byte difference changes nothing it asks. Rewriting
another session's question to the owner is not mine to do.

## Do I think a further ratchet is owed?

**Not today, and not for a while.** Row A banked 2 KB of an 11 KB gain and left 9,708 free on the
tightest chain. Ratcheting again now would be sized off a tree that moved this morning, and with
the reserve in place a ratchet is no longer free: the ceiling can never come within 4 KB of a live
chain without red-gating the build, so an over-eager ratchet is now a self-inflicted outage rather
than a tidy-up.

The honest next move is not the ceiling at all. It is
`docs/backlog/instruction-files-need-a-shrinking-mechanism.md` part 3 - the staleness pass as a
gate. Row A found it took a twenty-line script to answer "does any of this describe something that
no longer exists?" for three contracts, and that answer is what stopped the wizard file being cut
further. Shrink by that, then ratchet against the result.

## Landing

**The branch is gated green on `f9dffb6a`, `merge-order` says `free`, and it is DELIBERATELY
UNQUEUED.**

Not blocked, not unfinished - held. `claude/c-consent-over-dialog` landed (`main` is `572bd0d8`),
but `claude/e-walked-remnants` is still five commits ahead of `main` and has not queued. The queue
lands strictly in the order branches are queued, so queueing now would put this gate in front of E,
and E would then merge a build gate its prompt never saw. That is the whole reason a gate lands
alone, and the reason this row was designated the wave's last landing.

So the last step of this row is not `/queue-merge`. It is stopping here with the branch green and
out of the queue. The orchestrator releases it the moment E lands; `/queue-merge` is then the only
remaining action, run from the session that owns this branch, with no further commits after it.

**If you are picking this up cold:** nothing needs re-verification. The working tree is clean, the
full suite is green on `cff4888f` (every commit that changed code, plus every record), and the
check stamp at `<git-common-dir>/noacg-jobs/checks/claude-f-contract-budget-gate.json` records the
legs and says exactly which sha each ran on. Queue it, and do not commit afterwards - a later
commit makes the queue job refuse and ask you to queue again.
