---
v: 1
source: walk
raised: 2026-09-04
state: unstarted
asked: "the pasted setup prompt describes a doctor failure mode that doctor does not actually have, and it sends strangers at an npm version behind the source"
---
# Two soft spots in the one-prompt agent bootstrap

**Filed:** 2026-09-04, walking
`docs/acceptance/owner-queue/2026-08-28-one-prompt-agent-bootstrap.md`. That item's open question
was whether an agent follows the pasted prompt without help. It does - a fresh agent given the
prompt cold picked the Claude Code branch with no hesitation, named every command in the right
order, and asked nothing. The item is closed. These two are what the same read turned up, and
neither of them blocks anybody.

## 1. Step 3 describes a failure the tool does not produce

The prompt says:

> Verify: "npx -y @noacg/cli doctor" prints the deployment, the browser it will drive and the
> bridge version it found. **If it does not**, tell me what failed and stop.

`doctor` does not fail by printing nothing. On a machine with no drivable Chromium it prints
`browser NONE - <error>` and exits non-zero. So an agent has to infer that a non-zero exit, or the
word `NONE` in output that otherwise looks like a successful report, is what "if it does not"
means. Every agent will probably get that right; it is still the prompt asking for a judgement
instead of naming the test.

The fix is one clause: *"if the browser line says NONE, or the command exits non-zero, tell me
what failed and stop."* Same length, no inference.

The prompt also never says `doctor` needs a system Chrome or Edge, though the paragraph under the
block does. That is fine as it stands - the stop instruction covers the case - and it is only
worth moving if the clause above gets written anyway.

## 2. `npx -y @noacg/cli` fetches a version behind this repository

`@noacg/cli` on npm is **0.2.0**; the checkout is **0.3.0**. Every route the docs teach a stranger
- the pasted prompt, the `npx` one-liners under Reference, the MCP stdio registration - resolves
to 0.2.0 until the next publish. The verbs and flags the prompt names all exist in the current
source, and the marketplace name and plugin id match the manifest, but whether 0.2.0 carries all
of them is unverified.

This is not a docs bug and the docs should not work around it. It is worth writing down because it
is invisible: the page is checked against the source in the repository, and the reader runs
something else. Publishing 0.3.0 is an `owner-action` (it costs a publish past `main`), so the
honest handling is either to publish or to know the gap is there.

**Worth a check before publishing:** whether anything the docs page teaches was added after 0.2.0.
If something was, the page is currently wrong for every reader, not merely behind.
