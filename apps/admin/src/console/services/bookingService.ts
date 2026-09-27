import { api, ApiError } from '@/lib/api';
import { getAllTerminals, TerminalResponseDto } from './terminalService';
import type {
  BookingCreateDto,
  BookingUpdateDto,
  BookingResponseDto,
  TripLite,
  SalesCounterLite,
  SeatHoldLite,
} from '@/types/booking.types';

export type { TerminalResponseDto };
export { getAllTerminals };
export type {
  BookingCreateDto,
  BookingUpdateDto,
  BookingResponseDto,
  TripLite,
  SalesCounterLite,
  SeatHoldLite,
};

// ------------------------------------------------------------------
// Realtime plumbing — every booking created/edited/deleted anywhere
// (this admin panel OR the public booking frontend) hits the SAME
// api/Bookings backend endpoint, so re-fetching is always accurate.
// We just broadcast a light "something changed" signal so any open
// BookingsList tab refetches immediately instead of waiting on its
// poll interval.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_bookings_sync';
let bookingsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    bookingsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    bookingsBroadcast = null;
  }
}

export function notifyBookingsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('bookings_updated'));
  } catch {}
  try {
    bookingsBroadcast?.postMessage({ type: 'BOOKINGS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToBookings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('bookings_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'BOOKINGS_CHANGED') callback();
  };
  bookingsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('bookings_updated', handler);
    bookingsBroadcast?.removeEventListener('message', bcHandler);
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

// ------------------------------------------------------------------
// Bookings CRUD — maps 1:1 onto BookingsController
// ------------------------------------------------------------------
export async function getAllBookings(): Promise<BookingResponseDto[]> {
  const res = await api.get('api/Bookings');
  return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
}

export async function getBookingById(id: string): Promise<BookingResponseDto> {
  const res = await api.get(`api/Bookings/${id}`);
  return res.data;
}

export async function createBooking(dto: BookingCreateDto): Promise<BookingResponseDto> {
  const res = await api.post('api/Bookings', dto);
  notifyBookingsChanged();
  return res.data;
}

export async function updateBooking(id: string, dto: BookingUpdateDto): Promise<BookingResponseDto> {
  const res = await api.put(`api/Bookings/${id}`, dto);
  notifyBookingsChanged();
  return res.data;
}

export async function deleteBooking(id: string): Promise<void> {
  await api.delete(`api/Bookings/${id}`);
  notifyBookingsChanged();
}

export async function uploadPassengerIdPhoto(
  bookingId: string,
  passengerId: string,
  file: File
): Promise<{ imageUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`api/Bookings/${bookingId}/passengers/${passengerId}/images`, form);
  notifyBookingsChanged();
  return res.data;
}

// ------------------------------------------------------------------
// Lookups needed to build a Booking: Trips (with live seat map),
// SeatHolds (freeze seats + price before Create), SalesCounters
// (counter-sale gate).
// ------------------------------------------------------------------
export async function getAllTripsLite(): Promise<TripLite[]> {
  const res = await api.get('api/Trips');
  return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
}

export async function getTripLiteById(id: string): Promise<TripLite> {
  const res = await api.get(`api/Trips/${id}`);
  return res.data;
}

// Some backends serialize with PascalCase (Id/HoldToken/Items) instead of
// camelCase. Normalize either shape so the rest of the app can rely on
// camelCase fields, and fail loudly (instead of silently) if a required
// field is still missing after normalizing.
function normalizeSeatHold(raw: any): SeatHoldLite {
  if (!raw || typeof raw !== 'object') {
    throw new Error('SeatHolds endpoint returned an empty response.');
  }
  const items = raw.items ?? raw.Items ?? [];
  const normalized: SeatHoldLite = {
    id: raw.id ?? raw.Id,
    holdToken: raw.holdToken ?? raw.HoldToken,
    tripId: raw.tripId ?? raw.TripId,
    status: raw.status ?? raw.Status,
    holdExpiresAtUtc: raw.holdExpiresAtUtc ?? raw.HoldExpiresAtUtc,
    items: (Array.isArray(items) ? items : []).map((it: any) => ({
      id: it.id ?? it.Id,
      tripSeatId: it.tripSeatId ?? it.TripSeatId,
      fareAtHold: it.fareAtHold ?? it.FareAtHold ?? 0,
    })),
  };
  if (!normalized.id || !normalized.holdToken) {
    throw new Error(
      'SeatHolds response is missing id/holdToken — check the API response shape (open Network tab → SeatHolds call).'
    );
  }
  if (normalized.items.length === 0) {
    throw new Error('SeatHolds response has no items — no seats were actually held.');
  }
  return normalized;
}

// POST api/SeatHolds { tripId, tripSeatIds } — this is the ONLY way to obtain
// a HoldToken, which BookingCreateDto requires. Price is frozen here
// (SeatHoldItem.FareAtHold), never declared by the client on the booking itself.
export async function createSeatHold(tripId: string, tripSeatIds: string[]): Promise<SeatHoldLite> {
  const res = await api.post('api/SeatHolds', { tripId, tripSeatIds });
  return normalizeSeatHold(res.data);
}

export async function releaseSeatHold(id: string): Promise<void> {
  await api.post(`api/SeatHolds/${id}/release`);
}

export async function getAllSalesCounters(): Promise<SalesCounterLite[]> {
  try {
    const res = await api.get('api/SalesCounters');
    return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------
// Display helpers
// ------------------------------------------------------------------
export function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'BDT' ? '৳' : currency ? `${currency} ` : '';
  return `${symbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function bookingStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Draft': return 'bg-secondary';
    case 'PendingPayment': return 'bg-warning text-dark';
    case 'Confirmed': return 'bg-primary';
    case 'Completed': return 'bg-success';
    case 'PartiallyCancelled': return 'bg-warning text-dark';
    case 'Cancelled': return 'bg-danger';
    case 'Expired': return 'bg-secondary';
    case 'Failed': return 'bg-danger';
    case 'Refunded': return 'bg-info text-dark';
    default: return 'bg-secondary';
  }
}

export function bookingStatusIcon(status: string): string {
  switch (status) {
    case 'Draft': return 'fa-regular fa-file';
    case 'PendingPayment': return 'fa-solid fa-hourglass-half';
    case 'Confirmed': return 'fa-solid fa-circle-check';
    case 'Completed': return 'fa-solid fa-flag-checkered';
    case 'PartiallyCancelled': return 'fa-solid fa-triangle-exclamation';
    case 'Cancelled': return 'fa-solid fa-ban';
    case 'Expired': return 'fa-solid fa-clock-rotate-left';
    case 'Failed': return 'fa-solid fa-circle-xmark';
    case 'Refunded': return 'fa-solid fa-rotate-left';
    default: return 'fa-solid fa-ticket';
  }
}

export function extractErrorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  return apiErr?.message || (err as any)?.message || 'Something went wrong. Please try again.';
}
