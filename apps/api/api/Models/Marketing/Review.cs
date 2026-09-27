using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Marketing
{
    // A star rating + comment a customer leaves for a Trip they took, shown to future
    // customers browsing that operator/route.
    public class Review : AuditableEntity
    {
        public Guid CustomerProfileId { get; set; }
        public Guid TripId { get; set; }
        public Guid? BookingId { get; set; } // Links back to proof they actually travelled, if available.

        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }

        public CustomerProfile CustomerProfile { get; set; } = default!;
        public Trip Trip { get; set; } = default!;
        public Booking? Booking { get; set; }
    }
}
