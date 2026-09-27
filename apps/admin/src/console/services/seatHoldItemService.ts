import { api, ApiError } from '@/lib/api';
import type {
  SeatHoldItemResponseDto,
  SeatHoldItemDisplayDto,
  SeatHoldSummary,
  TripResponseDto,
  BusSummary,
} from '@/types/seatHoldItem.types';

export type { SeatHoldItemResponseDto, SeatHoldItemDisplayDto };

// ------------------------------------------------------------------
// api/SeatHoldItems is real (SeatHoldItemsController) and READ-ONLY —
// items are only ever written as a side effect of SeatHoldService.HoldSeatsAsync.
// GetAll/GetById are role-scoped server-side, so this file just calls the
// endpoint and trusts what comes back — it never re-implements that filtering.
//
// Same cache + BroadcastChannel + polling pattern as terminalService, so every
// open SeatHoldItemsList stays in sync across tabs and refreshes on its own
// (seat holds expire in seconds, so this list needs to move).
// ------------------------------------------------------------------

let itemsCache: SeatHoldItemResponseDto[] = [];
let cacheWarmed = false;

// TripSeat has no standalone endpoint — it only exists nested inside its
// parent Trip's `tripSeats` array (TripResponseDto). So we cache whole Trips
// (keyed by tripId) and look the seat up inside that array.
const seatHoldCache = new Map<string, SeatHoldSummary | null>();
const tripCache = new Map<string, TripResponseDto | null>();
const busCache = new Map<string, BusSummary | null>();

function normalizeList(raw: any): SeatHoldItemResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

async function refreshItemsCache(): Promise<SeatHoldItemResponseDto[]> {
  const res = await api.get('api/SeatHoldItems');
  itemsCache = normalizeList(res.data);
  cacheWarmed = true;
  return itemsCache;
}

if (typeof window !== 'undefined') {
  refreshItemsCache().catch(() => {
    /* first paint just shows empty until a page explicitly retries */
  });
}

export function getStoredSeatHoldItems(): SeatHoldItemResponseDto[] {
  return itemsCache;
}

export function isSeatHoldItemsCacheWarmed(): boolean {
  return cacheWarmed;
}

export async function getAllSeatHoldItems(): Promise<SeatHoldItemResponseDto[]> {
  return refreshItemsCache();
}

export async function getSeatHoldItemById(id: string): Promise<SeatHoldItemResponseDto | undefined> {
  try {
    const res = await api.get(`api/SeatHoldItems/${id}`);
    return res.data as SeatHoldItemResponseDto;
  } catch {
    return itemsCache.find((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  }
}

// ---- Name resolution ----
// SeatHoldId -> SeatHold (gives TripId + Status) -> Trip (gives TripCode,
// times, BusId, and the TripSeats array to pull the seat number out of) ->
// Bus (gives which physical bus is running it).

async function resolveSeatHold(seatHoldId: string): Promise<SeatHoldSummary | null> {
  if (seatHoldCache.has(seatHoldId)) return seatHoldCache.get(seatHoldId)!;
  try {
    const res = await api.get(`api/SeatHolds/${seatHoldId}`);
    const summary: SeatHoldSummary = res.data;
    seatHoldCache.set(seatHoldId, summary);
    return summary;
  } catch {
    seatHoldCache.set(seatHoldId, null);
    return null;
  }
}

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

function shortId(id: string): string {
  return id ? id.slice(0, 8) : '—';
}

function busLabelFrom(bus: BusSummary | null, fallbackId: string): string {
  if (!bus) return `Bus #${shortId(fallbackId)}`;
  if (bus.registrationNumber) return bus.registrationNumber;
  if (bus.brand || bus.model) return [bus.brand, bus.model].filter(Boolean).join(' ');
  return `Bus #${shortId(bus.id)}`;
}

function tripLabelFrom(trip: TripResponseDto | null, fallbackId: string): string {
  if (!trip) return `Trip #${shortId(fallbackId)}`;
  const dep = trip.departureTimeUtc ? new Date(trip.departureTimeUtc).toLocaleString() : '';
  return dep ? `${trip.tripCode} · ${dep}` : trip.tripCode;
}

function seatLabelFrom(trip: TripResponseDto | null, tripSeatId: string): string {
  const seat = trip?.tripSeats?.find((s) => String(s.id).toLowerCase() === String(tripSeatId).toLowerCase());
  return seat?.seatNumber || `Seat #${shortId(tripSeatId)}`;
}

/** Enriches raw SeatHoldItems with human-readable seat/trip/bus labels for the UI. */
export async function enrichSeatHoldItems(
  items: SeatHoldItemResponseDto[]
): Promise<SeatHoldItemDisplayDto[]> {
  return Promise.all(
    items.map(async (item) => {
      const seatHold = await resolveSeatHold(item.seatHoldId);
      const trip = seatHold?.tripId ? await resolveTrip(seatHold.tripId) : null;
      const bus = trip?.busId ? await resolveBus(trip.busId) : null;

      return {
        ...item,
        seatLabel: seatLabelFrom(trip, item.tripSeatId),
        tripLabel: tripLabelFrom(trip, seatHold?.tripId || item.seatHoldId),
        busLabel: busLabelFrom(bus, trip?.busId || ''),
        holdStatus: seatHold?.status,
        holdExpiresAtUtc: seatHold?.holdExpiresAtUtc,
      };
    })
  );
}

// ------------------------------------------------------------------
// Realtime plumbing — same pattern as terminalService (BroadcastChannel +
// window event), PLUS lightweight polling, since seat holds are short-lived
// and nothing else in the app writes to this resource to trigger the
// broadcast — the list needs to notice on its own.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_seatholditems_sync';
let seatHoldItemsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    seatHoldItemsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    seatHoldItemsBroadcast = null;
  }
}

export function notifySeatHoldItemsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('seatholditems_updated'));
  } catch {}
  try {
    seatHoldItemsBroadcast?.postMessage({ type: 'SEATHOLDITEMS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToSeatHoldItems(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('seatholditems_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'SEATHOLDITEMS_CHANGED') callback();
  };
  seatHoldItemsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('seatholditems_updated', handler);
    seatHoldItemsBroadcast?.removeEventListener('message', bcHandler);
  };
}

/**
 * Polls api/SeatHoldItems every `intervalMs` (default 5s — holds expire in
 * seconds so the list needs to move on its own). Calls `onData` with fresh,
 * enriched rows every tick, and fires the broadcast/event so other open
 * tabs/components pick it up. Returns a cleanup fn.
 */
export function startSeatHoldItemsPolling(
  onData: (items: SeatHoldItemDisplayDto[]) => void,
  intervalMs = 5000
): () => void {
  let cancelled = false;

  async function tick() {
    try {
      const raw = await refreshItemsCache();
      const enriched = await enrichSeatHoldItems(raw);
      if (!cancelled) {
        onData(enriched);
        notifySeatHoldItemsChanged();
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
