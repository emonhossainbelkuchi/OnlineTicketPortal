import { api } from '@/lib/api';

// Real backend contract (IntegrationWebhookLogsController):
//   GET api/IntegrationWebhookLogs        [Authorize, platform Admin/Staff only]
//     -> IntegrationWebhookLogResponseDto[]
//     Non-platform-staff (including an operator's own Staff/Operator) get an EMPTY ARRAY back,
//     not a 403 — see IsPlatformStaffOrAdminAsync in the controller.
//   GET api/IntegrationWebhookLogs/{id}   [Authorize, platform Admin/Staff only] -> 403 otherwise
// Read-only, no POST/PUT/DELETE anywhere: these are raw inbound webhook events from an
// operator's own ERP, written only by the future sync worker (not built yet).

export interface IntegrationWebhookLogResponseDto {
  id: string;
  operatorIntegrationId: string;
  externalEventId?: string | null;
  eventType: string;
  receivedAtUtc: string;
  isProcessed: boolean;
  processedAtUtc?: string | null;
  payloadJson?: string | null;
  errorMessage?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export const WEBHOOK_LOG_UPDATED_EVENT = 'integration_webhook_logs_updated';
const CACHE_KEY = 'ticket_portal_webhook_logs_cache';
const POLL_INTERVAL_MS = 15000;

function readCache(): IntegrationWebhookLogResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading webhook logs cache:', err);
  }
  return [];
}

function writeCache(list: IntegrationWebhookLogResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing webhook logs cache:', err);
  }
  window.dispatchEvent(new CustomEvent(WEBHOOK_LOG_UPDATED_EVENT, { detail: list }));
}

export function getStoredWebhookLogs(): IntegrationWebhookLogResponseDto[] {
  return readCache();
}

/** GET api/IntegrationWebhookLogs — empty array (not a throw) if the caller isn't platform staff. */
export async function getAllWebhookLogs(): Promise<IntegrationWebhookLogResponseDto[]> {
  const res = await api.get('api/IntegrationWebhookLogs');
  const list: IntegrationWebhookLogResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/IntegrationWebhookLogs/{id} — 403/404 propagate as thrown errors. */
export async function getWebhookLogById(id: string): Promise<IntegrationWebhookLogResponseDto | undefined> {
  try {
    const res = await api.get(`api/IntegrationWebhookLogs/${id}`);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/**
 * Polling loop for "realtime" — this backend has no push/webhook-of-its-own for its own
 * webhook log (no websocket endpoint exists here), so periodic re-fetch is the honest way to
 * keep the list current as new inbound events land. Returns an unsubscribe function.
 */
export function subscribeToWebhookLogPolling(onData: (list: IntegrationWebhookLogResponseDto[]) => void): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const data = await getAllWebhookLogs();
      if (!cancelled) onData(data);
    } catch {
      // transient poll errors are silently retried on the next tick
    }
  };
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}
