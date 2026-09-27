import { api } from '@/lib/api';

// Real backend contract (CouponUsagesController):
//   GET  api/CouponUsages         [Authorize] -> CouponUsageResponseDto[] (own usages unless Admin/Staff)
//   GET  api/CouponUsages/{id}    [Authorize] -> CouponUsageResponseDto
//   POST api/CouponUsages/redeem [Authorize] -> CouponUsageResponseDto
// No generic POST/PUT/DELETE — a redemption record is a fact about what already happened,
// created only via Redeem, which resolves discount/eligibility/owner server-side.

export interface CouponUsageResponseDto {
  id: string;
  couponId: string;
  bookingId: string;
  customerProfileId?: string | null;
  discountApplied: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface CouponRedeemDto {
  code: string;
  bookingId: string;
}

export const COUPON_USAGE_UPDATED_EVENT = 'coupon_usages_updated';
const CACHE_KEY = 'ticket_portal_coupon_usages_cache';

function readCache(): CouponUsageResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading coupon usages cache:', err);
  }
  return [];
}

function writeCache(list: CouponUsageResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing coupon usages cache:', err);
  }
  // Realtime: every List/Details page listening for this reflects a Redeem against the real
  // API instantly, wherever CouponUsages is used.
  window.dispatchEvent(new CustomEvent(COUPON_USAGE_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: CouponUsageResponseDto) {
  const list = readCache();
  const idx = list.findIndex((u) => u.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredCouponUsages(): CouponUsageResponseDto[] {
  return readCache();
}

/** GET api/CouponUsages — real backend call. */
export async function getAllCouponUsages(): Promise<CouponUsageResponseDto[]> {
  const res = await api.get('api/CouponUsages');
  const list: CouponUsageResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/CouponUsages/{id} — real backend call. */
export async function getCouponUsageById(id: string): Promise<CouponUsageResponseDto | undefined> {
  try {
    const res = await api.get(`api/CouponUsages/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/CouponUsages/redeem — real backend call. The only way a usage is ever created. */
export async function redeemCoupon(dto: CouponRedeemDto): Promise<CouponUsageResponseDto> {
  const res = await api.post('api/CouponUsages/redeem', dto);
  upsertCache(res.data);
  return res.data;
}