---
kind: walk
date: 2026-09-03
---
# Nothing sits on top of a dialog

**Date:** 2026-09-03 · **Branch:** `claude/c-consent-over-dialog`

## What changed

On the hosted site, a first-time visitor who had not yet answered the analytics consent banner
could not finish the creation wizard. The banner sat on top of the confirmation dialog, so the
click on **Add it and go there** went to the banner instead of the button. The last click before
a production, taken by a notice.

The cause was one number with nothing to compare it against. The banner carried `z-index: 1200`;
the highest value anywhere else in the whole stylesheet was 140, on the dialog layer. So the
banner was above every dialog in the app - all sixteen of them - not just this one. It only ever
showed up on the hosted site, because the banner does not exist offline, which is why it went
unseen until the scheduled configured suite failed on that exact click overnight.

The stylesheet now has a named layer scale instead of loose numbers, and the order is about
whether the user asked for the surface:

> notice < popover < modal < dialog-over-dialog < sign-in

A notice is the only one that put itself on screen, so it loses to everything. That also settles
a second overlap you would have met: the banner used to cover **⟳ Publish changes** in a
production's Links popover.

Two more surfaces turned out to be above the dialog layer for no stated reason and came down with
it: the step-timeline right-click menu, and the account dropdown in the topbar (which the Save
dropdown wears too).

The scale draws one line that is worth your eye, because it is a judgement rather than a bug fix.
The creation wizard fills the screen through the same machinery a dialog uses, but it is a PAGE -
it asks you nothing, and it is where a first visit is spent. So a notice still sits **over** the
wizard, and only loses to things that ask a question. Ranked with the dialogs it would have
vanished instead of dimming, because the wizard's backdrop is opaque, and the consent banner
would never have been seen on the visit it exists for.

## The route, in under a minute

1. Open **a fresh profile** - a private window, or clear site data for the studio. The consent
   banner only appears while it is unanswered, so an existing profile will not show this.
2. Go to `/app`. The banner is in the bottom-right corner, on top of the wizard that opens -
   that part is deliberate, see above. **Leave it alone.**
3. Make any graphic: **Templates**, pick a design, **Next** through to **Finish**.
4. Name it, name a production, press the production door, and then press **Add it and go there**
   in the dialog that comes up.

## What to look at

- **The button takes the click** and you land on the production page. That is the whole fix.
- While the dialog is open, the banner is behind the dimmed backdrop with everything else -
  visible, but not in front. It should look like part of the page you are being held away from,
  not like something floating over the dialog.
- Close the dialog. The banner is fully usable again, and **Allow** / **No thanks** still work.
- Worth a glance while you are in a fresh profile: open a production's **Links** popover with the
  banner still unanswered. **⟳ Publish changes** and **Unpublish** should be pressable.

## Also worth a glance

The account menu (your avatar, top right) and the Save dropdown moved down a layer. They should
still open above the page and above everything in it - nothing about them should look different.
Same for the right-click menu on the step timeline.
