---
kind: walk
date: 2026-08-28
---
# Searching for graphics, in English, Swedish and Finnish

(2026-08-28). Two changes to the front door of the catalog, both from the 2026-08-27 phone
round. The graphic-type dropdown now carries BOTH levels in one list - the ten shelves as
headings, every category as a row underneath with its own count - so "Credits & thanks · 13" is
something you can see while scanning instead of a chip that only appears after picking the right
shelf. The chip row under the dropdown is gone with it. And search answers Swedish and Finnish:
measured before the change, 38 of the 40 terms a Nordic student would type returned NOTHING, and
one of the two that returned anything returned scoreboards to somebody looking for a break
screen.

Route, about two minutes: **/app -> Start -> Templates**. You land on Browse with the type
dropdown under the format row.

What to look at, in this order:

1. **Open the type dropdown and read it.** Ten headings, every category listed under its own
   heading with a live count, and an "All <shelf>" row at the top of each. Pick
   **Credits & thanks** directly - one action, no second click - and check the result is 13.
   The active-filter chip beside the count should say "Credits & thanks" ONCE, not twice
   (shelf + category), and removing it should clear the whole answer.
2. **Type in the search box, in Swedish**: `namnskylt`, `eftertexter`, `poängtavla`,
   `nedräkning`, `frågesport`, `paus`. Each should land on the right shelf. `paus` is the one
   to watch - it used to return 24 scoreboards.
3. **The same in Finnish**: `nimikyltti`, `lopputekstit`, `tulostaulu`, `siirtymä`, `kysely`,
   `tauko`.
4. **Type a phrase with a word that means nothing to the catalog**: `my show name graphic`.
   You should get lower thirds plus a small note beside the count reading `ignoring “my”`. That
   query used to return an empty grid. `big title` should now return the title cards.
5. If any of those return the wrong shelf, the word is the finding - the alias tables are in
   `src/model/taxonomy.ts` and are meant to be corrected by reading them.
