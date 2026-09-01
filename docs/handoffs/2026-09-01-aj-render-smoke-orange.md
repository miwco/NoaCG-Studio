# 2026-09-01 — the orange dot arrives, and the check can now say so

Branch `claude/aj-render-smoke-orange`.

**Verdict: the user-supplied image DOES travel from the manifest through asset delivery into
the rendered frame.** Verified by sampling real pixels out of a real render, and by looking at
the frame. The check that was supposed to prove this could not have; it can now.

## Cost: $0.00. The authorised paid run was not needed and was not spent.

Worked out before anything ran, from the repo's own notes rather than a guess:

- `scripts/render-smoke.mjs` targets `http://localhost:${devPort()}` — the local Vite dev
  server, whose `/api/render/*` routes are served in-process by `scripts/renderDevPlugin.mjs`.
- `api/_lib/executor.ts` `getExecutor()` returns `SandboxExecutor` **only** when
  `RENDER_EXECUTOR=sandbox`. Unset (as here) it returns `LocalExecutor`, which spawns
  `render-worker/job.mjs` as a child process on this laptop.
- No Vercel Sandbox, no Vercel Blob, no Supabase (with no `VITE_SUPABASE_URL` the job ledger is
  in process memory), and no model calls anywhere on the path.
- `docs/RENDER.md` "Running it" says the same in its own words: *Local / self-host (no cloud at
  all) … Verify with `node scripts/render-smoke.mjs`.*

Real cost is local CPU for a few short renders plus a one-time Chrome Headless Shell download.
Because it is free, it was run more than once — deliberately, to re-verify after each change.
**The owner's authorisation to spend money is untouched and still available.**

## Step 1 — the fixture on `main` is genuinely repaired

Decoded the embedded base64 before spending anything:

```
75 bytes, base64 round-trips exactly, signature OK
IHDR len=13 crc=fdd49a73 OK   IDAT len=18 crc=5fa36898 OK   IEND len=0 crc=ae426082 OK
bytes consumed: 75 of 75 (exact)
IHDR: 2x2 depth=8 colorType=2 interlace=0
IDAT inflates to 14 bytes: 00 f6a623 f6a623 00 f6a623 f6a623   (exactly what 2x2 RGB needs)
pixels: #f6a623 #f6a623 / #f6a623 #f6a623
```

Every chunk CRC matches, nothing runs past IEND, nothing trails it. The repair on
`claude/f-gates-fail-closed` was real.

## Step 2 — a separate defect: the smoke was RED before it reached the image leg

The first run never got to the dot:

```
SMOKE FAIL: terminal state failed: {"code":"render_failed","message":"Error: noacg host:
unrenderable timing — This graphic's animations need 2.1 s (in 1.4 s, out 0.8 s) — the total
duration is only 2 s."}
```

Phase 1 built its manifest with a hardcoded `totalDurationMs: 2000` while lt01's measured in+out
had grown to 2.1 s, so the renderer refused the job outright and the script exited at its first
of four. Everything below it — including the image leg this session was about — had not been
running at all. The total is now DERIVED from the manifest's own `estimatedDurations` plus a
1 s hold margin, so it follows the design instead of rotting behind it.

## Step 3 — the evidence

`png-still` of the remotion fixture, decoded in Node and read pixel by pixel:

```
image-input PASS: 2304/2304 pixels of #bd8120 in a 48x48 block at (616,417)
```

- 2304 = exactly 48x48, the size the fixture draws the image at.
- The block is centred on x=640 in a 1280x720 frame — where the fixture puts it.
- Sampled centre pixel: **rgb(188, 129, 32)** = `#bc8120` = the fixture's `#f6a623` composited
  at opacity 0.75 (the still renders the middle frame, where the fade is 3/4 through) over the
  fixture's `#101318` backdrop. That is the dot, and it is orange.
- Frame histogram: `#101318` 894023 · `#f4f4f5` 14926 · bar accent 7624 · **`#bc8120` 2304**.

The rendered frame is archived **outside the repo** at
`C:\claude\render-smoke-evidence-2026-09-01\` (`orange-dot-still.png`, 27 kB, plus the run log).
Nothing generated was committed.

## Step 4 — the check can now fail

Two halves, deliberately split by what they cost:

**Free, in `npm run build` — `scripts/render-fixture.test.mjs`.** Decodes the fixture's bytes
strictly: every chunk CRC, nothing past IEND, IDAT inflating to exactly the size the header
implies, all four pixels `#f6a623`. It also proves the reader rejects a single flipped byte and
a truncation — the two faults nothing in the render chain complained about. Needs no dev server,
no render-worker, no render.

**Paid-free but local, in `render-smoke.mjs` — the new phase 3.** Renders a `png-still` (the
cheapest render the service does: one frame) and requires ~2304 pixels of the dot's expected
composited colour, formed into a block of about 48x48 rather than scattered. A still, not the
MP4, so it decodes with `zlib` alone — no ffmpeg, no video decoder, nothing the script did not
already need.

**Proved non-vacuous.** Re-rendered the same fixture with the image input naming an asset the
manifest does not carry — the exact silent failure:

```
job state: complete (the render SUCCEEDED with no image - the silent failure)
pixels matching the dot's rendered colour #bc8120: 0
VERDICT: the smoke's new assertion would FAIL here - the dropped image is caught.
```

The job still reports `complete`. Only the pixel check notices. That is the whole point.

## What changed

| File | Why |
|---|---|
| `scripts/render-fixture-dot.mjs` | new — the dot's bytes, colour, drawn size, fade and backdrop in ONE place, so the composition and the assertion cannot drift apart |
| `scripts/png-decode.mjs` | new — a strict, dependency-free PNG reader that refuses what the platform's lenient readers accept, plus `findPixelsNear` (count + bounding box, opaque pixels only) |
| `scripts/render-fixture.test.mjs` | new — the free half, wired into `npm run build` |
| `scripts/render-smoke.mjs` | derived html duration; phase 3, the pixel assertion; an `output?.url` guard |
| `scripts/make-remotion-manifest.mjs` | reads the fixture module instead of holding its own copy; the bar's accent is now `#3ba0ff`, not the dot's orange |
| `docs/RENDER.md` | the Testing section says what each leg actually proves, and that the smoke costs nothing but CPU |

The accent change matters for correctness, not taste: the bar used to be the same `#f6a623`, so
an anti-aliased bar edge at ~0.75 coverage over the same backdrop composites to the dot's exact
colour — a single such pixel would have stretched the matched region across the frame and failed
the check while blaming the image. A different hue also earns the bar its keep, by proving
`fields.accent` overrode the composition's own default.

## Verified

- `npm run build` green on this branch (`[write-version] … -> claude/aj-render-smoke-orange`).
- `node scripts/render-smoke.mjs` green end to end, with the pixel evidence above.
- `node --test scripts/render-fixture.test.mjs` 4/4.
- Negative control: image dropped -> job completes -> 0 matching pixels -> the assertion fails.
- `/check` code-review leg at level **high**; all five findings addressed in the code above.

## Two things for whoever is next

**1. `preview_start` starts the dev server in the MAIN checkout for a worktree-isolated
session.** Asked for `{name: "dev"}` from this worktree and got a Vite bound by
`C:\claude\NoaCG-Studio\node_modules\.bin\vite` — the main checkout, on a port that was not this
worktree's reserved 5292, and without this worktree's `.env`. That is the shape of failure
AGENTS.md warns about twice: a green gate on the wrong tree, and a feature session touching the
checkout that holds `main`. Worked around here by launching Vite from this worktree directly and
stopping it afterwards; the guard hook's advice ("use preview_start") is currently wrong for a
worktree-isolated agent, and that is worth a proper fix rather than everyone routing around it.

**2. `render-smoke-video.mjs` reads its frame through `createImageBitmap` in the page.** Fine
for a frame the renderer just produced, and left alone. Noted in `png-decode.mjs` so the two
readers do not look like unexplained duplication; if that script ever judges a FIXTURE, it
should use the strict reader instead.

## Left behind in this worktree

`.env` (gitignored) with `VITE_RENDER_API=1` and an `IP_HASH_SALT`, and an installed
`render-worker/node_modules` — both needed to re-run the smoke here. `render-worker/package-lock.json`
picked up an incidental `engines` line from `npm install`; reverted, not committed.
