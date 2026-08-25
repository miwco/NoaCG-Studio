import type { Page } from '@playwright/test';

// A GRAPHIC REDUCED TO WHAT A RECEIVER TOUCHES: the SPX globals, and a record of what ran.
//
// Shared by the offline receiver walks (`hosted-control.spec.ts`) and the configured one that
// drives the same generated block against a real control log
// (`configured/relay-cold-boot.spec.ts`). One harness, because the two differ only in what
// answers the RPCs — and a receiver that behaves differently against a mock than against the
// wire is exactly what the configured walk exists to catch.

/** The host page: SPX globals that record every command, plus the receiver block under test. */
export function receiverHost(block: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="f0"></div>
<script>
window.__applied = [];
window.SPXGCTemplateDefinition = { DataFields: [{ field: 'f0', ftype: 'textfield' }] };
function update(json) {
  var d = {};
  try { d = JSON.parse(json || '{}'); } catch (e) { d = {}; }
  window.__applied.push('update:' + (d.f0 === undefined ? '' : d.f0));
  if (d.f0 !== undefined) document.getElementById('f0').textContent = d.f0;
}
function play() { window.__applied.push('play'); }
function stop() { window.__applied.push('stop'); }
function next() { window.__applied.push('next'); }
</script>
<script>${block}</script>
</body></html>`;
}

/** What the host page recorded, in order. */
export function appliedIn(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __applied: string[] }).__applied);
}
