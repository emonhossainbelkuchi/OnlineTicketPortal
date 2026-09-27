import { api } from '@/lib/api';

// Real backend contract (LoginHistoriesController):
//   GET api/LoginHistories        [Authorize]
//     -> LoginHistoryResponseDto[]
//     A plain user (not Admin/Staff) gets ONLY THEIR OWN login attempts, scoped server-side —
//     this is a normal "recent security activity" view, not restricted to nothing. Admin/Staff
//     see everyone's.
//   GET api/LoginHistories/{id}   [Authorize] -> 403 if it's someone else's and you're not
//     Admin/Staff.
// Read-only, no POST/PUT/DELETE anywhere: a security trail that a client could edit isn't a
// trail — this is written only by AccountController.Login on every attempt, success or failure.

export interface LoginHistoryResponseDto {
  id: string;
  userId: string;
  // Resolved server-side by LoginHistoriesController (Chunk 9 task 4) — null when the account
  // has since been deleted.
  actorUserName?: string | null;
  actorFullName?: string | null;
  loginAtUtc: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
}

/** Best-effort display name for the "Actor" column — full name, falling back to username, falling back to the raw id. */
export function actorDisplayName(row: { userId: string; actorFullName?: string | null; actorUserName?: string | null }): string {
  return row.actorFullName || row.actorUserName || row.userId;
}

const POLL_INTERVAL_MS = 15000;

/** GET api/LoginHistories — server-side scoped: own logins for a plain user, everyone's for Admin/Staff. */
export async function getAllLoginHistories(): Promise<LoginHistoryResponseDto[]> {
  const res = await api.get('api/LoginHistories');
  return res.data || [];
}

/** GET api/LoginHistories/{id} — 403/404 propagate as thrown errors. */
export async function getLoginHistoryById(id: string): Promise<LoginHistoryResponseDto | undefined> {
  try {
    const res = await api.get(`api/LoginHistories/${id}`);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/**
 * Polling loop for "realtime" — no push/websocket endpoint exists for this feed, so periodic
 * re-fetch is the honest way to reflect a new login (e.g. someone logging in from another
 * device right now) without a manual refresh. Returns an unsubscribe function.
 */
export function subscribeToLoginHistoryPolling(onData: (list: LoginHistoryResponseDto[]) => void): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const data = await getAllLoginHistories();
      if (!cancelled) onData(data);
    } catch {
      // transient poll errors are silently retried on the next tick
    }
  };
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

/** Best-effort UA parse for a friendlier "Device" column — not a real UA parser library. */
export function summarizeUserAgent(ua?: string | null): string {
  if (!ua) return 'Unknown device';
  const lower = ua.toLowerCase();
  let os = 'Unknown OS';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  let browser = 'Unknown browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari';

  return `${browser} on ${os}`;
}
