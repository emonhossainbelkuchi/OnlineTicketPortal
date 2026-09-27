using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.DTO
{
  // =========================================================

  // =========================================================
  public class BusListDto
  {
    // ============ BUS ============
    public Guid Id { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string CoachNumber { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public BusType BusType { get; set; }
    public int TotalSeats { get; set; }
    public bool HasWifi { get; set; }
    public bool HasToilet { get; set; }
    public int? ManufactureYear { get; set; }
    public string? PrimaryImageUrl { get; set; }

    // ============ AMENITIES ============
    public List<string> Amenities { get; set; } = new();

    // ============ TRIP ============
    public Guid TripId { get; set; }
    public string TripCode { get; set; } = string.Empty;
    public decimal BaseFare { get; set; }
    public string Currency { get; set; } = "BDT";
    public DateTime DepartureTimeUtc { get; set; }
    public DateTime ArrivalTimeUtc { get; set; }
    public string Duration { get; set; } = string.Empty;
    public TripStatus TripStatus { get; set; }
    public DateTime? ReportingTimeUtc { get; set; }

    // ============ ROUTE / TERMINAL ============
    public Guid? DepartureTerminalId { get; set; }
    public string? DepartureTerminalName { get; set; }
    public string? DepartureCity { get; set; }
    public Guid? ArrivalTerminalId { get; set; }
    public string? ArrivalTerminalName { get; set; }
    public string? ArrivalCity { get; set; }

    // ============ SCHEDULE ============
    public Guid? ScheduleId { get; set; }
    public string? ScheduleCode { get; set; }

    // ============ SEAT COUNTS ============
    public int AvailableSeats { get; set; }
    public int HeldSeats { get; set; }
    public int BookedSeats { get; set; }
    public int BlockedSeats { get; set; }

    // ============ EXTRA ============
    public int UpcomingTripCount { get; set; }
    public double? Rating { get; set; }
    public int TotalReviews { get; set; }

    
    public List<BusSeatDto>? Seats { get; set; }
  }

  public class BusSeatDto
  {
    public Guid TripSeatId { get; set; }
    public Guid SeatId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public SeatType SeatType { get; set; }
    public decimal Fare { get; set; }
    public TripSeatStatus Status { get; set; }

    public bool IsAvailable { get; set; }
    public bool IsHeld { get; set; }
    public bool IsBooked { get; set; }
    public bool IsBlocked { get; set; }

    public int RowNumber { get; set; }
    public int ColumnNumber { get; set; }
    public int DeckLevel { get; set; }
    public bool IsWindow { get; set; }
    public decimal? ExtraFare { get; set; }
    public bool IsActive { get; set; }
  }
}
