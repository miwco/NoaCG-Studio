---
v: 1
source: review
raised: 2026-09-05
state: unstarted
---
# A rejected template file leaves an error line with no way to clear it

**Filed:** 2026-09-05, from the row H review (multi-file drop notice). Pre-existing, so it was
reported rather than fixed inside that change.

## What happens

On the Import graphic step, drop a `.html` or `.zip` that `importTemplateFile` rejects.
`CreationWizard.tsx` sets `importedFileError` and leaves `importedFile` null, so the red line
appears and the template card - which owns the only ✕ that clears it - never renders.

`importedFileError` is then cleared by exactly three things: a fresh `onTemplateFile`,
`onClearTemplate`, and reopening the walk. **Neither `onArt` nor `onSvg` clears it.** So the user
drops a good PNG next, the artwork imports, the design card appears, and the error about the
rejected zip is still sitting on the step describing a file that is no longer part of anything.

## Why it matters beyond the stale line

Anything that reasonably gates on "is there a file error right now" inherits the staleness. The
row H notice hit this: gating it on `fileError` would have hidden the multi-file notice from the
next drop, which is the exact silence that notice exists to end. It works around the staleness by
gating only when the notice's own file was the template that failed (`ImportDesignStep.tsx`, the
comment above the notice). That workaround should disappear when this is fixed.

## The fix

Clear `importedFileError` in `onArt` and `onSvg` in `CreationWizard.tsx`, next to the `patch(...)`
calls that replace the artwork - a successful import means the previous file's complaint is over.
Then simplify the notice guard in `ImportDesignStep.tsx` back to a plain `!fileError` and drop the
`fromTemplate` flag from `multiDropMessage`'s return.

Worth checking in the same pass whether a rejected template should offer its own way out rather
than relying on the next drop, since today there is no button at all.
