// The offline HyperFrames sample compositions (the stub provider's 'hyperframes' arm).
// Each is generated AGAINST the project settings - the canvas size and duration bake into
// the document exactly as the real coder is instructed to - and follows the full
// composition contract (root data-*, clips, one paused registered timeline, variables
// declared on <html>), so the whole generate -> validate -> preview loop works with no
// key at all. Broadcast-grade on purpose: these double as the offline acceptance tests.

import type { VideoCompSettings } from '../../video/types';

/** Seconds with up to 2 decimals, trailing zeros trimmed ("2.5", "6"). */
const sec = (n: number): string => String(Math.round(n * 100) / 100);

interface HfSample {
  html: string;
  summary: string;
}

/** A clean title reveal: an accent bar sweeps in, the title rises out of a mask, a
 *  kicker fades up, everything exits sharply. The default sample. */
function titleHtml(s: VideoCompSettings): string {
  const { width: w, height: h } = s;
  const dur = s.durationInFrames / s.fps;
  const exit = Math.max(0.8, dur - 0.55);
  const holdStart = Math.min(1.2, exit);
  const holdCycles = Math.max(0, Math.floor((exit - holdStart) / 1.1) - 1);
  return `<!doctype html>
<!-- Title reveal (offline sample): an accent bar sweeps in, the title rises out of a
     mask, a kicker fades up, everything exits sharply. ${w}x${h} @ ${sec(dur)} s. -->
<html lang="en" data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"MAIN TITLE"},
  {"id":"subtitle","type":"string","label":"Subtitle","default":"SUBTITLE HERE"},
  {"id":"accent","type":"color","label":"Accent colour","default":"#f6a623"}
]'>
<head>
<meta charset="UTF-8" />
<title>Title reveal</title>
<style>
  body { margin: 0; }
  #root {
    position: relative;
    width: ${w}px;
    height: ${h}px;
    overflow: hidden;${s.transparent ? '' : `\n    background: radial-gradient(120% 140% at 30% 20%, #161c26 0%, #0a0e14 70%);`}
    font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
  }
  .clip { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  #stack { display: flex; flex-direction: column; align-items: center; }
  /* The accent bar is a LIT surface: a same-hue sheen over the variable colour. */
  #bar {
    width: ${Math.round(w * 0.32)}px;
    height: ${Math.max(4, Math.round(h * 0.011))}px;
    background-color: var(--accent, #f6a623);
    background-image: linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%);
    border-radius: 2px;
  }
  #title-mask { overflow: hidden; padding: 0.08em 0.25em; }
  #title {
    margin: ${Math.round(h * 0.022)}px 0 0;
    color: #f4f5f7;
    font-size: ${Math.round(h * 0.12)}px;
    font-weight: 900;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  #subtitle {
    margin-top: ${Math.round(h * 0.016)}px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${Math.round(h * 0.028)}px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(244,245,247,0.75);
  }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0"
     data-width="${w}" data-height="${h}" data-duration="${sec(dur)}">
  <section id="title-card" class="clip" data-start="0" data-duration="${sec(dur)}" data-track-index="1">
    <div id="stack">
      <div id="bar"></div>
      <div id="title-mask"><h1 id="title" data-var-text="title">MAIN TITLE</h1></div>
      <div id="subtitle" data-var-text="subtitle">SUBTITLE HERE</div>
    </div>
  </section>
</div>
<script>
  // One paused timeline; positions are absolute composition seconds.
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // Entrance: the bar sweeps wide, the title rises out of its mask, the kicker trails.
  tl.from('#bar', { scaleX: 0, transformOrigin: 'left center', duration: 0.45, ease: 'expo.out' }, 0.05);
  tl.from('#title', { yPercent: 115, duration: 0.55, ease: 'power4.out' }, 0.25);
  tl.from('#subtitle', { y: ${Math.round(h * 0.02)}, autoAlpha: 0, duration: 0.4, ease: 'power3.out' }, 0.5);

  // Hold: a gentle 1.5% breath so the frame never freezes (finite repeat count).
  tl.to('#stack', { scale: 1.015, duration: 0.55, ease: 'sine.inOut', repeat: ${Math.max(1, holdCycles * 2 + 1)}, yoyo: true }, ${sec(holdStart)});

  // Exit: text first, the bar snaps away last.
  tl.to('#stack', { y: ${-Math.round(h * 0.06)}, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, ${sec(exit)});

  window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
}

/** A sports stinger: angled slabs slash across the frame, a condensed title snaps in,
 *  then a fast clear-out. */
function stingerHtml(s: VideoCompSettings): string {
  const { width: w, height: h } = s;
  const dur = s.durationInFrames / s.fps;
  const titleIn = Math.min(0.35, dur * 0.15);
  const exit = Math.max(titleIn + 0.5, dur - 0.55);
  return `<!doctype html>
<!-- Sports stinger (offline sample): three angled slabs slash across the frame, a heavy
     condensed title snaps in over them, then everything clears fast. ${w}x${h} @ ${sec(dur)} s. -->
<html lang="en" data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"GAME ON"},
  {"id":"accent","type":"color","label":"Accent colour","default":"#f6a623"}
]'>
<head>
<meta charset="UTF-8" />
<title>Sports stinger</title>
<style>
  body { margin: 0; }
  #root {
    position: relative;
    width: ${w}px;
    height: ${h}px;
    overflow: hidden;${s.transparent ? '' : `\n    background: linear-gradient(150deg, #0a0e14 0%, #16202f 55%, #0a0e14 100%);`}
    font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
  }
  .clip { position: absolute; inset: 0; }
  /* Slabs are LIT surfaces: same-hue shading + inset highlight, never flat fills. */
  .slab {
    position: absolute;
    top: 50%;
    left: 50%;
    width: ${Math.round(w * 0.92)}px;
    margin-left: ${-Math.round(w * 0.46)}px;
    transform: rotate(-9deg);
    background-image: linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.3) 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 ${Math.round(h * 0.02)}px ${Math.round(h * 0.06)}px rgba(0,0,0,0.35);
  }
  #slab-a { height: ${Math.round(h * 0.2)}px;  margin-top: ${-Math.round(h * 0.3)}px; background-color: var(--accent, #f6a623); }
  #slab-b { height: ${Math.round(h * 0.17)}px; margin-top: ${-Math.round(h * 0.08)}px; background-color: #1d2634; }
  #slab-c { height: ${Math.round(h * 0.14)}px; margin-top: ${Math.round(h * 0.12)}px;  background-color: #2c3a52; }
  #text-layer { display: flex; align-items: center; justify-content: center; }
  #title {
    margin: 0;
    color: #f4f5f7;
    font-size: ${Math.round(h * 0.15)}px;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 0.005em;
    text-transform: uppercase;
    text-shadow: 0 ${Math.round(h * 0.008)}px ${Math.round(h * 0.03)}px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0"
     data-width="${w}" data-height="${h}" data-duration="${sec(dur)}">
  <section id="slabs" class="clip" data-start="0" data-duration="${sec(dur)}" data-track-index="1">
    <div id="slab-a" class="slab"></div>
    <div id="slab-b" class="slab"></div>
    <div id="slab-c" class="slab"></div>
  </section>
  <section id="text-layer" class="clip" data-start="0" data-duration="${sec(dur)}" data-track-index="2">
    <h1 id="title" data-var-text="title">GAME ON</h1>
  </section>
</div>
<script>
  // One paused timeline; positions are absolute composition seconds.
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  const SWEEP = ${Math.round(w * 1.25)}; // off-screen travel in px

  // Slabs slash in from the left with a tight stagger.
  tl.from('#slab-a', { x: -SWEEP, duration: 0.5, ease: 'expo.out' }, 0.0);
  tl.from('#slab-b', { x: -SWEEP, duration: 0.5, ease: 'expo.out' }, 0.06);
  tl.from('#slab-c', { x: -SWEEP, duration: 0.5, ease: 'expo.out' }, 0.12);

  // The title snaps in over the settled slabs with a decisive overshoot.
  tl.from('#title', { scale: 1.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(1.6)' }, ${sec(titleIn)});

  // Clear-out: title first, slabs sweep on through right after.
  tl.to('#title', { x: ${-Math.round(w * 0.35)}, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, ${sec(exit)});
  tl.to('#slab-a', { x: SWEEP, duration: 0.38, ease: 'power2.in' }, ${sec(exit + 0.06)});
  tl.to('#slab-b', { x: SWEEP, duration: 0.38, ease: 'power2.in' }, ${sec(exit + 0.1)});
  tl.to('#slab-c', { x: SWEEP, duration: 0.38, ease: 'power2.in' }, ${sec(exit + 0.14)});

  window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
}

/** Keyword-match the brief onto a sample (the hyperframes arm of pickSample). */
export function pickHyperframesSample(prompt: string, settings: VideoCompSettings): HfSample {
  const p = prompt.toLowerCase();
  if (/sting|bumper|sport|match|team|derby|versus|\bvs\b|game\b|league/.test(p)) {
    return {
      html: stingerHtml(settings),
      summary:
        'A sports stinger - angled slabs slash across the frame, a condensed title snaps in over them, then a fast clear-out.',
    };
  }
  return {
    html: titleHtml(settings),
    summary:
      'A clean title reveal - an accent bar sweeps in, the title rises behind it, a kicker fades up, and everything exits sharply.',
  };
}
