// Mirrors OperatorSettingResponseDto / CreateDto / UpdateDto (OperatorSettingsController). Admin-only.
export interface OperatorSetting {
  id: string;
  busOperatorId: string;
  key: string;
  value: string;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface OperatorSettingCreateDto {
  busOperatorId: string;
  key: string;
  value: string;
  description?: string | null;
}

export interface OperatorSettingUpdateDto extends OperatorSettingCreateDto {
  rowVersion: string;
}
