---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "when I made it even longer and updated it, the whole badge disappeared. Now I made the badge text shorter, and it doesn't reappear, so I broke the graphic now"
---
# Three defects on the live-vote board, one of which destroys the graphic

**Filed:** 2026-09-03, from the owner's walk of `illustrator-live-vote-band.svg`. Verbatim in
`docs/acceptance/owner-queue/2026-08-30-a-live-vote-on-your-own-artwork.md`.

## 1. A too-long badge value hides the badge for good

The step warns when a badge value is too long, which he liked and which stays. Push it further and
the badge disappears from the graphic; shorten it again and it does not come back. The only
recovery he could think of was re-importing the file.

A fit rung that hides an element must be reversible on the next update, or the graphic carries a
dead layer into the show. Suspect the overflow path setting a hidden state that the next update
never clears - the same shape of bug as an entrance reset that clears inline properties in one
direction only.

## 2. The percentage fields refuse typed text

Selecting a percentage field highlights it in the preview, so the binding is right, but typing
changes nothing. The question and the option rows on the same graphic accept text normally.

**Check first whether this is deliberate.** In a live vote the percentages are painted from the
tally (`paintPollState`), so a typed value would be overwritten the moment a vote arrives - in
which case the defect is that the field is offered at all, which is the rule at
`docs/backlog/offer-nothing-that-cannot-work.md`. Either it accepts a rehearsal value or it is not
a field; sitting there inert is the one answer that is wrong.

## 3. The badge shrinks before it needs to, and jumps

*"It can randomly jump from normal size to small and back again."* Same family as the fit-ladder
findings in `docs/acceptance/owner-queue/2026-09-02-text-knows-its-box.md`; fix those first and
re-measure this rather than treating it separately.

## The shape question, decided rather than escalated

He noted the vote options are ONE multi-line field while every other value is its own field, and
said it is *"not horrible"* either way. **Give each option its own field**, keeping the multi-line
input as a paste shortcut. The reason is functional, not consistency: the operator's control panel
is generated from the fields, so one blob means an operator cannot change option 3 during a show
without retyping all of them, and cannot be given a per-option control at all. Overrule it if the
paste flow turns out to matter more.
