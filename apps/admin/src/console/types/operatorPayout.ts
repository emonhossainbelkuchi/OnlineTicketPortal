// Mirrors OperatorPayoutResponseDto / CreateDto / CompleteDto / ActionDto.
export type PayoutStatus = "Pending" | "Processing" | "Paid" | "Failed" | "Cancelled";

export interface OperatorPayout {
  id: string;
  busOperatorId: string;
  operatorSettlementId: string | null;
  payoutNo: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paidAtUtc: string | null;
  bankTransactionReference: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface OperatorPayoutCreatePayload {
  busOperatorId: string;
  operatorSettlementId?: string | null;
  amount: number;
  currency: string;
  notes?: string | null;
}

export interface OperatorPayoutCompletePayload {
  bankTransactionReference: string;
}

export interface OperatorPayoutActionPayload {
  reason: string;
}
