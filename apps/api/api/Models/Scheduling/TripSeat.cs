using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Integrations;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Scheduling
{
    // The single most important row in the whole booking flow: ONE seat, on ONE trip, and
    // whether a customer can currently select it. One row here is generated per Seat the
    // moment a Trip is created, and its Status is what the seat map on screen is built from.
    //
    // Status moves through a strict lifecycle: Available -> Held -> Booked (or back to
    // Available if a hold expires/is released). SeatHoldService is the ONLY code allowed to
    // change this Status — see that class for exactly how it stops two customers grabbing the
    // same seat at the same instant.
    //
    // Note: the actual hold details (who's holding it, when the 3-5 minute timer runs out) are
    // NOT duplicated here — they live only on SeatHold, reachable through CurrentSeatHold.
    // This row only keeps what's needed to draw the seat map fast and to enforce the status
    // transition itself.
    public class TripSeat : AuditableEntity
    {
        public Guid TripId { get; set; }
        public Guid SeatId { get; set; } // Which physical seat template (see Seat) this came from.
        public Guid? BookingId { get; set; } // Filled in once this seat is actually booked & paid.
        public Guid? CurrentSeatHoldId { get; set; } // Filled in while this seat is mid-checkout.

        [MaxLength(10)]
        public string SeatNumber { get; set; } = string.Empty; // Copied from Seat, so it's fast to show without a join.

        public SeatType SeatType { get; set; }
        public decimal Fare { get; set; } // This trip's actual price for this seat (can differ from Seat.ExtraFare over time).
        public TripSeatStatus Status { get; set; } = TripSeatStatus.Available;

        [MaxLength(250)]
        public string? BlockReason { get; set; } // Why this seat was manually taken out of sale, if Status = Blocked.

        // Last known seat reference/status from the operator's own ERP, only used when this
        // trip is externally managed (see Trip.InventoryMode).
        [MaxLength(120)]
        public string? ExternalSeatKey { get; set; }

        public Trip Trip { get; set; } = default!;
        public Seat Seat { get; set; } = default!;
        public Booking? Booking { get; set; }
        public SeatHold? CurrentSeatHold { get; set; }
        public Ticket? Ticket { get; set; }
        public ICollection<SeatHoldItem> HoldItems { get; set; } = new List<SeatHoldItem>();
        public ICollection<ExternalSeatMapping> ExternalSeatMappings { get; set; } = new List<ExternalSeatMapping>();
    }
}
