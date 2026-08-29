---
kind: walk
date: 2026-08-27
---
# + New graphic, from every surface

(2026-08-27). The wizard door is now one control mounted by all five shells, and it exists on
the production dashboard for the first time. Verified by spec; never watched by a person.

Route, about half a minute: open any **production** (Home -> Productions -> a show). In the
header, right after the workspace tabs, press **+ New graphic**. The wizard opens; browser
**Back** returns you to the dashboard.

What to look at: the button sits in the right-hand cluster, well clear of **■ All out**, and it
matches the other header buttons in size and spacing. Because you were standing in a production,
the wizard's Finish step should already be pointing at that show rather than offering a new one.
The same button is on Home, the control page, the editor and the video shell - wherever it sits
beside **Home** the order is logo, Home, then **+ New graphic**.

## Owner feedback, 2026-08-28 (walk) - two changes, decided and tasked

Verbatim: inside the wizard *"the only way to get back to the starting Wizard page is by
pressing the X in the upper right corner... there's not the new graphic button, which is the one
we are used to using. I think it could be a nice touch to have it there."* And on placement:
*"should it move left beside the home button, or should the home button move to the right beside
the new graphic button? I don't really know. Do you have any UX/UI expert opinion... When you
find a decision, just put it there."*

Decision taken (orchestrator, owner delegated): **Logo -> Home -> + New graphic**, left to
right - the left cluster is "where I go back to" in reach order, and + is an action, matching
the top-right + convention Home already uses. So Home moves LEFT of the door where they are
currently swapped, on both editor shells and anywhere else they sit adjacent. And the WIZARD
mounts the same door as a guarded start-over (through requestSwitch), so X is no longer the only
way back to the wizard's start.

**Built 2026-08-28** - both changes are in; the item stays open for the owner's re-look. Route,
under a minute: open any saved graphic (the editor) and see logo -> Home -> **+ New graphic**;
same in the video shell. Then press + New graphic, pick "Start from a template" (now mid-walk),
and press the header's **+ New graphic** - you are back on the wizard's front page, browser Back
returns to the step, and with unsaved editor work the unsaved-changes dialog appears first. On
the front page itself the button does nothing.

## Round two, owner walk 2026-08-29 - placement still wrong, colour ruling new

Verbatim: *"on other pages we do not have it on the left. For example, in the playout page or
the home page the new graphic button is not on the correct spot"* - he expects it LEFT, beside
Home, consistently on EVERY surface (the wizard's own page reads right). And: *"I think I like
the blue one. I don't think it needs to be yellow"* - the button keeps its blue look, no amber.
Session CC (2026-08-29 wave) owns it; item stays open for the re-look.

What had gone wrong: the 2026-08-28 change fixed the ORDER of the pair but left the pair itself
at the far right on three surfaces out of five, so the door he reaches for most often was in a
different place depending on where he stood.

**Built 2026-08-29.** The trio now opens every header, on the LEFT of the bar's `.spacer`:
logo, Home, **+ New graphic**. Which control is Home differs by surface and that is not drift -
on Home the crumb beside the logo says Home, and on the production dashboard the logo IS the
Home door. The Home button on Home stays absent for the same reason. And the door is the plain
blue button everywhere: `primary` (amber) is gone from Home's, because amber is the on-air
accent and creating a graphic is not an on-air act. `e2e/project.spec.ts` now asserts the
placement on all five surfaces AND that the door precedes the spacer - adjacency alone was
satisfied by the pair sitting together at the far right, which is exactly what he found.

Route, under a minute: **Home** (the button sits right after the "Home" crumb, blue), then open
any **production** (Home -> Productions -> a show) - the button is right after the logo, at the
opposite end of the header from **■ All out**. Then a saved graphic's **control panel** (a
graphic row's ⋯ -> Control panel): after **← Home**. The editor and the video shell are
unchanged in order and moved left with the rest.
