---
kind: walk
date: 2026-08-28
---
# THE REHEARSAL: draw the quiz and the scoreboard, and run the show

This is docs/GOALS.md ## NOW step 3 - the acceptance test for 2026-09-12 - consolidated from
four older fragments the owner ruled trusted (2026-08-28): svg-import steps 3-4-5, the
speaking-timer/scoreboard batch, goal-bumps-the-score, and the debate-clock reload.

**Route (30-45 min, the one walk that decides the goal):**
1. Draw a QUIZ board and a SCOREBOARD yourself in Illustrator or Figma - your artwork, not ours.
2. /app -> New graphic -> Import graphic: import each, bind the text fields, attach the
   behaviour (quiz: lock/reveal; scoreboard: score +/-, Goal A/B).
3. Put both in ONE production and run it from the dashboard as the operator: lock an answer,
   reveal it, bump scores with Goal presses, fix one with +/- - never seeing code.
4. Mid-run, RELOAD the dashboard tab and carry on - the show must survive it (this absorbs the
   debate-clock reload item).

**What to look at:** whether a student could do what you just did, where you hesitated, and
anything the operator sees that is not their show's vocabulary.

**Machine pre-run verdict (2026-08-28):** the same road was walked machine-side first -
docs/GRAPHIC_BEHAVIOUR_PLAN.md section 11 and
docs/acceptance/owner-queue/2026-08-28-rehearsal-machine-pre-run.md. Two defects fixed before
your walk; the Goal press and the direct reveal are known gaps, not surprises.

---

## Owner walk, 2026-09-02 - the quiz half, VERBATIM

He drew his own chess-themed quiz board in Illustrator
(`e2e/fixtures/svg-corpus/home-made/quizbgchess2.svg`) and imported it. The import itself passed:
"the import seems to work fine. It identifies the text fields and it can find other shapes also
that I made." Everything below is the rest, in his own words.

> One problem we still have is that text doesn't really know how to act and doesn't understand its
> own background.
>
> What I mean is that, for example, in this quiz board, we have a square, and inside the square is
> the text. A human looks at this and understands that the square is the box for the text. However,
> the system doesn't understand that the text should fit inside that box. This means that even when
> I choose for the text to get smaller, it immediately shrinks, which doesn't make any sense because
> we have room in the box, okay?
>
> If I choose to wrap to the next line, it immediately starts wrapping to the next lines without,
> again, using the space we have in the box. Also, even if we have room to the right, so the text
> goes to the right, we can't have that because then we have too much room on the left.
>
> We need to understand where we want the text to be centered. Do we want it to be left-aligned,
> centered, or right-aligned? This is connected to what box we are using. We need to have a system
> where we can assign the bounding box to the text we are working with.
>
> In a quiz board, we want the question to be bound to some kind of area where that question can
> live. It should be able to be nicely centered, left-aligned, or right-aligned, depending on what
> you choose. It should not become smaller before it hits the box's edge. It shouldn't start making
> new lines before it goes to the box's edge and this also might be a way to actually be able to
> resize the box if we need it. I know that I have had a hope that we could extend the box size if
> the text gets longer. It would be really dynamic so we could have really short questions or really
> long questions. Of course we should have some kind of limit. We shouldn't destroy the whole art
> and we shouldn't be able to put one page of text because no one can read that on screen so we need
> to have some limits. It would be very nice if the box that you created in illustrator would
> actually resize with the text. That would be quite beautiful. Of course I know that this is quite
> difficult to make hard rules around because for example a lower third I want it to grow in the
> horizontal axis and in a quiz board, I want the horizontal axis to be fixed, and it should grow
> only in the vertical axis.
>
> So, these kinds of rules we need to be able to implement, and I'm sure we can do it. But also, one
> important thing here is that it should be easy to understand for the user. So, here we should use
> Fable to really think about a UX/UI that would make it intuitive.
>
> Of course when we have a text and a shape underneath it, we shouldn't be able to automatically
> connect it with the text, right? I think this is what we should do: each text field looks at
> what's underneath it and if there's a shape, that's the shape the text should live on. You could
> add the options that you can also transform the shape if the text gets longer. If you don't allow
> transform then the only option is to make the text smaller and keep it short enough for its box.
>
> And one thing I noticed when I got more rows in the question is that it affected the placement of
> the answers. So, our text, which doesn't even fill the whole box where it should be living, still
> affects other text underneath it. This is, of course, not what we want.
>
> We need to have some guardrails to ensure that text can't overlap. However, we cannot adjust the
> whole graphic just because a text got a new line. The graphic itself must contain enough room for
> the text. If we allow the box to get bigger, then maybe we can permit it to affect other graphics.
>
> But yes, this actually brings us back to the need for a system that is smart enough to understand
> where the text should live. Otherwise, the key issue I've been discussing here is that, right now,
> the system has no idea how the text should behave in relation to the graphics behind it. This
> means that it will look odd immediately when you add different text.
>
> We need to establish a system where the text appears as if it is designed on the graphic,
> regardless of whether the text is short or long. Therefore, we must have basic alignment rules and
> a logic that connects the artwork containing the text to the text itself.

Three smaller findings from the same walk, also verbatim:

> Every time I uncheck or check a box for a text field, the graphic preview to the right loads
> again. It flickers but nothing happens to it. For example if I remove the question from the
> graphic, the text will itself stay there, which actually makes sense that it should stay there. I
> also think that it could ask, "Do you want to remove the text also?" if it's a mistake that we
> don't want the text there at all. I feel weird that you would uncheck a box and then the text
> would still be there. If the text is there why wouldn't you want to be able to change it?

> I brought the graphic into the rundown and I noticed that I wanted to change something
> immediately. I pressed the back button on the top left on the screen, I went home and I wanted to
> go and change something in the graphic. It feels like it's impossible to get back to the wizard
> once you have gotten out of it. I feel like I quite often want to get back to the wizard and not
> open it up in the other editor so it will be nice to be able to go back so you don't have to
> import again and do everything again. I want to just redo some animations or something so I want
> to go back to the wizard and get the same options I have there.

## Where this went

The box-binding work is `docs/TEXT_BOX_BINDING.md` and a step in `docs/GOALS.md` ## NOW. The
measured defect underneath it is in that doc's "What is broken today" section. This item stays
open until the owner has walked the answer.
