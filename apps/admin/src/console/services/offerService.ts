// src/services/offerService.ts
//
// Thin wrapper over OffersController. GetAll/GetById are open to everyone;
// Create/Update/Delete require Admin — this service doesn't hide the UI on
// its own, it trusts the backend's own gate and surfaces whatever comes
// back (403 => not Admin).

import { api } from '../lib/api';
import type {
  BusOperatorSummary,
  OfferCreateDto,
  OfferResponseDto,
  OfferUpdateDto,
} from '../types/offer.types';

const BASE_URL = '/api/Offers';

export const offerService = {
  async getAll(): Promise<OfferResponseDto[]> {
    const { data } = await api.get<OfferResponseDto[]>(BASE_URL);
    return data;
  },

  async getById(id: string): Promise<OfferResponseDto> {
    const { data } = await api.get<OfferResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  /** Admin-only. */
  async create(dto: OfferCreateDto): Promise<OfferResponseDto> {
    const { data } = await api.post<OfferResponseDto>(BASE_URL, dto);
    return data;
  },

  /**
   * Admin-only. dto.rowVersion MUST be the RowVersion from the most recent
   * GET. A 409 means someone else saved a change first.
   */
  async update(id: string, dto: OfferUpdateDto): Promise<OfferResponseDto> {
    const { data } = await api.put<OfferResponseDto>(`${BASE_URL}/${id}`, dto);
    return data;
  },

  /** Admin-only. Soft delete server-side. */
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },
};

export default offerService;

// ---------------------------------------------------------------------------
// BusOperators lookup — used by the Create/Edit form's operator dropdown
// (BusOperatorId is nullable: a platform-wide offer has none). Best-effort:
// if this endpoint's shape differs, adjust the mapping below.
// ---------------------------------------------------------------------------
export async function getBusOperators(): Promise<BusOperatorSummary[]> {
  try {
    const { data } = await api.get('/api/BusOperators');
    return (data as any[]).map((o) => ({ id: o.id, name: o.name }));
  } catch {
    return [];
  }
}
