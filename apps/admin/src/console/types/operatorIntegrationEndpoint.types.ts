export interface OperatorIntegrationEndpoint {
  id: string;
  operatorIntegrationId: string;
  purpose: string;
  httpMethod: string;
  pathTemplate: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // byte[] arrives as base64 — echo back as-is on update
}

export interface OperatorIntegrationEndpointCreateRequest {
  operatorIntegrationId: string;
  purpose: string;
  httpMethod: string;
  pathTemplate: string;
  isActive: boolean;
}

export interface OperatorIntegrationEndpointUpdateRequest extends OperatorIntegrationEndpointCreateRequest {
  rowVersion: string;
}

// Only what this feature needs from the much larger OperatorIntegration DTO — used purely to
// label the OperatorIntegrationId on each endpoint row.
export interface OperatorIntegrationRef {
  id: string;
  busOperatorId: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
