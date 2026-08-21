# Where a brand mark is allowed, and where it only looks forbidden

**Status: OPEN AUDIT, 2026-08-21.** One type has been acted on (`countdown`); the other 47 are
listed here with the evidence, and nothing about them has been changed. Read this before flipping
any `logo: 'none'`.

## The ruling this exists to serve

**Owner, 2026-08-21:**

> A branded package should carry the mark consistently across every member that supports an
> appropriate mark placement; exceptions must be genuine type constraints, not accidental missing
> capability. […] A logo can fit any graphic if it's designed correctly. […] anything can have a
> logo, and I wish […] the models would be good enough that [they] could design all graphics with
> a logo if the customer wants that.

The distinction that ruling turns on: **a model placing a mark badly is a reason to teach the
model, never a reason for the platform to declare the mark impossible.** Every `logo: 'none'` in
the registry is therefore a claim that has to be earned, and most of them were never argued at all.

What it cost while unexamined: a Pro package carried its mark on the lower third and the sponsor
bug and never on the countdown, so the owner's sixth taste rule - *a package's mark is on every
piece or on none* - fired on **all 36 archived rows and all 4 topic-card rows**
(`docs/NOACG_PRO_PLAN.md` §25.4).

## Done so far

| type | shipped | what it needed |
|---|---|---|
| `countdown` | 2026-08-21 | type capability + the `game-timer` assembler taught the slot (`f2`) + `TypeDesign.logo`. The Pro countdown opts in; the four catalog timers decline. |
| `holding-screen` | 2026-08-21 | the same, in `starting-soon` (`f{next}`). `ss04` (house) opts in and draws the mark above its title; `ss01`-`ss03` decline. |
| `social-bug` | 2026-08-21 | capability only - it rides the lower-third chassis, so `assembleStandard` already injects the slot. **All four designs decline**, and `lt14` declines on a MEASUREMENT: see below. |

**`social-bug` is the first type where the DESIGNS, not the platform, are the obstacle - and a gate
said so.** The capability cost nothing (no assembler work, the mechanism is already exercised by
six lower thirds). Opting `lt14` in to prove it, `e2e/catalog/mark-height.spec.ts` failed it:

```
lt14  bare 113  marked { square: 120, portrait: 120 }
A mark made these straps TALLER.
```

Two short lines (`@noacg` / `INSTAGRAM`) leave the words shorter than the mark column, so the mark
sets the strip's height - 6% taller, against the family rule that **a strap spends width, never
height**. A hand-rolled probe measuring `.lower-third-box` had reported 113 → 113 and missed it
entirely; the spec measures the painted strap, and the spec is the authority.

So all four decline and each says why in its own source. Opting one in means BOUNDING the mark to
the words first (the `lt49`/`lt53` pattern) - a drawing decision on a compact strip, not a flag.
**This is what "opt-in per design" costs on a type whose designs were authored without room**, and
it is the shape to expect on the rest of the compact families.

## "Can this graphic take a mark?" is THREE questions, not one

This is the finding of the countdown work, and it is why "flip the other 47" was never one change.
Measured 2026-08-21 by composing a Pro countdown and reading its emitted definition:

| level | where it lives | what it decides | what it does NOT do |
|---|---|---|---|
| **permits** | `GraphicType.capabilities.logo` | whether the wizard OFFERS a mark | inject anything - `resolveOptions` turns it into `logoEnabled`, and `standard.ts` gates the slot on that |
| **implements** | the CATEGORY assembler | whether a slot exists to fill | apply per design - it is one branch per assembler |
| **places** | `logoSlot.ts`, `beside = prefix === 'lower-third'` | beside the words vs a band above them | vary per design - it is one hard-coded line |

**The countdown needed all three, and the capability alone measured as a no-op.** With
`capabilities.logo: 'optional'` already set, a Pro countdown still compiled `f0:textfield,
f1:number` and nothing else - because `assembleGameTimer` is a BESPOKE assembler that never called
`applyLogoSlot` and hard-codes its own field list. The category had no mark path at all.

Two consequences worth carrying into the remaining 47:

- **A capability flip changes no emitted default.** All 504 catalog fingerprints were byte-identical
  after `countdown` flipped, because the slot is gated on `logoEnabled`. So the flip itself is cheap
  and safe; it is the assembler and the placement that cost work.
- **A bespoke assembler numbers its own fields.** The game timer's `f1` is the duration, so the
  shared slot's default arithmetic (`lines + extraFields`) would have handed the mark an id the
  duration already owned - two entries for one id, and the later one wins the `getElementById`
  write. `applyLogoSlot` takes an explicit `fieldId` for exactly this; a caller that knows its own
  numbering passes it.

## The 47 types still declaring `logo: 'none'`

**176 designs behind them.** The `sibling` column is the cheapest available evidence: does any
design in the same CATEGORY already ship an optional or built-in mark? A `yes` means "this category
cannot hold a mark" is already false in our own code.

| type | freq | designs | sibling mark in category | category |
|---|---|---|---|---|
| `agenda` | 22 | 4 | no | infographic |
| `social-bug` | 17 | 4 | yes | lower-third |
| `poll` | 13 | 4 | no | infographic |
| `holding-screen` | 9 | 4 | yes | starting-soon |
| `ticker` | 8 | 7 | no | ticker |
| `scoreboard` | 5 | 4 | yes | scoreboard |
| `alert-level` | - | 7 | no | alert |
| `answer-board-2` | - | 4 | no | quiz |
| `answer-board-3` | - | 4 | no | quiz |
| `award-reveal` | - | 4 | no | reveal |
| `bracket` | - | 4 | no | results-board |
| `call-to-action` | - | 4 | yes | lower-third |
| `chat-highlight` | - | 0 | no | audience |
| `community-request` | - | 0 | no | audience |
| `esports-score` | - | 4 | no | esports-score |
| `fixtures` | - | 4 | no | infographic |
| `goal-meter` | - | 4 | no | infographic |
| `head-to-head` | - | 4 | no | matchup |
| `key-facts` | - | 4 | no | infographic |
| `listing-card` | - | 4 | yes | info-card |
| `live-bug` | - | 4 | yes | corner-bug |
| `live-poll` | - | 4 | no | poll |
| `map-round` | - | 5 | no | esports-score |
| `match-event` | - | 4 | yes | scoreboard |
| `match-status` | - | 4 | yes | scoreboard |
| `matchup` | - | 4 | no | matchup |
| `milestone-track` | - | 4 | no | infographic |
| `nominee-reveal` | - | 4 | no | reveal |
| `offer-card` | - | 4 | yes | info-card |
| `player-card` | - | 4 | no | matchup |
| `podium-score` | - | 2 | yes | scoreboard |
| `product-card` | - | 4 | yes | info-card |
| `public-notice` | - | 4 | no | public-info |
| `qa-card` | - | 0 | no | audience |
| `qr-card` | - | 4 | yes | info-card |
| `question-queue` | - | 0 | no | audience |
| `quiz-board` | - | 4 | no | quiz |
| `recap-card` | - | 4 | no | infographic |
| `roster` | - | 5 | no | results-board |
| `scorebug` | - | 6 | yes | scoreboard |
| `standings` | - | 4 | no | results-board |
| `status-chip` | - | 4 | yes | corner-bug |
| `timing-tower` | - | 4 | no | results-board |
| `transition` | - | 4 | no | transition |
| `verdict-card` | - | 4 | no | reveal |
| `viewer-question` | - | 0 | no | audience |
| `winner-card` | - | 4 | no | reveal |

**13 are contradicted by their own category.** `social-bug`, `holding-screen`, `scoreboard`,
`call-to-action`, `listing-card`, `live-bug`, `match-event`, `match-status`, `offer-card`,
`podium-score`, `product-card`, `qr-card`, `scorebug`, `status-chip`.

**THE SIBLING COLUMN RANKS BADLY, AND `holding-screen` IS THE PROOF.** This audit first called it
the cheapest of the high-frequency types - "a capability plus an opt-in, no assembler change" -
because `ss14`-`ss17` ship a slot in the same category. Done, it needed **exactly the countdown's
work**: those four are SIGN-OFF designs that hand-author their slot in `signOffShared.ts`, and the
holding-screen assembler had no slot path at all. A sibling proves the CATEGORY can hold a mark; it
says nothing about whether the ASSEMBLER can inject one, which is where the cost is.

**The column that actually ranks these is "can this category's assembler inject a slot?"** Swept
2026-08-21 over every category assembler:

| assembler | via `assembleStandard` | slot today | what a mark costs here |
|---|---|---|---|
| `lower-third`, `info-card`, `corner-bug`, `alert`, `public-info` | yes | inherited | **a capability + a per-design opt-in.** The shared assembler already injects the slot on `logoEnabled`. |
| `game-timer`, `starting-soon` | bespoke | **wired 2026-08-21** | done - and each needed the assembler taught, plus an explicit field id because both number their own fields. |
| `audience`, `credits`, `esports-score`, `frame`, `infographic`, `matchup`, `poll`, `quiz`, `results-board`, `reveal`, `scoreboard`, `stream-notification`, `ticker`, `transition`, `versus` | bespoke | none | **the countdown's work**: teach the assembler the slot, decide the field id, then opt designs in. |

So of the 46 types left, the ones whose category already routes through `assembleStandard` are the
cheap ones, and the sibling column had nothing to do with it. **Fifteen bespoke assemblers have no
slot path at all** - that, not the type declarations, is the real size of "anything can have a
logo".

**34 have no sibling evidence either way.** Silence is not a constraint; it means nobody has drawn
one yet.

**A handful are worth an argument rather than a flip**, and this is opinion, not measurement:
`live-bug` and `status-chip` arguably ARE the mark already, so a second one is the odd case; a
`transition` is a full-frame wipe, where real stingers usually DO carry a mark; a `ticker` is a
strip, where real broadcast tickers carry one at the leading edge. None of those reads to me as a
genuine constraint - they read as compositions that need deciding.

## The per-design opt-in, which a test insisted on

The owner's ask: separate *"this TYPE permits a mark"* from *"this DESIGN implements a slot"*, with
placement design-specific and support opt-in per design. **The first half is built** - and the repo
demanded it rather than anyone designing it.

Flipping `countdownType` to `optional` silently re-capabilitied gt01, gt02, gt05 and gt06, which
were authored with no slot. `e2e/graphic-types.spec.ts` caught all four by name:

```
gt01 (countdown): logo none -> optional
  promotion changed a design's authored capabilities — give the TypeDesign its own
  animationPresets / defaultZone / palette / fontId instead of taking the type's
```

That guard already existed for four other capabilities, so the fix was to make `logo` the fifth:
`TypeDesign.logo`, read as `design.logo ?? type.capabilities.logo`. The four catalog timers now
declare `logo: 'none'` - the type permits, they decline, because nobody drew a place for one - and
the Pro countdown declares `logo: 'optional'` for itself. `capabilities.logo` is now what it always
behaved like: permission.

**A second thing the same spec settled: an `optional` type declares NO logo field.** A declared
`role: 'logo'` field is one the template ALWAYS emits (`signOffType` has one because its designs
draw the slot unconditionally), so declaring one on an optional type reads `field count: type
declares 3, template emits 2` on every design in it. `lowerThirdType` declares none either.

**AND A THIRD, FOUND ON `ss04`: A CATALOG DESIGN MUST SAY `optional` ON BOTH SIDES.**
`resolveOptions` reads the HAND-WRITTEN variant's own meta (`startingSoon/ss04.ts`), while the
registry reads `TypeDesign.logo`. Opted in on the type side only, `ss04` compiled as `optional`,
offered the wizard a mark - and emitted no slot, because the assembler asked the other meta. The
factory gate is what compares them, which is why it reports "the design declares logo X, it
compiles to Y" rather than checking one side.

**The placement half is still open.** A `TypeDesign.markPlacement` would follow the same seam, but
nothing reads one yet.

**The placement half is the one with no home today.** `beside = prefix === 'lower-third'` is a
category rule with a design-shaped question behind it, and every remaining type inherits it by
accident. Until it moves, flipping a type silently chooses "band above the words" for every design
in it.

## The question the countdown left, and the ruling that dissolved it

Rule 5 fired on **12 of the 18** recomposed countdowns: the panel is sized for a big clock, so the
mark had room to sit BESIDE the label and the composer stacked it above. That was put to the owner
as "is the placement wrong, or is the floor?".

**Neither. The owner, 2026-08-21:** *"I cannot give you hard rules on where to place a logo. It
depends on the design."*

So the question had no answer of the kind it was asking for, and **rule 5 was demoted to
report-only** the same day - the third of the six to carry no pass/fail, beside rule 2
(conditional by the owner's own words) and rule 3 (a ratified floor he has not re-ratified). The
geometry is still measured on every frame; nothing is called a defect.

**The lesson is worth more than the rule was.** That second version of rule 5 was calibrated,
measured, and quiet on the whole corpus - and still wrong, because *"a mark takes a row of its own
only when the width leaves it no choice"* is a placement rule however well it measures. A threshold
can be perfectly calibrated and still assert something its author does not believe.

**Where the measurement should go instead.** Pro GENERATES its designs, so "the design decides"
needs something to decide per graphic, and in Pro the platform owns layout rather than the model.
The reading rule 5 already takes - *does the mark fit beside this line in this panel's width?* - is
exactly the input a composer needs to PLACE one. Used that way it is not a rule at all: it is each
graphic's own geometry answering for itself. That is a deliberate build, not a demotion, and it has
not been started.

Corpus reading after the demotion (36 rows, 90 pieces with a mark row): **54 of 90 stack the mark
over the line and 36 stand it beside; 12 of the stacked ones had room beside.** Those are numbers
to place from, not to fail on.
