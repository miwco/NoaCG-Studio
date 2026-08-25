// The configured suite's verdict, pinned against the cases that actually happened.
//
// Every fixture below is a shape observed on a real run between 2026-08-24 and 2026-08-25, because
// this logic exists to catch a class of failure that reads as success. The two that matter most:
// a run where every spec skipped itself and Playwright exited 0, and a run whose only fault was a
// flake - which the FIRST version of the fingerprint missed entirely, hashing the empty set,
// because it read each spec's LAST result and a flake ends `passed`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { verdict, isUnclean, allSpecs } from './configured-verdict.mjs';

const spec = (file, title, ...results) => ({ file, title, tests: [{ results: results.map((status) => ({ status })) }] });
const report = (stats, specs) => ({ stats, suites: [{ specs }] });

test('a clean full run is green', () => {
  const v = verdict(report({ expected: 33, unexpected: 0, flaky: 0, skipped: 0 }, [spec('a.spec.ts', 'x', 'passed')]), {
    minTests: 33,
    allowedSkips: '',
  });
  assert.equal(v.green, true);
  assert.deepEqual(v.problems, []);
  assert.equal(v.ran, 33);
});

test('THE SILENT-GREEN CASE: everything skipped, exit code 0, must NOT be green', () => {
  const specs = [spec('a.spec.ts', 'x', 'skipped'), spec('b.spec.ts', 'y', 'skipped')];
  const v = verdict(report({ expected: 0, unexpected: 0, flaky: 0, skipped: 2 }, specs), { minTests: 33, allowedSkips: '' });
  assert.equal(v.green, false);
  const titles = v.problems.map((p) => p.title);
  assert.ok(titles.includes('Unexpected skip'), 'names the skip');
  assert.ok(titles.includes('Too few tests ran'), 'and the count');
});

test('an allowlisted skip is tolerated; an unlisted one beside it still fails', () => {
  const specs = [spec('moderator.spec.ts', 'm', 'skipped'), spec('other.spec.ts', 'o', 'skipped')];
  const v = verdict(report({ expected: 31, unexpected: 0, flaky: 0, skipped: 2 }, specs), {
    minTests: 31,
    allowedSkips: 'moderator.spec.ts',
  });
  assert.equal(v.green, false);
  assert.match(v.problems[0].detail, /other\.spec\.ts/);
  assert.doesNotMatch(v.problems[0].detail, /moderator\.spec\.ts/);
});

test('an empty allowlist tolerates nothing (the empty-string split trap)', () => {
  const v = verdict(report({ expected: 32, unexpected: 0, flaky: 0, skipped: 1 }, [spec('a.spec.ts', 'x', 'skipped')]), {
    minTests: 0,
    allowedSkips: '',
  });
  assert.equal(v.green, false, 'a bare "" must not become an allowlist entry that matches a file');
});

test('a FLAKE is not green, and IS in the fingerprint', () => {
  const flake = spec('scorebug-output.spec.ts', 'a published scorebug', 'failed', 'passed');
  assert.equal(isUnclean(flake), true, 'failed>passed is unclean even though it ends passed');
  const v = verdict(report({ expected: 32, unexpected: 0, flaky: 1, skipped: 0 }, [flake]), { minTests: 33, allowedSkips: '' });
  assert.equal(v.green, false);
  assert.deepEqual(v.failSet, ['scorebug-output.spec.ts::a published scorebug']);
  assert.notEqual(v.failHash, 'da39a3ee5e6b', 'the empty-set hash means the flake was missed');
});

test('two runs failing the same way fingerprint the same; a different set does not', () => {
  const one = () => verdict(report({ expected: 32, unexpected: 0, flaky: 1, skipped: 0 }, [spec('s.spec.ts', 't', 'failed', 'passed')]), { minTests: 0, allowedSkips: '' });
  const other = verdict(report({ expected: 31, unexpected: 1, flaky: 1, skipped: 0 }, [
    spec('s.spec.ts', 't', 'failed', 'passed'),
    spec('q.spec.ts', 'u', 'failed', 'failed'),
  ]), { minTests: 0, allowedSkips: '' });
  assert.equal(one().failHash, one().failHash);
  assert.notEqual(one().failHash, other.failHash, 'a new spec failing must change the hash so it is reported');
});

test('ordering noise cannot change the fingerprint', () => {
  const a = verdict(report({ expected: 0, unexpected: 2, flaky: 0, skipped: 0 }, [spec('a.spec.ts', 'x', 'failed'), spec('b.spec.ts', 'y', 'failed')]), { minTests: 0, allowedSkips: '' });
  const b = verdict(report({ expected: 0, unexpected: 2, flaky: 0, skipped: 0 }, [spec('b.spec.ts', 'y', 'failed'), spec('a.spec.ts', 'x', 'failed')]), { minTests: 0, allowedSkips: '' });
  assert.equal(a.failHash, b.failHash);
});

test('specs are found however deeply Playwright nests them', () => {
  const nested = { suites: [{ suites: [{ suites: [{ specs: [spec('deep.spec.ts', 'd', 'passed')] }] }] }] };
  assert.equal(allSpecs(nested).length, 1);
});
