// The stop-on-a-wait hook's guard: which last words count as waiting on something that cannot
// wake a stopped session, which do not, and when a declared wait is still fine because the branch
// is already the queue's. A false positive here interrupts every session's ordinary turn end, so
// the negatives are the half that earns the hook its place.
import assert from 'node:assert/strict';
import test from 'node:test';

import { decide, declaresWait, finishedProperly, lastAssistantText } from './stop-wait.mjs';

test('declaresWait catches the four observed shapes', () => {
  assert.ok(declaresWait('Pushed. I am now waiting for the CI run to finish before writing the handoff and queueing.'));
  assert.ok(declaresWait("I'll check back once the run completes and then queue the branch."));
  assert.ok(declaresWait('Set up a background watcher that will wake me when the landing job finishes.'));
  assert.ok(declaresWait('Checking back in 20 minutes on the shards.'));
  assert.ok(declaresWait('Waiting on the landing (j-0301) before handing off.'));
  assert.ok(declaresWait('Will resume when CI is green.'));
});

test('declaresWait stays silent on ordinary turn ends', () => {
  assert.ok(!declaresWait('Done. The build is green and the handoff is written.'));
  assert.ok(!declaresWait('I will wait for your answer before touching the migration.'));
  assert.ok(!declaresWait('Waiting for you to confirm the design picture.'));
  assert.ok(!declaresWait('The CI run 33559810135 is green with all nine shards; queued as j-0304.'));
  assert.ok(!declaresWait('Next I will land the fix and then check the docs page.'));
  assert.ok(!declaresWait('Nothing else I can do here - check again once you have the recording.'));
  assert.ok(!declaresWait('Done. Needs you: nothing. Next: the catalog sweep runs nightly, so worth a check again once it has.'));
  assert.ok(!declaresWait('The dashboard numbers look off; worth checking back later.'));
  assert.ok(!declaresWait(''));
  assert.ok(!declaresWait(null));
});

test('declaresWait catches every observer a session believes will wake it, not only "watcher"', () => {
  // The sentence below is the one that stalled a row twice on 2026-09-04, for about forty minutes
  // of that night's rehearsal. "watcher" was listed and its four ordinary synonyms were not.
  assert.ok(declaresWait("I'll wait for the monitor rather than polling."));
  assert.ok(declaresWait("I'll wait for the poller to report."));
  assert.ok(declaresWait('Waiting on the background task to finish.'));
  assert.ok(declaresWait('Holding until the tick picks it up.'));
  assert.ok(declaresWait('Waiting for the wave tick.'));
  assert.ok(declaresWait('Checking back in 20 minutes on the monitor.'));
});

test('declaresWait leaves a wait on a PERSON alone, even when it names a machine', () => {
  assert.ok(!declaresWait('Waiting for you to land the fix.'));
  assert.ok(!declaresWait('I will wait for your decision on the gate.'));
  assert.ok(!declaresWait('Waiting for you to run CI.'));
  assert.ok(!declaresWait("I'll continue when you confirm the gate is fine."));
  assert.ok(!declaresWait('I will resume once you have read the run.'));
  assert.ok(!declaresWait('Blocked: waiting for the owner to answer whether the landing may go ahead.'));
});

test('declaresWait reads prose, not quoted machine output', () => {
  // The queue's own sentence for a capped landing. Quoting it is reporting a wait, not declaring
  // one - and it fired on a session reviewing this file on 2026-09-04.
  const quoted = 'j-0545 says: `killed at its 45 min cap - probably still waiting on CI`. Handoff written, queued.';
  assert.ok(!declaresWait(quoted));
  assert.ok(!declaresWait('The log said:\n\n> Waiting for the CI run to finish.\n\nSo I re-queued it and stopped.'));
  assert.ok(!declaresWait('```\n- claude/a: killed at its 45 min cap - probably still waiting on CI\n```\nThat is the whole report.'));
  // And an unterminated fence swallows the rest rather than reopening the hole at the end.
  assert.ok(!declaresWait('Report:\n```\nwaiting for the CI run'));
  // The prose around a quote is still read.
  assert.ok(declaresWait('The log says `nothing`. I am waiting for the CI run before I queue.'));
});

test('declaresWait still fires when a person and a machine appear in the same message', () => {
  assert.ok(declaresWait('Needs you: nothing. Waiting for the CI run before I queue.'));
  assert.ok(declaresWait('I will wait for the landing job, then ask you about the palette.'));
});

test('finishedProperly recognises a branch already handed to the queue', () => {
  assert.ok(finishedProperly('Queued as j-0304; the queue lands it. Waiting for the landing is not needed.'));
  assert.ok(finishedProperly('/queue-merge ran as the last action and returned j-0299.'));
  assert.ok(!finishedProperly('Waiting for CI before I queue.'));
});

test('decide blocks a declared wait on an unqueued branch and nothing else', () => {
  const waiting = 'Pushed and waiting for the CI run to wake me before I queue.';
  assert.match(decide({ text: waiting, landingState: 'not-queued' }), /nothing can wake a stopped session/);
  assert.equal(decide({ text: waiting, landingState: 'queued' }), null);
  assert.equal(decide({ text: waiting, landingState: 'landed' }), null);
  assert.equal(decide({ text: waiting, stopHookActive: true }), null);
  assert.equal(decide({ text: 'All done, handoff written, queued as j-0310.', landingState: 'not-queued' }), null);
  assert.equal(decide({ text: 'Build green. Stopping here; nothing left.', landingState: null }), null);
});

test('decide names the three things to do instead', () => {
  const message = decide({ text: 'Waiting on the run before queueing.', landingState: null });
  assert.match(message, /gh run view/);
  assert.match(message, /jobs\.mjs (log|wait)/);
  assert.match(message, /\/queue-merge as your LAST action/);
});

test('lastAssistantText reads the newest assistant text out of a transcript tail', () => {
  const records = [
    JSON.stringify({ type: 'user', message: { content: 'go' } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'first answer' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'waiting for CI to wake me' }] } }),
  ];
  const tail = `{"type":"assistant","message":{"content":[{"type":"text","text":"cut off partial rec\n${records.join('\n')}\n`;
  const text = lastAssistantText('irrelevant', { readTail: () => tail });
  assert.equal(text, 'waiting for CI to wake me');
  assert.equal(lastAssistantText('irrelevant', { readTail: () => { throw new Error('gone'); } }), null);
  assert.equal(lastAssistantText('irrelevant', { readTail: () => '' }), null);
});
