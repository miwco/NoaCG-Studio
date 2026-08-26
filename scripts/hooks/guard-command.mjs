// PreToolUse guard for shell commands (the Bash and PowerShell tools). Enforces, cheapest
// check first:
//
//  1. Dev servers go through the Claude preview tools, never a raw shell command - a stray
//     server on this checkout's port is exactly the "reuseExistingServer picks up the wrong
//     env" e2e trap documented in AGENTS.md.
//  2. Commit messages follow the house rules (AGENTS.md "Git"): no Co-Authored-By trailers,
//     no AI/agent/chat-session language, no internal plan codenames.
//  3. Commits never include dist/ or the generated .claude/launch.json.
//  4. The e2e suites only start when (a) no OTHER checkout of this repo is already running one -
//     several worktrees are normally live and each config asks for 4 workers, so two overlapping
//     runs exhaust a 16 GB laptop rather than sharing it - and (b) their port is free, since
//     Playwright would otherwise reuse whatever server is already there, with whatever env it
//     was started with.
//
// The commit-message scan works on the raw command text (the message is embedded in it via
// -m / heredoc / here-string), so it is quoting-style agnostic.

import { spawnSync } from 'node:child_process';
import { readHookInput, deny } from './lib.mjs';
import { devPort, livePort } from '../dev-port.mjs';
import { isPortBusy } from '../port-probe.mjs';
import { activeRuns, describeRuns } from '../e2e-runs.mjs';
import { invokesE2e, invokesSweep } from '../command-match.mjs';

const input = await readHookInput();
const command = input?.tool_input?.command;
if (typeof command !== 'string' || command.length === 0) process.exit(0);

// --- 1. Dev-server policy -----------------------------------------------------------------

const DEV_SERVER_PATTERNS = [
  /\bnpm\s+run\s+dev\b/,
  /\bnpm\s+run\s+preview\b/,
  // A direct vite invocation (bare at a command position, or via npx) that is not `vite build`.
  /(^|[;&|(]\s*|\bnpx\s+)vite\b(?!\s+build\b)(?![.-])/m,
];
if (DEV_SERVER_PATTERNS.some((p) => p.test(command))) {
  deny(
    'Dev servers are managed by the Claude preview tools in this repo, never a raw shell command - ' +
      'a hand-started server on this checkout\'s port makes the e2e suite silently reuse it with the ' +
      'wrong env (see AGENTS.md "Verifying changes" gotchas).\n' +
      'Use preview_start with {name: "dev"} instead - .claude/launch.json already points it at this ' +
      "checkout's port (node scripts/dev-port.mjs prints it). For a production build, run `npm run build`.",
  );
}

// --- 2 + 3. Commit guards ------------------------------------------------------------------

// "git ... commit" within one shell command segment (not across ; | & or newlines).
const isCommit = /\bgit\b[^\n;|&]*\bcommit\b/.test(command);

if (isCommit) {
  // Never allowed, no escape hatch: agent co-author trailers and generated-with footers.
  if (/co-authored-by/i.test(command) || /🤖/u.test(command)) {
    deny(
      'Blocked: commit messages in this repo never carry Co-Authored-By trailers or ' +
        '"Generated with" footers (user rule in AGENTS.md "Git"). Rewrite the message without them.',
    );
  }

  // The em-dash, which is the tell readers actually complain about (owner, 2026-08-26: it is
  // "the one thing people complain about, claiming it's AI-written"). No escape hatch, because
  // a commit subject has never needed one - a plain dash, a comma or a colon always works, and
  // the character is not reachable by accident on any keyboard. Same rule as the copy gate on
  // user-facing text (scripts/check-copy.mjs); a commit message is read by outsiders too.
  if (/—/u.test(command)) {
    deny(
      'Blocked: this commit message contains an em-dash (—). Use a plain dash (-), a comma, or ' +
        'two sentences - the em-dash is the single most common reason a reader decides text was ' +
        'machine-written, and the history is read by outside developers.',
    );
  }

  // House-style violations: AI/agent mentions, chat-session phrases, internal plan codenames.
  // A commit genuinely about AI tooling may mention these - bypass by putting
  // ALLOW_AI_MENTION=1 in the command (any shell syntax; the literal text is what counts).
  const escaped = /ALLOW_AI_MENTION\s*=\s*1/.test(command);
  if (!escaped) {
    const STYLE_VIOLATIONS = [
      // (?![./\\-]) lets file/branch/path references through: CLAUDE.md, .claude/,
      // claude/branch-name, and Windows paths like C:\claude\repo (backslash separator).
      [/\bclaude\b(?![./\\-])/i, 'mentions Claude'],
      [/\bcodex\b/i, 'mentions Codex'],
      [/\bchatgpt\b/i, 'mentions ChatGPT'],
      [/\bcopilot\b/i, 'mentions Copilot'],
      [/\banthropic\b/i, 'mentions Anthropic'],
      [/\bopenai\b/i, 'mentions OpenAI'],
      [/\bas requested\b/i, 'chat phrase "as requested"'],
      [/\bas instructed\b/i, 'chat phrase "as instructed"'],
      [/\bper (?:your|the|my) instruction/i, 'chat phrase "per ... instructions"'],
      [/\bthis session\b/i, 'chat phrase "this session"'],
      [/\bthis conversation\b/i, 'chat phrase "this conversation"'],
      [/\bcontinued work\b/i, 'vague phrase "continued work"'],
      [/\bmade changes\b/i, 'vague phrase "made changes"'],
      [/\bai update\b/i, 'vague phrase "AI update"'],
      [/\bera[ -]?\d/i, 'internal era codename'],
      [/\bT\d\.\d\b/, 'internal plan codename (T3.5-style)'],
    ];
    const hits = STYLE_VIOLATIONS.filter(([pattern]) => pattern.test(command)).map(([, why]) => why);
    if (hits.length > 0) {
      deny(
        `Blocked: this commit command trips the commit-message style rules (AGENTS.md "Git"): ${hits.join('; ')}.\n` +
          'Messages must read as written by a human developer for an outside reader - no AI/agent/chat ' +
          'language, no internal codenames. If a mention is deliberate because the commit is genuinely ' +
          'about AI tooling, include ALLOW_AI_MENTION=1 in the command to bypass this check.',
      );
    }
  }

  // Staged-content check: dist/ and the generated launch.json are never committed. Both are
  // gitignored, so reaching the index takes a force-add - catch it here. `git commit -a`
  // also sweeps in unstaged tracked changes, so scan those too when -a/--all is present.
  const staged = gitLines(['diff', '--cached', '--name-only']);
  const sweepsTracked = /\bgit\b[^\n;|&]*\bcommit\b[^\n;|&]*(\s--all\b|\s-(?!-)[a-zA-Z]*a)/.test(command);
  const candidates = sweepsTracked ? staged.concat(gitLines(['diff', '--name-only'])) : staged;
  const forbidden = candidates.filter((f) => f.startsWith('dist/') || f === '.claude/launch.json');
  if (forbidden.length > 0) {
    deny(
      `Blocked: this commit would include generated files that never go into the repo: ${[...new Set(forbidden)].join(', ')}.\n` +
        'dist/ is build output and .claude/launch.json is regenerated per-checkout by postinstall. ' +
        'Unstage them (git restore --staged <path>) and commit again.',
    );
  }
}

// --- 4. Heavy browser work: one job per MACHINE ----------------------------------------------

// 4a. Nothing that drives a pile of headless Chromium may start while another such job is
//     running - an e2e suite, a catalog sweep, or a bench, in ANY checkout. They are the same
//     workload under different names: a dev server plus browsers, on a box measured to run out
//     of memory at around six browser workers. Two at once produced 59 live browser shells,
//     10.9 GB held by the test processes and available RAM down to 35 MB, at which point every
//     foreground app is being paged out. Neither job is at fault; the overlap is, and no
//     session can see it from inside its own checkout.
//     Serialising costs nothing: two jobs sharing one box do not finish sooner than two run
//     back to back, they only make everything else unusable while they do it.
if (invokesE2e(command) || invokesSweep(command)) {
  //   A command that already routes through the waiter serialises itself, so it is exempt:
  //   blocking it would be refusing the very fix this rule recommends.
  const selfQueuing = /e2e-runs\.mjs\s+--wait/.test(command) || /\btest:e2e[\w:]*:queued\b/.test(command);
  const others = selfQueuing ? [] : activeRuns({ exclude: process.cwd() });
  if (others.length > 0 && !/NOACG_ALLOW_PARALLEL_E2E\s*=\s*1/.test(command)) {
    deny(
      `Blocked: browser-driving work is already running on this machine:\n${describeRuns(others)}\n` +
        'A suite, a catalog sweep and a bench all cost the same memory, and two at once exhaust it ' +
        'rather than sharing it (see AGENTS.md "Verifying changes" gotchas).\n' +
        'Wait for it with `node scripts/e2e-runs.mjs --wait` (it blocks until clear, then exits 0), ' +
        'or queue an e2e run behind it with `npm run test:e2e:queued` / `npm run test:e2e:focus:queued`.\n' +
        'If the overlap is genuinely wanted, include NOACG_ALLOW_PARALLEL_E2E=1 in the command.',
    );
  }
}

// 4b. The port check applies to e2e runs only - a sweep starts its own server on the same port
//     but is not subject to reuseExistingServer's env-pinning trap.
if (invokesE2e(command)) {
  const live = /\btest:e2e:live\b/.test(command) || /playwright\.live\.config/.test(command);
  const port = live ? livePort() : devPort();
  if (await isPortBusy(port, 750)) {
    deny(
      `Blocked: something is already listening on port ${port} - this checkout's ${live ? 'live' : 'offline'} ` +
        'e2e port. Playwright runs with reuseExistingServer:true, so it would reuse that server with ' +
        `whatever env it was started with, and the ${live ? 'configured-mode' : 'offline-pinned'} specs ` +
        'fail confusingly (see AGENTS.md "Verifying changes" gotchas).\n' +
        'Stop that server first (preview_stop if it was started with the preview tools), then re-run. ' +
        'If a killed run left it behind, nothing owns it and there is nothing to stop it FROM - ' +
        '`node scripts/e2e-runs.mjs --orphans` says whether that is the case, and `--kill-orphans` ' +
        'closes it.\n' +
        "Servers in other worktrees are harmless - they live on their own ports.",
    );
  }
}

process.exit(0);

/**
 * Does this command actually START an e2e run, as opposed to merely mentioning one?
 *
 * Matching the bare string anywhere in the text was wrong in a way that bites daily: `grep -n
 * "npm run test:e2e" AGENTS.md` contains the phrase and starts nothing, and denying it teaches
 * everyone to route around the guard. So the check is positional - the command is split on
 * shell separators and each segment is tested at its FIRST token, where an invocation has to
 * live. A quoted argument is never in that position, which is exactly the distinction we want.
 */
/** Run git with the given args in this checkout and return stdout as trimmed lines. */
function gitLines(args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.status !== 0 || typeof res.stdout !== 'string') return []; // fail open - git itself will complain
  return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}
