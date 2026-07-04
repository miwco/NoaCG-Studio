// Export target registry. Each target transforms the template into a downloadable zip
// package: SPX (folder), CasparCG (single self-contained html), OGraf (manifest + Web
// Component).

import type JSZip from 'jszip';
import type { SpxTemplate } from '../model/types';
import { spxStarter } from './targets/spxStarter';
import { spxPack } from './targets/spxPack';
import { casparTarget } from './targets/casparcg';
import { ografTarget } from './targets/ograf';

export interface ExportTarget {
  id: string;
  label: string;
  description: string;
  build: (template: SpxTemplate) => Promise<JSZip>;
}

export const EXPORT_TARGETS: ExportTarget[] = [spxStarter, spxPack, casparTarget, ografTarget];
