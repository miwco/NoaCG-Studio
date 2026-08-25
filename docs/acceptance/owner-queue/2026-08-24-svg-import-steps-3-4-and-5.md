---
kind: walk
date: 2026-08-24
---
# SVG import steps 3, 4 and 5

`b41533bf`, `80b9185e`, `7af9ca7b` (2026-08-24/25). One
fitting system, draw a field on the canvas, versioned `NOACG_LAYOUT` with vertical growth.
**None of the three has been seen** - the Browser pane would not composite during the build
sessions. Route: `/app` -> Create -> Import graphic, bring in any SVG, add a field on the
canvas, then type past the box and watch it grow. What to look at: whether growth happens
where you expect it, and whether the field you drew lands where you drew it.
**Updated 2026-08-25**: a box drawn before the artwork had been measured used to be thrown
away silently - the marquee vanished on release and no field appeared, with no error anywhere.
The drop is now held and placed as soon as the artwork reports its box.
Worth one deliberate try: arm '+ Draw a field on the artwork' and drag IMMEDIATELY, without
waiting for the preview to settle. The field should still land where you dragged.

## Walked 2026-08-25 - the CANVAS is accepted, the WORDS are not

Stays open until the text and the "what travels with it" question are redesigned: goals 4 and 5
under "students make their OWN graphics" in `docs/GOALS.md`. Owner, verbatim:

> "Looks very good so far. I like that it's only one canvas. It's very clear: you can click on the
> text and it removes the tick from the line. It works great. I can draw a feel [field] and artwork
> that also looks to work the behavior. It is a little bit random right now because we just have a
> quiz there but it's fine. We'll add more special graphics there until we have some other system
> that might automatically do stuff. Anyway I think that's fine even though it might be a little
> bit confusing. We should have a small eye for info or something like that where you can see what
> this actually does and why it is here."

> "Also there's kind of a lot of text in this fields page. I would like that there will be less
> text and it would be so intuitive so you don't have to read that much. All these stages would
> have their own small eye icons and you could look at more information, something like that."

> "Also we need to have a bigger plan of some kind of a documentation page where we can gather all
> the information on how everything works. That's good to have but no one wants to read
> documentation. They just want everything to work so yeah less text. If you want to check text,
> you should press somewhere and it should be like one. All the text that is automatically visible
> is like one line, very clear what's happening."

> "The really confusing part right now for me, again, is too much text. I don't want to read it but
> it's the 'what travels with it' so I can choose and click something on the artwork. What travels
> with it has to do with whether the text gets long or something and the panel grows. That would
> make sense but still my brain does not really understand now how I choose what travels with it.
> What am I choosing? When I choose, press that button and click something under my lower third, I
> can only click the fields. What does that mean? Should I add all three fields to travel with it?
> What does it do? This one doesn't make sense to me right now. I'm sure it's very smart but it's
> not clearly explained. I shouldn't be choosing the data fields with the text for anything because
> of course that text should be able to become longer and the background should grow with it. I
> don't know why we need to choose them and what it is for so that needs to be explained and also
> be clear. If I can't automatically understand what it is, it's probably not good enough yet."
