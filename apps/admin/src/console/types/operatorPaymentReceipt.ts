export interface OperatorPaymentReceipt {
  id: string;
  operatorInvoiceId: string;
  receivedAtUtc: string;
  amount: number;
  currency: string;
  referenceNo?: string | null;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorPaymentReceiptCreatePayload {
  operatorInvoiceId: string;
  amount: number;
  currency: string;
  referenceNo?: string | null;
  notes?: string | null;
}