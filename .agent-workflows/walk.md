# walk - go through what is built and not yet confirmed by a human

Shared canonical procedure for the `walk` workflow - `/walk` in Claude Code, `$walk` in Codex.

**The question this answers: is there anything the owner should look at?**
The items live one per file in `docs/acceptance/owner-queue/`, each with a `kind:` saying WHO can
settle it - `walk-p` (him, from his phone), `walk` (him, at the computer), `owner-action`,
`hardware`, or `agent` (nobody needs him: an agent drives the product and confirms it).
`docs/acceptance/OWNER_QUEUE.md` holds the rules, the routing decision and the Dropped log. No
open `walk-p` or `walk` file is a real answer - say so in one line and stop.

Optional argument: a filter (an item's subject, `hardware` to walk the blocked list instead, or
`agent` to see what is queued for an agent rather than for him).

## Why this exists

Git records what landed. It cannot record whether a person looked at it and thought it was any
good - that is the one fact about shipped work no file in the repo can hold, and it used to be
smeared across forty memory entries as prose nobody re-checked. The queue holds it in one place,
and this workflow is how it empties.

## 1. Read the queue - nothing expires

List `docs/acceptance/owner-queue/` and read every file that has no `done: true`. Their front
matter carries `kind:` and `date:`; `docs/acceptance/OWNER_QUEUE.md` carries the rules and the
Dropped log.

**Nothing is deleted for being old. Present every open item, however old, and delete one only when
the owner has actually walked it** (step 3) or told you to drop it.

> **Why this used to expire, and why it does not any more.** The rule was: a `kind: walk` item
> older than 7 days is deleted as presumed seen, on the reasoning that the owner tests most things
> within a couple of days, so an old unticked item is more likely a stale claim than genuinely
> unseen work. **Owner ruling, 2026-08-30: nothing expires - he will get to all of them** (the
> queue stood at 39 open items when he said it). The expiry was solving queue LENGTH, and it solved
> it by throwing away exactly the human look this queue exists to hold - a deleted item reads
> identically to a walked one, so the mechanism made the queue lie in the direction of "all
> confirmed". Length is now the owner's problem to pace, not the workflow's to hide. Anyone
> re-enabling this should know that is what they are turning back on, and should have an answer for
> it that is not "presumed".

The queue is therefore allowed to grow, and that is fine: the owner ruled the same day that a deep
queue must not hold work back either (*"nothing should block stuff"* - section 2 of
`.agent-workflows/orchestrator.md`). It is a LIST of what is waiting to be seen: it neither blocks
nor evaporates.

## 2. Present the open items - the phone list first

**Three lists, in this order, and never one merged list.**

1. **From your phone** - every open `kind: walk-p`. These are taste rulings, preferences and
   direction calls: he answers each in a sentence, with nothing open in front of him. This list
   goes first because it is the cheapest for him to clear, and because he can clear it anywhere.
2. **At the computer** - every open `kind: walk`. These need the product on screen.
3. **Only you can do these** - every open `kind: owner-action`, short and always shown. Each one is
   an account, a signature or money, and there have never been more than a handful.

**`hardware`** stays a count unless he asks or filters for it. **`done: true` is never presented.**

**`kind: agent` is not his list, and it is not a silent bucket either.** An agent settles those by
driving the product. Say how many are open in one clause, offer to walk them, and walk them on
`/walk agent` - by the same procedure as step 3, with the agent in the owner's chair. An agent item
nobody reads is worse than no item, because a queue that shows zero for him looks finished.

Numbered 1..N within each list, each one line: what it is, and the route in a few words. Do not
paste the whole file back - the owner is deciding what to look at, not reading a document.

Inside each list, order by three front-matter keys and nothing else, so two sessions an hour apart
show him the same order: **`serves: now`** first, then **`answered: true`** (the re-looks he is
owed), then newest `date:` first. Within the owner-action list, one naming a real-world date leads.
Full rule and its reasoning: `docs/acceptance/OWNER_QUEUE.md`, "The order the owner sees them in".

**Triage before volume** (owner, 2026-08-28: *"this takes too much time... we need to keep these
sessions short"*). The `serves: now` set IS the high-priority set - name it as such and present the
rest as a count with the list available on ask. **Read that key; never re-derive it by reading
`docs/GOALS.md` yourself** - it is set when the item is FILED, which is what makes two sessions
agree. When several items are fragments of one real walk, CONSOLIDATE them into one item rather
than walking the fragments. The owner trusts fixed-and-gated work by default; a walk item earns its
minute by being on the critical path or by needing a taste ruling no gate can give.

If the Open list is empty, say exactly that and stop. That IS the confirmation the owner is asking
for when they run this.

## 3. Walk them one at a time

For the item picked (or the first, if the owner says "go"):

1. Get them in front of it. Start the dev server through the preview tools if one is not already
   up (never a raw shell command - the guard hook refuses it, and for good reason). Navigate to
   the exact route the item names. If the item is on an unmerged branch, say so and name the
   branch rather than switching anything.
2. Say what to look at - the item's own "what to look at" line, in one sentence.
3. **Wait. Do not narrate what they should be seeing, and do not judge it for them.** The whole
   value of this list is a human opinion; an agent's account of the same screen is what the repo
   already has.
4. Record the answer:
   - **Good** -> delete the item's file. That is what "walked and fine" looks like; git holds the
     history, so nothing is lost by removing it.
     A `kind: agent` item is deleted the same way, by the AGENT, after driving the route itself -
     and its commit message says what was checked and what was seen, so the history can still tell
     an agent's confirmation apart from the owner's look. Nothing else may be deleted that way.
   - **Feedback** -> capture it VERBATIM in the item, then turn it into work: a task now if it is
     small and in scope, otherwise a line in `docs/GOALS.md` or an issue. Say which you did. The
     item stays open until the feedback is addressed, with the feedback under it.
   - **Not now** -> leave the file exactly as it is. It waits for the next walk; nothing removes
     it in the meantime.

Then offer the next one.

## 4. Adding to the queue

Any session that lands observable work adds ONE FILE in the same commit:
`docs/acceptance/owner-queue/<date>-<slug>.md`, with `kind:` and `date:` front matter. **One file
per item, never a shared list** - five sessions appending to one list at the same offset is a git
conflict, and a conflict makes the landing job abort and stop, which strands the branch until a
person looks at it.

**The FILING session picks the kind**, which is what makes the routing automatic rather than a
triage job somebody does later. The decision rule is one paragraph in `docs/acceptance/
OWNER_QUEUE.md`, "Which kind does an item get": ask who can settle it. A claim about the product
an agent can drive is `agent`; an opinion that fits in a sentence is `walk-p`; an opinion that
needs the screen is `walk`. **Defaulting to `walk` is not the safe choice** - it is how a queue
of sixty-two accumulated, and a deep queue stops being read at all.

An item needs four things or it does not go in:

- what changed, one sentence a non-technical reader follows;
- **the route** - the URL, the branch, the exact command. Under a minute to reach, or it will
  not get walked;
- what specifically to look at - the thing that might be wrong, not a feature summary;
- the date and the commit or branch.

An item with no route is not an item. If you cannot say how the owner reaches it in a minute,
that is the work, not the note.

## 5. Finish

One short report: what was walked, what was ticked, what feedback was captured and where it went.
If feedback became a task, name it. Then the ordinary wrap-up.
