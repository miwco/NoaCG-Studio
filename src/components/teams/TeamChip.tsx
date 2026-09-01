// The team chip (docs/TEAMS_PLAN.md §6, `docs/design/teams/` mockups): an amber-outlined badge
// carrying a team's name, wherever something belongs to a team rather than to one person.
//
// One component rather than a class each surface remembers, because the chip's whole job is to
// look identical in three places - a production card, the production page header, and the share
// dialog - so a reader learns it once. Stage 3 shows it in the dialog; stage 4 attaches the same
// component to team production cards and the production header.

import { IconUsers } from '../icons';

export default function TeamChip({ name, title }: { name: string; title?: string }) {
  return (
    <span className="team-chip" title={title ?? `Team: ${name}`} data-testid="team-chip">
      <IconUsers size={13} />
      {name}
    </span>
  );
}
