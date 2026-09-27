// Trip types — mirrors TripsController DTOs exactly.
// NOTE: TripStatus / SeatType / TripSeatStatus / BusType enum member NAMES are taken verbatim
// from the C# code (TripStatus.Cancelled/Departed/Running/Arrived/Completed/Scheduled are
// confirmed from the Search() method; Delayed is inferred from DelayReason/DelayReason usage).
// Their numeric VALUES are guessed (backend enum definitions weren't given) — check your real
// Models/Enums/TripStatus.cs etc. and fix the numbers below if your JSON serializes them as
// numbers rather than strings. If [JsonStringEnumConverter] is configured backend-side, ignore
// the numbers entirely and just match the string members.

export enum TripStatus {
  Scheduled = 0,
  Delayed = 1,
  Cancelled = 2,
  Departed = 3,
  Running = 4,
  Arrived = 5,
  Completed = 6,
}

export const TripStatusLabel: Record<TripStatus, string> = {
  [TripStatus.Scheduled]: 'Scheduled',
  [TripStatus.Delayed]: 'Delayed',
  [TripStatus.Cancelled]: 'Cancelled',
  [TripStatus.Departed]: 'Departed',
  [TripStatus.Running]: 'Running',
  [TripStatus.Arrived]: 'Arrived',
  [TripStatus.Completed]: 'Completed',
};

export const TripStatusBadgeClass: Record<TripStatus, string> = {
  [TripStatus.Scheduled]: 'bg-primary',
  [TripStatus.Delayed]: 'bg-warning text-dark',
  [TripStatus.Cancelled]: 'bg-danger',
  [TripStatus.Departed]: 'bg-info text-dark',
  [TripStatus.Running]: 'bg-info text-dark',
  [TripStatus.Arrived]: 'bg-success',
  [TripStatus.Completed]: 'bg-success',
};

// Non-bookable statuses, per TripsController.Search — kept here so UI logic can mirror the
// backend's own definition of "not sellable any more" instead of re-guessing it.
export const NON_BOOKABLE_STATUSES: TripStatus[] = [
  TripStatus.Cancelled,
  TripStatus.Departed,
  TripStatus.Running,
  TripStatus.Arrived,
  TripStatus.Completed,
];

export enum SeatType {
  Regular = 0,
  Premium = 1,
  Sleeper = 2,
}

export const SeatTypeLabel: Record<SeatType, string> = {
  [SeatType.Regular]: 'Regular',
  [SeatType.Premium]: 'Premium',
  [SeatType.Sleeper]: 'Sleeper',
};

export enum TripSeatStatus {
  Available = 0,
  Held = 1,
  Booked = 2,
  Blocked = 3,
}

export const TripSeatStatusLabel: Record<TripSeatStatus, string> = {
  [TripSeatStatus.Available]: 'Available',
  [TripSeatStatus.Held]: 'Held',
  [TripSeatStatus.Booked]: 'Booked',
  [TripSeatStatus.Blocked]: 'Blocked',
};

export enum BusType {
  AC = 0,
  NonAC = 1,
  Sleeper = 2,
  DoubleDecker = 3,
}

export interface TripSeatCreateDto {
  seatId: string;
  seatNumber: string;
  seatType: SeatType;
  fare: number;
}

export interface TripSeatResponseDto {
  id: string;
  seatId: string;
  seatNumber: string;
  seatType: SeatType;
  fare: number;
  status: TripSeatStatus;
  rowNumber: number;
  columnNumber: number;
  deckLevel: number;
  isWindow: boolean;
  extraFare?: number | null;
}

export interface TripCreateDto {
  busOperatorId: string;
  busRouteId: string;
  busId: string;
  departureTerminalId: string;
  arrivalTerminalId: string;
  tripCode: string;
  departureTimeUtc: string; // ISO datetime
  arrivalTimeUtc: string;
  baseFare: number;
  currency: string;
  isWheelchairAccessible: boolean;
  tripSeats: TripSeatCreateDto[];
}

export interface TripUpdateDto extends TripCreateDto {
  status: TripStatus;
  delayReason?: string | null;
  rowVersion: string;
}

export interface Trip {
  id: string;
  busOperatorId: string;
  busRouteId: string;
  busId: string;
  departureTerminalId: string;
  arrivalTerminalId: string;
  busOperatorName?: string | null;
  busOperatorLogoUrl?: string | null;
  busBrand?: string | null;
  busModel?: string | null;
  busType?: BusType | null;
  busCoachNumber?: string | null;
  busRegistrationNumber?: string | null;
  busHasWifi: boolean;
  busHasToilet: boolean;
  busRouteName?: string | null;
  busRouteCode?: string | null;
  departureTerminalName?: string | null;
  departureCity?: string | null;
  arrivalTerminalName?: string | null;
  arrivalCity?: string | null;
  tripCode: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  baseFare: number;
  currency: string;
  isWheelchairAccessible: boolean;
  status: TripStatus;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  deletedAtUtc?: string | null;
  delayReason?: string | null;
  coverImageUrl?: string | null;
  tripSeats: TripSeatResponseDto[];
  rowVersion: string;
}

export interface TripSearchResult {
  tripId: string;
  tripCode: string;
  busOperatorId: string;
  busOperatorName: string;
  busOperatorLogoUrl?: string | null;
  busId: string;
  busBrand?: string | null;
  busModel?: string | null;
  busType: BusType;
  hasWifi: boolean;
  hasToilet: boolean;
  departureTerminalId: string;
  departureTerminalName: string;
  arrivalTerminalId: string;
  arrivalTerminalName: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  status: TripStatus;
  isWheelchairAccessible: boolean;
  currency: string;
  totalSeatCount: number;
  availableSeatCount: number;
  lowestAvailableFare?: number | null;
  coverImageUrl?: string | null;
}

export interface TripSearchParams {
  fromTerminalId: string;
  toTerminalId: string;
  date: string; // 'yyyy-MM-dd'
  minAvailableSeats?: number;
}
