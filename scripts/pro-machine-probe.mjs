#!/usr/bin/env node
// Q2 of the Pro feasibility round: can a generated graphic carry its OWN DataFields AND its
// own STATE MACHINE, and is the result then operable on a generated control page?
//
//   node scripts/pro-machine-probe.mjs [--arm=plain|taught|both] [--route=vercel:model]
//
// The brief is a match clock combined with a scoreboard - deliberately something the catalog
// does not ship as one graphic, so the design cannot come from a chassis and the fields cannot
// come from a fixed contract. Two arms:
//
//   plain  - the production custom coder exactly as it ships. What a user gets today.
//   taught - the same model, same route, with the state-machine contract appended to the
//            BRIEF (never to the shipped system prompt, which stays the frozen control).
//            This separates "the platform does not ask" from "the model cannot answer".
//
// Each arm reports the emitted DataFields, whether NOACG_ANIM carries a `machine`, what
// machine the editor derives, and what buttons the control generator would build from it -
// the chain docs/CONTROL_LAYER.md says makes a graphic operable. A run that produces a
// template SAVES it to the library, so #/control/<id> can be opened and driven by hand.
//
// SPENDS REAL MONEY on the pinned route (a cheap approved gateway coder).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';
import { requireAllowedRoute } from './harness-route-policy.mjs';
import { readEnvFile } from './ai-bench-server.mjs';

const BASE = `http://localhost:${devPort()}`;
const OUT = path.resolve('pro-machine-out');
const args = process.argv.slice(2);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const route = value('route') ?? 'vercel:alibaba/qwen3-coder-next';
// Gateway routes only, unless the run says why (scripts/harness-route-policy.mjs).
const { frontierReason } = requireAllowedRoute(route, { flag: 'route', reason: value('frontier-reason') });
const armArg = value('arm') ?? 'both';
const arms = armArg === 'both' ? ['plain', 'taught'] : [armArg];

const BRIEF = 'A combined match clock and scoreboard for a live floorball broadcast: '
  + 'the two team names with their scores, a running match clock, and the period number. '
  + 'The operator needs to start and stop the clock, add a goal to either team, and advance '
  + 'the period, while the graphic stays on air the whole time.';

// The state-machine contract, worded from docs/STATE_MACHINE_SCHEMA.md. It is appended to the
// BRIEF rather than to coderSystemPrompt because that prompt is the benchmark control and is
// frozen (src/ai/AGENTS.md); an experiment that edits it stops being comparable to anything.
const MACHINE_TEACHING = `

ALSO REQUIRED - the operator state machine. Inside the ANIMATION region, after the timeline
builders, emit a data block exactly of this shape (NOACG_ANIM format version 2):

var NOACG_ANIM = {
  "version": 2,
  "root": ".PREFIX",
  "speed": 1,
  "steps": [ /* one timeline per default-path state, in walk order */ ],
  "machine": {
    "groups": [
      {
        "id": "main",
        "initial": "off",
        "defaultPath": ["on", "out"],
        "states": [{ "id": "off", "name": "Off" }, { "id": "on", "name": "On" }, { "id": "out", "name": "Out" }],
        "transitions": [{ "from": "on", "to": "out", "trigger": "operator", "event": "next" }]
      }
    ],
    "controls": [
      { "event": "goalHome", "label": "Goal - home", "section": "Score" }
    ]
  }
};

Rules that make it work:
- defaultPath[i]'s timeline IS steps[i]. defaultPath.length must equal steps.length.
- A state that is NOT on the default path carries its own "timeline" inline, or none at all
  (a pose-only state, which just holds the look it arrives with).
- A transition's trigger is "operator" (with an "event" name) or "timer" (with "after" in
  seconds). Guarding is structural: an event fires only if you drew that arrow from the
  current state. There is no expression language.
- Use PARALLEL GROUPS for things that change independently. A running clock is its own group
  with Stopped/Running states; the scoreboard's visibility is another. Do not multiply states
  to represent data - two teams' scores are FIELDS, not states.
- Every operator event you author becomes a button on the control page. List each in
  "controls" with a human label so the operator sees words rather than event names.
- "play" and "stop" are reserved built-ins; never author them as operator events.`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => console.log('  pageerror:', error.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();

const fileEnv = await readEnvFile();
const creds = {
  email: (process.env.E2E_EMAIL ?? fileEnv.E2E_EMAIL ?? '').trim(),
  password: (process.env.E2E_PASSWORD ?? fileEnv.E2E_PASSWORD ?? '').trim(),
};
if (creds.email && creds.password) {
  await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 });
  await page.keyboard.press('Escape');
  await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click({ timeout: 10_000 });
  await page.locator('#auth-email').fill(creds.email);
  await page.locator('#auth-pass').fill(creds.password);
  await page.locator('.auth-card').getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.auth-status').waitFor({ state: 'visible', timeout: 20_000 });
  console.log('Signed in.');
}
await page.evaluate(async (r) => {
  const { refreshAiConfiguration, saveAiSettings } = await import('/src/ai/settings.ts');
  await refreshAiConfiguration();
  const [provider, ...model] = r.split(':');
  saveAiSettings({ provider, model: model.join(':'), fallbacks: [] });
}, route);

const report = { route, frontierReason, brief: BRIEF, arms: {} };
for (const arm of arms) {
  console.log(`\n══ arm: ${arm} ══`);
  const started = Date.now();
  // A free-form coder emit is ~10k tokens and misses the forced-tool shape stochastically
  // (src/ai/AGENTS.md records one route going 0/8 on exactly this). Two attempts, so a single
  // malformed emit reports as a flaky route rather than as "the arm produced nothing".
  let outcome = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    outcome = await runArm(page, arm === 'taught' ? BRIEF + MACHINE_TEACHING : BRIEF);
    if (!outcome.error) break;
    console.log(`  attempt ${attempt + 1} failed: ${outcome.error.split('\n')[0]}`);
  }

  if (outcome.error) {
    console.log(`  FAILED after 2 attempts.`);
    report.arms[arm] = { error: outcome.error, ms: Date.now() - started };
    await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    continue;
  }
  await recordArm(arm, outcome, started);
}

async function runArm(page, brief) {
  return page.evaluate(async (input) => {
    const bust = `?t=${Date.now()}`;
    const { getAiProvider } = await import(`/src/ai/index.ts${bust}`);
    const { productionSpxValidator } = await import(`/src/ai/lite/pipeline.ts${bust}`);
    const validate = productionSpxValidator();
    const context = { images: [], palette: null, resolution: { width: 1920, height: 1080 }, fps: 50 };
    let change;
    try {
      change = await getAiProvider().generate(input.brief, context, {
        validate,
        // CREATE, explicitly: a clock-plus-scoreboard is exactly the hybrid the router is
        // meant to send to the free-form coder, but pinning it removes routing as a variable.
        mode: 'create',
      });
    } catch (error) {
      return { error: String(error).slice(0, 400) };
    }

    const t = change.template;
    const { parseAnimData } = await import(`/src/blocks/animData.ts${bust}`);
    const { deriveMachine, operatorEvents } = await import(`/src/blocks/animMachine.ts${bust}`);
    const { eventButtons, fieldDescriptors, eventLegality } = await import(`/src/control/controlModel.ts${bust}`);

    const parsed = parseAnimData(t.js);
    const authoredMachine = (() => {
      // What the CODE carries, before any derivation: the honest question is whether the
      // model wrote a machine, not whether the platform can invent one.
      const match = t.js.match(/var\s+NOACG_ANIM\s*=\s*(\{[\s\S]*?\});/);
      if (!match) return { present: false, reason: 'no NOACG_ANIM data block in the emitted code' };
      try {
        const literal = JSON.parse(match[1]);
        return { present: Boolean(literal.machine), groups: literal.machine?.groups?.length ?? 0, controls: literal.machine?.controls?.length ?? 0 };
      } catch (error) {
        return { present: false, reason: `NOACG_ANIM is not parseable JSON: ${String(error).slice(0, 120)}` };
      }
    })();

    const machine = parsed ? deriveMachine(parsed) : null;
    const buttons = eventButtons(t.js);
    const descriptors = fieldDescriptors(t.fields);
    return {
      fields: t.fields.map((f) => ({ field: f.field, ftype: f.ftype, title: f.title, value: String(f.value ?? '').slice(0, 40) })),
      validationOk: change.validation ? change.validation.ok : null,
      validationErrors: change.validation ? change.validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 160)}`) : [],
      validationWarnings: change.validation ? change.validation.warnings.map((w) => `${w.rule}: ${w.message.slice(0, 160)}`) : [],
      path: change.path,
      animDataParsed: Boolean(parsed),
      steps: parsed?.steps?.length ?? 0,
      authoredMachine,
      derivedGroups: machine ? machine.groups.map((g) => ({
        id: g.id, initial: g.initial, defaultPath: g.defaultPath,
        states: g.states.map((s) => s.id),
        transitions: g.transitions.map((tr) => `${tr.from} -${tr.trigger}:${tr.event ?? tr.after ?? ''}-> ${tr.to}`),
      })) : null,
      operatorEventsAtInitial: machine
        ? machine.groups.map((g) => ({ group: g.id, state: g.initial, events: operatorEvents(g, g.initial) }))
        : null,
      controlButtons: buttons.map((b) => ({ event: b.event, label: b.label, section: b.section ?? null })),
      controlFieldInputs: descriptors.map((d) => `${d.key}:${d.kind}`),
      eventLegalityTable: eventLegality(t.js),
      template: t,
    };
  }, { brief });
}

async function recordArm(arm, outcome, started) {
  // Save it to the library so the control page can be opened at #/control/<id> by hand. The
  // durable store accepts a write synchronously and lands it a moment later, so the commit is
  // awaited here rather than trusted - a reload that beats it loses the graphic.
  const saved = await page.evaluate(async (input) => {
    const bust = `?t=${Date.now()}`;
    const { createGraphic } = await import(`/src/model/library.ts${bust}`);
    const { commitDurableWrites } = await import(`/src/model/durableStore.ts${bust}`);
    const { doc, error } = createGraphic(input.template, { name: input.name });
    await commitDurableWrites();
    return { id: doc?.id ?? null, error };
  }, { name: `Clock + scoreboard (${arm})`, template: outcome.template });

  const { template, ...summary } = outcome;
  report.arms[arm] = { ...summary, ms: Date.now() - started, saved };
  await writeFile(path.join(OUT, `${arm}.index.html`), template.html);
  await writeFile(path.join(OUT, `${arm}.template.css`), template.css);
  await writeFile(path.join(OUT, `${arm}.template.js`), template.js);
  console.log(`  saved as #/control/${saved.id}${saved.error ? ` (save error: ${saved.error})` : ''}`);

  console.log(`  path=${summary.path} valid=${summary.validationOk} fields=${summary.fields.length} steps=${summary.steps}`);
  console.log(`  authored machine: ${JSON.stringify(summary.authoredMachine)}`);
  console.log(`  control buttons: ${summary.controlButtons.map((b) => b.label).join(', ') || '(none beyond the built-ins)'}`);
  console.log(`  field inputs: ${summary.controlFieldInputs.join(', ')}`);
  if (summary.validationErrors.length) for (const e of summary.validationErrors) console.log(`    ✗ ${e}`);
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}


await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\nReport: ${path.join(OUT, 'report.json')}`);
await browser.close();
