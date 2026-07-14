# Video & image rendering

How NoaCG Studio turns a graphic into finished media (MP4 / WebM / PNG still /
PNG sequence ZIP / ProRes 4444 MOV). The user flow: open a graphic → Export tab →
**Video & image** → pick format + total duration → Render → real progress → Download.

## Two document kinds, one service

The manifest (version 2) is a discriminated union on `kind`:

- **`kind: 'html'`** — the classic path: an SPX/HTML graphic rendered as a self-contained
  document driven by the virtual clock (everything below).
- **`kind: 'remotion'`** — an authored composition from the AI video editor: ONE module
  compiled in-browser (sucrase → CJS, imports limited to react/remotion), its input props
  (assets as data URLs), and a fixed `durationInFrames`. The worker's second composition
  `noacg-user` evaluates it under a require shim that supplies the worker's own React and
  Remotion — the exact same shim contract as the live preview's player host, so the
  preview and the render run identical code. No timing model, no schedule, no
  measurement. Composition errors fail the job with the real message (cancelRender). The
  UI side is `src/render/buildVideoManifest.ts` + `VideoRenderPanel`.

Tiers, quotas, format rules, executors, and the job store are kind-agnostic and identical
for both.

## Architecture (NoaCG stays the source of truth)

No graphic is ever recreated as a Remotion composition and no GSAP animation is
rewritten. One generic, deterministic path serves every graphic:

```
SpxTemplate + Data panel values                       (the editor, source of truth)
  → composeRenderDocument()      src/render — a fully self-contained HTML document:
                                 virtual-clock runtime + GSAP + CSS (fonts inlined as
                                 data URLs) + template JS; live polling blocks stripped
  → RenderManifest               src/render/manifest.ts — the versioned job contract:
                                 kind:'html' — document + w/h/fps/scale + timing + data
                                 + format (kind:'remotion' carries compiledJs +
                                 inputProps + durationInFrames instead)
  → NoaCGGraphic composition     render-worker/remotion — ONE composition hosting the
                                 document in a srcdoc iframe, seeking its virtual clock
                                 to frame/fps under Remotion's delayRender protocol
                                 (kind:'remotion' selects UserComposition instead)
  → executor                     api/_lib/executor.ts — LocalExecutor (dev/self-host:
                                 child process) | SandboxExecutor (hosted: Vercel Sandbox
                                 via @remotion/vercel, output to Vercel Blob)
  → download                     token-gated local file route, or the Blob URL
```

### Determinism: the virtual clock

**manifest + frame number = exact pixels.** The render document virtualizes `Date`,
`performance.now`, `setTimeout`/`setInterval`, and `requestAnimationFrame`, detaches
GSAP's rAF ticker, and drives `gsap.updateRoot(t)` in frame quanta while executing the
graphic's REAL cue lifecycle (`update → play → next× → stop`) as virtual timers
(src/render/runtimeScript.ts). Because the real code runs — only against our clock —
countdowns, `tl.call` clocks, count-up `onUpdate` callbacks, and `repeat:-1` marquees
all render exactly as they play live, reproducibly. Verified: two renders of the same
manifest are byte-identical, and a 3:00 countdown reads 2:59 at t=2 s and 2:53 at t=8 s
in the finished MP4.

Determinism is promised **per environment** (same machine / same sandbox image); OS
font rasterizers may differ sub-pixel across platforms. Wall-clock graphics (the corner
bug's live clock) read the manifest's `epochMs`, so they render a fixed, reproducible
time — by design.

### Total duration and HOLD (src/render/schedule.ts)

The user picks the TOTAL duration; animations keep their real durations, measured
in-page at final resolution (`__noacgRender.prepare()` builds each phase once, reads
`duration()`, kills it, resets — so layout-sized phases like credit rolls and ticker
marquees are correct by construction). The remainder becomes HOLD, split **equally**
across the slots after IN and after each played step — never after OUT, which ends the
render exactly on the total. Endless loops (`repeat:-1`) count as continuous with fixed
cost 0. A total shorter than the fixed animation time is a hard error carrying the
measured numbers, raised in the UI preflight AND by the renderer.

### Formats (official Remotion codec settings)

| Format | Codec | Alpha | Notes |
|---|---|---|---|
| MP4 | h264, yuv420p | no | flattened onto a chosen background color |
| WebM | vp8 (vp9 opt-in) + yuva420p | yes | alpha plays in Chrome/Firefox, not Safari |
| PNG still | renderStill | yes | defaults to the settled on-air moment |
| PNG sequence | renderFrames → `frame-00000.png` zip | yes | zero-padded, STORE zip |
| ProRes 4444 MOV | prores '4444' + yuva444p10le | yes | the NLE path |

All video renders capture PNG frames (broadcast gradients band under JPEG capture).
Output size = template resolution × the scale option — the document itself is never
resized (layout math depends on the authored resolution).

## Service (api/render/*)

`start` validates the manifest against the caller's tier, enforces quotas
(duplicate-submit first — it answers the already-running job id — then concurrency,
then hourly/daily windows), stores sha256 hashes of two per-job secrets (the browser's
status/cancel token; the worker's completion secret), and launches the executor.
Sandbox launches run under `waitUntil` AFTER the 202 — no request waits on VM
provisioning. `status` reconciles executor progress into the job, finalizes completion,
and fails lost jobs past their deadline. `cancel` stops the executor. `complete` is the
worker-secret callback. `cleanup` (cron, CRON_SECRET) sweeps expired outputs and stale
jobs.

Job ledger: `render_jobs` in Supabase (migration 0007) when a Supabase secret key is set —
`SUPABASE_SECRET_KEY` (the new `sb_secret_…` key, preferred) or the legacy service_role JWT
in `SUPABASE_SERVICE_ROLE_KEY` (fallback). The key is only ever handed to `createClient` as
an opaque API key with RLS-bypassing access, so either format works. Otherwise the ledger
lives in process memory (dev/self-host).

### Tiers & limits (src/render/limits.ts — every number lives there)

| | anonymous | free (signed in) | paid (defined, not yet reachable) |
|---|---|---|---|
| formats | mp4, webm, png-still | + png-sequence, prores4444 | all |
| max output / fps | 1920×1080 / 30 | 1920×1080 / 60 | 4096×2304 / 60 |
| max duration | 15 s | 60 s (prores/seq 30 s) | 300 s |
| concurrent / hour / day | 1 / 2 / 6 | 2 / 10 / 40 | 4 / 30 / 150 |

Client checks are UX; the server re-validates everything. Introducing a paid tier =
changing `resolveTier()` to read an entitlements source; nothing else moves.

## Security posture

Rendered documents contain user-authored HTML/CSS/JS — treated as untrusted code:

- Hosted renders run in **Vercel Sandbox** (Firecracker microVM), destroyed per job.
  User JS executes in the sandbox's Chrome page, never in our functions.
- The render document needs **zero network** (assets + fonts ride as data URLs) and its
  runtime stubs `fetch`/`XHR`/`WebSocket`/`BroadcastChannel` to inert no-ops; the marked
  LIVE DATA / SHOW CHAT / REMOTE CONTROL blocks are stripped before rendering.
- Job identity is two independent secrets (browser token / worker secret), stored only
  as sha256; wrong tokens get the same 404 as missing jobs. Anonymous quotas key on a
  salted IP hash — raw IPs are never stored.
- Runaway protection: per-frame Remotion timeouts, a per-job sandbox wall clock derived
  from frames×resolution (RENDER_CONFIG), a timer-fire cap inside the virtual clock,
  and the cleanup cron as backstop. Output size is capped per tier.
- Finished files live at unguessable `renders/<jobId>/…` Blob paths with a short TTL
  (anonymous 2 h, free 24 h). Public-read-by-URL is a deliberate v1 tradeoff — the
  4.5 MB function response cap rules out proxied downloads. **The Blob store must be
  configured for public access** (the worker uploads with `access: 'public'`); a private
  store rejects the upload. Switching to private + token-gated signed downloads (via
  `@vercel/blob`'s `issueSignedToken`/`presignUrl`, redirected through a jobToken-gated
  endpoint) is the documented next step and would be isolated to the worker + the file route.
- **kind:'remotion' specifics:** the authored module executes in the render PAGE itself
  (not a stubbed srcdoc iframe) — the microVM / self-host machine remains the security
  boundary, and no secrets exist in the page (`BLOB_READ_WRITE_TOKEN` lives in the
  worker's Node process env, never in Chrome). The page's network is deliberately NOT
  stubbed: Remotion's own machinery (OffthreadVideo frame extraction, delayRender asset
  loading) shares the page and needs fetch. Determinism guardrails live in the editor's
  static validator (imports limited to react/remotion, no fetch/XHR/network URLs, no
  wall clocks or Math.random in user SOURCE); a hostile client can skip the validator,
  which is exactly why the boundary is the sandbox, not the validator. Worst case, a
  malicious module corrupts or hangs its own render — bounded by the per-frame and
  per-job timeouts.
- Remaining hardening candidates: a pathname-scoped Blob token instead of the RW token
  in the sandbox env (blocked on @remotion/vercel's upload accepting client tokens) and
  a deny-by-default sandbox network policy phase-switched after provisioning — which
  would cover BOTH kinds' remaining network surface.
- **Asset budget (kind:'remotion'):** assets travel as data URLs inside the manifest,
  which is capped at 4 MB (Vercel body limit) — roughly 2.5–3 MB of raw media. The
  editor enforces a 3 MB per-asset cap at upload and the export panel shows a budget
  meter naming the largest assets. The documented follow-up for bigger media: a
  client→Blob upload channel with URLs in inputProps and the executor pre-fetching
  assets into the sandbox before render.

## Running it

**Local / self-host (no cloud at all):** set `VITE_RENDER_API=1` in `.env`, run
`npm install` inside `render-worker/` once, start the dev server. The Export tab's
render section appears and renders on your machine (LocalExecutor spawns
`render-worker/job.mjs`; first run downloads Chrome Headless Shell). Verify with
`node scripts/render-smoke.mjs`.

**Hosted (Vercel):**
1. Apply migration `supabase/migrations/0007_render_jobs.sql` to the live database.
2. Create a **public** Blob store (Vercel → Storage → Blob) and connect it to the project
   (the worker uploads `access: 'public'`; a private store rejects the upload).
3. Set the project env vars and redeploy:

```
VITE_RENDER_API=1
RENDER_EXECUTOR=sandbox
BLOB_READ_WRITE_TOKEN=   (from the Blob store)
SUPABASE_SECRET_KEY=     (new sb_secret_… key; or set SUPABASE_SERVICE_ROLE_KEY instead)
CRON_SECRET=             (any long random string)
IP_HASH_SALT=            (any long random string)
```

The deploy build prebuilds the Remotion bundle (`vercel.json` buildCommand) and ships
it to the functions (includeFiles); sandboxes get it via `addBundleToSandbox` — nothing
of ours is npm-installed inside sandboxes. `@vercel/sandbox` is pinned to the version
`@remotion/vercel` is built against; bump them together only.

Inside the sandbox, **all five formats** render through one worker
(`render-worker/sandbox-job.mjs`, a detached command): it reads the manifest from a file
and calls `@remotion/renderer` programmatically. It does NOT use `@remotion/vercel`'s
`renderMediaOnVercel`, which passes `inputProps` as a single CLI argument — our manifest
embeds the whole self-contained document, so that argument exceeds the OS 128 KB
single-argument limit (`E2BIG`). A file + in-process `inputProps` sidesteps that. The api
handlers import shared `src/render` modules with explicit `.js` extensions because the
deployed functions run as ESM (`type: module`), where Node requires them.

### First-deploy checklist

- [ ] anonymous MP4 1080p25 ≤15 s renders and downloads
- [ ] signed-in ProRes 4444 renders; alpha verified in an NLE
- [ ] signed-in PNG sequence (the hand-rolled zip path in sandbox-job.mjs — least
      field-proven; watch the sandbox logs on the first run)
- [ ] cancel mid-render stops the sandbox (Vercel dashboard shows it gone)
- [ ] third anonymous render within an hour answers 429
- [ ] the cleanup cron log shows expired outputs deleted after TTL
- [ ] sandbox count returns to zero after each job

## Testing

- `npm run test:e2e` — offline suite; includes `render-schedule.spec.ts` (schedule +
  limits math) and `render.spec.ts` (panel states over a stubbed API).
- `node scripts/render-smoke.mjs` — the REAL full loop on this machine, BOTH kinds:
  html manifest from a live catalog template → api → local Remotion render → download +
  MP4 sniff + token probes, then a kind:'remotion' fixture through the same service plus
  a throwing-module job that must fail with a useful message. Not in CI (renders take
  minutes and download Chrome).
- `node scripts/render-smoke-video.mjs` — the CONTENT → RENDER round trip for a video
  project, checked in PIXELS. A video's editable inputs reach the live preview through the
  player host's set-props channel but the render through `inputProps` in the manifest, so a
  working preview proves nothing about the render. This builds the manifest with the app's
  own modules (the calls VideoRenderPanel makes) from a project whose values were edited away
  from their code defaults, renders a png-still for real, and reads the frame back: the
  corner pixel must be the edited accent and the centre pixel the asset an IMAGE input names.
  A dropped field renders the code's own fallback instead — which a container sniff cannot
  see. Not in CI (same reason as above).
- `node scripts/make-render-manifest.mjs <out> <variantId> [sec] [format] [fps] [scale]
  [createOptionsJson]` + `node render-worker/cli.mjs <manifest> <out>` — render any
  catalog variant by hand.
- `node scripts/make-remotion-manifest.mjs <out> [frames] [format] [fps] [scale]` — a
  kind:'remotion' fixture with a hand-written module (no browser needed), for the same
  cli loop.

## License note

Remotion is source-available: free for individuals and organizations up to 3 people,
paid company license above that (https://remotion.dev/license). NoaCG Studio is
currently a solo project, so the free tier applies. The dependency is isolated in
`render-worker/` (its own package) and never enters the AGPL app bundle — as is
`@remotion/player`, which lives only in `player-host/` (its own package, built into
`public/player-host/` as a standalone page the app talks to via postMessage). Revisit
the license if the organization grows past 3 people.
