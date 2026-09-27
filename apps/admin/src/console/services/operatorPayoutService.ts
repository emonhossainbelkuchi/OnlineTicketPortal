import { api } from "@/lib/api";
import type {
  OperatorPayout,
  OperatorPayoutCreatePayload,
  OperatorPayoutCompletePayload,
  OperatorPayoutActionPayload,
} from "@/types/operatorPayout";

const BASE = "/api/OperatorPayouts";

// No generic PUT/DELETE — every state change goes through PayoutProcessingService
// via the dedicated action endpoints below.
export const operatorPayoutService = {
  getAll: (busOperatorId?: string) =>
    api
      .get<OperatorPayout[]>(BASE, { params: busOperatorId ? { busOperatorId } : undefined })
      .then((r) => r.data),
  getById: (id: string) => api.get<OperatorPayout>(`${BASE}/${id}`).then((r) => r.data),
  create: (payload: OperatorPayoutCreatePayload) =>
    api.post<OperatorPayout>(BASE, payload).then((r) => r.data),
  process: (id: string) => api.post(`${BASE}/${id}/process`),
  complete: (id: string, payload: OperatorPayoutCompletePayload) =>
    api.post<OperatorPayout>(`${BASE}/${id}/complete`, payload).then((r) => r.data),
  fail: (id: string, payload: OperatorPayoutActionPayload) =>
    api.post(`${BASE}/${id}/fail`, payload),
  cancel: (id: string, payload: OperatorPayoutActionPayload) =>
    api.post(`${BASE}/${id}/cancel`, payload),
};
