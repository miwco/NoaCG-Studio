// The MCP entrance, offline.
//
// `noacg mcp` is one of the three ways an agent reaches the door (docs/AGENT_CLI.md), and until
// this file it was the only one with no test that runs in CI: unit.test.mjs covers the terminal
// entrance, and everything the MCP server does end to end lives in smoke.test.mjs, which skips
// itself whenever no bridge answers. So the surface an installed plugin actually talks to could
// change shape - a tool renamed, an argument dropped, `noacg_caspar` quietly exposed - and every
// green run in this repository would have said nothing.
//
// What is covered is what a fault would make INVISIBLE rather than loud:
//
//   - the TOOL SET is exactly the seven verbs, and `caspar` is NOT among them. That exclusion is
//     a deliberate rule (it drives live playout hardware, which is an operator's decision and not
//     an authoring agent's) and it was prose only. Prose does not fail a build.
//   - every tool carries a title, a description and the arguments the docs promise, because an
//     agent picks a tool by reading them; a tool whose `path` argument vanished would still list.
//   - the server identifies itself as `noacg` at the package's own version - what an MCP client
//     shows the user, and what the plugin manifests are stamped from.
//   - `noacg_docs` answers WITHOUT a deployment. It is the one tool that reads the shipped skill
//     off disk, so an agent can learn the contract before it has a bridge, a browser or a key -
//     and a refactor that routed it through the bridge would break that silently.
//   - the doc topics are also resources, and an unknown topic is an error rather than a hang.
//
// Nothing here starts a browser or reaches a deployment: NOACG_URL points at a closed port, and
// only the tools that need no bridge are ever CALLED.
//
// Run `npm run build` first - this drives the built `dist/`.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { cliVersion } from '../dist/config.js';
import { docTopics } from '../dist/commands/docs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'dist', 'index.js');

/** The tools the door exposes, and the exact arguments each one promises. */
const EXPECTED_TOOLS = {
  noacg_types: { required: [], optional: [] },
  noacg_scaffold: { required: ['out'], optional: ['type', 'design', 'fields', 'name', 'values', 'palette', 'font', 'zone'] },
  noacg_validate: { required: ['path'], optional: ['bench', 'houseContract', 'screenshots'] },
  noacg_inspect: { required: ['path'], optional: [] },
  noacg_screenshot: { required: ['path'], optional: ['state', 'data'] },
  noacg_docs: { required: ['topic'], optional: [] },
  noacg_save: { required: ['path'], optional: ['name', 'folder', 'bench'] },
};

/** Connect a real MCP client to `noacg mcp` over stdio, run `fn`, always close. */
async function withServer(fn) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'mcp'],
    // A closed port, so any tool that tried to reach a deployment would fail fast rather than
    // quietly driving the developer's own studio.
    env: { ...process.env, NOACG_URL: 'http://127.0.0.1:1', NOACG_AGENT_KEY: '' },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'noacg-cli-test', version: '0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

// ------------------------------------------------------------------ the tool set

test('the MCP server exposes exactly the seven authoring verbs', async () => {
  const names = await withServer(async (client) => (await client.listTools()).tools.map((t) => t.name).sort());
  assert.deepEqual(names, Object.keys(EXPECTED_TOOLS).sort());
});

test('caspar is not exposed: it drives live playout hardware, which is not an authoring verb', async () => {
  const names = await withServer(async (client) => (await client.listTools()).tools.map((t) => t.name));
  for (const name of names) {
    assert.ok(!/caspar/i.test(name), `${name} would put live playout in an authoring agent's hands`);
  }
});

test('every tool states what it is and takes the arguments the docs promise', async () => {
  const tools = await withServer(async (client) => (await client.listTools()).tools);
  for (const tool of tools) {
    const expected = EXPECTED_TOOLS[tool.name];
    assert.ok(expected, `${tool.name} is exposed but undocumented here`);
    assert.ok(tool.title && tool.title.length > 0, `${tool.name} has no title`);
    assert.ok(tool.description && tool.description.length > 40, `${tool.name} has no usable description`);

    const schema = tool.inputSchema ?? {};
    const properties = Object.keys(schema.properties ?? {}).sort();
    const required = [...(schema.required ?? [])].sort();
    assert.deepEqual(required, [...expected.required].sort(), `${tool.name}: required arguments changed`);
    assert.deepEqual(properties, [...expected.required, ...expected.optional].sort(), `${tool.name}: arguments changed`);
  }
});

test('the server names itself noacg at the version the release tags', async () => {
  const info = await withServer(async (client) => client.getServerVersion());
  assert.equal(info.name, 'noacg');
  assert.equal(info.version, cliVersion());
});

// ------------------------------------------------------------------ the contract, with no bridge

test('noacg_docs answers off the shipped skill - no deployment, no browser, no key', async () => {
  const result = await withServer(async (client) => client.callTool({ name: 'noacg_docs', arguments: { topic: 'contract' } }));
  assert.notEqual(result.isError, true, 'noacg_docs must not need a deployment');
  assert.equal(result.content[0].type, 'text');
  assert.ok(result.content[0].text.length > 500, 'the contract reference came back empty');
});

test('an unknown doc topic is an error that names the topics, not a hang', async () => {
  const result = await withServer(async (client) => client.callTool({ name: 'noacg_docs', arguments: { topic: 'no-such-topic' } }));
  assert.equal(result.isError, true);
  const said = result.content.map((c) => c.text ?? '').join('\n');
  for (const topic of docTopics()) assert.ok(said.includes(topic), `the refusal should name "${topic}"`);
});

test('every doc topic is also a resource, so a client can read the contract without a tool call', async () => {
  const uris = await withServer(async (client) => (await client.listResources()).resources.map((r) => r.uri).sort());
  assert.deepEqual(uris, docTopics().map((t) => `noacg://docs/${t}`).sort());
});

test('a resource returns the same markdown the tool does', async () => {
  const [viaResource, viaTool] = await withServer(async (client) => [
    await client.readResource({ uri: 'noacg://docs/package' }),
    await client.callTool({ name: 'noacg_docs', arguments: { topic: 'package' } }),
  ]);
  assert.equal(viaResource.contents[0].mimeType, 'text/markdown');
  assert.equal(viaResource.contents[0].text, viaTool.content[0].text);
});
