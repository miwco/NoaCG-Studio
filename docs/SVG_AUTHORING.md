# Making an SVG that imports well

How to draw and export an SVG so NoaCG Studio can turn it into a playable graphic - and what the
import does with every part of the file. The engineering contract is `docs/SVG_IMPORT_PLAN.md`;
this page is for whoever is holding the design app.

**The promise:** design it in Illustrator, Figma or Inkscape; drop the file into the Import door;
your text layers become operator fields; the pixel-exact graphic goes on air. Nothing is redrawn -
the typography that ships is the one you drew.

**Try it in 30 seconds:** the four files in `docs/svg-samples/` are ready to drop.

| File | What it exercises |
|---|---|
| `lower-third.svg` | the plain happy path - three live text layers, named |
| `scorebug.svg` | number fields, a countdown clock, a picture layer, `f:` prefix, stacked tspan lines |
| `outlined-title.svg` | text converted to outlines (the fallback road) beside one live text layer |
| `illustrator-export.svg` | the exporter's own habits - PostScript font names, a kerned headline, two labels on one baseline, a repeated layer name, a switched-off draft |

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
| two labels placed apart on one baseline | two fields - the gap between them is what says so |
| a line broken into runs by kerning or tracking | **one** field - the runs are one line, not three |
| text set on a path | one field, and it keeps its curve when the operator types |
| text inside a reusable symbol | drawn, but **not** editable - every copy shows the same words |
| a plain figure as the sample (`84`, `2`) | proposes a **number** field |
| a clock-shaped sample (`12:00`, `1:05:00`) | the row asks: ordinary text, or a **countdown** whose operator field is its length in minutes. One countdown per graphic |
| `2 – 1`, `10 pts` | stays a text field - an SPX number input cannot hold the furniture |
| `<image>` with an embedded picture | a **picture field**; the operator swaps it, and clearing the field restores the drawing you shipped |
| a group of two or more glyph shapes | offered as **outlined text** (§5), off by default |
| everything else (panels, rules, gradients, masks, filters) | rides along verbatim as the look |

**Labels** are what an operator will read, so name your layers for them, not for you: two layers
called "Name" arrive as "Name" and "Name 2", which is legible but says nothing. Labels come from
the nearest named thing: the layer's own name, otherwise the closest named group around it. Illustrator's escaping is decoded, so a layer named `Home team` arrives as
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
one shared convention - never required, and it does not switch the other layers off: every text
layer is offered ticked either way. On a PICTURE layer the prefix does more, because a picture
is offered unticked by default - inside a design it is usually part of the artwork.

## 4. Fonts - the one thing that can differ on air

An SVG names its fonts (`font-family="Gotham"`); if the playout machine lacks the family, the
"exact" graphic silently isn't. So the import inventories every family it finds and, per family,
either matches a bundled face, offers the Google Fonts library (fetched at design time and
**embedded** - the exported code never reaches the network), or takes a font file you upload for
a licensed face. An unresolved family **warns and continues** - you may know the renderer has it -
and the Finish step repeats the warning by name, since that is the last screen before the graphic
is made.

**PostScript names are understood.** Illustrator writes the face, not the family
(`font-family="Archivo-Bold"`, `"JetBrainsMono-Regular"`, `"HelveticaNeue-CondensedBold"`), and
the import reads them: the style suffix names the weight, the rest names the family, and the
match ignores spelling, so `JetBrainsMono` finds JetBrains Mono. The `@font-face` that ships is
still declared under the exact name your artwork asks for.

A family Google does not carry - a licensed foundry face - says so on its row and points at the
upload instead, rather than offering a download that could only fail.

Two consequences worth designing around:

- Prefer a family you can supply as a file, or one of the bundled/Google faces.
- SVG text does not wrap or clip. When an operator types a longer value than the design was set
  for, the generated code shrinks that one line until it fits the width you drew - a smaller
  line of your own type, never a squeezed one - and only then. A value that fits leaves your
  typography untouched.
- **Or let the panel grow instead.** On the mapping step, "when the text is too long" can be
  answered with **grow** rather than shrink, and you pick which rectangle grows (the widest one
  is proposed). It widens to the right at the type's full size, anything you drew past its right
  edge travels with it, and it stops inside the frame's safe margin - past that the line shrinks
  as usual. This is what a lower third wants; a board or a scoreboard wants the default, because
  its layout IS the design. Draw the panel as a **rectangle** if you want it to grow: a freeform
  shape has no width to change.

## 5. If the text was converted to outlines

Outlined text has no text node to bind, so the import offers each glyph group as an **outline
row** (a group of two or more path/polygon shapes; up to 24 rows are listed, named layers first).
Ticking one hides that drawing - it stays in the file, it is never deleted - and places a real
editable line over its measured box, matching the original's position, cap height and fill.

That is the fallback, not the good road: the stand-in is re-rendered type, so the kerning is the
font's and not the designer's. **Re-export with live text where you can.**

Rows whose shapes read as a line of type - several glyphs standing on one baseline in a wide box -
are listed first; the rest are marked "looks like artwork" so you can skip past the crests and
icons. Nothing is hidden: a two-letter logotype really can be the text you want editable.

## 5b. Drawing a graphic that DOES something (quizzes)

A graphic can carry behaviour the operator drives live - today, a **quiz**: select an answer,
lock it in, reveal the right one. You draw what each moment looks like; NoaCG decides when each
one is on. The sample to copy is [`svg-samples/quiz-board.svg`](svg-samples/quiz-board.svg).

**Draw the base look first** - the panel, the question, one text layer per answer. That alone is
enough: bind it in the Fields step, pick "Quiz", say which layer is the question and which are the
answers, and the board already selects, locks and reveals. It just shows nothing extra while it
does.

**Then draw the moments, one layer each.** For any answer row you can add:

| Layer | When it shows |
|---|---|
| the row **picked** | while that answer is the contestant's pick |
| the row **right** | on the reveal, if it is the correct answer |
| the row **wrong** | on the reveal, if it is not |
| **locked in** (one, for the whole board) | once the answer is locked |

**Hide those layers in your design app.** Click the eye off - that is how you keep seeing your own
artwork while you draw, and the import expects it. A hidden layer is offered to the behaviour
pickers precisely *because* it is hidden; hidden TEXT is still skipped as a field.

**Put the words last.** SVG has no z-index: whatever is later in the file paints on top. Draw a
highlight after the answer text and it covers the word it is meant to highlight. Keep the panels
and every drawn state below, and the answer text at the top of the stack.

**Naming is a shortcut, not a rule.** Every one of these is a picker in the Fields step, so you can
bind a file whose layers are called "Group 7". But name them `Answer A`, `A selected`, `A correct`,
`A wrong`, `Locked in` and the whole binding arrives filled in and you change nothing.

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
- [ ] Layers are named the way an operator would say them ("Home team", not "Group 12"), and no
      two editable layers share a name.
- [ ] Pictures are embedded; nothing links out to the internet.
- [ ] No SVG-native animation.
- [ ] The fonts are ones you can supply, or bundled/Google families.

## 8. What the import removes, always

Imported SVG is untrusted input entering previews, exports and (later) shared templates, so on
drop the file loses `<script>`, `on*` event handlers, `<foreignObject>`, SMIL animation elements,
and any `http(s)://` reference. Each removal is reported on screen - the import says what it did
rather than quietly altering your file.
