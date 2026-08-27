// WHAT A STUDENT'S SEARCH ACTUALLY RETURNS — the measurement behind the graphics-shop work.
//   node scripts/spike-search-journey.mjs [--json out.json]
//
// Runs the terms a student types (English, Swedish, Finnish) through the REAL
// `browseTemplates`, inside the dev server's module graph, and prints the first page's worth
// of hits with the category each one sits in. A term that returns nothing, or returns the
// wrong shelf, is the finding — not an opinion about the UI.
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const TERMS = {
  en: [
    'lower third', 'name card', 'nameplate', 'topic', 'topic text', 'big title', 'title',
    'credits', 'stinger', 'scoreboard', 'countdown', 'quiz', 'logo', 'sponsor', 'ticker',
    'break screen', 'question', 'result',
  ],
  sv: [
    'namnskylt', 'namn', 'textremsa', 'ämne', 'rubrik', 'titel', 'eftertexter', 'vinjett',
    'resultattavla', 'nedräkning', 'frågesport', 'logga', 'sponsor', 'nyhetsband', 'paus',
    'fråga', 'resultat', 'poängtavla', 'omröstning', 'klocka',
  ],
  fi: [
    'nimikyltti', 'nimi', 'tekstiplanssi', 'aihe', 'otsikko', 'lopputekstit', 'siirtymä',
    'tulostaulu', 'ajastin', 'kysely', 'logo', 'sponsori', 'uutisnauha', 'tauko', 'kysymys',
    'tulokset', 'pisteet', 'äänestys', 'kello', 'juonto',
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);

const report = await page.evaluate(async (terms) => {
  const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
  const { graphicCategoryById } = await import('/src/model/taxonomy.ts');
  const out = {};
  for (const [locale, list] of Object.entries(terms)) {
    out[locale] = list.map((query) => {
      const res = browseTemplates({ ...NO_BROWSE_FILTERS, query });
      const rows = [...(res.best ?? []), ...(res.also ?? [])];
      const cats = {};
      for (const r of rows) {
        const name = graphicCategoryById(r.meta.category).name;
        cats[name] = (cats[name] ?? 0) + 1;
      }
      return {
        query,
        total: res.total,
        top: rows.slice(0, 6).map((r) => `${r.variant.name} [${graphicCategoryById(r.meta.category).name}]`),
        categories: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4),
      };
    });
  }
  return out;
}, TERMS);
await browser.close();

for (const [locale, rows] of Object.entries(report)) {
  console.log(`\n══ ${locale.toUpperCase()} ══`);
  for (const r of rows) {
    const flag = r.total === 0 ? '  ✗ NOTHING' : '';
    console.log(`\n"${r.query}" — ${r.total} result(s)${flag}`);
    if (r.total) {
      console.log(`   shelves: ${r.categories.map(([n, c]) => `${n}×${c}`).join(', ')}`);
      r.top.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
    }
  }
}

const jsonFlag = process.argv.indexOf('--json');
if (jsonFlag > -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(process.argv[jsonFlag + 1], JSON.stringify(report, null, 2));
}

const dead = Object.entries(report).flatMap(([l, rows]) =>
  rows.filter((r) => r.total === 0).map((r) => `${l}:${r.query}`));
console.log(`\nDEAD TERMS (${dead.length}): ${dead.join(', ') || 'none'}`);
