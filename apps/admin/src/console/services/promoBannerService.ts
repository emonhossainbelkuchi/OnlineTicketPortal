import { api } from '@/lib/api';

// Real backend contract (PromoBannersController):
//   GET    api/PromoBanners        [Authorize]  -> PromoBannerResponseDto[]  (any authenticated user)
//   GET    api/PromoBanners/{id}   [Authorize]  -> PromoBannerResponseDto
//   POST   api/PromoBanners        [Admin]      -> PromoBannerResponseDto
//   PUT    api/PromoBanners/{id}   [Admin]      -> PromoBannerResponseDto (RowVersion required)
//   DELETE api/PromoBanners/{id}   [Admin]      -> 204 (soft delete)
// Purely presentational reference data — banners shown on the storefront. Reading is open to
// everyone signed in; defining/editing/deleting is Admin-only.

export interface PromoBannerResponseDto {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface PromoBannerCreateDto {
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface PromoBannerUpdateDto extends PromoBannerCreateDto {
  rowVersion: string;
}

export const PROMO_BANNER_UPDATED_EVENT = 'promo_banners_updated';
const CACHE_KEY = 'ticket_portal_promo_banners_cache';

function readCache(): PromoBannerResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading promo banners cache:', err);
  }
  return [];
}

function writeCache(list: PromoBannerResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing promo banners cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever PromoBanners is used.
  window.dispatchEvent(new CustomEvent(PROMO_BANNER_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: PromoBannerResponseDto) {
  const list = readCache();
  const idx = list.findIndex((b) => b.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((b) => b.id !== id));
}

/** Synchronous cache read, for any consumer (e.g. a homepage carousel) that can't await. */
export function getStoredPromoBanners(): PromoBannerResponseDto[] {
  return readCache();
}

/** GET api/PromoBanners — real backend call, any authenticated user. */
export async function getAllPromoBanners(): Promise<PromoBannerResponseDto[]> {
  const res = await api.get('api/PromoBanners');
  const list: PromoBannerResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/PromoBanners/{id} — real backend call. */
export async function getPromoBannerById(id: string): Promise<PromoBannerResponseDto | undefined> {
  try {
    const res = await api.get(`api/PromoBanners/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/PromoBanners — real backend call, Admin only. */
export async function createPromoBanner(dto: PromoBannerCreateDto): Promise<PromoBannerResponseDto> {
  const res = await api.post('api/PromoBanners', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/PromoBanners/{id} — real backend call, Admin only. RowVersion required for concurrency. */
export async function updatePromoBanner(id: string, dto: PromoBannerUpdateDto): Promise<PromoBannerResponseDto> {
  const res = await api.put(`api/PromoBanners/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/PromoBanners/{id} — real backend call, Admin only. Soft delete server-side. */
export async function deletePromoBanner(id: string): Promise<void> {
  await api.delete(`api/PromoBanners/${id}`);
  removeFromCache(id);
}
