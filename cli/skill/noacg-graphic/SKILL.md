---
name: noacg-graphic
description: >-
  Make a broadcast graphic for NoaCG Studio and put it in the user's NoaCG library: any lower
  third, scoreboard, bug, card, ticker, countdown, full-screen or novel on-air graphic the user
  asks for. Use when the user says "for NoaCG", names NoaCG/SPX/CasparCG/OGraf playout, or wants a
  graphic they can operate live (editable fields, Take/Update/Out). Teaches the NoaCG CONTRACT
  (what the graphic must expose and satisfy), the `noacg` CLI/MCP tools (scaffold, validate,
  inspect, screenshot, save) and the loop - not how to design; design it the way you normally
  would.
---

# Make a NoaCG graphic

You are building a real broadcast graphic: HTML + CSS + JS that a playout system loads, an
operator drives from a control panel, and NoaCG saves, edits and plays out. Design it the way you
normally design - this skill tells you the CONTRACT the graphic must satisfy, the TOOLS that
check it, and how it reaches the user's library. It does not tell you how it should look.

## The loop

1. **Start a package.** Either author from scratch against the contract below, or take a
   scaffold when it saves work or brings behaviour you need:
   - `noacg types` lists the graphic TYPES NoaCG knows (fields, operator events, designs). A type
     brings its STATE MACHINE and runtime - the scoreboard's flag/result events, a countdown's
     pause/resume - so if the graphic needs operator ACTIONS beyond Take/Update/Next/Out, start
     from its type.
   - `noacg scaffold --type <id> --design neutral --out ./my-graphic` gives the type's fields,
     machine, controls and runtime on a plain spine (design it); `--design <id>` gives a proven
     catalog composition to restyle; `noacg scaffold --fields "Artist:text,Score:number,..."`
     gives a typeless graphic with exactly the fields you declare (the implicit lifecycle machine).
   A package is a folder: SOURCES you edit (`<slug>.html`, `css/template.css`, `js/template.js`,
   `images/`, `fonts/`) and GENERATED files you never edit (`<slug>.ograf.json`, `graphic.mjs`,
   `FIELDS.md`, `README.md`, `controlpanel.html`) - `noacg validate` regenerates them.
2. **Design and build.** Edit the sources with your ordinary tools. Keep the contract
   (`references/contract.md`): the SPX definition with its DataFields, one element `id="fN"` per
   field, the `play/stop/update/next` globals, ES5, GSAP only, relative references; the structure
   spine and `:root` variables that make it editable in NoaCG; the marked ANIMATION region's
   interpreter untouched (edit its DATA for different motion).
3. **Validate and look.** `noacg validate ./my-graphic --screenshots ./shots`. Fix every ERROR
   (the graphic will not export/save with one); read the WARNINGs as measurements
   (`references/validator.md` says what each rule measures and how authors usually resolve it);
   open `shots/onair.png` and `shots/stress.png` and judge the frame yourself - the stress frame
   doubles every text and widens every number, which is what a real operator will type. Repeat
   until clean and until you would air it.
4. **Inspect the operator surface.** `noacg inspect ./my-graphic` prints the control panel NoaCG
   derives from your graphic - one input per field, one button per action, the step semantics. If
   the operator cannot change what they will need to change, add the field; if an action is
   missing, it needs to be in the machine (a type's) or the graphic has no such action.
5. **Save.** `noacg save ./my-graphic --name "…"` puts it in the user's NoaCG library; it is there
   the next time NoaCG opens. (No account? `zip` the folder - it imports through the studio's
   Import door, and it is also a complete OGraf package any OGraf renderer plays.)

MCP clients use the same verbs as tools (`noacg_types`, `noacg_scaffold`, `noacg_validate`,
`noacg_inspect`, `noacg_screenshot`, `noacg_save`); screenshots come back as images.

## The one content rule

Content an operator - or another broadcaster reusing this graphic - may need to change is a
FIELD: names, scores, headlines, times, labels in a language ("BEGINS IN", "LIVE"). Decoration and
genuinely fixed semantic labels may stay static. Never bake event-specific or user-specific content
into the design. A repeated list (rows, credits, items) is ONE multi-line field the runtime
renders, never f7…f26.

## What is fixed and what is yours

Fixed because playout, editability or compatibility needs it (the validator checks every line of
this): the definition and field ids, the lifecycle globals, ES5 in `template.js` (CasparCG's
embedded Chromium), no network and no storage at runtime, relative paths, the structure spine, the
`:root` variables, the ANIMATION markers and interpreter, the 1920x1080 (or declared) frame,
transparency (you are composited over video), readable type (the validator reports a size floor),
the title-safe area. Everything else - composition, typography, colour, shape, rhythm, motion
character - is yours. If another design skill is active, it owns the look; NoaCG's rules bind only
where correctness, editability, compatibility or playout require. Page/responsive/mobile guidance
does not apply to a fixed broadcast frame.

## References (read the one you need)

- `references/contract.md` - the SPX/NoaCG runtime + editability contract, with a worked example.
- `references/package.md` - the package anatomy (sources, generated half, `v_noacg`, OGraf).
- `references/validator.md` - every finding the validator can raise: what it measures, how
  authors resolve it.
- `references/control.md` - how NoaCG derives the operator surface; the two markup conventions
  the control layer reads; the OGraf contract (`schema`, `customActions`, `stepCount`).
- `references/design-notes.md` - OPTIONAL, off by default: NoaCG's own design notes. Read only
  when the user asks for "the NoaCG look" or house guidance.
