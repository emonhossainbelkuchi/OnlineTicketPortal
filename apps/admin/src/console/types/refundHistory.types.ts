// src/types/refundHistory.types.ts
//
// Mirrors RefundHistoriesController exactly — read-only, no Create/Update/
// Delete DTO at all. This is the append-only trail of a Refund's own status
// changes, written exclusively by RefundProcessingService (same idea as
// PaymentHistory tracking Payment). Reuses RefundStatus/labels/badges from
// refund.types.ts so the two audit trails render status consistently.

import { RefundStatus } from './refund.types';
export { RefundStatus, RefundStatusLabel, RefundStatusBadgeClass, RefundStatusIcon } from './refund.types';

export interface RefundHistoryResponseDto {
  id: string;
  refundId: string;
  status: RefundStatus;
  changedAtUtc: string;
  remarks: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Client-side list params — GetAll takes none, so search/filter/sort/paging
// all happen in the hook, same pattern as PaymentHistoriesList/RefundsList.
export interface RefundHistoryListParams {
  search?: string;
  status?: RefundStatus | 'all';
  groupByStatus?: boolean;
  sortBy?: 'changedAtUtc' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
