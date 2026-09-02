// The MCP entrance, offline.
//
// `noacg mcp` is one of the three ways an agent reaches the door (docs/AGENT_CLI.md), and until
// this file it was the only one with no test that runs in CI: unit.test.mjs covers the terminal
// entrance, and everything the MCP server does end to end lives in smoke.test.mjs, which skips
// itself whenever no bridge answers. So the surface an installed plugin actually talks to could
// change shape - a verb renamed, an argument dropped, `caspar` quietly exposed - and every green
// run in this repository would have said nothing.
//
// What is covered is what a fault would make INVISIBLE rather than loud:
//
//   - the server exposes ONE tool, `noacg`, whose `command` enum is exactly the seven authoring
//     verbs, and `caspar` is NOT among them. That exclusion is a deliberate rule (it drives live
//     playout hardware, which is an operator's decision and not an authoring agent's) and it was
//     prose only. Prose does not fail a build.
//   - the tool carries a title, a description and the arguments the docs promise, because an
//     agent picks a tool by reading them; an argument that vanished would still list.
//   - the schema stays SMALL. An MCP client puts it into the model's context in every session
//     where the server is configured, NoaCG-related or not (docs/backlog/cli-mcp-startup-weight.md
//     measured the seven-tool shape at about 1,160 tokens and this one at about 590). The ceiling
//     here is in characters, which is what the token count follows; a teaching sentence added to
//     a description fails it, which is the point - the teaching belongs in the skill.
//   - the server identifies itself as `noacg` at the package's own version - what an MCP client
//     shows the user, and what the plugin manifests are stamped from.
//   - `docs` answers WITHOUT a deployment. It is the one verb that reads the shipped skill off
//     disk, so an agent can learn the contract before it has a bridge, a browser or a key - and a
//     refactor that routed it through the bridge would break that silently.
//   - a verb missing its argument is a usage error naming the argument, not a bridge attempt.
//   - the doc topics are also resources, and an unknown topic is an error rather than a hang.
//
// Nothing here starts a browser or reaches a deployment: NOACG_URL points at a closed port, and
// only the verbs that need no bridge are ever CALLED.
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

/** The verbs the one tool speaks, in the order the loop uses them. */
const EXPECTED_COMMANDS = ['types', 'scaffold', 'validate', 'inspect', 'screenshot', 'docs', 'save'];

/** Every argument the tool promises, and the verb that needs it (null = optional everywhere). */
const EXPECTED_ARGUMENTS = {
  command: 'required',
  path: null, out: null, type: null, design: null, fields: null, name: null, values: null,
  palette: null, font: null, zone: null, bench: null, houseContract: null, screenshots: null,
  state: null, data: null, topic: null, folder: null,
};

/** The schema's size ceiling, in characters of the JSON an MCP client receives. The measured
 *  shape is about 2,450 characters (~590 tokens); the ceiling leaves room for a verb, not for
 *  prose. Raise it only with a measurement in docs/backlog/cli-mcp-startup-weight.md. */
const SCHEMA_CHAR_CEILING = 2800;

/** Connect a real MCP client to `noacg mcp` over stdio, run `fn`, always close. */
async function withServer(fn) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'mcp'],
    // A closed port, so any verb that tried to reach a deployment would fail fast rather than
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

const theTool = async () => withServer(async (client) => (await client.listTools()).tools);

// ------------------------------------------------------------------ the tool set

test('the MCP server exposes exactly one tool, noacg, speaking the seven authoring verbs', async () => {
  const tools = await theTool();
  assert.deepEqual(tools.map((t) => t.name), ['noacg']);
  assert.deepEqual(tools[0].inputSchema.properties.command.enum, EXPECTED_COMMANDS);
});

test('caspar is not a verb: it drives live playout hardware, which is not an authoring verb', async () => {
  const [tool] = await theTool();
  for (const verb of tool.inputSchema.properties.command.enum) {
    assert.ok(!/caspar/i.test(verb), `${verb} would put live playout in an authoring agent's hands`);
  }
});

test('the tool states what it is and takes the arguments the docs promise', async () => {
  const [tool] = await theTool();
  assert.ok(tool.title && tool.title.length > 0, 'the tool has no title');
  assert.ok(tool.description && tool.description.length > 40, 'the tool has no usable description');
  assert.deepEqual(Object.keys(tool.inputSchema.properties).sort(), Object.keys(EXPECTED_ARGUMENTS).sort(), 'arguments changed');
  assert.deepEqual(tool.inputSchema.required, ['command'], 'only command is required; every verb checks its own');
  for (const [name, spec] of Object.entries(tool.inputSchema.properties)) {
    assert.ok(spec.description && spec.description.length > 0, `argument "${name}" has no description`);
  }
});

test('the schema stays small enough to sit in every session unnoticed', async () => {
  const [tool] = await theTool();
  const rendered = JSON.stringify({ description: tool.description, name: tool.name, parameters: tool.inputSchema });
  assert.ok(
    rendered.length <= SCHEMA_CHAR_CEILING,
    `the tool schema is ${rendered.length} characters, over the ${SCHEMA_CHAR_CEILING} ceiling - move the prose into the skill`,
  );
});

test('the server names itself noacg at the version the release tags', async () => {
  const info = await withServer(async (client) => client.getServerVersion());
  assert.equal(info.name, 'noacg');
  assert.equal(info.version, cliVersion());
});

// ------------------------------------------------------------------ the contract, with no bridge

test('docs answers off the shipped skill - no deployment, no browser, no key', async () => {
  const result = await withServer(async (client) => client.callTool({ name: 'noacg', arguments: { command: 'docs', topic: 'contract' } }));
  assert.notEqual(result.isError, true, 'docs must not need a deployment');
  assert.equal(result.content[0].type, 'text');
  assert.ok(result.content[0].text.length > 500, 'the contract reference came back empty');
});

test('an unknown doc topic is an error that names the topics, not a hang', async () => {
  const result = await withServer(async (client) => client.callTool({ name: 'noacg', arguments: { command: 'docs', topic: 'no-such-topic' } }));
  assert.equal(result.isError, true);
  const said = result.content.map((c) => c.text ?? '').join('\n');
  for (const topic of docTopics()) assert.ok(said.includes(topic), `the refusal should name "${topic}"`);
});

test('a verb without its argument is a usage error naming the argument, not a bridge attempt', async () => {
  const cases = [['docs', 'topic'], ['scaffold', 'out'], ['validate', 'path'], ['inspect', 'path'], ['screenshot', 'path'], ['save', 'path']];
  await withServer(async (client) => {
    for (const [command, argument] of cases) {
      const result = await client.callTool({ name: 'noacg', arguments: { command } });
      assert.equal(result.isError, true, `${command} without ${argument} should refuse`);
      assert.ok(result.content[0].text.includes(`"${argument}"`), `${command}: the refusal should name "${argument}", said: ${result.content[0].text}`);
    }
  });
});

test('an unknown verb is refused by the schema', async () => {
  const result = await withServer(async (client) => client.callTool({ name: 'noacg', arguments: { command: 'caspar' } }));
  assert.equal(result.isError, true);
});

test('every doc topic is also a resource, so a client can read the contract without a tool call', async () => {
  const uris = await withServer(async (client) => (await client.listResources()).resources.map((r) => r.uri).sort());
  assert.deepEqual(uris, docTopics().map((t) => `noacg://docs/${t}`).sort());
});

test('a resource returns the same markdown the tool does', async () => {
  const [viaResource, viaTool] = await withServer(async (client) => [
    await client.readResource({ uri: 'noacg://docs/package' }),
    await client.callTool({ name: 'noacg', arguments: { command: 'docs', topic: 'package' } }),
  ]);
  assert.equal(viaResource.contents[0].mimeType, 'text/markdown');
  assert.equal(viaResource.contents[0].text, viaTool.content[0].text);
});
