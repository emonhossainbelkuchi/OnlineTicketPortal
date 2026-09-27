using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
  // =========================================================
  // Details — ONE traveller on a booking
  // =========================================================
  public class BookingPassengerCreateDto
  {
    [Required, MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    public Gender Gender { get; set; } = Gender.Unknown;

    public PassengerType PassengerType { get; set; } = PassengerType.Adult;
    public int? Age { get; set; }

    [MaxLength(30)]
    public string? NationalIdNumber { get; set; }
  }

  public class BookingPassengerResponseDto
  {
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public Gender Gender { get; set; }
    public PassengerType PassengerType { get; set; }
    public int? Age { get; set; }
    public string? NationalIdNumber { get; set; }
    public string? NationalIdPhotoUrl { get; set; }
  }

  // =========================================================
  // Master — Booking create
  // =========================================================
  public class BookingCreateDto
  {
    [Required]
    public Guid TripId { get; set; }

    [Required, MaxLength(100)]
    public string HoldToken { get; set; } = string.Empty;

    [Required]
    public Guid BoardingTerminalId { get; set; }

    [Required]
    public Guid DroppingTerminalId { get; set; }

    [Required, MaxLength(120)]
    public string ContactName { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string ContactPhone { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? ContactEmail { get; set; }

    public Guid? SalesCounterId { get; set; }

    [MinLength(1)]
    public List<BookingPassengerCreateDto> Passengers { get; set; } = new();
  }

  // =========================================================
  // Booking update
  // =========================================================
  public class BookingUpdateDto
  {
    [Required]
    public Guid BoardingTerminalId { get; set; }

    [Required]
    public Guid DroppingTerminalId { get; set; }

    [Required, MaxLength(120)]
    public string ContactName { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string ContactPhone { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? ContactEmail { get; set; }

    [MinLength(1)]
    public List<BookingPassengerCreateDto> Passengers { get; set; } = new();

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
  }

  // =========================================================
  // ⭐ ONE BookingResponseDto — with HoldToken
  // =========================================================
  public class BookingResponseDto
  {
    public Guid Id { get; set; }

    public string Pnr { get; set; } = string.Empty;
    public Guid TripId { get; set; }
    public Guid? SeatHoldId { get; set; }

    // ⭐ NEW: The SeatHold's HoldToken — payment page needs this
    public string? HoldToken { get; set; }

    public Guid BoardingTerminalId { get; set; }
    public Guid DroppingTerminalId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? DeletedAtUtc { get; set; }

    public string ContactName { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }

    public BookingStatus Status { get; set; }
    public bool RequiresExternalConfirmation { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }

    public BookingSource Source { get; set; }
    public SaleChannel SaleChannel { get; set; }
    public MoneyCollectedBy MoneyCollectedBy { get; set; }
    public Guid? SalesCounterId { get; set; }

    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceChargeAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public string Currency { get; set; } = string.Empty;

    public List<BookingPassengerResponseDto> Passengers { get; set; } = new();

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
  }
}
