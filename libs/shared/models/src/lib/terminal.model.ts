// Mirrors DTO/CompanyNetworkExtraDtos.cs -> TerminalResponseDto. Piece 2 (search/results) is
// the primary owner of terminal PICKING, but Piece 3 needs read access too, to resolve the
// boarding/dropping terminal ids on a Trip/Booking into human-readable names for the checkout
// summary and e-ticket — same reasoning as BusOperator being shared read-only across pieces.
// Piece 5 reuses this same shape for the from/to terminal picker behind the walk-in booking
// flow's trip search.
export interface Terminal {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  division: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}
