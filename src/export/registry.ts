// Export target registry. Targets are modular so CasparCG and OGraf exporters can be added later
// without touching the UI. Each target transforms the template into a downloadable zip package.

import type JSZip from 'jszip';
import type { SpxTemplate } from '../model/types';
import { spxStarter } from './targets/spxStarter';
import { spxPack } from './targets/spxPack';

export interface ExportTarget {
  id: string;
  label: string;
  description: string;
  build: (template: SpxTemplate) => Promise<JSZip>;
}

export const EXPORT_TARGETS: ExportTarget[] = [spxStarter, spxPack];
