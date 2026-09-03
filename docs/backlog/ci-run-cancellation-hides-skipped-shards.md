# A cancelled CI run can be replaced by one that skips every shard and still reports green

**Filed:** 2026-09-03. **Source:** measurement - hit three times on one branch during the
2026-09-03 wave.

## Why

A push cancels the CI run already in flight and plans a new one from the previous push. When the
second push is small, the replacement run plans only that push, **skips every E2E shard, and still
reports the CI gate as success**. The run that actually covered the change never finished. So the
branch reads green, the check mark is real, and nothing was tested.

Both real verdicts on that branch had to be forced with `gh workflow run ci.yml --ref <branch>`.

The root `AGENTS.md` verification rule 4 already warns about exactly this, in prose, and tells the
reader to run `gh run view <id> --json jobs` and read WHICH jobs ran. **It fired three times anyway,
on a session that had read it.** That is the definition of a rule that needs a shape rather than a
sentence: the cost of following it is a manual step at the one moment a session is most confident
it is finished, and the failure is silent and looks exactly like success.

This is not a CI reliability problem. The pipeline behaves as configured. The problem is that the
only thing standing between a session and a false green is a human remembering to look.

## What it would take

Not designed here, deliberately - what matters is that the answer MEASURES which jobs ran rather
than telling a person to check. Rough shape of the candidates:

- A script that takes a branch or sha and answers one question: did a run covering THIS commit
  execute the shards, or did it skip them? Something `/queue-merge` and the landing queue can call,
  so a run that skipped its shards cannot be mistaken for a verdict.
- Or a workflow-side change so a run that plans no shards does not report the gate as success.

Either way the verdict becomes a value a machine reads, not a judgement a tired session makes.

## Evidence

- Branch `claude/c-consent-over-dialog`, 2026-09-03: three cancelled runs, one of which reported
  the CI gate green having skipped every E2E shard. Both real verdicts came from
  `gh workflow run ci.yml --ref <branch>`.
- Root `AGENTS.md`, "Verifying changes" rule 4, and `docs/VERIFICATION.md` - the prose that already
  says this and did not prevent it.
