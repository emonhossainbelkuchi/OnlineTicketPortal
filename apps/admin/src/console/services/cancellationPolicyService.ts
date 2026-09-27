import { api, ApiError } from '@/lib/api';
import { getStoredBusOperators, getBusOperatorNameById } from '@/services/busOperatorService';
import type {
  CancellationPolicyCreateDto,
  CancellationPolicyUpdateDto,
  CancellationPolicyResponseDto,
} from '@/types/cancellationPolicy.types';

export type {
  CancellationPolicyCreateDto,
  CancellationPolicyUpdateDto,
  CancellationPolicyResponseDto,
};
export { getStoredBusOperators, getBusOperatorNameById };

function normalizeList(raw: any): CancellationPolicyResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

export async function getAllCancellationPolicies(): Promise<CancellationPolicyResponseDto[]> {
  const res = await api.get('api/CancellationPolicies');
  return normalizeList(res.data);
}

export async function getCancellationPolicyById(id: string): Promise<CancellationPolicyResponseDto> {
  const res = await api.get(`api/CancellationPolicies/${id}`);
  return res.data;
}

export async function createCancellationPolicy(dto: CancellationPolicyCreateDto): Promise<CancellationPolicyResponseDto> {
  const res = await api.post('api/CancellationPolicies', dto);
  notifyCancellationPoliciesChanged();
  return res.data;
}

export async function updateCancellationPolicy(id: string, dto: CancellationPolicyUpdateDto): Promise<CancellationPolicyResponseDto> {
  const res = await api.put(`api/CancellationPolicies/${id}`, dto);
  notifyCancellationPoliciesChanged();
  return res.data;
}

export async function deleteCancellationPolicy(id: string): Promise<void> {
  await api.delete(`api/CancellationPolicies/${id}`);
  notifyCancellationPoliciesChanged();
}

export async function uploadPolicyDocumentImage(id: string, file: File): Promise<{ imageUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`api/CancellationPolicies/${id}/images`, form);
  notifyCancellationPoliciesChanged();
  return res.data;
}

// ------------------------------------------------------------------
// Realtime plumbing — identical pattern to bookingService/terminalService.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_cancellation_policies_sync';
let policiesBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    policiesBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    policiesBroadcast = null;
  }
}

export function notifyCancellationPoliciesChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('cancellation_policies_updated'));
  } catch {}
  try {
    policiesBroadcast?.postMessage({ type: 'CANCELLATION_POLICIES_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToCancellationPolicies(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('cancellation_policies_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'CANCELLATION_POLICIES_CHANGED') callback();
  };
  policiesBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('cancellation_policies_updated', handler);
    policiesBroadcast?.removeEventListener('message', bcHandler);
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

export function formatMoney(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
