import { useEffect, useState } from 'react';
import { isBackendConfigured } from '../backend/config';
import { getSyncState, onSyncState, startAutoSync, syncNow, type SyncState } from '../backend/syncController';

/**
 * Topbar cloud-sync indicator (Era 5.2). Renders nothing in offline mode. When a backend is
 * configured it kicks off auto-sync and shows the live status; click to force a sync now.
 */
export default function SyncStatus() {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    if (!isBackendConfigured()) return;
    startAutoSync();
    return onSyncState(setState);
  }, []);

  // Offline mode, or configured-but-not-signed-in: show nothing (the offline UI is unchanged).
  if (!isBackendConfigured() || state.phase === 'offline') return null;

  const label =
    state.phase === 'syncing'
      ? 'Syncing…'
      : state.phase === 'error'
        ? 'Sync error'
        : 'Synced';
  const title =
    state.phase === 'error'
      ? state.detail ?? 'Sync failed'
      : state.phase === 'synced' && state.last
        ? `Synced — ${state.last.pushed} up, ${state.last.pulled} down${state.last.conflicts ? `, ${state.last.conflicts} conflicts kept` : ''}`
        : 'Click to sync now';

  return (
    <button
      className={`sync-status sync-${state.phase}`}
      title={title}
      onClick={() => void syncNow()}
      disabled={state.phase === 'syncing'}
    >
      <span className="sync-dot" />
      {label}
    </button>
  );
}
