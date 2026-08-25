# Owner queue - what is built and not yet confirmed by a human

The one thing about shipped work that no file in the repo can know: whether the owner has actually
LOOKED at it. Git knows what landed; only a person knows whether it was any good.

Run **`/walk`** to go through the open items in one pass. It reads this file, takes you to each
thing, and records the tick or the feedback. An empty Open list IS the confirmation that nothing
is waiting.

## How this list stays honest

- **An item goes in when the work lands**, with what to look at and how to reach it in under a
  minute. No item without a route.
- **An item leaves when it is ticked**, or when `/walk` records feedback that becomes its own task.
- **Anything sitting open past 7 days is dropped as presumed seen**, with a line in Dropped below.
  The owner tests most things within a couple of days, so an old unticked item is far more likely a
  stale claim than genuinely unseen work - and a list of stale claims is what this file exists to
  replace. If a drop was wrong, normal use will surface it and it comes back.
- **Hardware-blocked checks are not "unseen"** and do not expire. They live in their own section
  because they need a CasparCG box, an SPX server or real people, not five minutes at the desk.

Nothing here is a gate. It is a to-do list with an expiry date.

## Open

Seeded 2026-08-25 from the work that landed in the preceding week.

- [ ] **SVG import steps 3, 4 and 5** - `b41533bf`, `80b9185e`, `7af9ca7b` (2026-08-24/25). One
      fitting system, draw a field on the canvas, versioned `NOACG_LAYOUT` with vertical growth.
      **None of the three has been seen** - the Browser pane would not composite during the build
      sessions. Route: `/app` -> Create -> Import graphic, bring in any SVG, add a field on the
      canvas, then type past the box and watch it grow. What to look at: whether growth happens
      where you expect it, and whether the field you drew lands where you drew it.
- [ ] **Wizard motion sense** (merged) - travel raised to about 10% of frame, the easing list now
      reacts to the motion, ten cards collapsed to six families, a universal bank in every
      category. Route: Create -> any category -> Animation step. What to look at: whether Speed and
      Easing now visibly do something. They were never broken; the motion was too small to show
      them.
- [ ] **Easing curve on the control page** - `796b334f` (2026-08-25). An operator can change a
      graphic's easing from its own control page, with the curve read back off the keyframes.
      Route: a production's control page for any animated graphic.
- [ ] **Speaking-timer type, dc01 debate board, ss21 minute rule, pl05 floor vote** - `c3752040`
      (2026-08-24). The owner has not seen ss21 or pl05 at all. Route: Browse -> scoreboards.
- [ ] **Animation preset picker** - `0299722a` (2026-08-23), step 1 of the animation road. Route:
      Create -> Animation step. What to look at: whether the presets are worth having before the
      other categories get them.
- [ ] **Goal bumps the score** - `10eeaa96` (2026-08-23). Route: a scoreboard production, press
      Goal A / Goal B live. What to look at: that the score moves by a panel-computed payload -
      the template never counts anything itself.
- [ ] **Cue editor field grouping** - `9f06618e` (2026-08-22). Route: a production -> edit a cue.
      Open question the owner has not ruled on: whether the `-> Preview` affordance stays.
- [ ] **Dashboard re-lay at 1366** - `fe6a0447` (2026-08-21). Route: resize to 1366 wide and open
      a production dashboard.
- [ ] **ig39 "Key Figures"** - `18d34f2b` (2026-08-20). Route: Browse -> infographics -> ig39.

## Blocked on hardware or real conditions

These do not expire. They need equipment or people, not a walkthrough.

- [ ] **CasparCG Connect against real hardware** - one server under Settings, one button airs a
      production. Built and CI-green on `claude/caspar-connect-51d22d`; **never touched real
      hardware**. Land it before `npm publish` or it misses noacg 0.2.0.
- [ ] **Browser Output on the real playout box** - a hosted `/output` re-test after the boot
      recovery work.
- [ ] **SPX output embed on a real SPX server** - shipped, never run against one.
- [ ] **Interactive playout with real people** - phases 0-6 all merged, never visually accepted
      end to end with an audience.

## Dropped as presumed seen

Nothing yet. When `/walk` expires an item it lands here with its date, so a wrong drop is visible
rather than silent.
