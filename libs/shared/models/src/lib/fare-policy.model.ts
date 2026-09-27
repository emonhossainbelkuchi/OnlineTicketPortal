import { BusType, SeatType } from './enums';

// Mirrors DTO/PaymentsExtraDtos.cs -> FareRuleResponseDto/CreateDto/UpdateDto. Screen 6 (Fare &
// Cancellation Policy Config) — auto-scoped server-side; BusOperatorId is nullable (a null rule
// is a platform-wide default an operator's own rule can override for their BusType/SeatType
// combo).
export interface FareRule {
  id: string;
  busOperatorId: string | null;
  busRouteId: string;
  busType: BusType | null;
  seatType: SeatType | null;
  baseFare: number;
  currency: string;
  effectiveFromUtc: string;
  effectiveToUtc: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface FareRuleCreateRequest {
  busOperatorId?: string | null;
  busRouteId: string;
  busType?: BusType | null;
  seatType?: SeatType | null;
  baseFare: number;
  currency: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  isActive: boolean;
}

export interface FareRuleUpdateRequest extends FareRuleCreateRequest {
  rowVersion: string;
}

// Mirrors DTO/CancellationPolicyDtos.cs -> CancellationPolicyRuleResponseDto/CreateDto. One
// refund tier: "cancel with at least minHoursBeforeDeparture notice, get refundPercentage% back,
// minus fixedCancellationFee". A policy is normally a descending ladder of these.
export interface CancellationPolicyRule {
  id: string;
  minHoursBeforeDeparture: number;
  maxHoursBeforeDeparture: number | null;
  refundPercentage: number;
  fixedCancellationFee: number;
}

export interface CancellationPolicyRuleCreateRequest {
  minHoursBeforeDeparture: number;
  maxHoursBeforeDeparture?: number | null;
  refundPercentage: number;
  fixedCancellationFee: number;
}

// Mirrors DTO/CancellationPolicyDtos.cs -> CancellationPolicyResponseDto. BusOperatorId is
// nullable — null is a platform-wide default policy; Piece 4's own writes are always scoped to
// this operator's own BusOperatorId (see cancellation-policy.service.ts), never null.
export interface CancellationPolicy {
  id: string;
  busOperatorId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  effectiveFromUtc: string | null;
  effectiveToUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  deletedAtUtc: string | null;
  policyDocumentImageUrl: string | null;
  rules: CancellationPolicyRule[];
  rowVersion: string;
}

// Mirrors DTO/CancellationPolicyDtos.cs -> CancellationPolicyCreateDto.
export interface CancellationPolicyCreateRequest {
  busOperatorId?: string | null;
  name: string;
  description?: string | null;
  effectiveFromUtc?: string | null;
  effectiveToUtc?: string | null;
  rules: CancellationPolicyRuleCreateRequest[];
}

// Mirrors DTO/CancellationPolicyDtos.cs -> CancellationPolicyUpdateDto. Like Bus/Trip, this
// REPLACES the whole rules list — resend every tier, edited or not.
export interface CancellationPolicyUpdateRequest extends CancellationPolicyCreateRequest {
  isActive: boolean;
  rowVersion: string;
}
