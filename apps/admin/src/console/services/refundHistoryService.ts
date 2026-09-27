// src/services/refundHistoryService.ts
//
// Thin wrapper over RefundHistoriesController. Read-only — no
// create/update/delete exists on the backend, so none exist here either.

import { api } from '../lib/api';
import type { RefundHistoryResponseDto } from '../types/refundHistory.types';

const BASE_URL = '/api/RefundHistories';

export const refundHistoryService = {
  async getAll(): Promise<RefundHistoryResponseDto[]> {
    const { data } = await api.get<RefundHistoryResponseDto[]>(BASE_URL);
    return data;
  },

  async getById(id: string): Promise<RefundHistoryResponseDto> {
    const { data } = await api.get<RefundHistoryResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },
};

export default refundHistoryService;
