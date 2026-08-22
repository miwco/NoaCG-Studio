# e2e - the Playwright suite

Loaded alongside the root `AGENTS.md` when working in this directory (Claude reads it via this
directory's `CLAUDE.md` import; Codex reads it directly). Keep it accurate. The suite's plan, the
sharding and the queue rules are the root contract's "Verifying changes"; the full procedure is
**docs/VERIFICATION.md**.

Split out of the root `AGENTS.md` on 2026-08-22: these are the traps a SPEC falls into, so they
belong where specs are written rather than in the contract every session loads.

## Gotchas when writing a spec

- The e2e suite pins **offline mode** via `webServer.env`, but `reuseExistingServer: true` means a
  dev server already running on THIS checkout's port (started by hand, with the real `.env`) gets
  reused - backend-sensitive specs then fail confusingly. Kill any manual server on this
  checkout's port first. Other worktrees' servers are harmless.
- The dev server can serve a **stale module** after many edits (HMR lag) - restart it. Worse,
  `import('/src/store/…')` in an eval context can then resolve a **different module instance** than
  the running app (a "ghost store"): if state reads disagree with visible UI, restart and reload
  before trusting the assertion. Monaco also isn't fully interactive headless and GSAP doesn't
  visibly tick (rAF) - assert on DOM/state there.
- In Playwright specs, **never clear localStorage via `addInitScript`** - it also runs in the
  same-origin srcdoc preview iframe, so every rebuild wipes the key (this silently deleted the
  project brand). Fresh browser contexts already isolate storage per test.
- The preview rebuilds on a debounce after `applyTemplate` - 350 ms when authoring, **50 ms under
  the e2e suite** (`VITE_PREVIEW_DEBOUNCE_MS`, pinned in playwright.config.ts). Never sleep out
  either number; a spec that hard-codes one is wrong at the other. Use
  `awaitPreviewRebuild` (`e2e/_preview.ts`) before clicking Play or asserting inside the iframe.
- **A spec that saves off the UI and then reloads must WAIT for the disk.** A durable write is
  accepted synchronously and lands a moment later (durableStore.ts), so a `reload`/`goto` fired
  the instant a mutator returns aborts what has not committed, and the next page is missing the
  last write or two - which one varies. `settleDurableWrites` before tearing the page down;
  `awaitDurableReady` after a reload whose read is an `evaluate` (`e2e/_durable.ts`). A UI
  assertion needs neither: the shell cannot render before hydration resolves.
- **A spec that presses Space (or Enter) must first say where FOCUS is.** Clicking a control leaves
  it focused, and Space belongs to a focused button by design (spaceKey.ts) - so the press lands on
  that button, not on the surface under test. Call `parkFocusOffControls` (`e2e/_keys.ts`) rather
  than inheriting whatever the bootstrap left behind.
- A wizard-created VIDEO project auto-runs its first generation, which lands as its own undoable
  snapshot ~0.1-2.6 s after `video-shell` appears (unbounded: the validation probe waits on the
  player host with no timeout). A spec that makes an undoable change before that lands is racing
  it. Wait for the assistant reply first (`waitForGeneration`, `.ai-msg.assistant`), never a fixed
  timeout.
