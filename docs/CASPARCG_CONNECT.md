# CasparCG Connect - one configured server, one button to air

**What this is.** A NoaCG production goes on a CasparCG channel from the production page, with
the server configured once under Settings instead of retyped per show. The operator never opens
the CasparCG Client.

**What this is not.** It is not a new way to get on air, and nothing here is load-bearing for a
show. The shipping route already works and is unchanged: run the CasparCG Client, load an
offline template export or the production's `/output` URL by hand
(`docs/ACCEPTANCE_SPX_CASPARCG.md`, `docs/PLAYOUT_INTEGRATION.md`). This feature removes manual
steps from a workflow that already airs. If the connection is not available, every route in
`docs/PLAYOUT_INTEGRATION.md` still is.

This is Stage 1 of `docs/NATIVE_PLAYOUT_RESEARCH.md` §6 - *own the client, rent the engine*.

---

## 1. The transport, measured before it was designed

The shape of this feature is decided by what a browser physically cannot do. Everything in this
section was reproduced on this machine on **2026-08-24** against a fake AMCP listener and a fake
local agent, in **real Chromium 149.0.7827.55** (Playwright's, not an app shell), not taken from
memory or from how SPX's UI looks.

### 1a. A browser cannot open a raw TCP socket. AMCP needs one.

A page has exactly one socket primitive - `WebSocket` - and it is not a socket, it is an HTTP
Upgrade handshake. Pointed at AMCP on 5250, the browser really does connect, and then it sends
this:

```
GET / HTTP/1.1
Host: 127.0.0.1:5250
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: T9Jheii0GzuSQo14pwCZRg==
```

CasparCG's AMCP parser answers that the only way it can - with an AMCP status line, which is not
an HTTP response - and the browser aborts:

```
WebSocket connection to 'ws://127.0.0.1:5250/' failed:
  Error during WebSocket handshake: net::ERR_INVALID_HTTP_RESPONSE
```

This is not a CORS problem, a policy problem or a version problem, and no server setting fixes
it. **The socket has to live outside the browser.** That is why SPX itself is a local Node
process, and the owner accepted the price of a small local process on 2026-08-24.

A Vercel function cannot take the socket either: `noacg.studio` runs in a datacentre and
`192.168.x.x` is somebody's studio. There is no route from one to the other.

### 1b. Chrome's Local Network Access gates the page -> loopback hop, and it is a PROMPT

The old rule most documentation still describes - answer the CORS preflight with
`Access-Control-Allow-Private-Network: true` - **is dead**. Measured, with the agent sending
exactly that header:

| Origin the page is on | Reaching `http://127.0.0.1:7710` | Result |
|---|---|---|
| `http://127.0.0.1:7710` (agent's own) | same address space | **HTTP 200** |
| `http://192.168.0.120:7711` (a LAN self-host) | private -> loopback | **HTTP 200**, no prompt |
| `https://noacg.studio` (hosted) | public -> loopback | **blocked** |
| `https://noacg.studio` + `Access-Control-Allow-Private-Network: true` | public -> loopback | **still blocked** |
| `https://noacg.studio` + the `local-network-access` permission granted | public -> loopback | **HTTP 200** |
| control: `--disable-features=LocalNetworkAccessChecks` | public -> loopback | HTTP 200 |

The refusal, verbatim:

```
Access to fetch at 'http://127.0.0.1:7710/status' from origin 'https://noacg.studio'
has been blocked by CORS policy: Permission was denied for this request to access
the `loopback` address space.
```

The good news is that this is a **permission, not a wall**, and the page can ask what state it
is in before it tries:

```js
await navigator.permissions.query({ name: 'local-network-access' })
// hosted, untouched: { state: 'prompt' }      <- a browser prompt stands in the way
// after granting:    { state: 'granted' }
```

Two consequences the UI is built around:

- **A pending request means the prompt is up.** Measured headed: with the permission in
  `prompt` state, the `fetch` does not fail - it *hangs* while a permission bubble waits above
  the page, where a user watching the settings panel will not look. Every call therefore carries
  an `AbortController` timeout, and a timeout is reported as "your browser is asking - answer
  the prompt at the top of the window", never as "unreachable".
- **Self-hosting on the studio LAN needs no permission at all.** A NoaCG served from
  `http://192.168.x.x` reaches a loopback agent with nothing granted (row 2 above). Worth knowing
  before telling a school to click through a security prompt.

Safari blocks `https` -> `http://localhost` outright with no permission to grant. Not measured
here (no Safari on this machine) and stated as a limit, not a claim: the Settings panel names
Chrome/Edge as the supported browsers for this one feature and says so rather than looking
broken.

### 1c. So: whose machine, and which hop

```
 operator's browser  --HTTP/loopback-->  noacg caspar agent  --TCP/AMCP-->  CasparCG :5250
 (any origin)            token +           (127.0.0.1 only,      (same box or anywhere
                       origin check         operator's box)        on the studio LAN)
```

**The agent runs on the operator's machine, not on the playout box.** That is what keeps the
bind on `127.0.0.1` while still letting CasparCG be a different machine: only AMCP crosses the
LAN, which is exactly what the CasparCG Client does today. Putting the agent on the playout box
and reaching it over the LAN would mean binding `0.0.0.0`, and a `0.0.0.0` bind turns any web
page the operator visits into a remote control for the playout server. The agent refuses to do
it (§3).

### 1d. Verdict

**Not ugly. Build it.** The constraint is one local process (already the price of every
comparable product) plus one browser permission the user grants once, whose state the app can
read and explain. There is no behaviour here that will not sit still. The one honest limit -
Safari, and any embedded browser with no way to show a prompt - has a terminal route around it
that needs no browser at all (`noacg caspar play`, §4).

---

## 2. What it does, from the operator's side

1. Once, ever: run `noacg caspar agent` on the machine you operate from. It prints the address
   and token to paste into **Settings -> Playout**, and stays running.
2. Once, per studio: fill in the CasparCG host, AMCP port, channel and layer in the same panel
   and press **Test connection**. It round-trips a real AMCP `VERSION` and prints the server's
   own version string. The settings are **app-wide and persisted** - they survive switching
   productions, reloading and closing the browser, because a studio has one playout server and
   not one per show.
3. Per production, on the production page: **Links -> CasparCG -> Put on air**. That issues one
   command and is the entire live link:

   ```
   PLAY 1-20 [HTML] "https://noacg.studio/output?production=<slug>"
   ```

   From that moment every cue, take, update and recovery flows through the durable command log
   the `/output` page already follows (`docs/CLOUD_PLAYOUT.md`). **Take it off** issues
   `STOP 1-20`.

Loading the layer once and leaving it up is the documented CasparCG workflow
(`docs/PLAYOUT_INTEGRATION.md` §3), not a shortcut. The graphics are cued over the log, not by
re-adding the layer.

### Not built tonight, on purpose

**Per-take `CG ADD` / `CG UPDATE` traffic.** Driving each cue as its own CasparCG CG command -
so a CasparCG rundown, rather than the NoaCG production page, is the operator surface - is a
second design, and it competes with the command log rather than riding on it. It would need the
field-id vocabulary on the wire (`FIELDS.md`), a per-layer model of what CasparCG believes is
loaded, and a recovery story for when the two disagree. The next design, not this one.

---

## 3. The agent (`noacg caspar agent`)

It lives in the existing `noacg` CLI (`cli/src/commands/caspar.ts`) rather than as a second local
process, for the reason `docs/PLAYOUT_INTEGRATION.md` §4 already established with the exported
package's relay and launcher: the project ships one local helper, not a family of them.

**Every security property is a refusal, not a convention:**

| Property | How |
|---|---|
| Loopback only | Binds `127.0.0.1`. `--host` with anything but a loopback address is refused at startup, with the reason. |
| Token required | A random 32-hex token per run (or `--token`), in `Authorization: Bearer`. Compared in constant time. `/health` is the one route without it, so the UI can tell "no agent" from "wrong token". |
| Origin allowlist | Only the configured NoaCG origin (`--origin`, default `https://noacg.studio` plus `localhost`/`127.0.0.1` dev ports). Any other origin gets 403 and **no** CORS headers, so a stray tab cannot read a reply even if it guessed the token. |
| No DNS rebinding | The `Host` header must itself be loopback. A name that resolves to `127.0.0.1` from a page's own domain does not get in. |
| No AMCP passthrough of unknown shape | `/amcp` takes one line, rejects embedded CRLF, and caps the response. |

Routes, all JSON:

| Route | Token | Does |
|---|---|---|
| `GET /health` | no | `{ agent: 'noacg-caspar', v: 1 }` - presence only, nothing about the studio |
| `POST /status` | yes | opens AMCP, sends `VERSION`, returns the code and lines |
| `POST /amcp` | yes | sends one arbitrary AMCP line |
| `POST /play` | yes | `PLAY <channel>-<layer> [HTML] "<url>"` |
| `POST /stop` | yes | `STOP <channel>-<layer>` |

### AMCP, precisely

- **CRLF line protocol.** Every command ends `\r\n`; so does every response line.
- **Responses are numeric codes**: `2xx` fine (`201` = one data line follows, `200` = several
  until a blank line, `202` = done, no data), `4xx` the client's fault, `5xx` the server's.
- **CG addressing is `<channel>-<layer>`.**
- A connection that opens and says nothing is normal - CasparCG has no greeting banner, so the
  agent must not wait for one before writing.

---

## 4. The route with no browser in it

Every browser-side constraint in §1b disappears if the operator is in a terminal, so the same
command exists there and is the honest answer for Safari, for a locked-down browser, and for a
machine where clicking a permission prompt is not going to happen:

```bash
noacg caspar play --url "https://noacg.studio/output?production=my-show" --channel 1 --layer 20
```

`noacg caspar status` is the same round-trip as the Settings button, and is the first thing to
run when the panel says something is unreachable - it tells you whether the problem is between
the browser and the agent, or between the agent and CasparCG.

---

## 5. Diagnosing it - four states, never one generic red

The panel never says "failed". It says which hop failed, because the four have nothing to do
with each other and three of them are the user's to fix:

| State | What the app saw | What it says |
|---|---|---|
| `permission` | `navigator.permissions` reports `prompt`/`denied`, or the call timed out with the permission not granted | Your browser has not allowed this site to reach your local network. Answer the prompt, or allow it in the site settings. |
| `agent` | fetch failed fast with the permission granted | The NoaCG agent is not running on that address. Run `noacg caspar agent`. |
| `token` | agent answered `/health`, then 401 | The agent is running but rejected the token. Re-copy it from the terminal. |
| `server` | agent answered, AMCP connect/refuse | CasparCG did not answer on `<host>:<port>`. Names the socket error. |
| `ok` | AMCP `201 VERSION OK` | Shows the server's own version string. |

`permission` is only ever offered when it is possible - a NoaCG on `http://localhost` or a LAN
self-host cannot hit it (§1b), and saying so there would be a lie.

---

## 6. What has actually been verified

Stated plainly, because this doc's whole purpose is to not overstate a nice-to-have.

- **Reproduced on this machine (2026-08-24)**: everything in §1 - the WebSocket/AMCP handshake
  failure with the listener's own log of the browser's Upgrade request, the four Local Network
  Access outcomes, the permission-state query, and the LAN-origin exemption.
- **Covered by the test suite**: `e2e/caspar-connect.spec.ts` drives the Settings panel and the
  production button against a **fake local agent** (intercepted at the network layer), including
  each of the five diagnosis states.
- **NOT verified against a real CasparCG server.** There is none on this machine. The AMCP
  wire format is from the protocol documentation and the fake listener implements it; the first
  real-hardware run is an owner acceptance step, and belongs in
  `docs/ACCEPTANCE_SPX_CASPARCG.md` when it happens.
- **NOT verified in Safari** (§1b).
