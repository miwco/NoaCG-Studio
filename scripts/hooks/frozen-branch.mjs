// A QUEUED BRANCH IS FROZEN. Shared by the commit guard and the edit guard: a checkout whose
// branch has a landing job waiting or running is not a place where anything may change.
//
// WHY. `npm run landing:latency` on 2026-09-05 listed the refusals behind the week's slow
// landings, and two of the kinds were the branch's own session working on after queueing: the
// pin refusal ("has moved since it was queued", three branches) and the dirty tree the gate found
// when it started (the landing ran while a file was still being edited). Both happened to the
// session that built this file, the same afternoon, with `warn-command.mjs` saying so AFTER the
// commit - a warning about a job that was already dead. The owner's read: "the branch gets queued
// and then something writes something new in the same branch. We need a hard rule so it cannot
// happen." This is the rule at the moment it fires: queueing means finished, so until the landing
// is terminal the worktree is read-only, and the one way to change that is to withdraw the job.
//
// EXACT, so it refuses (docs/MISTAKE_TRIGGERS.md): the branch is read from the checkout the
// command or file is in, the job from the store the queue itself writes, and only a LIVE job
// (`waiting` or `running`) freezes anything - a landed, failed or cancelled job frees the branch.
// FAILS OPEN when git or the store cannot answer: a guard that cannot tell must not refuse.
//
// COST. One `git rev-parse` plus a read of the whole job store (about 600 files after a fortnight;
// `pruneJobs` keeps it there): measured 2026-09-05 at 168 ms per edit on this laptop, median of
// five, against about 45 ms for the edit guard alone. Paid on every edit and commit; the price of
// making the two refusal kinds impossible rather than warned about afterwards.

import { gitOutput } from './lib.mjs';

/** The live landing job for the branch checked out at `root`, or null. */
export async function liveLandingFor(root) {
  const branch = gitOutput(root, ['rev-parse', '--abbrev-ref', 'HEAD'])?.trim();
  // A detached HEAD has no branch to have queued, and `main` is never queued for landing.
  if (!branch || branch === 'HEAD' || branch === 'main') return null;
  try {
    const { jobsDir, readJobs, landingStateFor } = await import('../jobs-store.mjs');
    const dir = jobsDir();
    if (!dir) return null;
    const landing = landingStateFor(branch, readJobs(dir));
    return landing.state === 'queued' ? { branch, job: landing.job } : null;
  } catch {
    return null;
  }
}

/** The refusal, for a commit (`what` = 'commit') or an edit (`what` = the file). */
export function frozenMessage({ branch, job, what }) {
  const running = job.state === 'running';
  const act = what === 'commit' ? 'This commit' : `Editing ${what}`;
  return (
    `Blocked: ${branch} is FROZEN - landing job ${job.id} is ${job.state} for it, and ${act.toLowerCase()} ` +
    `would make that job refuse (${running ? 'a dirty tree when its gate looks, or a moved pin' : 'a moved pin, or a dirty tree when its gate starts'}).\n` +
    'Queueing means the work is finished, so a queued branch is read-only until the landing is ' +
    'terminal. On 2026-09-05 this exact sequence cost three landings their pin and one its gate.\n' +
    (running
      ? `Let ${job.id} finish (\`node scripts/jobs.mjs log ${job.id}\` shows where it is). If the branch is on main ` +
        'afterwards, start a NEW branch in a NEW worktree for the next change:\n' +
        '  git worktree add -b <branch> .claude/worktrees/<name> origin/main'
      : 'If the work really is not finished, withdraw the job first, then change and re-queue once, at the true end:\n' +
        `  node scripts/jobs.mjs cancel ${job.id}\n` +
        'Otherwise make the next change on a NEW branch in a NEW worktree:\n' +
        '  git worktree add -b <branch> .claude/worktrees/<name> origin/main')
  );
}
