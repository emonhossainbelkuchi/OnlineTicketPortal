import type { OperatorInventoryMode } from './enums';

export type IntegrationAuthType = 'None' | 'ApiKey' | 'BearerToken' | 'Basic' | 'OAuth2';
export type IntegrationSyncStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Skipped' | 'Retrying';

// Mirrors OperatorIntegrationStatusDto (apps/api/DTO/IntegrationsDtos.cs) — the redacted view
// Permissions.IntegrationsRead unlocks (Admin, or an operator manager for their OWN operator —
// see OperatorIntegrationsController.GetStatus). Deliberately has no BaseUrl, no auth details,
// nothing secret-shaped: RBAC Amendment v3 §8 never lets that reach a non-Admin view.
export interface OperatorIntegrationStatus {
  busOperatorId: string;
  busOperatorName: string;
  inventoryMode: OperatorInventoryMode;
  hasIntegrationConfigured: boolean;
  integrationName: string | null;
  isActive: boolean;
  lastSuccessfulSyncAtUtc: string | null;
  lastSyncStatus: IntegrationSyncStatus | null;
  lastSyncAtUtc: string | null;
  recentFailureCount: number;
}

// Mirrors OperatorIntegrationResponseDto — Permissions.IntegrationsManage (Admin) only. There is
// deliberately no `secretReference` field here: the raw value is never returned by any endpoint,
// only `hasSecret` + a masked preview safe to display (see the C# DTO's own comment).
export interface OperatorIntegration {
  id: string;
  busOperatorId: string;
  name: string;
  baseUrl: string;
  authType: IntegrationAuthType;
  apiKeyHeaderName: string | null;
  hasSecret: boolean;
  secretReferenceMasked: string | null;
  timeoutSeconds: number;
  isActive: boolean;
  lastSuccessfulSyncAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors IntegrationSyncLogResponseDto (IntegrationSyncLogsController) — one attempt to call an
// operator's own ERP: ConfirmBooking, GetSeatAvailability, CancelBooking, or TestConnection (see
// docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md).
export interface IntegrationSyncLog {
  id: string;
  operatorIntegrationId: string;
  entityName: string;
  entityKey: string | null;
  operation: string;
  status: IntegrationSyncStatus;
  startedAtUtc: string;
  completedAtUtc: string | null;
  requestJson: string | null;
  responseJson: string | null;
  errorMessage: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

// Mirrors ExternalBookingSyncService.TestConnectionResult — the "Test connection" button's result.
export interface TestConnectionResult {
  success: boolean;
  message: string;
  statusCode: number | null;
  durationMs: number;
}
