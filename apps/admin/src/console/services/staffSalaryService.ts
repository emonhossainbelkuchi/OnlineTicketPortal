import { api } from '@/lib/api';

// Real backend contract (StaffSalariesController):
//   GET    api/StaffSalaries        [Authorize] -> operator-scoped for Staff/Operator, all for Admin
//   GET    api/StaffSalaries/{id}   [Authorize]
//   POST   api/StaffSalaries        [Authorize] -> StaffProfileId verified against caller's own operator scope
//   PUT    api/StaffSalaries/{id}   [Authorize] (RowVersion required)
//   DELETE api/StaffSalaries/{id}   [Authorize] -> 204 (soft delete)
// StaffProfileId never reassignable via Update — a different employee's record is a new record.
// Amount/IsPaid/PaidAtUtc/PaymentReference stay directly editable (plain CRUD shape, not a
// dedicated payroll workflow — see controller header comment).

export interface StaffSalaryResponseDto {
  id: string;
  staffProfileId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string | null;
  paymentReference?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface StaffSalaryCreateDto {
  staffProfileId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string | null;
  paymentReference?: string | null;
}

export interface StaffSalaryUpdateDto {
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string | null;
  paymentReference?: string | null;
  rowVersion: string;
}

export const STAFF_SALARY_UPDATED_EVENT = 'staff_salaries_updated';
const CACHE_KEY = 'ticket_portal_staff_salaries_cache';

function readCache(): StaffSalaryResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading staff salaries cache:', err);
  }
  return [];
}

function writeCache(list: StaffSalaryResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing staff salaries cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever StaffSalaries is used.
  window.dispatchEvent(new CustomEvent(STAFF_SALARY_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: StaffSalaryResponseDto) {
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
export function getStoredStaffSalaries(): StaffSalaryResponseDto[] {
  return readCache();
}

/** GET api/StaffSalaries — real backend call. */
export async function getAllStaffSalaries(): Promise<StaffSalaryResponseDto[]> {
  const res = await api.get('api/StaffSalaries');
  const list: StaffSalaryResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/StaffSalaries/{id} — real backend call. */
export async function getStaffSalaryById(id: string): Promise<StaffSalaryResponseDto | undefined> {
  try {
    const res = await api.get(`api/StaffSalaries/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/StaffSalaries — real backend call. StaffProfileId verified against operator scope. */
export async function createStaffSalary(dto: StaffSalaryCreateDto): Promise<StaffSalaryResponseDto> {
  const res = await api.post('api/StaffSalaries', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/StaffSalaries/{id} — real backend call. RowVersion required for concurrency. */
export async function updateStaffSalary(id: string, dto: StaffSalaryUpdateDto): Promise<StaffSalaryResponseDto> {
  const res = await api.put(`api/StaffSalaries/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/StaffSalaries/{id} — real backend call. Soft delete server-side. */
export async function deleteStaffSalary(id: string): Promise<void> {
  await api.delete(`api/StaffSalaries/${id}`);
  removeFromCache(id);
}