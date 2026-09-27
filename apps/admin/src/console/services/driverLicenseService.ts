import { api } from '@/lib/api';

// Real backend contract (DriverLicensesController):
//   GET    api/DriverLicenses        [Authorize]  -> DriverLicenseResponseDto[]
//     Customers get an empty array (not 403) — never a legitimate audience for this data.
//     An operator's own Staff/Operator see only licenses for their OWN operator's drivers;
//     Admin / platform-Staff (no BusOperatorId on their own StaffProfile) see everything.
//   GET    api/DriverLicenses/{id}   [Authorize]  -> DriverLicenseResponseDto (403 if out of scope)
//   POST   api/DriverLicenses        [Staff/Operator/Admin] -> 400 if StaffProfileId isn't
//     actually one of your own operator's staff (not a 403 — surfaced as a normal validation
//     error, see CanAccessAsync in the controller).
//   PUT    api/DriverLicenses/{id}   [Staff/Operator/Admin, same scope] -> RowVersion required.
//     StaffProfileId can NOT be changed via Update — re-pointing a license to a different
//     employee is a new record, not an edit, so it's simply absent from this DTO.
//   DELETE api/DriverLicenses/{id}   [same scope] -> 204 (soft delete)

export enum LicenseType {
  Light = 1,
  Heavy = 2,
  Commercial = 3,
}

export const LicenseTypeLabel: Record<LicenseType, string> = {
  [LicenseType.Light]: 'Light',
  [LicenseType.Heavy]: 'Heavy',
  [LicenseType.Commercial]: 'Commercial',
};

export interface DriverLicenseResponseDto {
  id: string;
  staffProfileId: string;
  licenseNumber: string;
  type: LicenseType;
  issueDate: string; // DateOnly, e.g. "2024-05-01"
  expiryDate: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface DriverLicenseCreateDto {
  staffProfileId: string;
  licenseNumber: string;
  type: LicenseType;
  issueDate: string;
  expiryDate: string;
}

// staffProfileId deliberately absent — see the controller comment: re-pointing a license to a
// different employee isn't an edit, it's a new record.
export interface DriverLicenseUpdateDto {
  licenseNumber: string;
  type: LicenseType;
  issueDate: string;
  expiryDate: string;
  rowVersion: string;
}

export const DRIVER_LICENSE_UPDATED_EVENT = 'driver_licenses_updated';
const CACHE_KEY = 'ticket_portal_driver_licenses_cache';

function readCache(): DriverLicenseResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading driver licenses cache:', err);
  }
  return [];
}

function writeCache(list: DriverLicenseResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing driver licenses cache:', err);
  }
  window.dispatchEvent(new CustomEvent(DRIVER_LICENSE_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: DriverLicenseResponseDto) {
  const list = readCache();
  const idx = list.findIndex((d) => d.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((d) => d.id !== id));
}

export function getStoredDriverLicenses(): DriverLicenseResponseDto[] {
  return readCache();
}

/** GET api/DriverLicenses — real backend call, operator-scoped server-side. */
export async function getAllDriverLicenses(): Promise<DriverLicenseResponseDto[]> {
  const res = await api.get('api/DriverLicenses');
  const list: DriverLicenseResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/DriverLicenses/{id} — real backend call. */
export async function getDriverLicenseById(id: string): Promise<DriverLicenseResponseDto | undefined> {
  try {
    const res = await api.get(`api/DriverLicenses/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/**
 * POST api/DriverLicenses — real backend call. A 400 here means the chosen
 * staff member isn't one of your own operator's employees — surface that
 * as a normal form error, not an auth failure.
 */
export async function createDriverLicense(dto: DriverLicenseCreateDto): Promise<DriverLicenseResponseDto> {
  const res = await api.post('api/DriverLicenses', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/DriverLicenses/{id} — real backend call. RowVersion required for concurrency. */
export async function updateDriverLicense(id: string, dto: DriverLicenseUpdateDto): Promise<DriverLicenseResponseDto> {
  const res = await api.put(`api/DriverLicenses/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/DriverLicenses/{id} — real backend call. Soft delete server-side. */
export async function deleteDriverLicense(id: string): Promise<void> {
  await api.delete(`api/DriverLicenses/${id}`);
  removeFromCache(id);
}
