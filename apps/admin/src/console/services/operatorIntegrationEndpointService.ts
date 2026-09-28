import { api } from '@/lib/api';
import type {
  OperatorIntegrationEndpoint,
  OperatorIntegrationEndpointCreateRequest,
  OperatorIntegrationEndpointUpdateRequest,
  OperatorIntegrationRef,
} from '@/types/operatorIntegrationEndpoint.types';

// Same shape as busAmenityMappingService.ts / busImageService.ts — no module-level cache, no
// localStorage. Every page re-fetches on mount and again after any mutation, straight off
// api/OperatorIntegrationEndpoints + api/OperatorIntegrations, so the screen always reflects
// what's actually in SQL right now.

function normalizeList<T>(raw: any): T[] {
  return Array.isArray(raw) ? raw : (raw?.items ?? []);
}

export async function fetchEndpoints(): Promise<OperatorIntegrationEndpoint[]> {
  const res = await api.get('api/OperatorIntegrationEndpoints');
  return normalizeList<OperatorIntegrationEndpoint>(res.data);
}

export async function fetchIntegrations(): Promise<OperatorIntegrationRef[]> {
  const res = await api.get('api/OperatorIntegrations');
  return normalizeList<any>(res.data).map((i) => ({
    id: i.id,
    busOperatorId: i.busOperatorId,
    name: i.name,
    baseUrl: i.baseUrl,
    isActive: i.isActive,
  }));
}

export async function createEndpoint(
  dto: OperatorIntegrationEndpointCreateRequest,
): Promise<OperatorIntegrationEndpoint> {
  const res = await api.post('api/OperatorIntegrationEndpoints', dto);
  return res.data;
}

export async function updateEndpoint(
  id: string,
  dto: OperatorIntegrationEndpointUpdateRequest,
): Promise<OperatorIntegrationEndpoint> {
  const res = await api.put(`api/OperatorIntegrationEndpoints/${id}`, dto);
  return res.data;
}

export async function deleteEndpoint(id: string): Promise<void> {
  await api.delete(`api/OperatorIntegrationEndpoints/${id}`);
}

export function integrationLabel(integration: OperatorIntegrationRef | undefined): string {
  if (!integration) return 'Unknown integration';
  return `${integration.name} — ${integration.baseUrl}`;
}

export function extractErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message ?? anyErr?.message ?? 'Something went wrong. Please try again.';
}
