// Starter SPX export: stays as close to the editor code as possible. Great for learning and
// debugging — the exported files mirror exactly what you see in the editor.

import JSZip from 'jszip';
import { addSharedAssets, ensureExternalRefs, spxReadme } from '../common';
import type { ExportTarget } from '../registry';

export const spxStarter: ExportTarget = {
  id: 'spx-starter',
  label: 'Starter SPX export',
  description: 'Clean, 1:1 with the editor code. Best for learning and debugging.',
  async build(template) {
    const zip = new JSZip();
    zip.file('index.html', ensureExternalRefs(template.html));
    zip.file('css/template.css', template.css);
    zip.file('js/template.js', template.js);
    zip.file('README.md', spxReadme(template, 'Starter'));
    await addSharedAssets(zip, template);
    return zip;
  },
};
