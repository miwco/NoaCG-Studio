// Generate the standalone controlpanel.html bundled with an export: a self-contained
// operator page (inline CSS + JS, no dependencies) built from the template's fields. It
// drives the graphic over a BroadcastChannel — open the graphic (index.html) and this page
// in the same browser and operate it live. Same modular engine as the in-app Control tab.

import type { SpxField } from '../model/types';
import { controlChannelName, controlsForFields, type ControlDescriptor } from './controlModel';
import type { RemoteControlConfig } from './realtimeControl';
import { isImageAsset } from '../assets/assetUtils';

interface EmittedControl extends ControlDescriptor {
  value: string;
}

/** Build the descriptors + their default values for the page's generic renderer. */
function emitControls(fields: SpxField[]): EmittedControl[] {
  const byId = new Map(fields.map((f) => [f.field, f]));
  return controlsForFields(fields).map((c) => ({ ...c, value: byId.get(c.field)?.value ?? '' }));
}

/** Safe to drop inside a <script> as a JS string/JSON literal (guards `</script>`). */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function renderControlPanelHtml(
  template: { name: string; fields: SpxField[]; assets: { path: string }[] },
  remote?: RemoteControlConfig | null,
): string {
  const channel = controlChannelName(template.name);
  const controls = emitControls(template.fields);
  const imagePaths = template.assets.filter((a) => isImageAsset(a.path)).map((a) => a.path);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${template.name} — control panel</title>
<style>
  :root { --bg:#10141b; --panel:#171d26; --line:#2a3444; --text:#e8ecf2; --dim:#8b95a5; --accent:#3aa0ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, sans-serif; }
  header { padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:12px; }
  header h1 { font-size:16px; margin:0; }
  header .status { margin-left:auto; font-size:12px; color:var(--dim); }
  main { max-width:640px; margin:0 auto; padding:18px; }
  .row { display:flex; gap:8px; align-items:center; }
  .field { padding:10px 0; border-bottom:1px solid var(--line); }
  .field > label { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--dim); margin-bottom:6px; }
  input, textarea, select, button { font:inherit; color:var(--text); background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:8px 10px; }
  input, textarea, select { width:100%; }
  textarea { min-height:96px; resize:vertical; }
  button { cursor:pointer; background:#243044; }
  button:hover { border-color:var(--accent); }
  .step { width:44px; flex:0 0 auto; font-weight:700; }
  .num-input { text-align:center; }
  .actions { position:sticky; bottom:0; background:var(--bg); border-top:1px solid var(--line); padding:14px 18px; display:flex; gap:8px; }
  .actions .primary { background:var(--accent); color:#06131f; border-color:var(--accent); font-weight:700; flex:1; }
  .live { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dim); }
  .thumb { width:40px; height:40px; object-fit:contain; background:var(--panel); border:1px solid var(--line); border-radius:6px; }
</style>
</head>
<body>
<header>
  <h1>${template.name}</h1>
  <span class="status" id="status">connecting…</span>
</header>
<main id="fields"></main>
<div class="actions">
  <label class="live"><input type="checkbox" id="live" checked style="width:auto" /> live</label>
  <button class="primary" id="play">▶ Play</button>
  <button id="stop">■ Stop</button>
  <button id="update">⟳ Update</button>
  <button id="next">» Next</button>
</div>
<script>
var CONTROLS = ${jsonForScript(controls)};
var IMAGES = ${jsonForScript(imagePaths)};
var CHANNEL = ${jsonForScript(channel)};
var REMOTE = ${jsonForScript(remote ?? null)};   // {ref,key,topic} when remote control is enabled, else null

// State: current value per field, seeded from the definition defaults.
var state = {};
CONTROLS.forEach(function (c) { state[c.field] = c.value; });

// Transport 1: BroadcastChannel to a graphic on the SAME machine (Era 4).
var ch = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(CHANNEL) : null;

// Transport 2 (optional): Supabase Realtime — drive a graphic on ANY device (Era 5). Send-only,
// via the stateless REST broadcast endpoint (no socket/join needed for a sender). Public channel +
// publishable key; the TOPIC is a shared secret.
function sendRemote(msg) {
  if (!REMOTE) return;
  fetch('https://' + REMOTE.ref + '.supabase.co/realtime/v1/api/broadcast', {
    method: 'POST',
    headers: { apikey: REMOTE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ topic: REMOTE.topic, event: 'control', payload: msg, private: false }] })
  }).catch(function () { /* offline / blocked — the local BroadcastChannel path still works */ });
}

document.getElementById('status').textContent =
  REMOTE ? ('remote + local · ' + REMOTE.topic) : (ch ? ('local channel: ' + CHANNEL) : 'BroadcastChannel unsupported');

function post(msg) { if (ch) ch.postMessage(msg); sendRemote(msg); }
function sendUpdate() { post({ t: 'update', data: state }); }
function live() { return document.getElementById('live').checked; }
function onChange(field, value) { state[field] = value; if (live()) sendUpdate(); }

function el(tag, attrs, kids) {
  var e = document.createElement(tag);
  for (var k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
  (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}

function buildControl(c) {
  var wrap = el('div', { class: 'field' }, [el('label', {}, [c.title])]);
  var v = state[c.field];
  if (c.kind === 'number') {
    var input = el('input', { type: 'number', class: 'num-input' });
    input.value = v || '0';
    input.oninput = function () { onChange(c.field, input.value); };
    var minus = el('button', { class: 'step' }, ['−']);
    var plus = el('button', { class: 'step' }, ['+']);
    var stepBox = el('input', { type: 'number', class: 'num-input', title: 'step', style: 'width:56px;flex:0 0 auto' });
    stepBox.value = '1';
    function bump(dir) { var s = parseFloat(stepBox.value) || 1; input.value = String((parseFloat(input.value) || 0) + dir * s); onChange(c.field, input.value); }
    minus.onclick = function () { bump(-1); };
    plus.onclick = function () { bump(1); };
    wrap.appendChild(el('div', { class: 'row' }, [minus, input, plus, stepBox]));
  } else if (c.kind === 'lines') {
    var ta = el('textarea', { placeholder: 'one entry per line' });
    ta.value = v || '';
    ta.oninput = function () { onChange(c.field, ta.value); };
    wrap.appendChild(ta);
  } else if (c.kind === 'select') {
    var sel = el('select');
    (c.options || []).forEach(function (o) { var opt = el('option', { value: o.value }, [o.text]); if (o.value === v) opt.selected = true; sel.appendChild(opt); });
    sel.onchange = function () { onChange(c.field, sel.value); };
    wrap.appendChild(sel);
  } else if (c.kind === 'toggle') {
    var cb = el('input', { type: 'checkbox', style: 'width:auto' });
    cb.checked = (v === '1' || v === 'true');
    cb.onchange = function () { onChange(c.field, cb.checked ? '1' : '0'); };
    wrap.appendChild(el('label', { class: 'row' }, [cb, 'enabled']));
  } else if (c.kind === 'color') {
    var col = el('input', { type: 'color', style: 'width:44px;flex:0 0 auto' });
    col.value = /^#/.test(v) ? v : '#000000';
    var txt = el('input', { type: 'text' }); txt.value = v || '';
    col.oninput = function () { txt.value = col.value; onChange(c.field, col.value); };
    txt.oninput = function () { onChange(c.field, txt.value); };
    wrap.appendChild(el('div', { class: 'row' }, [col, txt]));
  } else if (c.kind === 'image') {
    var isel = el('select', { class: 'grow' });
    isel.appendChild(el('option', { value: '' }, ['(no image)']));
    IMAGES.forEach(function (p) { var opt = el('option', { value: p }, [p]); if (p === v) opt.selected = true; isel.appendChild(opt); });
    var img = el('img', { class: 'thumb', alt: '' }); if (v) img.setAttribute('src', v);
    isel.onchange = function () { if (isel.value) img.setAttribute('src', isel.value); else img.removeAttribute('src'); onChange(c.field, isel.value); };
    wrap.appendChild(el('div', { class: 'row' }, [isel, img]));
  } else {
    var t = el('input', { type: 'text' }); t.value = v || '';
    t.oninput = function () { onChange(c.field, t.value); };
    wrap.appendChild(t);
  }
  return wrap;
}

var host = document.getElementById('fields');
CONTROLS.forEach(function (c) { host.appendChild(buildControl(c)); });
if (CONTROLS.length === 0) host.appendChild(el('p', {}, ['This template has no editable fields.']));

document.getElementById('play').onclick = function () { sendUpdate(); post({ t: 'play' }); };
document.getElementById('stop').onclick = function () { post({ t: 'stop' }); };
document.getElementById('update').onclick = sendUpdate;
document.getElementById('next').onclick = function () { post({ t: 'next' }); };
</script>
</body>
</html>`;
}
