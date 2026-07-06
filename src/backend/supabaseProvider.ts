// The cloud StorageProvider (Era 5.2): the `documents` table behind per-user RLS. Implements the
// same StorageProvider contract as LocalStorageProvider, so the sync engine treats both uniformly.
//
// Identity: packets/looks use their client-generated UUID as the row id (a valid uuid string, so it
// slots straight into the uuid PK) — the SAME id locally and in the cloud, which is what lets the
// sync engine reconcile by id. user_id defaults to auth.uid() on insert; RLS restricts every row to
// its owner, so one user can never read or write another's rows.
//
// 5.2a scope: the whole record body is stored inline in the `body` jsonb column. Large embedded
// assets (data-URL fonts/images) therefore travel inline for now — fine while there is no live data
// yet; 5.2b externalizes them to the `assets` Storage bucket (schema already in migration 0001)
// before any real deployment. A soft size warning flags oversized bodies meanwhile.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { toStoredRecord, type StorageProvider, type StoredRecord, type SyncKind } from './storage';

const TABLE = 'documents';
const BODY_WARN_BYTES = 500_000; // ~0.5 MB — above this, 5.2b asset externalization matters

interface DocumentRow {
  id: string;
  kind: SyncKind;
  name: string;
  body: unknown;
  deleted: boolean;
}

export class SupabaseProvider implements StorageProvider {
  private async client(): Promise<SupabaseClient> {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase is not configured.');
    return sb;
  }

  async list(kind: SyncKind): Promise<StoredRecord[]> {
    const sb = await this.client();
    // RLS scopes this to the signed-in user's rows automatically. Tombstones (deleted=true) are
    // included so the sync engine can propagate remote deletes.
    const { data, error } = await sb.from(TABLE).select('id, kind, name, body, deleted').eq('kind', kind);
    if (error) throw new Error(`Cloud list(${kind}) failed: ${error.message}`);
    const rows = (data ?? []) as DocumentRow[];
    return rows.map((row) => toStoredRecord(kind, row.id, row.body));
  }

  async get(kind: SyncKind, id: string): Promise<StoredRecord | null> {
    const sb = await this.client();
    const { data, error } = await sb
      .from(TABLE)
      .select('id, kind, name, body, deleted')
      .eq('kind', kind)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Cloud get(${kind}) failed: ${error.message}`);
    const row = data as DocumentRow | null;
    return row ? toStoredRecord(kind, row.id, row.body) : null;
  }

  async put(record: StoredRecord): Promise<void> {
    const sb = await this.client();
    const body = record.body as { name?: unknown };
    warnIfLarge(record);
    // user_id is omitted: the column defaults to auth.uid() on insert, and RLS blocks updating
    // anyone else's row. onConflict:'id' makes this an upsert keyed by the shared record id.
    const row = {
      id: record.id,
      kind: record.kind,
      name: typeof body.name === 'string' ? body.name : '',
      body: record.body,
      deleted: Boolean(record.deleted),
    };
    const { error } = await sb.from(TABLE).upsert(row, { onConflict: 'id' });
    if (error) throw new Error(`Cloud put(${record.kind}) failed: ${error.message}`);
  }

  async remove(kind: SyncKind, id: string): Promise<void> {
    // Direct removal (not used by the sync engine, which propagates deletes as tombstone puts).
    const sb = await this.client();
    const { error } = await sb.from(TABLE).delete().eq('kind', kind).eq('id', id);
    if (error) throw new Error(`Cloud remove(${kind}) failed: ${error.message}`);
  }
}

function warnIfLarge(record: StoredRecord): void {
  try {
    const size = JSON.stringify(record.body).length;
    if (size > BODY_WARN_BYTES && typeof console !== 'undefined') {
      console.warn(
        `[sync] ${record.kind} ${record.id} body is ~${Math.round(size / 1024)}KB inline. ` +
          'Era 5.2b moves embedded fonts/images to Storage to keep cloud rows small.',
      );
    }
  } catch {
    // Ignore measurement failures — never block a sync on a size check.
  }
}
