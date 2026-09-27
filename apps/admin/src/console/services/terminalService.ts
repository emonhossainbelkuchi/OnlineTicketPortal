import { api, ApiError } from '@/lib/api';
import type { TerminalCreateDto, TerminalUpdateDto, TerminalResponseDto } from '@/types/terminal.types';

export type { TerminalCreateDto, TerminalUpdateDto, TerminalResponseDto };

// ------------------------------------------------------------------
// api/Terminals is a real, API-based resource (TerminalsController):
// GET is public (AllowAnonymous), POST/PUT/DELETE require Admin.
// Every page across the app that needs a Terminal dropdown (BusRoutes,
// RouteStops, Schedules, Bookings...) calls getAllTerminals()/getStoredTerminals()
// from here, so this ONE file is the single source of truth. A handful of
// older files read the in-memory cache synchronously (getStoredTerminals) —
// we keep that working by warming the cache on load and on every mutation.
// ------------------------------------------------------------------
let terminalsCache: TerminalResponseDto[] = [];
let cacheWarmed = false;

function normalizeList(raw: any): TerminalResponseDto[] {
  return Array.isArray(raw) ? raw : raw?.items ?? [];
}

async function refreshTerminalsCache(): Promise<TerminalResponseDto[]> {
  const res = await api.get('api/Terminals');
  terminalsCache = normalizeList(res.data);
  cacheWarmed = true;
  return terminalsCache;
}

// Fire-and-forget warm-up so getStoredTerminals() has real data as early as possible,
// even for pages that only ever call the synchronous accessor.
if (typeof window !== 'undefined') {
  refreshTerminalsCache().catch(() => {
    /* first paint will just show an empty list until a page explicitly retries */
  });
}

/** Synchronous — returns whatever is currently cached. Used by legacy code
 *  (e.g. busRouteService) that resolves terminal names without awaiting. */
export function getStoredTerminals(): TerminalResponseDto[] {
  return terminalsCache;
}

export function isTerminalsCacheWarmed(): boolean {
  return cacheWarmed;
}

export async function getAllTerminals(): Promise<TerminalResponseDto[]> {
  return refreshTerminalsCache();
}

export async function getTerminalById(id: string): Promise<TerminalResponseDto | undefined> {
  try {
    const res = await api.get(`api/Terminals/${id}`);
    return res.data as TerminalResponseDto;
  } catch {
    return terminalsCache.find((t) => String(t.id).toLowerCase() === String(id).toLowerCase());
  }
}

export async function createTerminal(dto: TerminalCreateDto): Promise<TerminalResponseDto> {
  const res = await api.post('api/Terminals', dto);
  const created = res.data as TerminalResponseDto;
  terminalsCache = [created, ...terminalsCache.filter((t) => t.id !== created.id)];
  notifyTerminalsChanged();
  return created;
}

export async function updateTerminal(id: string, dto: TerminalUpdateDto): Promise<TerminalResponseDto> {
  const res = await api.put(`api/Terminals/${id}`, dto);
  const updated = res.data as TerminalResponseDto;
  terminalsCache = terminalsCache.map((t) => (t.id === id ? updated : t));
  notifyTerminalsChanged();
  return updated;
}

export async function deleteTerminal(id: string): Promise<void> {
  await api.delete(`api/Terminals/${id}`);
  terminalsCache = terminalsCache.filter((t) => t.id !== id);
  notifyTerminalsChanged();
}

// ------------------------------------------------------------------
// Realtime plumbing — identical pattern to bookingService, so a Terminal
// created/edited/deleted anywhere (this module, another tab, or wherever
// else in the admin panel writes to api/Terminals) instantly refreshes
// every open TerminalsList and every dropdown that re-fetches on focus.
// ------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ticket_portal_terminals_sync';
let terminalsBroadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    terminalsBroadcast = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    terminalsBroadcast = null;
  }
}

export function notifyTerminalsChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('terminals_updated'));
  } catch {}
  try {
    terminalsBroadcast?.postMessage({ type: 'TERMINALS_CHANGED', ts: Date.now() });
  } catch {}
}

export function subscribeToTerminals(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('terminals_updated', handler);
  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'TERMINALS_CHANGED') callback();
  };
  terminalsBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener('terminals_updated', handler);
    terminalsBroadcast?.removeEventListener('message', bcHandler);
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

// The Division values already seen, purely to power the filter dropdown —
// derived from live cache, never hardcoded.
export function getKnownDivisions(): string[] {
  return Array.from(new Set(terminalsCache.map((t) => t.division).filter(Boolean))).sort();
}
