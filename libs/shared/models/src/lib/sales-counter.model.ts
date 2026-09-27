// Mirrors DTO/PeopleDtos.cs -> SalesCounterCreateDto/UpdateDto/ResponseDto.
// A SalesCounter is the physical counter a walk-in booking is attributed to
// (BookingCreateDto.salesCounterId) — see sales-counters.service.ts.

// Create/Update share the same shape on the backend (Update just adds
// RowVersion) — kept as one request type here too.
export interface SalesCounterRequest {
  // Ignored by the backend for an operator-scoped Staff/Operator caller (the
  // counter always belongs to THEIR operator); required for a platform-wide
  // Admin/Staff caller creating a counter on an operator's behalf. Omit the
  // key entirely (don't send an empty string) when the caller isn't
  // supplying one — Guid is a non-nullable value type on the backend, so an
  // empty-string body fails model binding outright instead of just being
  // ignored.
  busOperatorId?: string;
  terminalId: string;
  operatorBranchId?: string;
  counterName: string;
  counterCode: string;
  phoneNumber: string;
  address: string;
  isActive: boolean;
}

export interface SalesCounter {
  id: string;
  busOperatorId: string;
  terminalId: string;
  operatorBranchId: string | null;
  counterName: string;
  counterCode: string;
  phoneNumber: string;
  address: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> CounterDashboardResponseDto/CounterDashboardCounterSummaryDto.
// GET /api/salescounters/dashboard — see dashboard.service.ts. "date" is a plain
// yyyy-MM-dd Bangladesh local calendar day, not a UTC day.
export interface CounterDashboardCounterSummary {
  counterId: string;
  counterName: string;
  counterCode: string;
  ticketsSoldToday: number;
  cashSalesTotal: number;
}

export interface CounterDashboard {
  date: string;
  ticketsSoldToday: number;
  cashSalesTotal: number;
  currency: string;
  pendingCancellations: number;
  openComplaints: number;
  counters: CounterDashboardCounterSummary[];
}
