// The tiny receiver injected into an exported graphic's index.html. It lets a standalone
// control panel (controlpanel.html, same browser + origin) drive the graphic live over a
// BroadcastChannel — useful when the graphic runs as an OBS/browser source and you operate
// it from another tab. It only ADDS a listener; SPX/CasparCG still call the same globals
// directly, so nothing conflicts. On a renderer without BroadcastChannel it does nothing.

export function controlReceiverScript(templateName: string, channelName: string): string {
  return `<script id="spx-control-receiver">
/* Control receiver — ${templateName}.
   A control panel on the same machine (controlpanel.html) posts messages here; we forward
   them to the graphic's own update()/play()/stop()/next(). Remove this block to opt out. */
(function () {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    var ch = new BroadcastChannel('${channelName}');
    ch.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.t === 'update' && typeof update === 'function') update(JSON.stringify(m.data || {}));
      else if (m.t === 'play' && typeof play === 'function') play();
      else if (m.t === 'stop' && typeof stop === 'function') stop();
      else if (m.t === 'next' && typeof next === 'function') next();
    };
  } catch (e) { /* channel unavailable — the graphic still works, just not remotely driven */ }
})();
</script>`;
}
