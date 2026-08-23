# The NoaCG graphic contract

What a graphic must expose and satisfy to be played by SPX / CasparCG / OGraf / OBS and saved,
edited and operated in NoaCG. Everything here is checked by `noacg validate`; nothing here says how
the graphic should look.

## 1. The files

A graphic is three sources plus assets, laid out as the SPX package (`references/package.md`):

```
<slug>.html          the document: <head> links css/template.css, js/gsap.min.js, js/template.js,
                     and carries the SPX definition script; <body> holds the markup
css/template.css     the stylesheet
js/template.js       the runtime: ES5, the four globals, the marked ANIMATION region
js/gsap.min.js       bundled GSAP (the ONLY library; the scaffold copies it in)
images/  fonts/      assets, referenced RELATIVELY (images/logo.png, fonts/inter.woff2)
```

Rules the playout engines impose: **ES5 only in `template.js`** (CasparCG's embedded Chromium
cannot parse `const`/arrow functions/optional chaining - use `var`, `function`); **GSAP is the
only library** (the global `gsap`); **no network, no storage, no code building at runtime** (no
`fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `eval`, `new Function`, `import()`,
workers, `document.cookie`, no reaching `parent`/`top`) - the validator refuses these; **relative
paths only** (no `/`-rooted or `http(s)://` references; a Google Font is downloaded and shipped
under `fonts/`, never linked); `template.js` loads in `<head>`, so DOM work at load time needs a
DOM-ready guard.

## 2. The SPX definition (the fields)

A `<script id="spx-template-definition">` in the `<head>` assigns
`window.SPXGCTemplateDefinition`:

```html
<script id="spx-template-definition">
window.SPXGCTemplateDefinition = {
  "description": "Football scoreboard",
  "playserver": "OVERLAY", "playchannel": "1", "playlayer": "7", "webplayout": "7",
  "out": "manual",          /* or "none", or a number of ms to auto-clear */
  "dataformat": "json", "uicolor": "7",
  "steps": "1",             /* derived from the ANIMATION data after validate; leave "1" */
  "DataFields": [
    { "field": "f0", "ftype": "textfield", "title": "Team A", "value": "HOME" },
    { "field": "f1", "ftype": "number",    "title": "Score A", "value": "0" },
    { "field": "f2", "ftype": "textfield", "title": "Team B", "value": "AWAY" },
    { "field": "f3", "ftype": "number",    "title": "Score B", "value": "0" },
    { "field": "f4", "ftype": "filelist",  "title": "Home crest", "value": "", "assetfolder": "./images/", "extension": "png" }
  ]
};
</script>
```

- Fields are `f0, f1, …` in order. `title` is what the operator reads; `value` is the default.
- `ftype`: `textfield` (one line), `textarea` (a LIST - one item per line, for rows/credits/
  items; the runtime renders it), `number` (gets +/- steppers), `filelist` (an image path; with
  `assetfolder`/`extension`), `dropdown` (with `items: [{text, value}]`), `checkbox`, `color`,
  `hidden` (input-only: the operator types it, nothing draws it - a duration, a word source).
- **Every field `fN` maps to exactly one element `id="fN"`** that `update()` writes into. An
  input-only value lives in a holder `<div id="fN" class="noacg-data-source">` hidden by a CSS
  RULE (never an inline `style="display:none"` - the editor clears inline styles).
- All `DataFields` values are STRINGS on the wire.

## 3. The four globals (the lifecycle)

```js
// update(data): SPX sends the field values as a JSON string, e.g. {"f0":"HOME","f1":"2"}.
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) setFieldValue(el, fields[key]);      // text -> textContent, <img> -> src
  }
}
function play() { gsap.killTweensOf('*'); buildInTimeline(); }     // take on air
function stop() { gsap.killTweensOf('*'); buildOutTimeline(); }    // take off air
function next() { return (typeof revealNextStep === 'function') ? revealNextStep() : null; } // Continue
```

`update()` may be called before `play()` (the first data lands before the take) and while on air
(a score changes). Operator text that reaches `innerHTML` is ESCAPED first (a field value may
come from an audience member). A graphic that must be replayable: `play()` after `stop()` renders
correctly (entrances are `fromTo`, not `from`).

## 4. The editability contract (what makes it NoaCG-editable)

NoaCG's editor, Style panel and timeline find a graphic's parts by this structure - keep it and
they work; drop it and the graphic still PLAYS but the studio cannot edit it.

- **The spine.** Pick one kebab-case PREFIX naming the graphic (`scoreboard`, `timing-tower`,
  `now-playing`). The root is `<div class="PREFIX">` (absolutely positioned in its zone,
  `opacity: 0` - `play()` reveals it). Directly inside: `<div class="PREFIX-box">` - that exact
  class ALONE on the element (it is how the editor finds the panel). Every visible text field sits
  in its own `<div class="PREFIX-mask"><span id="fN" class="PREFIX-…">…</span></div>` (the mask
  is `overflow: hidden`, which is what lets a line slide in from behind its own edge). Every other
  class starts with the prefix. An optional flourish is `<div class="PREFIX-accent">`.
- **The `:root` variables.** Colours flow through `--accent`, `--text-color`, `--text-dim`,
  `--panel-bg`; the typeface through `--font-heading` (and `--font-numeric` where live numbers
  are set); every dimension is `calc(Npx * var(--scale))` and every font-size additionally
  `* var(--type-scale)`. Declare them in `:root` with your values; write no other hard-coded
  colours. That is how the Style panel, brands and kits retint a graphic.
- **The ANIMATION region.** All motion lives between these two EXACT markers in `template.js`:
  ```js
  /* == ANIMATION (generated — the Animation panel rewrites this block) == */
  ...
  /* == END ANIMATION == */
  ```
  Write it as plain GSAP: `var animSpeed = 1, easeIn = 'power3.out', easeOut = 'power2.in';`
  then `function buildInTimeline() { var tl = gsap.timeline({ defaults: { ease: easeIn } }); … return tl; }`
  and `function buildOutTimeline() { … }` using only `tl.set / tl.to / tl.fromTo` with literal
  values, durations as `N / animSpeed`, overlaps as `'-=N'`; `buildInTimeline` starts with
  `tl.set('.PREFIX', { opacity: 1 })` and `buildOutTimeline` ends by hiding it again. No DOM
  measurement, nested timelines or conditionals inside the region. **`noacg validate` converts
  this into NoaCG's keyframe DATA block (`var NOACG_ANIM = {…}`) plus its interpreter** - the form
  the studio timeline edits. After that, change motion by editing the DATA (keyframes, durations,
  eases), never the interpreter functions below it. A graphic scaffolded from a type already
  carries the data form (and the type's state machine inside it).
- Text boxes hug their content (`width: fit-content`) with a `max-width` cap so long text wraps
  instead of escaping - the stress frame doubles every text.

## 5. Operator actions (when a graphic needs more than Take/Update/Next/Out)

A graphic's operator surface is derived from the graphic: fields become inputs, the state
machine's operator EVENTS become buttons (`references/control.md`). A plain graphic needs no
machine - the implicit one gives Take/Update/Next/Out. A graphic with actions (a scoreboard's flag,
a countdown's pause) takes them from its TYPE: `noacg scaffold --type <id>` brings the machine and
its runtime; you restyle around it. Authoring your own machine is a later capability.

## 6. Frame, safety, legibility

The frame is the declared resolution (1920x1080 default) at the declared fps; the graphic is
composited OVER VIDEO, so the canvas is transparent (`html, body { background: transparent }`).
Keep text inside the title-safe area (the validator reports escapes), readable at broadcast
size (the validator reports a size floor per category - 20px at 1080p, 16px for a corner bug -
and measures contrast), and never overlapping other text. Motion: entrances 0.5-1.4 s, exits
faster; 60 fps means transform/opacity only (no layout-thrashing properties in tweens).

## 7. A worked example (from scratch, typeless)

```html
<!-- now-playing.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Now playing</title>
  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>
  <script id="spx-template-definition">
  window.SPXGCTemplateDefinition = {
    "description": "Now playing", "playserver": "OVERLAY", "playchannel": "1", "playlayer": "7",
    "webplayout": "7", "out": "manual", "dataformat": "json", "uicolor": "7", "steps": "1",
    "DataFields": [
      { "field": "f0", "ftype": "textfield", "title": "Artist", "value": "Anna Andersson" },
      { "field": "f1", "ftype": "textfield", "title": "Song",   "value": "Northern Lights" }
    ]
  };
  </script>
</head>
<body>
  <div class="now-playing">
    <div class="now-playing-box">
      <div class="now-playing-mask"><span id="f0" class="now-playing-artist">Anna Andersson</span></div>
      <div class="now-playing-mask"><span id="f1" class="now-playing-song">Northern Lights</span></div>
    </div>
  </div>
</body>
</html>
```

```css
/* css/template.css */
:root {
  --accent: #f6a623; --text-color: #ffffff; --text-dim: rgba(255,255,255,0.72); --panel-bg: rgba(10,12,16,0.88);
  --font-heading: "Inter", system-ui, sans-serif; --scale: 1; --type-scale: 1;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: transparent; font-family: var(--font-heading); }
.now-playing { position: absolute; left: calc(120px * var(--scale)); bottom: calc(120px * var(--scale)); opacity: 0; }
.now-playing-box { width: fit-content; max-width: calc(900px * var(--scale)); padding: calc(18px * var(--scale)) calc(28px * var(--scale)); background: var(--panel-bg); color: var(--text-color); border-left: calc(6px * var(--scale)) solid var(--accent); }
.now-playing-mask { overflow: hidden; }
.now-playing-mask > span { display: inline-block; overflow-wrap: break-word; }
.now-playing-artist { font-size: calc(44px * var(--scale) * var(--type-scale)); font-weight: 700; line-height: 1.1; }
.now-playing-song { font-size: calc(26px * var(--scale) * var(--type-scale)); color: var(--text-dim); }
```

```js
// js/template.js - Now playing. SPX calls update(), play(), stop(), next().
function setFieldValue(el, value) {
  if (el.tagName === 'IMG') { el.src = value || ''; el.style.display = value ? '' : 'none'; return; }
  el.textContent = value == null ? '' : String(value);
}
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) { var el = document.getElementById(key); if (el) setFieldValue(el, fields[key]); }
}
function play() { gsap.killTweensOf('*'); buildInTimeline(); }
function stop() { gsap.killTweensOf('*'); buildOutTimeline(); }
function next() { return (typeof revealNextStep === 'function') ? revealNextStep() : null; }

/* == ANIMATION (generated — the Animation panel rewrites this block) == */
var animSpeed = 1;
var easeIn = 'power3.out';
var easeOut = 'power2.in';
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.now-playing', { opacity: 1 });
  tl.fromTo('.now-playing-box', { xPercent: -100, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6 / animSpeed });
  tl.fromTo('.now-playing-mask > span', { yPercent: 110 }, { yPercent: 0, duration: 0.5 / animSpeed, stagger: 0.08 / animSpeed }, '-=0.3');
  return tl;
}
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.now-playing-mask > span', { yPercent: -110, duration: 0.3 / animSpeed, stagger: 0.05 / animSpeed });
  tl.to('.now-playing-box', { xPercent: -100, opacity: 0, duration: 0.4 / animSpeed }, '-=0.1');
  tl.set('.now-playing', { opacity: 0 });
  return tl;
}
/* == END ANIMATION == */
```

`noacg validate ./now-playing` then converts the region to keyframe data, benches it (binding,
pre-play, entrance, doubled-text stress, exit, replay), regenerates the OGraf half, and the
operator gets two inputs + Take/Update/Next/Out.
