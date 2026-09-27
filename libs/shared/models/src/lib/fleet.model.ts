import { BusType, SeatType } from './enums';

// Mirrors DTO/BusDtos.cs -> SeatResponseDto / SeatCreateDto. Physical seat position on a bus —
// separate from TripSeat (trip.model.ts), which is the per-trip price/availability for this
// same seat.
export interface Seat {
  id: string;
  seatNumber: string;
  rowNumber: number;
  columnNumber: number;
  deckLevel: number;
  seatType: SeatType;
  isWindow: boolean;
  extraFare: number | null;
  isActive: boolean;
}

export interface SeatCreateRequest {
  seatNumber: string;
  rowNumber: number;
  columnNumber: number;
  deckLevel: number;
  seatType: SeatType;
  isWindow: boolean;
  extraFare?: number | null;
}

// Mirrors DTO/BusDtos.cs -> BusResponseDto.
export interface Bus {
  id: string;
  busOperatorId: string;
  // Nullable FK to BusCategory — added to the backend DTO alongside this frontend piece; see the
  // comment on BusCreateDto.BusCategoryId in DTO/BusDtos.cs.
  busCategoryId: string | null;
  registrationNumber: string;
  coachNumber: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  deletedAtUtc: string | null;
  brand: string | null;
  model: string | null;
  registrationDate: string | null;
  busType: BusType;
  totalSeats: number;
  hasWifi: boolean;
  hasToilet: boolean;
  isActive: boolean;
  primaryImageUrl: string | null;
  seats: Seat[];
  rowVersion: string;
}

// Mirrors DTO/BusDtos.cs -> BusCreateDto. Master-detail: defines the bus AND its full seat
// layout together (min. 1 seat).
export interface BusCreateRequest {
  busOperatorId: string;
  busCategoryId?: string | null;
  registrationNumber: string;
  coachNumber: string;
  brand?: string | null;
  model?: string | null;
  registrationDate?: string | null;
  busType: BusType;
  totalSeats: number;
  hasWifi: boolean;
  hasToilet: boolean;
  seats: SeatCreateRequest[];
}

// Mirrors DTO/BusDtos.cs -> BusUpdateDto. Update REPLACES the whole seat list — the backend
// deletes every existing Seat row for this bus and inserts whatever's sent here, so always send
// the full current+edited seat array, never a partial one.
export interface BusUpdateRequest extends BusCreateRequest {
  isActive: boolean;
  rowVersion: string;
}

// Mirrors DTO/BusFleetExtraDtos.cs -> BusCategoryResponseDto. Read-only reference data for
// Piece 4 — writes are Admin-only (BusCategoriesController), so the fleet screen shows these as
// a picker, not a CRUD list.
export interface BusCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/BusFleetExtraDtos.cs -> BusAmenityResponseDto. Same Admin-only-write situation as
// BusCategory above.
export interface BusAmenity {
  id: string;
  name: string;
  iconUrl: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/BusFleetExtraDtos.cs -> BusAmenityMappingResponseDto. Which BusAmenity is on
// which Bus — read-only for Piece 4 too (BusAmenityMappingsController writes are Admin-only).
export interface BusAmenityMapping {
  id: string;
  busId: string;
  busAmenityId: string;
}

// Mirrors DTO/BusFleetExtraDtos.cs -> BusImageResponseDto/CreateDto/UpdateDto. The gallery
// entity behind Bus.primaryImageUrl — BusesController.UploadImage creates the primary shot, but
// the full gallery (caption, display order, non-primary shots) is managed through this
// controller directly.
export interface BusImage {
  id: string;
  busId: string;
  imageUrl: string;
  caption: string | null;
  isPrimary: boolean;
  displayOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface BusImageCreateRequest {
  busId: string;
  imageUrl: string;
  caption?: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface BusImageUpdateRequest extends BusImageCreateRequest {
  rowVersion: string;
}

// Mirrors DTO/BusFleetExtraDtos.cs -> BusMaintenanceLogResponseDto/CreateDto/UpdateDto.
export interface BusMaintenanceLog {
  id: string;
  busId: string;
  maintenanceDateUtc: string;
  odometerKm: number | null;
  title: string;
  description: string | null;
  cost: number;
  nextDueDateUtc: string | null;
  performedBy: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface BusMaintenanceLogCreateRequest {
  busId: string;
  maintenanceDateUtc: string;
  odometerKm?: number | null;
  title: string;
  description?: string | null;
  cost: number;
  nextDueDateUtc?: string | null;
  performedBy?: string | null;
}

export interface BusMaintenanceLogUpdateRequest extends BusMaintenanceLogCreateRequest {
  rowVersion: string;
}
