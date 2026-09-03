---
kind: agent
date: 2026-09-02
---

> **Re-kinded 2026-09-03 - the taste half is already answered.** He settled the voice question on his
> phone (*"The docs are good."*). What is left is a beginner read-through of `#browser-source`, which
> is an assessable claim rather than a ruling, and the `#data` route, which is a design default:
> whether a non-technical operator's live-data path should sit behind a developer toggle has a
> conventional answer, and the rule says derive it.

> **Partly settled 2026-09-03, on his phone.** On the voice question he said *"The docs are
> good."*, and the "on air" gloss in Getting started **stays** as written. Still open, and both
> need the page on screen: the beginner read-through of `#browser-source` (can a stranger get from
> "I published a production" to "the graphic is in OBS" without asking what a slug is), and the
> `#data` question, which is a product call rather than a docs one - live data currently sits
> behind the Advanced-mode toggle, and he has not said whether that route should move. Re-kinded
> from `walk-p` for that reason.

# Read /docs cold and say whether a person wrote it

**Date:** 2026-09-02 · **Branch:** `claude/g-docs-a-person-wrote`

## What changed

Your note: "The NoaCG documentation still reads somewhat AI-written in places... simple enough
that even a child could understand how to use NoaCG."

Two passes over `docs.html`, the public page at `/docs`.

**The style pass.** A colon used as a mid-sentence connector in ten places is gone. The
"X, never Y" construction now appears only where it corrects a mistake a reader would actually
make, instead of firing on its own. End credits and Tickers used to open as find-and-replace
copies of one another, same argument, nouns swapped; the ticker one is now short and points back
at the credit roll instead of restating it. The CLI's list of what it does was printed twice in
near-identical words, in the Getting started callout and again at the head of the agent guide, so
each now says a different half. "The live unit", "three entrances", "makes a service status
scannable" and "everything they need" are gone.

**The beginner pass**, which is the half that is not about style. The page now says what a lower
third is and what on air means. Advanced mode is defined where it first sends you there. The slug
in an output URL is named as something the studio mints at publish rather than something you type,
and the **Links** button is named as the place the output URL, the control page URL and the join
link are all copied from, which the page never said anywhere. Preview and program are two panes in
a browser window, not "two monitors". The Google Sheet route names the Rehearse panel it actually
lives in, and warns that the editor is behind Advanced mode. The quiz's audience percentages name
the field they are read from. `<templateData>` is explained where it first appears in a command.

No command, URL, product name, design name or field name changed anywhere on the page.

## The route, in under a minute

1. Open **`/docs`** and read the first screen.
2. Then **`/docs#tickers`** straight from the address bar (the left nav carries **Graphics** only,
   with the four kinds nested under it) and read that guide's first two paragraphs cold, followed
   by **`/docs#end-credits`**. Those two are the pair that used to read as one paragraph run
   twice.

## What to look at

- **The question you actually asked:** does it sound like a person now? Read the Getting started
  section and the Tickers opener out loud. If any sentence still has the machine cadence, say
  which one and I will fix that one rather than re-sweeping the page.
- **Is it simple enough?** The test was "a beginner who has never used NoaCG can follow each guide
  end to end without asking anything". The place to check that is
  **`#browser-source`**: a stranger should now be able to get from "I published a production" to
  "the graphic is in OBS" without stopping to ask what a slug is or where the URL lives.
- **One judgement call worth your eye.** In Getting started I wrote "Putting one of these on air,
  meaning into the picture the audience sees, works two ways." Glossing "on air" is either exactly
  the level you asked for, or it is talking down to a reader who works in television. You are the
  one who knows which.

## Also worth a glance

- **`#data`**, the Google Sheet paragraph. It now tells the reader to switch Advanced mode on to
  reach the Rehearse panel. That is true, and it may also be a product complaint rather than a
  docs fix: live data is a thing a non-technical operator wants and it is currently behind the
  editor toggle. Say if that route should move.

## What is deliberately NOT done

- **No new screenshots.** Only the SVG guide has any. The dashboard, the OBS setup and the quiz
  run would each be clearer with one, and `scripts/docs-shots.mjs` is the tool for it, but
  inventing captions for pictures nobody has taken is worse than saying so here.
- **No glossary.** Terms are glossed where they first appear instead. If you would rather have one
  block a stranger can bookmark, that is a different page and a different decision.
