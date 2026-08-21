# Making an SVG that imports well

How to draw and export an SVG so NoaCG Studio can turn it into a playable graphic - and what the
import does with every part of the file. The engineering contract is `docs/SVG_IMPORT_PLAN.md`;
this page is for whoever is holding the design app.

**The promise:** design it in Illustrator, Figma or Inkscape; drop the file into the Import door;
your text layers become operator fields; the pixel-exact graphic goes on air. Nothing is redrawn -
the typography that ships is the one you drew.

**Try it in 30 seconds:** the three files in `docs/svg-samples/` are ready to drop.

| File | What it exercises |
|---|---|
| `lower-third.svg` | the plain happy path - three live text layers, named |
| `scorebug.svg` | number fields, a countdown clock, a picture layer, `f:` prefix, stacked tspan lines |
| `outlined-title.svg` | text converted to outlines (the fallback road) beside one live text layer |

Drop one at `/app` → **New graphic** → **Import graphic** → the drop zone.

---

## 1. The five rules that decide whether it works

1. **Give the file a size.** A `viewBox` (or `width`+`height`) is required - it is the design
   space every field position is measured against. A file with neither is refused. Illustrator's
   *File > Export > Export As > SVG* writes one; "Responsive" ON removes width/height, which is
   fine as long as the viewBox is there.
2. **Keep text as text.** Every `<text>` element becomes a bindable operator field. Text
   converted to outlines cannot be edited in place - see §5 for what happens instead.
3. **Name your layers.** Layer names arrive as field labels, so "Home team" reads better than
   "Rectangle_3". No naming convention is required beyond that.
4. **Embed your pictures.** A linked image is a network reference and is stripped on import - an
   exported graphic must play out with no internet. Export with images embedded.
5. **Do not animate in the design app.** SVG-native (SMIL) animation is removed with a note.
   Motion is added in NoaCG's Animation step, where the timeline and the playout server can drive
   it deterministically.

## 2. Sizing the artboard

- **1920×1080 with a transparent background** is the predictable choice: frame-sized artwork
  covers the canvas exactly as you drew it, so what you see in Illustrator is where it lands.
- **A smaller artboard** (a 1040×190 lower third, say) imports as a free-floating object and is
  placed by the wizard's zone picker - handy when the same bug should sit in different corners.

Either way the artwork's own size drives the graphic; NoaCG never rescales your geometry behind
your back.

## 3. What each layer becomes

| In your file | In NoaCG |
|---|---|
| `<text>` with plain content | one operator text field, bound in place |
| `<text>` with several positioned `<tspan>` lines | **one field per line** - each is separately editable |
| a plain figure as the sample (`84`, `2`) | proposes a **number** field |
| a clock-shaped sample (`12:00`, `1:05:00`) | the row asks: ordinary text, or a **countdown** whose operator field is its length in minutes. One countdown per graphic |
| `2 – 1`, `10 pts` | stays a text field - an SPX number input cannot hold the furniture |
| `<image>` with an embedded picture | a **picture field**; the operator swaps it, and clearing the field restores the drawing you shipped |
| a group of two or more glyph shapes | offered as **outlined text** (§5), off by default |
| everything else (panels, rules, gradients, masks, filters) | rides along verbatim as the look |

**Labels** come from the nearest named thing: the layer's own name, otherwise the closest named
group around it. Illustrator's escaping is decoded, so a layer named `Home team` arrives as
"Home team" and not as `Home_x20_team`; Inkscape's layer labels are read as well, and an
editor-generated serial id (`text123`, `layer1`) counts as unnamed so the named layer above it
wins.

**Two kinds of layer are deliberately NOT offered**, though both ride into the graphic exactly as
you drew them:

- **A layer you switched off.** Hidden copy is a draft, and an operator field for text nobody can
  see is worse than no field.
- **Text inside a symbol or `<defs>`.** It paints only where a `<use>` copies it, so binding the
  original is a promise the import cannot keep. Put the text you want editable on the artboard.

**Optional sugar:** prefix a layer name with `f:` or `field:` (`f:Competition`) to mark it
editable by name; the prefix is stripped from the label. Useful for an organisation that wants
one shared convention - never required.

## 4. Fonts - the one thing that can differ on air

An SVG names its fonts (`font-family="Gotham"`); if the playout machine lacks the family, the
"exact" graphic silently isn't. So the import inventories every family it finds and, per family,
either matches a bundled face, offers the Google Fonts library (fetched at design time and
**embedded** - the exported code never reaches the network), or takes a font file you upload for
a licensed face. An unresolved family **warns and continues** - you may know the renderer has it.

Two consequences worth designing around:

- Prefer a family you can supply as a file, or one of the bundled/Google faces.
- SVG text does not wrap or clip. When an operator types a longer value than the design was set
  for, the generated code condenses that one line to the width you drew (`textLength`), and only
  then. A value that fits leaves your typography untouched.

## 5. If the text was converted to outlines

Outlined text has no text node to bind, so the import offers each glyph group as an **outline
row** (a group of two or more path/polygon shapes; up to 24 rows are listed, named layers first).
Ticking one hides that drawing - it stays in the file, it is never deleted - and places a real
editable line over its measured box, matching the original's position, cap height and fill.

That is the fallback, not the good road: the stand-in is re-rendered type, so the kerning is the
font's and not the designer's. **Re-export with live text where you can.**

## 6. Export settings, app by app

### Adobe Illustrator
*File > Export > Export As… > SVG* (not "Save As", which writes a much heavier file).

| Setting | Value | Why |
|---|---|---|
| Styling | Internal CSS *or* Presentation Attributes | both are read |
| Font | **SVG** | "Convert to outlines" is what §5 exists to survive |
| Images | **Embed** | linked images are stripped |
| Object IDs | **Layer Names** | this is what makes labels readable |
| Decimal | 2-3 | smaller file, no visible difference |
| Minify | off | keeps the file human-readable in Advanced mode |

Name your layers before exporting. Illustrator uniquifies duplicate names and keeps the original
spelling in `data-name`, which the import reads first - duplicates are safe.

### Figma
Name the layers, select the frame, then *Export > SVG* with:

- **Include "id" attribute** ON - without it every layer arrives unnamed.
- **Outline text** OFF - it is the outlines road otherwise.
- Flatten/rasterise nothing you want to remain editable.

### Inkscape
*File > Save As… > Plain SVG* (or Optimized SVG with **Embed raster images** on and ID-shortening
off). Label your layers and objects - Inkscape keeps the label separately from the id, and the
import reads it. Do not run *Path > Object to Path* on the text you want to be editable.

**Do not use flowed text** (a text box dragged out with the text tool). It exports as `<flowRoot>`,
an SVG draft element no browser ever implemented, so it is invisible in every browser-based
renderer - including NoaCG's preview and every export target. The import says so when it sees one.
Select it and use *Text > Convert to Text* before exporting.

## 7. A checklist before you drop the file

- [ ] The artboard is the size you want (1920×1080 for a frame-exact graphic).
- [ ] The background is transparent unless the graphic really is full-screen.
- [ ] Every editable headline is live text, not outlines.
- [ ] Layers are named the way an operator would say them ("Home team", not "Group 12").
- [ ] Pictures are embedded; nothing links out to the internet.
- [ ] No SVG-native animation.
- [ ] The fonts are ones you can supply, or bundled/Google families.

## 8. What the import removes, always

Imported SVG is untrusted input entering previews, exports and (later) shared templates, so on
drop the file loses `<script>`, `on*` event handlers, `<foreignObject>`, SMIL animation elements,
and any `http(s)://` reference. Each removal is reported on screen - the import says what it did
rather than quietly altering your file.
