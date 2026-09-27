import { api } from '@/lib/api';

// Real backend contract (ReviewsController):
//   GET    api/Reviews        [Authorize] -> ReviewResponseDto[]  (unscoped — shown to all customers)
//   GET    api/Reviews/{id}   [Authorize] -> ReviewResponseDto
//   POST   api/Reviews        [Authorize] -> requires a real, own, Completed booking on TripId
//   PUT    api/Reviews/{id}   [Authorize] -> own review or Admin/Staff/Operator; Rating/Comment only
//   DELETE api/Reviews/{id}   [Authorize] -> own review or Admin/Staff/Operator; soft delete
// CustomerProfileId is never client-supplied — resolved server-side. TripId/BookingId are
// permanent once created — Update can never reassign them.

export interface ReviewResponseDto {
  id: string;
  customerProfileId: string;
  tripId: string;
  bookingId?: string | null;
  rating: number;
  comment?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface ReviewCreateDto {
  tripId: string;
  bookingId: string;
  rating: number;
  comment?: string | null;
}

export interface ReviewUpdateDto {
  rating: number;
  comment?: string | null;
  rowVersion: string;
}

export const REVIEW_UPDATED_EVENT = 'reviews_updated';
const CACHE_KEY = 'ticket_portal_reviews_cache';

function readCache(): ReviewResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading reviews cache:', err);
  }
  return [];
}

function writeCache(list: ReviewResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing reviews cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever Reviews is used.
  window.dispatchEvent(new CustomEvent(REVIEW_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: ReviewResponseDto) {
  const list = readCache();
  const idx = list.findIndex((r) => r.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((r) => r.id !== id));
}

/** Synchronous cache read, for any consumer that can't await. */
export function getStoredReviews(): ReviewResponseDto[] {
  return readCache();
}

/** GET api/Reviews — real backend call. Unscoped, shown to all authenticated users. */
export async function getAllReviews(): Promise<ReviewResponseDto[]> {
  const res = await api.get('api/Reviews');
  const list: ReviewResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/Reviews/{id} — real backend call. */
export async function getReviewById(id: string): Promise<ReviewResponseDto | undefined> {
  try {
    const res = await api.get(`api/Reviews/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/Reviews — real backend call. Requires a real, own, Completed booking on the trip. */
export async function createReview(dto: ReviewCreateDto): Promise<ReviewResponseDto> {
  const res = await api.post('api/Reviews', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/Reviews/{id} — real backend call. RowVersion required. Rating/Comment only. */
export async function updateReview(id: string, dto: ReviewUpdateDto): Promise<ReviewResponseDto> {
  const res = await api.put(`api/Reviews/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/Reviews/{id} — real backend call. Soft delete server-side. */
export async function deleteReview(id: string): Promise<void> {
  await api.delete(`api/Reviews/${id}`);
  removeFromCache(id);
}