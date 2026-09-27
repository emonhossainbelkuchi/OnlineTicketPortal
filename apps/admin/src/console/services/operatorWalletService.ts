import { api } from "@/lib/api";
import type { OperatorWallet } from "@/types/operatorWallet";

const BASE = "/api/OperatorWallets";

// Read-only — no create/update/delete, matches the controller (FinanceLedgerService only writer).
export const operatorWalletService = {
  getAll: () => api.get<OperatorWallet[]>(BASE).then((r) => r.data),
  getById: (id: string) => api.get<OperatorWallet>(`${BASE}/${id}`).then((r) => r.data),
  getByOperator: (busOperatorId: string) =>
    api.get<OperatorWallet>(`${BASE}/by-operator/${busOperatorId}`).then((r) => r.data),
};
