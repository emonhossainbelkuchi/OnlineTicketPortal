// Terminal now lives in terminal.model.ts (the canonical shared definition used by Piece 2,
// Piece 3, and Piece 5) — re-declaring it here caused a duplicate-export ambiguity once
// terminal.model.ts was wired into the barrel. Network Setup's picker for
// OperatorRouteStop.terminalId still uses this same Terminal shape via the barrel import.

// Mirrors DTO/CompanyNetworkExtraDtos.cs -> BusRouteResponseDto. The unified "Dhaka to
// Chittagong" route every operator's own OperatorRoute maps onto. Read-only for Piece 4 too
// (BusRoutesController writes are Admin-only) — shown as a picker when adding an OperatorRoute.
export interface BusRoute {
  id: string;
  originTerminalId: string;
  destinationTerminalId: string;
  reverseRouteId: string | null;
  routeCode: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  defaultBaseFare: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/CompanyNetworkExtraDtos.cs -> RouteStopResponseDto. The unified BusRoute's own
// stop sequence — read-only reference/context for Piece 4 (RouteStopsController writes are also
// Admin-only), shown alongside a picked BusRoute so an operator can see where the unified route
// already stops before adding their own boarding/dropping points via OperatorRouteStop.
export interface RouteStop {
  id: string;
  busRouteId: string;
  terminalId: string;
  stopOrder: number;
  arrivalOffsetMinutes: number | null;
  departureOffsetMinutes: number | null;
  distanceFromOriginKm: number;
  isPickupPoint: boolean;
  isDropOffPoint: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/CompanyNetworkExtraDtos.cs -> OperatorBranchResponseDto/CreateDto/UpdateDto.
// Operator-writable (OperatorBranchesController is auto-scoped) — Screen 1 (Profile & Branches).
export interface OperatorBranch {
  id: string;
  busOperatorId: string;
  branchName: string;
  address: string;
  phone: string;
  city: string;
  district: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface OperatorBranchCreateRequest {
  busOperatorId: string;
  branchName: string;
  address: string;
  phone: string;
  city: string;
  district: string;
}

export interface OperatorBranchUpdateRequest extends OperatorBranchCreateRequest {
  rowVersion: string;
}

// Mirrors DTO/CompanyNetworkExtraDtos.cs -> OperatorRouteStopResponseDto/CreateDto/UpdateDto.
// This operator's own boarding/dropping points along one of THEIR OperatorRoutes — distinct
// from the unified RouteStop above. Operator-writable (OperatorRouteStopsController is
// auto-scoped, via a join through OperatorRoute.BusOperatorId).
export interface OperatorRouteStop {
  id: string;
  operatorRouteId: string;
  terminalId: string;
  stopOrder: number;
  arrivalOffsetMinutes: number | null;
  departureOffsetMinutes: number | null;
  isPickupPoint: boolean;
  isDropOffPoint: boolean;
  externalStopKey: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface OperatorRouteStopCreateRequest {
  operatorRouteId: string;
  terminalId: string;
  stopOrder: number;
  arrivalOffsetMinutes?: number | null;
  departureOffsetMinutes?: number | null;
  isPickupPoint: boolean;
  isDropOffPoint: boolean;
  externalStopKey?: string | null;
}

export interface OperatorRouteStopUpdateRequest extends OperatorRouteStopCreateRequest {
  rowVersion: string;
}
