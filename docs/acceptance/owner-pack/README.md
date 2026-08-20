# The owner acceptance pack

**Open `index.html` in a browser.** Everything else in this directory is a frame it shows.

Three separate handoffs are blocked on one person's eyes, and this repo's acceptance rule says
why nothing else will do: a phase is never "working" because the build is green, the tests pass
or internal state exists (`docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Verification contract"). Geometry
in a spec is not acceptance. So this is pictures of the real running app, in one place, each one
captioned with the exact question it is asking.

Built 2026-08-20 from `claude/e-owner-acceptance-pack`, on an OFFLINE checkout (no `.env`, no
Supabase) — which is the door a self-hosted student build runs on, and the reason two frames in
the pack are honest gaps rather than answers. See "What this pack cannot show" below.

## What it asks

| § | Subject | The question(s) | Recorded as owed in |
|---|---|---|---|
| 1 | `ig39` "Key Figures" | Does the catalog's first two-column stat list belong in the catalog as it stands? | `docs/CATALOG_VARIETY.md` §7 |
| 2 | The playout dashboard's scroll model | Are the capped monitors too small to judge a graphic by? Does the space beside PROGRAM read as SIZED or as UNFINISHED? | `docs/PLAYOUT_DASHBOARD.md` §2 |
| 3 | The interactive playout plane | One question per screen — contextual ⚡ controls, the Data workspace, vote-to-air, the presenter pointers, the audience join page | `docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Acceptance pass 2026-08-08"; `docs/GOALS.md` |

Section 2's two questions are quoted verbatim from the contract, not paraphrased. Nothing in the
pack answers them; nothing in it hints at an answer.

## The measurements under §2

Every dashboard frame carries the numbers read off the live document at capture time — the
monitor block's height and share of the window, the empty width to the right of the PROGRAM
frame, the editor's height and how much of it is hidden, how far the page scrolls, and which
panes have grown a scrollbar of their own. They are measured, never assumed, and they reproduce
the before/after table `docs/PLAYOUT_DASHBOARD.md` §2 records:

| | monitor block | editor hidden | page scrolls | empty beside PROGRAM |
|---|---|---|---|---|
| 1920×1080 | 323px (30%) | 0 | 0 | 516px |
| 1536×814 | 254px (31%) | 0 | 0 | 378px |
| 1536×560 | 188px (33%) | 0 | 165px | 612px |

No pane on any of the three has a scrollbar of its own. The page is the only scroller.

## What this pack cannot show, and why

Two frames in it are labelled as answering nothing. They are in the pack so the gap is visible
rather than remembered:

- **The hosted control page.** It needs Supabase env plus a published production. This checkout
  has neither, by design. It renders the same `.pd-monitors` / `.pd-main` / `.pd-editor` grid out
  of `src/styles.css`, so the cap and the scroll model are the same CSS — but shared CSS is an
  argument, and this pack does not trade a picture for one.
- **The public `/join` page, the presenter's own tablet page, and the Links panel's four
  capability URLs.** All three need a real publish. Offline `/join` says so in words; the
  presenter view is server work (`presenterBySlug`) that an offline build never reaches; and the
  production header carries "▶ Start production" where the Links button lives, because each URL
  appears only once a publish has minted its slug — so there is no panel to photograph.

What the pack DOES show of the audience plane is the real thing, not a drawing of it:
`src/audience/joinSurface.ts` is the ONE renderer that both the public page and the operator's
own preview mount, and the join frames here are that renderer.

The hosted walk — a real publish, a real phone in the room, the presenter's tablet — is a
separate owed item and needs `.env` plus a signed-in account.

## Rebuilding it

One browser job per machine: use the queued form, as with any sweep.

```bash
node scripts/e2e-runs.mjs --wait && node scripts/acceptance-pack.mjs
```

The dev server must be up on this checkout's port (`node scripts/dev-port.mjs`), and section 1's
full-frame pictures come from the catalog's own instrument, which has to have run first:

```bash
node scripts/l3-sweep.mjs ./l3-shots/infographic infographic
```

`node scripts/acceptance-pack.mjs docs/acceptance/owner-pack <section>` re-runs one section
(`catalog`, `scroll`, `controller`, `interactive`) and re-renders the page around every frame the
manifest already holds; `index` alone re-renders the page and opens no production at all.

## Keeping it true

Every frame pictures the tree it was built from, and the pack says which one at the top. A branch
that changes one of these surfaces makes the affected section stale — re-run that section rather
than reading a picture of a tree that no longer exists. As of 2026-08-20,
`claude/b-clock-export-recovery` is in flight over `src/components/home/ProductionPage.tsx` and
`src/control/productionControllerHtml.ts`, which are exactly what §2 and the controller frames
show; re-run `scroll` and `controller` after it lands.

## When it has been read

Record the verdict where each read is recorded as owed — the table above names the file for each
one — and say what was decided, not that a pack was looked at. A pack that has been read and
leaves no verdict behind costs the next session the same sitting all over again.
