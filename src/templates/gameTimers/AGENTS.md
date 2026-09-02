# src/templates/gameTimers - the on-air countdown clocks

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-09-02, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## gameTimers/ - the on-air countdown clocks

gt01…gt04 (prefix 'game-timer', type 'countdown'; data blocks via
convertToDataRegion; timer-run pop + timer-line-reveal; minutes in f1; .game-timer-done
styles time-up). The preset's startClock()/stopClock() ride the conversion as step `calls`
(§3b); the clock runtime (shared/clock.ts) stays outside the region. gt03/gt04 are the AI
benchmark's kids-timer winners ported onto the contract: design-owned ring/tick runtimes
via `GameTimerDesign.runtimeExtraJs` (outside the region, following the clock's globals)
and `GameTimerDesign.autoEase` (a design's hand-tuned default ease pair, used only when
the wizard easing is 'auto' - an explicit pick still wins).
