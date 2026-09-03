---
kind: agent
date: 2026-09-02
---

> **Re-kinded 2026-09-03 - a claim, not an opinion.** All five numbered checks are facts about what
> the product does: the dialog asks before it writes, Cancel really cancels, coming back into a walk
> replaces rather than duplicates, and the rewind starts a new one. None of them is a preference.
# Leaving the wizard on purpose

Branch `claude/d-leaving-the-wizard`. **Until it lands, the live site still behaves the old way**,
so walk this on a local dev server or after the branch is on `main`.

Both halves of the bad minute you described on 2026-09-02: the production door that asked nothing,
and no way back into the wizard afterwards.

Route, about a minute. **New graphic -> Start from a template -> pick any design -> Skip to
finish.** Type a production name, then press **Add to the production - go live**.

What to look at:

1. **It asks first, and it names the rundown.** The dialog prints the production in a block of its
   own, says whether it is new or already holds a graphic under this name, lists what the press
   does, and ends with "Wrong production? Cancel and pick another one before you go." Cancel really
   cancels: nothing is saved and nothing is created. It should read as the same kind of moment as
   pressing **Export it** beside it, because both now stop and ask.
2. **Press Cancel, then the door again, then "Add it and go there".** You land on the production.
3. **Now press browser Back.** You are in the wizard, on the last step, with every answer still
   there, behind a warning that names what going back costs: finishing again rebuilds the graphic
   from the wizard's answers and writes over the one that exists now, and the copy in the
   production is replaced with its cues kept. **"Leave it as it is" puts you back on the production
   page**, not on Home.
4. **Press Back again, say yes, jump to Animation on the rail, change the entrance, then Finish and
   press the door again.** The confirmation now says **Replace it in this production?** and
   "takes its place". After it, your library holds ONE graphic, not two, and the production holds
   one copy with its cue intact. That is the part worth checking: a back button that duplicated the
   graphic every time would be worse than no back button.
5. **The other way out of a walk, which is the ✕.** Make a graphic, press **Export it**, close the
   export window, then press **✕** in the wizard header to rewind to its front page. Build a second
   graphic from the same design and leave the name alone. **Your library should hold BOTH.** The
   rewind ends the walk, so what you make afterwards is its own graphic - only coming BACK into one
   walk (step 4) writes over what that walk made. Worth a look because the two are one press apart
   and look identical at the moment of saving.

Not built, and scoped rather than guessed: opening a wizard-made graphic **from Home** and landing
in the wizard. That one has no draft in memory and has to reconstruct it from the saved template,
which needs the wizard's answers persisted with the graphic. `docs/backlog/back-to-the-wizard.md`
holds the two options and the reason the cheap one (deriving the answers back out of the code) is
rejected. The KIT flow's own last step still hands a whole set to a production without asking; same
argument, noted in the same file.
