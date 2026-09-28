import { api } from '@/lib/api';
import { fetchBuses, busLabel } from '@/services/busAmenityMappingService';
import type { BusImage, BusImageCreateRequest, BusImageUpdateRequest } from '@/types/busImage.types';

// Same shape as busAmenityMappingService.ts — no module-level cache, no localStorage. Every
// page re-fetches on mount and again after any mutation, straight off api/BusImages /
// api/Buses, so the screen always reflects what's actually in SQL right now.
export { fetchBuses, busLabel };

function normalizeList<T>(raw: any): T[] {
  return Array.isArray(raw) ? raw : (raw?.items ?? []);
}

export async function fetchBusImages(): Promise<BusImage[]> {
  const res = await api.get('api/BusImages');
  return normalizeList<BusImage>(res.data);
}

export async function createBusImage(dto: BusImageCreateRequest): Promise<BusImage> {
  const res = await api.post('api/BusImages', dto);
  return res.data;
}

export async function updateBusImage(id: string, dto: BusImageUpdateRequest): Promise<BusImage> {
  const res = await api.put(`api/BusImages/${id}`, dto);
  return res.data;
}

export async function deleteBusImage(id: string): Promise<void> {
  await api.delete(`api/BusImages/${id}`);
}

export function extractErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message ?? anyErr?.message ?? 'Something went wrong. Please try again.';
}
