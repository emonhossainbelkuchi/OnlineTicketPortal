import { api } from '@/lib/api';
import type {
  BusAmenityMapping,
  BusAmenityMappingCreateRequest,
  BusRef,
  BusAmenityRef,
} from '@/types/busAmenityMapping.types';

// Deliberately no module-level cache/localStorage here (that was the old prototype — see
// AppRoutes.tsx's comment on the routes this replaces). Every function below hits the API
// directly; every page that uses them re-calls on mount and again after any mutation, so the
// screen is always showing what's actually in SQL right now, not a stale snapshot.

function normalizeList<T>(raw: any): T[] {
  return Array.isArray(raw) ? raw : (raw?.items ?? []);
}

export async function fetchMappings(): Promise<BusAmenityMapping[]> {
  const res = await api.get('api/BusAmenityMappings');
  return normalizeList<BusAmenityMapping>(res.data);
}

export async function fetchBuses(): Promise<BusRef[]> {
  const res = await api.get('api/Buses');
  return normalizeList<any>(res.data).map((b) => ({
    id: b.id,
    registrationNumber: b.registrationNumber,
    brand: b.brand ?? null,
    model: b.model ?? null,
  }));
}

export async function fetchAmenities(): Promise<BusAmenityRef[]> {
  const res = await api.get('api/BusAmenities');
  return normalizeList<any>(res.data).map((a) => ({
    id: a.id,
    name: a.name,
    iconUrl: a.iconUrl ?? null,
    isActive: a.isActive,
  }));
}

export async function createMapping(dto: BusAmenityMappingCreateRequest): Promise<BusAmenityMapping> {
  const res = await api.post('api/BusAmenityMappings', dto);
  return res.data;
}

export async function updateMapping(id: string, dto: BusAmenityMappingCreateRequest): Promise<BusAmenityMapping> {
  const res = await api.put(`api/BusAmenityMappings/${id}`, dto);
  return res.data;
}

export async function deleteMapping(id: string): Promise<void> {
  await api.delete(`api/BusAmenityMappings/${id}`);
}

export function busLabel(bus: BusRef | undefined): string {
  if (!bus) return 'Unknown bus';
  const parts = [bus.brand, bus.model].filter(Boolean).join(' ');
  return parts ? `${bus.registrationNumber} — ${parts}` : bus.registrationNumber;
}

export function extractErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message ?? anyErr?.message ?? 'Something went wrong. Please try again.';
}
