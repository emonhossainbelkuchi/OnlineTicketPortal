import { api } from '@/lib/api';

// Real backend contract (SystemSettingsController):
//   GET    api/SystemSettings        [Admin only] (empty [] for non-Admin)
//   GET    api/SystemSettings/{id}   [Admin only]
//   POST   api/SystemSettings        [Admin only]
//   PUT    api/SystemSettings/{id}   [Admin only] (RowVersion required)
//   DELETE api/SystemSettings/{id}   [Admin only] -> 204 (soft delete)
// Admin-only end to end — free-form platform-wide key/value settings; letting anyone write
// here is close to letting anyone reconfigure the app.

export interface SystemSettingResponseDto {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface SystemSettingCreateDto {
  key: string;
  value: string;
  description?: string | null;
}

export interface SystemSettingUpdateDto extends SystemSettingCreateDto {
  rowVersion: string;
}

export const SYSTEM_SETTING_UPDATED_EVENT = 'system_settings_updated';
const CACHE_KEY = 'ticket_portal_system_settings_cache';

function readCache(): SystemSettingResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading system settings cache:', err);
  }
  return [];
}

function writeCache(list: SystemSettingResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing system settings cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever SystemSettings is used.
  window.dispatchEvent(new CustomEvent(SYSTEM_SETTING_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: SystemSettingResponseDto) {
  const list = readCache();
  const idx = list.findIndex((s) => s.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((s) => s.id !== id));
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredSystemSettings(): SystemSettingResponseDto[] {
  return readCache();
}

/** GET api/SystemSettings — real backend call. Admin only. */
export async function getAllSystemSettings(): Promise<SystemSettingResponseDto[]> {
  const res = await api.get('api/SystemSettings');
  const list: SystemSettingResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/SystemSettings/{id} — real backend call. Admin only. */
export async function getSystemSettingById(id: string): Promise<SystemSettingResponseDto | undefined> {
  try {
    const res = await api.get(`api/SystemSettings/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/SystemSettings — real backend call. Admin only. */
export async function createSystemSetting(dto: SystemSettingCreateDto): Promise<SystemSettingResponseDto> {
  const res = await api.post('api/SystemSettings', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/SystemSettings/{id} — real backend call. Admin only. RowVersion required. */
export async function updateSystemSetting(id: string, dto: SystemSettingUpdateDto): Promise<SystemSettingResponseDto> {
  const res = await api.put(`api/SystemSettings/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/SystemSettings/{id} — real backend call. Admin only. Soft delete server-side. */
export async function deleteSystemSetting(id: string): Promise<void> {
  await api.delete(`api/SystemSettings/${id}`);
  removeFromCache(id);
}