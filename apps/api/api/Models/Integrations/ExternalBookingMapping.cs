using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // Same idea again, but for a Booking — links our Booking to the operator's own booking
    // reference, and keeps track of the last status we heard from their side (this is the
    // "connect to their API to get status of the bookings" requirement from the business plan).
    public class ExternalBookingMapping : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }
        public Guid BookingId { get; set; }

        [MaxLength(120)]
        public string ExternalBookingKey { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? ExternalPnr { get; set; }

        public BookingStatus? LastKnownExternalStatus { get; set; }
        public DateTime? LastSyncedAtUtc { get; set; }

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
        public Booking Booking { get; set; } = default!;
    }
}
