# Making an SVG that imports well

Draw your graphic in Illustrator, Figma or Inkscape. Export an SVG. Drop it into NoaCG. Your text
layers turn into fields the operator types into. Nothing is redrawn. What you drew is what goes on
air.

This page is for the person holding the design app. The engineering contract is
`docs/SVG_IMPORT_PLAN.md`.

**Where to drop it:** `/app` -> **New graphic** -> **Import graphic** -> the drop zone.

**Try it first.** Twenty-three files in [`svg-samples/`](svg-samples/README.md) are ready to drop -
one for almost every kind of graphic the catalog has, and each one teaches a single thing about
importing. The README there says which, file by file, and they open in Illustrator so you can keep
working on them.

Start with `lower-third.svg`: three text layers, all named, nothing else going on. Then
`scorebug.svg`, which shows every field the import can propose - numbers, a countdown clock, a
picture layer, the `f:` prefix and two labels placed apart on one baseline - and `quiz-board.svg`,
where each moment of the graphic is drawn as its own hidden layer.

---

## 1. Five rules

1. **Give the file a size.** It needs a `viewBox`, or a `width` and a `height`. A file with
   neither is refused. That size is the space every field is measured in. Illustrator writes one
   under *File > Export > Export As > SVG*. Turning "Responsive" on drops the width and height,
   which is fine as long as the viewBox is there.
2. **Keep text as text.** Every `<text>` layer becomes a field. Text turned into outlines cannot
   be edited. Section 5 says what happens then.
3. **Name your layers.** Layer names become the labels the operator reads. "Home team" beats
   "Rectangle_3". Nothing else is asked of you.
4. **Embed your pictures.** A linked image points at the internet, so it is stripped on the way
   in. An exported graphic has to play with no network. Export with images embedded.
5. **Do not animate in the design app.** SVG animation (SMIL) is removed, and the import says so.
   Add the motion in NoaCG's Animation step. The timeline and the playout server drive it there.

## 2. Sizing the artboard

- **1920x1080, transparent background.** The safe choice. Artwork the size of the frame lands
  exactly where you drew it.
- **A smaller artboard** (a 1040x190 lower third, say) comes in as a floating object. The wizard's
  zone picker places it. Handy when the same bug goes in different corners.
- **Millimetres, points or inches are fine.** Inkscape defaults to millimetres, and so does most
  print software. The file is read at its real size, not at the bare number in it. A
  338.67 x 190.5 mm page is a 1280 x 720 graphic.

Your artwork sets the size of the graphic. NoaCG never rescales your geometry behind your back.

## 3. What each layer becomes

| In your file | In NoaCG |
|---|---|
| `<text>` with plain content | one text field, bound in place |
| one text object you pressed Return inside | **one** field. NoaCG re-wraps it into the room you drew |
| two separate `<text>` objects | two fields, however they line up. Separate objects is you saying so |
| two labels apart on one baseline | two fields. The gap between them is what says so |
| a line broken into runs by kerning or tracking | **one** field. The runs are one line, not three |
| text on a path | one field, and it keeps its curve when the operator types |
| text inside a symbol | drawn, but **not** editable. Every copy shows the same words |
| a plain number as the sample (`84`, `2`) | offers a **number** field |
| a clock as the sample (`12:00`, `1:05:00`) | the row asks: plain text, or a **countdown** whose field is its length in minutes. One countdown per graphic |
| `2 - 1`, `10 pts` | stays text. An SPX number box only holds digits |
| an embedded picture - placed on its own, or filling a shape you drew (which is what Figma exports) | a **picture field**. The operator swaps it, and clearing it brings your drawing back |
| a group of two or more glyph shapes | offered as **outlined text** (section 5), off by default |
| everything else: panels, rules, gradients, masks, filters | rides along exactly as drawn |

**One thing to say is one field.** A question, a headline, a paragraph of standfirst - one text
object, however many lines it takes in your design app. The operator gets one box holding the whole
of it, and NoaCG decides where the words break on air, at the size and the width your artwork gives
them (section 4). Where you pressed Return is where the words fell at the size *you* were looking
at, and it is not what the next value will need.

So **do not draw a paragraph as one text layer per line.** Three layers called "Body line 1", "Body
line 2" and "Body line 3" are three fields, because three separate objects is you telling NoaCG
they are three separate things - and the operator then has to break their own sentence across them
by hand. It is one of the few ways to make the import do the wrong thing on purpose.

If you really do want two lines that never re-flow into each other - a name over a role, a heading
over a strap - draw them as separate objects. That is the same rule read the other way.

**Name layers for the operator, not for you.** The name is what they read on air. Two layers both
called "Name" arrive as "Name" and "Name 2". You can read that. It tells the operator nothing.

The label comes from the nearest named thing: the layer itself, else the closest named group
around it. Illustrator's escaping is decoded, so `Home_x20_team` arrives as "Home team". Inkscape
layer labels are read too. A name the editor generated (`text123`, `layer1`) counts as no name, so
the named layer above it wins.

**Two kinds of layer are never offered as fields.** Both still ride into the graphic as drawn:

- **A layer you switched off.** Hidden copy is a draft. A field for text nobody can see is worse
  than no field.
- **Text inside a symbol or `<defs>`.** It only paints where a `<use>` copies it, so binding the
  original is a promise the import cannot keep. Put editable text on the artboard.

**Shortcut:** start a layer name with `f:` or `field:` (`f:Competition`) to mark it editable. The
prefix is dropped from the label. Useful if your organisation wants one convention. It is never
required, and it switches nothing else off: every text layer is offered ticked either way. On a
**picture** layer it does more, because a picture arrives unticked. Inside a design a picture is
usually part of the artwork.

## 4. Fonts, and text that is too long

### Fonts

An SVG names its fonts (`font-family="Gotham"`). If the playout machine does not have that family,
your graphic will not look like your design.

So the import lists every family it finds. For each one it matches a bundled face, offers the
Google Fonts library, or takes a font file you upload for a licensed face. A Google family is
fetched while you design and **embedded**, so the exported code never touches the network.

A family nothing matches gives a warning and carries on, because you may know the playout machine
has it. The Finish step names it again. That is the last screen before the graphic is made.

**PostScript names are understood.** Illustrator writes the face, not the family:
`Archivo-Bold`, `JetBrainsMono-Regular`, `HelveticaNeue-CondensedBold`. The suffix gives the
weight, the rest gives the family, and spelling does not matter, so `JetBrainsMono` finds JetBrains
Mono. The font still ships declared under the exact name your artwork asks for.

A family Google does not carry says so on its row and points you at the upload. It will not offer
a download that could only fail.

**Pick a family you can hand over as a file, or one of the bundled or Google faces.**

### When the operator types more than you drew for

SVG text does not wrap and does not clip. So the code has a ladder, and it climbs it in this
order:

1. **Fill the shape** the line was drawn in.
2. **Grow the panel**, if you asked for that.
3. **Wrap** onto another line.
4. **Shrink**, down to 55% of your type size.
5. **Squeeze** the letters narrower, and tell the operator the text is too long.

Nothing is cut, and the artwork is never reshaped to make words fit. Step 5 is deliberately ugly
and it goes away the moment a shorter value arrives.

**What that means when you draw.** A line's room is the **panel behind it**, out to a right margin
the same size as the left one you drew. So a short name in a wide banner can grow to most of that
banner at full size.

**Every gap you drew is kept.** Wrapping never eats the space between a line and what you drew
under it, and never runs onto the panel's bottom edge. It only uses room the panel gains by
getting taller. So a name with a role right under it wraps only if you let the panel grow. A
question alone on a board wraps into the space you left below it. Leave vertical room where you
want wrapping, and none where you do not.

**Or let the panel grow.** On the mapping step, "when the text is too long" has four answers: the
panel gets wider; the panel gets wider, then the text wraps; the text wraps onto more lines; the
text gets smaller. You also pick which rectangle grows, and the widest one is proposed. It widens
at your full type size, anything you drew past its right edge travels with it, and it stops inside
the frame's safe margin.

**A panel grows away from the frame edge you composed it against.** A lower third near the bottom
gets taller upwards, so the edge you lined up stays put and the lines under the wrapped one never
move. A band across the top grows downwards, for the same reason. Anything you drew onto the
panel's own edges, an accent rail down its side, grows with it.

That is what a lower third wants. A board or a scoreboard wants the default, because its layout
*is* the design.

**A panel can be a picture as well.** If the shape you want to grow is the one you dropped a
photograph into - a full-bleed guest card, a photo strap - you get both: a picture field the
operator can swap, and that same shape in the list of shapes that grow. You never have to pick
one. On the artwork, clicking it ticks the picture and dragging it sets the direction it grows.
**The picture stretches with the panel**, because that is what your design app wrote: the
photograph fills the shape's box, so a wider box means a wider photograph rather than more of it.
A texture, a gradient wash or a blurred backdrop takes that without anyone noticing; a face does
not. If the panel behind a face has to grow, draw the face as its own shape beside it.

**Draw the panel as a rectangle if you want it to grow.** Rounded corners are fine. So is the
`<path>` Illustrator writes a rounded rectangle as. Any shape whose geometry reads as a rectangle
counts, and it grows by its straight middle, so your corner radii stay exactly as drawn. A truly
freeform shape has no width to change. A narrow decoration at the panel's far end, an end cap or a
closing bar, is read as the panel's own furniture: text stays off it, and it travels with the edge
when the panel grows.

## 5. If the text was converted to outlines

Outlined text has no text node to bind. So the import offers each glyph group as an **outline
row**: a group of two or more path or polygon shapes. Up to 24 rows are listed, named layers first.

Tick one and that drawing is hidden. It is never deleted. A real editable line is placed over its
measured box, matching the original's position, cap height and fill.

This is the fallback, not the good road. The stand-in is re-rendered type, so the kerning is the
font's and not yours. **Re-export with live text where you can.**

Rows that read as a line of type, several glyphs on one baseline in a wide box, are listed first.
The rest are marked "looks like artwork" so you can skip the crests and icons. Nothing is hidden
from you: a two-letter logotype really can be the text you want editable.

## 5b. Drawing a graphic that DOES something (quizzes)

A graphic can carry behaviour the operator drives live. Today that is a **quiz**: pick an answer,
lock it in, reveal the right one. You draw what each moment looks like. NoaCG decides when each one
is on. Copy [`svg-samples/quiz-board.svg`](svg-samples/quiz-board.svg).

**Draw the base look first.** The panel, the question, one text layer per answer. That alone is
enough. Bind it in the Fields step, pick "Quiz", say which layer is the question and which are the
answers, and the board already selects, locks and reveals. It just shows nothing extra while it
does it.

**Then draw the moments, one layer each.** For any answer row you can add:

| Layer | When it shows |
|---|---|
| the row **picked** | while that answer is the pick |
| the row **right** | on the reveal, if it is the correct answer |
| the row **wrong** | on the reveal, if it is not |
| **locked in** (one, for the whole board) | once the answer is locked |

**Hide those layers in your design app.** Click the eye off. That is how you keep seeing your own
artwork while you draw, and it is what the import expects. A hidden layer is offered to the
behaviour pickers *because* it is hidden. Hidden text is still skipped as a field.

**Put the words last.** SVG has no z-index. Whatever comes later in the file paints on top. Draw a
highlight after the answer text and it covers the word it was meant to highlight. Keep the panels
and the drawn states below, and the answer text at the top of the stack.

**Naming is a shortcut, not a rule.** Each of these is a picker in the Fields step, so a file whose
layers are called "Group 7" still works. But name them `Answer A`, `A selected`, `A correct`,
`A wrong` and `Locked in`, and the binding arrives filled in. You change nothing.

## 6. Export settings, app by app

### Adobe Illustrator

*File > Export > Export As... > SVG*. Not "Save As", which writes a much heavier file.

| Setting | Value | Why |
|---|---|---|
| Styling | Internal CSS *or* Presentation Attributes | both are read |
| Font | **SVG** | "Convert to outlines" is what section 5 exists to survive |
| Images | **Embed** | linked images are stripped |
| Object IDs | **Layer Names** | this is what makes the labels readable |
| Decimal | 2-3 | smaller file, no visible difference |
| Minify | off | keeps the file readable in Advanced mode |

Name your layers before you export. Illustrator renames duplicates and keeps your spelling in
`data-name`, which the import reads first. Duplicate names are safe.

### Figma

Name the layers, select the frame, then *Export > SVG* with:

- **Include "id" attribute** ON. Without it every layer arrives unnamed.
- **Outline text** OFF. With it on you are on the outlines road.
- Flatten or rasterise nothing you want to stay editable.

### Inkscape

*File > Save As... > Plain SVG*. Optimized SVG also works, with **Embed raster images** on and
ID-shortening off.

Label your layers and objects. Inkscape keeps the label apart from the id, and the import reads it.
Do not run *Path > Object to Path* on text you want editable.

**Do not use flowed text**, meaning a text box you dragged out with the text tool. It exports as
`<flowRoot>`, a draft SVG element no browser ever implemented, so it is invisible in every
browser-based renderer. That includes NoaCG's preview and every export target. The import says so
when it sees one. Select it and use *Text > Convert to Text* before exporting.

## 7. Check this before you drop the file

- [ ] The artboard is the size you want. 1920x1080 for a full-frame graphic.
- [ ] The background is transparent, unless the graphic really is full-screen.
- [ ] Every editable headline is live text, not outlines.
- [ ] Layers are named the way an operator would say them, "Home team" and not "Group 12", and no
      two editable layers share a name.
- [ ] Pictures are embedded. Nothing links out to the internet.
- [ ] No SVG animation.
- [ ] The fonts are ones you can hand over, or bundled or Google families.

## 8. What the import always removes

Your file goes into previews, into exports, and into other people's libraries if you share it. So
on drop it loses `<script>`, `on*` handlers, `<foreignObject>`, SMIL animation and every
`http(s)://` reference.

Each removal is reported on screen. The import tells you what it did rather than quietly changing
your file.
