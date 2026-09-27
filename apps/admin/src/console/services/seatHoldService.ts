import { api, ApiError } from '@/lib/api';
import type {
  SeatHoldResponseDto,
  SeatHoldDisplayDto,
  UserSummary,
} from '@/types/seatHold.types';
import type { TripResponseDto, BusSummary } from '@/types/seatHoldItem.types';

export type { SeatHoldResponseDto, SeatHoldDisplayDto };

// ------------------------------------------------------------------
// api/SeatHolds is real (SeatHoldsController). GetAll/GetById/GetByToken are
// role-scoped server-side (Admin/platform-Staff see everything, an operator's
// own Staff/Operator sees only that operator's trips, everyone else only their
// own holds) — this file never re-implements that filtering. The only writes
// this admin UI needs are none for Create (that's the customer checkout flow)
// and POST /{id}/release, which frees an active hold early.
//
// Same cache + BroadcastChannel + polling pattern as terminalService /
// seatHoldItemService — holds expire in minutes, so the list needs to move on
// its own without a page refresh.
// ------------------------------------------------------------------

let holdsCache: SeatHoldResponseDto[] = [];
let cacheWarmed = false;

const tripCache = new Map<string, TripResponseDto | null>();
const busCache = new Map<string, BusSummary | null>();
const userCache = new Map<string, UserSummary | null>();

function normalizeList(raw: any): SeatHoldResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

async function refreshHoldsCache(): Promise<SeatHoldResponseDto[]> {
  const res = await api.get('api/SeatHolds');
  holdsCache = normalizeList(res.data);
  cacheWarmed = true;
  return holdsCache;
}

if (typeof window !== 'undefined') {
  refreshHoldsCache().catch(() => {
    /* first paint just shows empty until a page explicitly retries */
  });
}

export function getStoredSeatHolds(): SeatHoldResponseDto[] {
  return holdsCache;
}

export function isSeatHoldsCacheWarmed(): boolean {
  return cacheWarmed;
}

export async function getAllSeatHolds(): Promise<SeatHoldResponseDto[]> {
  return refreshHoldsCache();
}

export async function getSeatHoldById(id: string): Promise<SeatHoldResponseDto | undefined> {
  try {
    const res = await api.get(`api/SeatHolds/${id}`);
    return res.data as SeatHoldResponseDto;
  } catch {
    return holdsCache.find((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  }
}

export async function getSeatHoldByToken(holdToken: string): Promise<SeatHoldResponseDto | undefined> {
  const res = await api.get(`api/SeatHolds/by-token/${holdToken}`);
  return res.data as SeatHoldResponseDto;
}

/** POST /api/SeatHolds/{id}/release — frees an active hold early. */
export async function releaseSeatHold(id: string): Promise<void> {
  await api.post(`api/SeatHolds/${id}/release`);
  holdsCache = holdsCache.map((h) => (h.id === id ? { ...h, status: 'Released', secondsRemaining: 0 } : h));
  notifySeatHoldsChanged();
}

// ---- Name resolution (Trip -> tripCode/time, Trip.busId -> Bus, HeldByUserId -> user) ----

async function resolveTrip(tripId: string): Promise<TripResponseDto | null> {
  if (tripCache.has(tripId)) return tripCache.get(tripId)!;
  try {
    const res = await api.get(`api/Trips/${tripId}`);
    const trip: TripResponseDto = res.data;
    tripCache.set(tripId, trip);
    return trip;
  } catch {
    tripCache.set(tripId, null);
    return null;
  }
}

async function resolveBus(busId: string): Promise<BusSummary | null> {
  if (busCache.has(busId)) return busCache.get(busId)!;
  try {
    const res = await api.get(`api/Buses/${busId}`);
    const bus: BusSummary = res.data;
    busCache.set(busId, bus);
    return bus;
  } catch {
    busCache.set(busId, null);
    return null;
  }
}

// Best-effort: no confirmed Users/AdminUsers-by-id endpoint shape was given,
// so this tries api/Users/{id} and falls back to a short id on any mismatch.
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

function tripLabelFrom(trip: TripResponseDto | null, fallbackId: string): string {
  if (!trip) return `Trip #${shortId(fallbackId)}`;
  const dep = trip.departureTimeUtc ? new Date(trip.departureTimeUtc).toLocaleString() : '';
  return dep ? `${trip.tripCode} · ${dep}` : trip.tripCode;
}

function busLabelFrom(bus: BusSummary | null, fallbackId: string): string {
  if (!bus) return fallbackId ? `Bus #${shortId(fallbackId)}` : '-';
  if (bus.registrationNumber) return bus.registrationNumber;
  if (bus.brand || bus.model) return [bus.brand, bus.model].filter(Boolean).join(' ');
  return `Bus #${shortId(bus.id)}`;
}

function heldByLabelFrom(user: UserSummary | null, userId?: string | null): string {
  if (!userId) return 'Guest';
  if (!user) return `User #${shortId(userId)}`;
  return user.fullName || user.name || user.email || `User #${shortId(userId)}`;
}

/** Enriches raw SeatHolds with human-readable trip/bus/user labels for the UI. */
export async function enrichSeatHolds(holds: SeatHoldResponseDto[]): Promise<SeatHoldDisplayDto[]> {
  return Promise.all(
    holds.map(async (hold) => {
      const [trip, user] = await Promise.all([
        resolveTrip(hold.tripId),
        hold.heldByUserId ? resolveUser(hold.heldByUserId) : Promise.resolve(null),
      ]);
      const bus = trip?.busId ? await resolveBus(trip.busId) : null;

      return {
        ...hold,
        tripLabel: tripLabelFrom(trip, hold.tripId),
        busLabel: busLabelFrom(bus, trip?.busId || ''),
        heldByLabel: heldByLabelFrom(user, hold.heldByUserId),
      };
    })
  );
}

// ------------------------------------------------------------------
// Realtime plumbing — BroadcastChannel + window event (same shape as
// terminalService/seatHoldItemService) plus polling, since holds change
// state on their own (expiry) with nothing else in the app to trigger a
// broadcast.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_seatholds_sync';
let seatHoldsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    seatHoldsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    seatHoldsBroadcast = null;
  }
}

export function notifySeatHoldsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('seatholds_updated'));
  } catch {}
  try {
    seatHoldsBroadcast?.postMessage({ type: 'SEATHOLDS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToSeatHolds(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('seatholds_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'SEATHOLDS_CHANGED') callback();
  };
  seatHoldsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('seatholds_updated', handler);
    seatHoldsBroadcast?.removeEventListener('message', bcHandler);
  };
}

/**
 * Polls api/SeatHolds every `intervalMs` (default 5s). Calls `onData` with
 * fresh, enriched rows every tick and fires the broadcast/event. Returns a
 * cleanup fn. The per-second countdown itself is computed client-side in the
 * page (from holdExpiresAtUtc) so the timer doesn't need a network round trip
 * every second — only the status/list membership needs the 5s poll.
 */
export function startSeatHoldsPolling(
  onData: (holds: SeatHoldDisplayDto[]) => void,
  intervalMs = 5000
): () => void {
  let cancelled = false;

  async function tick() {
    try {
      const raw = await refreshHoldsCache();
      const enriched = await enrichSeatHolds(raw);
      if (!cancelled) {
        onData(enriched);
        notifySeatHoldsChanged();
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

export function extractErrorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  return apiErr?.message || (err as any)?.message || 'Something went wrong. Please try again.';
}
