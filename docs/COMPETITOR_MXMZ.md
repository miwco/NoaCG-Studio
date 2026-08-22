# MXMZ - the competitor we are measured against

**Written 2026-08-22**, from public sources only: `mxmz.com` (home, products, Cloud Editor,
Operator), the Grass Valley Alliance partner page, and an SVG Europe interview with business
manager Milo Boer. `mxmzmedia.com` 301s to `mxmz.com` - one company, not a separate services arm.

**Read the caveat first.** This is marketing copy and one interview, not a product trial. Where
this file says a capability is ABSENT it means *no public material mentions it* - which is weak
evidence about a shipped feature and strong evidence about a SOLD one, because a platform does not
hide the thing it competes on. Anything here that would change an architecture decision should be
re-checked in a demo before it does.

Named by Yle as the working model (2026-08-20), which is why they matter more than the older three
in `docs/GOALS.md` "Who we are replacing".

---

## 1. What they are

Cloud-native broadcast graphics: *"Design, playout, and control all from your browser. HTML5 & SVG
real-time motion graphics for modern broadcast workflows."* Three products - **Cloud Editor**,
**Operator**, **Integrations** (graphics inside Premiere; Media Composer planned).

Their origin explains the shape. Banijay's sports arm **Southfields** was quoted up to **25% of a
production budget** for graphics and built a lightweight HTML5/SVG alternative instead. Ziggo Sports
took it to **22 live channels** in 2022; it spun out as a company and now sells across Europe and
North America. Euro Hockey League is a reference customer. Grass Valley embeds it in **AMPP**.

**Price floor: under $3,000/year** for smaller users, with day, month and annual licences.

## 2. Their workflow, end to end

1. **Design in Illustrator, Figma, Canva or any SVG-capable app.** No proprietary design tool.
2. **Import the SVG directly, every layer exposed** for animation. Fonts upload once to S3 and the
   whole team has them.
3. **Animate in the browser** - *"a full animation timeline with keyframe control"*, *"Every layer,
   every property, every transition is fully editable on a frame-accurate timeline"*, stacking
   multiple animations with *"precise in/out points"* and tuned easing curves.
4. **Bind data** - *"Layers, masks, and data bindings update in real-time via JSON"*; Opta,
   Gracenote, Sportradar and custom APIs.
5. **Expose variables** so producers change copy, colours and element positions without design
   skill. Master templates are LOCKED, local variations allowed.
6. **Publish to one URL per channel**, per Grass Valley. Operator drives it: rundowns with
   drag-and-drop, pre-loaded templates, **auto-advance timers**, MOS/CII for newsroom, touchscreen
   panels with large targets, unlimited channels each with its own library and data connections.
7. **Version control** logs every adjustment with rollback to any previous iteration.

## 3. The finding that matters: they do not solve the logic problem, they route around it

Nothing public - not the Cloud Editor page, not Operator, not Grass Valley's write-up - mentions
**states, conditions, guards, triggers, or authored logic of any kind**. Their whole behaviour
vocabulary is: layers, multiple timelines, in/out points, variables, live data, and an operator
pressing something. That is a strictly weaker model than the one NoaCG already runs
(`docs/STATE_MACHINE_SCHEMA.md`).

They get away with it three ways, and each is a real product answer worth taking seriously:

- **They train the designer.** Boer: *"we teach them for one day, and then they can start
  animating. And there are millions of people out there who understand Illustrator."* Their promise
  is not zero-training authoring - it is a ONE-DAY learning curve on a familiar timeline.
- **The NON-TECHNICAL person is the OPERATOR, not the author.** *"keep design familiar, keep
  operation non-technical, and make deployment fast."* Producers get variables and locked
  templates; they do not author behaviour, and they are not expected to.
- **Bespoke vertical panels absorb the rest.** Grass Valley: *"dedicated interfaces for specific
  Sports and News"*; MXMZ's own feature list carries **Match Control** with *"one-click graphic
  triggers"*. At Euro Hockey League they wired **referees' Stream Decks** to fire venue graphics,
  on-air scoring and synchronised audio. That behaviour lives in a panel somebody at MXMZ built for
  that sport - not in something a customer authored.

**This is the gap we can open.** A hand-built per-sport panel cannot serve a student inventing a
quiz format on a Tuesday. A LIBRARY OF NAMED BEHAVIOURS a person attaches to their own artwork is
precisely the thing their architecture has no place to put.

## 4. Where they are ahead of us today

Honest list, because these are what a Yle designer would notice inside five minutes:

- **The timeline is their trained primary surface.** Frame-accurate keyframes on every layer and
  every property. Ours exists and is real, but it sits in Advanced mode and nobody is taught it.
- **Version control with rollback** and change notes. We have undo and saved documents, not this.
- **Locked master templates with local variations.** Our equivalent is the org boilerplate story,
  still open in `docs/SVG_IMPORT_PLAN.md` P2.
- **Team font libraries** uploaded once. Ours are per-project.
- **MOS/CII newsroom integration** and **auto-advance timers** on the rundown.
- **Multi-channel** as a first-class concept: unlimited channels, each with its own library,
  playlists and data connections.

## 5. Where we are ahead, and it is not small

- **A real state machine** with structural guards, parallel groups, timers, snap and a serial event
  queue - inside the template, so it behaves identically in the editor, in an export and under SPX.
- **Control panels GENERATED from the machine** (`docs/CONTROL_LAYER.md`), not hand-built per
  vertical. Every event a button, legality mirrored as greying.
- **An audience plane** - join page, vote-to-air, presenter view. Nothing public suggests MXMZ has
  an audience-facing surface at all.
- **Export anywhere, and the files are yours** - SPX, CasparCG, OGraf, LiveOS, OBS, vMix. MXMZ is
  cloud-first with a Docker escape hatch; the graphic is not a folder you keep.
- **Free forever, self-hostable, open.** Their floor is ~$3k/year.
- **A catalog.** They import your design; they do not hand you 500 of them.

## 6. What their architecture VALIDATES

Choices we already made that the market leader made too - worth knowing we are not out on a limb:

- SVG imported **verbatim with every layer exposed**, no renaming ritual.
- **Pure SVG + HTML, scriptable**, no proprietary runtime inside the emitted graphic.
- **One persistent URL per channel** as the playout contract.
- **Cloud-first with a local fallback** (their Docker / laptop-with-USB-to-SDI; our export door).
- Resolution independence as an SVG consequence rather than a feature to build.

## 7. What to take, and what not to

**Take:**
- *"Teach them for one day."* A trained-designer path is legitimate. Not every road has to be
  zero-training, and pretending otherwise is how an authoring surface ends up never shipping.
- **Variables + locked master template** as the org story - already scheduled, now with a reason.
- **Auto-advance timers** on the rundown; cheap, and our machine already has timer transitions.
- Team-level font libraries.

**Do not take:**
- **Per-vertical hand-built control panels.** It is their services-shaped answer to logic, it does
  not scale past the sports somebody paid for, and copying it would abandon the generated control
  layer that is our actual advantage.

---

**Where this feeds the roadmap:** `docs/GOALS.md` "NOW", item 2 - attaching behaviour to a graphic
somebody else drew. This file is the competitive half of that question; the engineering half is
`docs/SVG_IMPORT_PLAN.md`.

## Sources

- <https://mxmz.com/> - home
- <https://www.mxmz.com/products> - product list
- <https://www.mxmz.com/products/cloud-editor> - editor, timeline, data binding
- <https://www.mxmz.com/products/operator> - rundowns, match control, multi-channel
- <https://www.grassvalley.com/grass-valley-alliance/mxmz/> - AMPP partner page, one URL per channel
- <https://www.svgeurope.org/blog/headlines/mxmz-puts-svg-and-html5-at-the-heart-of-broadcast-graphics/>
  - SVG Europe interview with Milo Boer (origin, philosophy, training, pricing)
