import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  applyPlan,
  applySelf,
  assess,
  assessSelf,
  assessmentRisks,
} from './cleanup-worktrees.mjs';
import {
  createTemporaryWorktree,
  isTemporaryWorktree,
  planPreconditions,
  planTemporaryWorktree,
  planTemporaryWorktreeRemoval,
  removeTemporaryWorktree,
  temporaryWorktreeName,
} from './auto-merge.mjs';
import { assessReattach } from './reattach-main.mjs';
import { overlapping, scanActivity } from './worktree-activity.mjs';
import {
  inspectLeftoverFolders,
  normalize,
  sweepEmptyLeftoverFolders,
  worktreeRoots,
} from './worktree-cleanup-lib.mjs';

function runGit(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(
    result.status,
    0,
    `git ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
  );
  return result.stdout.trim();
}

function makeRepo(t) {
  const root = mkdtempSync(join(tmpdir(), 'noacg-worktree-safety-'));
  const origin = join(root, 'origin.git');
  const primary = join(root, 'repo');
  runGit(root, 'init', '--bare', '--initial-branch=main', origin);
  runGit(root, 'clone', origin, primary);
  runGit(primary, 'config', 'user.name', 'Safety Tests');
  runGit(primary, 'config', 'user.email', 'safety-tests@example.invalid');
  writeFileSync(join(primary, 'README.md'), 'initial\n');
  runGit(primary, 'add', 'README.md');
  runGit(primary, 'commit', '-m', 'Initial commit');
  runGit(primary, 'push', '-u', 'origin', 'main');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { origin, primary, root };
}

function addWorktree(primary, name, prefix = 'codex') {
  const branch = `${prefix}/${name}`;
  const path = join(primary, '.claude', 'worktrees', name);
  mkdirSync(join(primary, '.claude', 'worktrees'), { recursive: true });
  runGit(primary, 'worktree', 'add', '-b', branch, path, 'main');
  return { branch, path };
}

function commitInWorktree(worktree, message = 'Feature commit') {
  writeFileSync(join(worktree, 'feature.txt'), `${message}\n`);
  runGit(worktree, 'add', 'feature.txt');
  runGit(worktree, 'commit', '-m', message);
}

// --- The landing's temporary worktree --------------------------------------------------------
//
// A closed session leaves its branch behind with no worktree, and the queue used to refuse those
// outright - so finished work could never land, and the outstanding listing called it "not
// queued". The carve-out the human flow always had is now the unattended one's too, and it is a
// carve-out precisely because of what it must never do: touch a path it did not create, or force.

test('a branch with no worktree is landed through a temporary one, not refused', () => {
  const plan = planPreconditions({
    branch: 'claude/left-behind',
    mainWorktree: '/wt/main',
    branchWorktree: null,
    temporaryWorktreeBase: '/repo/.claude/worktrees',
  });

  assert.equal(plan.action, 'proceed');
  assert.equal(plan.temporaryWorktree.action, 'create');
  assert.match(plan.temporaryWorktree.path, /auto-merge-tmp-claude-left-behind$/);
  assert.equal(temporaryWorktreeName('claude/left-behind'), 'auto-merge-tmp-claude-left-behind');
});

test('the carve-out fails closed: no base, or a path already taken, is still a refusal', () => {
  const noBase = planPreconditions({ branch: 'claude/x', mainWorktree: '/wt/main', branchWorktree: null });
  assert.equal(noBase.action, 'refuse');
  assert.match(noBase.message, /no place was given/);

  const taken = planPreconditions({
    branch: 'claude/x',
    mainWorktree: '/wt/main',
    branchWorktree: null,
    temporaryWorktreeBase: '/repo/.claude/worktrees',
    pathExists: () => true,
  });
  assert.equal(taken.action, 'refuse');
  assert.match(taken.message, /already taken/);
});

test('removal touches the exact path this run created, and never forces', () => {
  const created = { path: '/repo/.claude/worktrees/auto-merge-tmp-claude-x', branch: 'claude/x' };

  const ok = planTemporaryWorktreeRemoval(created, created.path);
  assert.deepEqual(ok, { action: 'remove', args: ['worktree', 'remove', created.path] });
  assert.equal(ok.args.includes('--force'), false, 'an unattended run never forces a removal');

  const elsewhere = planTemporaryWorktreeRemoval(created, '/repo/.claude/worktrees/somebody-elses-session');
  assert.equal(elsewhere.action, 'refuse');
  assert.match(elsewhere.message, /removes only that/);

  assert.equal(planTemporaryWorktreeRemoval(null, '/anything').action, 'skip');
});

test('a leftover temporary worktree is recognised as this run\'s own, not somebody\'s session', () => {
  // A landing killed at its cap runs no cleanup, so its worktree is still registered next time.
  // Recognising it is what keeps one timeout from retiring the branch from the queue for ever.
  assert.equal(
    isTemporaryWorktree('C:/repo/.claude/worktrees/auto-merge-tmp-claude-x', 'claude/x'),
    true,
  );
  assert.equal(isTemporaryWorktree('C:/repo/.claude/worktrees/x-session', 'claude/x'), false);
  assert.equal(isTemporaryWorktree('C:/repo/.claude/worktrees/auto-merge-tmp-claude-y', 'claude/x'), false);
  assert.equal(isTemporaryWorktree(null, 'claude/x'), false);
});

test('the temporary worktree is really made and really removed, and the branch survives', (t) => {
  const { primary } = makeRepo(t);
  const orphan = addWorktree(primary, 'orphan', 'claude');
  commitInWorktree(orphan.path, 'Work a closed session left behind');
  runGit(primary, 'worktree', 'remove', orphan.path); // the session closed; the branch remains
  assert.equal(existsSync(orphan.path), false);

  const base = join(primary, '.claude', 'worktrees');
  const plan = planTemporaryWorktree({ branch: orphan.branch, base, exists: existsSync });
  assert.equal(plan.action, 'create');

  const runGitHere = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });
  const created = createTemporaryWorktree(plan, { root: primary, run: runGitHere });
  assert.notEqual(created, null);
  assert.equal(existsSync(created.path), true);
  assert.equal(runGit(created.path, 'rev-parse', '--abbrev-ref', 'HEAD'), orphan.branch);

  assert.deepEqual(removeTemporaryWorktree(created, { root: primary, run: runGitHere }), { action: 'removed' });
  assert.equal(existsSync(created.path), false);
  // The BRANCH is what the landing is about; removing the scaffolding must never touch it.
  assert.notEqual(runGit(primary, 'branch', '--list', orphan.branch), '');
});

// --- Self cleanup: the worktree a finished session removes at handoff ------------------------
//
// This is the one path allowed to delete the caller's own worktree, so each guard gets a test
// that makes it fire. A guard nobody has watched refuse is not a guard.

test('self cleanup approves and removes a clean, merged, pushed worktree', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'finished');
  commitInWorktree(worktree.path);
  runGit(worktree.path, 'push', '-u', 'origin', worktree.branch);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  const plan = assessSelf(worktree.path);
  assert.deepEqual(plan.reasons, []);
  assert.equal(plan.ok, true);
  assert.equal(plan.branch, worktree.branch);

  const done = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: true }) });
  assert.deepEqual(done.errors, []);
  assert.equal(done.removedWorktree, true);
  assert.equal(done.deletedBranch, worktree.branch);
  assert.equal(done.deletedRemoteBranch, worktree.branch);
  // No process is holding it in a test, so the folder goes too - the husk is a Windows-only tail.
  assert.equal(existsSync(worktree.path), false);
  assert.equal(runGit(primary, 'branch', '--list', worktree.branch), '');
  assert.equal(
    runGit(primary, 'ls-remote', '--heads', 'origin', `refs/heads/${worktree.branch}`),
    '',
  );
});

test('self cleanup refuses to destroy ignored content until it is acknowledged', (t) => {
  const { primary } = makeRepo(t);
  // The ignore rules must predate the branch, or the worktree is simply behind main.
  writeFileSync(join(primary, '.gitignore'), 'secret-out/\n.env\nnode_modules/\n');
  runGit(primary, 'add', '.gitignore');
  runGit(primary, 'commit', '-m', 'Ignore build output');
  const worktree = addWorktree(primary, 'has-data');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  // Exactly the shape that used to slip through: git reports a clean tree, and removal would
  // still take a bench directory and a .env with it.
  mkdirSync(join(worktree.path, 'secret-out'), { recursive: true });
  writeFileSync(join(worktree.path, 'secret-out', 'result.json'), 'paid for this\n');
  writeFileSync(join(worktree.path, '.env'), 'TOKEN=value\n');
  mkdirSync(join(worktree.path, 'node_modules'), { recursive: true });
  writeFileSync(join(worktree.path, 'node_modules', 'x.js'), 'regenerable\n');
  assert.equal(runGit(worktree.path, 'status', '--porcelain'), '', 'git must call this clean');

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, true, 'ignored content is a price to acknowledge, not a blocker');
  const atRisk = plan.ignored.atRisk.map((entry) => entry.path).sort();
  assert.deepEqual(atRisk, ['.env', 'secret-out/']);
  assert.deepEqual(plan.ignored.regenerable, ['node_modules/'], 'node_modules is rebuildable');

  const refused = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: true }) });
  assert.equal(refused.removedWorktree, false);
  assert.ok(
    refused.errors.some((error) => /not regenerable/.test(error)),
    `expected a data refusal, got ${JSON.stringify(refused.errors)}`,
  );
  assert.equal(existsSync(join(worktree.path, 'secret-out', 'result.json')), true, 'nothing may be destroyed');

  const done = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: true }), acknowledgeData: true });
  assert.deepEqual(done.errors, []);
  assert.equal(done.removedWorktree, true);
});

test('self cleanup needs no acknowledgement when only rebuildable artifacts are present', (t) => {
  const { primary } = makeRepo(t);
  writeFileSync(join(primary, '.gitignore'), 'dist/\nnode_modules/\n');
  runGit(primary, 'add', '.gitignore');
  runGit(primary, 'commit', '-m', 'Ignore build output');
  const worktree = addWorktree(primary, 'only-artifacts');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');
  mkdirSync(join(worktree.path, 'dist'), { recursive: true });
  writeFileSync(join(worktree.path, 'dist', 'bundle.js'), 'built\n');

  const plan = assessSelf(worktree.path);
  assert.deepEqual(plan.ignored.atRisk, [], 'a build directory must not nag');

  const done = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: true }) });
  assert.deepEqual(done.errors, []);
  assert.equal(done.removedWorktree, true);
});

test('self cleanup refuses the primary checkout', (t) => {
  const { primary } = makeRepo(t);
  const plan = assessSelf(primary);
  assert.equal(plan.ok, false);
  assert.ok(
    plan.reasons.some((reason) => /primary checkout|on main/.test(reason)),
    `expected a primary/main refusal, got ${JSON.stringify(plan.reasons)}`,
  );
});

test('self cleanup refuses a worktree with uncommitted work', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'busy');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');
  writeFileSync(join(worktree.path, 'scratch.txt'), 'unsaved\n');

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, false);
  assert.ok(
    plan.reasons.some((reason) => /uncommitted/.test(reason)),
    `expected an uncommitted refusal, got ${JSON.stringify(plan.reasons)}`,
  );
});

test('self cleanup refuses work that never reached origin/main', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'unpushed');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch); // merged locally, never pushed

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, false);
  assert.ok(
    plan.reasons.some((reason) => /not backed up off this machine/.test(reason)),
    `expected a backup refusal, got ${JSON.stringify(plan.reasons)}`,
  );
});

test('self cleanup refuses a branch with commits that never landed', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'unmerged');
  commitInWorktree(worktree.path);

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, false);
  assert.ok(
    plan.reasons.some((reason) => /commits that are not in main/.test(reason)),
    `expected an unmerged refusal, got ${JSON.stringify(plan.reasons)}`,
  );
});

test('self cleanup refuses a detached worktree, which may hold unnamed work', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'detached');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');
  runGit(worktree.path, 'checkout', '--detach');

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, false);
  assert.ok(
    plan.reasons.some((reason) => /detached/.test(reason)),
    `expected a detached refusal, got ${JSON.stringify(plan.reasons)}`,
  );
});

test('self cleanup re-verifies at apply time and deletes nothing if the tree went dirty', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'raced');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  const plan = assessSelf(worktree.path);
  assert.equal(plan.ok, true);

  // The session writes a file between assessment and apply - the classic stale-plan race.
  writeFileSync(join(worktree.path, 'late.txt'), 'written after assessment\n');

  const done = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: true }) });
  assert.equal(done.removedWorktree, false);
  assert.equal(done.deletedBranch, null);
  assert.ok(
    done.errors.some((error) => /state changed since assessment/.test(error)),
    `expected a stale-plan refusal, got ${JSON.stringify(done.errors)}`,
  );
  assert.equal(existsSync(worktree.path), true, 'the worktree must survive a refused apply');
});

test('self cleanup refuses when origin cannot be refreshed, rather than trusting stale containment', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'offline');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  const plan = assessSelf(worktree.path);
  const done = applySelf(plan, { prunePorts: () => [], refreshRemote: () => ({ ok: false, stderr: 'network down' }) });
  assert.equal(done.removedWorktree, false);
  assert.ok(done.errors.some((error) => /could not refresh origin/.test(error)));
  assert.equal(existsSync(worktree.path), true);
});

test('cleanup assessment refuses a primary checkout that is not on main', (t) => {
  const { primary } = makeRepo(t);
  runGit(primary, 'switch', '-c', 'codex/not-main');

  const plan = assess(primary);

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /must be on main/);
});

test('cleanup does not remove work backed up only by local main', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'local-only');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);

  const plan = assess(primary);
  const worktreeEntry = plan.worktrees.find((entry) => entry.branch === worktree.branch);
  const branchEntry = plan.branches.find((entry) => entry.name === worktree.branch);

  assert.equal(plan.ok, true);
  assert.equal(plan.mainSync.state, 'ahead');
  assert.equal(worktreeEntry.action, 'skip');
  assert.match(worktreeEntry.why, /only contained in local main/);
  assert.equal(branchEntry.action, 'skip');
  assert.match(branchEntry.why, /not backed up to origin\/main/);
  assert.ok(assessmentRisks(plan).length >= 3);
});

test('cleanup removes only a clean, remotely backed-up managed worktree and branch', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'merged');
  commitInWorktree(worktree.path);
  runGit(worktree.path, 'push', '-u', 'origin', worktree.branch);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  const plan = assess(primary);
  assert.equal(plan.ok, true);
  assert.equal(assessmentRisks(plan).length, 0);
  assert.equal(
    plan.worktrees.find((entry) => entry.branch === worktree.branch).action,
    'remove',
  );
  assert.equal(
    plan.branches.find((entry) => entry.name === worktree.branch).action,
    'delete',
  );
  assert.equal(
    plan.remoteBranches.find((entry) => entry.name === worktree.branch).action,
    'delete',
  );

  const result = applyPlan(plan, primary, { prunePorts: () => [] });

  assert.deepEqual(result.errors, []);
  assert.equal(existsSync(worktree.path), false);
  assert.equal(runGit(primary, 'branch', '--list', worktree.branch), '');
  assert.deepEqual(result.deletedRemoteBranches, [worktree.branch]);
  assert.equal(
    runGit(primary, 'ls-remote', '--heads', 'origin', `refs/heads/${worktree.branch}`),
    '',
  );
});

test('cleanup never deletes an unmerged GitHub branch', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'remote-unmerged');
  commitInWorktree(worktree.path, 'Remote work that has not landed');
  runGit(worktree.path, 'push', '-u', 'origin', worktree.branch);

  const plan = assess(primary);
  const remote = plan.remoteBranches.find((entry) => entry.name === worktree.branch);
  assert.equal(remote.action, 'skip');
  assert.match(remote.why, /not contained in both/);

  const result = applyPlan(plan, primary, {
    prunePorts: () => [],
    refreshRemote: () => ({ ok: true }),
  });
  assert.deepEqual(result.deletedRemoteBranches, []);
  assert.notEqual(
    runGit(primary, 'ls-remote', '--heads', 'origin', `refs/heads/${worktree.branch}`),
    '',
  );
});

test('cleanup refuses a GitHub branch that moved after assessment', (t) => {
  const { origin, primary, root } = makeRepo(t);
  const worktree = addWorktree(primary, 'remote-race');
  commitInWorktree(worktree.path, 'Merged feature');
  runGit(worktree.path, 'push', '-u', 'origin', worktree.branch);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');

  const plan = assess(primary);
  assert.equal(
    plan.remoteBranches.find((entry) => entry.name === worktree.branch).action,
    'delete',
  );

  const other = join(root, 'other');
  runGit(root, 'clone', origin, other);
  runGit(other, 'config', 'user.name', 'Concurrent Pusher');
  runGit(other, 'config', 'user.email', 'concurrent@example.invalid');
  runGit(other, 'checkout', worktree.branch);
  writeFileSync(join(other, 'concurrent.txt'), 'new remote work\n');
  runGit(other, 'add', 'concurrent.txt');
  runGit(other, 'commit', '-m', 'Concurrent remote work');
  runGit(other, 'push', 'origin', worktree.branch);
  const movedHead = runGit(other, 'rev-parse', 'HEAD');

  const result = applyPlan(plan, primary, { prunePorts: () => [] });

  assert.deepEqual(result.deletedRemoteBranches, []);
  assert.match(result.errors.join('\n'), /origin\/codex\/remote-race.*changed - skipped/);
  assert.match(
    runGit(primary, 'ls-remote', '--heads', 'origin', `refs/heads/${worktree.branch}`),
    new RegExp(`^${movedHead}`),
  );
});

test('cleanup apply rechecks a worktree that became dirty after assessment', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'changed-after-plan');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');
  const plan = assess(primary);
  writeFileSync(join(worktree.path, 'late-change.txt'), 'do not remove\n');

  const result = applyPlan(plan, primary, { prunePorts: () => [] });

  assert.ok(
    result.errors.some((error) => error.includes('safety state changed after assessment')),
  );
  assert.equal(existsSync(worktree.path), true);
  assert.notEqual(runGit(primary, 'branch', '--list', worktree.branch), '');
});

test('cleanup apply refuses every action if the primary checkout leaves main', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'main-moved');
  commitInWorktree(worktree.path);
  runGit(primary, 'merge', '--ff-only', worktree.branch);
  runGit(primary, 'push', 'origin', 'main');
  const plan = assess(primary);
  runGit(primary, 'switch', '-c', 'admin/not-main');

  const result = applyPlan(plan, primary, { prunePorts: () => [] });

  assert.deepEqual(result.removedWorktrees, []);
  assert.deepEqual(result.deletedBranches, []);
  assert.match(result.errors[0], /no longer on main/);
  assert.equal(existsSync(worktree.path), true);
  assert.notEqual(runGit(primary, 'branch', '--list', worktree.branch), '');
});

test('cleanup apply preserves a branch whose ref moved after assessment', (t) => {
  const { primary } = makeRepo(t);
  writeFileSync(join(primary, 'second.txt'), 'second\n');
  runGit(primary, 'add', 'second.txt');
  runGit(primary, 'commit', '-m', 'Second main commit');
  runGit(primary, 'push', 'origin', 'main');
  runGit(primary, 'branch', 'codex/ref-moved');
  const plan = assess(primary);
  runGit(primary, 'branch', '-f', 'codex/ref-moved', 'HEAD~1');

  const result = applyPlan(plan, primary, { prunePorts: () => [] });

  assert.ok(result.errors.some((error) => error.includes('state changed after assessment')));
  assert.notEqual(runGit(primary, 'branch', '--list', 'codex/ref-moved'), '');
});

test('cleanup treats dirty worktrees as a blocking risk', (t) => {
  const { primary } = makeRepo(t);
  const worktree = addWorktree(primary, 'dirty', 'claude');
  writeFileSync(join(worktree.path, 'uncommitted.txt'), 'keep me\n');

  const plan = assess(primary);
  const entry = plan.worktrees.find((item) => item.branch === worktree.branch);

  assert.equal(entry.action, 'skip');
  assert.match(entry.why, /uncommitted changes/);
  assert.ok(assessmentRisks(plan).some((risk) => risk.includes('uncommitted changes')));
});

test('leftover-folder dry run reports empty and non-empty folders without deleting either', (t) => {
  const { primary } = makeRepo(t);
  const base = join(primary, '.claude', 'worktrees');
  const empty = join(base, 'empty');
  const nonEmpty = join(base, 'non-empty');
  mkdirSync(empty, { recursive: true });
  mkdirSync(nonEmpty, { recursive: true });
  writeFileSync(join(nonEmpty, 'keep.txt'), 'keep\n');

  const inspection = inspectLeftoverFolders({
    primaryRoot: primary,
    registeredRoots: worktreeRoots(primary),
    protect: [primary],
  });

  assert.deepEqual(inspection.empty, [normalize(empty)]);
  assert.deepEqual(inspection.nonEmpty, [normalize(nonEmpty)]);
  assert.equal(existsSync(empty), true);
  assert.equal(existsSync(nonEmpty), true);

  const sweep = sweepEmptyLeftoverFolders({
    primaryRoot: primary,
    registeredRoots: worktreeRoots(primary),
    protect: [primary],
  });
  assert.deepEqual(sweep.removed, [normalize(empty)]);
  assert.equal(existsSync(empty), false);
  assert.equal(existsSync(nonEmpty), true);
});

test('activity scan reports other worktrees committed and uncommitted work, never its own', async (t) => {
  const { primary } = makeRepo(t);
  const busy = addWorktree(primary, 'busy');
  commitInWorktree(busy.path, 'Committed but unmerged');
  writeFileSync(join(busy.path, 'src with space.ts'), 'draft\n');
  const idle = addWorktree(primary, 'idle'); // branched off main, nothing done
  writeFileSync(join(primary, 'own-work.txt'), 'own\n');

  const { worktrees, branches } = await scanActivity(primary);

  assert.deepEqual(
    worktrees.map((entry) => entry.branch),
    [busy.branch],
    'only the worktree with work in flight is reported',
  );
  const [entry] = worktrees;
  // Untracked, uncommitted and committed-but-unmerged all count as in flight; the scanning
  // checkout's own files never do, and a path with a space survives intact.
  assert.deepEqual(entry.files, ['feature.txt', 'src with space.ts']);
  assert.equal(entry.uncommitted, 1);
  assert.equal(entry.ahead, 1);
  assert.equal(entry.lastCommit.subject, 'Committed but unmerged');
  assert.equal(existsSync(idle.path), true);
  // Both busy and idle have a worktree, so neither belongs in the worktree-less list.
  assert.deepEqual(branches, []);

  // Scanned from the busy worktree itself, its own work is what must NOT be listed - the
  // primary checkout sits on main, so it cannot prove the self-exclusion on its own.
  assert.deepEqual((await scanActivity(busy.path)).worktrees, []);
});

test('activity scan still sees unmerged work after its worktree is gone', async (t) => {
  const { primary } = makeRepo(t);
  const abandoned = addWorktree(primary, 'abandoned');
  commitInWorktree(abandoned.path, 'Work left behind');
  assert.equal((await scanActivity(primary)).worktrees.length, 1);

  // A closed session leaves the branch behind and frees its worktree - the exact case a
  // worktree-only scan goes blind to.
  runGit(primary, 'worktree', 'remove', abandoned.path);

  const { worktrees, branches } = await scanActivity(primary);
  assert.deepEqual(worktrees, [], 'the worktree is gone, so it reports no worktree activity');
  assert.deepEqual(
    branches.map((entry) => ({ branch: entry.branch, ahead: entry.ahead, files: entry.files })),
    [{ branch: abandoned.branch, ahead: 1, files: ['feature.txt'] }],
    'the unmerged work is still reported, now as a worktree-less branch',
  );
  assert.equal(branches[0].lastCommit.subject, 'Work left behind');

  // Once it lands in main it is not in flight any more, by either route.
  runGit(primary, 'merge', '--ff-only', abandoned.branch);
  assert.deepEqual((await scanActivity(primary)).branches, []);
});

test('a branch checked out in a worktree is never double-reported as worktree-less', async (t) => {
  const { primary } = makeRepo(t);
  const busy = addWorktree(primary, 'attached');
  commitInWorktree(busy.path, 'Attached work');

  const { worktrees, branches } = await scanActivity(primary);

  assert.deepEqual(worktrees.map((entry) => entry.branch), [busy.branch]);
  assert.deepEqual(branches, []);
});

test('activity scan drops a branch once its work is merged into main', async (t) => {
  const { primary } = makeRepo(t);
  const landed = addWorktree(primary, 'landed');
  commitInWorktree(landed.path, 'Work that lands');
  assert.equal((await scanActivity(primary)).worktrees.length, 1);

  runGit(primary, 'merge', '--ff-only', landed.branch);

  const { worktrees, branches } = await scanActivity(primary);
  assert.deepEqual(worktrees, []);
  assert.deepEqual(branches, []);
});

test('overlap detection matches only worktrees touching the given files', async (t) => {
  const { primary } = makeRepo(t);
  const busy = addWorktree(primary, 'overlap');
  commitInWorktree(busy.path, 'Touch feature.txt');

  const { worktrees: activity } = await scanActivity(primary);

  const hit = overlapping(activity, ['src/other.ts', 'feature.txt']);
  assert.deepEqual(hit.map((h) => h.entry.branch), [busy.branch]);
  assert.deepEqual(hit[0].files, ['feature.txt']);
  assert.deepEqual(overlapping(activity, ['src/other.ts']), []);
});

test('reattach gate accepts only clean, reachable detached HEAD state', (t) => {
  const { primary } = makeRepo(t);
  runGit(primary, 'switch', '--detach');

  const clean = assessReattach(primary);
  assert.equal(clean.safe, true);

  writeFileSync(join(primary, 'uncommitted.txt'), 'keep\n');
  const dirty = assessReattach(primary);
  assert.equal(dirty.safe, false);
  assert.match(dirty.reason, /not clean/);
});

test('reattach gate rejects a detached commit not reachable from any branch or remote', (t) => {
  const { primary } = makeRepo(t);
  runGit(primary, 'switch', '--detach');
  writeFileSync(join(primary, 'unique.txt'), 'unique\n');
  runGit(primary, 'add', 'unique.txt');
  runGit(primary, 'commit', '-m', 'Unique detached work');

  const assessment = assessReattach(primary);

  assert.equal(assessment.safe, false);
  assert.match(assessment.reason, /not reachable from any branch or remote/);
});

// --- The opt-in `fromBranch` widening -------------------------------------------------------
//
// This one option lets the gate say yes to a state it used to refuse, so every condition it
// still enforces gets a test that makes it fire. Loosening a guard without watching it refuse
// is how a guard quietly becomes decoration.

test('reattach gate accepts the root sitting on the branch the caller named', (t) => {
  const { primary } = makeRepo(t);
  runGit(primary, 'switch', '-c', 'claude/finished-work');

  const strict = assessReattach(primary);
  assert.equal(strict.safe, false, 'without the option this is still refused');
  assert.match(strict.reason, /on branch claude\/finished-work/);

  const opted = assessReattach(primary, { fromBranch: 'claude/finished-work' });
  assert.equal(opted.safe, true);
  assert.equal(opted.attached, true);
  assert.equal(opted.branch, 'claude/finished-work');
});

test('reattach gate refuses a branch other than the one the caller named', (t) => {
  const { primary } = makeRepo(t);
  runGit(primary, 'switch', '-c', 'claude/somebody-elses-work');

  const assessment = assessReattach(primary, { fromBranch: 'claude/finished-work' });

  assert.equal(assessment.safe, false);
  assert.match(assessment.reason, /on branch claude\/somebody-elses-work/);
});

test('reattach gate still refuses a dirty tree, an in-progress op and an occupied main', (t) => {
  const { primary, root } = makeRepo(t);
  const branch = 'claude/finished-work';
  runGit(primary, 'switch', '-c', branch);
  const opts = { fromBranch: branch };
  assert.equal(assessReattach(primary, opts).safe, true, 'baseline must be safe, or nothing below proves anything');

  // Dirty: an untracked file is enough - switching would carry it onto main.
  writeFileSync(join(primary, 'uncommitted.txt'), 'keep\n');
  const dirty = assessReattach(primary, opts);
  assert.equal(dirty.safe, false);
  assert.match(dirty.reason, /not clean/);
  rmSync(join(primary, 'uncommitted.txt'));
  assert.equal(assessReattach(primary, opts).safe, true);

  // Mid-flight git operation: the marker file is what the gate reads, so plant exactly that.
  const gitDir = runGit(primary, 'rev-parse', '--absolute-git-dir');
  writeFileSync(join(gitDir, 'MERGE_HEAD'), `${runGit(primary, 'rev-parse', 'HEAD')}\n`);
  const midMerge = assessReattach(primary, opts);
  assert.equal(midMerge.safe, false);
  assert.match(midMerge.reason, /operation is in progress/);
  rmSync(join(gitDir, 'MERGE_HEAD'));
  assert.equal(assessReattach(primary, opts).safe, true);

  // main taken by another worktree: it is not ours to switch to. It has to live OUTSIDE the
  // primary checkout, or adding it makes the tree dirty and the earlier check answers first.
  runGit(primary, 'worktree', 'add', join(root, 'holds-main'), 'main');
  const occupied = assessReattach(primary, opts);
  assert.equal(occupied.safe, false);
  assert.match(occupied.reason, /checked out in another worktree/);
});

test('reattach gate never treats main itself as a fromBranch', (t) => {
  const { primary } = makeRepo(t);

  // The root is already on main; naming it must not turn "nothing to do" into an action.
  const assessment = assessReattach(primary, { fromBranch: 'main' });

  assert.equal(assessment.safe, false);
  assert.equal(assessment.onMain, true);
  assert.match(assessment.reason, /already on main/);
});
