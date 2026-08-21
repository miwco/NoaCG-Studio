// The preflight exists so that a safe-merge condition which was CHECKED and one which was merely
// claimed stop looking identical. That only holds if its own logic is right, and two of the three
// pure pieces below decide whether work reaches `main`:
//
//   - classifyMainSync is the MAIN_SYNC rule. Getting `ahead` wrong would let a promote publish
//     local-only commits nobody asked for - the failure the rule was written to prevent.
//   - validateBranchName is what keeps a revision expression, a flag, or `main` itself from being
//     accepted as the thing to merge.
//   - parseWorktrees decides WHERE cleanliness is checked. This repo's worktree directory names
//     routinely disagree with the branch inside them, so reading the porcelain correctly is the
//     difference between checking the right tree and checking a stranger's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMainSync, parseWorktrees, previewConflicts, validateBranchName } from './safe-merge-preflight.mjs';

test('main in sync with origin is promotable', () => {
  assert.deepEqual(classifyMainSync(0, 0), { state: 'in-sync', ok: true, stop: false });
});

test('main merely behind origin is fine - Phase 2 pulls it forward', () => {
  assert.deepEqual(classifyMainSync(0, 3), { state: 'behind', ok: true, stop: false });
});

test('main AHEAD of origin stops the flow - a push would publish those commits too', () => {
  const verdict = classifyMainSync(2, 0);
  assert.equal(verdict.state, 'ahead');
  assert.equal(verdict.ok, false);
  assert.equal(verdict.stop, true);
});

test('diverged main stops the flow', () => {
  const verdict = classifyMainSync(2, 5);
  assert.equal(verdict.state, 'diverged');
  assert.equal(verdict.ok, false);
  assert.equal(verdict.stop, true);
});

test('a normal feature branch name is accepted', () => {
  assert.equal(validateBranchName('claude/some-work-1a2b3c'), null);
});

test('main itself, a flag, and an empty name are all refused', () => {
  assert.match(validateBranchName('main'), /is main itself/);
  assert.match(validateBranchName('--force'), /starts with "-"/);
  assert.match(validateBranchName(''), /no branch given/);
  assert.match(validateBranchName(undefined), /no branch given/);
});

test('revision expressions are refused - only a plain branch may be merged', () => {
  for (const expr of ['main~2', 'main^', 'a..b', 'origin:main']) {
    assert.match(validateBranchName(expr), /revision expression/, `${expr} should be refused`);
  }
});

test('worktrees are read from the porcelain, branch by branch', () => {
  const porcelain = [
    'worktree C:/repo',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree C:/repo/.claude/worktrees/some-name',
    'HEAD def456',
    'branch refs/heads/claude/unrelated-name',
    '',
    'worktree C:/repo/.claude/worktrees/parked',
    'HEAD 999aaa',
    'detached',
    '',
  ].join('\n');
  const worktrees = parseWorktrees(porcelain);
  assert.equal(worktrees.length, 3);
  assert.equal(worktrees[0].branch, 'refs/heads/main');
  // The directory name says "some-name" and the branch says something else entirely: that
  // mismatch is the norm in this repo, and matching on the branch line is what handles it.
  assert.equal(worktrees[1].path, 'C:/repo/.claude/worktrees/some-name');
  assert.equal(worktrees[1].branch, 'refs/heads/claude/unrelated-name');
  // A parked worktree on a detached HEAD holds no branch - it must never match one.
  assert.equal(worktrees[2].branch, null);
});

test('an empty porcelain yields no worktrees rather than throwing', () => {
  assert.deepEqual(parseWorktrees(''), []);
});

// The first version of this check grepped merge-tree's output for `<<<<<<<`, and the first branch
// it was ever pointed at was the one ADDING this very file - whose source contains that marker as
// a string literal. It reported a conflict in a merge git resolves perfectly. Content that talks
// about conflict markers is not a conflict; only git's exit code says.
test('a clean merge whose diff MENTIONS conflict markers is still clean', () => {
  const runner = () => '<<<<<<< this text is data, not a conflict\n=======\n>>>>>>>';
  assert.deepEqual(previewConflicts('some-branch', runner), { clean: true, detail: 'no conflicts' });
});

test('a real conflict is read from the exit code, and names the paths', () => {
  const runner = () => {
    const error = new Error('conflict');
    error.status = 1;
    error.stdout = 'treesha\nsrc/a.ts\nsrc/b.ts\n';
    throw error;
  };
  const verdict = previewConflicts('some-branch', runner);
  assert.equal(verdict.clean, false);
  assert.match(verdict.detail, /2 conflicted path\(s\): src\/a\.ts, src\/b\.ts/);
});

test('merge-tree failing for any other reason is not reported as clean', () => {
  const runner = () => {
    const error = new Error('fatal: not a valid object name\nmore');
    error.status = 128;
    throw error;
  };
  assert.equal(previewConflicts('some-branch', runner).clean, false);
});
