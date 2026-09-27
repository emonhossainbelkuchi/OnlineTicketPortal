import { OperatorInventoryMode } from './enums';

// Mirrors DTO/BusOperatorDtos.cs -> OperatorRouteResponseDto. One row per unified BusRoute this
// operator actually runs, under its own code/branding — managed as a sub-list of BusOperator
// (see OperatorRoute*Request below), not through its own standalone CRUD endpoint.
export interface OperatorRoute {
  id: string;
  busRouteId: string;
  operatorRouteCode: string;
  displayName: string | null;
  inventoryModeOverride: OperatorInventoryMode | null;
  isActive: boolean;
  rowVersion: string;
}

// Mirrors DTO/BusOperatorDtos.cs -> OperatorRouteCreateDto — used only for a brand-new
// BusOperator (no existing routes yet).
export interface OperatorRouteCreateRequest {
  busRouteId: string;
  operatorRouteCode: string;
  displayName?: string | null;
  inventoryModeOverride?: OperatorInventoryMode | null;
}

// Mirrors DTO/BusOperatorDtos.cs -> OperatorRouteUpdateDto. Sent as part of
// BusOperatorUpdateRequest.operatorRoutes — id + rowVersion set = editing an existing route,
// both omitted = adding a new one. Never send a route you want removed; the backend diffs the
// array you send against what it already has and soft/hard-deletes whatever is missing.
export interface OperatorRouteUpdateRequest {
  id?: string | null;
  busRouteId: string;
  operatorRouteCode: string;
  displayName?: string | null;
  inventoryModeOverride?: OperatorInventoryMode | null;
  isActive: boolean;
  rowVersion?: string | null;
}

// Mirrors DTO/BusOperatorDtos.cs -> BusOperatorResponseDto.
// `inventoryMode` matters everywhere: Piece 4's write screens should treat
// ExternalApiManaged operators as read-only for seat/trip-inventory actions
// — their own ERP is the source of truth, not TicketPortal.
export interface BusOperator {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  addressLine: string;
  contactPhone: string;
  email: string | null;
  logoUrl: string | null;
  city: string;
  district: string;
  country: string;
  foundedYear: number | null;
  registeredOnUtc: string | null;
  inventoryMode: OperatorInventoryMode;
  isActive: boolean;
  operatorRoutes: OperatorRoute[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
  deletedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/BusOperatorDtos.cs -> BusOperatorCreateDto. Piece 4 itself never creates a new
// BusOperator (that's an onboarding/Admin action) but the shape is here for completeness and
// because BusOperatorUpdateRequest extends it.
export interface BusOperatorCreateRequest {
  name: string;
  legalName?: string | null;
  registrationNumber?: string | null;
  contactPhone: string;
  email?: string | null;
  addressLine: string;
  city: string;
  district: string;
  country: string;
  foundedYear?: number | null;
  registeredOnUtc?: string | null;
  inventoryMode: OperatorInventoryMode;
  operatorRoutes: OperatorRouteCreateRequest[];
}

// Mirrors DTO/BusOperatorDtos.cs -> BusOperatorUpdateDto. PUT /api/busoperators/{id}. The
// profile screen builds `operatorRoutes` from the loaded OperatorRoute[] (untouched routes keep
// their id/rowVersion; a new one omits both) — see OperatorRouteUpdateRequest above.
export interface BusOperatorUpdateRequest extends BusOperatorCreateRequest {
  isActive: boolean;
  rowVersion: string;
  operatorRoutes: OperatorRouteUpdateRequest[];
}
