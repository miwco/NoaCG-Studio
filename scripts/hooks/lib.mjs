// Shared plumbing for the Claude Code hooks in this directory. Each hook is a small Node
// script wired up in .claude/settings.json: Claude Code pipes one JSON event to stdin and
// the script either exits 0 (allow / nothing to say) or exits 2 via deny(), which blocks
// the tool call (PreToolUse) or surfaces the message as feedback (PostToolUse).
//
// Hooks run with cwd = the checkout root, so relative paths resolve per-worktree.

import { spawnSync } from 'node:child_process';

/** Read the hook event JSON that Claude Code pipes to stdin. */
export async function readHookInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return null; // malformed or empty input - treat as "nothing to check"
  }
}

/** Reject the tool call: print the reason (shown to the agent) and exit with the blocking code. */
export function deny(message) {
  speak(message);
}

/**
 * PostToolUse: tell the agent something about a call that has ALREADY run.
 *
 * The same exit code as `deny`, deliberately. Exit 2 is the ONLY channel that reaches the agent -
 * on PreToolUse a hook can allow a call with a reason, but that reason goes to the user and not
 * to the model, so a PreToolUse "warning" is a warning nobody acts on. After the fact there is
 * nothing left to block, so the same code carries advice instead of a refusal, and this name says
 * which of the two a call site means.
 */
export function warn(message) {
  speak(message);
}

/** The one channel: stderr, then exit 2. */
function speak(message) {
  process.stderr.write(message.trimEnd() + '\n');
  process.exit(2);
}

/**
 * Run git in one checkout and return its stdout, or null when git could not answer.
 *
 * Shared because three hooks here need it and each had grown its own: the guard's staged-file
 * listing, the landing-pin notice's branch and tip, and the migration notice's all-refs traversal.
 * `-C <root>` rather than this process's cwd is the part that matters and the part each copy had
 * to remember - a hook's cwd is wherever Claude Code launched it, which is routinely not the
 * checkout the tool call is about. A failure answers null, so every caller fails OPEN: git itself
 * will complain to the person, and a hook that cannot tell must not refuse.
 */
export function gitOutput(cwd, args) {
  const res = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
  return res.status === 0 && typeof res.stdout === 'string' ? res.stdout : null;
}
