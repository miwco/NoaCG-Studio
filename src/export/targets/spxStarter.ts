// Starter SPX export: stays as close to the editor code as possible. Great for learning and
// debugging — the exported files mirror exactly what you see in the editor.

import JSZip from 'jszip';
import { addSharedAssets, ensureExternalRefs, slug, spxReadme } from '../common';
import type { ExportTarget } from '../registry';

/** Write one Starter-format template into the given zip folder (reused by packet export). */
export async function buildStarterInto(root: JSZip, template: Parameters<ExportTarget['build']>[0]): Promise<void> {
  root.file('index.html', ensureExternalRefs(template.html));
  root.file('css/template.css', template.css);
  root.file('js/template.js', template.js);
  root.file('README.md', spxReadme(template, 'Starter'));
  await addSharedAssets(root, template);
}

export const spxStarter: ExportTarget = {
  id: 'spx-starter',
  label: 'Starter SPX export',
  description: 'Clean, 1:1 with the editor code. Best for learning and debugging.',
  async build(template) {
    const zip = new JSZip();
    // Everything lives inside one project folder, so extracting into the SPX/CasparCG
    // templates folder yields  [TemplatesFolder]/your_project/index.html + images/…
    const root = zip.folder(slug(template.name))!;
    await buildStarterInto(root, template);
    return zip;
  },
};
