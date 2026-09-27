import { api } from '@/lib/api';

// Real backend contract (CustomerAddressesController):
//   GET    api/CustomerAddresses        [Authorize] -> own addresses only; Admin/Staff/Operator see everyone's
//   GET    api/CustomerAddresses/{id}   [Authorize] -> 403 if it's not yours (and you're not Admin/Staff/Operator)
//   POST   api/CustomerAddresses        [Authorize] -> CustomerProfileId is resolved server-side, never sent by the client
//   PUT    api/CustomerAddresses/{id}   [Authorize] -> owner or Admin/Staff/Operator, RowVersion required
//   DELETE api/CustomerAddresses/{id}   [Authorize] -> owner or Admin/Staff/Operator, soft delete

export interface CustomerAddressResponseDto {
  id: string;
  customerProfileId: string;
  label: string;
  addressLine: string;
  city: string;
  district: string;
  country: string;
  isDefault: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// CustomerProfileId deliberately absent — the real API always resolves it from whoever is
// logged in (lazy-provisioning a CustomerProfile if needed), the same as Booking/Complaint/Review.
export interface CustomerAddressCreateDto {
  label: string;
  addressLine: string;
  city: string;
  district: string;
  country?: string;
  isDefault?: boolean;
}

export interface CustomerAddressUpdateDto extends CustomerAddressCreateDto {
  rowVersion: string;
}

export const CUSTOMER_ADDRESS_UPDATED_EVENT = 'customer_addresses_updated';
const CACHE_KEY = 'ticket_portal_customer_addresses_cache';

function readCache(): CustomerAddressResponseDto[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading customer addresses cache:', err);
  }
  return [];
}

function writeCache(list: CustomerAddressResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing customer addresses cache:', err);
  }
  // Realtime: every List/Details/Edit page listening for this reflects a Create/Edit/Delete
  // against the real API instantly, wherever CustomerAddresses is used.
  window.dispatchEvent(new CustomEvent(CUSTOMER_ADDRESS_UPDATED_EVENT, { detail: list }));
}

function upsertCache(item: CustomerAddressResponseDto) {
  const list = readCache();
  const idx = list.findIndex((a) => a.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeCache(list);
}

function removeFromCache(id: string) {
  writeCache(readCache().filter((a) => a.id !== id));
}

/** Synchronous cache read, for any consumer (e.g. a checkout address picker) that can't await. */
export function getStoredCustomerAddresses(): CustomerAddressResponseDto[] {
  return readCache();
}

/** GET api/CustomerAddresses — real backend call. Own addresses only, unless Admin/Staff/Operator. */
export async function getAllCustomerAddresses(): Promise<CustomerAddressResponseDto[]> {
  const res = await api.get('api/CustomerAddresses');
  const list: CustomerAddressResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/CustomerAddresses/{id} — real backend call. */
export async function getCustomerAddressById(id: string): Promise<CustomerAddressResponseDto | undefined> {
  try {
    const res = await api.get(`api/CustomerAddresses/${id}`);
    if (res.data) upsertCache(res.data);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

/** POST api/CustomerAddresses — real backend call. CustomerProfileId resolved server-side. */
export async function createCustomerAddress(dto: CustomerAddressCreateDto): Promise<CustomerAddressResponseDto> {
  const res = await api.post('api/CustomerAddresses', dto);
  upsertCache(res.data);
  return res.data;
}

/** PUT api/CustomerAddresses/{id} — real backend call. RowVersion required for concurrency. */
export async function updateCustomerAddress(id: string, dto: CustomerAddressUpdateDto): Promise<CustomerAddressResponseDto> {
  const res = await api.put(`api/CustomerAddresses/${id}`, dto);
  upsertCache(res.data);
  return res.data;
}

/** DELETE api/CustomerAddresses/{id} — real backend call. Soft delete server-side. */
export async function deleteCustomerAddress(id: string): Promise<void> {
  await api.delete(`api/CustomerAddresses/${id}`);
  removeFromCache(id);
}
