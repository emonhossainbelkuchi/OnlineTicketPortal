using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
  // =========================================================
  // Trip Seat — Create
  // =========================================================
  // What the caller sends to add ONE seat to a trip's seat map. Note this does NOT create a
  // new physical seat — SeatId must point at a Seat row that already exists on the Bus assigned
  // to this trip. A trip only prices and tracks availability for seats that physically exist;
  // it never invents them.
  public class TripSeatCreateDto
  {
    [Required]
    public Guid SeatId { get; set; }

    [Required, MaxLength(10)]
    public string SeatNumber { get; set; } = string.Empty;

    public SeatType SeatType { get; set; } = SeatType.Regular;

    [Range(typeof(decimal), "0", "100000")]
    public decimal Fare { get; set; }
  }

  // =========================================================
  // Trip Seat — Response (with seat layout info for the UI)
  // =========================================================
  public class TripSeatResponseDto
  {
    public Guid Id { get; set; }
    public Guid SeatId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public SeatType SeatType { get; set; }
    public decimal Fare { get; set; }

    // Available / Held / Booked / Blocked
    public TripSeatStatus Status { get; set; }

    // ⭐ NEW — seat layout info (frontend needs these to render the seat map)
    public int RowNumber { get; set; }
    public int ColumnNumber { get; set; }
    public int DeckLevel { get; set; } = 1;
    public bool IsWindow { get; set; }
    public decimal? ExtraFare { get; set; }
  }

  // =========================================================
  // Trip — Create
  // =========================================================
  public class TripCreateDto
  {
    [Required]
    public Guid BusOperatorId { get; set; }

    [Required]
    public Guid BusRouteId { get; set; }

    [Required]
    public Guid BusId { get; set; }

    [Required]
    public Guid DepartureTerminalId { get; set; }

    [Required]
    public Guid ArrivalTerminalId { get; set; }

    [Required, MaxLength(40)]
    public string TripCode { get; set; } = string.Empty;

    [Required]
    public DateTime DepartureTimeUtc { get; set; }

    [Required]
    public DateTime ArrivalTimeUtc { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal BaseFare { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "BDT";

    public bool IsWheelchairAccessible { get; set; }

    [MinLength(1)]
    public List<TripSeatCreateDto> TripSeats { get; set; } = new();
  }

  // =========================================================
  // Trip — Update
  // =========================================================
  public class TripUpdateDto : TripCreateDto
  {
    public TripStatus Status { get; set; } = TripStatus.Scheduled;

    [MaxLength(250)]
    public string? DelayReason { get; set; }

    [Required]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
  }

  // =========================================================
  // Trip — Response (full details including all seats)
  // =========================================================
  public class TripResponseDto
  {
    public Guid Id { get; set; }

    // ============ IDs ============
    public Guid BusOperatorId { get; set; }
    public Guid BusRouteId { get; set; }
    public Guid BusId { get; set; }
    public Guid DepartureTerminalId { get; set; }
    public Guid ArrivalTerminalId { get; set; }

    // ============ ⭐ BUS OPERATOR INFO ============
    public string? BusOperatorName { get; set; }
    public string? BusOperatorLogoUrl { get; set; }

    // ============ ⭐ BUS INFO ============
    public string? BusBrand { get; set; }
    public string? BusModel { get; set; }
    public BusType? BusType { get; set; }
    public string? BusCoachNumber { get; set; }
    public string? BusRegistrationNumber { get; set; }
    public bool BusHasWifi { get; set; }
    public bool BusHasToilet { get; set; }

    // ============ ⭐ ROUTE INFO ============
    public string? BusRouteName { get; set; }
    public string? BusRouteCode { get; set; }

    // ============ ⭐ TERMINAL INFO ============
    public string? DepartureTerminalName { get; set; }
    public string? DepartureCity { get; set; }
    public string? ArrivalTerminalName { get; set; }
    public string? ArrivalCity { get; set; }

    // ============ TRIP ============
    public string TripCode { get; set; } = string.Empty;
    public DateTime DepartureTimeUtc { get; set; }
    public DateTime ArrivalTimeUtc { get; set; }
    public decimal BaseFare { get; set; }
    public string Currency { get; set; } = string.Empty;
    public bool IsWheelchairAccessible { get; set; }
    public TripStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public string? DelayReason { get; set; }
    public string? CoverImageUrl { get; set; }

    // ============ ⭐ SEATS ============
    public List<TripSeatResponseDto> TripSeats { get; set; } = new();

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
  }

  // =========================================================
  // Trip — Search Result (flatter, human-friendly)
  // =========================================================
  public class TripSearchResultDto
  {
    public Guid TripId { get; set; }
    public string TripCode { get; set; } = string.Empty;

    public Guid BusOperatorId { get; set; }
    public string BusOperatorName { get; set; } = string.Empty;
    public string? BusOperatorLogoUrl { get; set; }

    public Guid BusId { get; set; }
    public string? BusBrand { get; set; }
    public string? BusModel { get; set; }
    public BusType BusType { get; set; }
    public bool HasWifi { get; set; }
    public bool HasToilet { get; set; }

    public Guid DepartureTerminalId { get; set; }
    public string DepartureTerminalName { get; set; } = string.Empty;
    public Guid ArrivalTerminalId { get; set; }
    public string ArrivalTerminalName { get; set; } = string.Empty;

    public DateTime DepartureTimeUtc { get; set; }
    public DateTime ArrivalTimeUtc { get; set; }

    public TripStatus Status { get; set; }
    public bool IsWheelchairAccessible { get; set; }
    public string Currency { get; set; } = string.Empty;

    public int TotalSeatCount { get; set; }
    public int AvailableSeatCount { get; set; }

    public decimal? LowestAvailableFare { get; set; }

    public string? CoverImageUrl { get; set; }
  }

  // =========================================================
  // Trip — Cancel (Chunk 5)
  // =========================================================
  // What the operator's "Cancel trip" dialog sends. Reason is required — TripCancellationService
  // writes it onto both the TripStatusHistory row and every refund/cancellation record it creates
  // (concept: whoever looks at a cancelled trip later should be able to see WHY, not just that it happened).
  public class TripCancelDto
  {
    [Required, MinLength(3), MaxLength(250)]
    public string Reason { get; set; } = string.Empty;
  }

  // =========================================================
  // Trip — Cancel Preview (Chunk 5)
  // =========================================================
  // GET-only, no side effects — what the Angular cancel dialog calls first so it can show
  // "N bookings will be refunded" (and how much) before the operator actually confirms.
  public class TripCancelPreviewDto
  {
    public Guid TripId { get; set; }
    public TripStatus CurrentStatus { get; set; }
    public bool CanCancel { get; set; }

    public int BookingsToRefundCount { get; set; }
    public int OnlineBookingsCount { get; set; }
    public int CounterBookingsCount { get; set; }
    public decimal TotalRefundAmount { get; set; }
    public string Currency { get; set; } = "BDT";

    public int ActiveSeatHoldsToRelease { get; set; }
  }

  // =========================================================
  // Trip — Cancel Result (Chunk 5)
  // =========================================================
  public class TripCancelledBookingOutcomeDto
  {
    public Guid BookingId { get; set; }
    public Guid? RefundId { get; set; }
    public string Outcome { get; set; } = string.Empty;
    public string? Detail { get; set; }
  }

  public class TripCancelResultDto
  {
    public Guid TripId { get; set; }
    public int ReleasedHoldCount { get; set; }
    public int BookingsRefunded { get; set; }
    public int BookingsNeedingAttention { get; set; }
    public List<TripCancelledBookingOutcomeDto> Bookings { get; set; } = new();
  }

  // =========================================================
  // Trip — Passenger Manifest (Chunk 5)
  // =========================================================
  // One row per Ticket on the trip — including cancelled/refunded ones, WITH their real status,
  // rather than silently dropping them, so a driver/conductor's printed manifest still shows
  // "why is seat 14 empty" instead of just omitting it.
  public class TripManifestEntryDto
  {
    public Guid TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;

    public string PassengerName { get; set; } = string.Empty;
    public string? PassengerPhone { get; set; }

    public TicketStatus Status { get; set; }
    public DateTime? CheckedInAtUtc { get; set; }

    public string Pnr { get; set; } = string.Empty;
    public string BoardingTerminalName { get; set; } = string.Empty;
    public string DroppingTerminalName { get; set; } = string.Empty;
  }

  public class TripManifestResponseDto
  {
    public Guid TripId { get; set; }
    public string TripCode { get; set; } = string.Empty;
    public DateTime DepartureTimeUtc { get; set; }
    public TripStatus Status { get; set; }

    public int TotalPassengers { get; set; }
    public int CheckedInCount { get; set; }

    public List<TripManifestEntryDto> Passengers { get; set; } = new();
  }
}
