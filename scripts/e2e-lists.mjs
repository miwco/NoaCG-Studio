// SPRINT FOCUS - the student-critical spec set (added 2026-08, docs/GOALS.md "Student release").
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
  'analytics.spec.ts',
  'advanced-mode.spec.ts',
  'auth.spec.ts',
  'control.spec.ts',
  'cross-tab.spec.ts',
  'data-api.spec.ts',
  'design-rules-product.spec.ts',
  'exports.spec.ts',
  'feedback.spec.ts',
  'flows.spec.ts',
  'format.spec.ts',
  'hosted-control.spec.ts',
  'landing.spec.ts',
  'layout.spec.ts',
  'lazy-editor.spec.ts',
  'library.spec.ts',
  'library-bulk.spec.ts',
  'local-relay.spec.ts',
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
  'production-pack.spec.ts',
  'production-persistence.spec.ts',
  'productions.spec.ts',
  'quiz-pilot.spec.ts',
  'project.spec.ts',
  'project-format.spec.ts',
  'shows.spec.ts',
  'snap-recovery.spec.ts',
  'storage-full.spec.ts',
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
  /^src\/ai\/proTypes\.ts$/,
  /^api\/_lib\/pro\//,
  /^api\/ai\/\[\.\.\.path\]\.ts$/,
  /^scripts\/aiDevPlugin\.mjs$/,
  /^scripts\/apiRouteTable\.mjs$/,
  // The step that decides which tiers are offered at all, and the one feature-detection point
  // the second half of that decision reads.
  /^src\/components\/wizard\/steps\/AiStep\.tsx$/,
  /^src\/backend\/config\.ts$/,
  // The suite's own files.
  /^e2e\/configured\//,
  /^playwright\.live\.config\.ts$/,
];
