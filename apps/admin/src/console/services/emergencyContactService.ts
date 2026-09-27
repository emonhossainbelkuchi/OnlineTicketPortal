import { api } from '@/lib/api';

// Real backend contract (EmergencyContactsController):
//   GET    api/EmergencyContacts        [Authorize] -> own contacts, or all for Admin/Staff/Operator
//   GET    api/EmergencyContacts/{id}   [Authorize]
//   POST   api/EmergencyContacts        [Authorize] -> CustomerProfileId resolved server-side
//   PUT    api/EmergencyContacts/{id}   [Authorize] (RowVersion required)
//   DELETE api/EmergencyContacts/{id}   [Authorize] -> 204 (soft delete)
// CustomerProfileId is never client-supplied on Create, and never reassignable on Update.

export interface EmergencyContactResponseDto {
  id: string;
  customerProfileId: string;
  name: string;
  phone: string;
  relation?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface EmergencyContactCreateDto {
  name: string;
  phone: string;
  relation?: string | null;
}

export interface EmergencyContactUpdateDto extends EmergencyContactCreateDto {
  rowVersion: string;
}

export const EMERGENCY_CONTACT_UPDATED_EVENT = 'emergency_contacts_updated';
const CACHE_KEY = 'ticket_portal_emergency_contacts_cache';

function readCache(): EmergencyContactResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading emergency contacts cache:', err);
  }
  return [];
}

function writeCache(list: EmergencyContactResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing emergency contacts cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever EmergencyContacts is used.
  window.dispatchEvent(new CustomEvent(EMERGENCY_CONTACT_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: EmergencyContactResponseDto) {
  const list = readCache();
  const idx = list.findIndex((c) => c.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((c) => c.id !== id));
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredEmergencyContacts(): EmergencyContactResponseDto[] {
  return readCache();
}

/** GET api/EmergencyContacts — real backend call. */
export async function getAllEmergencyContacts(): Promise<EmergencyContactResponseDto[]> {
  const res = await api.get('api/EmergencyContacts');
  const list: EmergencyContactResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/EmergencyContacts/{id} — real backend call. */
export async function getEmergencyContactById(id: string): Promise<EmergencyContactResponseDto | undefined> {
  try {
    const res = await api.get(`api/EmergencyContacts/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/EmergencyContacts — real backend call. CustomerProfileId resolved server-side. */
export async function createEmergencyContact(dto: EmergencyContactCreateDto): Promise<EmergencyContactResponseDto> {
  const res = await api.post('api/EmergencyContacts', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/EmergencyContacts/{id} — real backend call. RowVersion required for concurrency. */
export async function updateEmergencyContact(id: string, dto: EmergencyContactUpdateDto): Promise<EmergencyContactResponseDto> {
  const res = await api.put(`api/EmergencyContacts/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/EmergencyContacts/{id} — real backend call. Soft delete server-side. */
export async function deleteEmergencyContact(id: string): Promise<void> {
  await api.delete(`api/EmergencyContacts/${id}`);
  removeFromCache(id);
}