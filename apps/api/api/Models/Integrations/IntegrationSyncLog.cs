using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // A record of one attempt where WE called OUT to an operator's ERP (e.g. "checked seat
    // availability for trip #123") — what we sent, what they replied, and whether it worked.
    // Useful for debugging when an operator's API misbehaves.
    public class IntegrationSyncLog : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }

        [MaxLength(80)]
        public string EntityName { get; set; } = string.Empty; // What kind of thing we were syncing (Trip, Seat, Booking...).

        [MaxLength(120)]
        public string? EntityKey { get; set; }

        [MaxLength(80)]
        public string Operation { get; set; } = string.Empty;

        public IntegrationSyncStatus Status { get; set; } = IntegrationSyncStatus.Pending;
        public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAtUtc { get; set; }
        public string? RequestJson { get; set; }
        public string? ResponseJson { get; set; }

        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
    }
}
