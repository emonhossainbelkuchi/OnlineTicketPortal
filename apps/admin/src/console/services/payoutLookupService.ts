import { api } from "@/lib/api";
import type { BusOperator } from "@/lib/api";
import type { OperatorSettlementOption } from "@/types/operatorSettlementOption";

export const payoutLookupService = {
  getBusOperators: () => api.get<BusOperator[]>("/api/BusOperators").then((r) => r.data),
  // Same [FromQuery] busOperatorId pattern as OperatorPayoutsController.GetAll.
  getSettlementsForOperator: (busOperatorId: string) =>
    api
      .get<OperatorSettlementOption[]>("/api/OperatorSettlements", { params: { busOperatorId } })
      .then((r) => r.data),
};
