// PreToolUse guard for the preview tools' dev-server door, `mcp__Claude_Browser__preview_start
// {name}`: refused in a LINKED worktree, because it cannot serve one.
//
// WHY A HOOK. The preview tools start the dev server in the checkout that owns the launch
// config and then report a port. From a linked worktree that server is a SIBLING checkout's, on
// a port this worktree never listens on, and the page it serves looks exactly like this branch's
// work - which is what makes the failure silent. Measured 2026-09-01 (docs/DEV_PORTS.md
// "Starting a dev server"); between 2026-09-02 and 2026-09-04 four sessions each spent ten to
// thirty minutes reading a stale page from another checkout as their own
// (docs/handoffs/2026-09-02-b-queue-walks-itself.md, 2026-09-02-g-docs-a-person-wrote.md,
// 2026-09-02-d-leaving-the-wizard.md, 2026-09-02-l-picture-backplate-grows.md). The shell guard
// next door already refuses `npm run dev` with a message naming this trap, and a session reaching
// for preview_start never sees it, because it is not typing a shell command. That is the routing
// rule in docs/MISTAKE_TRIGGERS.md: the call's own arguments plus one stat decide it, the failure
// reports nothing, and the sanctioned alternative can be named.
//
// A REFUSAL, because the check is exact. `.git` is a FILE in a linked worktree and a directory in
// the primary checkout (the test `isWorktree()` in scripts/dev-port.mjs uses), and there is no
// reading of `preview_start {name}` from a linked worktree that serves that worktree. The `{url}`
// form opens a page and starts nothing, so it passes from anywhere - it is how the server that
// `npm run dev:worktree` started gets opened.
//
// FAILS OPEN on anything it cannot read: no input, no `name`, a cwd git cannot place, an
// unreadable `.git`. Cost: nothing measurable - it runs on preview_start calls only, and does one
// git call and one stat.
//
// NOTHING IS EXPORTED. A hook reads stdin at module top level, so importing one to test it hangs;
// guard-preview.test.mjs spawns this file with real event JSON instead.

import { readHookInput, deny, isLinkedWorktree } from './lib.mjs';
import { checkoutRoot } from '../command-target.mjs';

const PREVIEW_TOOL = 'mcp__Claude_Browser__preview_start';

const input = await readHookInput();
if (!input || !input.tool_input || typeof input.tool_input !== 'object') process.exit(0);
// Another tool is a matcher problem, and it stands down only when the event NAMES one - the same
// reasoning as spawn-task-guard.mjs: a missing field must not retire the guard silently.
if (typeof input.tool_name === 'string' && input.tool_name !== PREVIEW_TOOL) process.exit(0);

const { name, url } = input.tool_input;
// `{url}` opens a page. Only `{name}` starts a server, and only that can serve the wrong tree.
if (typeof name !== 'string' || name.length === 0 || typeof url === 'string') process.exit(0);

const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
const root = checkoutRoot(cwd) ?? cwd;
if (!isLinkedWorktree(root)) process.exit(0);

deny(
  `Blocked: preview_start {name: "${name}"} cannot serve this checkout. ${root} is a LINKED ` +
    'worktree, and the preview tools start the dev server in the checkout that owns the launch ' +
    'config, then report a port this worktree never listens on - so the page you would read is a ' +
    "sibling checkout's, and it looks exactly like this branch's work. Measured 2026-09-01 " +
    '(docs/DEV_PORTS.md "Starting a dev server"); it cost four sessions between 2026-09-02 and ' +
    '2026-09-04 ten to thirty minutes each of believing a stale page.\n' +
    "Start THIS worktree's own server instead:\n" +
    '  npm run dev:worktree                    serves this checkout on its reserved port (run it in ' +
    'the background - it holds the shell), and refuses if the port is busy\n' +
    '  node scripts/dev-worktree.mjs --print   shows the URL without starting anything\n' +
    'then open that URL with navigate {url} or preview_start {url}, which are fine from anywhere.\n' +
    'In the PRIMARY checkout preview_start {name} is the right door and is not what this refuses.\n' +
    'Guard: scripts/hooks/guard-preview.mjs.',
);
