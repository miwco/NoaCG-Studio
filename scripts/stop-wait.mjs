// THE STOP-ON-A-WAIT DECISION - the pure half of scripts/hooks/stop-wait.mjs, kept importable so
// the patterns can be tested without a hook event.
//
// THE FAILURE. A session finishes its work, pushes, and ends its turn saying it is waiting for a
// CI run, a landing job or a background watcher to wake it. Nothing can: a stopped session is
// woken by a person's message and by nothing else, so the "wait" is a session that has quietly
// ended with its branch unqueued. Three sessions did this on 2026-08-30 and one more on
// 2026-09-01, each with a prompt that already said "queue as your LAST action". The trap is that
// waiting looks like diligence from the inside, which is why the prompt line did not hold.
//
// THE MECHANISM. Claude Code runs a Stop hook when a turn ends, hands it the last assistant
// message, and treats exit 2 as "do not stop - here is why". So the check happens at the one
// moment the mistake is made, by reading the words the session chose. It fires only when the
// message DECLARES a wait on something that cannot wake it, and never when the session has already
// handed its branch to the queue - after `/queue-merge`, ending is exactly right.
//
// A Stop hook was considered and rejected for the neighbouring "green but unqueued" shape, because
// that one fires at every turn end (docs/ORCHESTRATION_NEXT.md section 3, item 5). This hook is
// different: an ordinary turn end says nothing about waiting, so it stays silent on every mid-work
// pause, and `wave-tick.mjs` still covers the crashed session this cannot see.

// WHAT the session is waiting on, in two halves, because a session names either one.
//
// THE WORK is the thing that has to finish: a run, a landing, a queued job, the shards, the gate.
//
// THE OBSERVER is what the session believes will carry that finish back to it. This half is where
// the list failed on 2026-09-04: it named `watcher` and none of the ordinary synonyms for the same
// thing, so a row that wrote "I'll wait for the monitor rather than polling" was not caught, and
// stalled twice on that one sentence - about forty minutes of that night's rehearsal. A class with
// one member spelled out is a list, and a list of words loses to whichever word the session picks.
// So the observer is enumerated as a class: the watchers, the pollers, the ticks, the background
// tasks, and the notification or wake-up they are believed to deliver.
//
// Bare "poll" is deliberately absent - this product has poll graphics, and "waiting on the poll to
// render" is a wait on work a person is doing, not on an observer.
const THE_WORK =
  '\\bci\\b|the run\\b|(?:workflow|ci) run\\b|run \\d{6,}\\b|the landing\\b|\\bland(?:s|ed|ing)?\\b|merge job\\b|\\bjob j-\\d+|the queue\\b|the (?:merge|landing) queue\\b|the shards?\\b|the gate\\b';
const THE_OBSERVER =
  'watcher\\b|monitor(?:s|ing)?\\b|poller\\b|polling\\b|background (?:task|job|agent|run)\\b|\\btick\\b|notification\\b|wake(?:s|d)?\\b';
const NOTHING_WAKES_YOU = `(?:${THE_WORK}|${THE_OBSERVER})`;

// A PERSON is the one thing that CAN wake a stopped session, so a wait whose object is the owner
// is a correct stop - the hook's own message ends by asking for exactly that. Without this the
// widened list argues with the sessions doing the right thing: "waiting for you to land the fix"
// fired on `land`, and "I will resume once you have read the run" on `the run`. The object of the
// wait, immediately after the preposition, is what decides it.
const NOT_A_PERSON = '(?!(?:you|your|the owner|a human|a person|someone|somebody)\\b)';

export const WAIT_PATTERNS = Object.freeze([
  // "waiting for CI", "wait on the landing job", "holding until the run finishes"
  new RegExp(`\\b(?:wait(?:ing|s)?|await(?:ing)?|hold(?:ing)?)\\s+(?:for|on|until)\\s+${NOT_A_PERSON}[^.\\n]{0,100}?${NOTHING_WAKES_YOU}`, 'i'),
  // "I'll check back when the run completes", "will resume once CI is green"
  new RegExp(`\\b(?:will|i'll|i will|going to|plan to)\\s+(?:check|pick|resume|continue|come back|report|follow up|queue|write|finish)\\b[^.\\n]{0,80}?\\b(?:when|once|after|as soon as)\\s+${NOT_A_PERSON}[^.\\n]{0,60}?${NOTHING_WAKES_YOU}`, 'i'),
  // "a background watcher will wake me", "set up a monitor to notify me when it lands"
  /\b(?:background|scheduled|set up an?|armed an?|started an?)\s+(?:task|watcher|monitor|wakeup|poll(?:er)?|loop)\b[^.\n]{0,100}?\b(?:wake|notify|resume|report back|ping|alert)/i,
  // "checking back in 20 minutes on the shards" - the object is what separates a wait on a
  // machine from a wait on a person ("check again once you have the recording" is the latter)
  new RegExp(`\\b(?:check(?:ing)? back|checking in|check again)\\b[^.\\n]{0,60}?\\b(?:in \\d+ ?(?:min|minutes|hours?|h)\\b|later|shortly|when|once)\\b\\s*${NOT_A_PERSON}[^.\\n]{0,60}?${NOTHING_WAKES_YOU}`, 'i'),
]);

/** The session already handed its branch to the queue, or said it is done - ending is correct. */
export const FINISHED_PATTERNS = Object.freeze([
  /\bqueued\b[^.\n]{0,40}\bj-\d+/i,
  /\bj-\d+\b[^.\n]{0,40}\bqueued\b/i,
  /\/queue-merge\b[^.\n]{0,60}\b(?:ran|done|complete|queued|last action|returned)/i,
  /\bnpm run queue:merge\b[^.\n]{0,60}\b(?:ran|done|queued|returned)/i,
  /\bbranch (?:is|was) (?:now )?queued\b/i,
]);

export function declaresWait(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  return WAIT_PATTERNS.some((pattern) => pattern.test(text));
}

export function finishedProperly(text) {
  if (typeof text !== 'string') return false;
  return FINISHED_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The message the hook returns, or null when the stop is fine. `landingState` is the branch's
 * state from the job store (`queued`, `landed`, `not-queued`, ...): a queued or landed branch
 * needs no session awake for it, whatever the message says.
 */
export function decide({ text, stopHookActive = false, landingState = null } = {}) {
  if (stopHookActive) return null;
  if (!declaresWait(text)) return null;
  if (finishedProperly(text)) return null;
  if (landingState === 'queued' || landingState === 'landed') return null;
  return [
    'Your turn ends on a wait, and nothing can wake a stopped session - not a CI run, not a landing',
    'job, not a background watcher. The wait is a session that quietly ends with its branch unqueued',
    '(this happened to four sessions on 2026-08-30 and 2026-09-01). Do the rest now instead:',
    '  - a CI run: read it to a verdict - `gh run view <id> --json jobs`, and check WHICH jobs ran;',
    '  - a landing or queued job: read it - `node scripts/jobs.mjs log <id>`, or the bounded',
    '    `node scripts/jobs.mjs wait <id>` (30 minutes, then it tells you what to do);',
    '  - a background task: stop it, and take what it was holding into the handoff file.',
    'Then write the handoff file the prompt names and run /queue-merge as your LAST action - or, if',
    'you are a helper agent with no branch of your own, report the state you found to the session',
    'that launched you. If you are genuinely blocked on a person, say so and stop without a wait.',
  ].join('\n');
}

/**
 * The last assistant text in a Claude Code transcript, read from its tail. Used only when the hook
 * event carries no `last_assistant_message` (a subagent stop). Anything unreadable answers null,
 * and null never blocks - a hook that cannot tell must not refuse.
 */
export function lastAssistantText(transcriptPath, { tailBytes = 256 * 1024, readTail } = {}) {
  try {
    const tail = readTail(transcriptPath, tailBytes);
    if (!tail) return null;
    const lines = tail.split('\n').filter((line) => line.trim().startsWith('{'));
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      let record;
      try {
        record = JSON.parse(lines[index]);
      } catch {
        continue; // the first line of a tail read is usually a partial record
      }
      if (record?.type !== 'assistant') continue;
      const content = record?.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        const texts = content.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text);
        if (texts.length) return texts.join('\n');
      }
    }
    return null;
  } catch {
    return null;
  }
}
