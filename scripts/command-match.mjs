// DOES THIS SHELL COMMAND START HEAVY BROWSER WORK? - the one place that decides.
//
// WHY IT IS ITS OWN MODULE. Two consumers need the same answer from opposite directions:
// `scripts/hooks/guard-command.mjs` asks it of a command ABOUT to run, and `scripts/e2e-runs.mjs`
// asks the equivalent of a process ALREADY running. Keeping the list of sweeps in both meant two
// copies of the same fact, and a sweep added to one and not the other is a silent hole - the
// guard would refuse to start it while the detector reported the machine idle, or the reverse.
//
// It also has to be importable, and the hook is not: `guard-command.mjs` reads stdin at module
// top level, so importing it to test its matchers would hang waiting for input that never comes.
// A pure module has no such problem, which is the second reason this file exists.
//
// The matchers are POSITIONAL. Matching a bare string anywhere in the command text was wrong in
// a way that bit within a day: `grep -n "npm run test:e2e" AGENTS.md` contains the phrase and
// starts nothing, and denying it teaches everyone to route around the guard. So the command is
// split on shell separators and each segment is tested at its FIRST token, where an invocation
// has to live. A quoted argument is never in that position.

/**
 * The repo scripts that spin up a dev server and a pile of headless Chromium, as one alternation
 * shared by the command matcher below and the process detector in `scripts/e2e-runs.mjs`.
 *
 * Deliberately a NAMED list rather than "every script that imports chromium" - 36 of them do, and
 * most are one-off analysis tools nobody runs during normal work. Blocking those would train
 * people to route around the guard. This covers the catalog quality gates AGENTS.md documents,
 * the factory, the render smokes, the `*bench*` family and the `*spike*` family. Anything missed
 * is still absorbed by the worker ladder (`scripts/e2e-workers.mjs`), which sizes a run off free
 * memory whatever else is resident.
 *
 * THE SPIKE FAMILY WAS ADDED 2026-08-15, AFTER FALLING INTO THE HOLE. `spike-mark-clearance-sweep`
 * renders 24 designs at 1920x1080 through the app for about four minutes - the same workload a
 * suite is, by the same measure - and it was started three times beside another worktree's live
 * configured suite, because nothing in the alternation matched its name. The `spike-*` set plus
 * `pro-spike` are one rig: the Pro spike runner and the calibration sweeps that read its
 * thresholds off the catalog. `[\w-]*spike[\w-]*` is deliberately the same shape as the `*bench*`
 * entry beside it, so a NEW spike script is covered by being named like its siblings rather than
 * by somebody remembering this file. The price of a name-shaped rule is that it also catches
 * things that merely SOUND like a job; `SERVER_SCRIPTS` below carves those back out.
 */
/**
 * The scripts whose names fall inside the families above and that are NOT browser work.
 *
 * A SERVER IS NOT A SWEEP. `dev-bench.mjs` is a Vite dev server with a crash log around it, and
 * it stays up for as long as somebody is benching - hours. `bench-dispatcher.mjs` is a module
 * that server preloads (`--import`), so it appears in the SAME process's command line and the
 * detector counted one dev server twice. `ai-bench-server.mjs` restarts that server per
 * candidate. None of the three opens a browser; what they cost is one Vite, which is what the
 * sessions running beside them already pay.
 *
 * Measured 2026-08-17: a bench server left up in one worktree reported as two running sweeps and
 * parked every other session's browser work for 55 minutes, with no finite job anywhere to wait
 * for. Mutual exclusion has to be against jobs that END; a long-lived server in the list turns
 * the guard from serialisation into a deadlock nobody can see the far end of.
 */
export const SERVER_SCRIPTS = 'dev-bench|bench-dispatcher|ai-bench-server';

export const SWEEP_SCRIPTS =
  'l3-sweep|type-floor|overflow-sweep|field-coverage|numerals|factory|catalog-geometry'
  // The two CATALOG MEASUREMENT instruments (docs/CATALOG_VARIETY.md). Both launch Chromium over
  // the whole registry, so they are browser work by every measure the guard cares about, and
  // neither is named like its siblings - the same hole the `*spike*` family sat in until
  // 2026-08-15. `palette-freedom` renders 490 designs TWICE, which is the heaviest of the two.
  + '|catalog-sameness|palette-freedom'
  // The TASTE re-judge (`pro-taste-rejudge.mjs`, docs/NOACG_PRO_PLAN.md §25). It mounts every
  // piece of every row in a finished round at 1920x1080 through the app - 108 of them on the two
  // checkpoint rounds, plus a catalog sweep in `--control` - so it is a job by every measure this
  // module cares about, and it is named like none of the families above. Renaming it into one
  // would make the name lie about what it does, so it is listed, which is the other half of the
  // rule AGENTS.md states.
  + '|pro-taste-rejudge'
  // THE `-sweep` SCRIPTS THAT LAUNCH CHROMIUM THEMSELVES, listed one by one because the family
  // is NOT safely name-shaped: of the nine scripts here whose name ends in `-sweep`, two
  // (`reference-companion-sweep`, `spx-corpus-sweep`) open no browser at all, so a
  // `[\w-]*-sweep` entry beside the `*bench*` and `*spike*` families would queue two scripts
  // that cost nothing - the "too eager" failure this module exists to avoid. All four below
  // render the catalog at 1920x1080 through the app: `occlusion-sweep` is the calibration the
  // occlusion rule is read off, `design-rules-audit-sweep` and `plate-legibility-sweep` were
  // already doing it unlisted, and `footprint-stability-sweep` was listed the day it was written.
  // `footprint-stability-sweep` renders the whole registry TWICE (short text, then long), so it
  // is the heaviest of the four and the one that would hurt most sitting beside a live suite.
  // `text-containment-sweep` renders the whole registry once, drives every text field to a long
  // value and freezes the motion before reading, so it holds the machine for as long as its
  // siblings and belongs here for the same reason they do.
  + '|occlusion-sweep|design-rules-audit-sweep|plate-legibility-sweep|footprint-stability-sweep'
  // `card-look-sweep` renders every design in a category full-frame and screenshots each one,
  // which is the same workload as its siblings above under a name none of them share.
  // `card-pair-sweep` renders the same set through the same rig and then compares every
  // same-category pair, so over `all` it is the whole registry - the heaviest card instrument.
  + '|card-look-sweep|card-pair-sweep'
  + '|text-containment-sweep'
  // `stage-fit-sweep` renders every STAGED design at 1920x1080 through the app and waits out the
  // webfont swap on each, which is the same workload as its siblings above.
  + '|stage-fit-sweep'
  // The two ACCEPTANCE artifact builders. Neither asserts anything, and that is exactly why
  // they are easy to forget here: a script nobody calls a test still opens Chromium and still
  // drives the whole app through it. `acceptance-pack` walks four productions, a hosted-page rig
  // over its own build, an exported package and a catalog category at three viewport sizes,
  // which is a job by every measure this module cares about.
  + '|acceptance-shots|acceptance-pack'
  // The PLAYOUT DASHBOARD frames, for the same reason as the two above and named like neither
  // family: it builds a production through the app and photographs it at four window sizes.
  + '|playout-dashboard-shots'
  + `|render-smoke[\\w-]*|(?!(?:${SERVER_SCRIPTS})\\.)[\\w-]*bench[\\w-]*`
  + '|[\\w-]*spike[\\w-]*';

/**
 * Drop every HERE-DOCUMENT body from a command line, leaving the command that opened it.
 *
 * A heredoc body is DATA, not commands, and the segmenter below splits on newlines - so a line
 * of prose that happens to start with an invocation-shaped word reads as an invocation. That is
 * the "too eager" failure mode this module was written to avoid, arriving by a route the quoted
 * argument rule cannot cover. It is not hypothetical: `git commit -F- <<'EOF'` with a message
 * whose paragraph opened "test:e2e:affected is the per-merge gate…" was refused as an attempt to
 * start a second suite. A guard that blocks writing a commit message is a guard people learn to
 * route around.
 *
 * Handles the three spellings that appear here - `<<TAG`, `<<'TAG'`/`<<"TAG"` and `<<-TAG` - and
 * an unterminated body (the rest of the text) rather than falling back to scanning it.
 */
function stripHeredocBodies(text) {
  const lines = text.split('\n');
  const out = [];
  let terminator = null;
  for (const line of lines) {
    if (terminator !== null) {
      // `<<-` allows the terminator to be indented; a plain `<<` requires it at column 0.
      if (line.trim() === terminator) terminator = null;
      continue;
    }
    out.push(line);
    const opener = line.match(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1/);
    if (opener) terminator = opener[2];
  }
  return out.join('\n');
}

/**
 * A command line's segments, each trimmed to the token an invocation would occupy. Leading
 * `VAR=value` prefixes are stripped so `NOACG_ALLOW_PARALLEL_E2E=1 npm run test:e2e` is still
 * recognised as an npm invocation.
 */
export function commandSegments(text) {
  return stripHeredocBodies(text)
    .split(/&&|\|\||[;|\n]/)
    .map((segment) => segment.trim().replace(/^(?:[A-Za-z_]\w*=\S*\s+)+/, ''));
}

/**
 * PLAN-ONLY invocations. `--list` and `--json` make both `e2e-affected.mjs` and Playwright print
 * what they WOULD run and exit: no dev server, no browser, no memory. Treating them as a suite
 * blocks the cheapest thing a session can do - ask which specs a change selects before deciding
 * whether the run is worth queuing - and it is exactly what someone reaches for while another
 * checkout is busy, which is precisely when the guard fires.
 */
function isPlanOnly(segment) {
  return /(?:^|\s)--(?:list|json)(?:\s|$)/.test(segment);
}

/** Does this command start a Playwright run - through npm, npx, or the affected/focus entry point? */
export function invokesE2e(text) {
  return commandSegments(text).some(
    (segment) =>
      !isPlanOnly(segment) &&
      (/^(?:(?:npm|pnpm)\s+run\s+|yarn\s+)?test:e2e[\w:]*(?:\s|$)/.test(segment) ||
        /^(?:npx\s+)?playwright\s+test(?:\s|$)/.test(segment) ||
        /^node\s+\S*e2e-affected\.mjs(?:\s|$)/.test(segment)),
  );
}

/**
 * Does this command start a catalog sweep or a bench? They cost the same memory as a suite, so
 * they belong in the same mutual exclusion - the guard used to serialise suite-against-suite and
 * then let a sweep start alongside one, which costs exactly as much.
 */
export function invokesSweep(text) {
  const direct = new RegExp(`^node\\s+\\S*scripts[/\\\\](${SWEEP_SCRIPTS})\\.mjs(?:\\s|$)`);
  const viaNpm = /^(?:(?:npm|pnpm)\s+run\s+|yarn\s+)(?:bench|video):[\w:]+(?:\s|$)/;
  return commandSegments(text).some((segment) => direct.test(segment) || viaNpm.test(segment));
}

/**
 * ENQUEUEING IS NOT RUNNING. `npm run queue` / `node scripts/jobs.mjs add` write a job and
 * return an id; the runner drains them strictly one at a time against a budget, which is the
 * mutual exclusion the guard exists to get.
 *
 * It needs saying because the browser-driving payload is an ARGUMENT, and the matchers above
 * split on shell separators without regard for quoting - so `npm run queue -- "… && npx
 * playwright test x"` reads as a Playwright run, and the guard refused it at the one moment
 * queueing is most obviously the right move: something else is already running.
 *
 * Answered off the FIRST segment, where an invocation has to live. **This is a mis-typing
 * guard, not an adversarial one**: `npm run queue -- "…" && playwright test x` is exempted too,
 * because nothing here can tell that trailing half from the quoted payload. Closing that would
 * need a quote-aware splitter, and the rule it protects is about accidental overlap.
 */
export function enqueuesWork(text) {
  const [first = ''] = commandSegments(text);
  return (
    /^(?:(?:npm|pnpm)\s+run\s+|yarn\s+)queue(?::merge)?(?:\s|$)/.test(first) ||
    /^node\s+\S*scripts[/\\]jobs\.mjs\s+add(?:-merge)?(?:\s|$)/.test(first)
  );
}
