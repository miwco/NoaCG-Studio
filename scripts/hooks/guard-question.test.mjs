// The question guard, verified the way docs/MISTAKE_TRIGGERS.md asks for: real event JSON piped
// into the REAL hook file, reading the exit code and the message. What is pinned: an untagged
// question is refused and the refusal carries the five reasons and the question itself; a
// question tagged with one of the five passes; a mixed batch is refused for the untagged one; any
// other tool, malformed input and an empty batch pass through untouched; and the hook is wired.
import assert from 'node:assert/strict';
import test from 'node:test';

import { runHook, wiringProblem } from './test-lib.mjs';

const HOOK = new URL('./guard-question.mjs', import.meta.url);

const ask = (questions) => ({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', cwd: process.cwd(), tool_input: { questions } });
const q = (question, header = 'Choice') => ({ question, header, options: [{ label: 'a', description: 'a' }, { label: 'b', description: 'b' }], multiSelect: false });

test('an untagged question is refused, and the refusal names the five reasons and the question', () => {
  const { status, message } = runHook(HOOK, ask([q('Should the queue land a caution branch first?')]));
  assert.equal(status, 2);
  assert.match(message, /STOP - is this actually the owner's question/);
  assert.match(message, /\? Should the queue land a caution branch first\?/);
  for (const reason of ['account', 'money', 'identity', 'harness', 'alignment']) assert.match(message, new RegExp(`needs: ${reason}`));
  assert.match(message, /consult to the strongest model/);
});

test('a question that names its reason passes', () => {
  for (const text of [
    'needs: money - buy the Pro tier for the render worker?',
    'Which account should the SMTP sender use? (needs: account)',
    'needs: Alignment - is the scoreboard still the second graphic for 2026-09-12?',
  ]) {
    assert.equal(runHook(HOOK, ask([q(text)])).status, 0, text);
  }
  assert.equal(runHook(HOOK, ask([q('Which?', 'needs: harness')])).status, 0, 'the tag may sit in the header');
});

test('a mixed batch is refused for the untagged question only', () => {
  const { status, message } = runHook(HOOK, ask([q('needs: money - renew the domain?'), q('Which colour for the ticker?')]));
  assert.equal(status, 2);
  assert.match(message, /\? Which colour for the ticker\?/);
  assert.doesNotMatch(message, /\? needs: money/);
});

test('other tools, malformed input and an empty batch pass through', () => {
  assert.equal(runHook(HOOK, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }).status, 0);
  assert.equal(runHook(HOOK, 'not json').status, 0);
  assert.equal(runHook(HOOK, ask([])).status, 0);
  assert.equal(runHook(HOOK, { hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: {} }).status, 0);
});

test('the hook is wired in .claude/settings.json', () => {
  assert.equal(wiringProblem('PreToolUse', 'AskUserQuestion', 'node scripts/hooks/guard-question.mjs'), null);
});
