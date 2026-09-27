import { api, ApiError } from '@/lib/api';
import type { PaymentWebhookEventResponseDto } from '@/types/paymentWebhookEvent.types';

export type { PaymentWebhookEventResponseDto };

function normalizeList(raw: any): PaymentWebhookEventResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

// Read-only, Admin/Staff-only. GetAll silently returns [] for anyone else (server-side gate);
// GetById 403s for anyone else. Nothing writes here yet — no real gateway is wired in, this is
// future webhook-receiver plumbing. PaymentWebhookEventsController has no POST/PUT/DELETE.
export async function getAllPaymentWebhookEvents(): Promise<PaymentWebhookEventResponseDto[]> {
  const res = await api.get('api/PaymentWebhookEvents');
  return normalizeList(res.data);
}

export async function getPaymentWebhookEventById(id: string): Promise<PaymentWebhookEventResponseDto> {
  const res = await api.get(`api/PaymentWebhookEvents/${id}`);
  return res.data;
}

// ------------------------------------------------------------------
// Realtime plumbing — same shape as paymentHistoryService: nothing in this admin panel
// ever writes here, so this only exists for cross-tab polling/refresh symmetry.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_payment_webhook_events_sync';
let webhookBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    webhookBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    webhookBroadcast = null;
  }
}

export function subscribeToPaymentWebhookEvents(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'PAYMENT_WEBHOOK_EVENTS_CHANGED') callback();
  };
  webhookBroadcast?.addEventListener('message', bcHandler);
  return () => {
    webhookBroadcast?.removeEventListener('message', bcHandler);
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

export function webhookStatusBadgeClass(processed: boolean, errorMessage?: string | null): string {
  if (errorMessage) return 'bg-danger';
  return processed ? 'bg-success' : 'bg-warning text-dark';
}

export function webhookStatusIcon(processed: boolean, errorMessage?: string | null): string {
  if (errorMessage) return 'fa-solid fa-triangle-exclamation';
  return processed ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half';
}

export function reportedStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'Succeeded': return 'bg-success';
    case 'Failed': return 'bg-danger';
    case 'Pending': return 'bg-warning text-dark';
    case 'Initiated': return 'bg-secondary';
    default: return 'bg-secondary';
  }
}
