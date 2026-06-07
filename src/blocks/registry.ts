// Building-block registry. Each block is a pure, deterministic transform that edits the
// visible HTML/CSS/JS so the user learns from the result. Blocks are grouped by category.

import {
  addFieldToDefinition,
  appendCss,
  appendJs,
  insertGraphicHtml,
  insertHiddenHolder,
  nextFieldId,
} from './edit';
import type { SpxTemplate } from '../model/types';

export interface BuildingBlock {
  id: string;
  label: string;
  category: 'Structure' | 'Elements' | 'Fields' | 'Animation';
  description: string;
  apply: (template: SpxTemplate) => SpxTemplate;
}

/** Add a text data field: definition entry + hidden holder + visible element. */
function addTextField(template: SpxTemplate): SpxTemplate {
  const id = nextFieldId(template.fields);
  let next = addFieldToDefinition(template, {
    field: id,
    ftype: 'textfield',
    title: `Text ${id}`,
    value: `Sample ${id}`,
  });
  const visible = `  <!-- Text field ${id} -->
  <div class="text-block" id="${id}_gfx">Sample ${id}</div>`;
  next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, visible), id) };
  next = { ...next, css: appendCss(next.css, `Text field ${id}`, `#${id}_gfx {\n  color: #ffffff;\n  font-size: 32px;\n}`) };
  return next;
}

export const BUILDING_BLOCKS: BuildingBlock[] = [
  // ----- Structure -----
  {
    id: 'lower-third',
    label: 'Lower third',
    category: 'Structure',
    description: 'Name + title bar in the lower-left, with two text fields.',
    apply: (t) => {
      const id0 = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: id0, ftype: 'textfield', title: 'Name', value: 'Firstname Lastname' });
      const id1 = nextFieldId(next.fields);
      next = addFieldToDefinition(next, { field: id1, ftype: 'textfield', title: 'Title', value: 'Title / role' });
      const html = `  <!-- Lower third -->
  <div class="lower-third-2" id="lt2">
    <div class="lt2-bar">
      <div class="lt2-name" id="${id0}_gfx">Firstname Lastname</div>
      <div class="lt2-title" id="${id1}_gfx">Title / role</div>
    </div>
  </div>`;
      next = { ...next, html: insertHiddenHolder(insertHiddenHolder(insertGraphicHtml(next.html, html), id0), id1) };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Lower third (block)',
          `.lower-third-2 { position: absolute; left: 120px; bottom: 260px; }
.lt2-bar { display: inline-block; padding: 12px 24px; background: #11151c; border-left: 6px solid #3aa0ff; }
.lt2-name { color: #fff; font-size: 40px; font-weight: 700; }
.lt2-title { color: #9fc6ff; font-size: 22px; }`,
        ),
      };
      return next;
    },
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen layout',
    category: 'Structure',
    description: 'Centered full-frame container for titles or fullscreen graphics.',
    apply: (t) => {
      const id = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: id, ftype: 'textfield', title: 'Headline', value: 'Fullscreen title' });
      const html = `  <!-- Fullscreen layout -->
  <div class="fullscreen" id="fs">
    <h1 class="fs-headline" id="${id}_gfx">Fullscreen title</h1>
  </div>`;
      next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, html), id) };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Fullscreen layout (block)',
          `.fullscreen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.fs-headline { color: #fff; font-size: 96px; font-weight: 800; text-align: center; text-shadow: 0 4px 24px rgba(0,0,0,0.5); }`,
        ),
      };
      return next;
    },
  },

  // ----- Elements -----
  {
    id: 'logo',
    label: 'Logo image',
    category: 'Elements',
    description: 'An <img> logo (set the src to a file in assets/).',
    apply: (t) => {
      const html = `  <!-- Logo (replace src with your file in assets/) -->
  <img class="logo" id="logo" src="assets/logo.png" alt="logo" />`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Logo (block)', `.logo { position: absolute; top: 80px; left: 120px; height: 120px; }`) };
      return next;
    },
  },
  {
    id: 'bug',
    label: 'Corner bug',
    category: 'Elements',
    description: 'A small persistent logo/bug in the top-right corner.',
    apply: (t) => {
      const html = `  <!-- Corner bug -->
  <img class="bug" id="bug" src="assets/bug.png" alt="bug" />`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Corner bug (block)', `.bug { position: absolute; top: 48px; right: 48px; height: 90px; opacity: 0.95; }`) };
      return next;
    },
  },
  {
    id: 'text-element',
    label: 'Text element',
    category: 'Elements',
    description: 'A standalone styled text element (no data field).',
    apply: (t) => {
      const html = `  <!-- Static text element -->
  <div class="static-text">Static text</div>`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Static text (block)', `.static-text { position: absolute; left: 120px; top: 220px; color: #fff; font-size: 28px; }`) };
      return next;
    },
  },

  // ----- Fields -----
  {
    id: 'text-field',
    label: 'Text data field',
    category: 'Fields',
    description: 'Add a new f# text field: definition entry, hidden holder, visible element.',
    apply: addTextField,
  },

  // ----- Animation -----
  {
    id: 'css-fade',
    label: 'CSS fade-in',
    category: 'Animation',
    description: 'A reusable .fade-in keyframe class you can add to any element.',
    apply: (t) => ({
      ...t,
      css: appendCss(
        t.css,
        'Fade-in animation (add class="fade-in" to an element)',
        `@keyframes spxFadeIn { from { opacity: 0; } to { opacity: 1; } }
.fade-in { animation: spxFadeIn 0.6s ease both; }`,
      ),
    }),
  },
  {
    id: 'css-slide',
    label: 'CSS slide-in',
    category: 'Animation',
    description: 'A reusable .slide-in keyframe class (slides up into place).',
    apply: (t) => ({
      ...t,
      css: appendCss(
        t.css,
        'Slide-in animation (add class="slide-in" to an element)',
        `@keyframes spxSlideIn { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.slide-in { animation: spxSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }`,
      ),
    }),
  },
  {
    id: 'gsap-pulse',
    label: 'GSAP pulse helper',
    category: 'Animation',
    description: 'Adds a pulse(selector) JS helper using GSAP.',
    apply: (t) => ({
      ...t,
      js: appendJs(
        t.js,
        'pulse(selector): a quick attention pulse using GSAP',
        `function pulse(selector) {
  gsap.fromTo(selector, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' });
}`,
      ),
    }),
  },
];

export const BLOCK_CATEGORIES: BuildingBlock['category'][] = ['Structure', 'Elements', 'Fields', 'Animation'];
