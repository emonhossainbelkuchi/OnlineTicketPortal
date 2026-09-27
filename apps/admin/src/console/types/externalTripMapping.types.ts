// ExternalTripMapping types — mirrors ExternalTripMappingsController DTOs.
// Internal sync bookkeeping: which of an operator's ERP trips maps to which of our Trips,
// plus a cached seat-availability snapshot. Reads: Admin/platform-Staff only. Writes: Admin-only.

export interface ExternalTripMapping {
  id: string;
  operatorIntegrationId: string;
  tripId: string;
  externalTripKey: string;
  lastSyncedAtUtc?: string | null;
  lastSeatSnapshotJson?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface ExternalTripMappingCreateDto {
  operatorIntegrationId: string;
  tripId: string;
  externalTripKey: string;
  lastSyncedAtUtc?: string | null;
  lastSeatSnapshotJson?: string | null;
}

export interface ExternalTripMappingUpdateDto extends ExternalTripMappingCreateDto {
  rowVersion: string;
}
