import { api } from '@/lib/api';

// Real backend contract (ExternalBookingMappingsController):
//   GET    api/ExternalBookingMappings        [Authorize] -> platform Staff/Admin only (empty [] otherwise)
//   GET    api/ExternalBookingMappings/{id}   [Authorize] -> platform Staff/Admin only
//   POST   api/ExternalBookingMappings        [Admin only]
//   PUT    api/ExternalBookingMappings/{id}   [Admin only] (RowVersion required)
//   DELETE api/ExternalBookingMappings/{id}   [Admin only] -> 204 (soft delete)
// Internal sync bookkeeping — translates our Booking ids to an operator's ERP reference.
// Not opened to operator-scoped Staff even for reads: only Admin, or Staff/Operator whose
// StaffProfile.BusOperatorId is null (platform staff).

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface ExternalBookingMappingResponseDto {
  id: string;
  operatorIntegrationId: string;
  bookingId: string;
  externalBookingKey: string;
  externalPnr?: string | null;
  lastKnownExternalStatus?: BookingStatus | null;
  lastSyncedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface ExternalBookingMappingCreateDto {
  operatorIntegrationId: string;
  bookingId: string;
  externalBookingKey: string;
  externalPnr?: string | null;
  lastKnownExternalStatus?: BookingStatus | null;
  lastSyncedAtUtc?: string | null;
}

export interface ExternalBookingMappingUpdateDto extends ExternalBookingMappingCreateDto {
  rowVersion: string;
}

export const EXTERNAL_BOOKING_MAPPING_UPDATED_EVENT = 'external_booking_mappings_updated';
const CACHE_KEY = 'ticket_portal_external_booking_mappings_cache';

function readCache(): ExternalBookingMappingResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading external booking mappings cache:', err);
  }
  return [];
}

function writeCache(list: ExternalBookingMappingResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing external booking mappings cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever ExternalBookingMappings is used.
  window.dispatchEvent(new CustomEvent(EXTERNAL_BOOKING_MAPPING_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: ExternalBookingMappingResponseDto) {
  const list = readCache();
  const idx = list.findIndex((m) => m.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((m) => m.id !== id));
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredExternalBookingMappings(): ExternalBookingMappingResponseDto[] {
  return readCache();
}

/** GET api/ExternalBookingMappings — real backend call. Platform Staff/Admin only. */
export async function getAllExternalBookingMappings(): Promise<ExternalBookingMappingResponseDto[]> {
  const res = await api.get('api/ExternalBookingMappings');
  const list: ExternalBookingMappingResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/ExternalBookingMappings/{id} — real backend call. */
export async function getExternalBookingMappingById(id: string): Promise<ExternalBookingMappingResponseDto | undefined> {
  try {
    const res = await api.get(`api/ExternalBookingMappings/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/ExternalBookingMappings — real backend call. Admin only. */
export async function createExternalBookingMapping(dto: ExternalBookingMappingCreateDto): Promise<ExternalBookingMappingResponseDto> {
  const res = await api.post('api/ExternalBookingMappings', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/ExternalBookingMappings/{id} — real backend call. Admin only. RowVersion required. */
export async function updateExternalBookingMapping(id: string, dto: ExternalBookingMappingUpdateDto): Promise<ExternalBookingMappingResponseDto> {
  const res = await api.put(`api/ExternalBookingMappings/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/ExternalBookingMappings/{id} — real backend call. Admin only. Soft delete server-side. */
export async function deleteExternalBookingMapping(id: string): Promise<void> {
  await api.delete(`api/ExternalBookingMappings/${id}`);
  removeFromCache(id);
}