// WHICH TERMS A BRIEF IS SEARCHED BY, and whether the unreachable-token drop can touch any of
// them. Attribution only - run it when a retrieval result moves and the cause is not obvious.
//   node scripts/spike-brief-terms.mjs
//
// It asks each term twice: once as a PERSON's search (the drop is on) and once as a BRIEF TERM
// (the drop is off, `BrowseContext.briefTerm`). A term whose two totals differ is one the drop
// would have changed; if none differ, the drop is not what moved the shortlist.
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

// The worship brief from e2e/adapt-first.spec.ts, with the intent that spec's first stage returns.
const BRIEF = 'A worship service lower third with the scripture reference and the reader name';
const INTENT = {
  kind: 'family',
  families: ['strap'],
  confidence: 'high',
  summary: 'A lower third naming a reader and a scripture reference.',
  parts: [{ id: 'line', role: 'line' }],
  fields: [
    { key: 'reader', role: 'line', label: 'Reader' },
    { key: 'reference', role: 'line', label: 'Scripture reference' },
  ],
  tone: ['calm'],
  originalityRequested: false,
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const rows = await page.evaluate(async ({ brief, intent }) => {
  const { briefTerms } = await import('/src/ai/retrieval.ts');
  const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
  return briefTerms(brief, intent).map((term) => {
    const person = browseTemplates({ ...NO_BROWSE_FILTERS, query: term });
    const asBrief = browseTemplates({ ...NO_BROWSE_FILTERS, query: term }, { briefTerm: true });
    return { term, person: person.total, brief: asBrief.total, ignored: person.ignored };
  });
}, { brief: BRIEF, intent: INTENT });
await browser.close();

console.log('term                      as-a-person  as-a-brief-term  ignored');
for (const r of rows) {
  console.log(
    `${r.term.padEnd(24)} ${String(r.person).padStart(11)} ${String(r.brief).padStart(16)}  ${JSON.stringify(r.ignored)}`,
  );
}
const moved = rows.filter((r) => r.person !== r.brief);
console.log(`\nTerms the drop would have CHANGED: ${moved.length ? moved.map((m) => m.term).join(', ') : 'none'}`);
