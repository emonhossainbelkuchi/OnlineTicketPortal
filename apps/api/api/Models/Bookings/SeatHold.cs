using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // This IS the "3 to 5 minute timer" from the business plan. The instant a customer picks
    // seats, we create one SeatHold (covering possibly several seats at once via SeatHoldItem)
    // with HoldExpiresAtUtc set a few minutes in the future. While it's Active, those seats
    // are locked to this customer only. If they pay in time, the hold becomes a real Booking.
    // If not, a background job (see SeatHoldExpirySweepService) flips it to Expired and frees
    // the seats again automatically.
    public class SeatHold : AuditableEntity
    {
        public Guid TripId { get; set; }
        public Guid? HeldByUserId { get; set; } // Null for a guest checkout not logged in.

        [MaxLength(100)]
        public string HoldToken { get; set; } = string.Empty; // Given to the front-end to track this hold/checkout session.

        public DateTime HoldStartedAtUtc { get; set; } = DateTime.UtcNow;

        // The actual countdown deadline. Once we pass this without a completed payment,
        // the hold is no longer valid and the seats must be released.
        public DateTime HoldExpiresAtUtc { get; set; }

        public SeatHoldStatus Status { get; set; } = SeatHoldStatus.Active;

        [MaxLength(80)]
        public string? ClientIpAddress { get; set; } // Basic fraud/abuse tracking.

        [MaxLength(300)]
        public string? UserAgent { get; set; }

        public Trip Trip { get; set; } = default!;
        public Booking? Booking { get; set; } // Filled in once/if this hold turns into a real booking.
        public ApplicationUser? HeldByUser { get; set; }
        public ICollection<SeatHoldItem> Items { get; set; } = new List<SeatHoldItem>(); // The actual seat(s) covered by this hold.

        // Quick check: has this hold's timer run out? (Doesn't change anything by itself —
        // the actual "release the seats" work happens in SeatHoldService.)
        public bool IsExpired(DateTime utcNow) => Status == SeatHoldStatus.Active && HoldExpiresAtUtc <= utcNow;
    }
}
