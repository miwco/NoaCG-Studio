#!/usr/bin/env node
// `noacg` - the NoaCG Studio command-line tool (docs/AGENT_CLI.md).
//
// An external coding agent's door into NoaCG: scaffold a graphic from a type or a field list,
// validate + bench it (and see it), inspect the operator surface it earns, package it, and -
// in the next release - save it straight into the user's library. Every command drives the
// deployment's own /bridge page through a contained headless browser; nothing here re-implements
// the studio. `--json` on any command prints one JSON object on stdout for an agent to parse.

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
  login | logout | whoami | save  (next release)
  mcp                            Run as an MCP server over stdio.

Environment: NOACG_URL (default https://noacg.studio), NOACG_BROWSER (a Chromium executable).
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
  login: notYet,
  logout: notYet,
  whoami: notYet,
  save: notYet,
};

async function notYet(args: ParsedArgs, out: Out): Promise<number> {
  out.say(`\`noacg ${args._[0]}\` is not available in this version - it lands in the next release together with the scoped agent key (docs/AGENT_CLI.md, P2). Until then: zip the package folder and drop it on the studio's Import door.`);
  return EXIT_USAGE;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const out = new Out(args.flags.json === true);
  const name = args._[0];
  if (!name || args.flags.help === true || name === 'help') {
    out.say(USAGE);
    return name ? EXIT_OK : EXIT_USAGE;
  }
  if (name === '--version' || args.flags.version === true) {
    out.say(cliVersion());
    return EXIT_OK;
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
