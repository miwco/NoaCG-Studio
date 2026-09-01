// Shared plumbing for the Claude Code hooks in this directory. Each hook is a small Node
// script wired up in .claude/settings.json: Claude Code pipes one JSON event to stdin and
// the script either exits 0 (allow / nothing to say) or exits 2 via deny(), which blocks
// the tool call (PreToolUse) or surfaces the message as feedback (PostToolUse).
//
// Hooks run with cwd = the checkout root, so relative paths resolve per-worktree.

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
  process.stderr.write(message.trimEnd() + '\n');
  process.exit(2);
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
  process.stderr.write(message.trimEnd() + '\n');
  process.exit(2);
}
