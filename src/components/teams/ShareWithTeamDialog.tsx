// "Share with a team…" - THE ONE TEAM DOOR (docs/TEAMS_PLAN.md §6, mockup
// `docs/design/teams/teams-share-dialog.html`).
//
// Everything a team is reached from here: make one, read out its join code, see who is in it,
// rotate the code, leave, delete. There is deliberately no team entry in the topbar, no team
// section on Home and no team item in Settings - a user who never opens this dialog never sees
// the word "team" anywhere, which is the plan's §6 rule and the reason the door hangs off a
// PRODUCTION (the thing a team is for) rather than off the account.
//
// WHAT STAGE 3 DOES NOT DO, said here rather than discovered. Moving the production INTO the team
// is stage 4's verb: it writes `team_productions` and tombstones the personal record, and until
// the team-productions list exists (also stage 4) a moved production would leave the personal
// list and appear nowhere. So the primary action is present, disabled, and says why. Every
// control that is ENABLED here works end to end against the real RPCs from migration 0053.
//
// THE THREE SCREENS mirror the mockup: `pick` (choose a team, or start a new one), `create`
// (name it, and name yourself), `team` (the join code, the member list, leaving). They are one
// dialog rather than three because they are one errand.

import { useCallback, useEffect, useState } from 'react';
import { useAuthState } from '../auth/useAuthState';
import { useModalGate } from '../spaceKey';
import { copyLink } from '../home/copyLink';
import {
  createTeam,
  deleteTeam,
  joinTeamLink,
  leaveTeam,
  listMyTeams,
  listTeamMembers,
  rotateJoinCode,
  type Team,
  type TeamMember,
} from '../../backend/teams';
import { useTeamsUi } from './teamsUi';
import { useTeamsAvailable } from './useTeamsAvailable';
import TeamChip from './TeamChip';

/** A first guess at the name teammates should see, from the part of the address before the @.
 *  It is a PREFILL, never a submission: the field is shown and editable, so nobody's email
 *  local-part reaches a teammate's screen without them looking at it first. */
function suggestedDisplayName(email: string | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  return local.replace(/[._-]+/g, ' ').trim();
}

type Screen = 'pick' | 'create' | 'team';

export default function ShareWithTeamDialog() {
  const share = useTeamsUi((s) => s.share);
  const available = useTeamsAvailable();
  // Mounted at App level, so it must decide for itself whether it exists at all. Offline and
  // signed-out builds render nothing - no markup, no fetch, no Supabase chunk.
  if (!share || !available) return null;
  return <Dialog />;
}

function Dialog() {
  const share = useTeamsUi((s) => s.share)!;
  const close = useTeamsUi((s) => s.closeShare);
  const { user } = useAuthState();
  useModalGate(true);

  const [screen, setScreen] = useState<Screen>('pick');
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newTeamName, setNewTeamName] = useState('');
  const [displayName, setDisplayName] = useState(() => suggestedDisplayName(user?.email));

  const selected = teams?.find((t) => t.id === selectedId) ?? null;
  const iAmOwner = Boolean(selected && user && selected.ownerId === user.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // The team list is fetched every time the dialog opens: a teammate may have renamed the team
  // or rotated its code since this tab last looked, and a stale code is the one thing this
  // screen must never show.
  useEffect(() => {
    let stale = false;
    void listMyTeams().then((list) => {
      if (stale) return;
      setTeams(list);
      // Land on the team you are in when there is exactly one - the class case, where picking
      // from a list of one is a step that asks nothing.
      if (list.length === 1) setSelectedId(list[0].id);
    });
    return () => { stale = true; };
  }, []);

  const refreshMembers = useCallback((teamId: string) => {
    setMembers(null);
    void listTeamMembers(teamId).then(setMembers);
  }, []);

  useEffect(() => {
    if (screen === 'team' && selectedId) refreshMembers(selectedId);
  }, [screen, selectedId, refreshMembers]);

  const create = async () => {
    setBusy(true);
    setError(null);
    const { team, error: err } = await createTeam(newTeamName, displayName);
    setBusy(false);
    if (!team) {
      setError(err);
      return;
    }
    setTeams((list) => [...(list ?? []), team]);
    setSelectedId(team.id);
    // A team that exists but whose creator's membership row failed to write is still a team, and
    // the code screen is where it can be repaired - so this reports the problem and continues,
    // rather than pretending nothing was made.
    setError(err);
    setScreen('team');
  };

  const rotate = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const { code, error: err } = await rotateJoinCode(selected.id);
    setBusy(false);
    if (!code) {
      setError(err ?? 'The join code could not be rotated.');
      return;
    }
    setTeams((list) => (list ?? []).map((t) => (t.id === selected.id ? { ...t, joinCode: code } : t)));
    setCopied(false);
  };

  const leave = async () => {
    if (!selected || !user) return;
    setBusy(true);
    setError(null);
    const { error: err } = await leaveTeam(selected.id, user.id);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setTeams((list) => (list ?? []).filter((t) => t.id !== selected.id));
    setSelectedId(null);
    setScreen('pick');
  };

  const remove = async (member: TeamMember) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const { error: err } = await leaveTeam(selected.id, member.userId);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    refreshMembers(selected.id);
  };

  const destroy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const { error: err } = await deleteTeam(selected.id);
    setBusy(false);
    setConfirmDelete(false);
    if (err) {
      setError(err);
      return;
    }
    setTeams((list) => (list ?? []).filter((t) => t.id !== selected.id));
    setSelectedId(null);
    setScreen('pick');
  };

  const copy = () => {
    if (!selected) return;
    void copyLink(joinTeamLink(selected.joinCode)).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const title =
    screen === 'create' ? 'New team'
    : screen === 'team' && selected ? `Team “${selected.name}”`
    : `Share “${share.showName}” with a team`;

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        className="wz-modal team-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="share-with-team-dialog"
      >
        <div className="wz-header">
          <h2>{title}</h2>
          <button className="gallery-close" onClick={close} title="Close">✕</button>
        </div>

        <div className="team-dialog-body">
          {screen === 'pick' && (
            <PickScreen
              teams={teams}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNew={() => { setError(null); setScreen('create'); }}
            />
          )}

          {screen === 'create' && (
            <>
              <label className="team-field">
                <span>Team name</span>
                <input
                  autoFocus
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Arcada TV-26"
                  data-testid="new-team-name"
                />
              </label>
              <label className="team-field">
                <span>Your name, as teammates see it</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ben Karlsson"
                  data-testid="new-team-display-name"
                />
              </label>
              <p className="hint">
                Teammates see this name and nothing else - email addresses are never shown. You
                get a join code to read out or paste in the class chat.
              </p>
            </>
          )}

          {screen === 'team' && selected && (
            <>
              <div className="team-codewrap">
                <span className="team-codelabel">Join code</span>
                <div className="team-code mono" data-testid="team-join-code">{selected.joinCode}</div>
                <div className="team-linkrow">
                  <input readOnly value={joinTeamLink(selected.joinCode)} data-testid="team-join-link" />
                  <button onClick={copy} data-testid="copy-team-link">
                    {copied ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
              <p className="hint">
                Anyone in the team can pass the code on. {iAmOwner
                  ? 'Rotating it makes a new one and retires this one for joining - everyone already in the team stays.'
                  : 'Only the team owner can rotate it.'}
              </p>

              <div className="team-members" data-testid="team-members">
                {members === null && <p className="hint">Loading members…</p>}
                {members?.map((m) => (
                  <div className="team-member" key={m.userId}>
                    <span className="team-member-name">{m.displayName}</span>
                    <span className={`team-member-role${m.role === 'owner' ? ' owner' : ''}`}>
                      {m.userId === user?.id ? 'You' : m.role === 'owner' ? 'Owner' : 'Member'}
                    </span>
                    {iAmOwner && m.userId !== user?.id && (
                      <button
                        className="team-member-remove"
                        disabled={busy}
                        onClick={() => void remove(m)}
                        title={`Remove ${m.displayName} from the team`}
                        data-testid="remove-team-member"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {members?.length === 0 && <p className="hint">Nobody has joined yet.</p>}
              </div>
            </>
          )}

          {error && <p className="status-bad" data-testid="team-error">{error}</p>}
        </div>

        <div className="dlg-foot team-dialog-foot">
          {screen === 'pick' && (
            <>
              <button onClick={close}>Cancel</button>
              <div className="spacer" />
              <button
                disabled={!selected}
                onClick={() => { setError(null); setScreen('team'); }}
                data-testid="open-team-details"
              >
                Join code &amp; members
              </button>
              {/* Stage 4 (docs/TEAMS_PLAN.md §7) turns this on. It stays visible and disabled
                  rather than hidden, because the reason it is off is the answer to the question
                  the reader arrived with - and the sentence above the footer gives it. */}
              <button
                className="primary"
                disabled
                title="Moving a production to a team arrives with the team productions list"
                data-testid="move-to-team"
              >
                Move to team
              </button>
            </>
          )}
          {screen === 'create' && (
            <>
              <button onClick={() => { setError(null); setScreen('pick'); }}>Back</button>
              <div className="spacer" />
              <button
                className="primary"
                disabled={busy || !newTeamName.trim() || !displayName.trim()}
                onClick={() => void create()}
                data-testid="create-team"
              >
                {busy ? 'Creating…' : 'Create team'}
              </button>
            </>
          )}
          {screen === 'team' && selected && (
            <>
              <button onClick={() => { setError(null); setConfirmDelete(false); setScreen('pick'); }}>Back</button>
              <div className="spacer" />
              {iAmOwner ? (
                <>
                  <button disabled={busy} onClick={() => void rotate()} data-testid="rotate-team-code">
                    Rotate code
                  </button>
                  <button
                    className="destructive"
                    disabled={busy}
                    onClick={() => (confirmDelete ? void destroy() : setConfirmDelete(true))}
                    title="Delete the team. Its members lose it; productions it holds go with it."
                    data-testid="delete-team"
                  >
                    {confirmDelete ? 'Delete team?' : 'Delete team'}
                  </button>
                </>
              ) : (
                <button
                  className="destructive"
                  disabled={busy}
                  onClick={() => void leave()}
                  data-testid="leave-team"
                >
                  Leave team
                </button>
              )}
              <button className="primary" onClick={close}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PickScreen({
  teams,
  selectedId,
  onSelect,
  onNew,
}: {
  teams: Team[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <>
      {teams === null && <p className="hint">Loading your teams…</p>}
      {teams?.length === 0 && (
        <p className="hint" data-testid="no-teams">
          You are not in a team yet. Make one, and the join code it gives you is the whole
          invitation - read it out, or paste the link in the class chat.
        </p>
      )}
      {teams !== null && teams.length > 0 && (
        <div className="team-pick" role="radiogroup" aria-label="Your teams">
          {teams.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={selectedId === t.id}
              className={`team-pickrow${selectedId === t.id ? ' sel' : ''}`}
              onClick={() => onSelect(t.id)}
              data-testid="team-pickrow"
            >
              <span className="team-radio" />
              <TeamChip name={t.name} />
            </button>
          ))}
        </div>
      )}
      <button className="team-new" onClick={onNew} data-testid="new-team">＋ New team…</button>
      <p className="hint">
        A team owns productions, never libraries: joining shares nothing from anybody’s saved
        graphics. Every member can edit a team production’s rundown, republish its graphics and
        operate it.
      </p>
      {/* The honest half. It is a sentence rather than a disabled tooltip because the reader
          came here to move something, and a control that will not say why is worse than one
          that will. Delete this line and enable the button together, in stage 4. */}
      <p className="hint team-staged">
        Moving a production into a team arrives with the team productions list. For now this is
        where you set the team up and hand out its join code.
      </p>
    </>
  );
}
