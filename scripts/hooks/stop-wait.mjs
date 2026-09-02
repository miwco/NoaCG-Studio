// Stop / SubagentStop hook: a session that ends its turn WAITING on something that cannot wake it
// is told so, at that moment, and continues. The reasoning and the patterns live in
// scripts/stop-wait.mjs (the pure, tested half); this file is the shell around it.
//
// Cost: the message regexes run at every turn end and are microseconds. Git and the job store are
// read only when a wait is declared, which is rare, so an ordinary turn end pays nothing.

import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { readHookInput, warn, gitOutput } from './lib.mjs';
import { decide, declaresWait, lastAssistantText } from '../stop-wait.mjs';

const input = await readHookInput();
if (!input || input.stop_hook_active === true) process.exit(0);

function readTail(file, bytes) {
  const size = statSync(file).size;
  const length = Math.min(size, bytes);
  const buffer = Buffer.alloc(length);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, buffer, 0, length, size - length);
  } finally {
    closeSync(fd);
  }
  return buffer.toString('utf8');
}

const text =
  typeof input.last_assistant_message === 'string'
    ? input.last_assistant_message
    : typeof input.transcript_path === 'string'
      ? lastAssistantText(input.transcript_path, { readTail })
      : null;

if (!declaresWait(text)) process.exit(0);

// Only now is anything expensive touched: the branch this session sits on, and whether the
// queue already holds it - a queued or landed branch needs nobody awake.
let landingState = null;
try {
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const branch = gitOutput(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])?.trim();
  if (branch && branch !== 'HEAD') {
    const { jobsDir, readJobs, landingStateFor } = await import('../jobs-store.mjs');
    const dir = jobsDir(); // the job store is per git common dir, shared by every worktree
    if (dir) landingState = landingStateFor(branch, readJobs(dir)).state;
  }
} catch {
  landingState = null; // fail open on the facts, never on the message
}

const message = decide({ text, stopHookActive: false, landingState });
if (message) warn(message);
process.exit(0);
