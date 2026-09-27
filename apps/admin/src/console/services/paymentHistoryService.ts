import { api, ApiError } from '@/lib/api';
import type { PaymentHistoryResponseDto } from '@/types/paymentHistory.types';

export type { PaymentHistoryResponseDto };

function normalizeList(raw: any): PaymentHistoryResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

// Read-only — PaymentHistoriesController has no POST/PUT/DELETE. This is the
// append-only trail PaymentConfirmationService writes on every Payment status change.
export async function getAllPaymentHistories(): Promise<PaymentHistoryResponseDto[]> {
  const res = await api.get('api/PaymentHistories');
  return normalizeList(res.data);
}

export async function getPaymentHistoryById(id: string): Promise<PaymentHistoryResponseDto> {
  const res = await api.get(`api/PaymentHistories/${id}`);
  return res.data;
}

// ------------------------------------------------------------------
// Realtime plumbing — since this table is written exclusively by the server-side
// PaymentConfirmationService (never by this admin panel), there's nothing for us to
// notify on writes; polling + focus-refetch is how new rows get picked up.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_payment_histories_sync';
let historiesBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    historiesBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    historiesBroadcast = null;
  }
}

export function subscribeToPaymentHistories(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'PAYMENT_HISTORIES_CHANGED') callback();
  };
  historiesBroadcast?.addEventListener('message', bcHandler);
  return () => {
    historiesBroadcast?.removeEventListener('message', bcHandler);
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

export function historyStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Initiated': return 'bg-secondary';
    case 'Pending': return 'bg-warning text-dark';
    case 'Succeeded': return 'bg-success';
    case 'Failed': return 'bg-danger';
    case 'Cancelled': return 'bg-secondary';
    case 'PartiallyRefunded': return 'bg-warning text-dark';
    case 'Refunded': return 'bg-info text-dark';
    case 'ReconciliationNeeded': return 'bg-dark';
    default: return 'bg-secondary';
  }
}

export function historyStatusIcon(status: string): string {
  switch (status) {
    case 'Initiated': return 'fa-solid fa-hourglass-start';
    case 'Pending': return 'fa-solid fa-hourglass-half';
    case 'Succeeded': return 'fa-solid fa-circle-check';
    case 'Failed': return 'fa-solid fa-circle-xmark';
    case 'Cancelled': return 'fa-solid fa-ban';
    case 'PartiallyRefunded': return 'fa-solid fa-rotate-left';
    case 'Refunded': return 'fa-solid fa-rotate-left';
    case 'ReconciliationNeeded': return 'fa-solid fa-triangle-exclamation';
    default: return 'fa-solid fa-circle';
  }
}
