// Export target registry. Each target transforms the template into a downloadable zip
// package: SPX (folder), HTML overlay (single autoplay html for OBS/vMix browser sources),
// CasparCG (single self-contained html), OGraf (manifest + Web Component).

import type JSZip from 'jszip';
import type { SpxTemplate } from '../model/types';

export interface ExportContext {
  /** The Data panel's sample values (field id → value) at export time — targets with no
   *  playout server (the HTML overlay) bake these in as the on-load data. */
  sampleData?: Record<string, string>;
}

export interface ExportTarget {
  id: string;
  label: string;
  description: string;
  build: (template: SpxTemplate, ctx?: ExportContext) => Promise<JSZip>;
}

// Imported AFTER the interfaces so targets can import types from here without a cycle.
import { spxStarter } from './targets/spxStarter';
import { spxPack } from './targets/spxPack';
import { htmlOverlayTarget } from './targets/htmlOverlay';
import { h2rTarget } from './targets/h2r';
import { casparTarget } from './targets/casparcg';
import { ografTarget } from './targets/ograf';

export const EXPORT_TARGETS: ExportTarget[] = [spxStarter, spxPack, htmlOverlayTarget, h2rTarget, casparTarget, ografTarget];
