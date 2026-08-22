// `noacg mcp` - the same verbs as an MCP server over stdio, for Claude Code, Codex, Cursor or any
// MCP client. One warm browser + bridge page for the life of the process; screenshots come back
// as image content so the agent SEES the frame it is judging.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'node:fs';
import os from 'node:os';
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

type Content = Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;

let shared: BridgeClient | null = null;
async function bridge(): Promise<BridgeClient> {
  if (shared) return shared;
  shared = await BridgeClient.connect();
  return shared;
}

const text = (s: string): Content => [{ type: 'text', text: s }];
const image = (png: Uint8Array): Content[number] => ({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' });

export async function runMcp(_args: ParsedArgs, _out: Out): Promise<number> {
  const server = new McpServer({ name: 'noacg', version: cliVersion() });

  server.registerTool(
    'noacg_types',
    { title: 'NoaCG graphic types', description: 'The graphic types the NoaCG deployment knows: fields (key, label, kind, role), operator events, designs, and whether a neutral scaffold exists. Optional - a graphic may be authored from scratch against the contract (noacg_docs contract).', inputSchema: {} },
    async () => {
      const b = await bridge();
      const types = await b.types();
      return { content: text(JSON.stringify(types, null, 2)) };
    },
  );

  server.registerTool(
    'noacg_scaffold',
    {
      title: 'Scaffold a NoaCG graphic package',
      description: 'Write a complete, valid graphic package into an empty directory: from a type (design = a catalog chassis id, or "neutral" for the type\'s fields/machine/runtime on a plain spine), or typeless from a field list. The sources (html/css/js) are yours to design; the generated half is rebuilt by noacg_validate.',
      inputSchema: {
        out: z.string().describe('An empty or new directory to write the package into'),
        type: z.string().optional().describe('A graphic type id from noacg_types'),
        design: z.string().optional().describe('A design id of that type, or "neutral"'),
        fields: z.string().optional().describe('Typeless: "Label:kind[=value],..." with kinds text|lines|number|color|select|toggle|image (select options as Label:select=a|b|c)'),
        name: z.string().optional(),
        values: z.record(z.string()).optional().describe('Starting values by the type\'s logical field keys'),
        palette: z.string().optional(),
        font: z.string().optional(),
        zone: z.string().optional(),
      },
    },
    async (input) => {
      const argv: string[] = ['scaffold', '--out', input.out];
      if (input.type) argv.push('--type', input.type);
      if (input.design) argv.push('--design', input.design);
      if (input.fields) argv.push('--fields', input.fields);
      if (input.name) argv.push('--name', input.name);
      for (const [k, v] of Object.entries(input.values ?? {})) argv.push('--set', `${k}=${v}`);
      if (input.palette) argv.push('--palette', input.palette);
      if (input.font) argv.push('--font', input.font);
      if (input.zone) argv.push('--zone', input.zone);
      const args = parseArgs(argv);
      if (!(await isEmptyDir(input.out))) return { content: text(`${input.out} is not empty - scaffold into a new directory.`), isError: true };
      const b = await bridge();
      const { template, notes } = await b.scaffold(scaffoldRequestFrom(args));
      const files = await unzipTo(await b.exportPackage(template), input.out);
      return { content: text(`Scaffolded "${template.name}" (${template.type}) into ${path.resolve(input.out)}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n\nFiles:\n${files.map((f) => `  ${f}`).join('\n')}`) };
    },
  );

  server.registerTool(
    'noacg_validate',
    {
      title: 'Validate (and regenerate) a graphic package',
      description: 'Run NoaCG\'s static gate + live runtime bench on a package (directory or zip), print every finding as a teaching line plus readiness rows, optionally return off/on-air/stress screenshots as images, and regenerate the package\'s generated half from its sources. Fix every ERROR; read WARNINGs as measurements. For a third-party OGraf package: manifest conformance + a host-driven lifecycle check.',
      inputSchema: {
        path: z.string().describe('The package directory or .zip'),
        bench: z.boolean().optional().describe('Run the live runtime bench (default true)'),
        houseContract: z.boolean().optional().describe('Treat the studio editability contract as errors (default true)'),
        screenshots: z.boolean().optional().describe('Return off/onair/stress frames as images (default false)'),
      },
    },
    async (input) => {
      const b = await bridge();
      const { bytes, fileName, isDirectory } = await readPackageInput(input.path);
      const pkg = await b.readPackage(bytes, fileName);
      if (!pkg.imported) {
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
        await unzipTo(await b.exportPackage(template, thumbnail ? { thumbnail } : {}), path.resolve(input.path));
        content.push({ type: 'text', text: `Regenerated the package in ${path.resolve(input.path)}.` });
      }
      return { content, isError: !validation.ok };
    },
  );

  server.registerTool(
    'noacg_inspect',
    { title: 'The operator surface of a graphic', description: 'What NoaCG\'s control panel derives from the graphic\'s own contract: one input per field, one button per action/event, step semantics. Works on a NoaCG package or any OGraf package. No category is consulted.', inputSchema: { path: z.string() } },
    async (input) => {
      const b = await bridge();
      const { bytes, fileName } = await readPackageInput(input.path);
      const pkg = await b.readPackage(bytes, fileName);
      const inspection = pkg.imported ? await b.inspect({ template: pkg.imported.template }) : await b.inspect({ manifest: pkg.ograf?.manifest });
      return { content: text(describeInspection(inspection)) };
    },
  );

  server.registerTool(
    'noacg_screenshot',
    { title: 'One frame of the graphic', description: 'A transparent PNG of the settled graphic: off (before its cue), onair (defaults), stress (every text doubled, numbers widened), or with explicit data.', inputSchema: { path: z.string(), state: z.enum(['off', 'onair', 'stress']).optional(), data: z.record(z.string()).optional() } },
    async (input) => {
      const b = await bridge();
      const { bytes, fileName } = await readPackageInput(input.path);
      const pkg = await b.readPackage(bytes, fileName);
      if (!pkg.imported) return { content: text('Screenshots of a third-party OGraf package come from noacg_validate with screenshots: true.'), isError: true };
      const t = pkg.imported.template;
      const png = await shoot(b.bench, b.origin, await b.compose(t, input.data ?? input.state ?? 'onair'), undefined, { width: t.resolution.width, height: t.resolution.height });
      return { content: [image(png)] };
    },
  );

  server.registerTool(
    'noacg_docs',
    { title: 'NoaCG contract references', description: `The skill's reference texts: ${docTopics().join(', ')}.`, inputSchema: { topic: z.string() } },
    async (input) => ({ content: text(await readDoc(input.topic)) }),
  );

  server.registerTool(
    'noacg_save',
    {
      title: 'Save into the NoaCG library',
      description: 'Validate the package (static gate + runtime bench), and when it has no errors put it in the user\'s NoaCG library with the machine\'s scoped agent key (`noacg login` first). Returns the #/graphic/<id> link. SAVE means the library: it does not publish, add to a production or air anything. No key / no account: zip the folder and use the studio\'s Import door.',
      inputSchema: {
        path: z.string().describe('The package directory or .zip'),
        name: z.string().optional().describe('The library name (default: the template\'s name)'),
        folder: z.string().optional().describe('A library folder to file it under'),
        bench: z.boolean().optional().describe('Run the live runtime bench before saving (default true)'),
      },
    },
    async (input) => {
      const b = await bridge();
      const outcome = await savePackage(input.path, { name: input.name, folder: input.folder, bench: input.bench ?? true }, b, () => undefined);
      const lines: string[] = [];
      if (outcome.validation) lines.push(describeValidation(outcome.validation as Parameters<typeof describeValidation>[0]));
      lines.push(outcome.ok ? `Saved "${outcome.name}" to the NoaCG library -> ${outcome.url}` : (outcome.error ?? 'Not saved.'));
      return { content: text(lines.join('\n\n')), isError: !outcome.ok };
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

/** Scratch space for tool calls that need a file (unused for now; kept for the save path). */
export function scratchDir(): string {
  return path.join(os.tmpdir(), 'noacg-mcp');
}

export { fs };
