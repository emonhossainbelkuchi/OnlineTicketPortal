// Mirrors TaxRuleResponseDto / TaxRuleCreateDto / TaxRuleUpdateDto (backend).
export interface TaxRule {
  id: string;
  name: string;
  percentage: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // byte[] serialized as base64 by System.Text.Json
}

export interface TaxRuleCreatePayload {
  name: string;
  percentage: number;
  isActive: boolean;
}

export interface TaxRuleUpdatePayload extends TaxRuleCreatePayload {
  rowVersion: string;
}
