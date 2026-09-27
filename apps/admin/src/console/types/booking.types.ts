// src/types/booking.types.ts
// Mirrors TicketPortal.Api.DTO BookingCreateDto / BookingUpdateDto / BookingResponseDto
// and BookingPassengerCreateDto / BookingPassengerResponseDto exactly. Keep in sync with backend.

export type Gender = 'Unknown' | 'Male' | 'Female' | 'Other';
export type PassengerType = 'Adult' | 'Child' | 'Senior' | 'Student';
export type BookingStatus =
  | 'Draft' | 'PendingPayment' | 'Confirmed' | 'Completed'
  | 'PartiallyCancelled' | 'Cancelled' | 'Expired' | 'Failed' | 'Refunded';
export type BookingSource = 'Web' | 'MobileApp' | 'Counter' | 'Agent' | 'Admin' | 'ExternalApi';
export type SaleChannel = 'Online' | 'Counter' | 'Agent' | 'Admin' | 'ExternalApi';
export type MoneyCollectedBy = 'Platform' | 'Operator' | 'Agent' | 'Unknown';

export interface BookingPassengerCreateDto {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender: Gender;
  passengerType: PassengerType;
  age?: number | null;
  nationalIdNumber?: string | null;
}

export interface BookingPassengerResponseDto extends BookingPassengerCreateDto {
  id: string;
  nationalIdPhotoUrl?: string | null;
}

// NO BusOperatorId (resolved server-side from Trip), NO price fields / ExpiresAtUtc
// (computed server-side from the SeatHold this booking is created from).
export interface BookingCreateDto {
  tripId: string;
  holdToken: string;
  boardingTerminalId: string;
  droppingTerminalId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  salesCounterId?: string | null;
  passengers: BookingPassengerCreateDto[];
}

// NO Status, NO price fields — only trip-detail fields + RowVersion.
export interface BookingUpdateDto {
  boardingTerminalId: string;
  droppingTerminalId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  passengers: BookingPassengerCreateDto[];
  rowVersion: string;
}

export interface BookingResponseDto {
  id: string;
  pnr: string;
  tripId: string;
  seatHoldId?: string | null;
  boardingTerminalId: string;
  droppingTerminalId: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  deletedAtUtc?: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  status: BookingStatus;
  requiresExternalConfirmation: boolean;
  expiresAtUtc?: string | null;
  source: BookingSource;
  saleChannel: SaleChannel;
  moneyCollectedBy: MoneyCollectedBy;
  salesCounterId?: string | null;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  currency: string;
  passengers: BookingPassengerResponseDto[];
  rowVersion: string;
}

// -------- Lightweight lookup shapes used only by the Booking admin pages --------

export interface TripSeatLite {
  id: string;
  seatId: string;
  seatNumber: string;
  seatType: string;
  fare: number;
  status: string; // Available | Held | Booked | Blocked | Cancelled
}

export interface TripLite {
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
  status: string;
  inventoryMode?: string;
  tripSeats: TripSeatLite[];
}

export interface SalesCounterLite {
  id: string;
  busOperatorId: string;
  terminalId: string;
  operatorBranchId?: string | null;
  counterName: string;
  counterCode: string;
  phoneNumber: string;
  address: string;
  isActive: boolean;
}

export interface SeatHoldItemLite {
  id: string;
  tripSeatId: string;
  fareAtHold: number;
}

export interface SeatHoldLite {
  id: string;
  holdToken: string;
  tripId: string;
  status: string;
  holdExpiresAtUtc: string;
  items: SeatHoldItemLite[];
}
