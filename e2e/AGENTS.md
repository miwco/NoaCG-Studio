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
- **Inside `page.evaluate`, an `import('/src/…')` MUST carry the `.ts` extension.** Vite serves
  both URLs and gives each its own module registry, so the extensionless form sometimes resolves a
  SECOND instance - `useTemplateStore.getState()` then answers from a store nobody drove. The
  symptom is not an error but a plausible empty answer: `template.assets` came back `[]` for a
  graphic whose artwork was visible in the failure screenshot. Both forms often work, so the same
  spec file can have one passing extensionless evaluate and one failing one.
- **A guard fix needs the assertion written backwards, then mutation-tested.** When two handlers
  both fire and only one should, asserting that the right thing happened proves nothing - the bug
  IS the extra thing happening alongside it. Assert that the stood-down handler stayed quiet, then
  break the guard on purpose and watch the spec go red. If it still passes, the spec is vacuous.
  A pre-existing pan spec passed for MONTHS while Space-pan-also-plays was live, because a play
  tween touches none of what it asserted. For a HELD key use real auto-repeat
  (`e2e/_keys.ts holdKeyRepeats`, CDP `autoRepeat: true`); `keyboard.down()` sends one keydown and
  never repeats, so it cannot exercise the gesture at all.

## Traps when RUNNING the suite

- **A suite that skips itself exits 0.** `npm run test:e2e:live` with `E2E_EMAIL`/`E2E_PASSWORD`
  unset prints `32 skipped` and exits 0, so any job checking only the exit code is permanently,
  silently green. Worse, the JSON report's `.specs[].ok` is **true for a skipped spec**, so a
  summary built on `.ok` reports all 32 as passed on a run where none executed. Read
  `.specs[].tests[].results[].status`, and make an env-gated job a verdict by asserting on
  `.stats`: `skipped == 0` and `expected + unexpected + flaky >= <declared count>`.
- **A wholesale local red can be green on CI, with no code fault.** 42 failed / 7 passed across
  the AI specs locally while the same commit passed CI's full 8-shard run - the checkout, not the
  code. Before attributing a big local red to your change, `git stash push src scripts` and re-run
  the SAME spec files; equal failure counts mean pre-existing. The pre-merge gate belongs to CI on
  a clean checkout anyway.
- **A worktree with no `npm install` deadlocks against itself.** A linked worktree lives inside
  the primary checkout, so Node's upward `node_modules` walk reaches the PARENT's - Playwright
  resolves from there, `e2e-runs.mjs` records the queue ticket under the parent's root, and the
  run's own globalSetup then waits for itself. The message reads exactly like normal contention.
  Tells: the queue names a root you are not in, the blocking pid's command line points at the
  parent's `node_modules\.bin` and chains back to your own shell, and CPU is near zero for the
  whole wait. Fix: `npm install` here, kill the stuck pid, and kill the orphaned Vite it left on
  this checkout's port (Playwright starts `webServer` BEFORE globalSetup, so the server survives).
  The same missing install makes `npm run build` fail on `check-workflows` with
  `Cannot find module '@action-validator/cli/cli.mjs'` - usually the first sign.
- **Do not edit `src/` while a bench, spike or sweep is in flight.** Those runners drive the dev
  server, so a save triggers a Vite full reload and the measured page navigates out from under
  them: `page.evaluate: Execution context was destroyed`. One run died on item 9 of 11 and the
  ledger is written at the END, so everything already measured was lost with screenshots still on
  disk. Docs, memory and scratchpad files are safe - they are not in the module graph.
- **Stopping a background bench does not stop the bench.** Killing the shell leaves the npm/node
  descendants reparented and alive - one measured 198 minutes later with 2.4 s of CPU, wedged,
  holding a headless browser. It keeps the one paid concurrency slot (later cells fail
  `already_running` at $0.0000, which looks like a free wholesale failure) and `e2e-runs.mjs`
  cannot see it. After stopping any bench or eval, check `Get-CimInstance Win32_Process -Filter
  "Name='node.exe'"` for a surviving runner and stop the whole chain. Tell an orphan by CPU:
  seconds of CPU over hours of wall clock.
- **`l3-sweep <category>` writes its screenshots into `./<category>/` in the CWD** - untracked and
  invisible until a `git add -A` sweeps ~90 PNGs into the commit. Delete the directory, or pass an
  out-dir outside the repo, before committing.
- **`pro-spike --control` does not start a dev server**, and a linked worktree cannot easily be
  given one: the guard hook hard-denies `npm run dev`/`preview`/bare `vite`, and `preview_start`
  serves whatever worktree the SESSION is in. Start it in the session's own worktree, prove both
  checkouts serve identical bytes (`git -C <a> rev-parse HEAD:<path>` against the other for `src`,
  `public`, `index.html`, `app.html`, `vite.config.ts`, `package.json`, `package-lock.json`, plus a
  clean `git status` on the serving side), then run the script from ITS worktree with
  `DEV_PORT=<the session worktree's port>`. If the bytes differ, do not run - a determinism
  measurement against someone else's source is not a measurement. `preview_start`'s reported port
  can also be wrong; trust Vite's own banner in `preview_logs`.
