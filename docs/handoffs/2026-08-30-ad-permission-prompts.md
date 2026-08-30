# AD - permission prompts in an unattended wave

Branch `claude/ad-permission-prompts`, three commits, queued for landing.

## What landed

**The allowlist moved into the tracked file and grew deliberately.** `.claude/settings.json` now
carries `permissions.allow` alongside the hooks, which are untouched. This is the one deviation
from the prompt's `TOUCHES` note ("the allowlist belongs in settings.local.json unless you can
justify otherwise"), and the justification is mechanical rather than stylistic:

- `.claude/settings.local.json` is gitignored by a `**/.claude/settings.local.json` line in the
  user's **global** git ignore, so it is invisible to the repo's own `.gitignore`.
- `git worktree add` never materialises ignored files. Every existing worktree has a
  byte-identical copy with a frozen mtime of 2026-08-28 19:47, so something in the harness copies
  it at creation time. That is harness behaviour the repo cannot depend on, and it is a SNAPSHOT.
- `scripts/cleanup-worktrees.mjs` lists it under `REGENERABLE_IGNORED` and deletes it with the
  worktree, commented "losing it costs a few re-approvals".

Put together: an approval given inside a worktree, which is where nearly all work happens, is
discarded when that worktree goes. That is the actual reason the list "has grown one entry at a
time in reaction to whatever prompted last" - it is not that nobody bothered, it is that the file
cannot accumulate. The tracked file lands on `main` and reaches every checkout afterwards.
`settings.local.json` was left exactly as it was; nothing was moved out of it.

**`scripts/blocked-sessions.mjs`** (new, read-only) names every session that has been waiting on a
tool call for 30+ minutes, read from the transcripts.

**`.agent-workflows/orchestrator.md`** gained the wave-planning rule (a wave may not depend on a
prompt being answered) and a rewritten watch-loop step 3.

**`docs/AGENT_WORKFLOWS.md`** gained a "Permissions" section holding the reasoning above, so the
next session does not have to rediscover it.

## The correction, which the coordinator also caught independently

The incident in the prompt did not happen. `claude/aa-svg-samples-followups` was not hung: it last
committed at 22:59 UTC and was still running builds at 05:46 UTC, having done a long blocking
review leg, a `main` integration and a full nine-shard suite in between. I found this while trying
to reproduce the block and the coordinator confirmed it from the source mid-session.

Everything written was corrected to say so - the docs, the script header and the owner-queue item
all now state that no wave session has ever been observed hanging on a prompt, and the rule is
framed as a hazard to prevent rather than an incident to remember. Commit `20d16746` is that
correction; commit `031c0c37`'s message still contains the pre-correction framing of the watch
loop, but it describes the misdiagnosis accurately (it never claimed a hang) and history was left
alone rather than rewritten.

**What justifies the rule is the owner's own report** of hitting prompts on his phone, which needs
no incident behind it.

## Entries I REFUSED to add, and why

The test applied to every candidate: could this command, with any arguments matching this pattern,
destroy or exfiltrate something? Prefix patterns are safer than they look across a COMPOUND
command, because each `&&`/`;`/`|` segment must be allowed on its own - but they give no
protection at all against arguments appended within one segment, and that is what sinks most of
these.

- **`Bash(git push *)` and every narrowing of it.** No prefix can exclude `--force`, `--delete`,
  or a second `main` refspec appended to the end. This is the entry I most wanted and the one I am
  most confident about refusing. Note that push did NOT prompt in this session's harness, and the
  transcript scan found no push or `queue:merge` anywhere in the last three days that failed to
  return - so a wave subagent is evidently already permitted to push by whatever mode the harness
  grants. That is a fact about the harness, not about the settings, and it is why the contract
  half matters more than the list.
- **`Bash(npm run queue -- *)` and `Bash(node scripts/jobs.mjs add *)`.** The payload is an
  arbitrary command string that the job runner executes later, unattended. Allowing the wrapper
  allows anything. `jobs.mjs log` / `wait` are allowed instead.
- **`Bash(npm run jobs *)`.** I added this in the first commit and the code review caught it:
  `jobs` aliases `jobs.mjs`, whose dispatcher takes `add` and `add-merge`, so the trailing
  wildcard re-opened the hole above and also let any branch be put in the landing queue - against
  AGENTS.md's "Nobody else queues your branch". Replaced with the read-only forms.
- **`Bash(npm run check:*)`.** Also caught in review: `check:advisors` reads a Supabase management
  token out of `.env` and posts it to `api.supabase.com`. The seventeen local `check:` scripts are
  now listed one by one, so a future one has to be added deliberately.
- **`Bash(node scripts/auto-merge.mjs *)`.** A prefix cannot pin `--dry-run`, and AGENTS.md says
  never to run it directly.
- **`Bash(gh workflow run *)`.** Starts CI, which costs money.
- **`Bash(npm run *)`, `Bash(node *)`, `Bash(npx *)`, `Bash(py *)`, `PowerShell(*)`.** Arbitrary
  execution; `npm run` additionally reaches `bench:*` and `eval:*`, which spend real tokens.
- **`Bash(rm *)`, `Bash(git rm *)`, `Bash(node scripts/cleanup-worktrees.mjs *)`.** Deletion.
- **`Bash(npm run db:push*)`.** Production migrations, which have their own refusal machinery.
- **`mcp__Claude_Browser__computer` / `browser_batch` / `form_input` / `javascript_tool`.** These
  click, type and run scripts in a page; the read-only browser tools are allowed and the acting
  ones are not. `javascript_tool` is the single most-used tool in the whole transcript corpus
  (259 calls), so this refusal is the one that will be felt. It is a daytime tool - UI
  verification is a browser job, browser jobs are one per machine, and the owner is awake for
  them. If it turns out to be worth allowing, the argument is that it is page-scoped with no
  filesystem or credential access; I did not think that argument was strong enough to make
  unattended.
- **`Bash(gh api *)`** is already in `settings.local.json` from before and is wider than I would
  add - `gh api` can POST and DELETE. I did not extend it and did not remove it; flagging it.

## Is there a reliable way to detect a blocked session? Partly, and the limits are written down

**Yes for "is it waiting".** Claude Code appends the tool CALL to the transcript when it is made
and the RESULT when it returns, so a call with no result is a session waiting at that instant.
Subagent transcripts live at
`~/.claude/projects/<project>/<session>/subagents/agent-<worktree>.jsonl`, one file per wave
session, named by its worktree - so the loop can attribute a wait to a wave row.

Two refinements the review forced, both real:

- Reading only the LAST entry is wrong, because this repo tells sessions to batch independent
  calls: if one is held at a prompt and another returns, the file ends on the returned one. The
  script tracks every unresolved call across the tail it reads.
- A new assistant turn clears everything pending before it, since the model could not have
  produced that turn otherwise. Without it, one abandoned call is reported forever.

**No for "why it is waiting".** A permission prompt, a session that died mid-call, and a call
still running are indistinguishable from disk. The 30-minute threshold clears every shell command
(Bash is killed at 600 s) but not a blocking agent fork or a slow MCP call, so a long review leg
legitimately surfaces as "waiting" - which is correct, and is why the script says "waiting" and
never "stuck". Both docs state this limitation explicitly rather than implying a certainty.

Verified live: run against the real transcript tree it found a session in the main checkout that
has been waiting on `cat .agent-workflows/orchestrator.md` since 2026-08-25 - a dead session, four
days old, which nothing had ever reported.

## Verification

`npm run build` green on every commit, with the branch stamp checked
(`dist/version.json -> claude/ad-permission-prompts@...`). CI green with nine real e2e shards on
`031c0c37`; the two later commits touch only settings JSON, markdown and a standalone script that
nothing imports, so their runs plan a small affected set. Code review run at **high**: six
findings, all six fixed in `9b579961`. The simplify leg fans out and could not run here, so it was
skipped rather than faked; the diff is one new script plus doc prose, which is the shape simplify
has least to say about.

## What is left

**The one thing owed to the owner** is in `docs/acceptance/owner-queue/2026-08-30-ad-permission-prompts.md`:
whether Remote Control on his phone actually surfaces these prompts as approvable. No session can
test that. The item gives him a two-minute test (`git push --dry-run` from the phone, which is on
the still-asks list) and says what each outcome would mean. If the phone cannot answer prompts at
all, the still-asks list has to shrink to only things worth being woken for, and the rest need
mechanisms instead of entries.

**A mechanism worth building, not built here.** A `PreToolUse` hook can return
`permissionDecision: "allow"`, which means `scripts/hooks/guard-command.mjs` could parse a
`git push` properly - no `--force`/`--delete`/`--mirror`/`--prune`, no `:` refspec, not `main` -
and pre-approve exactly the safe shape that no text prefix can express. That is the honest answer
to the biggest refusal above, and it is strictly safer than any wildcard. I did not build it
because it changes the permission posture of every session on the machine and deserves its own
row with its own tests, and because this session could not verify the allow-decision path without
risking the exact hang it exists to prevent.
