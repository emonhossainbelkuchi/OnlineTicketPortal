import { BookingSource, BookingStatus, Gender, MoneyCollectedBy, PassengerType, SaleChannel } from './enums';

// Mirrors DTO/BookingDtos.cs -> BookingPassengerCreateDto. One entry per
// held seat, in the same order as the seats were held — the backend rejects
// a count mismatch outright.
export interface BookingPassengerCreateRequest {
  fullName: string;
  phone?: string;
  email?: string;
  gender: Gender;
  passengerType: PassengerType;
  age?: number;
  nationalIdNumber?: string;
}

export interface BookingPassenger extends BookingPassengerCreateRequest {
  id: string;
}

// Mirrors DTO/BookingDtos.cs -> BookingCreateDto. POST /api/bookings.
// `holdToken` (from SeatHold, not anything typed here) is the single source
// of truth for which seats/prices this booking covers.
export interface BookingCreateRequest {
  tripId: string;
  holdToken: string;
  boardingTerminalId: string;
  droppingTerminalId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  // Counter/Staff booking on behalf of a walk-in customer only (Piece 5).
  // Leave undefined for a normal customer self-service booking — the
  // backend rejects this field from a plain Customer caller.
  salesCounterId?: string;
  passengers: BookingPassengerCreateRequest[];
}

// Mirrors DTO/BookingDtos.cs -> BookingResponseDto.
export interface Booking {
  id: string;
  pnr: string;
  tripId: string;
  seatHoldId: string | null;
  boardingTerminalId: string;
  droppingTerminalId: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  status: BookingStatus;
  requiresExternalConfirmation: boolean;
  expiresAtUtc: string | null;
  source: BookingSource;
  saleChannel: SaleChannel;
  moneyCollectedBy: MoneyCollectedBy;
  salesCounterId: string | null;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  currency: string;
  passengers: BookingPassenger[];
  rowVersion: string;
}
