// The ONE gate for every team surface, so no component has to remember the offline posture.
//
// THE TRAP THIS EXISTS TO CLOSE. `useAuthState().signedIn` is TRUE offline - deliberately, so a
// misconfigured gate can never trap a user in an app that has no login at all. A team surface
// that read `signedIn` would therefore render its door in exactly the build that must grow zero
// team UI. Teams need a REAL session, which is `backendConfigured` AND `status === 'signed-in'`;
// nothing else is enough, and `loading` is not enough either - a door that appears a moment after
// the page settles is worse than one that appears with it.
//
// This gate is UX, not security: RLS is the boundary, and every verb in backend/teams.ts also
// dead-ends at `getSupabase()` returning null offline. Two independent reasons the offline build
// cannot reach a team is the point, not redundancy.
//
// Signed out with a backend renders NOTHING rather than a SignInPrompt, per docs/TEAMS_PLAN.md
// §6: "a user who never opens it never sees the word team anywhere". The one exception is the
// join LINK - someone arriving on a teacher's `#/join-team/<code>` has already been told teams
// exist, so THAT surface prompts to sign in (JoinTeamDialog).

import { useAuthState } from '../auth/useAuthState';

export function useTeamsAvailable(): boolean {
  const { backendConfigured, status } = useAuthState();
  return backendConfigured && status === 'signed-in';
}
