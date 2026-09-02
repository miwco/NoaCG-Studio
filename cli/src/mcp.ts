// `noacg mcp` - the CLI as an MCP server over stdio, for Claude Code, Codex, Cursor or any MCP
// client. ONE tool, `noacg`, with the terminal's own grammar: `command` is the verb, the other
// arguments are the verb's flags. One warm browser + bridge page for the life of the process;
// screenshots come back as image content so the agent SEES the frame it is judging.
//
// Why one tool and not seven. An MCP client puts every tool's schema into the model's context in
// EVERY session where the server is configured, whether or not that session is about NoaCG. Seven
// tools with teaching descriptions measured about 1,160 tokens of system prompt
// (docs/backlog/cli-mcp-startup-weight.md); one tool with dispatch-only descriptions is about a
// quarter of that, and a new verb costs one enum entry rather than a schema. The teaching lives in
// the noacg-graphic skill and its references (`docs`), which load only when a graphic is being
// made. Keep the descriptions here short and about DISPATCH - which verb, which argument - never
// about how to design.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import { z } from 'zod';
import { BridgeClient } from './bridgeClient.js';
import { closeBrowser } from './browser.js';
import { cliVersion } from './config.js';
import { describeInspection } from './commands/inspect.js';
import { docTopics, readDoc } from './commands/docs.js';
import { scaffoldRequestFrom } from './commands/scaffold.js';
import { savePackage } from './commands/save.js';
import { describeValidation } from './commands/validate.js';
import { ografBench } from './ografBench.js';
import { EXIT_OK, parseArgs, type Out, type ParsedArgs } from './output.js';
import { shoot } from './screenshot.js';
import { isEmptyDir, packageEntries, readPackageInput, unzipTo } from './workspace.js';

/** The verbs the tool speaks - the authoring verbs of the terminal, in the order the loop uses
 *  them. `caspar` is deliberately absent: it drives live playout hardware, which is an operator's
 *  decision and not an authoring agent's (pinned by cli/test/mcp.test.mjs). */
export const MCP_COMMANDS = ['types', 'scaffold', 'validate', 'inspect', 'screenshot', 'docs', 'save'] as const;
export type McpCommand = (typeof MCP_COMMANDS)[number];

/** The tool's arguments. Every one names the verbs that read it, so the model can dispatch from
 *  the schema alone; the skill carries the longer explanations. */
const INPUT = {
  command: z.enum(MCP_COMMANDS).describe('types: the graphic types NoaCG knows | scaffold: write a package | validate: gate + runtime bench, regenerates the package | inspect: the operator surface | screenshot: one frame, as an image | docs: a reference text | save: validate, then into the user\'s NoaCG library'),
  path: z.string().optional().describe('validate/inspect/screenshot/save: package dir or .zip'),
  out: z.string().optional().describe('scaffold: an empty or new dir'),
  type: z.string().optional().describe('scaffold: a type id (see types)'),
  design: z.string().optional().describe('scaffold: a design id, or "neutral"'),
  fields: z.string().optional().describe('scaffold, typeless: "Label:kind[=value],..."; kinds text|lines|number|color|select|toggle|image; select options as Label:select=a|b|c'),
  name: z.string().optional().describe('scaffold: the graphic\'s name; save: the library name'),
  values: z.record(z.string()).optional().describe('scaffold: starting values by field key'),
  palette: z.string().optional().describe('scaffold'),
  font: z.string().optional().describe('scaffold'),
  zone: z.string().optional().describe('scaffold'),
  bench: z.boolean().optional().describe('validate/save: live runtime bench (default true)'),
  houseContract: z.boolean().optional().describe('validate: editability contract as errors (default true)'),
  screenshots: z.boolean().optional().describe('validate: return off/onair/stress frames as images'),
  state: z.enum(['off', 'onair', 'stress']).optional().describe('screenshot (default onair)'),
  data: z.record(z.string()).optional().describe('screenshot: explicit field values'),
  topic: z.string().optional().describe(`docs: ${docTopics().join('|')}`),
  folder: z.string().optional().describe('save: a library folder'),
};
type Input = z.infer<z.ZodObject<typeof INPUT>>;

type Content = Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
type Result = { content: Content; isError?: boolean };

let shared: BridgeClient | null = null;
async function bridge(): Promise<BridgeClient> {
  if (shared) return shared;
  shared = await BridgeClient.connect();
  return shared;
}

const text = (s: string): Content => [{ type: 'text', text: s }];
const image = (png: Uint8Array): Content[number] => ({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' });
const refuse = (s: string): Result => ({ content: text(s), isError: true });

/** An argument the verb cannot do without - the terminal's usage error, in the tool's words. */
function need<K extends keyof Input>(input: Input, key: K): NonNullable<Input[K]> {
  const value = input[key];
  if (value === undefined || value === '') throw new Error(`noacg ${input.command} needs "${key}".`);
  return value as NonNullable<Input[K]>;
}

async function types(): Promise<Result> {
  const b = await bridge();
  return { content: text(JSON.stringify(await b.types(), null, 2)) };
}

async function scaffold(input: Input): Promise<Result> {
  const out = need(input, 'out');
  const argv: string[] = ['scaffold', '--out', out];
  if (input.type) argv.push('--type', input.type);
  if (input.design) argv.push('--design', input.design);
  if (input.fields) argv.push('--fields', input.fields);
  if (input.name) argv.push('--name', input.name);
  for (const [k, v] of Object.entries(input.values ?? {})) argv.push('--set', `${k}=${v}`);
  if (input.palette) argv.push('--palette', input.palette);
  if (input.font) argv.push('--font', input.font);
  if (input.zone) argv.push('--zone', input.zone);
  const args = parseArgs(argv);
  if (!(await isEmptyDir(out))) return refuse(`${out} is not empty - scaffold into a new directory.`);
  const b = await bridge();
  const { template, notes } = await b.scaffold(scaffoldRequestFrom(args));
  const files = await unzipTo(await b.exportPackage(template), out);
  return { content: text(`Scaffolded "${template.name}" (${template.type}) into ${path.resolve(out)}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n\nFiles:\n${files.map((f) => `  ${f}`).join('\n')}`) };
}

async function validate(input: Input): Promise<Result> {
  const target = need(input, 'path');
  const b = await bridge();
  const { bytes, fileName, isDirectory } = await readPackageInput(target);
  const pkg = await b.readPackage(bytes, fileName);
  if (!pkg.imported) {
    // A third-party OGraf package: manifest conformance + a host-driven lifecycle check.
    const read = pkg.ograf!;
    const result = await ografBench(b, read, await packageEntries(bytes), { screenshot: !!input.screenshots });
    const errors = [...read.errors.map((e) => `ograf-manifest: ${e}`), ...result.errors];
    const content: Content = text(`${errors.length ? 'FAIL' : 'OK'} - third-party OGraf Graphic ${String(read.manifest.id ?? '')}\n${errors.map((e) => `- ERROR ${e}`).join('\n')}\nHost: ${result.steps.map((s) => `${s.action} -> ${s.statusCode}`).join(', ')}\n${describeInspection({ ...read.contract, stateGroups: [] })}`);
    if (result.screenshot) content.push(image(result.screenshot));
    return { content, isError: errors.length > 0 };
  }
  const normalized = await b.normalize(pkg.imported.template);
  const template = normalized.template;
  const validation = await b.validate(template, { bench: input.bench ?? true, houseContract: input.houseContract ?? true });
  const content: Content = text(describeValidation(validation) + (normalized.converted || !normalized.dataRegion ? `\nNormalize: ${normalized.note}` : ''));
  let thumbnail: { png: Uint8Array; width: number; height: number } | undefined;
  if (input.screenshots) {
    const size = { width: template.resolution.width, height: template.resolution.height };
    for (const state of ['off', 'onair', 'stress'] as const) {
      const png = await shoot(b.bench, b.origin, await b.compose(template, state), undefined, size);
      content.push({ type: 'text', text: `${state}:` }, image(png));
      if (state === 'onair') thumbnail = { png, ...size };
    }
  }
  if (isDirectory) {
    await unzipTo(await b.exportPackage(template, thumbnail ? { thumbnail } : {}), path.resolve(target));
    content.push({ type: 'text', text: `Regenerated the package in ${path.resolve(target)}.` });
  }
  return { content, isError: !validation.ok };
}

async function inspect(input: Input): Promise<Result> {
  const target = need(input, 'path');
  const b = await bridge();
  const { bytes, fileName } = await readPackageInput(target);
  const pkg = await b.readPackage(bytes, fileName);
  const inspection = pkg.imported ? await b.inspect({ template: pkg.imported.template }) : await b.inspect({ manifest: pkg.ograf?.manifest });
  return { content: text(describeInspection(inspection)) };
}

async function screenshot(input: Input): Promise<Result> {
  const target = need(input, 'path');
  const b = await bridge();
  const { bytes, fileName } = await readPackageInput(target);
  const pkg = await b.readPackage(bytes, fileName);
  if (!pkg.imported) return refuse('Screenshots of a third-party OGraf package come from validate with screenshots: true.');
  const t = pkg.imported.template;
  const png = await shoot(b.bench, b.origin, await b.compose(t, input.data ?? input.state ?? 'onair'), undefined, { width: t.resolution.width, height: t.resolution.height });
  return { content: [image(png)] };
}

async function docs(input: Input): Promise<Result> {
  return { content: text(await readDoc(need(input, 'topic'))) };
}

async function save(input: Input): Promise<Result> {
  const target = need(input, 'path');
  const b = await bridge();
  const outcome = await savePackage(target, { name: input.name, folder: input.folder, bench: input.bench ?? true }, b, () => undefined);
  const lines: string[] = [];
  if (outcome.validation) lines.push(describeValidation(outcome.validation as Parameters<typeof describeValidation>[0]));
  lines.push(outcome.ok ? `Saved "${outcome.name}" to the NoaCG library -> ${outcome.url}` : (outcome.error ?? 'Not saved.'));
  return { content: text(lines.join('\n\n')), isError: !outcome.ok };
}

const VERBS: Record<McpCommand, (input: Input) => Promise<Result>> = { types, scaffold, validate, inspect, screenshot, docs, save };

export async function runMcp(_args: ParsedArgs, _out: Out): Promise<number> {
  const server = new McpServer({ name: 'noacg', version: cliVersion() });

  server.registerTool(
    'noacg',
    {
      title: 'NoaCG broadcast graphics',
      description: 'NoaCG Studio broadcast graphics (lower third, scoreboard, ticker, countdown, any on-air graphic; SPX / CasparCG / OGraf packages): make, check and save one. The verbs of the `noacg` terminal CLI; the noacg-graphic skill is the procedure, docs "contract" the rulebook.',
      inputSchema: INPUT,
    },
    async (input) => {
      try {
        return await VERBS[input.command](input);
      } catch (e) {
        // A usage error, an IO error or the bridge refusing: the terminal's exit 2, as a tool error
        // the model can read and correct. Anything else that throws is a bug, and the SDK reports
        // it the same way, so nothing is hidden by catching here.
        return refuse(e instanceof Error ? e.message : String(e));
      }
    },
  );

  for (const topic of docTopics()) {
    server.registerResource(`docs-${topic}`, `noacg://docs/${topic}`, { title: `NoaCG ${topic}`, mimeType: 'text/markdown' }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: await readDoc(topic) }],
    }));
  }

  const transport = new StdioServerTransport();
  const shutdown = async () => {
    await shared?.close().catch(() => undefined);
    await closeBrowser();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.stdin.on('end', shutdown);
  await server.connect(transport);
  // Keep the process alive until the transport ends.
  await new Promise<void>(() => undefined);
  return EXIT_OK;
}
