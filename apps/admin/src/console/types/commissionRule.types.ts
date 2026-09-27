// CommissionRule types — mirrors backend CommissionRulesController DTOs.
// NOTE: enum numeric values assumed standard (Percentage=0/Flat=1, Online=0/Offline=1/Both=2).
// Adjust to match your actual Models/Enums/CommissionType.cs & SaleChannel.cs if different.

export enum CommissionType {
  Percentage = 0,
  Flat = 1,
}

export enum SaleChannel {
  Online = 0,
  Offline = 1,
  Both = 2,
}

export const CommissionTypeLabel: Record<CommissionType, string> = {
  [CommissionType.Percentage]: 'Percentage',
  [CommissionType.Flat]: 'Flat',
};

export const SaleChannelLabel: Record<SaleChannel, string> = {
  [SaleChannel.Online]: 'Online',
  [SaleChannel.Offline]: 'Offline',
  [SaleChannel.Both]: 'Both',
};

export interface CommissionRule {
  id: string;
  busOperatorId: string;
  operatorContractId?: string | null;
  busRouteId?: string | null;
  saleChannel: SaleChannel;
  commissionType: CommissionType;
  commissionValue: number;
  effectiveFrom: string; // DateOnly -> 'yyyy-MM-dd'
  effectiveTo?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string; // byte[] serialized as base64 by System.Text.Json
}

export interface CommissionRuleCreateDto {
  busOperatorId: string;
  operatorContractId?: string | null;
  busRouteId?: string | null;
  saleChannel: SaleChannel;
  commissionType: CommissionType;
  commissionValue: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
}

export interface CommissionRuleUpdateDto extends CommissionRuleCreateDto {
  rowVersion: string;
}
