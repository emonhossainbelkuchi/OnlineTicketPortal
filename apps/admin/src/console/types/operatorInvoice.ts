export type InvoiceStatus = "Draft" | "Issued" | "Paid" | "Cancelled";
export type SettlementDirection = "PlatformPaysOperator" | "OperatorPaysPlatform";

export interface OperatorInvoice {
  id: string;
  busOperatorId: string;
  operatorStatementId?: string | null;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  direction: SettlementDirection;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorInvoiceCreatePayload {
  busOperatorId: string;
  operatorStatementId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  direction: SettlementDirection;
  amount: number;
  currency: string;
}