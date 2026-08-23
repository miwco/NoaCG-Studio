# Yle demo — rehearsal script

**For: the owner, 2026-08-18 morning.** One sitting, ~20 minutes of demo, every step with a
fallback that needs no network. Written from a driven build on 2026-08-17; every claim below
was either measured in the app or is marked as unverified.

Read the **Pre-flight** section the night before. On the day, work only from **The arc**.

---

## 0. What is NOT in this build — do not promise it

Checked against the tree on `main` (`3d437e70`) the morning this was written:

| Thing | Status |
|---|---|
| **Stream chat intake** (Twitch / YouTube pulled into a graphic automatically) | **NOT BUILT.** No connector exists. The *chat-highlight graphic* is real and airs a message an operator approves — the message arrives from the audience join page or is typed, never from a chat platform. `docs/CATALOG_EXPANSION_PLAN.md` describes the connector as future work. |
| **Data API** (curl a score into a live graphic) | **NOT BUILT.** No route, no branch ahead of `main`. Do not include the "automate" beat as a live demo. If asked: the shape is designed (the control log already takes commands over one RPC), but nothing is shipped. |
| **NoaCG Pro / AI generation** | Built, but **off the demo path** on purpose (student release postpones AI). Do not open it under time pressure. |

If Yle asks about automation, the honest answer is: *"the control log the phone drives is an
ordinary append-only table with one RPC — an automation writes to the same door. It is not
built yet."*

---

## 1. Pre-flight (do this the night before, not in the room)

Tick every line. Anything unticked is a step to drop from the arc, not a thing to fix live.

- [ ] **Work at `https://noacg.studio`** — never `localhost`, never the `*.vercel.app` URL.
      The app builds the output / control / audience / presenter links from
      `window.location.origin`, so a production published from anywhere else hands out links
      that will not work on a phone or a playout box. (`noacg-studio.vercel.app` 308-redirects
      to `noacg.studio`, which is fine for browsing but not for publishing.)
- [ ] **Signed in** on the demo laptop, in the browser you will actually present from.
      Publishing needs an account; operating does not.
- [ ] **The demo production exists and is PUBLISHED** (section 2 builds it). Open its
      **Links** popover and confirm four rows: Output URL, SPX template (Download), Control
      page, Audience link (+ Readable name), Presenter link.
- [ ] **Claim the readable audience name** before the meeting, not during it — changing it
      kills the old link. Something you can say out loud: `yle-demo`.
- [ ] **Output URL already loaded** in whatever renders: CasparCG HTML producer, or an OBS
      Browser Source at 1920×1080 with transparency. Confirm the production page's header
      shows **● output connected** before you close the laptop lid.
- [ ] **Phone paired** = the Control page URL open on your phone, signed out is fine (holding
      the link IS the permission). Do a single Take from the phone and see it land, then leave
      the page open.
- [ ] **Second device for the audience** (a phone that is not the operator phone), Audience
      link open at `noacg.studio/join/yle-demo`.
- [ ] **Downloaded, on the desktop, in a folder you can find blind:**
      the production's **SPX template** file (Links → SPX template → Download), and one
      **CasparCG export** and one **OGraf export** zip (Export… on the production page, or a
      graphic's ⬇). These are the fallbacks for the whole cloud half of the demo.
- [ ] **Tabs open, in this order, left to right:** production page (Playout tab) · Audience
      tab of the same production · the `/output` renderer in its own window (so you can show
      it) · the join page · a file explorer on the exports folder.
- [ ] **Answer the analytics prompt** ("Help improve NoaCG", bottom right) on every browser you
      will demo from — laptop, operator phone, audience phone. It is fixed to the bottom-right
      corner at `z-index: 1200`, which is exactly where the production page's **Links** popover
      ends on a laptop-height screen, so while it is undecided it **covers ⟳ Publish changes and
      Unpublish**. Measured 2026-08-17; it is a layout defect, not something you did.
- [ ] **Wi-Fi checked from the phone**, on the network you will actually use in the room.

**The one failure that ends the demo:** no network. If the room's Wi-Fi is bad, skip straight
to the **export door** (§3, Beat 4) — a CasparCG single-file export and the exported controller
run entirely offline from `file://`.

---

## 2. Building the demo production (also the live 5-minute wizard walk)

The build is deliberately short enough to do **in front of Yle** as the "create" beat. Do it
once the night before so a published copy exists, and repeat it live from an empty production
if the room wants to see it.

### 2a. The newsroom kit (30 seconds)

1. `noacg.studio/app` → **Home** → **Productions**.
2. The dashed **Import a package** card → **Install** next to **Uutishuone**.
3. The production page opens with **six graphics** already pooled on their own playout layers
   and **ten cues** in the rundown:

   | Graphic | Type | Layer |
   |---|---|---|
   | Uutishuone ticker | ticker | 10 |
   | Uutishuone bug | bug | 20 |
   | Uutishuone name strap | lower-third | 30 |
   | Uutishuone headline | lower-third | 31 |
   | Uutishuone endboard | fullscreen | 85 |
   | Uutishuone opener | transition | 90 |

   Nothing was configured and no editor opened. **This is the strongest single moment in the
   demo** — say the number: six finished graphics, ten cues, zero clicks of setup.

4. Rename the production if you want it to read as a demo: the name is editable in the header.

### 2b. The three added graphics (≈4 minutes, one wizard walk each)

Every one of these goes through **`＋ New graphic for this production…`** at the bottom of the
production page. That door matters: **the wizard pre-applies the production's look**, so the
new graphic arrives in the kit's palette and type rather than its own catalog colours. Say
that out loud — it is the "one coherent look" claim, and it is structural, not hand-tuning.

| # | In Browse, type the search **exactly** | Pick | Why it is in the demo |
|---|---|---|---|
| 1 | `House Scorebug` | **House Scorebug** — 2nd card | The contextual ⚡ controls, measured: section **CLOCK** — ⚡ Start clock · ⚡ Stop clock · ⚡ Reset to period start; section **MATCH** — ⚡ Interval · ⚡ Resume play · ⚡ Full time. Plus a **± LIVE NUMBERS** row (one press moves the score on air and keeps the cue in step, no ✎ Update) and a **Snap to state…** recovery picker with ⟲ Back to start. |
| 2 | `House Vote` | **House Vote** — 11th card on the first page | The poll board the audience votes onto. ⚡ **VOTE**: Close voting · Show result · Call the winner. `Call the winner` stays greyed until the figures are on screen. |
| 3 | `House Comment` | **House Comment** — 1st card | The audience/chat card. A viewer's message reaches it only through operator approval — the audience backend interface has no method that reaches the command log. |

Search terms matter: plain `Scorebug` puts **Club** Scorebug first, not House. Type the full
name and take the card whose title matches it exactly.

Wizard walk for each (identical, ~40 seconds): the wizard opens on Entry → **Start from a
template** → **Browse** (search, click the card) → then either walk **Fields / Style /
Animation** or press **Skip to finish** → on **Finish**, the **PRODUCTION** block already reads
*Uutishuone*, so press the primary door **▶ Add to the production — go live**. It saves the
graphic to the library, pools it into the production and seeds its first cue. The editor never
opens.

On Finish, the **Look** line should read **`Captured · Outfit`** — that is the production's own
look travelling into the new graphic. If it reads `NoaCG Amber · Outfit` you are on a build
without this branch's fix, and the graphic will come out in catalog amber beside a violet kit.

Lower thirds need no work: the kit's **name strap** and **headline** are the lower thirds.

### 2c. Set the layers, then publish

On the production page, give the three new graphics layers that do not collide with the kit:

- House Scorebug → **40**
- House Vote → **50**
- House Comment → **60**

Layer order is the stack: several graphics are on air at once by design, which is why taking
a cue on one leaves the ticker and the bug exactly where they were.

Then **▶ Start production** (first time) or **⟳ Publish changes**. Publishing pins a snapshot:
editing a graphic afterwards changes the output only on the next publish, and the page says so
with a "changes not yet published" note.

Measured after this walk: nine graphics, thirteen cues, and all three added graphics emit
`--accent: #6C4CF1` — the kit's own violet, not their catalog default. That is the coherence
claim, and it is arithmetic rather than taste.

### 2d. Brand

Leave the kit's own neutral mark in place. It is a rounded-square placeholder with a channel
word, not anybody's identity. **Drop the real logo in yourself** on the Style panel of the bug
and the strap if you want it — do not do this live, it costs two minutes and buys one slide.

---

## 3. The arc — what you actually do in the room

Five beats. Each has a fallback that needs nothing from the network.

### Beat 1 — CREATE (3 min)

Do **2a** live: Home → Productions → Import a package → Install Uutishuone → the production
page with six graphics and ten cues.

Then, if there is time, do **one** wizard walk from **2b** (the scorebug is the best one —
it ends with visible ⚡ buttons).

> **Fallback:** the production you built last night is already there. Open it and talk over it.

### Beat 2 — CONTROL, from a phone (4 min)

1. On the laptop: production page, **Playout** tab. Point at the two monitors — **PREVIEW** is
   local to this page, and **selecting a cue in the rundown is what puts it there**, so there is
   no separate preview button to press; **PROGRAM — ON AIR** follows the shared log, which is
   why it shows a take somebody else made. The verb block beside PROGRAM reads
   **⟳ TAKE `SPACE`** across the top, then **⟳ Re-take `R` · ✎ Update `U`** and
   **» Next `N` · ■ Out `0`** two to a row, and TAKE becomes **■ TAKE OFF** once that cue is
   the live one. Top right: **▶ Start production** (publish), **⬇ Export…**, **■ All out**.
2. Take the **bug** cue, then the **ticker** cue. Both stay up — different layers.
3. Take the **opener** — it plays and clears itself.
4. Walk two **name straps** with ↑/↓ and **⟳ TAKE** (`SPACE`). Each replaces the previous on
   its layer; ticker and bug never move.
5. **Now pick up the phone.** Same production, control page. Take a cue from the phone and let
   the room watch the laptop's PGM monitor and the output window change. Nothing was installed
   on the phone and it is not signed in.
6. Select the scorebug cue and press **⚡ Start clock**, bump a score with the **± LIVE
   NUMBERS** `+` (one press moves the figure on air and keeps the cue in step — no ✎ Update),
   then **⚡ Full time**. Measured afterwards: the state chip reads
   `main: Enter · clock: Clock running · play: In play · result: Full time`, **Start clock** is
   greyed (it is running), **Resume play** is greyed (nothing to resume), and **Full time**
   greys itself. *A match does not un-finish.* That greying is the state machine's structure,
   not a rule someone wrote twice.
7. **✎ Update** on the ticker cue with a new headline — the bar re-reads in place, no
   re-animation, nothing else on air moves.

> **Fallback (cloud down):** open the exported `controlpanel.html` from the desktop beside the
> exported graphic's `index.html`. Same buttons, same greying, no network at all.

### Beat 3 — INTERACT, the room's own phones (5 min)

1. **Audience** tab → tick **Accepting messages**, mode **Questions**.
2. Read out `noacg.studio/join/yle-demo`. Let two or three people in the room send a question.
   (Have your own second phone ready in case nobody bites.)
3. In the inbox: open one, show the **immutable original one click behind the editable
   broadcast version**, **Anonymise** it, **Approve**, then **→ Send to rundown** — which
   creates an ordinary cue and stops. The note names where it went: it should read
   *"Added a cue to the rundown for **House Comment**"*. Take that cue: the chat-highlight
   card airs, with the handle in `f0`, the source in `f1` and the message in `f2`.
   **Say the structural claim:** the audience backend interface has no method that reaches the
   command log. Nothing a viewer writes can air without an operator taking it — that is
   enforced by construction, not by a rule someone remembered.
4. **Put a question to the room** → kind **Poll**, a question, three options → **Open voting**
   (every phone switches to the ballot within ~2 s). Watch the tally.
5. **Wait until the tally actually shows numbers**, then **Stage counts to a graphic** → the
   counts land on the House Vote board's `Label | count` field, matched **by title**. **Take**
   it. Then **⚡ Close voting** → **⚡ Show result** → **⚡ Call the winner**.
   Staging early stages zeros — the cue holds whatever the tally read at the moment you
   pressed it, and it re-stages happily, so press it again once the numbers move.

> **Fallback (nobody votes / no phones):** an UNPUBLISHED production runs the audience plane on
> its local rehearsal provider, which puts **⟳ Simulate 3 arrivals** beside the inbox and
> **⟳ Simulate votes** in the round controls. Both were driven on 2026-08-17: three questions
> arrive, one approves and sends to House Comment; a poll opens, four votes land 2/1/1, and
> **Stage counts to a graphic** writes them onto House Vote as
> `On the stream | 2 / On TV | 1 / Catching up later | 1`. Say plainly that it is a simulator.
>
> **Known rough edge, be ready for it:** the vote board carries a 20-second timer arrow, so it
> can close itself while you talk. Nothing on the operator surface says the timer is armed
> (`docs/CONTROL_PANEL_PARITY.md` §5.5). If the chip flips to `closed` on its own, that is why.

### Beat 4 — EXPORT ANYWHERE (4 min) — the beat that answers "are we locked in?"

1. **Links → SPX template → Download.** This is the production's own output URL wrapped in a
   legal SPX template file. **Say why it exists:** an SPX rundown lists template *files* out of
   `ASSETS/templates` — there is nowhere to paste a URL — so this is the door into the format
   this project treats as canonical. Drop it in, add it to a rundown: SPX's Play puts the frame
   up, Stop takes it down, and you cue the graphics from the phone.
2. **Export…** on the production page → show the target list: **SPX Graphics** (starter
   folder), **CasparCG** (one self-contained `.html`, everything inlined — plays from
   `file://` with no network), **OGraf (EBU)** (manifest + Web Component; operator events are
   declared as `customActions`), **HTML overlay** for OBS/vMix, **H2R**, **LiveOS**.
3. Open the CasparCG single file straight off the desktop in a browser tab to prove the "no
   network, no dependencies" claim.
4. The line to land: **SPX is the canonical internal format and the strictest validation
   target; every other target is an adapter off the same source.** Export is a gate — a
   template that fails validation cannot be exported.

> **Fallback:** this beat *is* the fallback. It needs nothing.

### Beat 5 — CLOSE (1 min)

Free forever for the core. The only paid surface is hosted AI without your own key. Code is
real and always available — every visual action writes readable, commented HTML/CSS/JS, and
the no-code user simply never opens it.

---

## 4. Interactive-plane visual acceptance (owed since Phase 1)

`docs/INTERACTIVE_PLAYOUT_PLAN.md` records that **no phase has reached Verified** — the
acceptance contract needs screenshots or a recording of the REAL running app at each stage,
with the route, production, cue and action sequence written down, plus your acceptance.

**Beats 2 and 3 of this script are that walk.** If you screen-record the demo (or take the
shots listed below), the recording doubles as the acceptance pack and six phases can move from
Implemented to Verified.

Capture, in this order — each one is a row the contract asks for:

1. The selected cue on the real ProductionPage (Playout tab, cue selected, fields visible).
2. **PVW before Take** and **PGM after Take** — two shots, same cue.
3. **✎ Update while on air** — the ticker before and after, showing no re-animation.
4. A **⚡ graphic action** and the state change it caused (scorebug: before/after Full time,
   with the button greyed in the second shot).
5. **» Next** on a multi-step graphic.
6. **Reload the production page** and show recovery — the graphic is still on air and the
   monitors rebuild.
7. **Cue switching** with no leaked values between two name straps.
8. The real **`/output`** renderer window.
9. The **exported controller** driving the **CasparCG** export, side by side.
10. The **join page** on a real phone, and the **Audience inbox** with the same message in it.

**What exists already.** Every beat above was driven on this build on 2026-08-17 and the
results measured (pool contents, emitted palettes, cue targets, tally values, the ⚡ button
lists and their sections). A capture script that repeats the whole walk headlessly and
photographs each stage was written and run — it lives in this session's scratchpad rather than
in `scripts/`, because a new browser-driving script has to be named into `SWEEP_SCRIPTS`
(`scripts/command-match.mjs`) to be visible to the run guard, and that file was off-limits to
the session that wrote it. Ask for it to be landed if you want the pack regenerated on demand.

None of that is acceptance. The pack becomes acceptance when **you** look at the surfaces and
say so.

---

## 5. Risk list, honest

| Risk | Likelihood | What to do |
|---|---|---|
| Room Wi-Fi will not carry a phone | medium | Beat 4 needs no network; beats 2-3 have offline fallbacks |
| Nobody in the room votes | medium | ⟳ Simulate votes, named as a simulator |
| The vote board closes itself on its 20 s timer while you talk | **high if you linger** | Expect it; the chip flips to `closed`. Known gap, not a bug you caused |
| A cue was edited after publish and the output runs the old snapshot | medium | The Links popover shows "changes not yet published" — press **⟳ Publish changes** |
| The output URL "moves" | **none** | Migration 0040 is applied to production (verified 2026-08-17): a production keeps its output, control, join and presenter slugs across unpublish/re-publish |
| The analytics banner covers Publish changes / Unpublish | **certain on a fresh browser** | Answer the prompt once, before the meeting (pre-flight) |
| Someone asks for live Twitch/YouTube chat | medium | It is not built. Say so, and show the audience join page instead — same shape, our own front door |
| Someone tries the wizard on their own laptop and wants to send feedback | low | Fixed in this branch — the door was missing from the wizard header since 2026-08-10 and only appeared on the Finish step. Unmerged until you land it |
| The added graphics come out amber beside the violet kit | **certain on `main`** | Fixed in this branch (`brandPatch` dropped a captured palette). Unmerged — either land it before the meeting or build the demo production from a pack whose look is the catalog's own |
| An approved audience question airs on the news TICKER instead of the chat card | **certain on `main`** | Fixed in this branch (send-to-rundown took the pool's first graphic — the backmost layer — instead of searching it). Unmerged |
| Someone asks to script it / call an API | medium | Not built. Describe the command log honestly |
