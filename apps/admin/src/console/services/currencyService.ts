import { api } from "@/lib/api";
import type { Currency, CurrencyCreatePayload, CurrencyUpdatePayload } from "@/types/currency";

const BASE = "/api/Currencies";

export const currencyService = {
  getAll: () => api.get<Currency[]>(BASE).then((r) => r.data),
  getById: (id: string) => api.get<Currency>(`${BASE}/${id}`).then((r) => r.data),
  create: (payload: CurrencyCreatePayload) => api.post<Currency>(BASE, payload).then((r) => r.data),
  update: (id: string, payload: CurrencyUpdatePayload) =>
    api.put<Currency>(`${BASE}/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`${BASE}/${id}`),
};
