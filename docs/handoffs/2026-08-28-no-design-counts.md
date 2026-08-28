# No design counts on a public surface

Branch `claude/nostalgic-chaum-19ec1c`, 2026-08-28.

## The ruling

From the owner's walk of the GitHub repository page, verbatim:

> We need to always be creating more designs, and it should not be a number we boast about... We
> should never say how many designs we have... we have designs that look the same, so let's not try
> to be smug with the design amount.

The rest of that walk item was accepted ("Otherwise, I think it's fine. Good job."), so
`docs/acceptance/owner-queue/2026-08-26-the-github-repository-page.md` is deleted in this commit
rather than left open. Git holds it if anyone needs the original.

## What changed

- **`README.md`.** The catalog line was *507 designs across 22 categories*. It now reads "A catalog
  that covers a whole show, and keeps growing", followed by the same list of what is in it. The
  list was always the useful half of that sentence; the number was the boast.
- **`index.html`.** The "Start from a template" card said *Hundreds of broadcast-grade designs*.
  Vague or not, it is still a claim about amount, and it is the one the owner asked not to make. It
  now says what the designs are for: "Broadcast-grade designs for every part of a show."
- **`scripts/check-copy.mjs`** gained a `design-count` rule so the number cannot come back with the
  next catalog milestone.

Nothing else on a public surface carried a count. `docs.html`, `src/docs/`, `cli/README.md`,
`cli/plugin/README.md`, `scripts/prerender.mjs` (the per-template pages) and the legal pages were
all swept and were already clean.

## The guard

The copy gate is the right home for this: it already owns "text a stranger reads", it already runs
in `npm run build`, and it already has the per-file baseline that keeps a new rule from red-maining
the tree on the day it lands.

Three things had to change around the rule itself.

1. **The gate now scans `README.md`, `cli/README.md` and `cli/plugin/README.md`.** The repository
   front page and the two npm-published READMEs are read by strangers, which is exactly what this
   gate means by copy, and they were outside it. A `SCANNED` entry that names a file (rather than a
   directory) is always kept by the file filter, so the READMEs get in without every nested
   `AGENTS.md` coming with them.
2. **Markdown is scanned as plain text.** Running a `.md` through the JavaScript scanner would be
   actively wrong: a fenced block's backtick opens a template literal and a URL's `//` opens a line
   comment, either of which silently hides the rest of the file. All three READMEs were already
   free of the existing tells, so the baseline did not move.
3. **A rule can carry a `scope`.** `design-count` applies only to the surfaces that sell the
   catalog - the READMEs, `index.html`, `docs.html`, `src/landing`, `src/docs`, `src/components` -
   and deliberately not to `src/templates`. Those emitted comments carry the measurements a layout
   rule was decided from ("measured across the same 23 designs, ZERO newly wrapped lines"), and a
   number that is the evidence for a rule is the opposite of a number nobody asked for. Three of
   them tripped the rule on the first run; scoping is what lets it stay at a hard zero everywhere
   else instead of being baselined into a permanent exception. Every other rule is unscoped and
   still applies to every scanned file.

The pattern is two-to-four digits, a comma-grouped thousand, an optional `+`, or `dozens` /
`hundreds` / `thousands`, followed by up to two words and then a catalog noun. A single digit is
left alone on purpose: the home stat cards say "3 graphics" about the user's OWN library, and that
number is theirs and it is true.

**Mutation-tested.** With `507 designs across 22 categories` put back in the README, `Hundreds of
broadcast-grade designs` back in the landing page and `Over 500 templates` added to the CLI README,
the gate failed on all three files and named the line. `scripts/check-copy.test.mjs` covers the
rule, the scope in both directions, the single-digit case, the emitted-code case and the markdown
mode; the existing "every rule is covered by a test" assertion covers the new rule too.

## The intent that was preserved

The README count was originally put there so a stale number would disagree loudly with the build.
The stronger version of that intent is that no public number needs syncing at all, which is now the
case: nothing outside `docs/`, the handoffs and the internal gates carries a catalog count, and the
gate refuses a new one.

## Verified

`npm run build` (which includes `check:copy` and `node --test scripts/check-copy.test.mjs`).
