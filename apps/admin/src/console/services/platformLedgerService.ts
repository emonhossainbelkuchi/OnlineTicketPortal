// src/services/platformLedgerService.ts
//
// Thin wrapper over PlatformLedgersController. Read-only — no
// create/update/delete exists on the backend (FinanceLedgerService is the
// only writer), so none exist here either.

import { api } from '../lib/api';
import type { PlatformLedgerResponseDto } from '../types/platformLedger.types';

const BASE_URL = '/api/PlatformLedgers';

export const platformLedgerService = {
  /**
   * GET /api/PlatformLedgers?busOperatorId=...
   * busOperatorId is honored server-side only for platform Admin/Staff
   * (an operator's own Staff/Operator account is already scoped to its own
   * rows and this param is ignored for them). Pass it to let a platform
   * admin narrow the view to one operator.
   */
  async getAll(busOperatorId?: string): Promise<PlatformLedgerResponseDto[]> {
    const { data } = await api.get<PlatformLedgerResponseDto[]>(BASE_URL, {
      params: busOperatorId ? { busOperatorId } : undefined,
    });
    return data;
  },

  async getById(id: string): Promise<PlatformLedgerResponseDto> {
    const { data } = await api.get<PlatformLedgerResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },
};

export default platformLedgerService;
