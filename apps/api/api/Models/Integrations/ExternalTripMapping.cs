using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // Same idea as ExternalRouteMapping, but for one specific Trip — links our Trip to their
    // trip ID, and keeps a snapshot of the seat data we last pulled from them.
    public class ExternalTripMapping : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }
        public Guid TripId { get; set; }

        [MaxLength(120)]
        public string ExternalTripKey { get; set; } = string.Empty;

        public DateTime? LastSyncedAtUtc { get; set; }
        public string? LastSeatSnapshotJson { get; set; } // What their seat map looked like last time we checked.

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
        public Trip Trip { get; set; } = default!;
    }
}
