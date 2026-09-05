// PreToolUse guard for AskUserQuestion: a question to the owner is refused unless it names, in its
// own text, the ONE reason it is his - `needs: account|money|identity|harness|alignment`.
//
// WHY A HOOK. Owner, 2026-09-05 (docs/OWNER_RULINGS.md, owner-decisions-2026-09-05): "you don't
// need me, a flawed human, to make decisions about code design or really anything else. Always
// ask the super intelligent AI what to do. We should never stop working because of a technical or
// design question." And, the same day, on the harness: "Claude Code and Codex have the tendency to
// stop and ask questions. Every time the agent tries to ask a question, it triggers a note that it
// goes through and checks if this is actually something we need to ask the owner about." The ask
// is the moment; this is the note, delivered at that moment, and it refuses rather than warns
// because a PreToolUse warning reaches the user and never the model (scripts/hooks/lib.mjs).
//
// EXACT, so it refuses (docs/MISTAKE_TRIGGERS.md "Refuse or warn"): the four reasons are the ones
// `check-owner-queue.mjs` already accepts for an owner-action item, plus `alignment` - whether the
// plan is still what he wants NoaCG to be, the one thing he kept for the weekly check. A question
// that carries the tag has been through the checklist; one that does not is answered by a consult
// to the strongest model available, decided, and recorded so he can revert it later.
//
// FAILS OPEN on input it cannot read. Nothing is exported: a hook reads stdin at module top level,
// so guard-question.test.mjs spawns this file with real event JSON.

import { deny, readHookInput } from './lib.mjs';

const REASONS = ['account', 'money', 'identity', 'harness', 'alignment'];
const TAG = new RegExp(`\\bneeds:\\s*(${REASONS.join('|')})\\b`, 'i');

const input = await readHookInput();
if (!input || input.tool_name !== 'AskUserQuestion') process.exit(0);

const questions = Array.isArray(input.tool_input?.questions) ? input.tool_input.questions : [];
const untagged = questions.filter((q) => !TAG.test(`${q?.header ?? ''} ${q?.question ?? ''}`));
if (questions.length === 0 || untagged.length === 0) process.exit(0);

deny([
  'STOP - is this actually the owner\'s question? (ruling 2026-09-05: it almost never is)',
  '',
  ...untagged.map((q) => `  ? ${String(q?.question ?? '').slice(0, 140)}`),
  '',
  'He answers exactly five kinds of question, and each one names its reason in the question text:',
  '  needs: account    - a login, a credential, a third-party console only he can reach',
  '  needs: money      - a purchase, a paid tier, anything that costs',
  '  needs: identity   - a public act in his name (a post, an email, a listing)',
  '  needs: harness    - a setting in his Claude/Codex app or machine that no session can change',
  '  needs: alignment  - whether the plan is still what he wants NoaCG to be (weekly, not per row)',
  '',
  'Everything else - a merge conflict, a design choice, which option, when, whether to continue -',
  'is answered by a consult to the strongest model available, then DECIDED and RECORDED where he',
  'can revert it (the handoff, docs/OWNER_RULINGS.md for a rule, an owner-queue item if he should',
  'look later). Then keep working. If it truly is one of the five, ask again with the tag in the',
  'question text.',
].join('\n'));
