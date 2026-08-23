#!/usr/bin/env node
// `noacg` - the NoaCG Studio command-line tool (docs/AGENT_CLI.md).
//
// An external coding agent's door into NoaCG: scaffold a graphic from a type or a field list,
// validate + bench it (and see it), inspect the operator surface it earns, package it, and -
// with a scoped agent key - save it straight into the user's library (docs/AGENT_SAVE.md). Every
// command drives the deployment's own /bridge page through a contained headless browser; nothing
// here re-implements the studio. `--json` on any command prints one JSON object on stdout for an
// agent to parse.

import { closeBrowser } from './browser.js';
import { cliVersion } from './config.js';
import { EXIT_OK, EXIT_USAGE, Out, parseArgs, UsageError, type ParsedArgs } from './output.js';
import { runDoctor } from './commands/doctor.js';
import { runTypes } from './commands/types.js';
import { runScaffold } from './commands/scaffold.js';
import { runValidate } from './commands/validate.js';
import { runInspect } from './commands/inspect.js';
import { runScreenshot } from './commands/screenshot.js';
import { runPack } from './commands/pack.js';
import { runDocs } from './commands/docs.js';
import { runLogin } from './commands/login.js';
import { runLogout } from './commands/logout.js';
import { runWhoami } from './commands/whoami.js';
import { runSave } from './commands/save.js';
import { runMcp } from './mcp.js';

const USAGE = `noacg v${cliVersion()} - make broadcast graphics for NoaCG Studio from your terminal.

Usage: noacg <command> [options]   (add --json to any command for machine-readable output)

  doctor                         What browser and which NoaCG deployment (NOACG_URL) will be used.
  types                          The graphic types NoaCG knows: fields, events, designs, neutral scaffold.
  scaffold --type <id> [--design <id>|neutral] [--name N] [--set key=value]... --out <dir>
  scaffold --fields "Label:kind[=value],..." [--name N] --out <dir>
  validate <dir|zip> [--no-bench] [--no-house-contract] [--screenshots <dir>]
  inspect <dir|zip>              The operator surface NoaCG derives from the graphic's own contract.
  screenshot <dir|zip> --state off|onair|stress [--data k=v]... --out <png>
  pack <dir|zip>... --out <file.noacgpack.json> [--layer n]...
  docs [contract|package|validator|control|design-notes]
  login [--name N] [--no-browser] [--key <noacg_ak_...>]
                                 Get a scoped agent key for this machine (opens the consent page).
  logout [--local]               Revoke and forget this machine's key.
  whoami                         Which key this machine holds, and whether it is still valid.
  save <dir|zip> [--name N] [--folder F] [--no-bench]
                                 Validate, then put the graphic in your NoaCG library.
  mcp                            Run as an MCP server over stdio.

Environment: NOACG_URL (default https://noacg.studio), NOACG_BROWSER (a Chromium executable),
             NOACG_AGENT_KEY (a key for CI - beats the stored one).
Exit codes: 0 clean, 1 findings / refused, 2 usage or IO error.`;

type Command = (args: ParsedArgs, out: Out) => Promise<number>;

const COMMANDS: Record<string, Command> = {
  doctor: runDoctor,
  types: runTypes,
  scaffold: runScaffold,
  validate: runValidate,
  inspect: runInspect,
  screenshot: runScreenshot,
  pack: runPack,
  docs: runDocs,
  mcp: runMcp,
  login: runLogin,
  logout: runLogout,
  whoami: runWhoami,
  save: runSave,
};

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const out = new Out(args.flags.json === true);
  const name = args._[0];
  if (args.flags.version === true || name === 'version') {
    out.result({ ok: true, version: cliVersion() });
    out.say(cliVersion());
    return EXIT_OK;
  }
  if (!name || args.flags.help === true || name === 'help') {
    out.say(USAGE);
    return name ? EXIT_OK : EXIT_USAGE;
  }
  const command = COMMANDS[name];
  if (!command) {
    out.say(`Unknown command "${name}".\n\n${USAGE}`);
    return EXIT_USAGE;
  }
  try {
    return await command(args, out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (out.json) out.result({ ok: false, error: message });
    out.log(`noacg: ${message}`);
    return e instanceof UsageError ? EXIT_USAGE : EXIT_USAGE;
  } finally {
    if (name !== 'mcp') await closeBrowser();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    process.stderr.write(`noacg: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = EXIT_USAGE;
  },
);
