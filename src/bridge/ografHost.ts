// THE OGRAF HOST DOCUMENT: a minimal OGraf v1 renderer for ONE Graphic, as a string.
//
// The bridge's bench can exercise a NoaCG template through `composeDocument` because the
// template IS the document. A third-party OGraf Graphic is the opposite shape - a Web Component
// to mount inside somebody's page - so to validate, drive or screenshot one, the driver needs a
// page that does what a renderer does: import the `main` module, register the class under a
// tag, mount it, call `load()`, then the actions (spec §"Renderer / loader contract"). This is
// that page, with a tiny driver (`window.__ografHost`) the CLI calls through `page.evaluate`.
//
// Where the package comes from: a module import needs a real http(s) URL (browsers refuse
// module imports over `file://`, docs/OGRAF.md), so the CLI MOUNTS the package under the app's
// own origin with `context.route` - `/__noacg-package/<id>/...` answered from the files on disk
// - and this document imports `graphic.mjs` from that base. The same-origin mount is what lets a
// component's own `new URL('./lib/x', import.meta.url)` resolve, and it is why the bench
// browser's route allowlist admits that path prefix and nothing else outside the app.
//
// Pure string building; the document runs in the CLI's contained bench context only.

/** What the host needs to mount one Graphic. */
export interface OgrafHostOptions {
  /** Absolute or origin-relative base URL of the package (ends with '/'). */
  packageBase: string;
  /** The manifest's `main`, relative to the package base. */
  main: string;
  /** The custom element tag to register. `customElements.define` cannot be undone, so a host
   *  that mounts several Graphics in one document needs a distinct tag per load. */
  tag: string;
  /** Canvas size the renderer presents (`renderCharacteristics` and the stage box). */
  width: number;
  height: number;
}

/** The host page. Transparent background, the stage sized to the canvas, no chrome. */
export function ografHostDocument(opts: OgrafHostOptions): string {
  const base = opts.packageBase.endsWith('/') ? opts.packageBase : `${opts.packageBase}/`;
  const mainUrl = JSON.stringify(`${base}${opts.main.replace(/^\.\//, '')}`);
  const tag = JSON.stringify(opts.tag);
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<title>OGraf host</title>
<style>
  html, body { margin: 0; width: ${opts.width}px; height: ${opts.height}px; overflow: hidden; background: transparent; }
  #stage { position: relative; width: ${opts.width}px; height: ${opts.height}px; }
  #stage > * { position: absolute; inset: 0; }
</style>
</head><body>
<div id="stage"></div>
<script type="module">
  // The driver the bench calls. Every method resolves to the Graphic's ReturnPayload (or a
  // synthesized 5xx when the component threw), never rejects - the spec's own posture.
  const state = { el: null, mod: null, error: null };
  const payload = (p) => (p === undefined ? { statusCode: 200 } : p);
  const run = async (fn) => {
    try { return payload(await fn()); }
    catch (err) { return { statusCode: 500, statusMessage: String((err && err.message) || err) }; }
  };
  window.__ografHost = {
    async mount(data, renderCharacteristics) {
      return run(async () => {
        if (!state.mod) state.mod = await import(${mainUrl});
        const cls = state.mod.default;
        if (typeof cls !== 'function') throw new Error('main does not default-export a class');
        if (!customElements.get(${tag})) customElements.define(${tag}, cls);
        const el = document.createElement(${tag});
        document.getElementById('stage').appendChild(el);
        state.el = el;
        return el.load({ data: data || {}, renderType: 'realtime', renderCharacteristics: renderCharacteristics || { resolution: { width: ${opts.width}, height: ${opts.height} } } });
      });
    },
    play(params) { return run(() => state.el.playAction(params || {})); },
    stop(params) { return run(() => state.el.stopAction(params || {})); },
    update(data, params) { return run(() => state.el.updateAction(Object.assign({ data: data || {} }, params || {}))); },
    custom(id, data, params) { return run(() => state.el.customAction(Object.assign({ id, payload: data || {} }, params || {}))); },
    async dispose() {
      const el = state.el; state.el = null;
      if (!el) return { statusCode: 200 };
      const out = await run(() => el.dispose({}));
      el.remove();
      return out;
    },
    mounted() { return !!state.el; },
  };
  window.addEventListener('error', (e) => { state.error = String(e.message || e.error); });
  window.__noacgHostReady = true;
</script>
</body></html>`;
}

/** A tag name a browser accepts (lowercase, hyphenated, no reserved names) from any id. */
export function hostTagFor(id: string, nonce: string): string {
  const clean = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'graphic';
  return `noacg-host-${clean}-${nonce}`;
}
