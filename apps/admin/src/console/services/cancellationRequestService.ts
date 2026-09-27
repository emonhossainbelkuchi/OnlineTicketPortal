import { api, ApiError } from '@/lib/api';
import type {
  CancellationRequestResponseDto,
  CancellationRequestDisplayDto,
  BookingSummary,
  UserSummary,
} from '@/types/cancellationRequest.types';

export type { CancellationRequestResponseDto, CancellationRequestDisplayDto };

// ------------------------------------------------------------------
// api/CancellationRequests is real (CancellationRequestsController).
// GetAll/GetById are role-scoped server-side (Admin/platform-Staff see
// everything, an operator's own Staff/Operator sees only that operator's
// bookings, a Customer sees only their own) — this file never re-implements
// that filtering. There's no raw PUT/DELETE by design: a request only ever
// moves Requested -> Approve/Reject -> Complete via the three action
// endpoints below.
// ------------------------------------------------------------------

let requestsCache: CancellationRequestResponseDto[] = [];
let cacheWarmed = false;

const bookingCache = new Map<string, BookingSummary | null>();
const userCache = new Map<string, UserSummary | null>();

function normalizeList(raw: any): CancellationRequestResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

async function refreshRequestsCache(): Promise<CancellationRequestResponseDto[]> {
  const res = await api.get('api/CancellationRequests');
  requestsCache = normalizeList(res.data);
  cacheWarmed = true;
  return requestsCache;
}

if (typeof window !== 'undefined') {
  refreshRequestsCache().catch(() => {
    /* first paint just shows empty until a page explicitly retries */
  });
}

export function getStoredCancellationRequests(): CancellationRequestResponseDto[] {
  return requestsCache;
}

export function isCancellationRequestsCacheWarmed(): boolean {
  return cacheWarmed;
}

export async function getAllCancellationRequests(): Promise<CancellationRequestResponseDto[]> {
  return refreshRequestsCache();
}

export async function getCancellationRequestById(id: string): Promise<CancellationRequestResponseDto | undefined> {
  try {
    const res = await api.get(`api/CancellationRequests/${id}`);
    return res.data as CancellationRequestResponseDto;
  } catch {
    return requestsCache.find((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  }
}

/** POST /api/CancellationRequests/{id}/approve — omit amount to accept the policy's own RequestedRefundAmount. */
export async function approveCancellationRequest(
  id: string,
  approvedRefundAmount?: number | null,
  remarks?: string | null
): Promise<CancellationRequestResponseDto> {
  const res = await api.post(`api/CancellationRequests/${id}/approve`, {
    approvedRefundAmount: approvedRefundAmount ?? null,
    remarks: remarks || null,
  });
  const updated = res.data as CancellationRequestResponseDto;
  requestsCache = requestsCache.map((r) => (r.id === id ? updated : r));
  notifyCancellationRequestsChanged();
  return updated;
}

/** POST /api/CancellationRequests/{id}/reject — RejectedReason is required. */
export async function rejectCancellationRequest(id: string, rejectedReason: string): Promise<void> {
  await api.post(`api/CancellationRequests/${id}/reject`, { rejectedReason });
  requestsCache = requestsCache.map((r) => (r.id === id ? { ...r, status: 'Rejected', rejectedReason } : r));
  notifyCancellationRequestsChanged();
}

/** POST /api/CancellationRequests/{id}/complete — only succeeds once the linked Refund has actually Succeeded. */
export async function completeCancellationRequest(id: string): Promise<CancellationRequestResponseDto> {
  const res = await api.post(`api/CancellationRequests/${id}/complete`);
  const updated = res.data as CancellationRequestResponseDto;
  requestsCache = requestsCache.map((r) => (r.id === id ? updated : r));
  notifyCancellationRequestsChanged();
  return updated;
}

// ---- Name resolution (BookingId -> booking label, *ByUserId -> user) ----

async function resolveBooking(bookingId: string): Promise<BookingSummary | null> {
  if (bookingCache.has(bookingId)) return bookingCache.get(bookingId)!;
  try {
    const res = await api.get(`api/Bookings/${bookingId}`);
    const booking: BookingSummary = res.data;
    bookingCache.set(bookingId, booking);
    return booking;
  } catch {
    bookingCache.set(bookingId, null);
    return null;
  }
}

// Best-effort — no confirmed user-by-id endpoint exists in this codebase yet
// (AdminController only exposes create-staff / assign-role, not a getter).
// Falls back to a short id.
async function resolveUser(userId: string): Promise<UserSummary | null> {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const res = await api.get(`api/Users/${userId}`);
    const user: UserSummary = res.data;
    userCache.set(userId, user);
    return user;
  } catch {
    userCache.set(userId, null);
    return null;
  }
}

function shortId(id: string): string {
  return id ? id.slice(0, 8) : '—';
}

function bookingLabelFrom(booking: BookingSummary | null, fallbackId: string): string {
  if (!booking) return `Booking #${shortId(fallbackId)}`;
  return booking.bookingCode || booking.bookingNumber || `Booking #${shortId(booking.id)}`;
}

function userLabelFrom(user: UserSummary | null, userId?: string | null): string {
  if (!userId) return '-';
  if (!user) return `User #${shortId(userId)}`;
  return user.fullName || user.name || user.email || `User #${shortId(userId)}`;
}

/** Enriches raw CancellationRequests with human-readable booking/user labels for the UI. */
export async function enrichCancellationRequests(
  items: CancellationRequestResponseDto[]
): Promise<CancellationRequestDisplayDto[]> {
  return Promise.all(
    items.map(async (item) => {
      const [booking, requestedByUser, approvedByUser] = await Promise.all([
        resolveBooking(item.bookingId),
        item.requestedByUserId ? resolveUser(item.requestedByUserId) : Promise.resolve(null),
        item.approvedByUserId ? resolveUser(item.approvedByUserId) : Promise.resolve(null),
      ]);

      return {
        ...item,
        bookingLabel: bookingLabelFrom(booking, item.bookingId),
        requestedByLabel: userLabelFrom(requestedByUser, item.requestedByUserId),
        approvedByLabel: userLabelFrom(approvedByUser, item.approvedByUserId),
      };
    })
  );
}

// ------------------------------------------------------------------
// Realtime plumbing — BroadcastChannel + window event + polling, same
// shape used across terminalService/seatHoldService, so new/updated
// cancellation requests show up live across tabs.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_cancellation_requests_sync';
let requestsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    requestsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    requestsBroadcast = null;
  }
}

export function notifyCancellationRequestsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('cancellation_requests_updated'));
  } catch {}
  try {
    requestsBroadcast?.postMessage({ type: 'CANCELLATION_REQUESTS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToCancellationRequests(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('cancellation_requests_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'CANCELLATION_REQUESTS_CHANGED') callback();
  };
  requestsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('cancellation_requests_updated', handler);
    requestsBroadcast?.removeEventListener('message', bcHandler);
  };
}

/** Polls api/CancellationRequests every `intervalMs` (default 4s) with fresh, enriched rows. */
export function startCancellationRequestsPolling(
  onData: (items: CancellationRequestDisplayDto[]) => void,
  intervalMs = 4000
): () => void {
  let cancelled = false;

  async function tick() {
    try {
      const raw = await refreshRequestsCache();
      const enriched = await enrichCancellationRequests(raw);
      if (!cancelled) {
        onData(enriched);
        notifyCancellationRequestsChanged();
      }
    } catch {
      /* keep polling even if one tick fails */
    }
  }

  tick();
  const handle = window.setInterval(tick, intervalMs);
  return () => {
    cancelled = true;
    window.clearInterval(handle);
  };
}

export function getCurrentUserRole(): 'Admin' | 'Staff' | 'Operator' | 'User' | 'Guest' {
  if (typeof window === 'undefined') return 'Admin';
  const role = localStorage.getItem('auth_role');
  if (role === 'Admin' || role === 'Staff' || role === 'Operator' || role === 'User' || role === 'Guest') {
    return role;
  }
  return 'Admin';
}

export function extractErrorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  return apiErr?.message || (err as any)?.message || 'Something went wrong. Please try again.';
}
