import { CrewRole, DayOfWeekFlagName, TripStatus } from './enums';

// Mirrors DTO/SchedulingExtraDtos.cs -> ScheduleResponseDto/CreateDto/UpdateDto. A recurring
// template ("this bus runs this route every Mon/Wed/Fri at 06:30") — distinct from Trip, which
// is one concrete dated journey. Operator-writable, auto-scoped server-side.
export interface Schedule {
  id: string;
  busOperatorId: string;
  busRouteId: string;
  operatorRouteId: string | null;
  busId: string;
  scheduleCode: string;
  departureTimeOfDay: string; // "HH:mm:ss" (TimeSpan)
  arrivalTimeOfDay: string | null;
  operatingDays: DayOfWeekFlagName | string; // comma-joined flag names, e.g. "Monday, Wednesday"
  effectiveFrom: string; // yyyy-MM-dd (DateOnly)
  effectiveTo: string | null;
  baseFare: number;
  currency: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface ScheduleCreateRequest {
  busOperatorId: string;
  busRouteId: string;
  operatorRouteId?: string | null;
  busId: string;
  scheduleCode: string;
  departureTimeOfDay: string;
  arrivalTimeOfDay?: string | null;
  operatingDays: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  baseFare: number;
  currency: string;
  isActive: boolean;
}

export interface ScheduleUpdateRequest extends ScheduleCreateRequest {
  rowVersion: string;
}

// Mirrors DTO/SchedulingExtraDtos.cs -> TripCrewResponseDto/CreateDto/UpdateDto. Assigns one
// StaffProfile (a driver/assistant/supervisor/helper) to one Trip. The backend rejects
// double-booking a crew member onto two time-overlapping trips (HasOverlappingAssignmentAsync).
export interface TripCrew {
  id: string;
  tripId: string;
  staffProfileId: string;
  role: CrewRole;
  assignedAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface TripCrewCreateRequest {
  tripId: string;
  staffProfileId: string;
  role: CrewRole;
  assignedAtUtc: string;
}

export interface TripCrewUpdateRequest extends TripCrewCreateRequest {
  rowVersion: string;
}

// Mirrors DTO/SchedulingExtraDtos.cs -> TripStatusHistoryResponseDto. Read-only append-only
// trail, written automatically by TripsController whenever Trip.Status changes — there is no
// create/update/delete for this from the frontend.
export interface TripStatusHistory {
  id: string;
  tripId: string;
  changedByUserId: string | null;
  status: TripStatus;
  changedAtUtc: string;
  remarks: string | null;
}
