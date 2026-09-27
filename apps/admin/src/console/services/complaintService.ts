import { api } from '@/lib/api';

// Real backend contract (ComplaintsController):
//   GET    api/Complaints             [Authorize] -> own complaints only, unless Admin/Staff/Operator
//   GET    api/Complaints/{id}        [Authorize] -> 403 if not yours and you're not Admin/Staff/Operator
//   POST   api/Complaints             [Authorize] -> CustomerProfileId resolved server-side
//   PUT    api/Complaints/{id}        [Authorize] -> owner or Admin/Staff/Operator; Status/ResolvedAtUtc untouched
//   POST   api/Complaints/{id}/status [Admin/Staff/Operator only] -> the only way Status actually moves
//   DELETE api/Complaints/{id}        [Admin/Staff/Operator only]

export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface ComplaintResponseDto {
  id: string;
  customerProfileId: string;
  bookingId?: string | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolvedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// CustomerProfileId/Status/ResolvedAtUtc all deliberately absent — resolved/controlled
// server-side. See ComplaintsController.
export interface ComplaintCreateDto {
  bookingId?: string | null;
  subject: string;
  description: string;
}

export interface ComplaintUpdateDto {
  bookingId?: string | null;
  subject: string;
  description: string;
  rowVersion: string;
}

export interface ComplaintStatusUpdateDto {
  status: ComplaintStatus;
}

export const COMPLAINT_UPDATED_EVENT = 'complaints_updated';
const CACHE_KEY = 'ticket_portal_complaints_cache';

function readCache(): ComplaintResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading complaints cache:', err);
  }
  return [];
}

function writeCache(list: ComplaintResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing complaints cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Status
  // change/Delete against the real API instantly, wherever Complaints is used.
  window.dispatchEvent(new CustomEvent(COMPLAINT_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: ComplaintResponseDto) {
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
export function getStoredComplaints(): ComplaintResponseDto[] {
  return readCache();
}

/** GET api/Complaints — real backend call. Own complaints only, unless Admin/Staff/Operator. */
export async function getAllComplaints(): Promise<ComplaintResponseDto[]> {
  const res = await api.get('api/Complaints');
  const list: ComplaintResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/Complaints/{id} — real backend call. */
export async function getComplaintById(id: string): Promise<ComplaintResponseDto | undefined> {
  try {
    const res = await api.get(`api/Complaints/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/Complaints — real backend call. CustomerProfileId resolved server-side. */
export async function createComplaint(dto: ComplaintCreateDto): Promise<ComplaintResponseDto> {
  const res = await api.post('api/Complaints', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/Complaints/{id} — real backend call. RowVersion required. Status is never touched here. */
export async function updateComplaint(id: string, dto: ComplaintUpdateDto): Promise<ComplaintResponseDto> {
  const res = await api.put(`api/Complaints/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** POST api/Complaints/{id}/status — real backend call, Admin/Staff/Operator only. */
export async function updateComplaintStatus(id: string, dto: ComplaintStatusUpdateDto): Promise<ComplaintResponseDto> {
  const res = await api.post(`api/Complaints/${id}/status`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/Complaints/{id} — real backend call, Admin/Staff/Operator only. Soft delete. */
export async function deleteComplaint(id: string): Promise<void> {
  await api.delete(`api/Complaints/${id}`);
  removeFromCache(id);
}
