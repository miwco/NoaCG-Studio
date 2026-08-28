# 2026-08-28 - Browse type selection in the diagnostic scripts

Branch `claude/unruffled-jennings-7edd51`, commit `cf93ce10`.

## What was fixed

`scripts/spike-shelf-look.mjs` and `scripts/acceptance-pack.mjs` (the catalog section, ~line 272)
still drove the wizard's Browse type dropdown the pre-Option-A way: `selectOption(<bare group id>)`
plus a click on a member-category chip. Since the two-level dropdown landed (2026-08-28), option
values are `group:<id>` / `cat:<id>` and the chip row is gone, so both calls matched nothing.

Both scripts now resolve the option value exactly the way `e2e/_browse.ts` `resolveBrowseTarget`
does: `cat:<id>` when the category's group has more than one member, `group:<id>` for a one-member
shelf (which renders as a plain option for the group). The chip click is removed.

## Verification state

- `npx eslint` on both files: clean.
- Run-against-a-dev-server verification is STILL OWED. Both scripts are in `SWEEP_SCRIPTS`, a
  suite was live in the main checkout, so the runs were enqueued (j-0138 / j-0139). They drained
  after this session's preview dev server had gone away and both died on
  `net::ERR_CONNECTION_REFUSED at http://localhost:5290/app` - the failure is the missing server,
  not the fix, but neither script has actually been seen selecting the new option values.

## What's left

With a dev server up on this checkout's port (`preview_start {name: "dev"}`, port from
`node scripts/dev-port.mjs`), queue:

- `npm run queue -- "node scripts/spike-shelf-look.mjs"` - cheap, 4 screenshots; confirms the
  dropdown narrows to lower-third / stats / bug / topic shelves.
- `npm run queue -- "node scripts/acceptance-pack.mjs"` - heavy (full acceptance walk); only its
  catalog section exercises the changed code, so a targeted eyeball of the ig39 shots is enough.

Both are diagnostic scripts, not gates - nothing blocks on them.
