#!/usr/bin/env node
// THE RED-MAIN ALARM: file it once, say each distinct thing once, never go quiet on a new fault.
//
//   node scripts/red-main-issue.mjs            (from ci.yml's gate job; reads the env below)
//
// Env: GH_REPO, GH_TOKEN (for `gh`), RUN_ID, SHA, RUN_URL.
//
// WHY THIS IS A SCRIPT AND NOT SIX LINES OF BASH. It used to be six lines of bash, and they
// deduped by COMMIT SHA: a re-run of the same commit stayed silent, a new commit always commented.
// Every landing is a new commit, so between 2026-08-27 and 2026-08-28 one defect
// (`e2e/anim-engine.spec.ts:656`) produced 27 separate reports of itself as branch after branch
// landed onto the red main - two thirds of the owner's CI email for the fortnight
// (docs/CI_STABILITY.md). The sha was never the right key. WHAT IS FAILING is.
//
// The rule, and each half of it matters:
//   - a failure set nobody has reported yet ALWAYS comments - including a new spec appearing
//     alongside a familiar one, because that set is not the reported set;
//   - a set this gate could not classify ALWAYS comments - `unknown` is never equal to anything;
//   - a byte-identical repeat of the LATEST reported set comments nothing. The run is still red,
//     the issue is still open, the commit status is still red. Only the notification is withheld.
//
// This is the owner's constraint made mechanical, stated by him on 2026-08-29: "it's fine to turn
// off any extra emails, but I do not want to close my eyes if we have problems; I want to know
// about it." So: say each distinct problem loudly, once. Never say nothing about a new one.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeFailureSet, fetchFailureSet } from './ci-failure-set.mjs';

export const TITLE = 'CI is red on main';

/** The HTML comment that carries the failure set from one run to the next, through the issue. */
export function marker(hash) {
  return `<!-- red-main-failure-set: ${hash} -->`;
}

/**
 * What this run should do about the rolling issue.
 *
 * `bodies` is the issue body followed by its comments, oldest first - the issue as a reader sees
 * it. Pure, because this is the decision that either keeps the owner informed or quietly stops
 * telling him things, and it must be checkable without a repository or a network.
 */
export function planRedMainComment({ existing = null, bodies = [], sha = '', hash = 'unknown' } = {}) {
  if (!existing) return { action: 'create', reason: 'no open red-main issue yet' };

  // THE EXISTING REFUSAL, kept exactly as it was: a re-run of a commit already reported adds
  // nothing at all, whatever it failed on. This is checked first because it is the stronger
  // statement - the same commit failing again is the same event, not a repeat report of one.
  if (sha && bodies.some((b) => String(b ?? '').includes(sha))) {
    return { action: 'withhold', reason: `commit ${sha} is already reported on issue #${existing}` };
  }

  // Unclassifiable never dedups. An `unknown` hash means the annotations could not be read, not
  // that nothing failed, and treating "I could not tell" as "same as last time" is precisely the
  // eyes-closed failure this whole mechanism is written against.
  if (hash === 'unknown') {
    return { action: 'comment', reason: 'this run\'s failure set could not be identified - reporting it rather than guessing' };
  }

  // The LATEST word only, matching configured-suite.yml. A set that came back after something else
  // was reported in between is news again, and should be.
  const last = String(bodies[bodies.length - 1] ?? '');
  if (last.includes(marker(hash))) {
    return {
      action: 'withhold',
      reason: `the same failure set (${hash}) is already the latest word on issue #${existing} - the run is still red, only the comment is withheld`,
    };
  }
  return { action: 'comment', reason: `a failure set not yet reported (${hash})` };
}

/** The issue body / comment text. The failing specs are IN it, so the alarm names the fault. */
export function issueBody({ sha, runUrl, items, hash }) {
  return [
    `Commit ${sha} failed CI: ${runUrl}`,
    '',
    `Failing: ${describeFailureSet(items, { max: 12 })}`,
    '',
    'Main stays red until this is fixed, and the landing queue refuses to merge onto it',
    '(`node scripts/main-health.mjs` says the same thing locally). A repeat of this exact',
    'failure set will NOT comment again - a new or changed one always will.',
    '',
    marker(hash),
  ].join('\n');
}

function gh(args) {
  const res = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true });
  return { ok: res.status === 0, out: String(res.stdout ?? '').trim(), err: String(res.stderr ?? '').trim() };
}

function findIssue() {
  const res = gh(['issue', 'list', '--state', 'open', '--search', `"${TITLE}" in:title`, '--json', 'number', '--jq', '.[0].number']);
  return res.ok && res.out ? res.out : null;
}

function readBodies(number) {
  const res = gh(['issue', 'view', String(number), '--json', 'body,comments', '--jq', '[.body] + [.comments[].body] | .[]']);
  return res.ok ? res.out.split('\n') : [];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = process.env.SHA ?? '';
  const runUrl = process.env.RUN_URL ?? '';
  const { items, hash } = fetchFailureSet(process.env.RUN_ID, { repo: process.env.GH_REPO });
  const existing = findIssue();
  // `readBodies` on a live issue returns the body plus every comment; joined with newlines by the
  // jq filter above, so a comment is one element per line - which is enough for both the substring
  // checks the decision makes, and cheaper than paging structured comment objects.
  const decision = planRedMainComment({ existing, bodies: existing ? readBodies(existing) : [], sha, hash });
  const body = issueBody({ sha, runUrl, items, hash });

  if (decision.action === 'create') {
    console.log(`Filing the red-main issue: ${decision.reason}`);
    gh(['issue', 'create', '--title', TITLE, '--body', body]);
  } else if (decision.action === 'comment') {
    console.log(`Commenting on issue #${existing}: ${decision.reason}`);
    gh(['issue', 'comment', String(existing), '--body', `Still red. ${body}`]);
  } else {
    // A notice rather than silence: whoever opens the run must be able to see that the alarm
    // CHOSE not to comment, and why. An alarm that suppresses invisibly is indistinguishable
    // from one that is broken.
    console.log(`::notice title=Red-main comment withheld::${decision.reason}`);
  }
}
