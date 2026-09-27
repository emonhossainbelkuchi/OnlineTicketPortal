import { api } from '@/lib/api';

// Real backend contract (CouponsController):
//   GET    api/Coupons        [Authorize]  -> CouponResponseDto[]   (any authenticated user)
//   GET    api/Coupons/{id}   [Authorize]  -> CouponResponseDto
//   POST   api/Coupons        [Admin]      -> CouponResponseDto
//   PUT    api/Coupons/{id}   [Admin]      -> CouponResponseDto (RowVersion required)
//   DELETE api/Coupons/{id}   [Admin]      -> 204 (soft delete)
// UsedCount is never client-settable — it only moves through CouponRedemptionService.

export type CouponType = 'FixedAmount' | 'Percentage';

export interface CouponResponseDto {
  id: string;
  code: string;
  description?: string | null;
  type: CouponType;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  validFromUtc: string;
  validToUtc: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface CouponCreateDto {
  code: string;
  description?: string | null;
  type: CouponType;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  validFromUtc: string;
  validToUtc: string;
  isActive: boolean;
}

export interface CouponUpdateDto extends CouponCreateDto {
  rowVersion: string;
}

export const COUPON_UPDATED_EVENT = 'coupons_updated';
const CACHE_KEY = 'ticket_portal_coupons_cache';

function readCache(): CouponResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading coupons cache:', err);
  }
  return [];
}

function writeCache(list: CouponResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing coupons cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever Coupons is used.
  window.dispatchEvent(new CustomEvent(COUPON_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: CouponResponseDto) {
  const list = readCache();
  const idx = list.findIndex((c) => c.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((c) => c.id !== id));
}

/** Synchronous cache read, for any consumer (e.g. a checkout coupon picker) that can't await. */
export function getStoredCoupons(): CouponResponseDto[] {
  return readCache();
}

/** GET api/Coupons — real backend call, any authenticated user. */
export async function getAllCoupons(): Promise<CouponResponseDto[]> {
  const res = await api.get('api/Coupons');
  const list: CouponResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/Coupons/{id} — real backend call. */
export async function getCouponById(id: string): Promise<CouponResponseDto | undefined> {
  try {
    const res = await api.get(`api/Coupons/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/Coupons — real backend call, Admin only. */
export async function createCoupon(dto: CouponCreateDto): Promise<CouponResponseDto> {
  const res = await api.post('api/Coupons', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/Coupons/{id} — real backend call, Admin only. RowVersion required for concurrency. */
export async function updateCoupon(id: string, dto: CouponUpdateDto): Promise<CouponResponseDto> {
  const res = await api.put(`api/Coupons/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/Coupons/{id} — real backend call, Admin only. Soft delete server-side. */
export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`api/Coupons/${id}`);
  removeFromCache(id);
}
