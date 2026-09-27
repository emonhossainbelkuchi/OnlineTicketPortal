// Mirrors DTO/PeopleDtos.cs -> AgentCreateDto/AgentResponseDto.
export interface AgentCreateRequest {
  // Ignored/overridden server-side for an operator-scoped caller; a
  // platform-wide Admin/Staff caller may set any operator, or leave this
  // undefined for a platform-wide agent (Agent.BusOperatorId == null).
  busOperatorId?: string;
  name: string;
  agencyCode: string;
  contactPerson: string;
  phoneNumber: string;
  email?: string;
  address: string;
  commissionPercentage: number;
  isActive: boolean;
}

// Mirrors AgentUpdateDto — BusOperatorId deliberately dropped, it's never
// reassignable after creation (see AgentsController).
export interface AgentUpdateRequest {
  name: string;
  agencyCode: string;
  contactPerson: string;
  phoneNumber: string;
  email?: string;
  address: string;
  commissionPercentage: number;
  isActive: boolean;
  rowVersion: string;
}

export interface Agent {
  id: string;
  busOperatorId: string | null;
  name: string;
  agencyCode: string;
  contactPerson: string;
  phoneNumber: string;
  email: string | null;
  address: string;
  commissionPercentage: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
