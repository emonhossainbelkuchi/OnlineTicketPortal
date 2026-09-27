import { api } from "@/lib/api";
import type { TaxRule, TaxRuleCreatePayload, TaxRuleUpdatePayload } from "@/types/taxRule";

const BASE = "/api/TaxRules";

export const taxRuleService = {
  getAll: () => api.get<TaxRule[]>(BASE).then((r) => r.data),
  getById: (id: string) => api.get<TaxRule>(`${BASE}/${id}`).then((r) => r.data),
  create: (payload: TaxRuleCreatePayload) => api.post<TaxRule>(BASE, payload).then((r) => r.data),
  update: (id: string, payload: TaxRuleUpdatePayload) =>
    api.put<TaxRule>(`${BASE}/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`${BASE}/${id}`),
};
