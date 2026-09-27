// src/types/schedule.types.ts
// Mirrors TicketPortal.Api.DTO ScheduleCreateDto / ScheduleUpdateDto / ScheduleResponseDto
// and TicketPortal.Api.Models.Enums.DayOfWeekFlag exactly. Keep in sync with backend.

export enum DayOfWeekFlag {
  None = 0,
  Sunday = 1,
  Monday = 2,
  Tuesday = 4,
  Wednesday = 8,
  Thursday = 16,
  Friday = 32,
  Saturday = 64,
  Everyday = 127, // Sun|Mon|Tue|Wed|Thu|Fri|Sat
}

export const DAY_OPTIONS: { label: string; value: DayOfWeekFlag }[] = [
  { label: "Sun", value: DayOfWeekFlag.Sunday },
  { label: "Mon", value: DayOfWeekFlag.Monday },
  { label: "Tue", value: DayOfWeekFlag.Tuesday },
  { label: "Wed", value: DayOfWeekFlag.Wednesday },
  { label: "Thu", value: DayOfWeekFlag.Thursday },
  { label: "Fri", value: DayOfWeekFlag.Friday },
  { label: "Sat", value: DayOfWeekFlag.Saturday },
];

export interface ScheduleCreateDto {
  busOperatorId: string; // Guid
  busRouteId: string; // Guid
  operatorRouteId?: string | null; // Guid?
  busId: string; // Guid
  scheduleCode: string;
  departureTimeOfDay: string; // "HH:mm:ss" (TimeSpan)
  arrivalTimeOfDay?: string | null;
  operatingDays: DayOfWeekFlag;
  effectiveFrom: string; // "yyyy-MM-dd" (DateOnly)
  effectiveTo?: string | null;
  baseFare: number;
  currency: string; // 3-char, default "BDT"
  isActive: boolean;
}

export interface ScheduleUpdateDto extends ScheduleCreateDto {
  rowVersion: string; // byte[] RowVersion, base64 over the wire
}

export interface ScheduleResponseDto {
  id: string;
  busOperatorId: string;
  busRouteId: string;
  operatorRouteId?: string | null;
  busId: string;
  scheduleCode: string;
  departureTimeOfDay: string;
  arrivalTimeOfDay?: string | null;
  operatingDays: DayOfWeekFlag;
  effectiveFrom: string;
  effectiveTo?: string | null;
  baseFare: number;
  currency: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// Minimal shapes for the dropdown pickers used on these pages.
export interface BusOperatorOption {
  id: string;
  name: string;
}
export interface BusOption {
  id: string;
  busOperatorId: string;
  name: string; // e.g. registration no / label
}
export interface BusRouteOption {
  id: string;
  name: string; // shared platform-wide route label
}
export interface OperatorRouteOption {
  id: string;
  busOperatorId: string;
  name: string;
}