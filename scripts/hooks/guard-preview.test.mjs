// The preview guard, verified the way docs/MISTAKE_TRIGGERS.md asks for: real event JSON piped
// into the REAL hook file (scripts/hooks/test-lib.mjs), reading the exit code and the message.
//
// The world it needs is a checkout that is a linked worktree and one that is not, and both are
// built as stand-ins in a temp directory: `.git` as a pointer FILE for the linked one, as a
// directory for the primary one. Git cannot place either, so `checkoutRoot` answers null and the
// hook judges the cwd itself - which is also what happens in a real worktree whose cwd is its root.
//
// The must-not-fire list is the longer one, because a false refusal is paid by every session.
//
// Cost: nine node starts, about 0.9 s. The hook runs only on preview_start calls.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runHook, wiringProblem } from './test-lib.mjs';

const HOOK = new URL('./guard-preview.mjs', import.meta.url);
const TOOL = 'mcp__Claude_Browser__preview_start';

const scratch = mkdtempSync(join(tmpdir(), 'guard-preview-'));
const linked = join(scratch, 'linked');
const primary = join(scratch, 'primary');
mkdirSync(linked);
writeFileSync(join(linked, '.git'), 'gitdir: /nowhere/.git/worktrees/linked\n');
mkdirSync(join(primary, '.git'), { recursive: true });
test.after(() => rmSync(scratch, { recursive: true, force: true }));

function call(cwd, tool_input) {
  return { hook_event_name: 'PreToolUse', tool_name: TOOL, cwd, tool_input };
}

test('the guard is actually wired to the tool it judges', () => {
  assert.equal(wiringProblem('PreToolUse', TOOL, 'node scripts/hooks/guard-preview.mjs'), null);
});

test('starting the dev server from a linked worktree is refused, and the message names the way', () => {
  const { status, message } = runHook(HOOK, call(linked, { name: 'dev' }));
  assert.equal(status, 2);
  assert.match(message, /LINKED worktree/);
  assert.match(message, /npm run dev:worktree/);
  assert.match(message, /dev-worktree\.mjs --print/);
  assert.match(message, /navigate \{url\}/);
});

test('opening a URL from a linked worktree is fine - it starts nothing', () => {
  assert.equal(runHook(HOOK, call(linked, { url: 'http://localhost:5202/app' })).status, 0);
  assert.equal(runHook(HOOK, call(linked, { url: 'https://example.com' })).status, 0);
});

test('starting the dev server in the primary checkout is the right door', () => {
  assert.equal(runHook(HOOK, call(primary, { name: 'dev' })).status, 0);
});

test('it fails open on anything it cannot read', () => {
  assert.equal(runHook(HOOK, 'not json').status, 0);
  assert.equal(runHook(HOOK, '').status, 0);
  assert.equal(runHook(HOOK, { tool_name: TOOL, cwd: linked }).status, 0);
  assert.equal(runHook(HOOK, call(join(scratch, 'missing'), { name: 'dev' })).status, 0);
  assert.equal(runHook(HOOK, { tool_name: 'mcp__Claude_Browser__navigate', cwd: linked, tool_input: { name: 'dev' } }).status, 0);
});
