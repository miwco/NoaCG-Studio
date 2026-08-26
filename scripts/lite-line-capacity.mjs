// How much text a lower third's SUPPORTING line actually holds on ONE line.
//
//   node scripts/lite-line-capacity.mjs            # the six audited NoaCG Lite chassis
//   node scripts/lite-line-capacity.mjs --check    # GATE: measured vs what LITE_CATALOG claims
//   node scripts/lite-line-capacity.mjs --all      # every lower third in the catalog
//   node scripts/lite-line-capacity.mjs --ids=lt19,lt30,ls17
//   node scripts/lite-line-capacity.mjs --json out.json
//
// SPENDS NO TOKENS. Needs the dev server (it renders the real templates through it).
//
// Why this exists. `LITE_CATALOG` tells the model a chassis has `capacity:high` or
// `capacity:medium`, and that word is one of the few facts it has when choosing. The word was
// authored by hand. Measured 2026-08-07 against the first real generation round, it disagrees
// with the render: designs advertised `capacity:high` wrapped a perfectly ordinary job title
// onto two and three lines, because their supporting line is set in TRACKED UPPERCASE (lt02,
// lt11 and lt25 all declare `text-transform: uppercase` plus the family's wide
// `--label-tracking`), which costs roughly a third of the characters a reader expects.
//
// No existing gate can see that. `overflow-sweep` asks whether a box escapes the frame and a
// wrapped line does not - the panel simply grows downward. The runtime bench's stress pass
// doubles every value and asks the same question. `type-floor` measures font SIZE. So a
// five-line "lower third" passes every check the platform owns, which is exactly the class of
// defect that only a rendered frame reveals.
//
// The method is the field-coverage one, inverted: render the real template, drive the real
// field through `update()`, and read the painted result back - never parse the CSS and reason
// about it. Tracking, transform, font metrics, the auto-fit cap and the panel padding all land
// in the measurement for free, and none of them could be inferred reliably from the source.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

// Real role wording, not filler: `Xxxxx` repeated measures a width no operator ever types, and
// tracked uppercase makes per-character width vary enough that the alphabet matters. These are
// the job titles the frozen fixture bank already uses, longest last. They report WHERE a design
// starts wrapping in practice; they do not set the ceiling (see PROBE).
const ROLES = [
  'Head Coach',
  'Creative Director',
  'Evening News Anchor',
  'East Africa Correspondent',
  'Student Union President',
  'Emergency Management Director',
  'Professor of Environmental Engineering',
  'VP, Responsible AI and Platform Safety',
  'International Development Policy Research Fellow',
];

// The bisect string, and it must be LONGER than any design can hold or the answer is the
// probe's length rather than the design's. The first pass bisected the bank's longest role and
// three designs reported exactly 48 - the string, not a measurement. Still real role wording,
// because per-character width is what is being measured and tracked uppercase has no stable
// average; the prefix is quoted in the output so a number can be reproduced.
const PROBE =
  'International Development Policy Research Fellow and Senior Adviser '
  + 'to the Directorate of Climate Programmes and Regional Partnerships';

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
const ALL = args.includes('--all');
const CHECK = args.includes('--check');
const ONLY_IDS = (args.find((arg) => arg.startsWith('--ids='))?.slice('--ids='.length) ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

// How far the declared number may lag the measurement before the gate complains. Asymmetric on
// purpose: a claim ABOVE the measurement is the defect this exists to catch (the model is told
// text will fit, and it wraps on air), while a claim below it only makes the model cautious.
const STALE_SLACK = 4;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__struct = await import('/src/model/structure.ts');
  window.__lite = await import('/src/ai/lite/contract.ts');
});

// The audited chassis and what each CLAIMS come from LITE_CATALOG itself, never from a copy
// kept here: a gate whose expected values live beside it is checking its own homework, and the
// duplicate is what would go stale the next time a chassis is audited in.
const targets = ONLY_IDS.length
  ? (await page.evaluate((ids) => ids.map((id) => {
      const variant = window.__cat.variantById(id);
      return { id, name: variant?.name ?? id, claims: null };
    }), ONLY_IDS))
  : ALL
  ? (await page.evaluate(() => (window.__cat.CATALOG['lower-third'] || []).map((v) => ({ id: v.id, name: v.name, claims: null }))))
  : (await page.evaluate(() => window.__lite.LITE_CATALOG.map((e) => ({
      id: e.variantId, name: e.name, claims: e.supportingLineChars ?? null,
    }))));

await page.evaluate(() => {
  /**
   * Render one chassis, drive its supporting line through `update()` with each candidate
   * string, and report how many lines the painted element takes.
   *
   * Line count is height / line-height rather than a wrap detector: `getClientRects()` would
   * answer per fragment and a design that pads or line-clamps its own line would report a
   * number that has nothing to do with what a viewer sees.
   */
  window.__capacity = async (id, roles, probe) => {
    document.body.innerHTML = '';
    const variant = window.__cat.variantById(id);
    const template = variant.create({});
    const prefix = window.__struct.detectPrefix(template.html);
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
    frame.srcdoc = window.__comp.composeDocument(template);
    document.body.appendChild(frame);
    await new Promise((r) => setTimeout(r, 900));

    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    // Settle to the on-air state before measuring: mid-entrance a line can be scaled or
    // clipped, and a capacity read taken then describes a frame nobody holds on.
    try { win.play && win.play(); } catch { /* a design with no play() still measures */ }
    await new Promise((r) => setTimeout(r, 2400));

    // The supporting line is the SECOND text field. Reading it off the definition rather than
    // guessing `f1` keeps this correct for a design whose first field is a logo slot.
    const fields = (win.SPXGCTemplateDefinition?.DataFields ?? [])
      .filter((f) => f.ftype === 'textfield' || f.ftype === 'textarea');
    const roleField = fields[1]?.field ?? 'f1';
    const el = doc.querySelector(`.${prefix}-title`) ?? doc.getElementById(roleField);
    if (!el) return { id, error: 'no supporting line element' };

    const measure = async (text) => {
      win.update(JSON.stringify({ [roleField]: text }));
      await new Promise((r) => setTimeout(r, 90));
      const cs = win.getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const lines = Math.max(1, Math.round(el.getBoundingClientRect().height / lineHeight));
      return { lines, fontPx: Math.round(parseFloat(cs.fontSize) * 10) / 10, transform: cs.textTransform, tracking: cs.letterSpacing };
    };

    const rows = [];
    for (const role of roles) rows.push({ role, chars: role.length, ...(await measure(role)) });

    // The break-even point: the longest single-line string, found by bisecting the probe rather
    // than by dividing a width by an average glyph. Tracked uppercase has no stable average -
    // that is the whole reason the authored capacity word was wrong.
    let lo = 1;
    let hi = probe.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const { lines } = await measure(probe.slice(0, mid).trim());
      if (lines <= 1) lo = mid; else hi = mid - 1;
    }
    // A design that never wrapped the whole probe has a ceiling ABOVE what was measured, and
    // saying so is the difference between a measurement and the probe's own length.
    const unbounded = lo >= probe.length;
    const style = await measure(probe.slice(0, lo).trim());
    frame.remove();
    return {
      id, maxSingleLineChars: lo, unbounded, sample: probe.slice(0, lo).trim(),
      fontPx: style.fontPx, transform: style.transform, tracking: style.tracking, rows,
    };
  };
});

const results = [];
for (const target of targets) {
  const r = await page.evaluate(
    ([id, roles, probe]) => window.__capacity(id, roles, probe),
    [target.id, ROLES, PROBE],
  );
  results.push({ ...target, ...r });
}
await browser.close();

if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1));

console.log('Supporting-line capacity, measured at 1920x1080 with default options.\n');
console.log('chassis  name            claims  measured  size  transform  tracking   first wrap in the role bank');
for (const r of results) {
  if (r.error) { console.log(`${r.id.padEnd(8)} ${String(r.name).padEnd(15)} ERROR: ${r.error}`); continue; }
  const firstWrap = r.rows.find((row) => row.lines > 1);
  console.log(
    `${r.id.padEnd(8)} ${String(r.name).padEnd(15)} ${String(r.claims ?? '-').padEnd(7)} ` +
    `${String(r.unbounded ? `>${r.maxSingleLineChars}` : r.maxSingleLineChars).padEnd(9)} ${String(r.fontPx).padEnd(5)} ` +
    `${String(r.transform).padEnd(10)} ${String(r.tracking).padEnd(10)} ` +
    (firstWrap ? `${firstWrap.chars} chars ("${firstWrap.role}")` : 'never wrapped'),
  );
}

const measured = results.filter((r) => !r.error);
const ranked = [...measured].sort((a, b) => a.maxSingleLineChars - b.maxSingleLineChars);
if (ranked.length) {
  console.log(`\nTightest: ${ranked[0].id} at ${ranked[0].maxSingleLineChars} characters. ` +
    `Widest: ${ranked[ranked.length - 1].id} at ${ranked[ranked.length - 1].maxSingleLineChars}.`);
}

if (!CHECK) {
  console.log('Run with --check to gate LITE_CATALOG.supportingLineChars against these numbers.');
  process.exitCode = measured.length === results.length ? 0 : 1;
} else {
  // The gate. A claim ABOVE the measurement is the defect: the model is told the text will fit
  // and it wraps on air, which no other gate in the tree can see (a wrapped line does not
  // escape its frame, so overflow-sweep and the runtime bench both pass it).
  const problems = [];
  for (const r of measured) {
    if (typeof r.claims !== 'number') {
      problems.push(`${r.id}: declares no supportingLineChars (measured ${r.maxSingleLineChars}).`);
    } else if (r.claims > r.maxSingleLineChars) {
      problems.push(`${r.id}: claims ${r.claims} characters, holds ${r.maxSingleLineChars}. `
        + `The model is being told text will fit that wraps on air.`);
    } else if (r.claims < r.maxSingleLineChars - STALE_SLACK) {
      problems.push(`${r.id}: claims ${r.claims} characters and holds ${r.maxSingleLineChars} `
        + `- stale by more than ${STALE_SLACK}, so the design is being under-used.`);
    }
  }
  const failedToMeasure = results.filter((r) => r.error).map((r) => `${r.id}: ${r.error}`);
  for (const line of [...failedToMeasure, ...problems]) console.log(`  x ${line}`);
  if (problems.length || failedToMeasure.length) {
    console.log(`\n${problems.length + failedToMeasure.length} problem(s). Update supportingLineChars in `
      + 'src/ai/lite/contract.ts to the measured column, or fix the design.');
    process.exitCode = 1;
  } else {
    console.log(`\nLITE_CATALOG agrees with the render on all ${measured.length} chassis.`);
  }
}
