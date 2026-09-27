import { api } from "@/lib/api";
import type { OperatorInvoice, OperatorInvoiceCreatePayload } from "@/types/operatorInvoice";

const BASE = "/api/OperatorInvoices";

// Staff-generated/staff-confirmed only — no generic PUT/DELETE. Status moves only via
// issue/cancel here, or via InvoicePaymentService.RecordReceiptAsync (payment receipts).
export const operatorInvoiceService = {
  getAll: (busOperatorId?: string) =>
    api
      .get<OperatorInvoice[]>(BASE, { params: busOperatorId ? { busOperatorId } : undefined })
      .then((r) => r.data),
  getById: (id: string) => api.get<OperatorInvoice>(`${BASE}/${id}`).then((r) => r.data),
  create: (payload: OperatorInvoiceCreatePayload) =>
    api.post<OperatorInvoice>(BASE, payload).then((r) => r.data),
  issue: (id: string) => api.post<void>(`${BASE}/${id}/issue`),
  cancel: (id: string, reason: string) => api.post<void>(`${BASE}/${id}/cancel`, { reason }),
};