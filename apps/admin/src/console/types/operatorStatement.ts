export type SettlementStatus = "Draft" | "Approved" | "Paid" | "Cancelled";
export type SettlementDirection = "PlatformPaysOperator" | "OperatorPaysPlatform";
export type StatementItemType = string;
export type SaleChannel = string;

export interface OperatorStatement {
  id: string;
  busOperatorId: string;
  statementNo: string;
  fromDate: string;
  toDate: string;
  platformPayableToOperator: number;
  operatorPayableToPlatform: number;
  netAmount: number;
  netDirection: SettlementDirection;
  status: SettlementStatus;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorStatementItem {
  id: string;
  operatorStatementId: string;
  bookingId?: string | null;
  ticketId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  platformLedgerId?: string | null;
  itemType: StatementItemType;
  saleChannel: SaleChannel;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorStatementDetail extends OperatorStatement {
  items: OperatorStatementItem[];
}