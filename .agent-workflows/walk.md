# walk - go through what is built and not yet confirmed by a human

Shared canonical procedure for the `walk` workflow - `/walk` in Claude Code, `$walk` in Codex.

**The question this answers: is there anything the owner should look at before it goes stale?**
The items live one per file in `docs/acceptance/owner-queue/`, each with a `kind:` of `walk`,
`owner-action` or `hardware`; `docs/acceptance/OWNER_QUEUE.md` holds the rules and the Dropped
log. No open `walk` file is a real answer - say so in one line and stop.

Optional argument: a filter (an item's subject, or `hardware` to walk the blocked list instead).

## Why this exists

Git records what landed. It cannot record whether a person looked at it and thought it was any
good - that is the one fact about shipped work no file in the repo can hold, and it used to be
smeared across forty memory entries as prose nobody re-checked. The queue holds it in one place,
with an expiry, and this workflow is how it empties.

## 1. Read the queue and expire what is stale

List `docs/acceptance/owner-queue/` and read every file that has no `done: true`. Their front
matter carries `kind:` and `date:`; `docs/acceptance/OWNER_QUEUE.md` carries the rules and the
Dropped log.

**Before presenting anything, expire the stale items.** Any `kind: walk` item whose `date:` is
more than 7 days old is DELETED, with a one-line entry added to the Dropped log in
`OWNER_QUEUE.md` (`<name> - dropped <today>, presumed seen`). Do not ask first and do not agonise:
the owner tests most things within a couple of days, so an old unticked item is far more likely a
stale claim than genuinely unseen work, and a wrong drop resurfaces in normal use. `hardware` and
`owner-action` items never expire.

Report what was dropped in one line so a wrong drop is visible.

## 2. Present the open items

Numbered 1..N, newest first, each one line: what it is, and the route in a few words. Do not
paste the whole file back - the owner is deciding what to look at, not reading a document.

If the Open list is empty after expiry, say exactly that and stop. That IS the confirmation the
owner is asking for when they run this.

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
   - **Feedback** -> capture it VERBATIM in the item, then turn it into work: a task now if it is
     small and in scope, otherwise a line in `docs/GOALS.md` or an issue. Say which you did. The
     item stays open until the feedback is addressed, with the feedback under it.
   - **Not now** -> leave the file, and reset its `date:` so it does not expire this week.

Then offer the next one.

## 4. Adding to the queue

Any session that lands observable work adds ONE FILE in the same commit:
`docs/acceptance/owner-queue/<date>-<slug>.md`, with `kind:` and `date:` front matter. **One file
per item, never a shared list** - five sessions appending to one list at the same offset is a git
conflict, and a conflict makes the landing job abort and stop, which strands the branch until a
person looks at it.

An item needs four things or it does not go in:

- what changed, one sentence a non-technical reader follows;
- **the route** - the URL, the branch, the exact command. Under a minute to reach, or it will
  not get walked;
- what specifically to look at - the thing that might be wrong, not a feature summary;
- the date and the commit or branch.

An item with no route is not an item. If you cannot say how the owner reaches it in a minute,
that is the work, not the note.

## 5. Finish

One short report: what was walked, what was ticked, what feedback was captured and where it went,
what expired. If feedback became a task, name it. Then the ordinary wrap-up.
