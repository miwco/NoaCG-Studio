# src/templates/alerts - the SEVERITY-flag notices

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-09-02, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## alerts/ - the SEVERITY-flag notices

**alerts/** - al01…al13 (prefix 'alert', `TemplateType 'alert'`), a STANDARD-CONTRACT category:
assembleStandard + the shared preset bank + line masks + steps, nothing category-specific in the
runtime. What it adds is the SEVERITY FLAG - four stacked `.alert-level-N` blocks
(ALERT_LEVELS: advisory/watch/warning/emergency, fixed semantic colours, every pair ≥5:1) that
the `alert-level` type's parallel group cross-cuts, plus `alertLevelRestRefine`, which writes
the resting pose into step 0 because a parallel group resting at its initial state replays
nothing. Seven designs carry the machine; five (al07-al11) carry no flag and claim no states.
Numbered like the quiz's answer rows, so each level is a real registry part.
