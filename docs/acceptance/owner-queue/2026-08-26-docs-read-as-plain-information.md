---
kind: walk
date: 2026-08-26
---
# /docs reads as plain information, and every command copies

Route, about a minute: open `/docs`. Scroll to **Coding agents & the CLI** and press the **Copy**
button on the first command block, then paste it somewhere. Then read one guide out loud, whichever
you like, and read the Install block under Coding agents.

What to look at:

- **Does it read like plain information?** Every sentence was rewritten against your rule: say what
  it does and how you do it, no superlatives, no marketing voice, short plain sentences. There is
  not one em-dash left on the page (the landing has none either now; its selling voice is
  untouched). The honest statements are deliberately unchanged in force, and one of them
  got blunter: CasparCG connect has still "not yet driven a real CasparCG server", outlined text
  still says the stand-in is re-rendered type and to re-export with live text where you can, and
  the Safari limit now says outright that it was never tested here.
- **Is `miwco` gone?** It is nowhere you can read or type. It survives only inside the `href` of
  the Source links, because that is where the repository actually is. What to do about that is
  `2026-08-26-a-marketplace-address-without-your-handle.md`, which needs a decision from you.
- **Do the copy buttons feel right?** All sixteen command blocks have one. The page is complete
  with JavaScript off: the buttons are added by `src/docs/docs.ts`, so nothing is lost without it.
