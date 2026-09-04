# A receipt stays "unstarted" after its work lands, so the count overstates what is undone

**Filed:** 2026-09-04. **Source:** measurement of `docs/backlog/` against `origin/main` during the
2026-09-04 wave.

## Why

`node scripts/owner-receipts.mjs` prints "43 open, 36 unstarted" and the planner steers by that
second number - the orchestrator's plan check refuses a plan that never mentions an unstarted
receipt. The number is only worth steering by if a receipt leaves `unstarted` when its work is
done, and one of the two ways it can fail to is a plain miss.

**The confirmed instance.** `password-reset-link-lands-nowhere` reads `state: unstarted`. What it
asked for is on `main`: a dedicated recovery route (`bbac256b`), a landing-page forward for a
recovery fragment (`570d7762`), and a named failure replacing the dialog (`72a92321`), with
`docs/acceptance/owner-queue/2026-09-04-password-reset-has-a-route.md` filed for the confirming
walk. `docs/backlog/README.md` says the file is deleted in the change that lands the work. It was
not, and a later commit even edited that same file without touching its `state:`.

**The second way is not a miss, and it is the more interesting half.** I checked two other
receipts that also read `unstarted` today and both are correct. `cloud-sessions-for-stateless-rows`
was deliberately left there - real work landed against it (`09091ee3` established that remote
isolation is a no-op here and that cloud is session-level, not row-level), but the ask itself has
not started, and `--check` refuses `active` without a `branch:` that will outlive the session that
sets it. `catalog-growth-must-not-cost-iteration-speed` asks for three measurements that nobody has
made, so it is simply undone. **So the vocabulary has no value for the state both of those are
actually in**: substantial work happened, the ask still stands, no branch owns it. Both come out as
`unstarted`, sitting beside a genuinely untouched item and beside one that is finished, and none of
the three can be told apart from the count.

Neither half is expensive on its own. Together they mean the one number the planner reads is drifting
in the direction that manufactures work, and nothing in the build notices.

## What it would take

**The miss wants a mechanism at the moment, not a rule in a checklist.** A session lands work and
knows which receipt it served; nothing downstream does. Two candidates, and the first is cheaper:

- `/queue-merge` asks the branch which receipt it serves and refuses to queue until the answer is
  either a slug whose file this branch deletes or moves, or the word "none". It fires in the session
  that has the answer, at the moment it is finished, which is the shape that has worked for the
  handoff file and for the acceptance item.
- Or `owner-receipts.mjs --check` derives staleness instead of trusting the field: a receipt whose
  slug names a file in `docs/acceptance/owner-queue/` is work somebody already declared observable,
  and that is a contradiction worth failing the build over.

**The missing state wants one word, not a redesign.** Something like `answered` - the ask stands,
the work that unblocks it is on main, no branch owns it - counted separately from `unstarted` in the
listing and in the plan check. Requires a version bump under root `AGENTS.md` principle 6, which is
already the pattern `RECEIPT_VERSION` exists for, and a migration is trivial because nothing today
carries the new value.

Read `receipts-confuse-an-ask-with-a-finding` in this folder before starting either: that one is an
actual ask about the same field, and doing both at once is one edit to `STATES` rather than two.

## Evidence

- `node scripts/owner-receipts.mjs`, 2026-09-04: 43 open, 36 unstarted.
- `docs/backlog/password-reset-link-lands-nowhere.md` - `state: unstarted`; `bbac256b`, `570d7762`
  and `72a92321` on `main` are what it asked for.
- `docs/backlog/cloud-sessions-for-stateless-rows.md` - correctly `unstarted`, and its own text
  records why, which is the vocabulary gap rather than a mistake.
- `scripts/owner-receipts.mjs:126-129` - the `--check` rules, including the one that makes `active`
  unavailable without a branch.
- `docs/backlog/README.md`, "Landed is not a state" and "Owner receipts".
