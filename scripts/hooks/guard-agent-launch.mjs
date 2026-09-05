// PreToolUse guard for the Agent tool: a launch whose prompt names, on its TOUCHES or READ line,
// a path that does not exist is refused, with the offending entries quoted back.
//
// WHY A HOOK. On 2026-09-01 a row was launched on a plausible path nobody had grepped - the
// prompt named the images step beside the SVG drop zone - and ran on it ("the row that named the
// wrong step", .agent-workflows/orchestrator/incidents.md). On 2026-09-05 dictation lost a letter
// and a row's TOUCHES line went to the wrong file (docs/handoffs/2026-09-05-i-offer-nothing-dead.md).
// `scripts/wave-plan-check.mjs` checks the PLAN's table for exactly this and both prompts were
// wrong anyway: the plan is one file and the prompt a session is handed is another, edited after
// the check or launched by hand. TOUCHES is also what the collision pass reasons from, so two rows
// called disjoint on a path that does not exist were never analysed at all. The launch is the last
// moment the path can be caught before a session spends its first half hour on it.
//
// EXACT, so it refuses (docs/MISTAKE_TRIGGERS.md "Refuse or warn"): a relative path with a
// separator that exists neither in the launching checkout nor on `origin/main`. The second look is
// for a launcher whose own tree is behind main, which must not refuse a file main has. `(new)`
// exempts an entry, as in the plan check; MINTS names what the row creates and is cut off the
// TOUCHES line; a bare basename, an absolute path, `~` and a URL are never probed -
// `promptPathProblems` in scripts/wave-plan-check.mjs says why each. A prompt with no TOUCHES or
// READ line is not a wave prompt and is never read, so an ordinary Explore brief costs nothing.
//
// FAILS OPEN on anything it cannot read: no input, no prompt, no cwd. A git look-up failing is not
// "cannot read" - the filesystem answered, and that answer stands.
//
// COST. On a prompt without key lines, node starting up. On a wave prompt, one `existsSync` per
// path named and one git call per path missing locally, which is the rare case.
//
// NOTHING IS EXPORTED. A hook reads stdin at module top level, so importing one to test it hangs;
// guard-agent-launch.test.mjs spawns this file with real event JSON, and the parser it relies on
// is tested where it lives, in wave-plan-check.test.mjs.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readHookInput, deny, gitOutput } from './lib.mjs';
import { promptPathProblems } from '../wave-plan-check.mjs';

const input = await readHookInput();
if (!input || !input.tool_input || typeof input.tool_input !== 'object') process.exit(0);

// The prompt is the field the Agent tool carries the task in; `instructions` is read too, for a
// launch shape that puts the row there.
const text = [input.tool_input.prompt, input.tool_input.instructions]
  .filter((field) => typeof field === 'string')
  .join('\n');
if (!text) process.exit(0);

const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
const exists = (rel) =>
  existsSync(resolve(cwd, rel)) || gitOutput(cwd, ['cat-file', '-e', `origin/main:${rel}`]) !== null;

const problems = promptPathProblems(text, exists);
if (problems.length === 0) process.exit(0);

const named = [...new Set(problems.map((p) => `  ${p.key} names ${p.token}`))].join('\n');
deny(
  'Blocked: this Agent launch names a path that does not exist, and the row would start on it:\n' +
    `${named}\n` +
    `Neither the launching checkout (${cwd}) nor origin/main has it. A row launched on a plausible ` +
    'path runs on it: on 2026-09-01 a prompt named the images step beside the SVG drop zone and ' +
    'nobody had grepped ("the row that named the wrong step", .agent-workflows/orchestrator/' +
    "incidents.md); on 2026-09-05 dictation lost a letter and sent a row's TOUCHES to the wrong " +
    "file. `node scripts/wave-plan-check.mjs` checks the plan's table; this is the prompt itself, " +
    'which is what the session will read.\n' +
    'Fix the path (grep for the basename - the right name is usually a letter away), or mark the ' +
    'entry `(new)` if the row creates it, then launch again.\n' +
    'Guard: scripts/hooks/guard-agent-launch.mjs.',
);
