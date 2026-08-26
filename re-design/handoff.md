# NoaCG Studio — UI Redesign Handoff

This prose is the binding half of the redesign, referenced by name from source comments and e2e
specs. The mockup PNGs it was written beside were planning artefacts and are no longer in the
repository; the option ids (1a…5c) survive as the section numbering below.

## 1. Design language

**Goal:** kill the "AI vibe" — no gradients, no sparkle icons, no rounded pill cards, no emoji. Flat panels, hairline borders, tight density, one accent used sparingly.

### Fonts
- UI: **IBM Plex Sans** (400/500/600/700)
- Labels, data, timecode, badges: **IBM Plex Mono**, uppercase, letter-spacing 1.5–2px, 9–11px
- Never mix a third font.

### Color tokens
| Token | Hex | Use |
|---|---|---|
| bg-deepest | `#0b0d10` | preview stages, page background |
| bg-app | `#0d0f13` / `#101216` | app frame, topbars, sidebars |
| bg-panel | `#12141a` / `#14171d` | cards, rows, inputs' parents |
| bg-input | `#0e1014` | all inputs |
| hairline | `#1c2027` / `#22262e` | row separators, quiet borders |
| border | `#262b34` | default control borders |
| border-strong | `#33394a` | secondary buttons, hoverable controls |
| text | `#e8eaee` | primary text |
| text-mid | `#c6ccd6` | secondary button labels |
| text-dim | `#8b93a1` | descriptions |
| text-faint | `#5a6272` / `#6b7382` | hints, mono microlabels |
| **accent (amber)** | `#f0a02e` | primary action, active/selected state, PREVIEW |
| accent-bg | `#2a2213`, border `#4a3a1a`, tint `#3a3325` | selected chips/cards, editing-preview panel |
| **live (red)** | `#e5484d` | ON AIR only + destructive (bg `#1e1113`, border `#5a2224`) |
| ok (green) | `#46a758` | done steps, SHOW/LIVE/Synced badges (bg `#1c2b1e`, border `#2c4530`) |
| volt (sample) | `#d7f545` | only inside sample graphics, never UI |

**Color law (playout):** amber = preview, red = on air. Nothing else may be red except All out / Delete. Take is the single solid-red button.

### Geometry
- Radius: 3–4px controls, 5–6px cards/panels. Phone frame 24px.
- Base spacing: 8px grid. Card padding 14–18px; row padding 8–12px; panel gaps 10–14px.
- Borders always 1px (2px only on PVW/PGM monitors).
- Buttons: primary = solid amber, dark text (#14161a), weight 600. Secondary = transparent, `#33394a` border, `#c6ccd6` text. Danger = red text on `#1e1113`. Disabled = `#5a6272` text on panel.
- Close ✕ is ALWAYS a 32px bordered square at the far right of the header row — never inline after text.
- Checkboxes/radios: 15–16px, 3px radius, aligned with `display:flex; gap` — never baseline-misaligned.

## 2. Creation wizard (template flow) — screens 2a–2f

Structure (winner of the 1a/1b/1c exploration = **1a rail + split**):
- **Left rail 216px:** 6 steps (Start, Browse, Fields, Style, Animation, Finish). Done = green ✓ chip, current = amber chip + `#1a1d24` row, upcoming = dim. Rail footer holds PROJECT FORMAT (16:9 · 1080p · 25 fps + "Change ▾") from the Browse step onward.
- **Center form column 440–600px**, footer with ← Back / "Skip to finish" / amber Next →.
- **Right: live preview**, always visible, 16:9 stage on `#0b0d10` with 5% dashed safe-area, transport under it (REPLAY / OUT / ZOOM, mono labels).

Per step:
- **2a Start:** headline + Home row (Graphics / Productions shortcuts) + 4 radio-cards (Template / Create with AI / Import / Kit) + quiet "Video or animation with AI · BETA" footnote row.
- **2b Browse:** search; ONE type dropdown ("Lower thirds · 82") + 2–3 style chips + "Filters ▸" (everything else collapsed); 2×2 template cards, "Show 12 more". Never render the full 22-category wall.
- **2c Fields:** grid `20px | 130px label | 1fr value | 26px delete`, mono column headers LABEL / ON-AIR VALUE; f0/f1 ids in amber mono.
- **2d Style:** palette preset grid (8, incl. Custom); collapsible **Element colors** (open by default): every element gets swatch + editable HEX input (mono, uppercase) + picker button + reset-to-palette; collapsed Font and Size & position rows showing current value in amber mono. No horizontal scrolling — detail hides behind arrows.
- **2e Animation:** segmented In and out / In only / Out only; 5 preset cards (Slide, Line reveal, Mask wipe, Fade, Flip 3D) + travel arrows ↑↓←→; Speed segmented; Easing select; "Reveal in steps" as a bordered checkbox card.
- **2f Finish:** name input; "What you built" summary rows each with Edit link; Production select; two radio-cards "Add to the production — go live" (default) vs "Export it"; primary button **Create graphic**.

Footer rule: "Colors & font from [None — fresh look ▾]" — a project dropdown, not a checkbox.

## 3. Create with AI — screens 3a–3b

3 steps only: Start → Create → Finish, same rail. Format in rail footer with note "Fixed before the first generation — AI cannot override it."
- **3a at rest:** brief textarea with example chips (News lower third, University speaker, …); Attach / Talk it through / Generate row inside the brief box; below it 5 collapsed sections — Graphic category, Data fields, Look & references, Fonts, Animation — **all defaulting to "Let AI decide"** (amber mono value on the right). AI settings is a small button + one-line summary. Next is disabled until a result exists.
- **3b open:** brief pinned on top with Regenerate; sections open inline (arrow rotates ▸→▾); AI settings is a **popover** (Provider, Model, Key + Store, Lite/Pro segmented), not a page. Result column shows the generated graphic + version thumbnails + REPLAY / REFINE; primary becomes "Use this result →".

## 4. Playout dashboard — screens 4a (desktop), 4b (phone)

- **Topbar:** production name, green SHOW badge, show timer, status "output connected · N layers", Rehearse, Export, **All out quarantined top-right** (red, away from transport).
- **Monitors:** PVW (2px amber border) and PGM (2px red border) side by side, dot + mono label above each.
- **Transport:** → Preview (amber outline, key P) · **⟳ TAKE** (solid red, biggest, key SPACE) · ✎ Update (U) · » Next (N) · ■ Out (O). Keyboard keys shown as kbd chips.
- **Editor edits the PREVIEW cue by default** — amber-tinted panel headed "EDITING PREVIEW CUE · changes air on Take"; switching to the on-air cue is an explicit control. Graphic-specific macro buttons (⚡ Reveal title…) live inside this panel.
- **Rundown right rail 380px:** dense rows = drag dots, number, name + note, layer chip (L1/L2/L3), state badge (ON AIR red / PVW amber). Layers appear only as a compact 3-chip strip at the bottom (top paints over bottom) — no duplicate list.
- **Activity:** single collapsed line, expandable.
- **4b phone (390pt):** topbar (name, SHOW, All out) → two mini monitors → rundown list (rows ≥44px, tap = preview) → editing card for the PVW cue → sticky bottom transport: big red TAKE + Next + Out (≥48px). Scope: fire cues + light text edits.

## 5. Home — screens 5a (productions), 5b (graphics grid), 5c (graphics list)

- **Sidebar 190px** with counts (Productions 2, Graphics 25, Videos 3, Brand looks 4). Topbar always has: + New graphic, ⚙ settings, ● Synced, avatar.
- **5a Productions:** 3-col card grid. Live card = green border tint + LIVE badge + "on air 00:42:17"; stats line; 4-thumb strip of its graphics; actions Open dashboard (amber if live) / 🔗 Output URL / ↓ export; ⋯ on every card; dashed "New production" card. Below: "Recent graphics" shelf (6 thumbs) + "All 25 graphics →".
- **5b Graphics grid:** search, type filter chips with counts (All / Lower thirds / Bugs / Infographics / Countdowns / Tickers / Info cards), Sort, **▦/☰ view toggle** (per-page, remembered). FOLDERS row (folder cards with ⋯ + "+ New folder"), then ALL GRAPHICS 4-col grid.
- **Selection model (no checkboxes):** click selects, shift-click selects a range, click empty space clears. Selected card = amber border + amber ✓ pip top-left. Floating bottom action bar: `N selected | + Production · ▰ Add to folder · ↓ Export · Delete (red) · Clear ✕`. Cards keep Open + ⋯ (rename, duplicate, move, delete).
- **5c list view:** identical chrome; folders collapse to chips; table `100px preview | name | type | edited | folder | actions`, mono column headers, selected rows get amber left edge + row tint + ✓ pip. Same floating action bar. The toggle swaps ONLY the item container.

## 6. Dialog anatomy (global) — screen 6a

**Why it matters:** a close button drifting after the title text (as in the current Settings and Export dialogs) breaks the user's spatial memory — the eye finds ✕ by corner, not by reading. Misaligned checkboxes read as broken software and erode trust in a tool people run live on air. These are the two most-cited "wonky" spots; the fixes below are mechanical and must apply to EVERY dialog.

**Header rule (one flex row):**
```html
<header style="display:flex; align-items:center; gap:12px;">
  <h2>Title</h2>
  <span class="subtitle">optional one-liner</span>
  <div style="flex:1"></div>            <!-- spacer -->
  <button class="close">✕</button>      <!-- 32px square, 1px border, ALWAYS last -->
</header>
```
Never absolutely-position the ✕, never let it wrap, never place it inline in the copy. Subtitle truncates before the ✕ ever moves.

**Form rows:** two-column grid `110px label | 1fr control`; input+button pairs nest a grid `1fr | fixed-button` in the control cell so buttons never wrap under inputs. Hint text indents to the control column (padding-left = label width + gap).

**Checkbox/toggle rows:** wrap in `<label style="display:flex; align-items:flex-start; gap:10px">` — box first (16px, margin-top 1px to cap-align), then title + description stacked. The whole label is clickable. Never separate a checkbox from its text in different containers (the current "Advanced mode" bug).

**Settings modal (6a):** 820×620 over a dimmed backdrop (#0b0d10 at 70%); left section nav 170px (Account / AI / Workflow / Brand & style), Sign out pinned at nav bottom; content scrolls per-section with mono microcap headings and 1px `#1c2027` dividers — no more single wall of scroll.

**Export production dialog:** same header rule; keep the radio-card list (selected = amber border like 2f); footer = Close (secondary, left) + Validate & download (primary amber, right) in one row, buttons never stacked.
