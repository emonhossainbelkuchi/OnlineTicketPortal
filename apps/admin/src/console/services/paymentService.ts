import { api, ApiError } from '@/lib/api';
import type {
  PaymentInitiateDto,
  PaymentGatewayResultDto,
  PaymentFailDto,
  CounterSaleConfirmDto,
  PaymentResponseDto,
} from '@/types/payment.types';

export type {
  PaymentInitiateDto,
  PaymentGatewayResultDto,
  PaymentFailDto,
  CounterSaleConfirmDto,
  PaymentResponseDto,
};

function normalizeList(raw: any): any[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

export async function getAllPayments(): Promise<PaymentResponseDto[]> {
  const res = await api.get('api/Payments');
  return normalizeList(res.data);
}

export async function getPaymentById(id: string): Promise<PaymentResponseDto> {
  const res = await api.get(`api/Payments/${id}`);
  return res.data;
}

export async function initiatePayment(dto: PaymentInitiateDto): Promise<PaymentResponseDto> {
  const res = await api.post('api/Payments/initiate', dto);
  notifyPaymentsChanged();
  return res.data;
}

export async function confirmPayment(id: string, dto: PaymentGatewayResultDto): Promise<any> {
  const res = await api.post(`api/Payments/${id}/confirm`, dto);
  notifyPaymentsChanged();
  return res.data;
}

export async function failPayment(id: string, dto: PaymentFailDto): Promise<void> {
  await api.post(`api/Payments/${id}/fail`, dto);
  notifyPaymentsChanged();
}

export async function confirmCounterSale(dto: CounterSaleConfirmDto): Promise<any> {
  const res = await api.post('api/Payments/counter-sale/confirm', dto);
  notifyPaymentsChanged();
  return res.data;
}

// Lightweight lookup for the provider dropdown on Initiate — optional, falls back to manual GUID entry.
export async function getAllPaymentProvidersLite(): Promise<{ id: string; name: string; gateway: string }[]> {
  try {
    const res = await api.get('api/PaymentProviders');
    return normalizeList(res.data);
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------
// Realtime plumbing — identical pattern to bookingService/terminalService/cancellationPolicyService.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_payments_sync';
let paymentsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    paymentsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    paymentsBroadcast = null;
  }
}

export function notifyPaymentsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('payments_updated'));
  } catch {}
  try {
    paymentsBroadcast?.postMessage({ type: 'PAYMENTS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToPayments(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('payments_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'PAYMENTS_CHANGED') callback();
  };
  paymentsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('payments_updated', handler);
    paymentsBroadcast?.removeEventListener('message', bcHandler);
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

export function formatMoney(amount: number, currency: string = 'BDT'): string {
  const symbol = currency === 'BDT' ? '৳' : currency ? `${currency} ` : '';
  return `${symbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function paymentStatusBadgeClass(status: string): string {
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

export function paymentStatusIcon(status: string): string {
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

export function methodIcon(method: string): string {
  switch (method) {
    case 'Cash': return 'fa-solid fa-money-bill-wave';
    case 'Card': return 'fa-solid fa-credit-card';
    case 'MobileBanking': return 'fa-solid fa-mobile-screen';
    case 'BankTransfer': return 'fa-solid fa-building-columns';
    case 'OnlineGateway': return 'fa-solid fa-globe';
    case 'Wallet': return 'fa-solid fa-wallet';
    default: return 'fa-solid fa-coins';
  }
}
