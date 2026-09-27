using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // Details — one physical seat position on a bus. This is the PHYSICAL layout (row 2, window,
    // "business class cushion"), separate from TripSeat, which is the per-trip price/availability
    // for this same seat. A Seat exists once; a TripSeat exists once per trip that bus runs.
    public class SeatCreateDto
    {
        [Required, MaxLength(10)]
        public string SeatNumber { get; set; } = string.Empty;

        public int RowNumber { get; set; }
        public int ColumnNumber { get; set; }

        // 1 = lower deck, 2 = upper deck, for double-decker coaches.
        public int DeckLevel { get; set; } = 1;

        public SeatType SeatType { get; set; } = SeatType.Regular;
        public bool IsWindow { get; set; }

        // Fixed surcharge for this physical seat (e.g. extra legroom), independent of whatever
        // a specific trip decides to charge — see TripSeatCreateDto.Fare for the per-trip price.
        public decimal? ExtraFare { get; set; }
    }

    public class SeatResponseDto
    {
        public Guid Id { get; set; }
        public string SeatNumber { get; set; } = string.Empty;
        public int RowNumber { get; set; }
        public int ColumnNumber { get; set; }
        public int DeckLevel { get; set; }
        public SeatType SeatType { get; set; }
        public bool IsWindow { get; set; }
        public decimal? ExtraFare { get; set; }
        public bool IsActive { get; set; }
    }

    // Master = Bus, a physical vehicle. BusOperatorId ties it to the company that owns it —
    // required, because a bus can never exist without an owning operator.
    public class BusCreateDto
    {
        [Required]
        public Guid BusOperatorId { get; set; }

        // Added for Piece 4 (Operator & Fleet Management Panel) — Bus.BusCategoryId already
        // existed on the model/DB (see Models/BusFleet/Bus.cs + the initial migration) but was
        // never surfaced through this DTO, so a bus's category could never actually be set or
        // read via the API. Nullable/optional, same as the model column — a bus doesn't have to
        // have a category.
        public Guid? BusCategoryId { get; set; }

        [Required, MaxLength(40)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required, MaxLength(40)]
        public string CoachNumber { get; set; } = string.Empty;

        [MaxLength(80)]
        public string? Brand { get; set; }

        [MaxLength(80)]
        public string? Model { get; set; }

        // Date-type demo field for this master-detail pair — when this specific vehicle was
        // registered with the transport authority.
        public DateTime? RegistrationDate { get; set; }

        [Required]
        public BusType BusType { get; set; }

        [Range(1, 100)]
        public int TotalSeats { get; set; }

        public bool HasWifi { get; set; }
        public bool HasToilet { get; set; }

        // Details — the whole point of a master-detail create: define the bus AND its seat
        // layout in a single call, so the two can never exist out of sync with each other.
        [MinLength(1)]
        public List<SeatCreateDto> Seats { get; set; } = new();

    }

    public class BusUpdateDto : BusCreateDto
    {
        public bool IsActive { get; set; } = true;
        [Required]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    }

    public class BusResponseDto
    {
        public Guid Id { get; set; }
        public Guid BusOperatorId { get; set; }
        public Guid? BusCategoryId { get; set; }
        public string RegistrationNumber { get; set; } = string.Empty;
        public string CoachNumber { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? DeletedAtUtc { get; set; }

        public string? Brand { get; set; }
        public string? Model { get; set; }
        public DateTime? RegistrationDate { get; set; }
        public BusType BusType { get; set; }
        public int TotalSeats { get; set; }
        public bool HasWifi { get; set; }
        public bool HasToilet { get; set; }
        public bool IsActive { get; set; }

        // Not a field on Bus itself — pulled from the BusImage gallery entity (see BusesController's
        // UploadImage), specifically whichever uploaded photo is currently flagged IsPrimary.
        public string? PrimaryImageUrl { get; set; }
        public List<SeatResponseDto> Seats { get; set; } = new();
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    }
}
