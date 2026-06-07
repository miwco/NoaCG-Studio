// Advanced / Pack SPX export: wraps the SAME template in a fuller SPX package, mirroring the
// official template-pack layout (helper interface + metadata). Behavior is identical to Starter;
// only the packaging differs. The template.js still owns play()/stop()/update().

import JSZip from 'jszip';
import { addSharedAssets, ensureExternalRefs, spxReadme } from '../common';
import type { ExportTarget } from '../registry';

// Helper interface added alongside (not replacing) the template's own runtime functions.
const SPX_INTERFACE_JS = `/*
  SPX helper interface (Pack export).
  Provides small utilities and error reporting. It does NOT define play/stop/update —
  those live in template.js so the graphic behaves exactly as in the editor.
*/

// Shorthand for document.getElementById.
function e(id) { return document.getElementById(id); }

// Decode HTML entities in a string.
function htmlDecode(txt) {
  var doc = new DOMParser().parseFromString(txt, 'text/html');
  return doc.documentElement.textContent;
}

// Returns false for empty/undefined/null strings.
function validString(str) {
  if (str === undefined || str === null) return false;
  var s = String(str).toUpperCase();
  return s !== '' && s !== 'UNDEFINED' && s !== 'NULL';
}

// Sync GSAP to the SPX renderer frame rate when available.
if (window.top && window.top.spxRenderer && window.top.spxRenderer.fps && window.gsap) {
  gsap.ticker.fps(window.top.spxRenderer.fps);
}

// Report template errors to the console for easier debugging.
window.onerror = function (msg, url, row) {
  console.warn('SPX template error:', msg, 'at', url + ':' + row);
};
`;

function injectInterfaceRef(html: string): string {
  const ref = '  <script src="js/spx_interface.js"></script>\n';
  if (/src=["'](?:\.\/)?js\/spx_interface\.js["']/i.test(html)) return html;
  // Insert just before template.js if present, else before </head>.
  if (/<script[^>]*src=["'](?:\.\/)?js\/template\.js["'][^>]*>/i.test(html)) {
    return html.replace(/(<script[^>]*src=["'](?:\.\/)?js\/template\.js["'][^>]*><\/script>)/i, `${ref}$1`);
  }
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${ref}</head>`);
  return html;
}

export const spxPack: ExportTarget = {
  id: 'spx-pack',
  label: 'Advanced / Pack export',
  description: 'Fuller SPX package with a helper interface and metadata. Same on-screen behavior.',
  async build(template) {
    const zip = new JSZip();
    const html = injectInterfaceRef(ensureExternalRefs(template.html));
    zip.file('index.html', html);
    zip.file('css/template.css', template.css);
    zip.file('js/template.js', template.js);
    zip.file('js/spx_interface.js', SPX_INTERFACE_JS);
    zip.file('README.md', spxReadme(template, 'Advanced / Pack'));
    zip.file(
      'template.meta.json',
      JSON.stringify({ name: template.name, settings: template.settings, fields: template.fields }, null, 2),
    );
    await addSharedAssets(zip, template);
    return zip;
  },
};
