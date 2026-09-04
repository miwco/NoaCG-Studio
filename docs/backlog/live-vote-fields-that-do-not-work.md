---
v: 1
source: owner
raised: 2026-09-03
state: mostly-landed
asked: "when I made it even longer and updated it, the whole badge disappeared. Now I made the badge text shorter, and it doesn't reappear, so I broke the graphic now"
---
# Three defects on the live-vote board, one of which destroys the graphic

**Filed:** 2026-09-03, from the owner's walk of `illustrator-live-vote-band.svg`. Verbatim in
`docs/acceptance/owner-queue/2026-08-30-a-live-vote-on-your-own-artwork.md`.

**Worked 2026-09-05 by row J (`claude/j-live-vote-defects`).** Defects 1 and 3 turned out to be one
cause and are fixed; defect 2 was deliberate and is now stated instead of looking broken. The shape
question at the bottom is still open. What each of them actually was is recorded below, because the
hypothesis in the first version of this file was wrong about all three.

## 1. A too-long badge value hides the badge for good — FIXED, and it was not a hiding path

Nothing in the fit ladder ever hid anything: there is no rung that sets `display`, and measurement
confirmed the badge group stays lit at every value length. What he was watching was the badge text
**squeezed into a fifth of its pill**, which at broadcast scale is a grey smear rather than a badge.

The cause is the SIDEWAYS room a CENTRED line is given. Both gaps beside a centred word are half
the leftover by construction, so mirroring the tighter one hands the line back exactly its own
drawn width. Measured on his board: a 260-unit pill, a 142-unit word, **143 units of room**. One
extra word cost a quarter of the size; two floored it at 55% and squeezed it into the same 143
units. Every longer value then looked identical, which is why "even longer" made no difference.

`svgAlignOf` (`src/templates/importedDesign/svg.ts`) now keeps a TYPOGRAPHIC margin from each edge
for a centred line - half the drawn type, the same side bearing `measureSvgRoom` already keeps
between a line and a neighbour drawn beside it - symmetric about the anchor, and it may only ever
ADD room. This is the sideways half of the argument settled downwards on 2026-09-02, where the
space above a centred line stopped being read as margin.

His badge goes from 143 units of room to 238. `PLEASE VOTE` now airs at the drawn 22px instead of
16.25px; `PLEASE VOTE NOW` at 20.5px instead of 12.1px squeezed.

**The "it doesn't reappear" half did not reproduce**, before or after the fix: shortening the value
takes the shrink, the squeeze and the overflow report back off, on the cue editor and on the
program stage. Row C's landing on 2026-09-04 is the likeliest reason - it stopped the ladder
caching a measurement nobody could take, which is exactly a state no later value could correct.
Whatever it was, the recovery is now gated (`import-svg-behaviour.spec.ts`, the badge walk).

## 2. The percentage fields refuse typed text — DELIBERATE, and now said out loud

It is deliberate, and it has to be: `paintPollState` writes every figure from the tally on each
`update()`, so a typed value would be overwritten by the next vote. `pollDrivenLayers` therefore
drops the question, the option labels, the figures and the total from the field list, and the built
graphic has one artwork field on it - `Badge text`.

The defect was that the mapping step still offered a **Field name box and a Text box** on all eight
of those rows. They looked exactly like the row above them, they highlighted the layer in the
preview when he selected them, and nothing he typed reached anything at all. Those two boxes are
gone; the row states the layer's name and that the vote fills it, and the section's count stops
saying "9 of 9 editable on air" about a graphic with one editable field. This is
`docs/backlog/offer-nothing-that-cannot-work.md` applied to its third surface.

**A rehearsal value was not added.** The percentages are the one thing on this board that must
never disagree with the tally, and an operator's typed 40% surviving until the next vote lands is a
worse failure than not being able to type one. Rehearsing the figures is what the Audience tab's
Simulate votes is for, and it drives the real path.

## 3. The badge shrinks before it needs to, and jumps — FIXED by the same change

Same cause, milder symptom, and his own words diagnosed it: *"it doesn't fill the whole shape. It
could."* It could, and now it does. What remains is that a value the pill genuinely cannot hold
still takes one ratio jump down to the floor rather than easing there, which is the ladder's ruled
behaviour (`docs/SVG_IMPORT_PLAN.md` §3) and not a defect of this board.

## The shape question, decided rather than escalated — STILL OPEN

He noted the vote options are ONE multi-line field while every other value is its own field, and
said it is *"not horrible"* either way. **Give each option its own field**, keeping the multi-line
input as a paste shortcut. The reason is functional, not consistency: the operator's control panel
is generated from the fields, so one blob means an operator cannot change option 3 during a show
without retyping all of them, and cannot be given a per-option control at all. Overrule it if the
paste flow turns out to matter more.

Not started. It is a field-shape change on a persisted format (`pollBehaviourFields` appends, and
`fieldIdFor` resolves a control's payload key by INDEX), so it needs the migration rule in the same
commit rather than a quick edit.
