import { api } from '@/lib/api';

// Real backend contract (StaffAttendancesController):
//   GET    api/StaffAttendances        [Authorize] -> operator-scoped for Staff/Operator, all for Admin
//   GET    api/StaffAttendances/{id}   [Authorize]
//   POST   api/StaffAttendances        [Authorize] -> StaffProfileId verified against caller's own operator scope
//   PUT    api/StaffAttendances/{id}   [Authorize] (RowVersion required)
//   DELETE api/StaffAttendances/{id}   [Authorize] -> 204 (soft delete)
// StaffProfileId never reassignable via Update — a different employee's record is a new record.

export type AttendanceStatus = 'Present' | 'Absent' | 'OnLeave' | 'HalfDay';

export interface StaffAttendanceResponseDto {
  id: string;
  staffProfileId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface StaffAttendanceCreateDto {
  staffProfileId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface StaffAttendanceUpdateDto {
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string | null;
  rowVersion: string;
}

export const STAFF_ATTENDANCE_UPDATED_EVENT = 'staff_attendances_updated';
const CACHE_KEY = 'ticket_portal_staff_attendances_cache';

function readCache(): StaffAttendanceResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading staff attendances cache:', err);
  }
  return [];
}

function writeCache(list: StaffAttendanceResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing staff attendances cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever StaffAttendances is used.
  window.dispatchEvent(new CustomEvent(STAFF_ATTENDANCE_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: StaffAttendanceResponseDto) {
  const list = readCache();
  const idx = list.findIndex((a) => a.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((a) => a.id !== id));
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredStaffAttendances(): StaffAttendanceResponseDto[] {
  return readCache();
}

/** GET api/StaffAttendances — real backend call. */
export async function getAllStaffAttendances(): Promise<StaffAttendanceResponseDto[]> {
  const res = await api.get('api/StaffAttendances');
  const list: StaffAttendanceResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/StaffAttendances/{id} — real backend call. */
export async function getStaffAttendanceById(id: string): Promise<StaffAttendanceResponseDto | undefined> {
  try {
    const res = await api.get(`api/StaffAttendances/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/StaffAttendances — real backend call. StaffProfileId verified against operator scope. */
export async function createStaffAttendance(dto: StaffAttendanceCreateDto): Promise<StaffAttendanceResponseDto> {
  const res = await api.post('api/StaffAttendances', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/StaffAttendances/{id} — real backend call. RowVersion required for concurrency. */
export async function updateStaffAttendance(id: string, dto: StaffAttendanceUpdateDto): Promise<StaffAttendanceResponseDto> {
  const res = await api.put(`api/StaffAttendances/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/StaffAttendances/{id} — real backend call. Soft delete server-side. */
export async function deleteStaffAttendance(id: string): Promise<void> {
  await api.delete(`api/StaffAttendances/${id}`);
  removeFromCache(id);
}