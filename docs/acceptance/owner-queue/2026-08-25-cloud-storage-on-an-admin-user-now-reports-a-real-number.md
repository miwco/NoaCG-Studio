---
kind: walk
date: 2026-08-25
---
# "Cloud storage" on an /admin user now reports a real number

(2026-08-25). It read 0 for
every account, because it summed a `public.assets` table nothing has ever written; migration
0052 removed the table and the read went to the `user-assets` bucket, where the bytes are.
Route: `/admin` -> Users -> your own account -> Usage -> the CLOUD STORAGE tile. It should
read **9.1 MB**, not 0 - that is 9,098,204 bytes across 23 objects, measured against the
production bucket on 2026-08-25. Nothing enforces on the figure; the 50 MB ceiling is a
separate Storage policy.
**Already checked end to end on staging**, since /admin needs your session and I have none:
an account there with exactly 1,750,000 bytes rendered `1.8 MB` in that tile, correctly
aligned in the stat grid. So this item is really asking whether the number is worth having
on that page at all, not whether it works.
