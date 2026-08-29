/**
 * `NOACG_ONLY_DESIGNS` - the catalog specs' half of the affected slice.
 *
 * The catalog-wide specs measure a RENDERED graphic, one page at a time, over 500+ designs, so a
 * change that touched one lower third used to re-measure the whole set. `scripts/catalog-affected.mjs`
 * derives which designs a change can actually move and sets this variable; a spec that iterates
 * the catalog passes it into its own `page.evaluate` and skips the designs nobody asked about.
 * `NOACG_ONLY_CATEGORIES` rides alongside it for the one spec whose UNITS are per category
 * (e2e/catalog/catalog-bench.spec.ts), so a unit with nothing in scope is never started at all.
 *
 * UNSET IS THE DEFAULT AND MEANS EVERYTHING - neither CI's catalog job nor the nightly sets it, so
 * both measure the whole catalog exactly as before. Nothing about WHAT is measured changes when it
 * is set; only how many designs it is measured over. Set it through `scripts/catalog-specs.mjs`
 * rather than by hand: that is where an id the catalog does not ship is refused, before a browser
 * starts, and where the category list below is derived instead of typed.
 *
 * The value is a comma-separated list of design ids: `NOACG_ONLY_DESIGNS=lt01,sb14`.
 */
const envList = (name: string): string[] | null => {
  const items = (process.env[name]?.trim() ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
};

export const ONLY_DESIGNS: string[] | null = envList('NOACG_ONLY_DESIGNS');

/** For a test title / annotation, so a scoped run says so in its own report. */
export const SCOPE_NOTE = ONLY_DESIGNS ? ` [scoped to ${ONLY_DESIGNS.length} design(s)]` : '';

/**
 * The CATEGORIES the scoped designs live in, when the caller knew them
 * (`scripts/catalog-affected.mjs` does). Unset means "do not skip anything on this basis" - a
 * hand-set `NOACG_ONLY_DESIGNS` with no category list still measures correctly, just without the
 * per-unit saving.
 */
export const ONLY_CATEGORIES: string[] | null = envList('NOACG_ONLY_CATEGORIES');

/** Is this whole category out of scope? False whenever the category list is unset. */
export function categoryOutOfScope(category: string): boolean {
  return ONLY_CATEGORIES !== null && !ONLY_CATEGORIES.includes(category);
}
