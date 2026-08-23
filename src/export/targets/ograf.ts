// OGraf export: packages the template as an EBU OGraf v1 Graphic — a manifest
// (<slug>.ograf.json) plus a JS entry point (graphic.mjs) exporting a Web Component that
// wraps the template's own play()/stop()/update() runtime. Spec:
// https://ograf.ebu.io/v1/specification/docs/Specification.html
// The generated .mjs stays readable, mirroring the 1:1 philosophy of the SPX exporters.

import JSZip from 'jszip';
import gsapSource from '../../assets/gsap.min.js?raw';
import lottieSource from '../../assets/lottie.min.js?raw';
import { inlineAssetRefs, isLottieAsset, parseDataUrl } from '../../assets/assetUtils';
import { templateUsesLottie } from '../../assets/lottieSupport';
import { parseAnimData } from '../../blocks/animData';
import { eventButtons, kindForField, type ControlButton } from '../../control/controlModel';
import { stripLiveData } from '../../control/liveData';
import { stripRealtimeControl } from '../../control/realtimeControl';
import { sourceHash } from '../../model/contentHash';
import type { Ftype, SpxField, SpxTemplate, TemplateType } from '../../model/types';
import { RENDER_RUNTIME_JS, GSAP_DETACH_JS } from '../../render/runtimeScript';
import { addReferencedFonts, projectFormatReadme, slug } from '../common';
import { fieldReferenceMd } from '../fieldReference';
import type { ExportTarget, GraphicUsage } from '../registry';
import { OGRAF_SCHEMA_URL, validateOgrafManifest, validateOgrafPackage } from './ografSchema';

export { OGRAF_SCHEMA_URL, validateOgrafManifest, validateOgrafPackage };

// ── Manifest ─────────────────────────────────────────────────────────────────

/** Map an SPX ftype to the JSON-schema type of the OGraf data property. */
function schemaType(ftype: Ftype): 'string' | 'number' | 'boolean' {
  if (ftype === 'number') return 'number';
  if (ftype === 'checkbox') return 'boolean';
  return 'string';
}

/**
 * A field's default, TYPED as the schema declares it. SPX field values are always strings, and
 * OGraf's gdd/basic-types.json types `default` by the property's own `type` — so a checkbox
 * declared `"type": "boolean"` with the string `"true"` is an invalid manifest, and the kind of
 * mismatch a host either rejects outright or silently coerces into something else on air.
 * `true`/`false` is the on/off wire form the field reference already documents.
 */
function schemaDefault(field: SpxField): string | number | boolean {
  if (field.ftype === 'number') return Number(field.value) || 0;
  if (field.ftype === 'checkbox') return /^(?:true|1|yes|on|checked)$/i.test(field.value.trim());
  return field.value;
}

/**
 * Build the OGraf data schema from the template's DataFields (one property per fN).
 *
 * The JSON-schema `type` is a 3-way collapse (string / number / boolean), which is all the
 * standard can say; the CONTROL kind the property came from - a line list, a colour, an image
 * path - rides along as the per-property `v_noacg.kind` vendor hint (spec: vendor fields are
 * `v_`-prefixed and allowed in every manifest object), so a reader that knows NoaCG gets the
 * field back exactly and a reader that does not sees plain OGraf.
 */
function dataSchema(fields: SpxField[]) {
  const properties: Record<string, unknown> = {};
  for (const f of fields) {
    if (!['textfield', 'textarea', 'number', 'dropdown', 'filelist', 'checkbox', 'color', 'hidden'].includes(f.ftype)) continue;
    const kind = kindForField(f);
    properties[f.field] = {
      type: schemaType(f.ftype),
      title: f.title || f.field,
      default: schemaDefault(f),
      ...(f.ftype === 'dropdown' && f.items?.length ? { enum: f.items.map((i) => i.value) } : {}),
      ...(f.ftype === 'hidden' ? { hidden: true } : {}),
      ...(kind ? { v_noacg: { kind } } : {}),
    };
  }
  return { type: 'object', properties };
}

/**
 * The state machine's operator events as OGraf custom actions (spec §2 Action). The list is
 * the SAME merge every control surface renders (controlModel eventButtons — declared labels
 * from `machine.controls`, plain buttons for undeclared events), so an OGraf host offers
 * exactly what the Control tab does. An event's payload fields become the action's payload
 * schema, titled from the template's own fields.
 */
function customActions(template: SpxTemplate): Array<Record<string, unknown>> {
  // The payload keys ARE field ids, so each one is declared with its own field's type and
  // title — a number field described as a string would have the host's generated form send
  // text where the graphic expects a number.
  const byId = new Map(template.fields.map((f) => [f.field, f]));
  return eventButtons(template.js).map((button: ControlButton) => ({
    id: button.event,
    name: button.label,
    ...(button.section ? { description: `${button.section} — fires the "${button.event}" event.` } : {}),
    // The button's grouping, its destructive flag and its adjust deltas have no standard
    // carrier; they ride the per-action vendor object so a NoaCG reader
    // (control/ografContract.ts) rebuilds the operator surface exactly, and any other renderer
    // ignores it. An ADJUSTED field (a goal's +1) is ALSO a payload property of the action's
    // schema: a generic OGraf host offers it as an input to the action, which is honest - the
    // action takes a new score - and a NoaCG host computes it from the delta instead.
    ...(button.section || button.destructive || button.adjust
      ? {
          v_noacg: {
            ...(button.section ? { section: button.section } : {}),
            ...(button.destructive ? { destructive: true } : {}),
            ...(button.adjust ? { adjust: button.adjust } : {}),
          },
        }
      : {}),
    ...(button.payload?.length || button.adjust
      ? {
          schema: {
            type: 'object',
            properties: Object.fromEntries(
              [...(button.payload ?? []), ...Object.keys(button.adjust ?? {})].map((key) => {
                const field = byId.get(key);
                return [
                  key,
                  field
                    ? { type: schemaType(field.ftype), title: field.title || key, default: schemaDefault(field) }
                    : { type: 'string', title: key },
                ];
              }),
            ),
          },
        }
      : {}),
  }));
}

/**
 * `actionDurations` — how long each action animates, in milliseconds, read off the graphic's
 * OWN timeline rather than guessed. A playout host uses these to pre-roll a take and to know
 * when a step has landed, so they are worth emitting exactly: `steps[i]` is the timeline of
 * default-path waypoint `i` (the positional binding), which is the same `i` OGraf calls a
 * step, and the last step is the exit — the duration of `stopAction`.
 *
 * Speed-relative seconds become wall-clock ms by dividing by the block's `speed` knob, the
 * same arithmetic the interpreter does at playback.
 *
 * Omitted entirely for a template whose timeline we cannot read (hand-written GSAP, an
 * imported foreign template): the spec's answer to "unknown" is to say nothing, not to guess.
 * A custom action's duration DOES depend on where the machine is when it fires, so those are
 * declared `-1` — the spec's own value for dynamic.
 */
function actionDurations(template: SpxTemplate, stepCount: number, actionIds: string[]): Array<Record<string, unknown>> {
  const data = parseAnimData(template.js);
  if (!data || data.steps.length < 2) return [];
  const speed = data.speed > 0 ? data.speed : 1;
  const ms = (seconds: number) => Math.max(0, Math.round((seconds / speed) * 1000));
  const steps = data.steps;
  const perStep: Array<{ step: number; duration: number }> = [];
  for (let i = 0; i < stepCount && i < steps.length - 1; i++) perStep.push({ step: i, duration: ms(steps[i].duration) });
  return [
    {
      type: 'playAction',
      // The action-level value is the fallback for any step the list below does not name.
      duration: perStep[0]?.duration ?? 0,
      ...(perStep.length ? { steps: perStep } : {}),
    },
    { type: 'stopAction', duration: ms(steps[steps.length - 1].duration) },
    // update() writes field values into the DOM; nothing animates on a data change.
    { type: 'updateAction', duration: 0 },
    ...actionIds.map((id) => ({ type: 'customAction', customActionId: id, duration: -1 })),
  ];
}

/**
 * `renderRequirements` — the canvas and frame rate the graphic was AUTHORED for. Declared as
 * `ideal` rather than `exact`: the spec treats these as matching constraints, and an exact
 * 1920×1080 would read as "refuse to render me anywhere else" for a graphic that scales
 * perfectly well. This states the authored format (the same statement the package README and
 * the `noacg-project-format` meta tag carry) without excluding a renderer.
 */
function renderRequirements(template: SpxTemplate): Array<Record<string, unknown>> {
  return [
    {
      resolution: {
        width: { ideal: template.resolution.width },
        height: { ideal: template.resolution.height },
      },
      frameRate: { ideal: template.fps },
    },
  ];
}

/**
 * The manifest `id` — and, because a real renderer uses it that way, a legal CUSTOM ELEMENT NAME.
 *
 * The spec only says an id is any unicode except "/", so `hairline` reads as conformant. It is
 * not loadable. SuperFly.tv's OGraf server — the community renderer the EBU's own README points
 * at — registers the Graphic with `customElements.define(manifest.id, class)`, and the HTML
 * standard requires such a name to start with an ASCII lowercase letter and to contain a hyphen.
 * Our slugs are lowercase with UNDERSCORE separators, so every NoaCG package failed that call
 * with `"hairline" is not a valid custom element name` before the graphic was ever mounted.
 * Nothing in the manifest schema catches it; it is a spec-legal id that no browser can register.
 *
 * The `noacg-` prefix supplies the required hyphen whatever the design is called, guarantees the
 * leading letter (a graphic named "3 Up" slugs to `3_up`), and keeps the id off the HTML
 * standard's reserved names. It is also the namespace the spec's reverse-DNS recommendation is
 * really asking for, in the shape a browser can take. Folder and file names keep the plain slug:
 * they follow the SPX and CasparCG conventions, and the id has never had to match them.
 */
export function ografGraphicId(name: string): string {
  return `noacg-${slug(name).replace(/_/g, '-')}`;
}

/**
 * NoaCG's OWN vendor block on the manifest - `v_noacg`, the standard's extension mechanism
 * (every manifest object admits `v_`-prefixed fields) used for exactly what plain OGraf cannot
 * express about a NoaCG-made Graphic and nothing more:
 *
 *  - `type`: the NoaCG graphic type (a `TemplateType`), which an SPX/OGraf file has no slot
 *    for and the import lane otherwise has to guess (`blank`);
 *  - `source`: where the EDITABLE sources sit in this package when it carries them - the SPX
 *    layout files (`<slug>.html`, `css/template.css`, `js/template.js`) from which the manifest
 *    and `graphic.mjs` were generated. A package with sources is both a valid OGraf Graphic and
 *    an editable NoaCG workspace; renderers ignore the sources, NoaCG ignores the generated half;
 *  - `sourceHash`: the sources' content hash at generation time, so a reader can tell a fresh
 *    package from one whose sources were edited after the generated half was written (a stale
 *    `graphic.mjs` is the one way the two halves can disagree);
 *  - `generator`: who wrote the package.
 *
 * Everything else a round trip needs already lives in the sources themselves (the definition
 * with its DataFields and playout settings, the NOACG_ANIM machine) or in standard fields.
 * Deliberately NOT a manifest of its own: the format IS OGraf, this is a sticker on it.
 */
export interface NoacgVendorBlock {
  format: 'noacg-graphic';
  version: 1;
  type: TemplateType;
  source?: { html: string; css: string; js: string };
  sourceHash: string;
  generator: string;
}

/** The SPX-layout source paths a dual package writes (export/noacgPackage.ts). */
export function noacgSourcePaths(template: SpxTemplate): NonNullable<NoacgVendorBlock['source']> {
  return { html: `${slug(template.name)}.html`, css: 'css/template.css', js: 'js/template.js' };
}

/**
 * The vendor block for a template. `source` only when the package carries the sources, and
 * then `sourceHash` is the hash of those FILES AS WRITTEN (the caller reads them back off the
 * zip and passes it) - not of the in-memory template, because the packaged html also carries
 * the project-format meta and the control receiver that the importer strips again, and a hash
 * that a round trip cannot reproduce detects nothing. Without sources it hashes the template.
 */
export function noacgVendorBlock(
  template: SpxTemplate,
  opts: { source?: NoacgVendorBlock['source']; sourceHash?: string } = {},
): NoacgVendorBlock {
  return {
    format: 'noacg-graphic',
    version: 1,
    type: template.type,
    ...(opts.source ? { source: opts.source } : {}),
    sourceHash: opts.sourceHash ?? sourceHash(template),
    generator: 'noacg-studio',
  };
}

/** One manifest `thumbnails[]` entry (spec §2): a PNG/JPG/GIF/webp the package contains. */
export interface OgrafThumbnail {
  file: string;
  resolution?: { width: number; height: number };
}

export interface OgrafManifestOptions {
  /** NoaCG's vendor block (`v_noacg`). Absent = plain OGraf, exactly as before. */
  noacg?: NoacgVendorBlock;
  /** Preview images the PACKAGE carries (the caller writes the files; `addOgrafPackage`
   *  checks they exist). Absent = no `thumbnails` field. */
  thumbnails?: OgrafThumbnail[];
}

/** The .ograf.json manifest (required fields per spec §2 + the field-driven data schema). */
export function buildOgrafManifest(
  template: SpxTemplate,
  usage: GraphicUsage = 'live',
  opts: OgrafManifestOptions = {},
): Record<string, unknown> {
  const stepCount = Math.max(1, Number(template.settings.steps) || 1);
  const actions = customActions(template);
  const durations = actionDurations(template, stepCount, actions.map((a) => a.id as string));
  return {
    $schema: OGRAF_SCHEMA_URL,
    id: ografGraphicId(template.name),
    version: '1.0.0',
    name: template.name,
    description: template.settings.description || template.name,
    main: 'graphic.mjs',
    supportsRealTime: usage !== 'post-production',
    supportsNonRealTime: usage !== 'live',
    schema: dataSchema(template.fields),
    stepCount,
    ...(actions.length ? { customActions: actions } : {}),
    ...(durations.length ? { actionDurations: durations } : {}),
    renderRequirements: renderRequirements(template),
    ...(opts.thumbnails?.length ? { thumbnails: opts.thumbnails } : {}),
    ...(opts.noacg ? { v_noacg: opts.noacg } : {}),
  };
}

export interface OgrafOfflineCompatibility {
  compatible: boolean;
  errors: string[];
  warnings: string[];
}

/** Conservative target-specific gate. Non-real-time is advertised only for templates whose
 * authored NoaCG timeline can be replayed against the shared virtual clock. */
export function validateOgrafOfflineCompatibility(template: SpxTemplate): OgrafOfflineCompatibility {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!parseAnimData(template.js)) {
    errors.push('Post-production export requires a readable NOACG_ANIM timeline.');
  }
  const source = `${template.html}\n${template.css}\n${template.js}`;
  if (/https?:\/\//i.test(source.replace(OGRAF_SCHEMA_URL, '')) || /(?:src|href)\s*=\s*["']\/\//i.test(source)) {
    errors.push('External network dependencies are not available during deterministic rendering.');
  }
  if (/\bMath\.random\s*\(|\bcrypto\.(?:getRandomValues|randomUUID)\s*\(/.test(template.js)) {
    errors.push('Unseeded randomness is not deterministic.');
  }
  if (/<(?:video|audio)\b/i.test(template.html)) {
    errors.push('Media playback is not seekable in OGraf non-real-time mode.');
  }
  if (/(?:^|[;{])\s*animation(?:-name)?\s*:/im.test(template.css)) {
    errors.push('CSS animations are wall-clock driven; move this motion into the NoaCG timeline.');
  }
  if (/\b(?:fetch|WebSocket|EventSource)\s*\(/.test(stripRealtimeControl(stripLiveData(template.js)))) {
    errors.push('Live-only network code remains after removing NoaCG live-control blocks.');
  }
  if (/\belement\.animate\s*\(|\.animate\s*\(\s*\[/.test(template.js)) {
    errors.push('Web Animations API calls are not controlled by the NoaCG seek clock.');
  }
  if (templateUsesLottie(template)) {
    warnings.push('Lottie is driven by the virtual frame clock; verify the exported package in the target renderer.');
  }
  return { compatible: errors.length === 0, errors, warnings };
}

// ── The Web Component entry point ────────────────────────────────────────────

/** The template's visible markup: everything inside <body> (scripts stripped). */
function bodyContent(html: string): string {
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = m ? m[1] : html;
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, '').trim();
}

/** The markup embedded in graphic.mjs is injected into the HOST page, whose base URL is
 *  the renderer's — not the package folder — so a relative data-lottie path would resolve
 *  against the wrong place. Inline the Lottie JSON assets as data: URLs at export time;
 *  the template's bootstrap decodes them without any network call. (Image/font refs
 *  resolve relative to the host page too, but OGraf hosts conventionally serve the
 *  package's folder as the page context; the Lottie inline removes the one hard failure.) */
function templateHtmlForModule(template: SpxTemplate): string {
  const lottieAssets = template.assets.filter((a) => isLottieAsset(a.path));
  return lottieAssets.length ? inlineAssetRefs(template.html, lottieAssets) : template.html;
}

function scriptSafe(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script');
}

/** Isolated document used only for non-real-time seeks. Rebuilding it for every request is
 * the reset boundary that makes backward and shuffled seeks independent of prior frames. */
function offlineDocument(template: SpxTemplate, lib: OgrafLibPaths = DEFAULT_LIB): string {
  const js = stripRealtimeControl(stripLiveData(template.js));
  const lottie = templateUsesLottie(template)
    ? `<script src="${lib.lottie}"></script>`
    : '';
  const bridge = `
var __ografStep = -1;
window.__noacgScheduledAction = function (entry) {
  if (!entry || !entry.action) return;
  var action = entry.action;
  var params = action.params || {};
  if (action.type === 'updateAction') {
    update(JSON.stringify(params.data || {}));
    return;
  }
  if (action.type === 'stopAction') {
    stop(); __ografStep = -1; return;
  }
  if (action.type === 'customAction') {
    if (typeof noacgDispatch === 'function') noacgDispatch(params.id, params.payload);
    return;
  }
  if (action.type !== 'playAction') return;
  var count = ${Math.max(1, Number(template.settings.steps) || 1)};
  var target = params.goto != null && params.goto >= 0
    ? params.goto : __ografStep + (params.delta != null ? params.delta : 1);
  if (__ografStep < 0 && target >= 0) { play(); __ografStep = 0; }
  while (__ografStep >= 0 && __ografStep < target && __ografStep < count - 1) {
    if (!next()) break;
    __ografStep += 1;
  }
  if (target >= count) { stop(); __ografStep = -1; }
};`;
  return `<!doctype html><html><head>
<meta name="color-scheme" content="light">
<base href="__NOACG_BASE__">
<style>html,body{width:${template.resolution.width}px;height:${template.resolution.height}px;overflow:hidden;margin:0;background:transparent}${template.css}</style>
<script>${scriptSafe(RENDER_RUNTIME_JS)}</script>
<script src="${lib.gsap}"></script>
<script>${scriptSafe(GSAP_DETACH_JS)}</script>${lottie}
</head><body>${bodyContent(templateHtmlForModule(template))}
<script>${scriptSafe(js)}</script>
<script>${scriptSafe(bridge)}</script>
</body></html>`;
}

/** Where the bundled libraries sit inside the package, relative to `graphic.mjs`. The plain
 *  OGraf package keeps them under `lib/`; the dual package (export/noacgPackage.ts) shares the
 *  SPX layout's `js/` copies instead of shipping GSAP twice. */
export interface OgrafLibPaths {
  gsap: string;
  lottie: string;
}
const DEFAULT_LIB: OgrafLibPaths = { gsap: 'lib/gsap.min.js', lottie: 'lib/lottie.min.js' };

/** graphic.mjs: a readable Web Component wrapping the template's own runtime. */
function graphicModule(template: SpxTemplate, lib: OgrafLibPaths = DEFAULT_LIB): string {
  const stepCount = Math.max(1, Number(template.settings.steps) || 1);
  const machine = parseAnimData(template.js)?.machine;
  // Each state group's off-air (initial) state, so the wrapper can tell when a press took the
  // graphic off air by itself. Empty for a template with no machine — such a graphic never
  // reports off air here and behaves exactly as before.
  const offStates = Object.fromEntries((machine?.groups ?? []).map((g) => [g.id, g.initial]));
  // The main group's walk + id and the manifest's custom-action ids: what customAction()
  // accepts, and how the wrapper re-derives its step pointer after an event moved the
  // machine (an event may land ON a waypoint — the pointer must follow the graphic).
  const mainGroup = machine?.groups[0] ?? null;
  const mainGroupId = mainGroup?.id ?? null;
  const mainPath = mainGroup?.defaultPath ?? [];
  const actionIds = customActions(template).map((a) => a.id as string);
  const usesLottie = templateUsesLottie(template);
  const ensureLottieFn = usesLottie
    ? `

// The bundled Lottie player, loaded the same way (this graphic uses a Lottie animation).
function ensureLottie() {
  if (window.lottie) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prevDefine = window.define;
    window.define = undefined;
    const restore = () => { window.define = prevDefine; };
    const s = document.createElement('script');
    s.src = new URL('./${lib.lottie}', import.meta.url).href;
    s.onload = () => { restore(); resolve(undefined); };
    s.onerror = () => { restore(); reject(new Error('Could not load ${lib.lottie}')); };
    document.head.appendChild(s);
  });
}`
    : '';
  return `// ${template.name} — OGraf v1 Graphic, generated by NoaCG Studio.
// Authored project format: ${projectFormatReadme(template)}. The package keeps this canvas and timing.
// The original template runtime (play/stop/update/next) is embedded unchanged inside
// initTemplate(); this Web Component maps the OGraf actions onto it.

// GSAP ships as a classic (UMD) script, so it is loaded via a <script> tag — importing
// it as an ES module would leave the global \`gsap\` undefined. If the HOST page has an
// AMD loader (window.define.amd — e.g. anything embedding Monaco), the UMD would register
// there instead of on window, so define is hidden while the script executes.
function ensureGsap() {
  if (window.gsap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prevDefine = window.define;
    window.define = undefined;
    const restore = () => { window.define = prevDefine; };
    const s = document.createElement('script');
    s.src = new URL('./${lib.gsap}', import.meta.url).href;
    s.onload = () => { restore(); resolve(undefined); };
    s.onerror = () => { restore(); reject(new Error('Could not load ${lib.gsap}')); };
    document.head.appendChild(s);
  });
}${ensureLottieFn}

const TEMPLATE_HTML = ${JSON.stringify(bodyContent(templateHtmlForModule(template)))};

const TEMPLATE_CSS = ${JSON.stringify(template.css)};

// The package's own base URL. A Graphic is a COMPONENT inside the renderer's page, not the
// page itself, so a relative \`fonts/inter.woff2\` in the injected CSS resolves against the
// RENDERER's document — which is somebody else's directory. Under SPX and CasparCG the
// template IS the document and the same path is correct, which is why this is invisible until
// a real OGraf renderer loads the package: the font 404s, \`font-display: swap\` paints the
// fallback, and the graphic airs in the wrong typeface with no error anywhere. Every relative
// resource is therefore resolved against this module before injection. (The non-real-time
// document does the same job with a <base href>; it has its own document to put one in.)
const PACKAGE_BASE = new URL('./', import.meta.url).href;

/** Absolute-ise one reference, leaving anything already absolute (or a data: URL) alone. */
function packageUrl(ref) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(ref)) return ref;
  return new URL(ref, PACKAGE_BASE).href;
}

// Each rewrite substitutes the REFERENCE inside the match it was found in, rather than rebuilding
// the surrounding syntax — quoting and spacing survive untouched, and this file never contains a
// literal reference of its own for a package scanner to trip over.
const substitute = (whole, ref) => {
  const trimmed = ref.trim();
  const resolved = packageUrl(trimmed);
  return resolved === trimmed ? whole : whole.replace(trimmed, resolved);
};

const withPackageUrls = {
  css: (css) => css.replace(/url\\(\\s*(['"]?)([^'")]+)\\1\\s*\\)/gi, (whole, _q, ref) => substitute(whole, ref)),
  html: (html) => html.replace(/\\b(?:src|href|poster|data)\\s*=\\s*(['"])([^'"]+)\\1/gi, (whole, _q, ref) => substitute(whole, ref)),
};

// Non-real-time rendering runs in an isolated, virtual-clock document. The document is
// recreated for every seek, so no prior playback, timer, GSAP state, or seek order can leak.
const OFFLINE_DOCUMENT = ${JSON.stringify(offlineDocument(template, lib))};

// Each state group's off-air state. Empty when this graphic has no state machine.
const OFF_STATES = ${JSON.stringify(offStates)};

// The machine's custom-action vocabulary (the manifest's customActions[].id list), plus the
// main group's walk — how the wrapper re-derives its step pointer after an event moved the
// machine. All empty when this graphic has no state machine.
const CUSTOM_ACTION_IDS = ${JSON.stringify(actionIds)};
const MAIN_GROUP_ID = ${JSON.stringify(mainGroupId)};
const MAIN_PATH = ${JSON.stringify(mainPath)};

/**
 * A \`document\` scoped to ONE mounted Graphic.
 *
 * The field convention is one element per field, addressed as \`getElementById('fN')\` — the
 * same ids in every design NoaCG makes, because under SPX a template owns its page and there
 * is nothing to collide with. An OGraf renderer is the opposite arrangement: every layer is a
 * Web Component in ONE document, so a second Graphic's \`#f0\` is a duplicate of the first's,
 * \`document.getElementById\` answers with whichever is earlier in the document, and updating
 * the graphic on layer 1 rewrites the graphic on layer 0. Measured exactly that way against
 * SuperFly.tv's OGraf server (docs/OGRAF.md); class prefixes scope the CSS but not the ids.
 *
 * The template's code is still what the editor shows: only the \`document\` it sees is scoped,
 * by being a parameter of the function its body runs in. Lookups resolve inside this Graphic;
 * everything else on document (readyState, addEventListener, fonts, createElement) passes
 * straight through to the real one.
 */
function scopedDocument(root) {
  const scoped = {
    getElementById: (id) => root.querySelector('[id="' + String(id).replace(/"/g, '\\\\"') + '"]'),
    querySelector: (sel) => root.querySelector(sel),
    querySelectorAll: (sel) => root.querySelectorAll(sel),
  };
  return new Proxy(document, {
    get(target, key) {
      if (key in scoped) return scoped[key];
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

// initTemplate(): runs the template's own JS AFTER the markup is in the DOM and returns
// its runtime entry points. The code inside is exactly what the editor shows — the
// \`document\` parameter shadows the global one so its lookups stay inside this Graphic.
function initTemplate(document) {
${template.js.replace(/^/gm, '  ')}

  // The machine globals ride along when the template has a state machine, so the wrapper can
  // ASK where the graphic is instead of assuming its own step pointer stayed in step — and
  // DISPATCH the operator events the manifest declares as custom actions.
  return {
    play: play, stop: stop, update: update, next: next,
    machineState: (typeof noacgMachineState === 'function') ? noacgMachineState : null,
    dispatch: (typeof noacgDispatch === 'function') ? noacgDispatch : null,
    // How a skipAnimation action lands instantly: noacgSnap() composes a state's settled pose
    // with GSAP callbacks suppressed. Absent on a template with no state machine.
    snap: (typeof noacgSnap === 'function') ? noacgSnap : null
  };
}

class Graphic extends HTMLElement {
  constructor() {
    super();
    // OGraf §"Concurrency": a Graphic MUST accept an action call at any time, even while a
    // previous action's Promise is still pending, and MUST NOT ignore it. Every action runs
    // through this one chain, so overlapping calls are honoured in arrival order instead of
    // interleaving their DOM writes (and, in non-real-time mode, instead of two seeks
    // rebuilding the render frame on top of each other).
    this._chain = Promise.resolve();
    this._runtime = null;
    this._renderType = 'realtime';
    this._initialData = {};
    this._schedule = [];
    this._step = -1;
    this._disposed = false;
  }

  // Queue one action and report its outcome as a ReturnPayload. A thrown error becomes a 500
  // rather than a rejected Promise: the spec models failure as an HTTP-style status code, and
  // a renderer awaiting an action should get something it can log, not an unhandled rejection.
  _serial(run) {
    const settled = this._chain.then(
      () => run(),
      () => run(),
    ).catch((err) => ({ statusCode: 500, statusMessage: String((err && err.message) || err) }));
    this._chain = settled.then(() => undefined);
    return settled;
  }

  // Actions only make sense between a completed load() and dispose().
  _notReady() {
    if (this._disposed) return { statusCode: 409, statusMessage: 'This Graphic has been disposed.' };
    if (this._renderType === 'non-realtime') return null; // the offline path holds no runtime
    if (!this._runtime) return { statusCode: 409, statusMessage: 'load() has not completed yet.' };
    return null;
  }

  // skipAnimation: the action still happens, it just lands instantly. The template's own
  // runtime knows how — noacgSnap() composes a state's settled pose by replaying the route to
  // it with GSAP callbacks suppressed — so re-snapping to wherever the action left the machine
  // IS the finished frame. Pointers move synchronously inside the runtime, so by the time an
  // action returns, "where the machine is" is already the destination. A template with no
  // state machine (hand-written GSAP) falls back to forcing running tweens to their end.
  _settle() {
    if (this._runtime && this._runtime.snap && this._runtime.machineState) {
      this._runtime.snap(this._runtime.machineState().groups);
      return;
    }
    if (window.gsap) {
      window.gsap.globalTimeline.getChildren(true, true, true).forEach(function (tl) { tl.progress(1); });
    }
  }

  load(params) { return this._serial(() => this._load(params || {})); }
  dispose() { return this._serial(() => this._dispose()); }
  playAction(params) { return this._serial(() => this._playAction(params || {})); }
  stopAction(params) { return this._serial(() => this._stopAction(params || {})); }
  updateAction(params) { return this._serial(() => this._updateAction(params || {})); }
  customAction(params) { return this._serial(() => this._customAction(params || {})); }
  goToTime(params) { return this._serial(() => this._goToTime(params || {})); }
  setActionsSchedule(params) { return this._serial(() => this._setActionsSchedule(params || {})); }

  async _load(params) {
    this._disposed = false;
    this._renderType = params.renderType || 'realtime';
    this._initialData = Object.assign({}, params.data || {});
    this._schedule = [];
    if (this._renderType === 'non-realtime') {
      await this._renderOfflineFrame(0);
      return { statusCode: 200 };
    }
    await ensureGsap();${usesLottie ? '\n    await ensureLottie();' : ''}
    // Inject the template's style + markup into this element (light DOM: the template's
    // own getElementById lookups keep working exactly as in SPX).
    const style = document.createElement('style');
    style.textContent = withPackageUrls.css(TEMPLATE_CSS);
    this.appendChild(style);
    const holder = document.createElement('div');
    holder.innerHTML = withPackageUrls.html(TEMPLATE_HTML);
    this.appendChild(holder);

    this._runtime = initTemplate(scopedDocument(this));
    this._step = -1; // not on air yet
    if (params && params.data) this._runtime.update(JSON.stringify(params.data));
    return { statusCode: 200 };
  }

  async _dispose() {
    // Only this Graphic's own elements: '*' is document-wide, and a renderer mounts every
    // layer in one document, so clearing layer 1 froze the graphic still on air on layer 0.
    if (window.gsap) window.gsap.killTweensOf(this.querySelectorAll('*'));
    if (this._frame) { this._frame.remove(); this._frame = null; }
    this.innerHTML = '';
    this._runtime = null;
    this._schedule = [];
    this._step = -1;
    this._disposed = true;
    return { statusCode: 200 };
  }

  async _setActionsSchedule(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    this._schedule = Array.isArray(params.schedule) ? params.schedule.slice() : [];
    return { statusCode: 200 };
  }

  async _goToTime(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    if (this._renderType !== 'non-realtime') {
      return { statusCode: 409, statusMessage: 'goToTime() requires load({renderType:"non-realtime"}).' };
    }
    var timestamp = Math.max(0, Number(params.timestamp) || 0);
    await this._renderOfflineFrame(timestamp);
    return { statusCode: 200 };
  }

  async _renderOfflineFrame(timestamp) {
    if (this._frame) this._frame.remove();
    var frame = document.createElement('iframe');
    frame.setAttribute('title', 'OGraf non-real-time frame');
    frame.style.cssText = 'display:block;border:0;width:100%;height:100%;background:transparent';
    this.innerHTML = '';
    this.appendChild(frame);
    this._frame = frame;
    var ready = new Promise(function (resolve, reject) {
      frame.onload = resolve;
      frame.onerror = function () { reject(new Error('Could not initialize the OGraf render frame.')); };
    });
    var base = new URL('./', import.meta.url).href;
    frame.srcdoc = OFFLINE_DOCUMENT.replace('__NOACG_BASE__', base);
    await ready;
    var win = frame.contentWindow;
    var doc = frame.contentDocument;
    if (!win || !doc || !win.__noacgRender) throw new Error('OGraf non-real-time runtime did not initialize.');
    await win.__noacgRender.prepare({ epochMs: 0, fps: ${template.fps}, data: this._initialData });
    win.__noacgRender.setSchedule(this._schedule.map(function (entry) {
      return { atMs: Math.max(0, Number(entry.timestamp) || 0), action: 'scheduled', payload: entry };
    }));
    win.__noacgRender.seek(timestamp);
    this._offlineTimestamp = timestamp;
    this._offlineStep = typeof win.__ografStep === 'number' ? win.__ografStep : -1;
    if (doc.fonts) await doc.fonts.ready;
    await Promise.all(Array.from(doc.images).map(function (img) {
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }));
    await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
    var errors = win.__noacgRender.getErrors();
    if (errors.length) throw new Error('OGraf non-real-time render failed: ' + errors.join('; '));
  }

  async _updateAction(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    if (this._renderType === 'non-realtime') {
      await this._applyOfflineAction('updateAction', params);
      return { statusCode: 200 };
    }
    this._runtime.update(JSON.stringify(params.data || {}));
    if (params.skipAnimation) this._settle();
    return { statusCode: 200 };
  }

  async _playAction(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    if (this._renderType === 'non-realtime') {
      await this._applyOfflineAction('playAction', params);
      return { statusCode: 200, currentStep: this._offlineStep >= 0 ? this._offlineStep : undefined };
    }
    const stepCount = ${stepCount};
    const target = params.goto != null && params.goto >= 0
      ? params.goto
      : this._step + (params.delta != null ? params.delta : 1);
    if (this._step < 0) {
      // First play: run the entrance (which shows step 0).
      this._runtime.play();
      this._step = 0;
    }
    // Advance through the remaining steps with the template's next(). next() RETURNS what it
    // started, or null when there was nothing to advance to — a state machine can decline the
    // move (off the default path, or nothing left but the exit). Our pointer must not run
    // ahead of the graphic, so a refusal ends the walk.
    while (this._step < target && this._step < stepCount - 1) {
      if (!this._runtime.next()) break;
      this._step += 1;
      // A machine may author the arrow INTO its exit, in which case that press took the
      // graphic off air and reset its own pointers. OGraf reports no current step off air.
      if (this._offAir()) {
        this._step = -1;
        if (params.skipAnimation) this._settle();
        return { statusCode: 200, currentStep: undefined };
      }
    }
    if (target >= stepCount) {
      // Past the last step = go to the end (animate out, per the OGraf step model).
      this._runtime.stop();
      this._step = -1;
      if (params.skipAnimation) this._settle();
      return { statusCode: 200, currentStep: undefined };
    }
    if (params.skipAnimation) this._settle();
    return { statusCode: 200, currentStep: this._step };
  }

  // True when the graphic's state machine says every group is back at its initial state.
  // Templates without a machine never report off air here — their behaviour is unchanged.
  _offAir() {
    if (!this._runtime || !this._runtime.machineState) return false;
    const state = this._runtime.machineState();
    return Object.keys(state.groups).every(function (id) { return state.groups[id] === OFF_STATES[id]; });
  }

  async _stopAction(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    if (this._renderType === 'non-realtime') {
      await this._applyOfflineAction('stopAction', params);
      return { statusCode: 200 };
    }
    this._runtime.stop();
    this._step = -1;
    if (params.skipAnimation) this._settle();
    return { statusCode: 200 };
  }

  async _customAction(params) {
    const notReady = this._notReady();
    if (notReady) return notReady;
    if (this._renderType === 'non-realtime') {
      if (CUSTOM_ACTION_IDS.indexOf(params.id) === -1) {
        return { statusCode: 400, statusMessage: 'This graphic defines no custom action "' + params.id + '".' };
      }
      await this._applyOfflineAction('customAction', params);
      return { statusCode: 200, currentStep: this._offlineStep >= 0 ? this._offlineStep : undefined };
    }
    const id = params.id;
    if (!this._runtime || !this._runtime.dispatch || CUSTOM_ACTION_IDS.indexOf(id) === -1) {
      return { statusCode: 400, statusMessage: 'This graphic defines no custom action "' + id + '".' };
    }
    // Fire the operator event through the template's own SERIAL queue. The payload is the
    // flat {field: value} map the action's schema declares — applied only if the machine
    // accepts the event (the structural guard), exactly like every other control surface.
    this._runtime.dispatch(id, params.payload || undefined);
    // The event may have moved the machine — follow it. On the walk, the pointer becomes
    // that waypoint's index; off air (an arrow into the exit) it clears; a branch state
    // keeps the last on-path pointer (the walk resumes from there).
    if (this._runtime.machineState) {
      if (this._offAir()) {
        this._step = -1;
      } else if (MAIN_GROUP_ID) {
        const at = MAIN_PATH.indexOf(this._runtime.machineState().groups[MAIN_GROUP_ID]);
        if (at !== -1) this._step = at;
      }
    }
    if (params.skipAnimation) this._settle();
    return { statusCode: 200, currentStep: this._step >= 0 ? this._step : undefined };
  }

  async _applyOfflineAction(type, params) {
    this._schedule.push({
      timestamp: this._offlineTimestamp || 0,
      action: { type: type, params: params || {} }
    });
    await this._renderOfflineFrame(this._offlineTimestamp || 0);
  }
}

export default Graphic;
`;
}

// ── The package builder (shared with the LiveOS target) ─────────────────────

/**
 * Write the complete OGraf Graphic package (manifest, graphic.mjs, bundled GSAP, fonts,
 * assets — everything except a README) into `root`. The manifest is validated against the
 * spec's own schema rules BEFORE it is written, and the finished package is then checked to
 * contain every file the manifest names — so conformance is a build gate every target built
 * on this package inherits, rather than something a reviewer has to remember. The LiveOS
 * target reuses this verbatim: LiveOS's HTML5 graphics engine is OGraf-compliant.
 */
export interface OgrafPackageOptions {
  /** Where the bundled libraries go (and where `graphic.mjs` loads them from). Default `lib/`;
   *  the dual package passes the SPX layout's `js/` so one GSAP copy serves both halves. */
  lib?: OgrafLibPaths;
  /** NoaCG's `v_noacg` vendor block. Absent = plain OGraf, exactly as before. */
  noacg?: NoacgVendorBlock;
  /** A preview raster to ship as the manifest's `thumbnails[0]` - the bridge's bench shot.
   *  `data` is the image bytes (a Blob, raw bytes, or a base64 string). */
  thumbnail?: { file: string; data: Blob | Uint8Array | string; width: number; height: number };
}

export async function addOgrafPackage(
  root: JSZip,
  template: SpxTemplate,
  usage: GraphicUsage = 'live',
  opts: OgrafPackageOptions = {},
): Promise<void> {
  if (usage !== 'live') {
    const compatibility = validateOgrafOfflineCompatibility(template);
    if (!compatibility.compatible) {
      throw new Error(`OGraf post-production compatibility: ${compatibility.errors.join(' ')}`);
    }
  }
  const lib = opts.lib ?? DEFAULT_LIB;
  const thumbnails: OgrafThumbnail[] = opts.thumbnail
    ? [{ file: opts.thumbnail.file, resolution: { width: opts.thumbnail.width, height: opts.thumbnail.height } }]
    : [];
  const manifest = buildOgrafManifest(template, usage, { noacg: opts.noacg, thumbnails });
  const errors = validateOgrafManifest(manifest);
  if (errors.length) throw new Error(`OGraf manifest invalid: ${errors.join(' ')}`);

  // Every path this package contains, package-relative — what the manifest's `main` and any
  // thumbnail have to resolve against. Collected as we write rather than read back off the
  // zip, whose keys carry the enclosing project folder.
  const packaged: string[] = [];
  const write = (path: string, data: string | Blob | Uint8Array, options?: JSZip.JSZipFileOptions) => {
    packaged.push(path);
    root.file(path, data, options);
  };

  write(`${slug(template.name)}.ograf.json`, JSON.stringify(manifest, null, 2));
  write('graphic.mjs', graphicModule(template, lib));
  // The ID table travels with every package (LiveOS inherits it here too): an OGraf host's
  // data keys ARE these field ids, and only the package can say what each one means.
  write(
    'FIELDS.md',
    fieldReferenceMd(
      template,
      'These ids are the keys of the OGraf data object — the same names the manifest schema ' +
        'declares, and what `updateAction({ data })` carries.',
    ),
  );
  write(lib.gsap, gsapSource);
  if (templateUsesLottie(template)) write(lib.lottie, lottieSource);
  if (opts.thumbnail) {
    const { file, data } = opts.thumbnail;
    if (typeof data === 'string') write(file, data, { base64: true });
    else write(file, data);
  }
  await addReferencedFonts(root, template);
  for (const asset of template.assets) {
    if (typeof asset.data === 'string') {
      const parsed = parseDataUrl(asset.data);
      if (parsed) write(asset.path, parsed.base64, { base64: true });
      else write(asset.path, asset.data);
    } else {
      write(asset.path, asset.data);
    }
  }

  const missing = validateOgrafPackage(manifest, packaged);
  if (missing.length) throw new Error(`OGraf package incomplete: ${missing.join(' ')}`);
}

// ── The target ────────────────────────────────────────────────────────────────

export const ografTarget: ExportTarget = {
  id: 'ograf',
  label: 'OGraf (EBU) export',
  description: 'An OGraf v1 Graphic: manifest + Web Component wrapping this template — for OGraf-compatible renderers.',
  successMessage: '✓ Exported. Load the unzipped folder in an OGraf-compatible renderer.',
  async build(template, ctx) {
    const zip = new JSZip();
    const root = zip.folder(slug(template.name))!;
    await addOgrafPackage(root, template, ctx?.graphicUsage ?? 'live');
    root.file(
      'README.md',
      `# ${template.name} — OGraf Graphic\n\nGenerated by NoaCG Studio.\n\n` +
        `Load the manifest (${slug(template.name)}.ograf.json) in any OGraf v1 compatible renderer.\n` +
        `Actions map to the embedded template runtime: load/updateAction → update(), playAction → play()/next(), stopAction → stop().\n` +
        `When the graphic carries a state machine, its operator events are declared as customActions in the manifest — customAction({id, payload}) fires them through the template's own serial event queue, payload applied only if the machine accepts the event.\n`,
    );
    return zip;
  },
};
