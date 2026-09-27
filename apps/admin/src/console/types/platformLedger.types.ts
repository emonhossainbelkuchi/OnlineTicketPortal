// src/types/platformLedger.types.ts
//
// Mirrors PlatformLedgersController exactly — read-only, no Create/Update/
// Delete DTO at all. PlatformLedger is the append-only master money diary;
// FinanceLedgerService is the ONLY writer (PostOnlineSaleAsync /
// PostCounterSaleCommissionAsync / PostRefundAsync /
// PostCounterSaleRefundAsync), called from PaymentConfirmationService and
// RefundProcessingService. Rows are never edited or deleted once written.

export enum StatementItemType {
  OnlineTicketSale = 1,
  PlatformCommission = 2,
  GatewayCharge = 3,
  Refund = 4,
  CancellationFee = 5,
  CounterSaleCommission = 6,
  ManualAdjustment = 7,
  Tax = 8,
  Payout = 9,
}

export const StatementItemTypeLabel: Record<StatementItemType, string> = {
  [StatementItemType.OnlineTicketSale]: 'Online Ticket Sale',
  [StatementItemType.PlatformCommission]: 'Platform Commission',
  [StatementItemType.GatewayCharge]: 'Gateway Charge',
  [StatementItemType.Refund]: 'Refund',
  [StatementItemType.CancellationFee]: 'Cancellation Fee',
  [StatementItemType.CounterSaleCommission]: 'Counter Sale Commission',
  [StatementItemType.ManualAdjustment]: 'Manual Adjustment',
  [StatementItemType.Tax]: 'Tax',
  [StatementItemType.Payout]: 'Payout',
};

export const StatementItemTypeIcon: Record<StatementItemType, string> = {
  [StatementItemType.OnlineTicketSale]: 'fa-solid fa-ticket',
  [StatementItemType.PlatformCommission]: 'fa-solid fa-percent',
  [StatementItemType.GatewayCharge]: 'fa-solid fa-credit-card',
  [StatementItemType.Refund]: 'fa-solid fa-rotate-left',
  [StatementItemType.CancellationFee]: 'fa-solid fa-ban',
  [StatementItemType.CounterSaleCommission]: 'fa-solid fa-cash-register',
  [StatementItemType.ManualAdjustment]: 'fa-solid fa-pen',
  [StatementItemType.Tax]: 'fa-solid fa-landmark',
  [StatementItemType.Payout]: 'fa-solid fa-money-bill-transfer',
};

// Debit-flavored item types render red (money owed/out), credit-flavored render green
// (money in) — a quick visual cue on top of the raw Debit/Credit columns.
export const DEBIT_FLAVORED_TYPES = new Set<StatementItemType>([
  StatementItemType.Refund,
  StatementItemType.CancellationFee,
  StatementItemType.Payout,
]);

export enum SaleChannel {
  Online = 1,
  Counter = 2,
  Agent = 3,
  Admin = 4,
  ExternalApi = 5,
}

export const SaleChannelLabel: Record<SaleChannel, string> = {
  [SaleChannel.Online]: 'Online',
  [SaleChannel.Counter]: 'Counter',
  [SaleChannel.Agent]: 'Agent',
  [SaleChannel.Admin]: 'Admin',
  [SaleChannel.ExternalApi]: 'External API',
};

export interface PlatformLedgerResponseDto {
  id: string;
  bookingId: string | null;
  paymentId: string | null;
  refundId: string | null;
  busOperatorId: string | null;
  operatorSettlementId: string | null;
  ledgerNo: string;
  itemType: StatementItemType;
  saleChannel: SaleChannel | null;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  referenceNo: string | null;
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Client-side list params — GetAll only takes an optional busOperatorId
// server-side (for platform Admin/Staff browsing one operator's rows);
// search/type-filter/channel-filter/group-by/sort/paging all happen here.
export interface PlatformLedgerListParams {
  search?: string;
  itemType?: StatementItemType | 'all';
  saleChannel?: SaleChannel | 'all';
  groupByItemType?: boolean;
  sortBy?: 'createdAtUtc' | 'debitAmount' | 'creditAmount' | 'itemType';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
