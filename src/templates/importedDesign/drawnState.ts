// THE DRAWN-STATE MECHANISM: the one thing every behaviour bound to imported artwork shares
// (docs/GRAPHIC_BEHAVIOUR_PLAN.md §4, model L2 - and §12 for why it is the ONLY shared part).
//
// The designer draws a moment as its own layer and the runtime decides when it is visible. The
// quiz uses it for the pick, the lock and the verdict; the poll uses it for the VOTE NOW badge,
// the percentage figures and the winner mark. What each behaviour then DOES with a state is
// entirely its own - which is why this file holds the mechanism and nothing else.
//
// The class NAMES stay per-behaviour rather than being folded into one pair. They are a contract
// with files people have already exported: an exported quiz board carries
// `.imported-design-qstate` inside it and a playout machine reads that file, not this one.
// Sharing the mechanism costs nothing; renaming the contract would cost a migration for no gain.
//
// It lives in its own module rather than in behaviour.ts so that the behaviour modules can use it
// without importing the table that lists them - a cycle that happens to work is still a cycle.

/** The two rules that make a drawn layer a state. `inline` rather than `block`: these are SVG
 *  elements, and `inline` is the initial value SVG content is laid out with. */
export function drawnStateCss(stateClass: string, onClass: string, headline: string, blurb: string): string {
  return `/* ── ${headline} ──
${blurb} */
.${stateClass} {
  display: none;                   /* drawn, and waiting for its state */
}
.${stateClass}.${onClass} {
  display: inline;                 /* SVG content lays out inline - never block */
  visibility: visible;             /* beats the exporter's own hiding class (two classes win) */
}`;
}

/** The show/hide of one drawn state, as emitted JS. CLASSES ONLY - a snap clears inline styles
 *  but never classes, so a state painted inline would disappear on recovery while the machine
 *  still held it (the trap quiz/shared.ts documents, paid for once). */
export function drawnStateShowJs(fn: string, onClass: string): string {
  return `// ${fn}(id, on): one drawn state, visible or not. Classes only - a snap clears inline styles
// but never classes, so a state painted inline would disappear on recovery while the machine
// still held it.
function ${fn}(id, on) {
  var el = document.getElementById(id);
  if (!el) return;                 // not drawn - nothing to show, and that is a valid board
  if (on) el.classList.add('${onClass}');
  else el.classList.remove('${onClass}');
}`;
}

/**
 * Strip whatever the designer used to hide a layer, so the state class is the only thing deciding
 * whether it shows.
 *
 * The designer hid this layer to see their base look; the stylesheet hides it now, so the file's
 * own display/visibility would fight the class that shows it. Two of the three forms are handled
 * here - the attribute and the inline style. The third, a CLASS whose rule lives in the file's own
 * `<style>` block, is Illustrator's default export shape and is handled at import
 * (`hiddenClasses` in assets/svgImport.ts); it cost a defect on 2026-08-28 before anything read it.
 */
export function clearDrawnHiding(el: Element): void {
  el.removeAttribute('display');
  el.removeAttribute('visibility');
  const style = el.getAttribute('style');
  if (!style) return;
  const kept = style
    .split(';')
    .filter((d) => !/^\s*(display|visibility)\s*:/i.test(d))
    .join(';');
  if (kept.trim()) el.setAttribute('style', kept);
  else el.removeAttribute('style');
}
