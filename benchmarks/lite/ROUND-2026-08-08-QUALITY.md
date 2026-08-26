# Lite round 2026-08-08 — the quality round, and the first end-to-end product walk

Price was settled by `ROUND-2026-08-08-GATEWAY.md` and is not re-opened here. This round asks
three different questions: **does the doctrine hold in code**, **does the product's own click
path work**, and **what do the frames actually look like**. Six frozen-bank rounds were run —
`quality-v7` (the configuration as found), `v8` (one variable changed), `v9`/`v10`/`v11` (a
schema tidy-up, the regression it caused, and its attribution) and `v12` (the contract fix) —
plus one real generation driven through the wizard as a user and taken to a control page.

**Total real spend this session: $0.0611** — 4 walk generations ($0.0011) and six 30-brief
banks: v7 ($0.0103), v8 ($0.0097), v9 ($0.0084), v10 ($0.0098), v11 ($0.0105), v12 ($0.0100).
Budget was €5; about 1% of it was used. Three of those banks are §5.3 - an attempted schema
tidy-up, the regression it caused, and the rounds that attributed and undid it - and v12 is the
contract fix in §5.4.

**The shipping configuration is `lite-lower-third-v12`**: 29 of 30 machine-usable, zero schema
rejections, and the fixture that had failed every round since the gateway one now passes.

> **Superseded 2026-08-09 by `lite-lower-third-v13`** — the ordering fix §5.4 diagnosed and
> deferred, measured at 30 of 30 with no rejections. See `ROUND-2026-08-09-V13.md`, which also
> corrects one round list in §5.4 below.

---

## 1. The doctrine, checked in code rather than assumed

> Lite never invents a layout. It picks a proven catalog design and adapts it, and what it
> produces must be operable in the NoaCG control panel exactly like a hand-picked catalog
> graphic.

**It holds exactly, and it is narrower than it sounds.** `e2e/lite-parity.spec.ts` (added by this
round, free, in CI) compiles a Lite decision for each of the six audited chassis through
`compileLiteDecision` and compares the result against `variantById(id).create({})` — the same
design a user picks by hand:

| | result |
|---|---|
| data fields identical (ids, types, titles) | **6 / 6** |
| operator event buttons identical | **6 / 6** |
| machine state groups identical | **6 / 6** |
| Lite result passes static validation + the live bench | **6 / 6** |

There is no Lite-shaped template. `liteGroundedResult` calls the same `groundedResult`, which
calls the same `variant.create()`, so a Lite graphic is a catalog graphic with different copy,
colour and proportions.

**The vacuous part, stated plainly: for the only category Lite ships, "the same event buttons"
means "no event buttons".** Measured across the whole catalog by building every variant and
reading `eventButtons(template.js)`:

| category | designs with operator event buttons |
|---|---|
| scoreboard | 20 / 20 |
| results-board | 14 / 14 |
| quiz | 12 / 12 · reveal 12 / 12 · matchup 10 / 10 |
| audience | 12 / 20 · esports-score 8 / 8 · corner-bug 8 / 36 |
| ticker 7 / 21 · alert 7 / 12 · info-card 5 / 71 | |
| starting-soon 4 / 13 · game-timer 4 / 6 · poll 4 / 4 · stream-notification 4 / 4 | |
| **lower-third** | **0 / 89** |
| end-credits, infographic, versus, frame, transition | 0 |

So **the control-panel walk the brief asked for — "build a Lite quiz, poll or countdown and
check the event buttons" — is not buildable today.** `LITE_AI_CATEGORIES` is `['lower-third']`
and every lower third in the catalog is the implicit linear machine: play / next / stop, no
authored operator events. Both halves are now pinned by
`e2e/lite-parity.spec.ts`, so widening Lite into a category that does have machine behaviour has
to come back here and say so. The doctrine is satisfied; the interesting half of it is untested
because Lite cannot reach a category that has machine behaviour. Widening Lite to `poll` or
`game-timer` is what would make the parity claim mean something operationally — and it is
exactly what `docs/AI_LITE_PLAN.md` §6 defers until the quality loop produces a trustworthy
scorecard.

## 2. The control-panel walk, done anyway, on a real generation

Driven as a user (`lite-eval-out/tools/wizard-walk.mjs`, screenshots in `lite-eval-out/walk/`):
wizard → Create with AI → Lite → brief → generate → Finish → **topbar Save** → Home → Graphics →
row ⋯ → Control panel.

- Generation: **5.1 s**, verdict *"Passes SPX validation and the live playout test"*, card reads
  *"Adapted from “Underline” — a minimal lower third."*
- Fields on the saved graphic: `f0:textfield:Name`, `f1:textfield:Role`.
- Control page (`#/control/<id>`): live stage, ▶ Play · ⟳ Update · » Next · ■ Stop, the Entries
  rundown, and the machine state chip.
- Driving it for real: **Play → chip `● enter`, ON AIR badge on. Next → `● enter` (a two-state
  lower third has nowhere to walk). Stop → `◇ off`, badge cleared.**
- Event buttons rendered: **none** — correct, and the same as any catalog lower third (§1).

The whole path works. Nothing about the graphic being AI-made changes what the operator gets.

**Two UI observations from the screenshots**, neither a blocker:

- At 1440×900 the AI step is full-width before a generation and splits to form-plus-preview
  after one, which pushes the **result card below the fold** — the verdict line and "Adapted
  from" are there but need a scroll. The preview updates in place, so the user sees *something*
  happened; they do not see what the platform concluded.
- The Finish step's third door (**Open in the editor**, Advanced-only) also sits below the fold
  at that height. The two primary doors are above it, so the ordering is right.

## 3. The frozen bank — where the quality number comes from

Every round: 30 fixtures (`ai-lite-lower-third-fixtures.mjs` v2), one result each, no
cherry-picking, route `vercel:google/gemini-2.5-flash-lite`. v7 and v8 below are the two that
establish the quality number; §5.3 is the v9-v11 series and §5.4 is v12, both reading at the same 29/30.

| | gateway round (08-08) | **v7** | **v8** |
|---|---|---|---|
| machine-usable | 27 / 30 | **29 / 30** | **29 / 30** |
| provider calls | 31 | 32 | **30** |
| cost | $0.0096 | $0.0103 | $0.0097 |
| per generation | $0.00032 | $0.00034 | $0.00032 |
| `bench-line-wrap` warnings | 2 | 3 | 3 |
| chassis spread | lt02×7 lt11×6 lt05×5 lt15×3 lt25×3 lt32×3 | lt11×6 lt02×6 lt05×6 lt25×4 lt15×4 lt32×3 | lt11×7 lt05×6 lt25×5 lt02×5 lt32×4 lt15×2 |
| failures | `team-identity`, `call-to-action`, `multilingual` | `call-to-action` | `call-to-action` |

**27 → 29 of 30, and both recovered failures are the ones the gateway round's follow-up
predicted.** `multilingual` and `team-identity` now pass, which is the retry-to-the-primary
change (`7d6e4a2a`) doing what it was measured to do. The prompt's `team-identity` reproduction
the brief asked for therefore **could not be reproduced**: it is fixed, not open.

**`call-to-action` was the standing failure — every round, `generation_failed` after both
attempts.** It looked like the model being unable to satisfy a brief and it was a contract trap:
the intent kind a call-to-action line forces had exactly one chassis able to serve it, and that
chassis was the one the brief argued against. Diagnosed and fixed in §5.4.

**The chassis spread stays healthy** — six designs, the most-used at 7 of 29 (24%). "Same layout,
different colours" is not happening.

## 4. What the frames show that no rule code names

Read before the gate output, as §5 of the plan requires. The gallery is
`lite-eval-out/gallery-v12.html` (self-contained, needs-attention first) - the shipping configuration.

**Most of it is good.** `university-speaker` (lt02) — *Dr. Anika Ramanathan / PROFESSOR OF
ENVIRONMENTAL ENGINEERING* — is a strap you could air unedited. `news-anchor` (lt11) is a clean
amber-accent house strap. Placement, hierarchy and inset are right everywhere.

**Three things are worth the owner's eye:**

1. **`long-name` is a four-line "lower third".** The 32-character name wraps to two lines and the
   47-character role wraps to two more. Nothing overflows, everything validates, and it has
   stopped being a strap. This is the §1a finding unchanged: the capacity is genuinely spent
   (806px shared cap, no shrink headroom at the 20px floor), so the remaining levers are the
   designs' own tracked uppercase — catalog work, not AI work.

2. **`organization-identity` (lt02) trips `bench-line-wrap`, and it may be right to let it.**
   *"International Centre for Coastal Resilience"* wrapping to two lines over a
   *RESEARCH BRIEFING* kicker is ordinary broadcast practice for a long institutional name.
   `LITE_SINGLE_LINE_ROLES` treats `organization` like `person-name`; a person's name wrapping is
   a defect, an institution's formal name wrapping is a house style. Worth an owner ruling
   before the warning is ever promoted to an error.

3. **One v7 result painted a field that reaches no pixels, and the artifacts could not say why.**
   `quality-v7-long-name` (lt11, bespoke palette — white accent, black panel) renders the name and
   then a wide empty band where `f1` should be. `fieldCount` is 2, `update()` with fresh data
   still paints nothing, and no rule code names it. The v8 re-roll of the same fixture renders
   both lines correctly, and a local reproduction with no palette renders `f1` at 22px amber,
   visible — so the cause was in that generation's own colour decisions, **which the rig did not
   record.** Two things follow, and the first is already done:
   - `scripts/ai-lite-eval.mjs` now records `palette`, `paletteId`, `density`, `alignment`,
     `sizeScale`, `typography` and `shape` per row. Design parameters, same class as `variantId`
     and `zone`; no brief, no template, no copy. A round that cannot say what a frame was built
     from cannot diagnose the frame — the `warningCodes` lesson, one field over.
   - **The gate that would have caught it was not in Lite's composition. It is now.**
     `validation/structuralIntentCheck.ts` drives every text field to a sentinel and re-reads the
     painted frame, which is precisely "did this field reach the screen" - and it could not run
     here at all: it needs a `StructuralIntent`, Lite runs no intent stage, so
     `withStructuralFindings` returns early on every Lite result. The drive moved to
     `validation/fieldPaint.ts` (one definition, two consumers) and the bench exposes it as the
     opt-in `fieldPaints`, which `liteValidator` and `compileLiteDecision` turn on. A WARNING,
     for the same reason as the other two: a grounded assembly has no repair loop, so refusing
     the result would spend a user's generation on a defect nothing can fix for them.
     **Its honest limit is written into the option:** it reads ONE state, the settled default
     path, so a field a later operator event reveals would read as unpainted. Lite is safe today
     because it ships single-step lower thirds — §1's widening question has to come back to this
     line. Pinned four ways by `e2e/lite-field-paint.spec.ts`, including that the sentinel drive
     restores the default data so the exit, replay and stress phases after it are unchanged.

## 5. What changed in the platform this round

### 5.1 Production ran a weaker gate than the benchmark scored (fixed)

`productionSpxValidator` takes `singleLineFields` and a type-floor category. `compileLiteDecision`
— the benchmark's entry point — passes both. Production did not: the browser builds its injected
validator in `AiStep` long before a decision exists, and both arguments can only be answered from
the decision (the declared line roles, and `spec.category`). So `bench-line-wrap` and
`bench-type-floor` were findings **every round measured and no user ever saw.**

The composition moved to `claudeProvider.liteValidator`, beside the `AssembleOptions` override
that exists for the identical reason. Both findings are warnings, so nothing that used to pass
now fails. Pinned by a fourth case in `e2e/lite-line-fit.spec.ts` that drives the PROVIDER with no
injected validator at all. `docs/AI_LITE_PLAN.md` §6 steps 2 and 3 are closed by it.

### 5.2 `animation.presetId` was not dead — it was emitting invalid values (fixed, and measured)

The 2026-08-07 round measured this field `null` on all 18 generations and the plan called it dead.
v7 measured it **null on 20 of 29 and carrying an illegal value on the other 9** — every one of
them the chosen chassis's own `motion:` digest prose read back (`controlled newsroom reveal` →
`controlled-newsroom-reveal`). `resolveDesign` requires the id to be in `variant.animationPresets`,
so all nine were silently dropped and the design's authored motion shipped. No wrong graphic; a
shown-but-illegal field and a telemetry axis reading as a choice nobody made.

**Deleting the property is not the free fix the plan assumed.** That object is
`additionalProperties: false`, so removing it converts an emission nine of twenty-nine generations
make into a schema **rejection** — `malformed_response`, an attempt burnt out of a budget of two,
and the numeric-enum failure of v7 all over again. The instruction went into the property
**description** instead, where it costs no prompt line and a model that ignores it is still merely
clamped. Prompt version `lite-lower-third-v8`.

**Measured, one variable, same 30 briefs:**

| | v7 | v8 |
|---|---|---|
| generations emitting `presetId` | **9 / 29** (9 illegal) | **0 / 29** |
| machine-usable | 29 / 30 | 29 / 30 |
| provider calls | 32 | **30** (no second attempts at all) |
| cost | $0.0103 | $0.0097 |
| `bench-line-wrap` | 3, same two fixtures | 3, same two fixtures |

Delete the property once a second round confirms zero emissions. That is the staged retirement;
`zone` (bottom-left on 29 of 29, `enum`-constrained) is the same shape and the same argument.

### 5.3 Retiring the dead axes — and the deletion that cost a round

With v8's evidence in hand, both dead axes were deleted in **v9**: `zone` (answered
`bottom-left` on 47 generations out of 47 across the two rounds) and `animation.presetId`
(emissions driven to 0/29 by the description change). The reasoning for `zone` was that the
deletion is output-identical — `variant.create` resolves `options.zone ?? variant.defaultZone`
and all six audited chassis declare `bottom-left`, so an absent zone compiles to exactly what
was being supplied.

**That reasoning was about the compile, and the compile was never the risk.**

**Four rounds, and the series is monotonic in the number of properties deleted** — which is what
makes the attribution clean rather than a story:

| | properties deleted | machine-usable | `malformed_response` | `intent_*` | calls | cost |
|---|---|---|---|---|---|---|
| v7 | 0 | 29/30 | 0 | 1 | 32 | $0.0103 |
| v8 | 0 | 29/30 | 0 | 1 | 30 | $0.0097 |
| **v9** | **2** (`zone`, `presetId`) | **26/30** | **3** | 1 | 33 | $0.0084 |
| **v10** | **1** (`presetId`) | 27/30 | 1 | 2 | 35 | $0.0098 |
| **v11** | **0** | **29/30** | **0** | 1 | 33 | $0.0105 |
| **v12** | 0 (+ §5.4's metadata fix) | **29/30** | **0** | 1 | 30 | $0.0100 |

v7-v11's single `intent_variant_mismatch` is `call-to-action`, the standing failure since the
gateway round; v11 restores v8's result exactly. v12 fixes that fixture and its one remaining
failure is `team-identity` on a different check — §5.4.

The Lite spec object is `additionalProperties: false`. A property the model **still emits**
becomes a schema refusal, a retry, and then a user-visible `generation_failed`. `presetId` was
safe to delete *because v8 had already driven its emission rate to zero*; `zone` was emitted
every single time, which made it the most dangerous property in the schema to remove, not the
safest. The rule had been written into `lite/contract.ts` one edit earlier and was broken in the
same change.

**v10 applied the `presetId` treatment to `zone`:** the field back on the wire with *"omit this
field"* in its description — no prompt line, and a model that ignores it is ignored rather than
refused — while the **compile** stops reading it (Lite assembles with `keepChassisZone`, so
placement is the design's own `defaultZone`). That recovered **two of the three** rejections:
27/30, one `malformed_response` left, plus one new `intent_role_mismatch`.

**v11 stopped deleting anything, and landed back on 29/30 with zero rejections.** v10 still
differed from v8 in two more ways — `presetId` deleted, and the bottom-zone prompt line removed —
and one roll each cannot separate those from sampling, so `presetId` went back under the same
instructed-but-ignored treatment. **Neither dead axis is deleted.** The trade is explicit:
keeping an instructed dead field costs a few output tokens; deleting one the model still emits
costs a refused request and a user's whole generation.

What the exercise DID land, and it is the part worth keeping: **placement moved from the model
to the platform.** `keepChassisZone` is on for Lite, which closes `docs/ADAPT_FIRST_PLAN.md`
§6.2's deferred fold — with no output change, since every audited chassis is drawn bottom-left
and that is what the model was answering anyway.

**The rule, paid for twice: a property under `additionalProperties: false` cannot be deleted
while the model still emits it. Teach it away, measure the emission rate reach zero across more
than one round, then delete — or simply leave it instructed.** Pinned in
`api/_lib/aiLite.test.ts` as a PRESENCE assertion on both fields, so a future tidy-up meets the
reason before it meets the schema.

### 5.4 `call-to-action` was never the model's failure — an intent kind with one home

The standing failure of every round since the gateway one — five of five, `generation_failed`
after both attempts, always `intent_variant_mismatch`. It reads as the model being unable to
satisfy a brief. It is not.

`intentMatchesRoles` forces `kind: 'promotion'` for any `call-to-action` or `social-handle`
line. **`promotion` was declared by exactly one of the six audited chassis:** `lt05 Angle Slab`,
whose own digest entry the model reads as *"forward-leaning condensed sport slab"*, `bestFor`
sports and high-energy segments, `avoidFor` solemn public information. The fixture asks for *"a
concise programme lower third … confident and useful, not salesy."*

So every taste signal in the digest pointed away from the only chassis the contract allowed. The
model chose on taste — correctly — and server semantic validation refused it, twice. **The
contract and the fit metadata pointed in opposite directions, and the contract won by refusing.**

Four more designs now declare `promotion`. `lt32` Scrim does not, for a capacity reason rather
than a taste one: it holds 28 characters on its supporting line, the tightest of the six, and a
call to action plus a URL is the longest copy pair Lite is asked for.

**The guard found a second instance in the same minute it was written.** `api/_lib/aiLite.test.ts`
now refuses any intent kind servable by fewer than two chassis, and `team` was `lt05`-only too.
That one failed more quietly because `intentMatchesRoles` lets a `team-name` line take
`kind: 'person'` as well, and `person` is on every chassis — so `team-identity` came back
intermittently rather than never, which is exactly the signature that gets written off as
sampling. It failed in the gateway round, v9 and v10, and passed in v7, v8 and v11.

**Measured: `call-to-action` passes in v12**, first time in six rounds. 29/30, 30 calls (no
retries), $0.0100, `bench-line-wrap` unchanged at 3.

The generalizable half, and it is this profile's third instance: **a hand-authored fit claim can
be wrong in the direction that refuses work.** `textCapacity`'s adjectives ranked the designs
almost backwards (§1 of the plan); `intentKinds` gave two intent kinds a single home. Neither is
visible in a rendered frame, and neither gate could see it — the round just failed a fixture and
the failure looked like the model's.

**A second trap in the same function, diagnosed and NOT fixed here.** v12's one failure is
`team-identity` on `intent_role_mismatch` — a different check, and one that has been firing
intermittently all along (the gateway round, v9, v10 failed it; v7, v8, v11 passed). The cause is
an ordering bug in `intentMatchesRoles`, which scans the emitted roles in a fixed priority order
and returns on the first hit:

```
person-name → 'person' · story-headline → 'story' · event-name → 'event'
team-name → 'team'|'person' · organization → 'organization'|'person' · CTA/handle → 'promotion'
```

The fixture is *"team name Helsinki Comets and supporting context Women's Championship Final"*,
whose natural emit is roles `['team-name', 'event-name']` with `kind: 'team'`. `event-name` is
tested **before** `team-name`, so the SUPPORTING line decides what the graphic must claim to be:
a team strap with a competition kicker is only legal if it declares itself an `event` graphic.

The fix is one line — judge the kind against the PRIMARY role (`emittedRoles[0]`, which the
schema already pins to `intent.primaryRole`) instead of the first match in an arbitrary order.
It is a semantic-validation change with real teeth, so it wants its own round rather than being
folded into this one.

**Fixed after this round, as `lite-lower-third-v13`.** `intentMatchesRoles` now judges
`emittedRoles[0]` alone; the `intent_role_mismatch` repair message names the first line as the
deciding one, which is why it took a version bump. Pinned both ways in `api/_lib/aiLite.test.ts`
("the FIRST line role decides the intent kind") - a team strap with a competition kicker passes,
and a team-name first line still may not claim `event`. **Re-measured 2026-08-09: 30 of 30, no
rejections, `team-identity` resolved on `lt05` as kind `team` (`ROUND-2026-08-09-V13.md`).**

**One correction to the paragraph above, from the ledger.** "Firing intermittently all along (the
gateway round, v9, v10 failed it; v7, v8, v11 passed)" is the round list for the `team` ONE-HOME
defect, which failed as `intent_variant_mismatch`. Grouped by `prompt_version` and
`rejection_reason`, `ai_generations` carries `intent_role_mismatch` as a FINAL reason on exactly
two generations - **v10 and v12**, both after two attempts. v3, v7, v8, v9 and v11 lost their one
fixture to `intent_variant_mismatch` or `malformed_response`. The ledger stores only the final
reason, so an attempt refused this way and recovered on the retry leaves no row: intermittent
firing stays consistent with the data without being shown by it. What is measured is that it cost
a whole generation twice. **A pass count cannot tell a schema refusal from a semantic one - the
reason column can.**

### 5.5 `.env.example` pointed the fallback at a route the code no longer uses

It still said `AI_LITE_FALLBACK_MODEL=alibaba/qwen3-coder-next` while the code default has been
the primary again since `7d6e4a2a`. An operator copying the example got the configuration the
gateway round measured at 2/4 on the contract. Corrected, with the reason beside it.

## 6. The ledger, verified through the Supabase MCP

- **Migration 0013 (`ai_lite_judge_admission`) IS APPLIED** to `kprolrchuldgfrzspthy` — the note
  saying otherwise is stale. `ai_generations.judge_count` exists. `liteJudgeConfigured` /
  `reserveJudge` are unblocked; the judge stays off for the reasons in plan §4.
- Rows land correctly: `provider: vercel`, `model: google/gemini-2.5-flash-lite`,
  `prompt_version: lite-lower-third-v7` then `v8`, provider cost, tokens, resolved chassis, intent
  kind, and the separate `accepted` outcome event when the wizard creates the project.
- **Before this session, production's ledger had no row after 2026-08-02 and no `vercel` row at
  all.** Every gateway-era generation to date has been run against a local dev server. Production
  Lite has still never served a generation.

## 7. Blocked, and it needs the owner

**A real Lite generation on production could not be made.** Lite's monthly allowance is
identity-bound and the only account that has ever generated is over it:

| | production cap | the test account, rolling 30 days |
|---|---|---|
| starts | 30 | **73** |
| successes | 20 | **46** |

`/api/ai/lite/status` on production answers `enabled: true, available: false, reason: "sign-in"`,
so configuration is fine — the wall is quota, and it does not clear until the 2026-08-02 rows age
out in September. Two one-line unblocks, both on the Vercel project, both the owner's call:

- add the owner's (or the test account's) Supabase user id to `AI_LITE_OVERRIDE_USER_IDS`, which
  is exactly what that variable exists for; or
- raise `AI_LITE_MONTHLY_STARTS` / `AI_LITE_MONTHLY_SUCCESSES` temporarily.

Everything else in this document was measured against a local server using the same gateway
credential, provider allowlist and ZDR policy as production, and writing to the same durable
ledger. What that setup cannot prove is production's own credential path (`VERCEL_OIDC_TOKEN`
rather than `AI_GATEWAY_API_KEY`) and its ZDR plan entitlement.

## 8. Artifacts

- `lite-eval-out/round-2026-08-08-quality/` — 30 × 4 lifecycle frames and a clip per fixture, per
  round, plus `quality-v7-metrics.json` and `quality-v8-metrics.json` (gitignored).
- `lite-eval-out/gallery-v12.html` (the shipping configuration), plus the v11, v8 and v7 galleries — self-contained review pages.
- `lite-eval-out/walk/` — the wizard and control-page screenshots.
- `lite-eval-out/tools/` — the parity walk, the wizard walk, the gallery builder, the probe.

## 9. What this round does not establish

Quality against an alternative. There is still no second arm, no blind review and no judge pass —
one route, measured twice against itself. `29/30 machine-usable` remains a *machine* number; §4 is
the only part of this document that read the pictures, and one reader read them.
