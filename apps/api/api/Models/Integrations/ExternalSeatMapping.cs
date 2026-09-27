using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // Same idea again, but for one seat — links our TripSeat to their own seat reference, so
    // we can tell their system "hold seat X" using an ID that actually means something to them.
    public class ExternalSeatMapping : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }
        public Guid TripSeatId { get; set; }

        [MaxLength(120)]
        public string ExternalSeatKey { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? ExternalSeatNumber { get; set; }

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
        public TripSeat TripSeat { get; set; } = default!;
    }
}
