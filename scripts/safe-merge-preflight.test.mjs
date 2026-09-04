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
import { readFile } from 'node:fs/promises';
import { cancelledRunCulprits, cancelledRunDidWork, classifyCiRun, classifyEmptyPlan, classifyMainSync, mergeOrderVerdict, parseWorktrees, previewConflicts, selectCiRun, validateBranchName } from './safe-merge-preflight.mjs';

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

test('informational messages after the blank separator are never counted as conflicted paths', () => {
  // merge-tree's sections are: the tree OID, the conflicted path names, a BLANK line, then
  // messages like "Auto-merging x" and "CONFLICT (content): ...". Filtering blanks out instead
  // of stopping at the separator counted the messages as paths - one real conflict read as
  // "8 conflicted path(s)", and that number is what a person uses to judge whether a refusal
  // is worth chasing.
  const runner = () => {
    const error = new Error('conflict');
    error.status = 1;
    error.stdout =
      'treesha\nsrc/a.ts\n\nAuto-merging src/a.ts\nCONFLICT (content): Merge conflict in src/a.ts\n' +
      'Auto-merging src/other.ts\n';
    throw error;
  };
  const verdict = previewConflicts('some-branch', runner);
  assert.equal(verdict.clean, false);
  assert.match(verdict.detail, /^1 conflicted path\(s\): src\/a\.ts$/);
});

// WHICH run to act on, before anything judges it. `gh run list --limit 1` answers with creation
// order, and a push run and a dispatched run created in the same SECOND sort arbitrarily - the
// tie broke toward a CANCELLED push run on 2026-08-26 and refused a real landing. databaseId is
// strict creation order, so it is the tiebreak; and a cancelled shell is never the run to act on
// while anything else exists.

test('a live run outranks everything - the evidence is not settled yet', () => {
  const picked = selectCiRun([
    { databaseId: 100, status: 'completed', conclusion: 'cancelled' },
    { databaseId: 101, status: 'in_progress', conclusion: '' },
  ]);
  assert.equal(picked.action, 'watch');
  assert.equal(picked.run.databaseId, 101);
});

test('the same-second tie breaks on databaseId, never on listing order', () => {
  // The cancelled shell arrives FIRST in the listing - exactly how the real refusal happened.
  const picked = selectCiRun([
    { databaseId: 101, status: 'completed', conclusion: 'cancelled' },
    { databaseId: 100, status: 'completed', conclusion: 'success' },
  ]);
  assert.equal(picked.action, 'judge');
  assert.equal(picked.run.databaseId, 100, 'the cancelled shell proves nothing; the verdict does');
});

test('a red run NEWER than a green one is the one judged - refusals never weaken', () => {
  const picked = selectCiRun([
    { databaseId: 300, status: 'completed', conclusion: 'failure' },
    { databaseId: 200, status: 'completed', conclusion: 'success' },
  ]);
  assert.equal(picked.action, 'judge');
  assert.equal(picked.run.conclusion, 'failure', 'preferring the green run here would pass a refused tree');
});

test('nothing but cancelled shells is "none", carrying the newest so a refusal can name it', () => {
  const picked = selectCiRun([
    { databaseId: 400, status: 'completed', conclusion: 'cancelled' },
    { databaseId: 401, status: 'completed', conclusion: 'cancelled' },
  ]);
  assert.equal(picked.action, 'none');
  assert.equal(picked.run.databaseId, 401);
});

test('an empty listing is "none" with no run at all', () => {
  assert.deepEqual(selectCiRun([]), { action: 'none', run: null });
  assert.deepEqual(selectCiRun(undefined), { action: 'none', run: null });
});

// A cancelled run is two completely different facts wearing one word, and on 2026-09-03 the
// difference cost two landings (j-0438, j-0445) - the first two to time out in 213.

test('a cancelled run whose jobs never ran is an empty shell', () => {
  // What the ref-scoped concurrency group leaves behind when a newer run replaces an older one.
  assert.equal(cancelledRunDidWork({ jobs: [] }), false, 'no jobs at all');
  assert.equal(cancelledRunDidWork({}), false, 'no job data at all');
  assert.equal(cancelledRunDidWork(null), false);
  assert.equal(
    cancelledRunDidWork({ jobs: [{ name: 'Build', conclusion: 'cancelled', steps: [] }] }),
    false,
    'killed while queued - it never executed a line of this repo',
  );
  assert.equal(
    cancelledRunDidWork({ jobs: [{ name: 'E2E 1/9', conclusion: 'skipped' }] }),
    false,
    'a skipped job is the plan being believed, not work being done',
  );
});

test('a cancelled run whose shards ran for twenty minutes is NOT a shell', () => {
  // j-0445's run 33815742655 exactly: eight shards green, one killed by the shard job's own
  // 20-minute timeout-minutes, and GitHub calls the whole run cancelled.
  assert.equal(
    cancelledRunDidWork({
      jobs: [
        { name: 'E2E 8/9 (subset)', conclusion: 'success' },
        { name: 'E2E 7/9 (subset)', conclusion: 'cancelled', steps: [] },
      ],
    }),
    true,
  );
  // And a run where nothing CONCLUDED but a job got past setup into steps that ran.
  assert.equal(
    cancelledRunDidWork({
      jobs: [{
        name: 'E2E 7/9 (subset)',
        conclusion: 'cancelled',
        steps: [{ name: 'Set up job', conclusion: 'success' }, { name: 'E2E shard', conclusion: 'cancelled' }],
      }],
    }),
    true,
  );
});

test('the culprits are named with how long they ran, because that is what identifies a timeout', () => {
  assert.deepEqual(
    cancelledRunCulprits({
      jobs: [
        { name: 'E2E 1/9 (subset)', conclusion: 'success' },
        {
          name: 'E2E 7/9 (subset)',
          conclusion: 'cancelled',
          startedAt: '2026-09-03T23:02:09Z',
          completedAt: '2026-09-03T23:22:25Z',
        },
      ],
    }),
    ['E2E 7/9 (subset) (20 min)'],
  );
  // Missing timestamps are not a reason to say nothing - the NAME is most of the answer.
  assert.deepEqual(
    cancelledRunCulprits({ jobs: [{ name: 'Factory gates', conclusion: 'cancelled' }] }),
    ['Factory gates'],
  );
  assert.deepEqual(cancelledRunCulprits(null), []);
});

test('phase 3 selects its run through selectCiRun, filtered to ci.yml', async () => {
  // The wiring is a property of the source - a unit test cannot reach phase 3 without gh.
  // Normalised, because the working tree may hold CRLF and the slice below needs LF to find
  // the end of the function.
  const source = (await readFile(new URL('./safe-merge-preflight.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const body = source.slice(source.indexOf('function phase3('));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.match(fn, /'--workflow', 'ci\.yml'/);
  assert.match(fn, /selectCiRun\(/);
  assert.match(fn, /databaseId,status,conclusion/);
});

// What a CI run PROVES, as opposed to what its green tick suggests. Both halves below cost real
// time on 2026-08-21: a run whose E2E shards were skipped had to be reasoned about by hand twice,
// and `gh run list` handed back a deploy-verify run for the same commit, which has no CI gate at
// all. Neither can be allowed to read as ordinary evidence.
const SHA = 'c80225b7e258b85cad92e5c39b16cb5f56762402';
const shardJobs = (n, mode) =>
  Array.from({ length: n }, (_, i) => ({ name: `E2E ${i + 1}/${n} (${mode})`, conclusion: 'success' }));
const GATE = { name: 'CI gate', conclusion: 'success' };

test('a green full-suite run on the right commit is accepted with no warnings', () => {
  const verdict = classifyCiRun({ headSha: SHA, conclusion: 'success', jobs: [GATE, ...shardJobs(9, 'full')] }, SHA);
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.warnings, []);
  assert.equal(verdict.shardsRan, 9);
  assert.equal(verdict.mode, 'full');
});

test('a run for a DIFFERENT commit is refused even when green', () => {
  const verdict = classifyCiRun({ headSha: 'f'.repeat(40), conclusion: 'success', jobs: [GATE, ...shardJobs(9, 'full')] }, SHA);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocking.join(' '), /not the commit being promoted/);
});

test('a green run whose E2E shards were SKIPPED passes but says what it does not prove', () => {
  const verdict = classifyCiRun(
    { headSha: SHA, conclusion: 'success', jobs: [GATE, { name: 'E2E ${{ matrix.shardIndex }}/${{ matrix.shardTotal }} (none)', conclusion: 'skipped' }] },
    SHA,
  );
  assert.equal(verdict.ok, true, 'this classifier only REPORTS the skip - classifyEmptyPlan decides whether it is acceptable');
  assert.equal(verdict.shardsRan, 0);
  assert.match(verdict.warnings.join(' '), /proves the build, NOT behaviour/);
});

test('a missing CI gate job is never a pass', () => {
  const verdict = classifyCiRun({ headSha: SHA, conclusion: 'success', jobs: shardJobs(9, 'full') }, SHA);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocking.join(' '), /no "CI gate" job/);
});

test('a red gate blocks even when the run itself says success', () => {
  const verdict = classifyCiRun(
    { headSha: SHA, conclusion: 'success', jobs: [{ name: 'CI gate', conclusion: 'failure' }, ...shardJobs(9, 'full')] },
    SHA,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocking.join(' '), /"CI gate" concluded "failure"/);
});

test('a job killed while queued is reported as DAMAGED, not as a verdict', () => {
  const verdict = classifyCiRun(
    { headSha: SHA, conclusion: 'failure', jobs: [{ name: 'CI gate', conclusion: 'failure', steps: [] }, ...shardJobs(9, 'full')] },
    SHA,
  );
  assert.match(verdict.warnings.join(' '), /DAMAGED rather than failing/);
});

test('a job whose only failed step is "Set up job" is damaged too', () => {
  const jobs = [
    { name: 'CI gate', conclusion: 'failure', steps: [{ name: 'Set up job', conclusion: 'failure' }] },
    ...shardJobs(9, 'full'),
  ];
  assert.match(classifyCiRun({ headSha: SHA, conclusion: 'failure', jobs }, SHA).warnings.join(' '), /DAMAGED/);
});

test('an ordinary red job is NOT excused as damaged', () => {
  const jobs = [
    { name: 'CI gate', conclusion: 'failure', steps: [{ name: 'Set up job', conclusion: 'success' }, { name: 'Build', conclusion: 'failure' }] },
    ...shardJobs(9, 'full'),
  ];
  const verdict = classifyCiRun({ headSha: SHA, conclusion: 'failure', jobs }, SHA);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.warnings.join(' ').includes('DAMAGED'), false);
});

test('a cancelled run is refused even if its gate job somehow reads success', () => {
  // A cancelled or skipped run is not a pass, and the run-level conclusion is the only place
  // that says so - the gate job alone cannot be trusted to carry it.
  const verdict = classifyCiRun({ headSha: SHA, conclusion: 'cancelled', jobs: [GATE, ...shardJobs(9, 'full')] }, SHA);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocking.join(' '), /concluded "cancelled"/);
});

// ── mode: none - legitimate, or a blind plan? ───────────────────────────────────────────────
//
// This is the last route by which a green tick that ran zero specs can reach `main`, so each
// case below is one of the two things that must not be conflated: a delta with no behaviour in
// it (skipping was right) and a delta whose behaviour the run never planned for (nothing gated
// it). The file lists are real paths, classified by the real planner - a fixture here would only
// pin this test's idea of the affected map rather than the map itself.

const citation = (over) => ({
  runId: '32472271200',
  sha: 'a'.repeat(40),
  mode: 'full',
  shardsRan: 9,
  ancestor: true,
  changed: ['docs/GOALS.md'],
  ...over,
});

test('a branch that changes nothing behavioural needs no citation at all', () => {
  const verdict = classifyEmptyPlan({
    branchChanged: ['docs/VERIFICATION.md', 'scripts/safe-merge-preflight.mjs', 'README.md'],
    citation: null,
  });
  assert.equal(verdict.ok, true);
  assert.match(verdict.detail, /nothing behavioural/);
});

test('a commit already contained in main is not passed on an empty diff', () => {
  // It diffs to nothing against main, so the file-list question answers "no behavioural files"
  // for a commit that has no files. True, and evidence of nothing - say which it is.
  const verdict = classifyEmptyPlan({ branchChanged: [], citation: null, alreadyOnMain: true });
  assert.equal(verdict.ok, true);
  assert.match(verdict.detail, /already contained in origin\/main/);
});

test('a behavioural branch with NO earlier shard-running run is refused', () => {
  const verdict = classifyEmptyPlan({ branchChanged: ['src/store/templateStore.ts'], citation: null });
  assert.equal(verdict.ok, false);
  assert.match(verdict.detail, /nothing has gated this tree/);
});

test('a behavioural branch is carried by an earlier run when the delta since it is inert', () => {
  const verdict = classifyEmptyPlan({ branchChanged: ['src/store/templateStore.ts'], citation: citation() });
  assert.equal(verdict.ok, true);
  assert.match(verdict.detail, /carried by run 32472271200/);
});

test('an earlier run off a DIFFERENT history is not evidence for this commit', () => {
  // The neighbouring-commit case: green, full suite, shards ran - and it verified a tree this
  // one does not contain.
  const verdict = classifyEmptyPlan({
    branchChanged: ['src/store/templateStore.ts'],
    citation: citation({ ancestor: false }),
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.detail, /NOT an ancestor/);
});

test('a blind plan is refused: behaviour changed since the run being leaned on', () => {
  // The 2026-08-21 hole exactly - a second push cancels the run in flight and plans only itself,
  // so `src/` reaches main gated by nothing while the tick is green.
  const verdict = classifyEmptyPlan({
    branchChanged: ['src/store/templateStore.ts'],
    citation: citation({ changed: ['docs/GOALS.md', 'src/store/templateStore.ts'] }),
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.detail, /never gated/);
});

// ── The merge-order verdict, read off a runner that THROWS ─────────────────────────────────
//
// `merge-order.mjs` signals a hold with exit code 3, and `execFileSync` throws on any non-zero
// exit. The first version of this reader called it bare, so the single verdict the preflight
// exists to catch was the one that killed it - a Node stack instead of a report, on 2026-08-21,
// mid-landing. These three pin that the answer survives the throw.

test('a hold verdict is read even though merge-order exits non-zero', () => {
  const thrown = Object.assign(new Error('Command failed'), {
    status: 3,
    stdout: 'Full order ...\n\nVERDICT: hold (claude/x)\n  - renames a path\n',
  });
  assert.equal(mergeOrderVerdict(() => { throw thrown; }), 'hold');
});

test('a clear verdict is read from an ordinary exit-0 run', () => {
  assert.equal(mergeOrderVerdict(() => 'VERDICT: clear (claude/x)\n  - costs nothing\n'), 'clear');
});

test('a genuinely broken run reads as unknown, never as a hold', () => {
  // Nothing on stdout is not evidence of an ordering problem, and inventing one would stop a
  // landing for a reason nobody could act on.
  assert.equal(mergeOrderVerdict(() => { throw new Error('spawn ENOENT'); }), 'unknown');
});
