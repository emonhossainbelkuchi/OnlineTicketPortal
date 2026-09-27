// OperatorSettlement types — mirrors OperatorSettlementsController DTOs.
// NOTE: SettlementDirection / SettlementStatus / StatementItemType numeric/string values are
// GUESSED (backend enum definitions weren't provided). Check your actual
// Models/Enums/SettlementDirection.cs, SettlementStatus.cs, StatementItemType.cs and fix the
// members/labels below if they differ.

import { SaleChannel, SaleChannelLabel } from './commissionRule.types';
export { SaleChannel, SaleChannelLabel };

export enum SettlementDirection {
  PlatformPaysOperator = 0,
  OperatorPaysPlatform = 1,
}

export const SettlementDirectionLabel: Record<SettlementDirection, string> = {
  [SettlementDirection.PlatformPaysOperator]: 'Platform → Operator',
  [SettlementDirection.OperatorPaysPlatform]: 'Operator → Platform',
};

export enum SettlementStatus {
  Draft = 0,
  Approved = 1,
  Paid = 2,
  Cancelled = 3,
}

export const SettlementStatusLabel: Record<SettlementStatus, string> = {
  [SettlementStatus.Draft]: 'Draft',
  [SettlementStatus.Approved]: 'Approved',
  [SettlementStatus.Paid]: 'Paid',
  [SettlementStatus.Cancelled]: 'Cancelled',
};

export const SettlementStatusBadgeClass: Record<SettlementStatus, string> = {
  [SettlementStatus.Draft]: 'bg-secondary',
  [SettlementStatus.Approved]: 'bg-info',
  [SettlementStatus.Paid]: 'bg-success',
  [SettlementStatus.Cancelled]: 'bg-danger',
};

export enum StatementItemType {
  TicketSale = 0,
  Refund = 1,
  PlatformCharge = 2,
  GatewayCharge = 3,
  Adjustment = 4,
}

export const StatementItemTypeLabel: Record<StatementItemType, string> = {
  [StatementItemType.TicketSale]: 'Ticket Sale',
  [StatementItemType.Refund]: 'Refund',
  [StatementItemType.PlatformCharge]: 'Platform Charge',
  [StatementItemType.GatewayCharge]: 'Gateway Charge',
  [StatementItemType.Adjustment]: 'Adjustment',
};

export interface OperatorSettlement {
  id: string;
  busOperatorId: string;
  operatorStatementId?: string | null;
  operatorInvoiceId?: string | null;
  settlementNo: string;
  fromDate: string; // 'yyyy-MM-dd'
  toDate: string;
  direction: SettlementDirection;
  status: SettlementStatus;
  onlineGrossAmount: number;
  offlineGrossAmount: number;
  platformCharge: number;
  gatewayCharge: number;
  refundAmount: number;
  netAmount: number;
  paidAtUtc?: string | null;
  remarks?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorSettlementItem {
  id: string;
  operatorSettlementId: string;
  bookingId?: string | null;
  ticketId?: string | null;
  platformLedgerId?: string | null;
  itemType: StatementItemType;
  saleChannel: SaleChannel;
  ticketFare: number;
  platformCharge: number;
  gatewayCharge: number;
  refundAmount: number;
  netAmount: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorSettlementDetail extends OperatorSettlement {
  items: OperatorSettlementItem[];
}

// POST /api/OperatorSettlements/generate — runs SettlementGenerationService for one
// operator + date range. This is the "Create" action; there is no generic Create/Update.
export interface SettlementGenerateDto {
  busOperatorId: string;
  fromDate: string;
  toDate: string;
  remarks?: string | null;
}

// POST /api/OperatorSettlements/{id}/approve — Draft -> Approved only, platform-staff/Admin only.
export interface SettlementApproveDto {
  remarks?: string | null;
}
