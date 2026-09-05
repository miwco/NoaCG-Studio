// The launch guard, verified the way docs/MISTAKE_TRIGGERS.md asks for: real event JSON piped
// into the REAL hook file, reading the exit code and the message. Nothing is imported from the
// hook, which reads stdin at module top level and would hang. The parser has its own tests in
// wave-plan-check.test.mjs; these cover the plumbing, the message, and the world the hook reads -
// this repository's own tree, so the "exists" cases name files that are really here.
//
// Exit 2 is the blocking code (`deny` in scripts/hooks/lib.mjs); exit 0 is "nothing to say".
// The must-not-fire list is the longer one, because a false refusal blocks every launch.
//
// Cost: ten node starts, about 1 s; a refused launch pays one git call per missing path.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./guard-agent-launch.mjs', import.meta.url));
const SETTINGS = fileURLToPath(new URL('../../.claude/settings.json', import.meta.url));
const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** Pipe one PreToolUse event into the real hook and report what it did. */
function runHook(event) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    encoding: 'utf8',
  });
  return { status: result.status, message: result.stderr ?? '' };
}

function launch(prompt, extra = {}) {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    cwd: REPO,
    tool_input: { description: 'Row R', subagent_type: 'wave-row', prompt, ...extra },
  };
}

/** A wave prompt in the shape the orchestrator hands out, on paths this repository really has. */
const ROW = [
  'SESSION R - triggers that fire',
  'BRANCH claude/r-mistake-triggers',
  'TOUCHES docs/MISTAKE_TRIGGERS.md, scripts/hooks/, .claude/settings.json, docs/backlog/new-thing.md (new)   MINTS scripts/hooks/made-up.mjs',
  'READ   docs/MISTAKE_TRIGGERS.md (especially "Memory: the weakest trigger" - it is the routing rule),',
  '       scripts/hooks/ (guard-command, warn-command and their tests), .claude/settings.json.',
  'DO     1. read scripts/nowhere-at-all.mjs - a DO line is never probed.',
  'QUEUE  write docs/handoffs/2026-09-05-r-thing.md, then /queue-merge.',
].join('\n');

test('the guard is actually wired to the Agent tool', () => {
  const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  const entry = settings.hooks.PreToolUse.find((row) => row.matcher === 'Agent');
  assert.ok(entry, 'no PreToolUse matcher for Agent in .claude/settings.json');
  assert.ok(entry.hooks.some((h) => h.command === 'node scripts/hooks/guard-agent-launch.mjs'));
});

test('a wave prompt whose paths all exist launches', () => {
  const { status, message } = runHook(launch(ROW));
  assert.equal(status, 0, message);
});

test('a TOUCHES entry one letter off is refused, and the entry is quoted back', () => {
  const { status, message } = runHook(launch(ROW.replace('scripts/hooks/,', 'scripts/hoks/,')));
  assert.equal(status, 2);
  assert.match(message, /TOUCHES names scripts\/hoks\//);
  assert.match(message, /\(new\)/); // the way through for a file the row creates
  assert.match(message, /wave-plan-check\.mjs/); // the check this is the second half of
});

test('a wrapped READ line is read to its end', () => {
  const { status, message } = runHook(launch(ROW.replace('.claude/settings.json.', '.claude/setings.json.')));
  assert.equal(status, 2);
  assert.match(message, /READ names \.claude\/setings\.json/);
});

test('a prompt in the `instructions` field is judged the same way', () => {
  const { status } = runHook(launch('', { instructions: 'TOUCHES scripts/hoks/guard.mjs' }));
  assert.equal(status, 2);
});

test('what is not a wave prompt is never read', () => {
  // An Explore brief names folders in prose and has no key lines - the common case, and it must
  // cost nothing and refuse nothing, however many paths it mentions.
  const brief = 'Read every file under docs/nowhere/ and scripts/imaginary/ and report what recurs.';
  assert.equal(runHook(launch(brief)).status, 0);
  // Only TOUCHES and READ are probed. A bad path on any other line is the session's to find.
  assert.equal(runHook(launch('SESSION Q\nDO read scripts/nowhere.mjs\nGATE npm run build')).status, 0);
});

test('a `(new)` entry, a MINTS tail, a bare basename and an absolute path are never refused', () => {
  const prompt = [
    'TOUCHES docs/backlog/not-yet.md (new), settings.json   MINTS scripts/hooks/not-yet.mjs, supabase/migrations/0099_x.sql',
    'READ   C:/somewhere/else/x.md, /tmp/y.md, ~/.claude/settings.json, https://example.com/docs/a.md',
  ].join('\n');
  assert.equal(runHook(launch(prompt)).status, 0);
});

test('it fails open on anything it cannot read', () => {
  assert.equal(runHook('not json').status, 0);
  assert.equal(runHook('').status, 0);
  assert.equal(runHook({ tool_name: 'Agent', cwd: REPO }).status, 0);
  assert.equal(runHook({ tool_name: 'Agent', cwd: REPO, tool_input: { description: 'x' } }).status, 0);
});
