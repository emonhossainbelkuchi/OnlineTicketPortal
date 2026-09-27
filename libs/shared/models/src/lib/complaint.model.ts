import { ComplaintStatus } from './enums';

// Mirrors DTO/MarketingDtos.cs -> ComplaintCreateDto. POST /api/complaints.
// NOTE (Piece 5): the backend always attaches a new complaint to whoever is
// LOGGED IN (ComplaintsController.ResolveOrCreateCustomerProfileIdAsync) —
// there is no field here for a staff member to file it under a different,
// walk-in customer's profile. Filing one from the counter records it under
// the staff account itself, optionally linked to the customer's bookingId.
export interface ComplaintCreateRequest {
  bookingId?: string;
  subject: string;
  description: string;
}

export interface ComplaintUpdateRequest {
  bookingId?: string;
  subject: string;
  description: string;
  rowVersion: string;
}

// Mirrors ComplaintStatusUpdateDto. POST /api/complaints/{id}/status — the
// only way Status actually moves; staff/admin/operator only.
export interface ComplaintStatusUpdateRequest {
  status: ComplaintStatus;
}

export interface Complaint {
  id: string;
  customerProfileId: string;
  bookingId: string | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolvedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
