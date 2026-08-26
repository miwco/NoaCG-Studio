---
kind: walk
date: 2026-08-26
---
# The GitHub repository page

`claude/h-github-storefront` (2026-08-26). Route: open
https://github.com/miwco/NoaCG-Studio - the whole item is that one page, no checkout needed.

**Look at, in order:**

1. **The homepage link** in the About box on the right. It now says `noacg.studio`, not the old
   `noacg-studio.vercel.app`. This one is already live: the repository setting was changed
   directly, it is not waiting on the merge.
2. **The README's first screen.** The subtitle line under the title carries two links now - the
   app and the public guides at `noacg.studio/docs` - and the catalog line reads *507 designs
   across 22 categories*, which is the number the build's own prerender step emits. The old text
   said 386 across 21. There are no em-dashes left in the README, and each shell command sits in
   its own copy-paste block.
3. **The file list.** `re-design/` is now one markdown file. The 18 planning mockup PNGs (9.8 MB)
   are gone, per your ruling that they are of no interest to anyone. `handoff.md` stayed because
   about thirty source comments and e2e specs cite it by name as a binding contract.
4. **The Releases tab.** Still zero, and that is expected until the next CLI version ships. The
   workflow now creates a GitHub Release on every publish, so `cli-v0.3.0` will be the first one
   to appear. Nothing to look at yet; this is here so the empty tab does not read as unfixed.

**The question:** does the page read as a current, maintained project to someone who has never
seen it before?
