/**
 * `NOACG_ONLY_DESIGNS` - the catalog specs' half of the affected slice.
 *
 * The catalog-wide specs measure a RENDERED graphic, one page at a time, over 500+ designs, so a
 * change that touched one lower third used to re-measure the whole set. `scripts/catalog-affected.mjs`
 * derives which designs a change can actually move and sets this variable; a spec that iterates
 * the catalog filters through `wantedDesign` and skips a unit with nothing left in it.
 *
 * UNSET IS THE DEFAULT AND MEANS EVERYTHING - CI's catalog job and the nightly never set it, so
 * the full battery keeps running on a schedule exactly as before. Nothing about WHAT is measured
 * changes when it is set; only how many designs it is measured over.
 *
 * The value is a comma-separated list of design ids: `NOACG_ONLY_DESIGNS=lt01,sb14`.
 */
export const ONLY_DESIGNS: string[] | null = (() => {
  const raw = process.env.NOACG_ONLY_DESIGNS?.trim();
  if (!raw) return null;
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : null;
})();

/** For a test title / annotation, so a scoped run says so in its own report. */
export const SCOPE_NOTE = ONLY_DESIGNS ? ` [scoped to ${ONLY_DESIGNS.length} design(s)]` : '';

/** Is this design in scope? Always true when the variable is unset. */
export function wantedDesign(id: string): boolean {
  return !ONLY_DESIGNS || ONLY_DESIGNS.includes(id);
}

/**
 * The scope as a value to hand into `page.evaluate` - `null` means "no filtering", which is what
 * the in-page loops check. Passing it in rather than reading the env inside the page is the only
 * option: the page has no process.
 */
export const SCOPE_ARG: string[] | null = ONLY_DESIGNS;
