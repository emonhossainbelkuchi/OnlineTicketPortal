// Mirrors DTO/MarketingDtos.cs -> ReviewCreateDto. POST /api/reviews. BookingId is required (not
// optional) — ReviewsController verifies it's a real, Completed booking owned by the caller for
// this exact TripId before accepting the review, so there's always a real one to send.
export interface ReviewCreateRequest {
  tripId: string;
  bookingId: string;
  rating: number; // 1-5
  comment?: string;
}

// Mirrors DTO/MarketingDtos.cs -> ReviewUpdateDto. tripId/bookingId can't be changed after
// creation — only the rating/comment, plus the RowVersion concurrency token.
export interface ReviewUpdateRequest {
  rating: number;
  comment?: string;
  rowVersion: string;
}

// Mirrors DTO/MarketingDtos.cs -> ReviewResponseDto.
export interface Review {
  id: string;
  customerProfileId: string;
  tripId: string;
  bookingId: string | null;
  rating: number;
  comment: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
