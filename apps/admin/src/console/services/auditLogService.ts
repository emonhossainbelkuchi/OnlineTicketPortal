import { api } from '@/lib/api';

// Real backend contract (AuditLogsController):
//   GET api/AuditLogs        [Admin/Staff only] (empty [] otherwise)
//   GET api/AuditLogs/{id}   [Admin/Staff only]
// No POST/PUT/DELETE — a compliance-style before/after trail, never client-writable.
// Nothing in the codebase writes here yet (planned as a cross-cutting SaveChanges interceptor).

export interface AuditLogResponseDto {
  id: string;
  userId?: string | null;
  // Resolved server-side by AuditLogsController (Chunk 9 task 4) — both null for a
  // system/background action (userId itself null) or a since-deleted account.
  actorUserName?: string | null;
  actorFullName?: string | null;
  entityName: string;
  entityId: string;
  action: string;
  oldValuesJson?: string | null;
  newValuesJson?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAtUtc: string;
}

/** Best-effort display name for the "Actor" column — full name, falling back to username, falling back to "System" for a null userId, falling back to the raw id. */
export function actorDisplayName(row: { userId?: string | null; actorFullName?: string | null; actorUserName?: string | null }): string {
  if (!row.userId) return 'System';
  return row.actorFullName || row.actorUserName || row.userId;
}

export const AUDIT_LOG_UPDATED_EVENT = 'audit_logs_updated';
const CACHE_KEY = 'ticket_portal_audit_logs_cache';

function readCache(): AuditLogResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading audit logs cache:', err);
  }
  return [];
}

function writeCache(list: AuditLogResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing audit logs cache:', err);
  }
  window.dispatchEvent(new CustomEvent(AUDIT_LOG_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: AuditLogResponseDto) {
  const list = readCache();
  const idx = list.findIndex((a) => a.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredAuditLogs(): AuditLogResponseDto[] {
  return readCache();
}

/** GET api/AuditLogs — real backend call. Admin/Staff only. */
export async function getAllAuditLogs(): Promise<AuditLogResponseDto[]> {
  const res = await api.get('api/AuditLogs');
  const list: AuditLogResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/AuditLogs/{id} — real backend call. */
export async function getAuditLogById(id: string): Promise<AuditLogResponseDto | undefined> {
  try {
    const res = await api.get(`api/AuditLogs/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}