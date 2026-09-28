// operatorContractService.ts
// Thin wrapper over api/OperatorContracts (Admin-only, see controller header
// comment). Uses the shared authenticated `api` axios instance from
// @/lib/api (NOT a bare axios import) so every request carries the admin's
// Bearer token the same way every other resource in this console does.
//
// Realtime is polling-based (this backend has no SignalR hub anywhere in the
// project — see startOperatorContractsPolling below) plus a BroadcastChannel
// so multiple open admin tabs stay in sync the moment any one of them
// writes. Nothing here is ever written to localStorage/sessionStorage —
// state lives only in memory for the lifetime of the tab, exactly like
// seatHoldService/terminalService/seatHoldItemService already do in this
// codebase.

import { api, ApiError } from '@/lib/api';
import type {
  OperatorContractResponseDto,
  OperatorContractCreateDto,
  OperatorContractUpdateDto,
  OperatorContractDisplayDto,
  BusOperatorSummary,
} from '@/types/operatorContract.types';

const BASE_URL = 'api/OperatorContracts';

// ------------------------------------------------------------------
// In-memory cache only. Cleared on full page reload; never persisted.
// ------------------------------------------------------------------
let contractsCache: OperatorContractResponseDto[] = [];
let cacheWarmed = false;
const busOperatorCache = new Map<string, BusOperatorSummary | null>();

function normalizeList(raw: any): OperatorContractResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

async function refreshContractsCache(): Promise<OperatorContractResponseDto[]> {
  const res = await api.get(BASE_URL);
  contractsCache = normalizeList(res.data);
  cacheWarmed = true;
  return contractsCache;
}

export function getStoredOperatorContracts(): OperatorContractResponseDto[] {
  return contractsCache;
}

export function isOperatorContractsCacheWarmed(): boolean {
  return cacheWarmed;
}

export async function getAllOperatorContracts(): Promise<OperatorContractResponseDto[]> {
  return refreshContractsCache();
}

export async function getOperatorContractById(id: string): Promise<OperatorContractResponseDto> {
  const res = await api.get(`${BASE_URL}/${id}`);
  return res.data as OperatorContractResponseDto;
}

export async function createOperatorContract(
  dto: OperatorContractCreateDto
): Promise<OperatorContractResponseDto> {
  const res = await api.post(BASE_URL, dto);
  notifyOperatorContractsChanged();
  return res.data as OperatorContractResponseDto;
}

export async function updateOperatorContract(
  id: string,
  dto: OperatorContractUpdateDto
): Promise<OperatorContractResponseDto> {
  const res = await api.put(`${BASE_URL}/${id}`, dto);
  notifyOperatorContractsChanged();
  return res.data as OperatorContractResponseDto;
}

export async function deleteOperatorContract(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/${id}`);
  contractsCache = contractsCache.filter((c) => c.id !== id);
  notifyOperatorContractsChanged();
}

// ---- Bus Operator name resolution (BusOperatorId -> human label) ----
// Fetched fresh from the real api/BusOperators endpoint every cold cache
// miss; only ever cached in this module-level Map (memory, not storage).

async function resolveBusOperator(busOperatorId: string): Promise<BusOperatorSummary | null> {
  if (busOperatorCache.has(busOperatorId)) return busOperatorCache.get(busOperatorId)!;
  try {
    const res = await api.get(`api/BusOperators/${busOperatorId}`);
    const op: BusOperatorSummary = { id: res.data.id, name: res.data.name };
    busOperatorCache.set(busOperatorId, op);
    return op;
  } catch {
    busOperatorCache.set(busOperatorId, null);
    return null;
  }
}

/** Bulk-warms the bus-operator cache in one request instead of N GETs. */
export async function warmBusOperatorCache(): Promise<Map<string, BusOperatorSummary>> {
  const map = new Map<string, BusOperatorSummary>();
  try {
    const res = await api.get('api/BusOperators');
    (res.data || []).forEach((op: any) => {
      const summary: BusOperatorSummary = { id: op.id, name: op.name };
      busOperatorCache.set(op.id, summary);
      map.set(op.id, summary);
    });
  } catch {
    /* leave whatever was already cached */
  }
  return map;
}

function shortId(id: string): string {
  return id ? id.slice(0, 8) : '—';
}

/** Enriches raw OperatorContracts with a human-readable operator name. */
export async function enrichOperatorContracts(
  contracts: OperatorContractResponseDto[]
): Promise<OperatorContractDisplayDto[]> {
  await warmBusOperatorCache();
  return Promise.all(
    contracts.map(async (c) => {
      const op = busOperatorCache.get(c.busOperatorId) ?? (await resolveBusOperator(c.busOperatorId));
      return {
        ...c,
        busOperatorName: op?.name || `Operator #${shortId(c.busOperatorId)}`,
      };
    })
  );
}

// ------------------------------------------------------------------
// Realtime plumbing — BroadcastChannel + window event (same shape as
// seatHoldService/terminalService/seatHoldItemService) plus polling, since
// this project has no SignalR hub anywhere: polling is how every "realtime"
// list in this codebase actually stays live.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_operatorcontracts_sync';
let operatorContractsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    operatorContractsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    operatorContractsBroadcast = null;
  }
}

export function notifyOperatorContractsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('operatorcontracts_updated'));
  } catch {}
  try {
    operatorContractsBroadcast?.postMessage({ type: 'OPERATORCONTRACTS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToOperatorContracts(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('operatorcontracts_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'OPERATORCONTRACTS_CHANGED') callback();
  };
  operatorContractsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('operatorcontracts_updated', handler);
    operatorContractsBroadcast?.removeEventListener('message', bcHandler);
  };
}

/**
 * Polls api/OperatorContracts every `intervalMs` (default 8s — contracts
 * change far less often than seat holds, so a slower cadence is enough to
 * feel live without hammering the API). Calls `onData` with fresh, enriched
 * rows every tick. Returns a cleanup fn.
 */
export function startOperatorContractsPolling(
  onData: (contracts: OperatorContractDisplayDto[]) => void,
  intervalMs = 8000
): () => void {
  let cancelled = false;

  async function tick() {
    try {
      const raw = await refreshContractsCache();
      const enriched = await enrichOperatorContracts(raw);
      if (!cancelled) onData(enriched);
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
