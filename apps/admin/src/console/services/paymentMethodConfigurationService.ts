// src/services/paymentMethodConfigurationService.ts
//
// Thin wrapper over PaymentMethodConfigurationsController. Every write path
// here mirrors what the backend actually enforces:
//   - Every action is Admin-only (GetAll/GetById return Forbid/empty for
//     anyone else — this service does NOT hide the UI on its own, it trusts
//     the backend's own gate and just surfaces whatever comes back).
//   - Update requires RowVersion (optimistic concurrency) — a 409 Conflict
//     means someone else changed it first; the caller must re-GET and retry.
//   - Delete is a soft delete server-side; the row simply stops appearing in
//     GetAll afterwards.

import { api } from '../lib/api';
import type {
  PaymentMethodConfigurationCreateDto,
  PaymentMethodConfigurationResponseDto,
  PaymentMethodConfigurationUpdateDto,
  PaymentProviderSummary,
} from '../types/paymentMethodConfiguration.types';

const BASE_URL = '/api/PaymentMethodConfigurations';

export const paymentMethodConfigurationService = {
  async getAll(): Promise<PaymentMethodConfigurationResponseDto[]> {
    const { data } = await api.get<PaymentMethodConfigurationResponseDto[]>(BASE_URL);
    return data;
  },

  async getById(id: string): Promise<PaymentMethodConfigurationResponseDto> {
    const { data } = await api.get<PaymentMethodConfigurationResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  async create(
    dto: PaymentMethodConfigurationCreateDto
  ): Promise<PaymentMethodConfigurationResponseDto> {
    const { data } = await api.post<PaymentMethodConfigurationResponseDto>(BASE_URL, dto);
    return data;
  },

  /**
   * PUT /api/PaymentMethodConfigurations/{id}
   * dto.rowVersion MUST be the RowVersion from the most recent GET. A 409
   * means someone else saved a change first — surface that distinctly from
   * a generic error so the Edit page can prompt "reload latest & retry"
   * instead of just failing silently.
   */
  async update(
    id: string,
    dto: PaymentMethodConfigurationUpdateDto
  ): Promise<PaymentMethodConfigurationResponseDto> {
    const { data } = await api.put<PaymentMethodConfigurationResponseDto>(`${BASE_URL}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },
};

export default paymentMethodConfigurationService;

// ---------------------------------------------------------------------------
// PaymentProviders lookup — used by the Create/Edit form's provider dropdown
// and by List/Details to resolve PaymentProviderId into a readable name.
// Best-effort: if this endpoint's shape differs, adjust the field mapping
// below; callers degrade to showing the raw provider ID if this fails.
// ---------------------------------------------------------------------------
export async function getPaymentProviders(): Promise<PaymentProviderSummary[]> {
  try {
    const { data } = await api.get('/api/PaymentProviders');
    return (data as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      providerKind: p.providerKind,
      gateway: p.gateway,
      isActive: p.isActive,
    }));
  } catch {
    return [];
  }
}
