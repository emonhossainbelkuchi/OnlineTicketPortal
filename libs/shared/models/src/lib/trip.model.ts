import { BusType, SeatType, TicketStatus, TripSeatStatus, TripStatus } from './enums';

// Mirrors DTO/TripDtos.cs -> TripSeatResponseDto.
export interface TripSeat {
  id: string;
  seatId: string;
  seatNumber: string;
  seatType: SeatType;
  fare: number;
  status: TripSeatStatus;
  // Physical position on the bus (TripSeatResponseDto, copied from the Seat row). Optional because
  // older responses and seats created without a layout report 0/absent - the seat map then
  // falls back to reading the position out of the seat number ("4B" = row 4, column B).
  rowNumber?: number;
  columnNumber?: number;
  deckLevel?: number;
  isWindow?: boolean;
  extraFare?: number | null;
}

// Mirrors DTO/TripDtos.cs -> TripResponseDto. Used for the trip-details screen
// (GET /api/trips/{id}) — has the full seat map, unlike the lighter search result.
export interface Trip {
  id: string;
  busOperatorId: string;
  busRouteId: string;
  busId: string;
  departureTerminalId: string;
  arrivalTerminalId: string;
  tripCode: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  baseFare: number;
  currency: string;
  status: TripStatus;
  delayReason: string | null;
  isWheelchairAccessible: boolean;
  coverImageUrl: string | null;
  tripSeats: TripSeat[];
  rowVersion: string;
}

// Mirrors DTO/TripDtos.cs -> TripSearchResultDto. This is what
// GET /api/trips/search returns — one row per bus/operator on the route,
// already carrying the operator name/logo and seat-count summary so the
// results list doesn't need N follow-up calls.
export interface TripSearchResult {
  tripId: string;
  tripCode: string;
  busOperatorId: string;
  busOperatorName: string;
  busOperatorLogoUrl: string | null;
  busId: string;
  busBrand: string | null;
  busModel: string | null;
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
  lowestAvailableFare: number | null;
  coverImageUrl: string | null;
}

// Query params for GET /api/trips/search — build this into an HttpParams in
// the search feature module, don't hand-roll query strings.
export interface TripSearchQuery {
  fromTerminalId: string;
  toTerminalId: string;
  date: string; // yyyy-MM-dd — backend binds this to a DateOnly
  minAvailableSeats?: number;
}

// --- Added for Piece 4 (Operator & Fleet Management Panel) — write side ---

// Mirrors DTO/TripDtos.cs -> TripSeatCreateDto. NOTE: deliberately no `status` field — a
// TripSeat's status only ever changes through the seat-hold/booking flow (SeatHoldService), see
// the backend DTO's own comment. Piece 4 seeds every seat as available by construction.
export interface TripSeatCreateRequest {
  seatId: string;
  seatNumber: string;
  seatType: SeatType;
  fare: number;
}

// Mirrors DTO/TripDtos.cs -> TripCreateDto.
export interface TripCreateRequest {
  busOperatorId: string;
  busRouteId: string;
  busId: string;
  departureTerminalId: string;
  arrivalTerminalId: string;
  tripCode: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  baseFare: number;
  currency: string;
  isWheelchairAccessible: boolean;
  tripSeats: TripSeatCreateRequest[];
}

// Mirrors DTO/TripDtos.cs -> TripUpdateDto. Like BusUpdateRequest, this REPLACES the whole
// TripSeats array — when only editing scalar trip fields or changing Status, resend the
// unchanged tripSeats exactly as loaded (don't drop them, or the seat map is wiped).
//
// NOTE (Chunk 5): the backend now refuses status === 'Cancelled' through this endpoint — use
// cancelTrip()/TripsService.cancelTrip below instead. Every OTHER status value must also be a
// real move on the backend's TripStatusTransitionRules table (Scheduled -> Boarding -> Departed
// -> Running -> Arrived -> Completed; Delayed <-> Scheduled/Boarding) or the PUT is rejected.
export interface TripUpdateRequest extends TripCreateRequest {
  status: TripStatus;
  delayReason?: string | null;
  rowVersion: string;
}

// --- Chunk 5 (Operator operations: trip cancellation cascade, manifest) ---

// Mirrors DTO/TripDtos.cs -> TripCancelDto. Body for POST /api/trips/{id}/cancel.
export interface TripCancelRequest {
  reason: string;
}

// Mirrors DTO/TripDtos.cs -> TripCancelPreviewDto. GET /api/trips/{id}/cancel-preview — no
// side effects; call this to populate the "N bookings will be refunded" confirmation dialog
// before actually calling cancelTrip().
export interface TripCancelPreview {
  tripId: string;
  currentStatus: TripStatus;
  canCancel: boolean;
  bookingsToRefundCount: number;
  onlineBookingsCount: number;
  counterBookingsCount: number;
  totalRefundAmount: number;
  currency: string;
  activeSeatHoldsToRelease: number;
}

// Mirrors DTO/TripDtos.cs -> TripCancelledBookingOutcomeDto. outcome is a RefundStatus value
// ("Succeeded" / "PendingManualPayout" / "ReconciliationNeeded") for a booking that WAS
// refunded, or "Skipped" / "Failed" (see `detail`) for one that wasn't.
export interface TripCancelledBookingOutcome {
  bookingId: string;
  refundId: string | null;
  outcome: string;
  detail: string | null;
}

// Mirrors DTO/TripDtos.cs -> TripCancelResultDto. Returned (nested under `result`, alongside a
// human-readable `message`) by POST /api/trips/{id}/cancel.
export interface TripCancelResult {
  tripId: string;
  releasedHoldCount: number;
  bookingsRefunded: number;
  bookingsNeedingAttention: number;
  bookings: TripCancelledBookingOutcome[];
}

// Mirrors DTO/TripDtos.cs -> TripManifestEntryDto. One row per ticket on the trip — including
// cancelled/refunded ones, WITH their real status, so the manifest can show why a seat is empty
// instead of just omitting it.
export interface TripManifestEntry {
  ticketId: string;
  ticketNumber: string;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string | null;
  status: TicketStatus;
  checkedInAtUtc: string | null;
  pnr: string;
  boardingTerminalName: string;
  droppingTerminalName: string;
}

// Mirrors DTO/TripDtos.cs -> TripManifestResponseDto. GET /api/trips/{id}/manifest.
export interface TripManifest {
  tripId: string;
  tripCode: string;
  departureTimeUtc: string;
  status: TripStatus;
  totalPassengers: number;
  checkedInCount: number;
  passengers: TripManifestEntry[];
}
