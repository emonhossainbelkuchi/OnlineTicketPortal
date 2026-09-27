import {
  BookingStatus,
  OperatorInventoryMode,
  PayoutStatus,
  SaleChannel,
  SettlementDirection,
  SettlementStatus,
} from './enums';

// Mirrors DTO/AdminDashboardDtos.cs -> AdminDashboardSummaryDto. Backs
// GET /api/admin/dashboard/summary?from=&to=&operatorId= (Admin-only) — every number here is a
// real SQL aggregate, not something computed client-side from downloaded lists. See
// AdminDashboardController.cs and ADMIN_DASHBOARD_DATA_MAP.md for exactly how each field is
// derived from PlatformLedger/Booking/etc.
export interface AdminDashboardSummary {
  fromDate: string;
  toDate: string;
  operatorId: string | null;

  operatorsByInventoryMode: OperatorModeCount[];
  bookingsByChannelAndStatus: BookingChannelStatusBucket[];

  onlineGrossAmount: number;
  onlineBookingCount: number;
  counterTicketCount: number;
  onlineCommissionEarned: number;
  counterCommissionEarned: number;
  onlineRefundAmount: number;
  counterCommissionReversedAmount: number;
  refundCount: number;

  settlementsByStatus: SettlementStatusBucket[];
  payoutsByStatus: PayoutStatusBucket[];

  pendingCancellationRequests: number;
  pendingRefunds: number;
  openComplaints: number;
  activeSeatHolds: number;
  integrationFailuresLast24h: number;
  paymentsNeedingReconciliation: number;
  bookingsAwaitingExternalConfirmation: number;

  dailySeries: DailyChannelPoint[];
}

export interface OperatorModeCount {
  mode: OperatorInventoryMode;
  operatorCount: number;
}

export interface BookingChannelStatusBucket {
  saleChannel: SaleChannel;
  status: BookingStatus;
  count: number;
  grandTotalSum: number;
}

export interface SettlementStatusBucket {
  status: SettlementStatus;
  direction: SettlementDirection;
  count: number;
  netAmountSum: number;
}

export interface PayoutStatusBucket {
  status: PayoutStatus;
  count: number;
  amountSum: number;
}

export interface DailyChannelPoint {
  date: string;
  onlineGrossAmount: number;
  onlineBookingCount: number;
  counterTicketCount: number;
}

// Mirrors DTO/AdminDashboardDtos.cs -> AdminDashboardReportsDto. Backs
// GET /api/admin/dashboard/reports?from=&to=&operatorId= (Admin-only) — feeds the AnalyticsPage
// reports table and its CSV export.
export interface AdminDashboardReports {
  fromDate: string;
  toDate: string;
  operatorId: string | null;

  salesByOperator: OperatorSalesReportRow[];
  onlineVsCounter: OnlineVsCounterSummary;
  settlements: SettlementReportRow[];
}

export interface OperatorSalesReportRow {
  busOperatorId: string;
  busOperatorName: string;
  inventoryMode: OperatorInventoryMode;

  onlineGrossAmount: number;
  onlineBookingCount: number;
  onlineCommissionEarned: number;

  counterTicketCount: number;
  counterCommissionEarned: number;

  refundAmount: number;
  netAmount: number;
}

export interface OnlineVsCounterSummary {
  onlineBookingCount: number;
  onlineGrossAmount: number;
  onlineCommissionEarned: number;
  counterTicketCount: number;
  counterCommissionEarned: number;
}

export interface SettlementReportRow {
  id: string;
  settlementNo: string;
  busOperatorId: string;
  busOperatorName: string;
  fromDate: string;
  toDate: string;
  direction: SettlementDirection;
  status: SettlementStatus;
  onlineGrossAmount: number;
  platformCharge: number;
  refundAmount: number;
  netAmount: number;
}
