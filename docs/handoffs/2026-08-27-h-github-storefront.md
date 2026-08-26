# Handoff - the GitHub repository as a storefront

Branch `claude/h-github-storefront-0d1336`. Two commits plus this one, `npm run build` green on
the tree this leaves.

The goal was narrow: a stranger landing on github.com/miwco/NoaCG-Studio should see a current,
honest project. The agent door sends developers to that page first, so it is a storefront now
whether or not it was built as one.

## What landed

**1. The homepage link, already live.** `gh repo edit --homepage https://noacg.studio`, after
confirming the domain serves (200 on both apex and `www`). This is a repository setting, not a
file, so it took effect immediately and is not waiting on the merge. The repository description
was left alone - it is accurate.

**2. The README, rewritten for truth rather than for style.**

- **507 designs across 22 categories**, replacing 386 across 21. The number is what
  `scripts/prerender.mjs` prints on every build (it prerenders one page per non-imported catalog
  entry), so the README and the build now disagree loudly instead of silently. The raw catalog
  holds 509 across 23; the two extra are the `imported-design` scaffolds, which the storefront and
  the prerenderer both exclude, and which are not designs.
- The npm package is **`@noacg/cli`**, linked to its registry page. The old text said "published
  as `noacg` on npm", which is the CLI's *binary* name, not a package anyone can install.
- **noacg.studio/docs is linked from the first screen.** The public guides existed and the README
  did not point at them once.
- Every shell command is its own fenced block, per the docs-voice rule (copy-paste boxes).
- **Zero em-dashes.** `check:copy` does not cover the README - it scopes to product UI and emitted
  template code - but the README is the most-read user-facing copy this project has, and the
  owner's complaint about the tell is about readers, not about file paths.
- Added a closing note on why `cli/` is Apache-2.0 inside an AGPL repository, pointing at
  `docs/AGENT_CLI.md` for the reasoning. `cli/LICENSE` itself was not touched.

**3. `re-design/` is one file now.** The 18 mockup PNGs (9.8 MB) are deleted per the owner's
ruling. **`handoff.md` stayed**, and deliberately: about thirty source comments and e2e specs cite
it by section number, and `docs/TEMPLATE_TAXONOMY_PROPOSAL.md` calls it binding where the two
disagree. Deleting it would have been a much larger change than the ruling asked for. Three
references to the deleted images were corrected (`docs/PLAYOUT_DASHBOARD.md`, the top of
`handoff.md` itself, and a comment in `scripts/acceptance-pack.mjs` that used `re-design/` as its
precedent for committing images).

**4. Every published CLI version now gets a GitHub Release.**
`.github/workflows/release-cli.yml` creates one after a successful publish, with
`--generate-notes` so GitHub writes the changelog from the commits since the previous release.

- `continue-on-error: true`, because the package is on npm either way and cannot be unpublished -
  a failed release must not read as a failed publish.
- `--target "$GITHUB_SHA"` is what makes the manual-dispatch path work; on a tag push the tag is
  already at that commit and it is a no-op.
- The **dry run rehearses it**: it calls `repos/{repo}/releases/generate-notes` and prints the
  result, which exercises the token, the target and the notes generation without writing anything.
  That is the proof asked for; there is no free way to prove the write itself short of a release.
- The job token widens to `contents: write` for that one call. Every step before it reads only,
  the job is already pinned to this repository and refused on a fork, and there is no
  `pull_request` trigger.
- `npm run check:workflows` passes (9 files validated).

**5. Sensitive scan.** Reported in full below, because that was the ask.

## The sensitive scan

**Tracked tree, and the full history (2,446 commits).** Scanned for `sk-`/`sk-ant-`/`sk-proj-`
keys, `ghp_`/`gho_`/`github_pat_` tokens, `npm_` tokens, Slack `xox*` tokens, `AKIA*` AWS keys,
Google `AIza*` keys, PEM private-key headers and bare JWTs.

**Nothing real, in the tree or in the history.** The only hits in tracked files are two deliberate
test fixtures in `api/_lib/aiGateway.test.ts` (`'sk-secret-must-not-leak'`) whose whole purpose is
to assert a secret does not reach the browser.

**One thing was fixed:** `scripts/lite-eval-token.mjs` hardcoded the owner's personal email as
`DEFAULT_EVAL_EMAIL`. Not a credential, but it is personal data sitting in a public repository,
and `scripts/bench-env.mjs` three lines away already carried a comment promising that "no account
identifier is committed to an open repo". It is now `defaultEvalEmail()`, which reads
`NOACG_EVAL_EMAIL` (environment or the main checkout's `.env`), falls back to the machine's
`git config user.email`, and throws a readable error if neither exists. Every entry point still
takes the address as an argument. Documented in `.env.example`. **Zero friction on the owner's own
machine** - the git identity there is the same account.

**Two things were left alone, on purpose:**

- `contact.noacg@gmail.com` appears in user-facing copy. That is a published contact address.
- `synctest1@gmail.com` is named in `benchmarks/lite/FALLBACK-PROPOSAL-2026-08-02.md` and in a
  comment in `supabase/migrations/0032_*.sql`, described in both places as a throwaway internal
  test account. Rewriting a landed migration's comment to scrub a disposable address costs more
  than it buys.

`.env.bench` is tracked and that is correct - it blanks the Supabase vars for the bench and says
in its own header that no secret belongs in it. `.env` and `.env*.local` are ignored.

## The brand kit (the tail item)

**It is used, so it stays - no deletion question to put to the owner.** `NoaCG-Brand-Kit/` is
cited as the authority by `AGENTS.md`, `docs/DESIGN_LANGUAGE.md`, `docs/LOOKS_AND_PALETTES.md`,
`docs/AI_LITE_PLAN.md`, `index.html`, `src/styles.css`, `src/docs/docs.css`, `src/model/wizard.ts`
and four ticker templates. `src/brandTokens.css` opens by naming Brand Manual §3.

**Checked against shipped reality, and one real drift was fixed.**

- **Palette: exact match.** All six §3 tokens (Void `#0A0C10`, Panel `#141922`, Amber `#F6A623`,
  Glow `#FFC65C`, Rec `#E5484D`, Paper `#E8EDF2`) are `src/brandTokens.css` verbatim, and `--rec`
  is still reserved for live/record as §3 demands.
- **Typography: drifted, now recorded.** §4 said Space Grotesk carries display, UI *and* the
  wordmark. The shipped app uses **IBM Plex Sans** for all UI chrome; Space Grotesk kept the
  wordmark and display. `AGENTS.md` claims the manual "records which shipped typefaces diverge
  from it, and why" - it did not. §4 now does, with the reason (Space Grotesk is a display face
  and read as styled rather than neutral at 11-14px across dense panels).
- **Everything else in the manual is still literally true**: 7 overlays in `overlays/`, 17 icons
  in `assets/icons/`, and §6's warning that the kit's own HTML pulls fonts from Google Fonts is
  accurate. The new §4 text says explicitly that this applies to the kit files only, never to the
  product, which loads no font from a CDN.

## Not done, and why

- **Repository topics are still empty.** `gh repo edit --add-topic` would help discovery, but the
  topic list is positioning, and positioning is the owner's. Worth one sentence from him.
- **The Releases tab is still empty** and stays empty until the next CLI version ships. The
  workflow change makes `cli-v0.3.0` the first release; nothing can backfill 0.2.0 except a
  deliberate retroactive tag, which would date the release wrong.
- **No e2e run.** Nothing here touches a rendered surface: the diff is the README, three doc
  files, one workflow, three eval scripts and 18 deleted images. `scripts/e2e-affected.mjs`
  ignores `docs/`, `*.md`, `.github/` and non-suite-critical `scripts/` by its own rules, so the
  affected plan is empty by construction.

## Next

`/queue-merge` on this branch. Nothing here blocks anything else, and no other worktree is
touching these files.
