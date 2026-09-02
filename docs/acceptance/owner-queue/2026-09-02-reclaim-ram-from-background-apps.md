---
kind: walk
date: 2026-09-02
---
# One command now says which background apps are wasting your RAM, and frees them on request

Date: 2026-09-02. Branch: `claude/f-reclaim-the-ram`.

## What changed

You said in August that you should not have to come in and close programs by hand to get work
moving again. This is the first half of that.

The machine runs a pile of background helpers that hold memory and do nothing for you: an Adobe
Creative Cloud helper tree with two bundled servers of its own, Western Digital's drive discovery
service, the Stream Deck daemon, an ASUS toy. On a 16 GB laptop that is the difference between a
queued job starting and a queued job waiting, because the job queue refuses to start anything
below 4 GB free.

`npm run reclaim` lists them and frees nothing. It also lists what it refused to touch and why,
so you can see the tool being careful rather than take it on trust.

`npm run reclaim -- --apply` closes them and prints what came back.

The Codex desktop app and the Antigravity editor are worth far more memory than the rest put
together, so they are named but held back behind a second flag: you might have a conversation open
in one, and no program can tell.

## The route, in under a minute

In any checkout:

```
npm run reclaim
```

Read the three groups. The first is what it would close, the second is what it is holding back for
you, the third is what it refused. Then, if you want the memory:

```
npm run reclaim -- --apply
```

## What to look at

- Does the "would close" list contain anything you would miss? That list is the entire safety
  argument, and it is meant to be short enough to read.
- Is anything obviously missing from it that eats memory on your machine and you never use?
- The refused list should contain Chrome, Wispr Flow, your Claude sessions and every one of the
  repository's own node processes. If anything you care about is not in that list, say so.

## Still open

The job queue does not call this yet. When a job is starved for RAM it still only clears away
orphaned test browsers. Wiring this in is what actually answers what you asked for, and the design
note for it is `docs/backlog/ram-reclaimer.md`.
