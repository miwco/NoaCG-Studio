# Lite fallback route - benchmark proposal

**2026-08-02. Stage 0 and Stage 1 have RUN - see sections 9 and 10. Total spend $0.01043.**
The proposal below is preserved as written, before the run, so the prediction in section 2
can be read against the result in section 10 (`docs/AI_LITE_PROMOTION.md`: the benchmark
recommends, only the owner promotes).

## 1. What the fallback is, and when it matters

`AI_LITE_FALLBACK_PROVIDER` / `AI_LITE_FALLBACK_MODEL`, default
`openrouter:qwen/qwen3-coder-next` (`api/_lib/aiLiteProfile.ts`). It answers a Lite design-spec
call only when the primary (`google/gemini-2.5-flash-lite`) does not. So the question this bench
has to settle is narrow: **when the fallback is the one answering, does a usable graphic come
out?** Taste is the primary's job; the fallback's job is not to leave a person with nothing.

Changing it is one environment edit, no code, revertible in a minute. That keeps the stakes of
being wrong low - and is also why this proposal argues for spending very little.

## 2. What the ledger actually says - including where it contradicts the premise

Everything in `ai_generations` on production, read 2026-08-02. **43 rows, all written on
2026-07-27, all from one account** (`synctest1@gmail.com`, an internal test account - see the
internal-account exclusion work landing alongside this). This is a controlled comparison run,
not production traffic: the arms are sequential and the prompt version changes between them.

| Prompt version | Model | usable | failed | declined | attempts | repairs |
|---|---|---|---:|---:|---:|---:|
| `lite-v1` | `google/gemini-2.5-flash-lite` (primary) | 9 | 0 | 0 | 10 | 1 |
| `lite-v1` | `qwen/qwen3-coder-next` | 6 | 1 | 0 | 8 | 1 |
| `lite-v1` | `mistralai/mistral-small-2603` | 2 | 0 | 7 | 9 | 0 |
| `lite-lower-third-v2` | `qwen/qwen3-coder-next` | 0 | **7** | 0 | 14 | 7 |
| `lite-v1` | *(no model recorded)* | 0 | 11 | 0 | 0 | 0 |

Three things follow, and two of them cut against the premise that the failures are
concentrated on the fallback route:

**a. Under `lite-v1` the fallback was fine** - 6 of 7 usable, one
`ai_category_variant_mismatch`. The whole failure cluster sits in the second, `lite-v2` run.

**b. Most of that cluster is not model-attributable.** Its seven failures split
4 × `internal`, 2 × `secondary_role_mismatch`, 1 × `ledger_update`. `internal` and
`ledger_update` are written by `internalFailureCode()` in `api/_lib/lite/generations.ts` for an
*unexpected server exception* and a *failed ledger write* - our side, not the model's. Only the
two `secondary_role_mismatch` rows (and the one v1 mismatch) are semantic rejections the model
earned. **Four unexplained server exceptions on one arm is a bug hypothesis, not a model
verdict**, and buying a model comparison to answer it would be buying the wrong measurement.

**c. Every row predates the shipping prompt.** Production runs `lite-lower-third-v3`
(`liteProfile()`); the ledger holds only `lite-v1` and `lite-lower-third-v2`. v3 was the change
that restated the strap contract as shape rather than prohibition, and `src/ai/AGENTS.md`
records that the framing change *halved* a skin emission rate - a prompt change on this project
has moved a rate before. **There is no evidence at all about this fallback under the prompt it
is actually serving.**

The 11 model-less rows are the reservation ceilings migration `0026` already corrected for
(9 × `provider_rejected`, 2 × `malformed_response`); they carry $0.077 of the $0.091 that used
to be reported as spend and are not evidence about any route.

## 3. Candidates

All four are already in `APPROVED_MODEL_CATALOG`, which is a precondition: `taskConfigured()`
fails closed on an uncatalogued free-tier route, so a candidate cannot be measured from outside
the list. ZDR endpoints verified live 2026-08-02 against
`GET https://openrouter.ai/api/v1/endpoints/zdr` (free, no tokens - see
`docs/MODEL_ROUTE_AUDITS.md` for the method).

| Route | Role | Audited price /M (in/out) | ZDR endpoints today | Why it is here |
|---|---|---|---|---|
| `qwen/qwen3-coder-next` | **control** | $0.11 / $0.80 | Novita fp8, Ionstream fp8, Parasail bf16 | the incumbent; a comparison without it is not one |
| `qwen/qwen3-30b-a3b-instruct-2507` | candidate A | $0.05 / $0.20 | Nebius fp8, SiliconFlow fp8, **CoreWeave bf16** | leader of the 2026-07-29 round - the only 24/24 machine-usable arm against 22/24 for the incumbent |
| `openai/gpt-oss-20b` | candidate B | $0.03 / $0.14 | DeepInfra bf16 (+10 more) | cheapest catalogued candidate with a declared-precision ZDR endpoint |
| `google/gemma-3-12b-it` | reserve | $0.05 / $0.15 | DeepInfra bf16 | catalogued, but beaten by candidate A everywhere in the creative round - listed so its absence is a choice, not an oversight |

**Candidate A closes its own open caveat.** The catalog note says its 24/24 result was measured
on a StreamLake endpoint that does not report quantization, "so re-pin to a declared-precision
endpoint before any promotion rests on it". CoreWeave now serves it at **bf16** under ZDR, so
the re-pin is available and this round can be run on it.

**A price to re-audit before, not after, promoting.** The catalog snapshot for candidate A is
$0.05/$0.20; its live ZDR endpoints quote $0.09-$0.10 in and $0.30 out. Both still clear
`FUNDED_ROUTE_PRICE_CEILING` ($1.00/$5.00) by a wide margin, so nothing is blocked - but
`fundedModelRoute()` prices against the catalog snapshot when no override is set, and a
promotion resting on a two-times-stale figure would understate cost. Refresh the entry in the
promotion change.

## 4. Scope - the smallest thing that answers the question

Two stages, and **stage 2 may well turn out to be unnecessary**.

### Stage 0 - free, run first, no tokens

1. `npm run bench:preflight -- qwen/qwen3-coder-next,qwen/qwen3-30b-a3b-instruct-2507,openai/gpt-oss-20b`
   Refuses a plan whose arms are overridden by a saved route, missing from the catalog,
   unconfigured, or not pairwise distinct. `docs/AI_LITE_PROMOTION.md` requires it every time
   and it reaches no network.
2. Read `internalFailureCode()`'s four exception paths against the `lite-v2` arm's shape. The
   four `internal` rows are the single largest failure bucket in the whole ledger and we do not
   know what they were. Vercel log retention has long since passed them, so the only way to
   learn is to reproduce.

### Stage 1 - the control arm alone, under the shipping prompt

**30 fixtures, one arm, `lite-lower-third-v3`.** This is the measurement the ledger is actually
missing. Two outcomes:

- **Clean** (machine-usable rate in the 85-100% band, no `internal` failures): the premise does
  not hold, the fallback is fine, and stage 2 is cancelled. Total spend ≈ two cents.
- **Not clean**: we now have a v3 baseline and a reproduced failure signature, and stage 2 has
  something to beat.

### Stage 2 - the comparison, only if stage 1 warrants it

**Two candidate arms × the same 30 fixtures**, same prompt version, same fixture set, same
compile path (`lite/pipeline.ts` - the runners and production share it by construction). Arms are
served by restarting the dev server with the candidate route injected; the runner cannot ask the
server which model it holds, which is exactly why the preflight is mandatory.

30 fixtures is `LITE_LOWER_THIRD_FIXTURES` in full (`scripts/ai-lite-lower-third-fixtures.mjs`,
version 2). Not fewer: at n=7 per arm the last round produced a 0% and an 86% result for the
same model and neither number meant anything.

## 5. Cost

Measured from the ledger rather than estimated: the 2026-07-27 run cost **$0.00039 per
generation** for the primary and **$0.00053** for the fallback arm, repairs included.

| | Calls | Expected | Notes |
|---|---:|---:|---|
| Stage 0 | 0 | **$0.00** | reaches no network |
| Stage 1 (control, 30 fixtures) | ~30-45 | **≈ $0.02** | repairs counted at the observed 2-attempts-per-row worst case |
| Stage 2 (2 arms × 30) | ~60-90 | **≈ $0.05** | |
| **Total if both stages run** | ~135 | **≈ $0.07** | |

**Strict maximum: $1.50 for the whole exercise**, enforced by the runner rather than by
intention. `scripts/ai-lite-eval.mjs` hard-stops at 40 provider calls and
`NOACG_LITE_EVAL_MAX_COST_USD` per run (default $1.50, floor $0.01). Each arm will be run with
`NOACG_LITE_EVAL_MAX_COST_USD=0.50`, so three arms cannot exceed $1.50 even if every call
somehow cost twenty times the observed figure. If a run trips its ceiling it aborts, and that
is a finding to report, not a budget to raise mid-round.

This is roughly two orders of magnitude cheaper than the creative round ($0.92) and is stated
that plainly because the honest recommendation below depends on it.

## 6. What is compared

From the existing report machinery (`npm run bench:report`), nothing new instrumented:

| Metric | Why |
|---|---|
| **Machine-usable rate** | the fallback's actual job |
| **Repair rate** (repairs / attempts) | a route that only passes after two repairs is fragile, and repair is spend |
| **Failure categories, split model vs platform** | the correction from §2b, made structural: `internal`, `ledger_*`, `provider_rejected` and `malformed_response` are OURS and must never be attributed to a candidate |
| **Decline rate** (`unsupported`) | the guardrail firing, never a failure (`docs/ADMIN.md` §8). `mistral-small-2603` declined 7 of 9 on the same briefs the others answered - an over-declining route is unusable in a different way, and only this column shows it |
| **Cost per accepted result** | the ranking key in `docs/AI_LITE_PROMOTION.md`, against the $0.01 Lite ceiling |
| **Latency** | the fallback fires after the primary has already failed, so the user has waited once already |
| **Blind human review of accepted results** | the only quality authority here. The vision judge stays out of the decision: `benchmarks/creative` measured judge-versus-reviewer agreement at 3 of 6 - chance - with broken axes |

## 7. What would justify changing the fallback

All three, or no change:

1. **No regression in machine-usable rate** against the control, on the same fixtures and the
   same prompt version, with no failure category the control did not also produce.
2. **A material improvement in at least one of** repair rate, cost per accepted result, or
   latency - "material" meaning larger than the spread between the two control-arm results
   already in the ledger, which is wide.
3. **Blind human review shows no regression** on the accepted results.

And the honest inverse, stated so it is a real possible outcome rather than a formality: **if
stage 1 comes back clean, the correct action is to change nothing and spend nothing further.**
The current fallback has never been measured under the current prompt, and the reading that it
is failing rests on seven rows, five of which our own code wrote about itself.

## 8. The exact commands

Nothing below runs without an explicit go-ahead.

Free, always first:

```bash
npm run bench:preflight -- qwen/qwen3-coder-next,qwen/qwen3-30b-a3b-instruct-2507,openai/gpt-oss-20b
```

Stage 1 - **spends real money (≈ $0.02, capped at $0.50)**. The dev server must already be
running with `AI_LITE_FALLBACK_MODEL=qwen/qwen3-coder-next` served as the arm, and
`NOACG_LITE_EVAL_BEARER_TOKEN` must hold a real signed-in token:

```bash
NOACG_LITE_EVAL_MAX_COST_USD=0.50 NOACG_LITE_EVAL_BEARER_TOKEN=$TOKEN node scripts/ai-lite-eval.mjs ./lite-fallback-out control-v3 30
```

Stage 2, only on a go-ahead after stage 1 - **≈ $0.05, capped at $0.50 per arm**. One server
restart per arm, with the candidate injected as the route under test:

```bash
NOACG_LITE_EVAL_MAX_COST_USD=0.50 NOACG_LITE_EVAL_BEARER_TOKEN=$TOKEN node scripts/ai-lite-eval.mjs ./lite-fallback-out candidate-a 30
```

```bash
NOACG_LITE_EVAL_MAX_COST_USD=0.50 NOACG_LITE_EVAL_BEARER_TOKEN=$TOKEN node scripts/ai-lite-eval.mjs ./lite-fallback-out candidate-b 30
```

Report, free:

```bash
npm run bench:report -- ./lite-fallback-out
```

Output directory `lite-fallback-out/` must be gitignored before the first run - the previous
Lite round left a 418 MB artifact tree.

## 9. Stage 0 result (run 2026-08-02, free)

The preflight ran and **refused**, which is the correct answer from this worktree and separates
cleanly into two kinds of finding.

**The PLAN is sound.** All four arms - the three above plus the incumbent baseline the script
adds itself - resolve to four distinct models, and not one of them raised
`route-not-approved`. So the arms are pairwise distinct and every candidate is already in
`APPROVED_MODEL_CATALOG`, which are the two things the preflight exists to establish before
money is spent.

**The ENVIRONMENT is absent.** All seven blocking problems are configuration, none of them the
plan: no `.env` in this linked worktree, hence no `OPENROUTER_API_KEY`, no `AI_LITE_ENABLED`,
no `AI_LITE_OPENROUTER_PROVIDERS`, and no eval identity to mint a bearer token from.

**Stage 1 therefore cannot run from here as things stand.** It needs the real `.env` present in
this checkout, or the run has to happen in the main checkout. That is the owner's call to make
deliberately - a session copying a secrets file between checkouts on its own initiative is not
a thing that should happen quietly. Nothing has been spent.

## 10. Stage 1 result (run 2026-08-02) - VERDICT: change nothing

```
arm            openrouter:qwen/qwen3-coder-next, endpoint pinned to ionstream (fp8)
prompt         lite-lower-third-v3 (the shipping prompt - the gap this run existed to close)
fixtures       30 of 30 (LITE_LOWER_THIRD_FIXTURES v2, complete - no truncation)
machine-usable 29 / 30  =  96.7%
failures       1  - intent_variant_mismatch
platform fails 0  - no internal, no ledger_*, no provider_rejected
repairs        3 across 33 provider attempts
cost           $0.01043   (cap $0.50, never approached; the 40-call ceiling was not reached)
```

**§7 said this run would justify changing nothing if it came back in the 85-100% band with no
`internal` failures. It did, on both counts. Stage 2 is CANCELLED and the fallback stays
`qwen/qwen3-coder-next`.**

The premise this proposal was written against does not survive contact with the shipping
prompt. §2 predicted that, and the run confirms it:

- The failure cluster was confined to the `lite-lower-third-v2` arm - 0 usable of 7. Under v3
  the same route on 30 fixtures returns 29.
- **The four `internal` failures did not reproduce.** They were the largest single bucket in the
  whole ledger and they were OUR server throwing, not the model failing. Whatever caused them
  was fixed, transient, or specific to that arm; either way the route was not what was broken.
- The one real failure is the right KIND. `intent_variant_mismatch` is a semantic rejection the
  model earned - the platform catching a chassis that did not match the brief's intent facet,
  which is the guardrail working rather than breaking.

Cost per accepted result: **$0.00036** against the $0.01 Lite ceiling, twenty-seven times under
it. Nothing about this route is expensive.

**What this does NOT establish**, because a clean number invites over-reading:

- It is one arm, not a comparison. `qwen/qwen3-30b-a3b-instruct-2507` may still be better; this
  run says only that the incumbent is not broken, which is what §4 set out to learn first.
- Machine-usable is a MACHINE verdict - schema, semantics, compile, static and runtime
  validation. It is not a judgement that 29 graphics look good. The creative round already
  taught that lesson at some expense: structural completeness passed frames a human called
  unusable. Blind human review is still the only quality authority here, and none was run.
- Endpoint-pinned to ionstream fp8, whose $0.11/$0.80 is exactly the catalog's audited snapshot
  (Parasail's bf16 at $0.12 input would have been refused by the policy's own `max_price`). Per
  `docs/AI_LITE_PROMOTION.md`, results from a different endpoint are not interchangeable even
  when the model name matches.

### What it cost to get the run started, which is the reusable part

Four configuration faults stood between a green preflight and a first generation, and every one
of them was caught before a token was spent. Worth recording, because the next person will hit
them too:

1. **`.env` will not source in a shell here.** The file has Windows line endings, so every value
   picks up a trailing `\r`. Sourcing appears to work and every key reads as unset.
2. **`npm run dev:bench` is the wrong server for this bench.** `.env.bench` is a COMMITTED file
   that deliberately blanks the Supabase vars, because the *video* bench needs the app in
   offline mode. The Lite bench needs the opposite. Use plain `dev`.
3. **`IP_HASH_SALT` (>= 16 chars) is required by `liteLedgerConfigured()`**, and its absence
   alone makes `/api/ai/lite/status` answer `not-configured` while every other check is green.
4. **The account's rolling allowance was exhausted** - `monthlyStartsRemaining: 0`, spent by the
   43 July generations against a default cap of 30. Raise `AI_LITE_*_STARTS` on the dev server
   only; the runner's own 40-call and cost ceilings are what actually bound the spend.

One diagnostic trap alongside them: `status.ts` returns `requiresSignIn: requiresSignIn && !user`,
so a *working* token makes it read false. It is not an indicator of `serverAuthConfigured()`
unless the probe is anonymous.

Artifacts (entrance/hold/update/exit frames plus a webm per fixture) are outside the repo at
`C:\claude\noacg-bench-archive\lite-stage1-2026-08-02`.
