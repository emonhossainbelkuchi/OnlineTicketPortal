// src/services/refundService.ts
//
// Thin wrapper over RefundsController. No create/update/delete — see the
// class comment in refund.types.ts. Approve/Reject/Process are scoped to
// staff/operator who can manage the refund's booking; CompleteManualPayout
// is platform-only (Admin/platform-Staff), separate from the other three.

import { api } from '../lib/api';
import type {
  RefundApproveDto,
  RefundManualPayoutDto,
  RefundRejectDto,
  RefundResponseDto,
} from '../types/refund.types';

const BASE_URL = '/api/Refunds';

export const refundService = {
  async getAll(): Promise<RefundResponseDto[]> {
    const { data } = await api.get<RefundResponseDto[]>(BASE_URL);
    return data;
  },

  async getById(id: string): Promise<RefundResponseDto> {
    const { data } = await api.get<RefundResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  /** POST /api/Refunds/{id}/approve — Requested -> Approved. No money moves yet. */
  async approve(id: string, dto: RefundApproveDto): Promise<void> {
    await api.post(`${BASE_URL}/${id}/approve`, dto);
  },

  /** POST /api/Refunds/{id}/reject */
  async reject(id: string, dto: RefundRejectDto): Promise<void> {
    await api.post(`${BASE_URL}/${id}/reject`, dto);
  },

  /** POST /api/Refunds/{id}/process — Approved -> actually moves money. */
  async process(id: string): Promise<RefundResponseDto> {
    const { data } = await api.post<RefundResponseDto>(`${BASE_URL}/${id}/process`);
    return data;
  },

  /**
   * POST /api/Refunds/{id}/manual-payout — the only way a guest refund
   * (PendingManualPayout) finishes. Platform-only.
   */
  async completeManualPayout(id: string, dto: RefundManualPayoutDto): Promise<RefundResponseDto> {
    const { data } = await api.post<RefundResponseDto>(`${BASE_URL}/${id}/manual-payout`, dto);
    return data;
  },
};

export default refundService;
