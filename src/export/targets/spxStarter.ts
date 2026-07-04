// Starter SPX export: stays as close to the editor code as possible. Great for learning and
// debugging — the exported files mirror exactly what you see in the editor.

import JSZip from 'jszip';
import { addSharedAssets, ensureExternalRefs, slug, spxReadme } from '../common';
import type { ExportTarget } from '../registry';

export const spxStarter: ExportTarget = {
  id: 'spx-starter',
  label: 'Starter SPX export',
  description: 'Clean, 1:1 with the editor code. Best for learning and debugging.',
  async build(template) {
    const zip = new JSZip();
    // Everything lives inside one project folder, so extracting into the SPX/CasparCG
    // templates folder yields  [TemplatesFolder]/your_project/index.html + images/…
    const root = zip.folder(slug(template.name))!;
    root.file('index.html', ensureExternalRefs(template.html));
    root.file('css/template.css', template.css);
    root.file('js/template.js', template.js);
    root.file('README.md', spxReadme(template, 'Starter'));
    await addSharedAssets(root, template);
    return zip;
  },
};
