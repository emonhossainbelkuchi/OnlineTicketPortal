import { api } from "@/lib/api";
import type {
  OperatorPaymentReceipt,
  OperatorPaymentReceiptCreatePayload,
} from "@/types/operatorPaymentReceipt";

const BASE = "/api/OperatorPaymentReceipts";

// Create records a real receipt against an invoice (InvoicePaymentService.RecordReceiptAsync
// drives the invoice's Status forward) — no update/delete, a receipt is a financial record.
export const operatorPaymentReceiptService = {
  getAll: (operatorInvoiceId?: string) =>
    api
      .get<OperatorPaymentReceipt[]>(BASE, {
        params: operatorInvoiceId ? { operatorInvoiceId } : undefined,
      })
      .then((r) => r.data),
  getById: (id: string) => api.get<OperatorPaymentReceipt>(`${BASE}/${id}`).then((r) => r.data),
  create: (payload: OperatorPaymentReceiptCreatePayload) =>
    api.post<OperatorPaymentReceipt>(BASE, payload).then((r) => r.data),
};