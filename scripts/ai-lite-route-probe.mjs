// One real qualification call for a Lite route CANDIDATE, through the production request path.
//
//   node scripts/ai-lite-route-probe.mjs -- --model <slug> --providers <a,b>
//     [--mode json-schema|tool] [--no-zdr] [--fixture <index>] [--max-tokens <n>]
//
// SPENDS TOKENS on the target route - exactly one gateway call per invocation (maxAttempts 1,
// retryLimit 0). It exists because two catalog gates can only be answered by a real call
// (docs/MODEL_ROUTE_AUDITS.md): whether the endpoint actually produces the Lite structured
// contract in the configured mode (the `alibaba/qwen3.7-flash` lesson - `tools` in a listing is
// not `response_format: json_schema` capability), and whether the route serves under
// `zeroDataRetention: true` (the gateway decides ZDR per request; no listing carries it).
//
// The request is built from the SAME functions production uses - `liteSystemPrompt`,
// `retrieveLiteReferenceSet`, `liteReadyOutputFor`, `liteRequestText`, `executeGatewayRequest` -
// on a locked semantic fixture, so a refusal is attributable to the route rather than to a
// probe-only prompt shape. `disallowPromptTraining` stays pinned on in every probe, like every
// managed call; `--no-zdr` drops only the ZDR requirement and is a BENCH posture - promotion
// still requires a verified ZDR round (docs/AI_LITE_BRAND_PLAN.md section 4.1).
//
// Needs AI_GATEWAY_API_KEY in the environment. Prints one JSON verdict line to stdout.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildApiRuntime } from './api-runtime-build.mjs';
import { LITE_SEMANTIC_FIXTURES } from './ai-lite-semantic-fixtures.mjs';

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const model = readArg('model');
const providers = (readArg('providers') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const mode = readArg('mode', 'json-schema');
const requireZdr = !process.argv.includes('--no-zdr');
const fixtureIndex = Number(readArg('fixture', '0'));
const maxTokens = Number(readArg('max-tokens', '1500'));
const thinking = readArg('thinking', 'default');
const timeoutMs = Number(readArg('timeout', '90000'));

if (!model || providers.length === 0 || !['json-schema', 'tool'].includes(mode)) {
  console.error('Usage: node scripts/ai-lite-route-probe.mjs -- --model <slug> --providers <a,b> [--mode json-schema|tool] [--no-zdr] [--fixture <i>] [--max-tokens <n>]');
  process.exit(2);
}
if (!(process.env.AI_GATEWAY_API_KEY ?? '').trim()) {
  console.error('AI_GATEWAY_API_KEY is not set - the probe makes one real gateway call.');
  process.exit(2);
}

const fixture = LITE_SEMANTIC_FIXTURES[fixtureIndex];
if (!fixture) {
  console.error(`No semantic fixture at index ${fixtureIndex} (bank size ${LITE_SEMANTIC_FIXTURES.length}).`);
  process.exit(2);
}

const runtime = await buildApiRuntime(['api/_lib/aiGateway.ts', 'api/_lib/aiLiteProfile.ts']);
try {
  const contract = await import(pathToFileURL(path.join(runtime.outputDir, 'src/ai/lite/contract.js')).href);
  const gateway = await import(pathToFileURL(path.join(runtime.outputDir, 'api/_lib/aiGateway.js')).href);
  const { liteProfile } = await import(pathToFileURL(path.join(runtime.outputDir, 'api/_lib/aiLiteProfile.js')).href);

  const request = fixture.request;
  const references = contract.retrieveLiteReferenceSet(request);
  const modelRequest = {
    system: contract.liteSystemPrompt(liteProfile().promptVersion, [], {
      skin: false,
      references: references.entries,
      manualCategory: request.generationSpec?.category ?? null,
    }),
    messages: [{ role: 'user', content: contract.liteRequestText(request) }],
    maxTokens,
    structuredOutput: contract.liteReadyOutputFor(references.entries, { skin: false }),
    cacheSystem: true,
  };

  // --dump-body <file>: write the exact gateway body and make no call - for raw replay when a
  // failure needs the provider's actual payload (the adapter rightly discards it on throw).
  const dumpPath = readArg('dump-body');
  if (dumpPath) {
    const { writeFile } = await import('node:fs/promises');
    const prepared = gateway.vercelGatewayAdapter.createRequest(
      modelRequest,
      { provider: 'vercel', model },
      'KEY-PLACEHOLDER',
      {
        gateway: {
          zeroDataRetention: requireZdr,
          disallowPromptTraining: true,
          only: providers,
          sort: 'cost',
          tags: ['surface:lite-bench'],
          structuredOutputMode: mode,
          ...(thinking === 'off' ? { thinking: 'off' } : {}),
        },
      },
    );
    await writeFile(dumpPath, prepared.body, 'utf8');
    console.log(JSON.stringify({ dumped: dumpPath, bytes: prepared.body.length }));
    process.exit(0);
  }

  const verdict = {
    model,
    providers,
    mode,
    requireZdr,
    thinking,
    fixture: fixture.id ?? fixtureIndex,
  };
  try {
    const result = await gateway.executeGatewayRequest(
      { request: modelRequest, route: { provider: 'vercel', model } },
      { keyFor: async () => (process.env.AI_GATEWAY_API_KEY ?? '').trim() },
      {
        maxAttempts: 1,
        retryLimit: 0,
        timeoutMs,
        gateway: {
          zeroDataRetention: requireZdr,
          disallowPromptTraining: true,
          only: providers,
          sort: 'cost',
          tags: ['surface:lite-bench'],
          structuredOutputMode: mode,
          ...(thinking === 'off' ? { thinking: 'off' } : {}),
        },
      },
    );
    const semantic = contract.validateLiteDecision(result.output, request);
    Object.assign(verdict, {
      ok: true,
      servedBy: `${result.provider}:${result.model}`,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.usage.estimatedCost?.amount ?? null,
      },
      decisionStatus: semantic.decision?.status ?? null,
      variantId: semantic.decision?.status === 'ready' ? semantic.decision.spec.variantId : null,
      ruleErrors: semantic.errors,
      adjustments: semantic.adjustments ?? [],
    });
  } catch (error) {
    Object.assign(verdict, {
      ok: false,
      code: error?.code ?? 'unknown',
      status: error?.status ?? null,
      message: String(error?.message ?? error).slice(0, 300),
    });
  }
  console.log(JSON.stringify(verdict, null, 1));
  if (verdict.ok === false) process.exitCode = 1;
} finally {
  await runtime.cleanup();
}
