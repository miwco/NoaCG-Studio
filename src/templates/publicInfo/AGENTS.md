# src/templates/publicInfo - official notices and two-language panels

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-09-02, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## publicInfo/ - official notices and two-language panels

**publicInfo/** - pi01…pi10 (prefix 'public-info', `TemplateType 'public-info'`), the other
standard-contract addition: official notices, numbered instructions, source labels,
disclaimers, municipal/health panels and two-language panels. `piMask`/`piMasks` let a design
name its own line classes (the shared positional `-name`/`-title`/`-extra` means nothing for a
numbered instruction or a second language's body); PI_LANG_STACK_CSS + `piLanguageRestRefine`
carry the two-language block the `public-notice` type's machine alternates.
