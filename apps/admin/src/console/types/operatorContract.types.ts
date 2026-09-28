// operatorContract.types.ts
// Mirrors OperatorContractsController DTOs (DTO/FinanceDtos.cs) and the
// GatewayFeeBearer enum (Models/Enums/ModelEnums.cs). Admin-only resource —
// the commercial agreement with one operator (settlement interval + who
// bears the payment-gateway fee) that CommissionRule rows attach to.

export enum GatewayFeeBearer {
  Platform = 1,
  Operator = 2,
  Customer = 3,
}

export const GatewayFeeBearerLabel: Record<GatewayFeeBearer, string> = {
  [GatewayFeeBearer.Platform]: 'Platform',
  [GatewayFeeBearer.Operator]: 'Operator',
  [GatewayFeeBearer.Customer]: 'Customer',
};

export interface OperatorContractResponseDto {
  id: string;
  busOperatorId: string;
  contractNo: string;
  effectiveFrom: string; // DateOnly -> 'yyyy-MM-dd'
  effectiveTo?: string | null;
  settlementIntervalDays: number;
  gatewayFeeBearer: GatewayFeeBearer;
  isActive: boolean;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string; // byte[] serialized as base64 by System.Text.Json
}

export interface OperatorContractCreateDto {
  busOperatorId: string;
  contractNo: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  settlementIntervalDays: number;
  gatewayFeeBearer: GatewayFeeBearer;
  isActive: boolean;
  notes?: string | null;
}

export interface OperatorContractUpdateDto extends OperatorContractCreateDto {
  rowVersion: string;
}

// Minimal shape this UI needs from api/BusOperators, for the "which operator
// is this?" label — never persisted, only used to enrich rows for display.
export interface BusOperatorSummary {
  id: string;
  name: string;
}

export interface OperatorContractDisplayDto extends OperatorContractResponseDto {
  busOperatorName: string;
}
