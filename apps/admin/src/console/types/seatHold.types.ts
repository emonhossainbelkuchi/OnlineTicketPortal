// seatHold.types.ts
// Mirrors SeatHoldResponseDto (SeatHoldsController). Create/Release write
// actions exist server-side; there's no raw PUT/DELETE by design.

export interface SeatHoldResponseDto {
  id: string;
  tripId: string;
  heldByUserId?: string | null;
  holdToken: string;
  holdStartedAtUtc: string;
  holdExpiresAtUtc: string;
  status: string; // Active | ConvertedToBooking | Released | Expired (SeatHoldStatus enum)
  secondsRemaining: number; // server-computed at fetch time; 0 once not Active
  clientIpAddress?: string | null;
  userAgent?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// Best-effort user-name resolution — endpoint/field names guessed; falls back
// to a short id if this doesn't match the real Users/AdminUsers shape.
export interface UserSummary {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
}

export interface SeatHoldDisplayDto extends SeatHoldResponseDto {
  tripLabel: string;
  busLabel: string;
  heldByLabel: string;
}
