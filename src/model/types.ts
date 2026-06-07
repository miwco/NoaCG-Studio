// Core data model for the SPX HTML GFX Builder.
//
// The *template* is the single source of truth. The editor edits html / css / js
// directly; `fields` and `settings` are parsed from the SPXGCTemplateDefinition that
// lives inside the HTML (see model/spxDefinition.ts). Exporters transform this clean
// template into a packaged SPX zip without changing how the graphic behaves.

/** All SPX DataField types ("ftype"). Verified against docs.spxgraphics.com. */
export type Ftype =
  | 'textfield'
  | 'textarea'
  | 'dropdown'
  | 'filelist'
  | 'number'
  | 'checkbox'
  | 'color'
  | 'button'
  | 'instruction'
  | 'caption'
  | 'hidden'
  | 'divider'
  | 'spacer';

/** ftypes that actually carry editable operator data we feed to update(). */
export const DATA_FTYPES: Ftype[] = [
  'textfield',
  'textarea',
  'dropdown',
  'filelist',
  'number',
  'checkbox',
  'color',
  'hidden',
];

export interface SpxDropdownItem {
  text: string;
  value: string;
}

/** A single SPX DataField definition entry. */
export interface SpxField {
  field: string; // unique id, e.g. "f0"
  ftype: Ftype;
  title: string;
  value: string; // default / sample value
  prvar?: string; // project variable (shared across templates)
  items?: SpxDropdownItem[]; // dropdown
  assetfolder?: string; // filelist
  extension?: string; // filelist
  fcall?: string; // button
  descr?: string; // button
}

/** Playout / display settings from SPXGCTemplateDefinition (minus DataFields). */
export interface SpxSettings {
  description: string;
  playserver: string;
  playchannel: string;
  playlayer: string;
  webplayout: string;
  out: string; // "manual" | "none" | milliseconds
  steps: string; // number of animation phases
  dataformat: string; // "json" (default) | "xml"
  uicolor: string; // "1".."7"
}

/** A binary/relative asset bundled with the template (image, font, video...). */
export interface AssetFile {
  path: string; // relative path inside the package, e.g. "assets/logo.png"
  data: Blob | string; // bytes, or a data URL / text
}

/** The full template — the source of truth edited in the app. */
export interface SpxTemplate {
  name: string;
  html: string; // body structure + <script id="spx-template-definition"> block
  css: string;
  js: string; // clean play(), stop(), update(data), runTemplateUpdate()
  fields: SpxField[]; // parsed view of the definition (source of truth = the code)
  settings: SpxSettings;
  assets: AssetFile[];
}

/** A proposed change to the template (from AI or building blocks). */
export interface TemplateChange {
  summary: string; // human-readable description of what changed
  template: SpxTemplate; // the resulting template if applied
  explanation?: string; // optional teaching note ("explain" action)
}

export const DEFAULT_SETTINGS: SpxSettings = {
  description: 'Lower third',
  playserver: 'OVERLAY',
  playchannel: '1',
  playlayer: '1',
  webplayout: '1',
  out: 'manual',
  steps: '0',
  dataformat: 'json',
  uicolor: '7',
};
