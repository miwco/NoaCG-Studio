# Native playout research - getting NoaCG to SDI, NDI and IP on its own

**Status: RESEARCH ONLY, nothing built, nothing decided.** No code in this repo changes because of
this document. It exists to answer one question honestly: what would it take for NoaCG to put
graphics (and video, and stills) on air through SDI / NDI / IP *without* asking the user to run
CasparCG, OBS or vMix - and is that a sane thing to want.

Read `docs/CLOUD_PLAYOUT.md` first. Everything here hangs off the browser-output contract that
already exists; none of it replaces that contract.

---

## 1. The one fact that shapes every option

**SDI and NDI are local. There is no cloud path to a BNC connector.** A cloud service can produce
pixels; something with a driver, a card and a clock has to hand those pixels to the wire, in a
room, on the same machine.

That is not a NoaCG limitation, it is the state of the whole market:

- **Singular.live** - the closest competitor on the cloud-graphics axis - reaches SDI by telling
  the customer to run *a standard PC with an SDI I/O card running TouchDesigner or OBS*, pointed at
  a Singular output URL. Their "SDI support" is somebody else's local box.
- **Viz Flowics, LIGR, Loopic**: same shape.
- **SPX Graphics** is not a cloud service at all - it is a Node app the user runs locally, and it
  *still* does not touch SDI. It hands HTML to CasparCG, which owns the card.

So the honest framing of the ambition is **not** "can we go online to SDI". It is:

> **Whose local box is it?**

Today that box runs the CasparCG Client, OBS, or vMix. The interesting question is whether it can
run *ours*. That is a real, achievable product - and it is a completely different question from
"can we replace the CasparCG Server", which is where the cost lives.

## 2. The free half nobody has to build

The output side of this is already done, and this is the part worth understanding before costing
anything.

`/output?production=<slug>` is a transparent, self-recovering renderer that follows the durable
command log: cues, layers, per-layer recovery baselines, phone control, publish pinning, old-CEF
compatibility. Any client that can display a web page inherits **all** of it.

Which means a native playout agent does not need a new graphics pipeline, a new protocol, a new
data model or a new operator surface. It needs to:

1. load that URL in an embedded browser,
2. pull frames out with the alpha intact,
3. hand them to a card.

Steps 2 and 3 are the entire native problem. Step 1 is a URL. `docs/CLOUD_PLAYOUT.md` §7 already
predicted a local process that maintains an outbound connection and consumes the same log - it was
written for data connectors, and a playout agent is the same shape pointed at pixels instead of
values.

**This is why the whole programme is additive.** A native agent is a *new consumer of an existing
published contract*, exactly like OBS is today. Nothing in the studio, the wizard, the control
layer or the export registry has to move for it to exist, and if the agent is abandoned, nothing
has to be unwound.

## 3. The four routes, with what each actually costs

### Route A - become the CLIENT, keep CasparCG as the engine (AMCP)

Ship a NoaCG operator surface that drives an **unmodified CasparCG Server** over AMCP (a plain
line-based TCP protocol on port 5250). We stop asking anyone to open the CasparCG *Client* - the
Qt application that is, by a wide margin, the ugliest thing in a student's first hour - and we
become that client, in the browser they are already in.

What it buys on day one, because the server already has it:

| Need | CasparCG consumer |
|---|---|
| SDI fill + key, HD/SD, embedded audio | **DeckLink consumer** (since server 1.8) |
| NDI in and out | **NDI consumer**, native since 2.3 |
| Any video file, any still | FFmpeg producer |
| Our graphics | HTML producer, pointed at the output URL we already publish |
| Streaming out | FFmpeg consumer (SRT/RTMP) |

Cost: **small.** AMCP is text over TCP. The real work is not the protocol, it is that a browser
cannot open a raw TCP socket - so this needs a tiny local bridge. We already ship one:
`src/export/local-relay/` (`relay.ps1` / `relay.py`, OS-bundled runtimes, no installs) exists for
exactly the "the browser cannot reach the thing" problem in OBS exports. Teaching it to relay
WebSocket → AMCP TCP is a days-to-weeks job, not a months job.

Licensing: **clean.** Talking a documented network protocol to a separate program is not a
derivative work, so nothing GPL touches our source. Bundling the server in a NoaCG installer is
mere aggregation, and stays fine as long as we carry the licence and the source offer.

Weakness: the user still installs CasparCG, and we do not control what happens when it misbehaves.

### Route B - fork the CasparCG Server

C++17, FFmpeg, OpenGL, CEF, a 20-year codebase, GPLv3. A fork means owning the merge burden with
upstream forever, and everything we distribute of it is GPLv3.

**Recommendation: no.** There is nothing on the roadmap AMCP cannot express, and where there is,
upstreaming a consumer is cheaper than maintaining a fork. Forking buys control of the *engine*,
which is the one part of this we do not need to own.

### Route C - our own agent, browser-first (the interesting one)

A **NoaCG Playout Agent**: a small signed binary the user installs, that pairs to an account with a
code, opens an **outbound** connection to the same control log (no inbound ports, no firewall
argument with a school's IT department), embeds a browser offscreen, and pushes frames to a card.

This is not speculative - it has been built by others. A developer shipped **CEFDecklink** for
precisely this, and their write-up names the two traps that matter:

- **Premultiplied alpha.** CEF hands you premultiplied BGRA. Send that straight out as fill+key and
  a hardware keyer multiplies the alpha a second time - soft edges and gradients get dark fringes.
  The fill has to be un-premultiplied before it goes to the wire. This is the single most likely
  way a v1 looks subtly wrong on air and passes every test we could write in a browser.
- **Frame rate honesty.** Rendering internally at 30 and emitting 59.94i is a common shortcut and it
  shows. The browser has to be driven at the channel's rate, on the card's clock.

Cost: **v1 = graphics-only overlay to DeckLink (fill+key) + NDI, roughly 2-3 focused months** for
someone comfortable in native code, and that is for a thing that works, not a thing you would leave
running for a season. Video and still playback layers are a separate multi-month tranche (§4).

### Route D - our own agent, assembled from an existing engine

Same product as C, but we do not write the media plumbing:

- **GStreamer (LGPL)** - has `decklinkvideosink`, `ndisink`/`ndisrc`, `srtsink`, `webrtcsink`,
  a compositor, and every decoder. Pipeline: browser frames → `appsrc` → `compositor` →
  `decklinkvideosink` + `ndisink`. **LGPL means we can ship a closed agent around it** (dynamic
  linking), which matters if the agent is ever the paid surface.
- **libobs (OBS, GPLv2)** - fastest possible route to "our own box": headless OBS already has a
  browser source, a DeckLink output and an NDI plugin, driven by `obs-websocket`. But linking it
  makes our agent GPLv2, and we would inherit OBS's shape rather than choosing our own.
- **FFmpeg alone** - has DeckLink output; **NDI was removed from FFmpeg in 2021** over the SDK
  licence, so FFmpeg is not an NDI route.

**If the agent is ever built, GStreamer is the engine to build it on**, on licence shape alone.

## 4. What "playout" costs that "getting a frame out" does not

Getting one clean transparent frame to a DeckLink is a weekend for the right person. That is not
what makes playout servers take twenty years. The rest of the list, stated plainly so the estimate
is not a lie:

- **Genlock / reference.** The card is clocked to house sync and expects a frame *every* frame
  interval, on time. A late frame is a visible glitch. Rendering in a browser, which schedules on
  its own vsync and garbage-collects when it feels like it, is fundamentally at odds with this - the
  frame pump has to be decoupled from the renderer and always have something to hand over.
- **Fill and key as two links**, premultiplied vs straight (§3, Route C).
- **Interlace.** 1080i50 and 1080i59.94 are still what a great deal of kit ingests. Field order,
  field-rate motion, and text that shimmers when it is not authored for fields.
- **Colour.** BT.709 vs BT.2020, and limited (16-235) vs full (0-255) range. The mismatch is the
  single most common "why are my whites grey / my blacks crushed" on a first SDI hookup.
- **Audio.** 16 channels embedded, sample-accurate to the video, loudness-legal.
- **Drift.** A/V sync that is fine for ten minutes and wrong after six hours.
- **24/7.** Memory behaviour, watchdogs, recovering from a card being removed, from a driver update,
  from the browser process dying at 03:00.
- **Codec breadth**, once media layers exist: ProRes, DNxHD/HR, XDCAM, HAP, H.264/265, and the
  broken files people actually have.

**Almost none of this binds a graphics-only overlay agent**, because the downstream mixer owns the
programme. That is the scope discipline that makes Route C/D affordable: build a *graphics output
device*, not a playout server.

## 5. IP - three very different things wearing one word

| "IP" | Reality | Verdict |
|---|---|---|
| **NDI** | Royalty-free SDK, one `ndisink` away once frames exist. LAN-local, ubiquitous in the streamer/education market we actually serve. | **Do this.** Highest value per unit of work in the whole document. |
| **SRT / RTMP / WebRTC** | Ordinary encoding off the same composited frames. GStreamer/FFmpeg sink swap. | Cheap once the agent exists. |
| **SMPTE ST 2110** | Needs PTP (IEEE 1588) with hardware timestamping, a licensed NVIDIA/Mellanox ConnectX NIC running Rivermax with kernel bypass, a properly engineered network, and usually NMOS discovery on top. | **Not a build - a procurement.** Only if a paying facility asks and funds it. |

NDI licence terms, since they bind product decisions and not just code: royalty-free for commercial
use, but our EULA must cover the NDI SDK's terms, we must link to `ndi.video` near every place NDI
is used or selected (in-app, on the site, in the docs), we must keep the shipped version current,
and the Advanced SDK needs a vendor ID from NDI licensing.

## 6. If it is ever done: the staged order

Each stage stands on its own, ships value alone, and can be stopped after without stranding
anything. None of them modify existing behaviour.

- **Stage 1 - AMCP bridge (weeks).** Extend `src/export/local-relay/` to relay WebSocket → AMCP.
  A "Playout" surface on the production page discovers a CasparCG on the LAN, loads the output URL
  onto a channel/layer, and drives SDI/NDI from a page the user is already in. *We become the
  client.* Retires the CasparCG Client for our users, keeps their server.
- **Stage 2 - Playout Agent v1, graphics only (2-3 months, native).** Signed installer, pairs by
  code, outbound-only, embeds the browser, un-premultiplies alpha, drives DeckLink fill+key + NDI at
  the channel rate. *Now we do not need CasparCG for graphics.*
- **Stage 3 - media layers (months).** Video and still layers under and over the graphics layer, a
  drag-anything-in pool on the production page. *Now it is playout, not a graphics device.*
- **Stage 4 - stream sinks (small, after 3).** SRT/RTMP/WebRTC off the same composite.
- **Stage 5 - ST 2110.** Only against a funded customer.

Stage 1 is worth doing on its own merits whatever happens to 2-5. Stages 2+ are a second product.

## 7. The verdict

**Not mad. But the ambition is two ambitions, and only one of them is cheap.**

- *"A student should never have to open the CasparCG Client"* - sane, weeks of work, squarely on the
  brand promise ("best & easiest to create **and put on air**"), and it closes the one row where the
  competitor table says they have SDI/NDI and we have "HTML/browser-source only". **This is Stage 1
  and it is the one to want.**
- *"We replace the CasparCG Server"* - a second product with a 24/7 reliability burden, a native
  codebase in a repo that has none, hardware we would have to own to test on, and a support surface
  where the failure mode is *dead air*. It also spends the compatibility story we get for free:
  today every playout in the world is our friend precisely because we do not compete with it.

The shape that survives contact with reality: **own the client and the agent, rent the engine
forever.** Rent it from CasparCG at Stage 1, and from GStreamer at Stage 2+ if the agent is ever
built.

Timing note against `docs/GOALS.md`: none of this serves the student release, and Stage 1's own
prerequisite - a class getting graphics on air reliably through the routes that already exist - is
not finished. This is a *next-era* file. Parking it is the correct move; writing it down now is
what keeps it from being re-argued from scratch later.

## 8. gstcefsrc dossier (2026-08-29) - the Route D engine, examined at source level

Research pass 2026-08-29 read [gstcefsrc](https://github.com/centricular/gstcefsrc) and the
downstream GStreamer elements at source level, for the day Route D is ever reopened. The park
stands (owner, 2026-08-16); this section makes the dossier precise. Companion reading:
`docs/OGRAF_ECOSYSTEM.md` §5 places this in the OGraf sequencing.

**gstcefsrc itself.** LGPL-2.1, maintained by Centricular and genuinely active (last commit
2026-08-24; CEF bumped 130 -> 139 across 2025 - they are walking the treadmill §4 names).
Elements: `cefsrc` (video + audio-as-meta), `cefdemux`, `cefbin`. Output is BGRA with alpha in
caps, and page audio arrives via CEF's `OnAudioStreamPacket` (F32LE, pipeline-clock timestamped).
Software OSR by default, GPU compositing opt-in.

**The load-bearing finding - pacing.** CasparCG's html producer calls CEF's
`SendExternalBeginFrame()` once per channel tick, and the channel is clocked by the DeckLink
card - Chromium renders exactly one frame per output frame, deterministically, genlock-derived
(§3 Route C called this "the single most important idea"). **gstcefsrc has no equivalent** -
zero occurrences of external BeginFrame in its source. It sets `SetWindowlessFrameRate(fps)`
(CEF's internal wall-clock scheduler, default cap 30) and copies damage-driven `OnPaint`
callbacks into buffers timestamped at paint time. Consequences, all confirmed in source/issues:
a static page produces **no frames at all** (`create()` blocks until damage), timestamps are
"whenever Chromium painted" rather than the output raster, constant cadence has to be
synthesized downstream with `videorate`, and fractional broadcast rates (59.94) were silently
truncated until a 2025 fix - evidence nobody was running this against real SDI rasters. Open
issues: choppy audio at 60 fps (unbounded queue), segfaults, per-child console windows on
Windows, X-server requirement on Linux (xvfb, no first-class headless/Wayland), one CEF
instance per process. **Alpha:** nothing in the source sets a transparent browser background
(Chromium paints opaque by default) and premultiplied-vs-straight is unaddressed - the §3 trap,
unhandled. A keyable transparent page is not a supported path today.

**Downstream, the good news - the plumbing is genuinely solved:**

- **`decklinkvideosink`** (gst-plugins-bad, LGPL; vendors the permissive Blackmagic headers -
  the exact licensing posture §10 of the OGraf review records): `keyer-mode` off / internal /
  **external** (key as luma on the primary connector, fill on the secondary - true two-connector
  fill+key) with `keyer-level`, requiring `duplex-mode=full` on Duo 2/Quad 2-class cards; keying
  runs 8-bit BGRA so the card takes RGB directly on the keyed path. It **provides a GstClock
  from the card** and uses DeckLink ScheduledPlayback with completion callbacks - the pipeline
  *can* run on the card's clock, the same property CasparCG's channel tick has. Genlock remains
  card/driver-level, unmanaged by the element.
- **NDI** via gst-plugins-rs (Rust, MPL-2.0), the SDK runtime dynamically loaded so the
  proprietary bits never link into the build; `srtsink`, `webrtcsink`, `compositor`,
  `interlace`, `videoconvert` (full-range sRGB -> limited Rec.709 on the non-keyed path) all
  production-grade.

**Prior art: none found.** No evidence anyone has shipped broadcast SDI graphics playout on
gstcefsrc; observed wild usage is RTMP streaming and recording. The closest adjacent work is
Igalia's WPE `wpesrc` path (BBC web-overlay demo), aimed at streaming compositing, not SDI
fill+key.

**Verdict for the file of record.** GStreamer solves everything AROUND the browser better than
CasparCG does - transport variety, licence hygiene, card keyer support, active maintenance - but
the browser-to-raster pacing contract, the actual hard part, is solved inside CasparCG and
unsolved in gstcefsrc. Using it means **forking and fixing** (~1500 lines: drive external
BeginFrame from the sink clock, set a transparent background, settle alpha semantics), i.e.
re-implementing CasparCG's one big idea inside somebody else's element. That is smaller than
writing a renderer from scratch and larger than "assemble from parts" ever sounded; it
strengthens, not weakens, the §7 verdict - own the client and the agent, rent the engine. If the
agent is ever built, the engine order of preference stands: CasparCG rented (Route A) today,
GStreamer-with-a-patched-gstcefsrc (Route D) only against a funded need, and the patch upstream
to Centricular rather than held as a fork.

## Sources

- [CasparCG Server (GPLv3)](https://github.com/CasparCG/server) ·
  [DeckLink consumer](https://github.com/CasparCG/help/wiki/Decklink-Consumer) ·
  [NDI consumer](https://www.casparcg.com/docs/wiki/server/consumers/ndi-consumer)
- [Singular and SDI](https://support.singular.live/hc/en-us/articles/360033199572-Singular-and-SDI) ·
  [NDI using Singular Recast](https://support.singular.live/hc/en-us/articles/360023214171-NDI-Using-Singular-Recast)
- [CEF + DeckLink, and the premultiplied-alpha trap](https://qiita.com/tanaka13/items/6e2ae2b3c6f85a4f4410) ·
  [CEF accelerated OSR sample](https://github.com/twobrainsgmbh/cef-mixer)
- [NDI SDK licensing](https://docs.ndi.video/all/developing-with-ndi/sdk/licensing) ·
  [NDI software distribution terms](https://docs.ndi.video/all/developing-with-ndi/sdk/software-distribution)
- [gstcefsrc (LGPL-2.1, Centricular)](https://github.com/centricular/gstcefsrc) ·
  [decklinkvideosink](https://gstreamer.freedesktop.org/documentation/decklink/decklinkvideosink.html) ·
  [gst-plugin-ndi (gst-plugins-rs)](https://gitlab.freedesktop.org/gstreamer/gst-plugins-rs)
- [NVIDIA Rivermax (ST 2110)](https://developer.nvidia.com/networking/rivermax) ·
  [PTP requirements for COTS ST 2110](https://www.thebroadcastbridge.com/content/entry/14229/ptp-explained-part-4-requirements-for-virtualisation-of-st-2110-cots-infras)
