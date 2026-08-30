// SPRINT FOCUS - the student-critical spec set (added 2026-08, docs/GOALS_ARCHIVE.md "Student release").
//
// While the student-release sprint runs, a change that would escalate to the FULL suite runs
// this set instead (scripts/e2e-affected.mjs, gated on E2E_SPRINT_FOCUS=1), and the nightly
// verdict classifies failures as focus (fix now) vs paused (drift, swept at sprint end)
// through scripts/nightly-triage.mjs. Both consumers import THIS list so they cannot drift.
//
// The list is the sprint's definition of "the product": wizard, home/library, productions,
// control/playout, export, auth/sync, landing, layout. Retire the whole file - together with
// the E2E_SPRINT_FOCUS env in ci.yml and the focus branch in e2e-affected.mjs - when the
// sprint ends.
export const FOCUS = [
  'agent-access.spec.ts',
  'analytics.spec.ts',
  'advanced-mode.spec.ts',
  'auth.spec.ts',
  // CasparCG Connect is a NICE-TO-HAVE over routes that already air (docs/CASPARCG_CONNECT.md),
  // so it earns a place here for one reason only: it puts a control on the production page and a
  // section in Settings, both of which ARE student-critical surfaces. What it protects during the
  // sprint is that those two surfaces keep working, not that CasparCG does.
  'caspar-connect.spec.ts',
  'control.spec.ts',
  'cross-tab.spec.ts',
  'data-api.spec.ts',
  'design-rules-product.spec.ts',
  // The public docs home: the guides students and operators follow to get on air at all.
  'docs.spec.ts',
  'exports.spec.ts',
  'feedback.spec.ts',
  'flows.spec.ts',
  'format.spec.ts',
  'hosted-control.spec.ts',
  // SVG IMPORT is how a student's own artwork gets in, so the road belongs to the sprint's
  // definition of the product. This is the EXPORTER CORPUS spec - six files shaped the way
  // Illustrator, Figma, Inkscape and Affinity really export, each pinning an answer the importer
  // used to get wrong (e2e/fixtures/svg-corpus/README.md). Its 2180-line sibling
  // `import-svg.spec.ts` deliberately stays out: it covers the same road far more slowly, and
  // merge latency is the bottleneck the sprint is protecting.
  'import-svg-corpus.spec.ts',
  'landing.spec.ts',
  'layout.spec.ts',
  'lazy-editor.spec.ts',
  'library.spec.ts',
  'library-bulk.spec.ts',
  'local-relay.spec.ts',
  'motion-presets.spec.ts',
  'network-resilience.spec.ts',
  'offline.spec.ts',
  'ograf-conformance.spec.ts',
  'ograf-starters.spec.ts',
  'package.spec.ts',
  'playout-drills.spec.ts',
  'production-audience.spec.ts',
  'production-chat-intake.spec.ts',
  'production-controls.spec.ts',
  'production-data.spec.ts',
  'production-gate.spec.ts',
  'production-pack.spec.ts',
  'production-persistence.spec.ts',
  'productions.spec.ts',
  'quiz-pilot.spec.ts',
  'project.spec.ts',
  'project-format.spec.ts',
  'shows.spec.ts',
  'snap-recovery.spec.ts',
  'storage-full.spec.ts',
  // The 2026-09-12 rehearsal, walked on artwork a STUDENT drew rather than on the shipped
  // samples: an Illustrator export with the dialog untouched and layer names that honour none
  // of our conventions, both graphics into one production, and the dashboard reloaded mid-run.
  // It is the whole sprint goal in one file, so it belongs in the sprint's own set.
  'student-rehearsal.spec.ts',
  'sync.spec.ts',
  'template-deep-link.spec.ts',
  'wizard-entry-fit.spec.ts',
  'wizard-filters.spec.ts',
  'wizard-finish.spec.ts',
  'wizard-kit.spec.ts',
  'wizard-logo.spec.ts',
  'wizard-preview.spec.ts',
  'wizard-shell.spec.ts',
];

// THE CONFIGURED SUITE'S TRIGGERS - files whose behaviour the OFFLINE suite structurally
// cannot cover, because the thing they change only exists when a backend is configured.
//
// `scripts/e2e-affected.mjs` ignores `e2e/configured/**` outright: those specs need a real
// Supabase project and a throwaway account, so they can neither run in CI nor be selected by
// the per-merge gate. That is the right call and it leaves a hole - a change to hosted Pro's
// door or its metering maps to specs that pin its ABSENCE, all of which stay green while the
// live path breaks. Naming the triggers turns that hole into a printed line: the affected run
// says "also run npm run test:e2e:live:queued" and it is then a decision rather than an
// oversight. It REPORTS and never runs - running it would start a dev server on the real .env,
// which is exactly what the offline pin exists to prevent.
export const CONFIGURED_TRIGGERS = [
  // The hosted-Pro door and its wire contract: absent offline, so only the configured suite
  // can walk it (e2e/configured/pro-wizard.spec.ts).
  /^src\/ai\/pro\/session\.ts$/,
  /^src\/ai\/pro\/types\.ts$/,
  /^api\/_lib\/pro\//,
  /^api\/ai\/\[\.\.\.path\]\.ts$/,
  /^scripts\/aiDevPlugin\.mjs$/,
  /^scripts\/apiRouteTable\.mjs$/,
  // The step that decides which tiers are offered at all, and the one feature-detection point
  // the second half of that decision reads.
  /^src\/components\/wizard\/steps\/AiStep\.tsx$/,
  /^src\/backend\/config\.ts$/,
  // The practice library is a FIXTURE SET as well as documentation, and one of its files is
  // loaded by the configured suite too: e2e/configured/imported-quiz-output.spec.ts drops
  // `quiz-board.svg` and follows it all the way to a hosted production's output. The offline
  // plan names the three specs that load the folder (scripts/e2e-affected.mjs), and this row is
  // the other half - CONFIGURED_TRIGGERS is asked BEFORE the ignore list, which is what makes it
  // reachable at all for a path under `docs/`.
  /^docs\/svg-samples\/quiz-board\.svg$/,
  // AGENT ACCESS (docs/AGENT_SAVE.md): the consent page with a session, the loopback handoff,
  // redeem, a save 201, the deep link after sync and revoke -> 401 only exist against a real
  // backend (e2e/configured/agent-access.spec.ts). The offline spec can only pin their absence.
  /^src\/backend\/agentAccess\.ts$/,
  /^src\/components\/auth\/AgentAccessConsent\.tsx$/,
  /^api\/_lib\/me\/(agentKeys|graphics|graphicShape)\.ts$/,
  /^api\/_lib\/(principal|agentAccessStore)\.ts$/,
  /^api\/me\/\[\.\.\.path\]\.ts$/,
  /^scripts\/meDevPlugin\.mjs$/,
  // THE HOSTED PLAYOUT WIRE (docs/CLOUD_PLAYOUT.md §3). The follow discipline, the boot
  // baseline and the renderer that uses both only ever run against a real durable log: offline
  // there is no production to resolve, no log to follow and no channel to join, so the
  // mechanism is ABSENT rather than merely untested. Their live coverage is the four /output
  // walks plus output-realtime-floor and relay-cold-boot, all in the configured suite - so a
  // change here that the offline plan reports as "covered" is covered by nothing.
  /^src\/control\/(hostedControl|hostedReceiver|outputRecovery)\.ts$/,
  /^src\/output\//,
  // THE PRODUCTION DATA API and the panel that hands out its key (docs/DATA_API.md). Offline
  // there is no publish, no data_key row and no key to reveal, so the only honest proof that the
  // revealed string AUTHENTICATES is the configured walk
  // (e2e/configured/production-data-key.spec.ts). The offline data-api spec pins the refusal
  // shapes, and production-data.spec.ts pins the button's absence; both are different claims.
  /^src\/control\/productionDataApi\.ts$/,
  /^src\/components\/home\/ProductionDataPanel\.tsx$/,
  /^api\/data\//,
  /^scripts\/dataDevPlugin\.mjs$/,
  // The suite's own files.
  /^e2e\/configured\//,
  /^playwright\.live\.config\.ts$/,
];
