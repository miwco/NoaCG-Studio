# src/ai/creative - the retired Phase-C creative pilot

Loaded alongside the root `AGENTS.md` and `src/ai/AGENTS.md` when working in this directory
(Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly). Keep it
accurate.

Split out of `src/ai/AGENTS.md` on 2026-09-02, which keeps the harness-wide rules and a pointer
here. Add a RULE here; leave the reasoning in the code's own comments.

**RETIRED 2026-08-09 (owner decision): Creative Mode is superseded by NoaCG Pro and is no longer carried
as a parallel architecture.** Both existed to answer "the model proposes the appearance, the platform owns
the engineering"; Pro owns that question now, and two live experiments asking it separately is how the
answers come to disagree. `docs/CREATIVE_MODE_PLAN.md` is a RETIRED record to MINE, never a plan to
continue - its reusable mechanisms and their measured rulings are listed in that file's banner and in
`docs/AI_ATTEMPTS.md`. **Nothing in the product reaches this code**: no UI, no route from `claudeProvider`
into it, and its only caller is `scripts/creative-pilot-bench.mjs`. Removing it is a separate, deliberate
change - and `scripts/creative-route-bench.mjs` plus `e2e/creative-routing.spec.ts` are NOT part of it,
because they cover the LIVE Phase-A routing stage.
