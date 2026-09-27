export interface CancellationPolicyRuleCreateDto {
  minHoursBeforeDeparture: number;
  maxHoursBeforeDeparture?: number | null;
  refundPercentage: number;
  fixedCancellationFee: number;
}

export interface CancellationPolicyRuleResponseDto {
  id: string;
  minHoursBeforeDeparture: number;
  maxHoursBeforeDeparture?: number | null;
  refundPercentage: number;
  fixedCancellationFee: number;
}

export interface CancellationPolicyCreateDto {
  busOperatorId?: string | null;
  name: string;
  description?: string | null;
  effectiveFromUtc?: string | null;
  effectiveToUtc?: string | null;
  rules: CancellationPolicyRuleCreateDto[];
}

export interface CancellationPolicyUpdateDto extends CancellationPolicyCreateDto {
  isActive: boolean;
  rowVersion: string;
}

export interface CancellationPolicyResponseDto {
  id: string;
  busOperatorId?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  effectiveFromUtc?: string | null;
  effectiveToUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  deletedAtUtc?: string | null;
  policyDocumentImageUrl?: string | null;
  rules: CancellationPolicyRuleResponseDto[];
  rowVersion: string;
}
