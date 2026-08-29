// `--only <design-ids>` - the one definition, shared by every catalog sweep.
//
// The sweeps render one design at a time and there are 500+ of them, so measuring the whole
// catalog to check a change that touched one lower third is the cost the owner asked us to stop
// paying (2026-08-28). `scripts/catalog-affected.mjs` derives WHICH designs a change can move;
// this is the flag every sweep takes to be told.
//
// The semantics are deliberately strict in one direction: an id that the catalog does not ship
// is an ERROR, never an empty run. A typo, a renamed design or a stale command line must not
// read as "swept, nothing wrong" - that is the one failure mode with no alarm attached.
//
//   node scripts/type-floor.mjs --only lt01,lt02
//   node scripts/type-floor.mjs lower-third --only lt01     # composes with the category
//
// NOTHING ABOUT WHAT IS MEASURED CHANGES. A scoped run applies the same floors, the same
// tolerances and the same baseline rows to fewer designs. These four sweeps run unscoped in the
// NIGHTLY (.github/workflows/nightly.yml) and nowhere else - CI's catalog job carries the emit
// gate and the calibration tripwire, not these. docs/VERIFICATION.md has the table.

/**
 * Every id the catalog ships, read out of a sweep's own page - each sweep has already imported
 * the catalog as `window.__cat`. This is what tells a typo from a design a given sweep does not
 * cover, and `applyOnly` evaluates it itself so no caller has to.
 */
const ALL_CATALOG_IDS = () =>
  Object.values(window.__cat.CATALOG).flatMap((variants) => (variants || []).map((v) => v.id));

/**
 * Parse `--only` out of an argv slice.
 *
 * @param {string[]} args
 * @returns {{ ids: string[]|null, at: number, raw: string|null }}
 *   `ids` is null when the flag was not passed at all.
 */
export function parseOnly(args) {
  const at = args.indexOf('--only');
  if (at < 0) return { ids: null, at: -1, raw: null };
  const raw = args[at + 1] ?? null;
  const ids = String(raw && !raw.startsWith('--') ? raw : '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    console.error('--only takes a comma-separated list of design ids (e.g. --only lt01,sb14).');
    process.exit(2);
  }
  return { ids, at, raw };
}

/**
 * Narrow a sweep's target list to `ids`.
 *
 * TWO CASES THAT LOOK THE SAME AND ARE NOT, which is the whole reason this is shared code:
 *
 *  - an id THE CATALOG DOES NOT SHIP is a mistake - a typo, or a design that was renamed or
 *    removed (and a removal is a catalog-wide change that wants a full run). It REFUSES, because
 *    a mistyped scope that reads as "swept, nothing wrong" is the one failure mode with no alarm
 *    attached.
 *  - an id the catalog ships but THIS SWEEP does not cover is ordinary. Every sweep has a
 *    coverage rule of its own - numerals only measures categories where a number changes on air,
 *    type-floor and field-coverage exempt imported designs - so an honest affected slice will
 *    routinely name designs a given sweep has nothing to say about. Those are dropped, named in
 *    the output, and if that leaves nothing the sweep exits 0 saying so. Refusing there would
 *    make the scoped battery unusable, and quietly passing an empty sweep would be a lie.
 *
 * The target list can only be read out of a live page, so this runs with a browser already open -
 * hence `cleanup`, which every caller passes as `() => browser.close()`. A refusal that left a
 * headless Chromium running would be its own small version of the bug e2e/AGENTS.md warns about
 * under "Stopping a background bench does not stop the bench".
 *
 * @template {{ id: string }} T
 * @param {T[]} covered   what the sweep was going to measure
 * @param {string[]|null} ids
 * @param {string} label  the sweep's name, for the messages
 * @param {import('@playwright/test').Page} page  the sweep's page, with the catalog on it
 * @param {() => Promise<unknown>|unknown} cleanup
 * @returns {Promise<T[]>}
 */
export async function applyOnly(covered, ids, label, page, cleanup) {
  if (!ids) return covered;
  const shipped = new Set(await page.evaluate(ALL_CATALOG_IDS));
  const unknown = ids.filter((id) => !shipped.has(id));
  if (unknown.length) {
    console.error(
      `${label}: --only named ${unknown.length} id(s) the catalog does not ship: ${unknown.join(', ')}.\n` +
        '  A typo, or a design that was renamed or removed - and a removal is a catalog-wide\n' +
        '  change, so re-run the whole sweep rather than scoping it.',
    );
    await cleanup();
    process.exit(2);
  }
  const inCoverage = new Set(covered.map((t) => t.id));
  const skipped = ids.filter((id) => !inCoverage.has(id));
  if (skipped.length) {
    console.log(`${label}: ${skipped.length} of the named design(s) are outside this sweep's coverage: ${skipped.join(', ')}`);
  }
  const want = new Set(ids);
  const picked = covered.filter((t) => want.has(t.id));
  if (picked.length === 0) {
    console.log(`${label}: nothing to measure - none of the ${ids.length} named design(s) are in this sweep's coverage. PASS by vacancy.`);
    await cleanup();
    process.exit(0);
  }
  return picked;
}

/**
 * The one line every sweep's header prints about its scope, so all four say it the same way and
 * all four say how many designs survived the sweep's own coverage rule - which three of them
 * did not when each wrote its own.
 *
 * @param {string[]|null} ids
 * @param {number} picked  designs this run will measure
 * @param {number} all     designs this sweep covers at full scope
 */
export const scopeNote = (ids, picked, all) => (ids ? ` — SCOPED to ${picked} of ${all} designs` : '');
