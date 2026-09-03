// The chip guard, verified the way `docs/MISTAKE_TRIGGERS.md` asks for: real event JSON piped into
// the REAL hook file, reading the exit code and the message it prints. Nothing is imported from the
// hook - it reads stdin at module top level, so importing it would hang - and spawning it is the
// better test anyway, because it covers the stdin plumbing and the message a session actually sees
// rather than a pure function the hook might never reach.
//
// Exit 2 is the blocking code (`deny` in scripts/hooks/lib.mjs); exit 0 is "nothing to say".
//
// The must-not-fire list is the longer one on purpose. A false refusal here is paid by every
// session on the machine, repeatedly, while the mistake it prevents was paid once.
//
// Cost: seven node starts, about 0.6 s in total. It is a chip call, so nothing runs per shell
// command and nothing here touches git or the filesystem.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./spawn-task-guard.mjs', import.meta.url));
const TOOL = 'mcp__ccd_session__spawn_task';

/** Pipe one PreToolUse event into the real hook and report what it did. */
function runHook(event, env = {}) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    encoding: 'utf8',
    env: { ...process.env, NOACG_ALLOW_TASK_CHIPS: '', ...env },
  });
  return { status: result.status, message: result.stderr ?? '' };
}

/** The shape a session actually sends when it spots something in passing. */
function chip(fields = {}) {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: TOOL,
    cwd: process.cwd(),
    tool_input: {
      title: 'Remove the stale docs badge',
      tldr: 'Noticed while editing the README that the CI badge points at a deleted workflow.',
      prompt: 'The README badge in docs/README.md points at a workflow that no longer exists. Fix it.',
      ...fields,
    },
  };
}

test('an ordinary noticed-defect chip is refused', () => {
  const { status, message } = runHook(chip());
  assert.equal(status, 2);
  assert.match(message, /STARTED, not offered/);
});

test('the refusal names both routes and the escape, for a session that has read nothing', () => {
  const { message } = runHook(chip());
  assert.match(message, /IN SCOPE/); // fix it here
  assert.match(message, /docs\/backlog\/<slug>\.md/); // or file it
  assert.match(message, /docs\/backlog\/README\.md/); // and where the shape is written down
  assert.match(message, /OWNER-DECISION: <why this start is his call/); // the legal way through
  assert.match(message, /launch\.md/); // the contract this enforces
});

test('prose about the owner deciding is not the declaration', () => {
  // The marker is exact on purpose. "I think Mirko should decide this" is the very habit the
  // guard exists to stop, so it must not read as a carve-out.
  const { status } = runHook(
    chip({ prompt: 'This is really an owner decision about scope, so I am handing it over.' }),
  );
  assert.equal(status, 2);
});

test('a declared owner decision passes', () => {
  const { status, message } = runHook(
    chip({
      prompt:
        'Pick the hosted-tier price point.\n\nOWNER-DECISION: two pricing shapes, and either one costs real money.',
    }),
  );
  assert.equal(status, 0);
  assert.equal(message, '');
});

test('the declaration is accepted in the tldr as well as the prompt', () => {
  // Refusing a correct declaration that sits one field away buys nothing and costs a false
  // refusal, which is the expensive direction.
  const { status } = runHook(
    chip({ tldr: 'OWNER-DECISION: needs a Fable-tier model pick worth his judgement.' }),
  );
  assert.equal(status, 0);
});

test('a bare marker with no reason is refused, and says why', () => {
  const { status, message } = runHook(chip({ prompt: 'Do the thing.\nOWNER-DECISION:' }));
  assert.equal(status, 2);
  assert.match(message, /needs a reason on the same line/);
});

test('a reason on the NEXT line does not count as one', () => {
  // Without the space-but-not-newline class in the pattern, the following line would be swallowed
  // as a justification and every empty marker would pass.
  const { status, message } = runHook(
    chip({ prompt: 'OWNER-DECISION:\nreal money, probably, I did not check.' }),
  );
  assert.equal(status, 2);
  assert.match(message, /needs a reason on the same line/);
});

test('the machine-wide override turns it off', () => {
  const { status } = runHook(chip(), { NOACG_ALLOW_TASK_CHIPS: '1' });
  assert.equal(status, 0);
});

test('it fails open on anything it cannot read', () => {
  // A hook that cannot tell must not refuse. Malformed input, another tool the matcher happened
  // to catch, and an event carrying no arguments at all.
  assert.equal(runHook('not json at all').status, 0);
  assert.equal(runHook('').status, 0);
  assert.equal(runHook({ tool_name: 'mcp__ccd_session__dismiss_task', tool_input: {} }).status, 0);
  assert.equal(runHook({ tool_name: 'Edit', tool_input: { file_path: 'src/app.ts' } }).status, 0);
  assert.equal(runHook({ hook_event_name: 'PreToolUse', tool_name: TOOL }).status, 0);
});
