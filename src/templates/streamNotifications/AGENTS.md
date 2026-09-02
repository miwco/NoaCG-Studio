# src/templates/streamNotifications - the stream event alerts

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Minted on 2026-09-02, when the category index found this was the one category the parent
contract had never described. Add a RULE here; leave the reasoning in the code's own comments.

## streamNotifications/ - sn01…sn04

sn01…sn04 (prefix `stream-notification`, `TemplateType 'stream-notification'`), registered in
`catalog.ts` and modelled by the `event-notification` graphic type
(`types/eventNotification.ts`). One provider-neutral event contract worn by four visual designs.

**A follower, member, donation, gift and raid are DATA, not states.** The machine owns only the
shared lifecycle - hidden -> enter -> hold -> exit - and the event kind rides as a field. That is
the catalog-wide "parameterize with data, not states" rule (root `AGENTS.md`, the state-machine
model) applied to a category where the temptation to mint five near-identical states is strongest.

**It needs no provider and must stay that way.** `queueNotification()` in `shared.ts` is the
integration seam a future provider adapter would use; until one exists the template is fully
operable through ordinary SPX fields and the generated control page. A design here never gains a
mandatory service dependency - see the client-agnostic pillar in the root contract.
