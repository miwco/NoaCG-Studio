# Session B - the docs home and the landing that names what shipped

Branch `claude/docs-home-landing-fff4cf`. Goal (owner, 2026-08-25 night wave): a public,
indexed /docs page a beginner can follow, and a landing that says the two invisible things -
SVG import is THE way to bring your own graphic in, and coding agents can make NoaCG graphics
directly.

## What was built

- **`/docs` - the tenth MPA entry** (`docs.html` + `src/docs/docs.css` + `src/docs/docs.ts`).
  Static, no React, public and indexed (sitemap row added in `scripts/prerender.mjs`). Brand
  system is the landing's: void ground, one amber accent, Space Grotesk + JetBrains Mono.
  Sticky section nav with a scroll-spy (progressive - the page is complete without JS).
  Sections:
  - Getting started (the wizard road in three steps)
  - **Import your own SVG graphic** - the five rules, layer table, fonts, per-app export
    settings (Illustrator/Figma/Inkscape), from `docs/SVG_AUTHORING.md`
  - **OBS, vMix & browser sources** - the output-URL model, the four universal rules, OBS and
    vMix walks, troubleshooting table, from `docs/PLAYOUT_INTEGRATION.md`
  - **CasparCG** - output URL command, version/engine table, the one-button connect
    (Settings -> Playout + `noacg caspar agent`), exported-file route, FIELDS.md. Carries the
    honesty callout: the connect feature has NOT yet driven a real CasparCG server; the URL
    route has (2026-08-03, 2.3.2)
  - The playout dashboard, audience join pages, graphics with behaviour, live data (typed /
    Google-Sheet CSV / Production Data API) - the tail-5 explanations, from
    `docs/CLOUD_PLAYOUT.md` + `docs/DATA_API.md` + `src/control/liveData.ts`
  - **Coding agents & the CLI** - the developer page: setup table (Claude Code plugin, Codex,
    any MCP client), the scaffold/validate/save loop, `NOACG_URL`, from `docs/AGENT_CLI.md`
- **Landing** (`index.html`): header + footer Docs links; import card rewritten SVG-first with
  a link to `/docs#svg`; new `#agents` section ("Your coding agent can make these too.") with
  the real `npx @noacg/cli` commands and a link to `/docs#claude-code`; the planned
  "More data sources" feat replaced by the real "Live data API" one.
- **Routing**: `/docs` added to `CLEAN_PAGES` + rollup input in `vite.config.ts`; no
  `vercel.json` change needed (cleanUrls serves it; no noindex - the page is meant to be
  found). Root `AGENTS.md` page table updated to ten pages.
- **E2E**: new `e2e/docs.spec.ts` (static page, nav-anchor integrity, the four guides'
  load-bearing lines incl. the CasparCG honesty note, indexability); a landing test pinning
  the SVG-first card, the `#agents` section and the docs links. Mapping rows minted in
  `scripts/e2e-affected.mjs` (`docs.html` -> docs+landing specs, `src/docs/` -> docs spec);
  `docs.spec.ts` added to the sprint FOCUS list.

## Verified

- Both pages driven in the real dev server: no console errors, sticky nav + scroll-spy
  selection logic, no horizontal overflow at desktop and 375px, tables and command blocks
  contained. (Scroll-spy rAF is suspended in a hidden tab - environment artifact, checked.)
- `npm run build` green locally (includes check:vercel-config, prerender sitemap test, the
  e2e-affected mapping tests, tsc + eslint + vite build).
- CI on the pushed sha - see the wrap-up below for which jobs ran.

## Deliberately not done

- **In-app "Learn" pointers (tail 6).** Touching `src/components/` tonight collides with the
  svg-import-clarity worktree, and the right homes (wizard import step, Settings -> Playout,
  the production page's links row) each deserve a spec. Follow-up: link `/docs#svg` from the
  import door, `/docs#casparcg` from the Playout settings, `/docs#data` from the Data tab -
  staying OUT of `src/components/wizard/` was ruled for the wizard only insofar as the docs
  layer goes; the pointers themselves are ordinary UI work.
- SPX Graphics has no guide section of its own yet (the landing's chips name it; the full
  route lives in `docs/PLAYOUT_INTEGRATION.md` §6 and is linked). A missing page is a gap,
  an empty page is a broken promise - it was omitted rather than stubbed.
- `docs/svg-samples/` are linked on GitHub rather than served from the page; serving them as
  downloadable files from /docs would be a nice follow-up.

## Owner queue

`docs/acceptance/owner-queue/2026-08-26-docs-home-and-landing.md` - route: open / and /docs;
what to look at: whether a beginner could follow the coding-agents guide cold.
