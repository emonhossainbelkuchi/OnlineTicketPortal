using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Scheduling;
using System;

namespace TicketPortal.Api.Models.Bookings
{
    // ONE seat covered by a SeatHold. A customer can select several seats at once (a family
    // booking together), so one SeatHold can have several of these — one per seat.
    public class SeatHoldItem : AuditableEntity
    {
        public Guid SeatHoldId { get; set; }
        public Guid TripSeatId { get; set; }

        // Snapshot of the price at the moment it was held, so the price can't silently change
        // on the customer between selecting seats and actually paying.
        public decimal FareAtHold { get; set; }

        public SeatHold SeatHold { get; set; } = default!;
        public TripSeat TripSeat { get; set; } = default!;
    }
}
