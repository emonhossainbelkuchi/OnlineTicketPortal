// seatHoldItem.types.ts
// Mirrors SeatHoldItemResponseDto (SeatHoldItemsController — read-only) plus
// the real shapes needed to resolve display names (from TripDTOs.cs).

export interface SeatHoldItemResponseDto {
  id: string;
  seatHoldId: string;
  tripSeatId: string;
  fareAtHold: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export interface SeatHoldSummary {
  id: string;
  tripId: string;
  holdToken?: string;
  status?: string;
  holdExpiresAtUtc?: string;
  secondsRemaining?: number;
}

// Matches TripSeatResponseDto exactly — but there's no standalone
// api/TripSeats/{id}; these only ever come nested inside a TripResponseDto.
export interface TripSeatResponseDto {
  id: string;
  seatId: string;
  seatNumber: string;
  seatType: string;
  fare: number;
  status: string;
}

// Matches TripResponseDto (trimmed to the fields this service needs).
export interface TripResponseDto {
  id: string;
  busOperatorId: string;
  busRouteId: string;
  busId: string;
  departureTerminalId: string;
  arrivalTerminalId: string;
  tripCode: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  tripSeats: TripSeatResponseDto[];
}

// Bus fields are a best-effort guess (registrationNumber/brand/model,
// mirroring TripSearchResultDto.BusBrand/BusModel) — give the real
// BusResponseDto to tighten this up if the label looks off.
export interface BusSummary {
  id: string;
  registrationNumber?: string;
  brand?: string;
  model?: string;
}

// Enriched row used by the list/details pages.
export interface SeatHoldItemDisplayDto extends SeatHoldItemResponseDto {
  seatLabel: string;   // TripSeat.seatNumber, resolved via the parent Trip
  tripLabel: string;   // TripCode + departure/arrival time
  busLabel: string;    // which physical bus is running that trip
  holdStatus?: string;
  holdExpiresAtUtc?: string;
}
