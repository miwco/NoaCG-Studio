// The FOOTPRINT STABILITY SWEEP: renders every catalog variant twice — once with SHORT operator
// text and once with LONG operator text — and reports how much the graphic's own box MOVED
// between the two, on BOTH axes.
//
// Why this exists: `width: fit-content` is the catalog's default panel rule (DESIGN_LANGUAGE §5,
// emitted in shared/standard.ts and re-emitted by every self-assembling category), so a panel
// hugs whatever the operator typed. On a NAMEPLATE that is the broadcast convention — each guest
// gets a strap cut to their name. On a BOARD it is a defect: a quiz panel that is one size for
// "Who won?" and another for the next question re-sizes itself in front of the audience, and a
// scorebug that grows when a substitute with a longer name comes on does it live, on air.
//
// BOTH AXES, because a width floor does not make a board stable. Measured 2026-08-20 on qz01: the
// panel is pinned at 1080px at every text length — its `min-width` floor makes the ABSOLUTELY
// POSITIONED root shrink-wrap to exactly the floor, so `fit-content` has no room left to grow
// into and the wrap cap above it never binds. The board still changes size with the question,
// because the text that can no longer widen it wraps and makes it TALLER instead. A width-only
// instrument would have called that design stable and closed the investigation.
//
// Nothing in the repo measured this. `overflow-sweep` asks whether a box escapes the frame and
// `catalog-geometry` asks where it sits — both at the design's own DEFAULT text, which is exactly
// the one content length at which a size wobble is invisible. This sweep is the instrument for
// the width-mode contract (src/templates/AGENTS.md): a design declared `fixed` must measure a
// zero delta here, a design declared `hug` may move and is only recorded.
//
// Per variant it reports three boxes, in frame coordinates, at each of the two text lengths:
//   bbox   — the union of every painted element (what the viewer sees change size)
//   box    — the auto-fit panel itself (`.<prefix>-box`), when the design has one
//   plate  — the largest element carrying an opaque-ish background that is not a full-frame
//            backdrop; the reading surface, which is what reads as "the graphic" on a design
//            whose union bbox is a full-frame scrim
// …and the delta of each, on each axis. A design's SCORE is the largest of those six moves,
// because any one of them shifting is the audience watching the graphic re-size itself.
//
// A note on why two lengths are enough: `fit-content` is monotonic in content size, so a design
// that measures the same box at 3 characters and at 64 is pinned across the whole range between
// them. A zero here is a real zero, not an unlucky pair of samples.
//
// FIRST FULL RUN, 2026-08-20, 503 variants, realistic mode: 416 move. Split by the width-mode
// families, 264 of the 314 BOARD designs change size with ordinary operator text — the median
// move is 46px (quiz) to 550px (starting-soon), and it is as often HEIGHT as width. Two readings
// that shaped the contract:
//   - TICKERS ARE ALREADY FINE. 15 of 22 move on `bbox` and only 1 on `plate` or `box`: what
//     grows is the SCROLLING TRACK, which is the crawl working. The strip is `width: 100%` and
//     never moves. A verdict read off `bbox` alone would have put 22 designs on a work list that
//     has nothing wrong with it.
//   - A NULL BOX IS NOT A STABLE BOX. A full-frame design has no plate under the 95% rule and
//     often no `-box` either, so two of the three measurements are absent rather than zero. The
//     per-variant verdict is the largest move among the boxes that WERE measured, and the report
//     prints the unmeasured count per category so a blind zero cannot read as a clean one.
//
// Usage (dev server must be running for this checkout — scripts/dev-port.mjs):
//   node scripts/footprint-stability-sweep.mjs                 # sweep every category
//   node scripts/footprint-stability-sweep.mjs quiz            # one category
//   node scripts/footprint-stability-sweep.mjs --json out.json # dump every row for diffing
//   node scripts/footprint-stability-sweep.mjs --top 40        # the 40 worst rows (default 25)
//   node scripts/footprint-stability-sweep.mjs --axis w        # score width only (or `h`)
//   node scripts/footprint-stability-sweep.mjs --stress        # worst case, not realistic
//
// This is a REPORT, not a gate. The gate is e2e/catalog/footprint-stability.spec.ts, which
// asserts the zero on the designs that declare `fixed`; a sweep over 400+ variants is too slow to
// be one, and the categories that hug BY DESIGN would make a zero-tolerance run meaningless.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const FRAME_W = 1920;
const FRAME_H = 1080;

// TWO CONTENT MODES, and the default one is the realistic one.
//
// `--stress` drives EVERY text field to the same pair of strings — a three-letter answer and a
// full broadcast sentence. That is the worst case an operator can produce, and it is what the
// first run of this sweep measured. It over-reports badly: a ticker's crawl IS its text, and a
// programme list handed 64 characters per row grew 8905px tall (ss18). Those designs are not
// broken; the input was.
//
// The DEFAULT mode scales each field against ITS OWN sample value, so a name stays name-shaped
// and a question stays question-shaped, and what the sweep measures is the variation one rundown
// actually produces: a short guest name against a long one, not a name against a paragraph.
const STRESS_SHORT = 'Ann';
const STRESS_LONG = 'Katarzyna Wisniewska-Lindqvist reports from the eastern district';

// Sub-pixel rounding and antialias bleed move a bounding rect by a fraction of a pixel without
// anything having changed. Below this a design is stable.
const STABLE_TOLERANCE = 2;

const args = process.argv.slice(2);
const consumed = new Set();
const flagVal = (name) => {
  const at = args.indexOf(name);
  if (at < 0) return null;
  consumed.add(at);
  consumed.add(at + 1);
  return args[at + 1] ?? null;
};
const jsonOut = flagVal('--json');
// Worst-case mode: the same two strings in every field, ignoring what the field is for.
const stress = args.includes('--stress');
const topN = Number(flagVal('--top') || 25);
// Both axes count by default. `--axis w` / `--axis h` narrows the SCORE (never the measurement),
// for the days when one axis is the question being asked.
const axisFlag = (flagVal('--axis') || 'wh').toLowerCase();
const AXES = ['w', 'h'].filter((a) => axisFlag.includes(a));
const only = args.find((a, i) => !consumed.has(i) && !a.startsWith('--')) || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
});

const targets = await page.evaluate(
  (only) =>
    window.__wiz.CATEGORIES.filter((c) => !only || c.id === only).flatMap((c) =>
      (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })),
    ),
  only,
);
if (!targets.length) {
  console.error(only ? `No variants for category "${only}".` : 'No variants found.');
  await browser.close();
  process.exit(2);
}

await page.evaluate(
  ({ FRAME_W }) => {
    // Render one batch off-screen at full frame size with every TEXT field driven to `text`,
    // settle it, and read the three boxes back.
    //
    // Only `textfield` and `textarea` are driven. A number, a dropdown, a colour or a filelist is
    // not the operator typing prose, and writing a sentence into a dropdown that names the
    // graphic's own states would break the design rather than measure it.
    // A field's value at one end of the range, derived from ITS OWN sample so the field keeps
    // its role: the first ~40% of a sample's words for `short`, the sample padded out to ~1.7x
    // its length for `long`. An empty sample (a hidden input-only field) stays empty.
    window.__fieldText = (sample, end) => {
      const t = String(sample || '').trim();
      if (!t) return t;
      if (end === 'default') return t; // the design's own calibrated content, untouched
      if (end === 'short') {
        const words = t.split(/\s+/);
        return words.slice(0, Math.max(1, Math.round(words.length * 0.4))).join(' ');
      }
      // Ordinary broadcast words, so the padded value still reads as something an operator typed.
      const FILL = ['Wisniewska', 'district', 'provisional', 'afternoon', 'coverage', 'regional'];
      const target = Math.max(t.length + 8, Math.round(t.length * 1.7));
      let out = t;
      for (let i = 0; out.length < target; i++) out += ' ' + FILL[i % FILL.length];
      return out;
    };

    window.__scanFootprint = async (ids, end, fixedText) => {
      document.body.innerHTML = '';
      const frames = ids.map((id) => {
        const v = window.__cat.variantById(id);
        const f = document.createElement('iframe');
        // The iframe IS the frame: an element's offset inside it maps straight onto frame coords.
        f.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
        try {
          f.srcdoc = window.__comp.composeDocument(v.create({}));
        } catch (e) {
          f.dataset.err = String((e && e.message) || e);
        }
        document.body.appendChild(f);
        return { id, f };
      });
      await new Promise((r) => setTimeout(r, 900));

      // Update BEFORE play, the order SPX itself uses: the operator fills the row, then takes it.
      for (const { f } of frames) {
        try {
          const fields = (f.contentWindow.SPXGCTemplateDefinition || {}).DataFields || [];
          const data = {};
          for (const fd of fields) {
            if (fd.ftype !== 'textfield' && fd.ftype !== 'textarea') continue;
            data[fd.field] = fixedText === null ? window.__fieldText(fd.value, end) : fixedText;
          }
          if (Object.keys(data).length) f.contentWindow.update(JSON.stringify(data));
        } catch { /* a template that takes no text is stable by construction */ }
      }
      await new Promise((r) => setTimeout(r, 300));
      for (const { f } of frames) {
        try {
          f.contentWindow.play && f.contentWindow.play();
        } catch { /* a template without play() still has a measurable box */ }
      }
      // Settle: presets run ~1.2 s, steps and loops a little longer.
      await new Promise((r) => setTimeout(r, 2400));

      return frames.map(({ id, f }) => {
        const out = { id, err: f.dataset.err || null, bbox: null, box: null, plate: null, fields: 0 };
        try {
          const w = f.contentWindow;
          out.fields = ((w.SPXGCTemplateDefinition || {}).DataFields || []).filter(
            (fd) => fd.ftype === 'textfield' || fd.ftype === 'textarea',
          ).length;
          const px = (n) => Math.round(n * 100) / 100;
          let minL = Infinity;
          let maxR = -Infinity;
          let minT = Infinity;
          let maxB = -Infinity;
          let plate = null;
          for (const el of f.contentDocument.body.querySelectorAll('*')) {
            const cs = w.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            if (!(parseFloat(cs.opacity) > 0.03)) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 1 && r.height < 1) continue; // a zero-box paints nothing

            minL = Math.min(minL, r.left);
            maxR = Math.max(maxR, r.right);
            minT = Math.min(minT, r.top);
            maxB = Math.max(maxB, r.bottom);

            // The auto-fit panel, by the class the assemblers emit (`.<prefix>-box`).
            if (out.box === null && /(^|\s)[\w-]+-box(\s|$)/.test(el.className || '')) {
              out.box = { w: px(r.width), h: px(r.height) };
            }

            // The reading surface: the largest element with a background that is not a full-frame
            // backdrop. A scrim covering the frame never moves, so counting it as the plate would
            // report every card design stable while its panel wobbled underneath.
            const bg = cs.backgroundColor || '';
            const alpha = /rgba?\(([^)]+)\)/.exec(bg);
            const opaqueish = alpha
              ? alpha[1].split(',').length < 4 || parseFloat(alpha[1].split(',')[3]) > 0.15
              : false;
            const hasFill = opaqueish || (cs.backgroundImage && cs.backgroundImage !== 'none');
            if (hasFill && r.width < FRAME_W * 0.95 && r.height > 8) {
              const area = r.width * r.height;
              if (!plate || area > plate.area) plate = { w: px(r.width), h: px(r.height), area };
            }
          }
          out.bbox = minL < maxR ? { w: px(maxR - minL), h: px(maxB - minT) } : null;
          out.plate = plate === null ? null : { w: plate.w, h: plate.h };
        } catch (e) {
          out.err = (out.err || '') + ' READ:' + String((e && e.message) || e);
        }
        return out;
      });
    };
  },
  { FRAME_W },
);

/** Run one full pass over every target at one end of the content range. */
async function pass(end, label) {
  const fixedText = stress ? (end === 'short' ? STRESS_SHORT : STRESS_LONG) : null;
  const byId = new Map();
  for (let i = 0; i < targets.length; i += 12) {
    const slice = targets.slice(i, i + 12);
    const res = await page.evaluate(
      ({ ids, end, fixedText }) => window.__scanFootprint(ids, end, fixedText),
      { ids: slice.map((t) => t.id), end, fixedText },
    );
    for (const r of res) byId.set(r.id, r);
    process.stderr.write(`\r  ${label}: ${Math.min(i + 12, targets.length)}/${targets.length}   `);
  }
  process.stderr.write('\n');
  return byId;
}

// `--stage` answers the question the FIX asks rather than the one the report asks: what is each
// design's box at its OWN calibrated content? That number is the stage width a board should
// declare, because freezing a design at the size its author drew it removes the wobble without
// changing how it looks at the content it was designed for.
if (args.includes('--stage')) {
  const at = await pass('default', 'stage');
  await browser.close();
  console.log(`\nSTAGE WIDTHS — settled box at each design's own sample content${only ? ` (${only})` : ''}`);
  console.log(`  ${'id'.padEnd(10)} ${'category'.padEnd(16)} ${'box w x h'.padEnd(16)} ${'bbox w x h'.padEnd(16)} name`);
  const stageRows = targets.map((t) => ({ ...t, ...(at.get(t.id) || {}) }));
  for (const r of stageRows) {
    const dim = (b) => (b ? `${Math.round(b.w)} x ${Math.round(b.h)}` : '-');
    console.log(
      `  ${r.id.padEnd(10)} ${r.cat.padEnd(16)} ${dim(r.box).padEnd(16)} ${dim(r.bbox).padEnd(16)} ${r.name}`,
    );
  }
  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(stageRows, null, 1));
    console.log(`\nWrote ${stageRows.length} rows to ${jsonOut}`);
  }
  console.log('');
  process.exit(0);
}

const shortPass = await pass('short', 'short');
const longPass = await pass('long', 'long ');
await browser.close();

const BOXES = ['bbox', 'box', 'plate'];
/** Signed pixel delta on one axis of one box, or null when either side is unmeasured. */
const delta = (a, b, axis) =>
  a == null || b == null ? null : Math.round((b[axis] - a[axis]) * 100) / 100;

const rows = targets.map((t) => {
  const s = shortPass.get(t.id) || {};
  const l = longPass.get(t.id) || {};
  const d = {};
  const pct = {};
  for (const k of BOXES) {
    for (const axis of ['w', 'h']) {
      const dv = delta(s[k], l[k], axis);
      d[`${k}.${axis}`] = dv;
      const base = s[k] ? s[k][axis] : null;
      pct[`${k}.${axis}`] = base && dv != null && base > 0 ? Math.round((dv / base) * 1000) / 10 : null;
    }
  }
  // The score is the LARGEST move among the scored axes: any one of them shifting is the audience
  // watching the graphic re-size itself, and which element carries the move is a design detail.
  const scored = Object.entries(d).filter(([k]) => AXES.includes(k.split('.')[1]));
  const worstKey = scored.reduce(
    (best, [k, v]) => (Math.abs(v ?? 0) > Math.abs(d[best] ?? 0) ? k : best),
    scored[0]?.[0] ?? 'bbox.w',
  );
  const worstPx = Math.abs(d[worstKey] ?? 0);
  return {
    ...t,
    err: s.err || l.err || null,
    fields: s.fields ?? 0,
    short: { bbox: s.bbox ?? null, box: s.box ?? null, plate: s.plate ?? null },
    long: { bbox: l.bbox ?? null, box: l.box ?? null, plate: l.plate ?? null },
    delta: d,
    pct,
    worst: worstKey,
    worstPx: Math.round(worstPx * 100) / 100,
    worstPct: Math.abs(pct[worstKey] ?? 0),
    // Which AXES move at all, so the report can say whether a category wobbles sideways, grows
    // downward, or both — three different fixes.
    movesW: BOXES.some((k) => Math.abs(d[`${k}.w`] ?? 0) > STABLE_TOLERANCE),
    movesH: BOXES.some((k) => Math.abs(d[`${k}.h`] ?? 0) > STABLE_TOLERANCE),
    stable: worstPx <= STABLE_TOLERANCE,
  };
});

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
  console.log(`Wrote ${rows.length} rows to ${jsonOut}`);
}

const errored = rows.filter((r) => r.err);
const measured = rows.filter((r) => !r.err);
const moving = measured.filter((r) => !r.stable).sort((a, b) => b.worstPx - a.worstPx);
const noText = measured.filter((r) => r.fields === 0);

console.log(`\nFootprint stability sweep — ${rows.length} variants${only ? ` (${only})` : ''}`);
console.log(
  `  frame ${FRAME_W}x${FRAME_H} · ${stress ? `STRESS: "${STRESS_SHORT}" vs "${STRESS_LONG}"` : "each field's own sample at 0.4x vs 1.7x"} · tolerance ${STABLE_TOLERANCE}px` +
    ` · scoring ${AXES.join('+')}`,
);
console.log(
  `  moves: ${moving.length} · stable: ${measured.length - moving.length}` +
    ` (${noText.length} carry no text field) · errors: ${errored.length}\n`,
);

// Per-category roll-up first: the size contract is decided per category, so the number that
// drives the work is "how many of this category's designs move", not any single design.
const cats = new Map();
for (const r of measured) {
  const c = cats.get(r.cat) || { cat: r.cat, n: 0, moves: 0, w: 0, h: 0, worst: 0, sum: 0, noPlate: 0, noBox: 0 };
  c.n += 1;
  if (r.movesW) c.w += 1;
  if (r.movesH) c.h += 1;
  if (!r.short.plate) c.noPlate += 1;
  if (!r.short.box) c.noBox += 1;
  if (!r.stable) {
    c.moves += 1;
    c.sum += r.worstPx;
    c.worst = Math.max(c.worst, r.worstPx);
  }
  cats.set(r.cat, c);
}
console.log('BY CATEGORY — designs whose box changes size between the two text lengths:');
console.log(
  `  ${'category'.padEnd(20)} ${'moves'.padEnd(9)} ${'wider'.padEnd(7)} ${'taller'.padEnd(7)} ` +
    `${'mean px'.padEnd(8)} ${'worst px'.padEnd(10)} unmeasured`,
);
for (const c of [...cats.values()].sort((a, b) => b.moves / b.n - a.moves / a.n)) {
  const mean = c.moves ? Math.round(c.sum / c.moves) : 0;
  // A design with no plate and no `-box` is scored on its union bbox alone. Saying so keeps a
  // BLIND zero from reading as a clean one — the trap that made the width-only run call quiz safe.
  const blind = [c.noPlate ? `no plate x${c.noPlate}` : '', c.noBox ? `no box x${c.noBox}` : '']
    .filter(Boolean)
    .join(' · ');
  console.log(
    `  ${c.cat.padEnd(20)} ${`${c.moves}/${c.n}`.padEnd(9)} ${String(c.w).padEnd(7)} ${String(c.h).padEnd(7)} ` +
      `${String(mean).padEnd(8)} ${String(Math.round(c.worst)).padEnd(10)} ${blind}`,
  );
}
console.log('');

if (moving.length) {
  const shown = moving.slice(0, topN);
  console.log(`WIDEST MOVERS (${shown.length} of ${moving.length}):`);
  console.log(
    `  ${'id'.padEnd(10)} ${'category'.padEnd(16)} ${'move'.padEnd(15)} ${'short -> long'.padEnd(26)} name`,
  );
  for (const r of shown) {
    const [k, axis] = r.worst.split('.');
    const a = r.short[k] ? r.short[k][axis] : null;
    const b = r.long[k] ? r.long[k][axis] : null;
    const dir = axis === 'w' ? 'wide' : 'tall';
    console.log(
      `  ${r.id.padEnd(10)} ${r.cat.padEnd(16)} ` +
        `${`${(r.delta[r.worst] ?? 0) > 0 ? '+' : '-'}${Math.round(r.worstPx)}px ${r.worstPct}%`.padEnd(15)} ` +
        `${`${k} ${dir} ${Math.round(a ?? 0)} -> ${Math.round(b ?? 0)}`.padEnd(26)} ${r.name}`,
    );
  }
  console.log('');
}

if (errored.length) {
  console.log(`RENDER ERRORS (${errored.length}):`);
  for (const e of errored) console.log(`  ${e.id.padEnd(10)} ${e.err}`);
  console.log('');
}

console.log('Report only — the gate is e2e/catalog/footprint-stability.spec.ts.\n');
process.exit(errored.length ? 1 : 0);
