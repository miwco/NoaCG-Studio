// The preview guard, verified the way docs/MISTAKE_TRIGGERS.md asks for: real event JSON piped
// into the REAL hook file, reading the exit code and the message. Nothing is imported from the
// hook, which reads stdin at module top level and would hang.
//
// The world it needs is a checkout that is a linked worktree and one that is not, and both are
// built as stand-ins in a temp directory: `.git` as a pointer FILE for the linked one, as a
// directory for the primary one. Git cannot place either, so `checkoutRoot` answers null and the
// hook judges the cwd itself - which is also what happens in a real worktree whose cwd is its root.
//
// Exit 2 is the blocking code (`deny` in scripts/hooks/lib.mjs); exit 0 is "nothing to say". The
// must-not-fire list is the longer one, because a false refusal is paid by every session.
//
// Cost: nine node starts, about 0.7 s. The hook runs only on preview_start calls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./guard-preview.mjs', import.meta.url));
const SETTINGS = fileURLToPath(new URL('../../.claude/settings.json', import.meta.url));
const TOOL = 'mcp__Claude_Browser__preview_start';

const scratch = mkdtempSync(join(tmpdir(), 'guard-preview-'));
const linked = join(scratch, 'linked');
const primary = join(scratch, 'primary');
mkdirSync(linked);
writeFileSync(join(linked, '.git'), 'gitdir: /nowhere/.git/worktrees/linked\n');
mkdirSync(join(primary, '.git'), { recursive: true });
test.after(() => rmSync(scratch, { recursive: true, force: true }));

/** Pipe one PreToolUse event into the real hook and report what it did. */
function runHook(event) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    encoding: 'utf8',
  });
  return { status: result.status, message: result.stderr ?? '' };
}

function call(cwd, tool_input) {
  return { hook_event_name: 'PreToolUse', tool_name: TOOL, cwd, tool_input };
}

test('the guard is actually wired to the tool it judges', () => {
  const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  const entry = settings.hooks.PreToolUse.find((row) => row.matcher === TOOL);
  assert.ok(entry, `no PreToolUse matcher for ${TOOL} in .claude/settings.json`);
  assert.ok(entry.hooks.some((h) => h.command === 'node scripts/hooks/guard-preview.mjs'));
});

test('starting the dev server from a linked worktree is refused, and the message names the way', () => {
  const { status, message } = runHook(call(linked, { name: 'dev' }));
  assert.equal(status, 2);
  assert.match(message, /LINKED worktree/);
  assert.match(message, /npm run dev:worktree/);
  assert.match(message, /dev-worktree\.mjs --print/);
  assert.match(message, /navigate \{url\}/);
});

test('opening a URL from a linked worktree is fine - it starts nothing', () => {
  assert.equal(runHook(call(linked, { url: 'http://localhost:5202/app' })).status, 0);
  assert.equal(runHook(call(linked, { url: 'https://example.com' })).status, 0);
});

test('starting the dev server in the primary checkout is the right door', () => {
  assert.equal(runHook(call(primary, { name: 'dev' })).status, 0);
});

test('it fails open on anything it cannot read', () => {
  assert.equal(runHook('not json').status, 0);
  assert.equal(runHook('').status, 0);
  assert.equal(runHook({ tool_name: TOOL, cwd: linked }).status, 0);
  assert.equal(runHook(call(join(scratch, 'missing'), { name: 'dev' })).status, 0);
  assert.equal(runHook({ tool_name: 'mcp__Claude_Browser__navigate', cwd: linked, tool_input: { name: 'dev' } }).status, 0);
});
