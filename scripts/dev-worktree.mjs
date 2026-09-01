// START THE DEV SERVER FOR *THIS* CHECKOUT - the sanctioned path in a linked worktree.
//
// WHY THIS EXISTS. `npm run dev` is refused by scripts/hooks/guard-command.mjs, and the
// alternative that refusal used to name - `preview_start {name: "dev"}` - does not reach a
// linked worktree. Measured 2026-09-01 from `.claude/worktrees/agent-a32e0b6091a2fe4bb`
// (reserved port 5256), one call, three different checkouts in the answer:
//
//   - it spawned `npm run dev` with cwd `.claude/worktrees/new-session-64a3f6` - the LAUNCHING
//     session's checkout, not the one the work is in;
//   - it reported `port: 5174` - the PRIMARY checkout's number, from neither of the above;
//   - Vite actually bound 5240 - the reservation of the checkout it was spawned in, because
//     vite.config.ts resolves the port from its own location and that part is correct;
//   - nothing ever answered on the reported port, so the harness reaped the server about two
//     minutes later. Net result: no server at all, and the only URL the session was handed
//     pointed at a checkout it was not working in.
//
// So a worktree session had no correct way to drive its own build: the guard refused the direct
// route and the sanctioned route served somebody else's tree. That is the "green gate on the
// wrong tree" shape the root AGENTS.md calls worse than a red one, and it has already been paid
// for - the 2026-08-29 SVG import sweep measured main's importer rather than the branch's and
// said so in its own report (docs/backlog/svg-import-sweep-findings.md).
//
// WHAT KEEPS THE REFUSAL HONEST. The guard refuses hand-started servers for a real reason:
// Playwright runs with `reuseExistingServer: true`, so a stray server on a checkout's port is
// silently adopted along with whatever env it was started with. This script does not widen that
// rule, it is the rule made mechanical:
//
//   - the checkout is resolved from THIS FILE's location, never `process.cwd()`, so the copy
//     that ships in a worktree can only ever serve that worktree;
//   - the port is that checkout's RESERVATION (scripts/dev-port.mjs) - the same number Vite,
//     both Playwright configs, the guard hook and every dev script derive, with no second
//     source of it;
//   - it REFUSES when that port is already busy, which is the actual hazard the guard names.
//
// The only server it can start is therefore the one the suite would have started anyway, on the
// port the suite already expects, in the checkout the work is in. It runs in the FOREGROUND so
// the shell that started it owns it (background it with the tool's own backgrounding, then stop
// it by stopping that task); if it is ever abandoned, `node scripts/e2e-runs.mjs --orphans`
// finds it like any other, because it spawns the real `vite/bin/vite.js`.
//
// CLI:
//   node scripts/dev-worktree.mjs        start the server for this checkout (npm run dev:worktree)
//   node scripts/dev-worktree.mjs --print  print where it WOULD serve, start nothing

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devPorts, writeLaunchConfig } from './dev-port.mjs';
import { isPortBusy } from './port-probe.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const record = devPorts();
const url = `http://localhost:${record.port}`;

/** The lines every path prints: which tree, which port, and what to hand a sweep. */
function where() {
  return [
    `Checkout:  ${record.root}`,
    `Dev port:  ${record.port} (${record.source})`,
    `App:       ${url}/app`,
    `Sweeps:    --base ${url}   (e.g. node scripts/svg-import-sweep.mjs --base ${url})`,
  ].join('\n');
}

if (process.argv.includes('--print')) {
  console.log(where());
  process.exit(0);
}

// The reservation is this checkout's identity, so a busy port is never "just pick another one":
// Playwright, the sweeps and the guard hook all expect the server on THIS number. Something else
// being there means either a second server for this checkout or a stale one carrying somebody
// else's env - the exact condition the e2e trap needs, and the one thing that must stop us.
if (await isPortBusy(record.port, 750)) {
  console.error(
    `Port ${record.port} is already busy - that is this checkout's reserved dev port, so ` +
      'something is already serving (or squatting) the number every other tool here expects.\n' +
      `  ${record.root}\n` +
      `If it is your own server, it is already the right one - use ${url}/app.\n` +
      'If you do not know whose it is:\n' +
      '  node scripts/dev-port.mjs --list        who holds which reservation\n' +
      '  node scripts/e2e-runs.mjs --orphans     a server a killed run left behind\n' +
      '  node scripts/e2e-runs.mjs --kill-orphans  close those, freeing the port\n' +
      'Never kill a server you cannot attribute - move this checkout instead with ' +
      '`node scripts/dev-port.mjs --release` (docs/DEV_PORTS.md "Troubleshooting").',
  );
  process.exit(1);
}

// Keep the generated preview config in step with the reservation. Harmless when it is already
// current (the writer is change-only), and it costs nothing to leave the file truthful.
writeLaunchConfig();

// Resolve Vite rather than hardcoding `<repoRoot>/node_modules`: a linked worktree may have no
// node_modules of its own and resolve every dependency by walking up to the primary checkout's.
// Which copy of the BINARY runs does not affect which tree is served - Vite's cwd decides that,
// and that is repoRoot below - but a hardcoded path would fail on a checkout where nothing is
// actually missing (the same trap scripts/check-workflows.mjs records).
let viteBin;
try {
  viteBin = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
} catch {
  console.error('Could not resolve Vite. Run `npm install` in this checkout first.');
  process.exit(1);
}

console.log(`${where()}\n`);

// Spawn the bin with THIS Node rather than through npm: one fewer shim in the launch chain, and
// the command line then carries `vite/bin/vite.js`, which is what `e2e-runs.mjs --orphans`
// recognises a dev server by.
//
// CI=1 is this repo's own switch for "do not pop a browser window" - vite.config.ts reads it for
// exactly one thing, `server.open` - and a server started from a tool call must not steal the
// desktop. An explicitly set CI is left alone.
const child = spawn(process.execPath, [viteBin], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, CI: process.env.CI ?? '1' },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
