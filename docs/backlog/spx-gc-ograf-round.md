# SPX-GC 1.4 interop round - play a NoaCG OGraf package in an SPX rundown

**Filed:** 2026-08-29. **Source:** the OGraf ecosystem research round (`docs/OGRAF_ECOSYSTEM.md`
§1g).

## Why

SPX-GC v1.4 (MIT, active, <https://github.com/TuomoKu/SPX-GC>) added full OGraf support: OGraf
packages sit in SPX rundowns beside SPX templates and play out. That converges our two strictest
existing contracts - a conformant NoaCG OGraf package now earns SPX playout on its own, in
addition to the native SPX export. One hand round (later scripted) proves it and joins the
Direction-A interop ladder as a cheap, high-credibility fixture: SPX is the ecosystem's most
widely deployed open controller, and "plays in SPX 1.4" is a sentence operators understand.

## What it would take

Install SPX-GC 1.4+ locally, drop an exported NoaCG OGraf package (a starter and the scoreboard
dual package) into a rundown, drive play/continue/update/stop and at least one custom action,
record what SPX's `v_spx` conventions expect that we do not emit (if anything). Half a day
including notes; findings extend `docs/OGRAF.md`'s external-round record.

## Evidence

`docs/OGRAF_ECOSYSTEM.md` §1g and §4 (Direction A ladder item 4); SPX OGraf docs via the SPX-GC
repo (v1.4.1, May 2026).
