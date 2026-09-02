---
kind: walk-p
date: 2026-09-02
---

# The AGENTS.md cuts I am asking you to rule on (2026-09-02)

**Route, under a minute.** Nothing to click. Run `npm run check:shared-instructions` and read the
list it prints, then read the five proposals below and say yes or no to each. You said on
2026-09-01 that for the next few months you are the authority on what gets condensed or removed
from any `AGENTS.md`, so this session moved content and proposed every deletion instead of taking
one.

## What already happened, without needing you

Moving a section into the one directory it describes needs no ruling: the people editing that code
still load it, and every sibling stops paying for it. That alone did this:

| | before | after |
|---|---|---|
| chains printing the 80% warning | 17 | 10 |
| tightest template chain | 92.1% | 86.0% |
| `src/ai/pro` | 88.9% | 83.5% |
| `src/ai/lite` | 86.8% | 81.4% |

Twenty template categories and four `src/ai` subdirectories now carry their own contract. **No
prose was deleted and none was rewritten** - the paragraphs moved verbatim.

One honest wrinkle in that first row: it is 10 and not 9 because `endCredits` was sitting 21 bytes
under the warning line and the index rows I added pushed it over. I did not trim the rows to get
the number back, because that is gaming a measurement rather than buying headroom. Cuts 1 and 2
below both shrink the file that would take it back under.

## Why I still need you

Relocation is now exhausted. Two walls:

**The wizard chain has 1470 bytes free (98.7%) and no move left in it.** Its step rules and its
shell rules share `draft.ts`, `WizardPreview` and `CreationWizard` state throughout, so every
section binds in both places; and its files are already in `steps/`, where pushing them deeper buys
nothing (a chain is measured to its leaf). This is the chain that will red-gate the next branch
that touches it.

**The rest is duplication and measurement narrative**, which is a judgement about what a contract
may forget - yours, not mine.

## The five cuts

Sizes are the measured size of the whole section. The saving is my estimate of the part I would
cut, and I would come back with the exact number before touching anything.

**1. The Browse storefront, written twice.** `src/templates/AGENTS.md` "THE STOREFRONT'S SHAPE"
(2742 bytes) and `src/components/wizard/AGENTS.md`'s Browse block state the SAME 2026-08-27 Option
A decision: both levels in one list, no `<optgroup>`, no "All <shelf>" row, no member-category chip
row, `group:` / `cat:` values, your 2026-08-28 walk. Two contracts, one decision, and they will
drift. **Cut the templates copy to the id-registry pointer, keep the wizard's** - the step is where
it is drawn. Saves ~2.2 KB on 13 chains. **Lost:** a session working only in `src/templates/` stops
reading how the facets it feeds are presented.

**2. "THE STAGE" measurement narratives** (5005 bytes) - its own first line already says the full
contract is `docs/FOOTPRINT_STABILITY.md`. Two long stories sit inside it: the 2026-08-24 hunt for
three ways a reserve was measured wrong, and the 2026-08-23 line-box-versus-content-box finding.
**Keep the HUG/FIXED rule, the lt64/lt66 exceptions, the mechanism and the gate names; cut the two
stories to a pointer.** Saves ~2 KB on 13 chains. **Lost:** the reasoning is one file-open away
instead of always loaded.

**3. The wizard's Import-graphic and SVG block** (10741 bytes) - it cites
`docs/SVG_IMPORT_PLAN.md` §3, §6a, §6b, §6c throughout and then restates them. **Keep every rule
and every "this is what broke" line; cut the step-by-step narrative to the plan's section
pointers.** Saves ~4 KB on the one chain that needs it most. **Lost:** the SVG flow's reasoning
stops loading for a wizard session; it stays a named section away.

**4. The wizard's Pro engine restatement** (3841 bytes) - the file itself says "The PIPELINES
behind Lite and Pro are `src/ai/AGENTS.md`'s contract; what belongs here is what each tier does to
this STEP", then describes the engine anyway. **Keep the door, the package question, the two rules
that live outside the step; cut the engine description.** Saves ~1.5 KB on the tightest chain.
**Lost:** nothing that is not in `src/ai/pro/AGENTS.md` - but I would be trusting that, and you may
not want to.

**5. Two root-file trims, which help ALL 51 chains** - the only lever that reaches the wizard
without touching it. The CI-verdict narratives in "Verifying changes" rule 4 (1476 bytes: the
timeout-is-not-a-verdict and green-is-not-a-verdict stories, both held by `docs/VERIFICATION.md`)
and the `db:push` paragraph in "Git" (1148 bytes, which names `supabase/AGENTS.md` as authoritative
in its own text). **Keep both rules as rules; cut the stories to their pointers.** Saves ~1.5 KB on
every chain in the repository. **Lost:** the most important one here is the CI narrative - it is
the reason people stopped mis-reading a cancelled run as a green one, and a rule without its story
is easier to argue with.

## What I would do with a no

Nothing breaks. The chains stay where the table above leaves them, the wizard chain keeps its 1470
bytes, and the next branch that adds a paragraph to it gets red-gated and comes back to you with
the same question against a worse number. The other route, if you would rather not cut prose at
all, is to reorganize `src/components/wizard/` so its steps stop sharing shell state - that is real
code work and a separate row.

**Not in this row:** making the 80% warning FAIL the build at 99%. That is a build gate and it has
to land after the headroom exists, which this wave measured it cannot promise
(`docs/backlog/wave-last-landing-unenforceable.md`). It is filed as its own row.
