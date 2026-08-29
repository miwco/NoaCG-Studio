# Handoff - Session N: the ograf.dev 83-rule checker pass (2026-08-29)

**Branch:** `claude/n-ograf-checker-pass`. **Private pass only** - nothing listed, submitted, or
reported to anyone, per the owner's playout-first gate (`docs/OGRAF_ECOSYSTEM.md` §5).

## What happened

All six `/ograf` starter packages, plus a post-production package for the two runtime rules gated
on `supportsNonRealTime`, went through <https://ograf.dev/check> - static rules and the opt-in
runtime sandbox. **The per-rule record is `docs/backlog/ograf-checker-83-rules.md`**: all 83 rules
with a verdict, and an argument for every finding not acted on. `docs/OGRAF.md` gained a short
section pointing at it.

**Zero static errors before and after.** Warnings went 6 → 3 (8 → 3 on the two packages with
custom actions), identical on all six.

Safe to repeat: the checker is fully client-side. Its only outbound request is a read-only GET of
the published EBU schema; the zip is unpacked with JSZip in the page, the runtime sandbox serves
bytes from an in-memory service worker, and report sharing encodes into the URL *fragment*.

## What changed in the product

Three fixes, each independently correct rather than a concession to the tool:

1. **`fonts/FONT_LICENSES.md` instead of a root `FONT_LICENSES.md`** (`src/export/common.ts`).
   OFL 1.1 §2 binds the licence to the redistributed font software, so it should survive somebody
   lifting `fonts/` into another project. It also fixed two checker rules at once, both of which
   scan only under `fonts/` and could not see a root file - so every NoaCG folder package was
   reading as an unlicensed font drop. **Affects every folder package, SPX included** - owner-queue
   item filed with the route.
2. **`schema: null` on a custom action that takes no parameters** (`src/export/targets/ograf.ts`).
   The published EBU `lib/action.json` says it in words: *"If the action does not require any
   parameters, set this to null."* We were omitting the field, which leaves a host unable to tell
   an action that needs no input from one whose author forgot to describe it. Verified our own
   reader (`control/ografContract.ts`) and validator already handle null.
3. **`async` on the eight generated lifecycle methods.** Behaviour was already conformant; the
   keyword makes it legible in the signature.

Plus `scripts/ograf-starters-emit.mjs`: builds the six starters headlessly (Rolldown + one
Chromium page, seconds) because the page builds them at click time, which is right for the page
and useless for checking. `--usage post-production` reaches the intent the page never offers.

## The two findings that are the CHECKER's, not ours

Both are argued in full in the backlog file, with the spec quoted. Both are contribution
candidates the day outreach opens; neither is a reason to change the export.

- **R-12 (each declared custom action succeeds) fails for every conformant graphic.** The
  harness calls `customAction({ payload: { action: id } })`; the spec's signature is
  `customAction({ id, payload, skipAnimation })`. It sends no top-level `id`, so our graphic
  correctly answers 400 `no custom action "undefined"`. Passing it would mean reading the action
  id out of a place the standard does not put it. **Side effect worth knowing: this makes the
  checker's R-06 ("an unknown action returns 4xx") vacuous - no graphic ever receives a valid id,
  so every graphic passes it.**
- **R-14 (`goToTime` 2xx) fails because the harness omits a required `load` parameter.** It calls
  `load({data})`; `renderType` carries no `?` in the spec. We default to `realtime` and then
  refuse the seek with 409, which is what keeps non-real-time frames deterministic.

## THE ONE REAL THING THIS FOUND - and it needs a decision, not a patch

**Our light-DOM injected stylesheet carries a `body` rule that restyles the renderer's page.**

The checker flagged X-04 (`body` selector) - but against the wrong stylesheet. Its styling rules
scan `.css` files plus `<style>` blocks inside the module, and our package has neither except the
one inside `OFFLINE_DOCUMENT`, the isolated iframe used for non-real-time seeks, where a `body`
rule is entirely correct. So that finding is a false positive **as located**.

The same concern is real one level away, where the checker cannot see it. `TEMPLATE_CSS` is a
JSON string that `_load()` injects as a `<style>` into the graphic's element in the **light DOM**,
which makes it document-global. Every starter's CSS contains, verbatim:

```css
body { width: 1920px; height: 1080px; overflow: hidden; background: transparent;
       font-family: var(--font-heading); }
```

Mounted in an OGraf renderer, that restyles the HOST page's body - forces its size, hides its
overflow, makes its background transparent and changes its font. With two graphics on two layers,
the last one loaded wins. This is the same shape as the three defects the 2026-08-18 SuperFly.tv
round found (ids, package-relative fonts, colliding field ids): correct under SPX and CasparCG,
where the template IS the document, and wrong the moment the graphic is a component in somebody
else's page.

**Why it was not patched.** Every obvious fix changes rendering and needs a real renderer to
confirm:
- *Drop the `body` rule for the OGraf target.* Loses the inherited heading font for any element
  relying on it - a visible regression.
- *Remap `body` onto the graphic's own element.* Probably the right answer, and it would also give
  the element the 1920×1080 box it currently lacks - but a custom element is `display: inline` by
  default, so width/height are no-ops until display is set too, and that is a rendering decision.

Sized as: a small change in `graphicModule()` plus an `e2e/ograf-conformance.spec.ts` case
(mount a graphic, assert the host document's body is untouched), then a re-run against
SuperFly.tv's ograf-server. Recommend doing it with that renderer round rather than blind.

## Also open

- **Preview images.** S-06 / M-07 `thumbnails` / A-01 all sit on the same limit: a `/ograf`
  package is built in the browser at click time and a page cannot rasterise a cross-document
  iframe, so there is nothing to put in `preview.png`. The CLI's `validate --screenshots` already
  does it where a renderer is available. Shipping previews **with the starters** is now cheap and
  is a product decision: `scripts/ograf-starters-emit.mjs` already drives Chromium, so it could
  shoot a 16:9 settled frame per starter and check it in for the page to add at click time.
- **A root `LICENSE` / manifest `license`.** Info-level, deliberately not added: it would assert a
  licence over the user's own graphic, and the package also carries bundled GSAP, so a blanket
  `MIT` would be wrong about its own contents. A curated `/ograf` starter is the one case where we
  could honestly ship one - owner's call.
- **`gddType` is still not emitted**, so the whole GDD category passed quietly rather than
  provably: G-03..G-08 and G-11 cannot fire against a schema with no `gddType`. Re-run this
  category when the review's §5 item 1 lands.
- **`npm run check:ograf-schema` cannot run locally.** `package.json` declares `ajv@^8.20.0` but
  only `ajv@6.15.0` is installed in the shared tree, so the script dies on import. CI installs
  cleanly; a local run needs `npm install` first. Not caused by this branch.

## Verification

`npm run build` green on this branch (stamp `claude/n-ograf-checker-pass`). E2E: the affected set
plus `ograf-conformance.spec.ts`, run queued -
`ograf-conformance`, `ograf-contract`, `ograf-starters`, `exports`, `package`, `bridge`,
`control`, `local-relay`, `offline`, `production-gate`, `shows`, `template-pack-10`.

Safe to archive once landed.
