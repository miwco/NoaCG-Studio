---
kind: owner-action
date: 2026-09-03
---
# Antigravity has not decayed to old GPT models - the Gemini pool has eleven

**Why you are reading this.** You have been routing on the belief that Antigravity is down to old
GPT models and Opus 4.6. That is right about one pool and wrong about the other, and routing off a
false premise sends work to the wrong worker for weeks before anything says so.

**Measured 2026-09-03, `agy models` on agy 1.1.25.** Fourteen models:

- **The Gemini pool: eleven**, across four generations - `gemini-3.8-flash` (high/medium/low),
  `3.7-flash` (high/medium/low), `3.6-flash` (high/medium/low), and `3.1-pro` (high/low). This is
  the broad pool, and it is not shrinking.
- **The Claude/GPT pool: three** - `claude-sonnet-4-6`, `claude-opus-4-6-thinking`,
  `gpt-oss-120b-medium`. Here your impression was exactly right. It still bills its own allowance,
  which is the whole reason to keep sending it work.

**The one that surprised me.** `gemini-3.8-flash` now exists, a generation above the
`gemini-3.7-flash-high` you ruled for on 2026-08-30. So I re-tested them head to head on a
cross-file comprehension question over nine files. **Both got every part right. 3.7 took 16.9 s;
3.8 took 89.7 s** - 5.3x slower, for an identical answer. Your ruling stands and I changed nothing.
The newer model being the better one turned out to be a habit rather than a measurement.

## See it in under a minute

```bash
agy models
```

That is the whole check. The dated inventory, the meter each model bills, and the 3.8-vs-3.7
numbers are in `docs/HARNESS_ROUTING.md` under "The Antigravity model inventory, measured
2026-09-03"; the pool table in `.agent-workflows/orchestrator/routing.md` now says which of the two
pools is the broad one.

**Nothing needs deciding.** This is a correction to carry into the next wave you route, not a
change waiting on you.
